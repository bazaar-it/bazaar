import { CoordinatorAgent } from "../coordinator-agent";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Task, Message, Artifact, TaskState } from "~/types/a2a";
import { createTextMessage, createFileArtifact } from "~/types/a2a";
import crypto from "crypto";

// Mock TaskManager
jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    createTask: jest.fn(),
    updateTaskState: jest.fn(), // Mocked in BaseAgent tests, but specific calls can be asserted here
    addTaskArtifact: jest.fn(), // Mocked in BaseAgent tests
    // getTaskStatus: jest.fn(), // Not directly called by CoordinatorAgent in these test cases
  },
}));

// Mock BaseAgent methods that are called internally or by super()
const mockLogAgentMessage = jest.fn();
const mockUpdateTaskStateBase = jest.fn(); // To distinguish from taskManager.updateTaskState

jest.mock("../base-agent", () => {
  const originalBaseAgent = jest.requireActual("../base-agent").BaseAgent;
  return {
    BaseAgent: jest.fn().mockImplementation((name, description) => {
      const agent = new originalBaseAgent(name, description);
      agent.logAgentMessage = mockLogAgentMessage;
      agent.updateTaskState = mockUpdateTaskStateBase; // Mock specific BaseAgent method
      // We can also mock createA2AMessage if we want to inspect its arguments without side effects
      agent.createA2AMessage = jest.fn((type, taskId, recipient, message, artifacts, correlationId, payload) => ({
        id: crypto.randomUUID(), type, payload: { taskId, message, artifacts, ...(payload || {}) }, sender: name, recipient, correlationId
      }));
      agent.createSimpleTextMessage = jest.fn((text) => createTextMessage(text)); // Use actual helper
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});


describe("CoordinatorAgent", () => {
  let coordinator: CoordinatorAgent;
  const mockTaskId = "mock-task-id-coord";
  const mockProjectId = "mock-project-id-coord";
  const mockAnimationDesignBrief = { sceneName: "Test Scene", description: "A test scene" };

  beforeEach(() => {
    jest.clearAllMocks();
    coordinator = new CoordinatorAgent();

    // Setup mock return value for taskManager.createTask
    (taskManager.createTask as jest.Mock).mockResolvedValue({
      id: mockTaskId,
      state: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: createTextMessage("Task created"),
    } as Task);
  });

  describe("processMessage - CREATE_COMPONENT_REQUEST", () => {
    const incomingMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "CREATE_COMPONENT_REQUEST",
      payload: { 
        animationDesignBrief: mockAnimationDesignBrief,
        projectId: mockProjectId,
        // taskId or componentJobId might be passed if this is part of a larger flow
      },
      sender: "ADBAgent", // Example sender
      recipient: "CoordinatorAgent",
    };

    it("should create a new task via TaskManager", async () => {
      await coordinator.processMessage(incomingMessage);
      expect(taskManager.createTask).toHaveBeenCalledWith(mockProjectId, {
        effect: mockAnimationDesignBrief.sceneName,
        animationDesignBrief: mockAnimationDesignBrief,
      });
    });

    it("should log the incoming message", async () => {
      await coordinator.processMessage(incomingMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingMessage, true);
    });

    it("should update task state to 'working' after creating the task", async () => {
      await coordinator.processMessage(incomingMessage);
      // The updateTaskState in BaseAgent is called, which internally calls taskManager.updateTaskStatus
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', 
        expect.objectContaining({ parts: [{ type: 'text', text: expect.stringContaining("forwarding to BuilderAgent")}] })
      );
    });

    it("should return a BUILD_COMPONENT_REQUEST message for BuilderAgent", async () => {
      const response = await coordinator.processMessage(incomingMessage);
      expect(response).toBeDefined();
      expect(response?.type).toBe("BUILD_COMPONENT_REQUEST");
      expect(response?.recipient).toBe("BuilderAgent");
      expect(response?.payload.taskId).toBe(mockTaskId);
      expect(response?.payload.message.parts[0].text).toContain("Request to build component");
      expect(response?.correlationId).toBe(incomingMessage.id);
    });
  });

  describe("processMessage - Various Error Message Types", () => {
    const errorTypesToTest: AgentMessage['type'][] = [
      "COMPONENT_PROCESS_ERROR",
      "COMPONENT_FIX_ERROR",
      "R2_STORAGE_ERROR",
      "ADB_GENERATION_ERROR"
    ];

    errorTypesToTest.forEach((errorType) => {
      it(`should handle ${errorType}, update task to 'failed', and prepare TASK_FAILED_NOTIFICATION for UIAgent`, async () => {
        const specificErrorPayload = { error: `${errorType} occurred`, taskId: mockTaskId };
        const incomingErrorMessage: AgentMessage = {
          id: crypto.randomUUID(),
          type: errorType,
          payload: specificErrorPayload,
          sender: "SourceAgent", 
          recipient: "CoordinatorAgent",
        };

        // The processMessage itself will call createA2AMessage internally
        const response = await coordinator.processMessage(incomingErrorMessage);

        expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', 
          expect.objectContaining({ parts: [{type: 'text', text: specificErrorPayload.error }] })
        );
        expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingErrorMessage, true);
        
        // Check the response that CoordinatorAgent returns
        expect(response).toBeDefined();
        expect(response?.type).toBe("TASK_FAILED_NOTIFICATION");
        expect(response?.recipient).toBe("UIAgent");
        expect(response?.payload.taskId).toBe(mockTaskId);
        expect(response?.payload.message.parts[0].text).toContain(`Task failed: ${specificErrorPayload.error}`);
      });
    });

    // Test for graceful handling of missing taskId in error messages, moved from the old error handling block
    it("should handle missing taskId in error payload gracefully", async () => {
      const incomingErrorMessageWithoutTaskId: AgentMessage = {
        id: crypto.randomUUID(),
        type: "COMPONENT_PROCESS_ERROR", 
        payload: { error: "Some error, no task ID" }, // No taskId here
        sender: "BuilderAgent",
        recipient: "CoordinatorAgent",
      };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await coordinator.processMessage(incomingErrorMessageWithoutTaskId);
      
      expect(response).toBeNull();
      expect(mockUpdateTaskStateBase).not.toHaveBeenCalled(); // Should not try to update state without taskId
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingErrorMessageWithoutTaskId, true); // Should still log the incoming message
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Missing taskId in error message payload"), expect.anything());
      consoleErrorSpy.mockRestore();
    });
  });

  describe("processMessage - COMPONENT_BUILD_SUCCESS", () => {
    const successPayload = { taskId: mockTaskId, artifacts: [{ id: "artifact1", type: "file", mimeType: "application/javascript", url: "/build.js", createdAt: new Date().toISOString() } as Artifact] };
    const incomingSuccessMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "COMPONENT_BUILD_SUCCESS",
      payload: successPayload,
      sender: "BuilderAgent",
      recipient: "CoordinatorAgent",
    };

    it("should log the success message and forward to R2StorageAgent", async () => {
      const response = await coordinator.processMessage(incomingSuccessMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingSuccessMessage, true);
      expect(response?.type).toBe("STORE_COMPONENT_REQUEST");
      expect(response?.recipient).toBe("R2StorageAgent");
      expect(response?.payload.taskId).toBe(mockTaskId);
      expect(response?.payload.artifacts).toEqual(successPayload.artifacts);
    });
  });

  describe("processMessage - COMPONENT_STORED_SUCCESS", () => {
    const storedPayload = { taskId: mockTaskId, artifacts: [{ id: "artifact1", type: "file", mimeType: "application/javascript", url: "/r2/build.js", createdAt: new Date().toISOString() } as Artifact] };
    const incomingStoredMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "COMPONENT_STORED_SUCCESS",
      payload: storedPayload,
      sender: "R2StorageAgent",
      recipient: "CoordinatorAgent",
    };

    it("should update task state to 'completed' and notify UIAgent", async () => {
      const response = await coordinator.processMessage(incomingStoredMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'completed', 
        expect.objectContaining({ parts: [{type: 'text', text: "Component stored successfully."}] })
      );
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingStoredMessage, true);
      expect(response?.type).toBe("TASK_COMPLETED_NOTIFICATION");
      expect(response?.recipient).toBe("UIAgent");
      expect(response?.payload.taskId).toBe(mockTaskId);
      expect(response?.payload.artifacts).toEqual(storedPayload.artifacts);
    });
  });

  describe("processMessage - Unhandled Message Type", () => {
    it("should log and return null for an unhandled message type", async () => {
      const unhandledMessage: AgentMessage = {
        id: crypto.randomUUID(),
        type: "TOTALLY_UNKNOWN_MESSAGE_TYPE",
        payload: { taskId: mockTaskId, data: "some data" },
        sender: "SomeOtherAgent",
        recipient: "CoordinatorAgent",
      };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await coordinator.processMessage(unhandledMessage);

      expect(response).toBeNull();
      expect(mockLogAgentMessage).toHaveBeenCalledWith(unhandledMessage); // Should be logged as pending
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("CoordinatorAgent received unhandled message type: TOTALLY_UNKNOWN_MESSAGE_TYPE"));
      consoleWarnSpy.mockRestore();
    });
  });

  describe("processMessage - Edge Cases for CoordinatorAgent Internal Errors", () => {
    it("should log original message as unprocessed if updateTaskState (called by coordinator for error) itself fails", async () => {
      const errorMessageFromAgent = "DB connection lost during update";
      const errorPayload = { error: errorMessageFromAgent, taskId: mockTaskId };
      const incomingErrorMessage: AgentMessage = {
        id: crypto.randomUUID(),
        type: "COMPONENT_PROCESS_ERROR",
        payload: errorPayload,
        sender: "BuilderAgent",
        recipient: "CoordinatorAgent",
      };
      
      const dbUpdateError = new Error("DB update failed during Coordinator's attempt to set error state");
      (mockUpdateTaskStateBase as jest.Mock).mockImplementation(async (taskIdParam, stateParam) => {
        if (taskIdParam === mockTaskId && stateParam === 'failed') {
          throw dbUpdateError; 
        }
        return Promise.resolve();
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await coordinator.processMessage(incomingErrorMessage);
      
      expect(response).toBeNull(); 
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything());
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingErrorMessage, true);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingErrorMessage, false);

      expect(consoleErrorSpy).toHaveBeenCalled();
      // Find the specific console.error call from the CoordinatorAgent's catch block
      const relevantConsoleCall = consoleErrorSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes("Error processing message in CoordinatorAgent")
      );
      expect(relevantConsoleCall).toBeDefined(); // Ensure the specific log was made

      if (relevantConsoleCall) { // Type guard for relevantConsoleCall
        expect(relevantConsoleCall[0]).toContain(`Error processing message in CoordinatorAgent (type: ${incomingErrorMessage.type}): ${dbUpdateError.message}`);
        expect(relevantConsoleCall[1]).toEqual(expect.objectContaining({
          payload: incomingErrorMessage.payload,
          error: dbUpdateError 
        }));
      }
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getAgentCard", () => {
    it("should return an agent card with specific skills", () => {
      const card = coordinator.getAgentCard();
      expect(card.name).toBe("CoordinatorAgent");
      expect(card.skills).toBeDefined();
      expect(card.skills).toHaveLength(1);
      if (card.skills && card.skills[0]) {
        expect(card.skills[0].id).toBe("orchestrate-component-generation");
      }
    });
  });
}); 