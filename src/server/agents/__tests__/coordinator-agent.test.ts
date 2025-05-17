// src/server/agents/__tests__/coordinator-agent.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from "@jest/globals";
import { BaseAgent, type AgentMessage } from '../base-agent'; 
// Ensure Part is aliased as MessagePart and all are type-only imports
import { createTextMessage, type Message, type Part as MessagePart, type Task, type TaskState, type TextPart, type Artifact, type ComponentJobStatus } from "~/types/a2a"; 
import crypto from "crypto";
import type { OpenAI } from 'openai';

// Import the actual CoordinatorAgent for type checking and instantiation
import { CoordinatorAgent } from '../coordinator-agent';
// Now import the taskManager, which will be the mocked version from taskManager.service
import { taskManager as mockedTaskManager } from '../../services/a2a/taskManager.service';

// Renamed mock functions to match actual BaseAgent method names
const mockCreateA2AMessage = jest.fn<BaseAgent['createA2AMessage']>();
const mockLogAgentMessage = jest.fn<BaseAgent['logAgentMessage']>();
const mockUpdateTaskState = jest.fn<BaseAgent['updateTaskState']>().mockImplementation(
  async (taskId: string, state: TaskState, status?: ComponentJobStatus, result?: any, error?: any) => {
    console.log(`Mocked updateTaskState for taskId: ${taskId}, state: ${state}, status: ${status}, result: ${result}, error: ${error}`);
    // updateTaskState in BaseAgent returns Promise<void>
    // No explicit return needed for void promise
  }
);
const mockAddTaskArtifact = jest.fn<BaseAgent['addTaskArtifact']>();
const mockGenerateStructuredResponse = jest.fn<BaseAgent['generateStructuredResponse']>();
const mockGenerateResponse = jest.fn<BaseAgent['generateResponse']>();

// Mock BaseAgent FIRST to ensure it's mocked before CoordinatorAgent imports it.
jest.mock('../base-agent', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({ /* empty mock OpenAI object */ }) as jest.Mocked<OpenAI>);

  // Define the signature for the constructor implementation function
  const mockConstructorImplementation = (
    name: string,
    taskManager: any, // Consider using a more specific mock type for taskManager
    description?: string,
    useOpenAI: boolean = false
  ): BaseAgent => {
    const instance: Partial<BaseAgent> & { [key: string]: any } = {
      name: name,
      taskManager: taskManager,
      description: description || `${name} Agent`,
      openai: useOpenAI ? (MockOpenAI() as OpenAI) : null,
      createMessage: jest.fn<BaseAgent['createMessage']>(),
      createA2AMessage: mockCreateA2AMessage,
      logAgentMessage: mockLogAgentMessage,
      updateTaskState: mockUpdateTaskState,
      addTaskArtifact: mockAddTaskArtifact,
      generateStructuredResponse: mockGenerateStructuredResponse,
      generateResponse: mockGenerateResponse,
      extractTextFromMessage: jest.fn<BaseAgent['extractTextFromMessage']>().mockImplementation((message?: Message) => {
        if (!message?.parts) return "";
        return message.parts.filter(p => p.type === 'text').map(p => (p as TextPart).text).join("\n");
      }),
      createSimpleTextMessage: jest.fn<BaseAgent['createSimpleTextMessage']>().mockImplementation((text: string) => createTextMessage(text)),
      getName: jest.fn<BaseAgent['getName']>().mockReturnValue(name),
    };
    return instance as BaseAgent;
  };

  // Create the mock constructor using jest.fn with the typed implementation
  const MockedBaseAgentConstructor = jest.fn<typeof mockConstructorImplementation>(mockConstructorImplementation);

  return { BaseAgent: MockedBaseAgentConstructor };
});

// Standalone mock functions with explicit types
const mockCreateTask = jest.fn<
  (projectId: string, params: Record<string, any>) => Promise<Task>
>();
const mockGetTaskById = jest.fn<
  (taskId: string) => Promise<Task | null>
>();
const mockUpdateTaskStatus = jest.fn<
  (
    taskId: string,
    a2aState: TaskState,
    message: Message | string,
    artifacts?: Artifact[],
    isInternalStateUpdate?: boolean
  ) => Promise<void>
>();
const mockTaskManagerAddTaskArtifact = jest.fn< 
  (taskId: string, artifact: Artifact) => Promise<void>
>();

// Mock the entire TaskManager module using a relative path
// The factory now uses the standalone mock functions.
jest.mock("../../services/a2a/taskManager.service", () => ({
  taskManager: {
    createTask: mockCreateTask,
    getTaskById: mockGetTaskById,
    updateTaskStatus: mockUpdateTaskStatus,
    addTaskArtifact: mockTaskManagerAddTaskArtifact, 
  },
}));

// Helper for default createA2AMessage mock (renamed from flexibleCreateA2AMessageImplementation)
const flexibleCreateA2AMessage = (
  type: string,
  taskId: string,
  recipient: string,
  message?: Message,
  artifacts?: Artifact[],
  correlationId?: string,
  additionalPayload?: Record<string, any>
): AgentMessage => {
  const finalPayload: Partial<AgentMessage['payload']> = {
    taskId: taskId,
    additionalPayload: additionalPayload
  };

  if (message) {
    finalPayload.message = message;
  }

  if (artifacts && artifacts.length > 0) {
    finalPayload.artifacts = artifacts;
  }

  return {
    id: crypto.randomUUID(),
    type: type,
    payload: finalPayload as AgentMessage['payload'],
    sender: "CoordinatorAgent", 
    recipient,
    correlationId: correlationId ?? undefined,
    timestamp: new Date().toISOString(), // Changed from createdAt
  };
};

// Helper for default logAgentMessage mock (newly defined or renamed)
const flexibleLogAgentMessage = async (message: AgentMessage, success: boolean = true): Promise<void> => {
  // Basic mock implementation - can be enhanced if specific logging side effects are needed for tests
  // console.log(`Mocked logAgentMessage: ${success ? 'SUCCESS' : 'FAIL'} - ${message.type}`);
  return Promise.resolve();
};

// Helper for default updateTaskState mock (newly defined or renamed)
const flexibleUpdateTaskState = async (
  taskId: string, 
  state: TaskState, 
  messageInput?: Message | string, 
  artifacts?: Artifact[], 
  internalStatus?: ComponentJobStatus | null
): Promise<void> => {
  // console.log(`Mocked updateTaskState: taskId=${taskId}, state=${state}`);
  return Promise.resolve(); 
};

// Helper for default generateStructuredResponse mock (newly defined or renamed)
export const flexibleGenerateStructuredResponse = async <T>(
  prompt: string,
  systemPrompt: string,
  temperature: number = 0
): Promise<T | null> => {
  // Default behavior: return a simple object or null based on some condition
  // This is a placeholder; real logic would be more sophisticated.
  console.log(`flexibleGenerateStructuredResponse called with prompt: ${prompt.substring(0,100)}..., systemPrompt: ${systemPrompt.substring(0,100)}..., temp: ${temperature}`);
  
  // Example: Simulate an LLM call that might succeed or fail
  if (prompt.includes("fail")) {
    return null;
  }
  // A very generic response structure
  return { answertype: "generic_structured_response", details: "Mocked flexible response" } as unknown as T;
};

// Helper for default addTaskArtifact mock (newly defined)
const flexibleAddTaskArtifact = async (taskId: string, artifact: Artifact): Promise<void> => {
  // console.log(`Mocked addTaskArtifact: taskId=${taskId}, artifactId=${artifact.id}`);
  return Promise.resolve();
};

// Helper for default createMessagePart mock (restored)
// Note: MessagePart is now an alias for Part from '~/types/a2a'
const flexibleCreateMessagePartImplementation = (text: string, partTypeParam: 'text' | 'json' = 'text'): MessagePart => {
  const actualPartType = partTypeParam === 'json' ? 'data' : 'text'; // Map 'json' to 'data' for Part.type
  // This implementation should align with the Part interface from '~/types/a2a'
  // For example, if type is 'data', 'text' field might be irrelevant or 'data' field should be used.
  const part: MessagePart = {
    type: actualPartType, 
    id: crypto.randomUUID(),
    // Ensure 'createdAt' is not part of the core Part type unless intended via extension
  };
  if (actualPartType === 'text') {
    (part as any).text = text; // Should be TextPart
  }
  // if (actualPartType === 'data') { (part as any).data = JSON.parse(text); } // Example if text is JSON string for data part
  return part;
};

const mockCreateMessagePart = jest.fn<(text: string, type?: 'text' | 'json') => MessagePart>();

describe("CoordinatorAgent", () => {
  let coordinator: CoordinatorAgent;
  const mockTaskId = "mock-task-123"; 
  const mockVideoTaskId = "video-task-id-001";

  // Default LLM response for routing/decision making by CoordinatorAgent
  let llmDecision: any = { nextStepAgent: "BuilderAgent", reason: "Ready to build" }; 

  let defaultMockTask: Task;

  beforeAll(() => {
    // Debug: Check if standalone mocks are indeed mock functions
    console.log('mockCreateTask is mock?', jest.isMockFunction(mockCreateTask));
    console.log('mockGetTaskById is mock?', jest.isMockFunction(mockGetTaskById));

    // Setup a default mock return value using the standalone mock function
    mockCreateTask.mockResolvedValue(({
      id: mockTaskId,
      state: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: createTextMessage("Default mock task created by mockCreateTask in beforeAll"),
      // Removed: retries, projectId
    } as Task));
  });

  beforeEach(() => {
    // Reset and re-apply default flexible implementations for all BaseAgent mocks
    mockLogAgentMessage.mockReset().mockImplementation(flexibleLogAgentMessage);
    mockUpdateTaskState.mockReset().mockImplementation(flexibleUpdateTaskState);
    mockGenerateStructuredResponse.mockReset().mockImplementation(flexibleGenerateStructuredResponse);
    mockCreateA2AMessage.mockReset().mockImplementation(flexibleCreateA2AMessage);
    mockGenerateResponse.mockReset().mockResolvedValue("Default mock LLM response"); 
    mockAddTaskArtifact.mockReset().mockImplementation(flexibleAddTaskArtifact);

    // Reset TaskManager mocks
    mockGetTaskById.mockReset();
    mockCreateTask.mockReset();
    mockUpdateTaskStatus.mockReset(); 
    mockCreateMessagePart.mockImplementation(flexibleCreateMessagePartImplementation);

    coordinator = new CoordinatorAgent(mockedTaskManager); 

    // REMOVED Spies on BaseAgent methods as jest.mock should handle this
  });

  describe("processMessage - CREATE_COMPONENT_REQUEST", () => {
    const incomingMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "CREATE_COMPONENT_REQUEST",
      payload: {
        projectId: "mock-project-id-coord",
        animationDesignBrief: { sceneName: "Test Scene", description: "A test scene" },
      },
      sender: "ADBAgent", 
      recipient: "CoordinatorAgent",
      correlationId: "corr-component-req",
      timestamp: new Date().toISOString(), // Changed from createdAt
    };
    const mockTaskId = "mock-task-id-for-component-req"; // Specific ID for this block

    beforeEach(() => {
      mockCreateTask.mockResolvedValueOnce({
        id: mockTaskId,
        state: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        message: createTextMessage("Task created for component"),
        artifacts: [],
        // Removed: retries, projectId, messages array
      } as Task);
    });

    it("should log the incoming message", async () => {
      await coordinator.processMessage(incomingMessage);
      const callsToLogAgentMessage = mockLogAgentMessage.mock.calls;
      const foundCallWithTrue = callsToLogAgentMessage.some(callArgs => 
        callArgs[0] === incomingMessage && callArgs[1] === true
      );
      expect(foundCallWithTrue).toBe(true);
    });

    it("should update task state to 'working'", async () => {
      await coordinator.processMessage(incomingMessage);
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockTaskId,
        "working",
        expect.any(Object), // Message object or string
        undefined, // Artifacts
        "PROCESSING"
      );
    });

    it("should request LLM for next step agent", async () => {
      // Setup: Ensure getTaskById returns a task so LLM is called
      mockGetTaskById.mockResolvedValueOnce({
        id: mockTaskId,
        state: "submitted",
        message: createTextMessage("Initial task message from mockGetTaskById"),
        artifacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array
      } as Task);
      await coordinator.processMessage(incomingMessage);
      expect(mockGenerateStructuredResponse).toHaveBeenCalled();
    });

    it("should create and log an A2A message for the next agent based on LLM response", async () => {
      const nextAgent = "TestNextAgent";
      mockGenerateStructuredResponse.mockResolvedValueOnce({ nextStepAgent: nextAgent, reason: "test reason" });
      mockGetTaskById.mockResolvedValueOnce({
        id: mockTaskId,
        state: "submitted",
        message: createTextMessage("Initial task message from mockGetTaskById"),
        artifacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array
      } as Task);

      const response = await coordinator.processMessage(incomingMessage);

      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "TASK_ASSIGNMENT",
        mockTaskId,
        nextAgent,
        expect.any(Object),
        expect.any(Array),
        incomingMessage.id
      );
      // Check if the created message (from mockCreateA2AMessage's return) was logged
      const createdMessage = mockCreateA2AMessage.mock.results[0]?.value;
      expect(mockLogAgentMessage).toHaveBeenCalledWith(createdMessage, true);
      expect(response).toEqual(createdMessage);
    });

    it("should handle LLM failure gracefully, log error, and update task to error state", async () => {
      mockGenerateStructuredResponse.mockResolvedValueOnce(null); // Simulate LLM failure
      mockGetTaskById.mockResolvedValueOnce({
        id: mockTaskId,
        state: "submitted",
        message: createTextMessage("Initial task message from mockGetTaskById"),
        artifacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array
      } as Task);

      const response = await coordinator.processMessage(incomingMessage);

      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingMessage, true); // Initial log
      // Check for error logging related to LLM failure
      const errorLogCall = mockLogAgentMessage.mock.calls.find(call => 
        call[0].type === 'ERROR_INTERNAL' && call[0].recipient === "CoordinatorAgent"
      );
      expect(errorLogCall).toBeDefined();
      if(errorLogCall) {
        expect(errorLogCall[0].payload.error).toContain("LLM failed to provide a next step");
      }
      
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockTaskId,
        "failed",
        expect.stringContaining("LLM failed to provide a next step"),
        undefined,
        "FAILED"
      );
      expect(response).toBeNull();
    });

     it("should use generateResponse if generateStructuredResponse fails and taskManager.getTaskById returns a task with currentStep 'ERROR_HANDLER'", async () => {
      mockGenerateStructuredResponse.mockResolvedValueOnce(null); // First LLM call fails
      mockGetTaskById.mockResolvedValueOnce({
        id: mockTaskId, 
        state: "failed", // Task is in an error state
        message: createTextMessage("Initial task message from mockGetTaskById"),
        artifacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array
      } as Task);
      mockGenerateResponse.mockResolvedValueOnce("Fallback LLM general response"); // Fallback LLM call succeeds

      await coordinator.processMessage(incomingMessage);
      expect(mockGenerateResponse).toHaveBeenCalled();
      // Further assertions for this specific path could be added here, e.g. task state update after fallback
    });
  });

  describe("processMessage - TASK_COMPLETED_NOTIFICATION", () => {
    const taskCompletedMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "TASK_COMPLETED_NOTIFICATION",
      sender: "BuilderAgent",
      recipient: "CoordinatorAgent",
      payload: {
        taskId: mockVideoTaskId,
        message: createTextMessage("Task completed"),
        artifacts: [{ id: "artifact1", type: "file", mimeType: "application/javascript", url: "/build.js", createdAt: new Date().toISOString() } as Artifact],
      },
      timestamp: new Date().toISOString(), // Changed from createdAt
    };

    it("should log the incoming TASK_COMPLETED_NOTIFICATION message", async () => {
      await coordinator.processMessage(taskCompletedMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(taskCompletedMessage, true);
    });

    it("should update the task state to 'completed' using data from the message", async () => {
      await coordinator.processMessage(taskCompletedMessage);
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockVideoTaskId,
        "completed",
        taskCompletedMessage.payload.message, // message
        taskCompletedMessage.payload.artifacts, // artifacts
        "COMPLETED" // internalStatus
      );
    });

    it("should not call LLM for TASK_COMPLETED_NOTIFICATION", async () => {
      await coordinator.processMessage(taskCompletedMessage);
      expect(mockGenerateStructuredResponse).not.toHaveBeenCalled();
      expect(mockGenerateResponse).not.toHaveBeenCalled();
    });

    it("should return null as there's no further message to send", async () => {
      const response = await coordinator.processMessage(taskCompletedMessage);
      expect(response).toBeNull();
    });
  });

  describe("processMessage - TASK_REJECTION_NOTIFICATION", () => {
    const taskRejectionMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "TASK_REJECTION_NOTIFICATION",
      sender: "BuilderAgent",
      recipient: "CoordinatorAgent",
      payload: {
        taskId: mockVideoTaskId,
        message: createTextMessage("Task rejected"),
        artifacts: [{ id: "artifact1", type: "file", mimeType: "application/javascript", url: "/build.js", createdAt: new Date().toISOString() } as Artifact],
      },
      timestamp: new Date().toISOString(), // Changed from createdAt
    };

    it("should log the incoming TASK_REJECTION_NOTIFICATION message", async () => {
      await coordinator.processMessage(taskRejectionMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(taskRejectionMessage, true);
    });

    it("should update the task state to 'failed' using data from the message", async () => {
      await coordinator.processMessage(taskRejectionMessage);
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockVideoTaskId,
        "failed",
        taskRejectionMessage.payload.message, // message
        taskRejectionMessage.payload.artifacts, // artifacts
        "FAILED" // internalStatus
      );
    });

    it("should not call LLM for TASK_REJECTION_NOTIFICATION", async () => {
      await coordinator.processMessage(taskRejectionMessage);
      expect(mockGenerateStructuredResponse).not.toHaveBeenCalled();
      expect(mockGenerateResponse).not.toHaveBeenCalled();
    });

    it("should return null as there's no further message to send", async () => {
      const response = await coordinator.processMessage(taskRejectionMessage);
      expect(response).toBeNull();
    });
  });

  describe("processMessage - ERROR_NOTIFICATION", () => {
    let errorNotificationMessage: AgentMessage;

    beforeEach(() => {
      errorNotificationMessage = {
        id: crypto.randomUUID(),
        type: "ERROR_NOTIFICATION",
        sender: "BuilderAgent",
        recipient: "CoordinatorAgent",
        payload: {
          taskId: mockVideoTaskId,
          message: createTextMessage("Error occurred"),
          artifacts: [{ id: "artifact1", type: "file", mimeType: "application/javascript", url: "/build.js", createdAt: new Date().toISOString() } as Artifact],
        },
        timestamp: new Date().toISOString(), // Changed from createdAt
      };
    });

    it("should log the incoming ERROR_NOTIFICATION message", async () => {
      await coordinator.processMessage(errorNotificationMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(errorNotificationMessage, true);
    });

    it("should update task state to 'failed' and then attempt LLM based error handling", async () => {
      mockGetTaskById.mockResolvedValueOnce({ 
        id: mockVideoTaskId, 
        state: "working", 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array. `message` and `artifacts` can be undefined or set if needed.
      });
      mockGenerateStructuredResponse.mockResolvedValueOnce({ nextStepAgent: "ErrorFixerAgent", reason: "Attempting to fix error" });

      await coordinator.processMessage(errorNotificationMessage);

      // First, update to failed state from notification
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockVideoTaskId,
        "failed",
        errorNotificationMessage.payload.message,
        errorNotificationMessage.payload.artifacts,
        "FAILED"
      );

      // Then, LLM should be called for error handling strategy
      expect(mockGenerateStructuredResponse).toHaveBeenCalled();
      
      // Then, a new task assignment message should be created for the error handling agent
      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "TASK_ASSIGNMENT",
        mockVideoTaskId,
        "ErrorFixerAgent",
        expect.any(Object), // Original message or a wrapper
        expect.any(Array),
        errorNotificationMessage.id
      );
    });
    
    it("should handle LLM failure during error processing by logging and returning null", async () => {
      mockGetTaskById.mockResolvedValueOnce({ 
        id: mockVideoTaskId, 
        state: "working", 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
      mockGenerateStructuredResponse.mockResolvedValueOnce(null); // LLM fails to give error handling step

      const response = await coordinator.processMessage(errorNotificationMessage);

      expect(mockLogAgentMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'ERROR_INTERNAL' }), false);
      expect(mockUpdateTaskState).toHaveBeenCalledWith(
        mockVideoTaskId,
        "failed",
        expect.stringContaining("LLM failed to provide a next step for error handling"),
        undefined,
        "FAILED"
      ); // This might be called twice, once for initial error, once for LLM fail. Let's check for the second one.
      expect(response).toBeNull();
    });
  });

  describe("processMessage - GENERAL_MESSAGE_REQUEST for information", () => {
    const generalMessageRequest: AgentMessage = {
      id: crypto.randomUUID(),
      type: "GENERAL_MESSAGE_REQUEST",
      sender: "RequestingAgent",
      recipient: "CoordinatorAgent",
      payload: {
        taskId: mockVideoTaskId,
        message: createTextMessage("What is the current task status?"),
      },
      timestamp: new Date().toISOString(), // Changed from createdAt
    };

    it("should log the incoming GENERAL_MESSAGE_REQUEST", async () => {
      await coordinator.processMessage(generalMessageRequest);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(generalMessageRequest, true);
    });

    it("should use generateResponse (general LLM) to answer the informational request", async () => {
      mockGenerateResponse.mockResolvedValueOnce("This is a general answer.");
      await coordinator.processMessage(generalMessageRequest);
      expect(mockGenerateResponse).toHaveBeenCalled();
      expect(mockGenerateStructuredResponse).not.toHaveBeenCalled(); // Should not use structured response here
    });

    it("should create and log an A2A message with the LLM's answer", async () => {
      const llmAnswer = "The current task status is working.";
      mockGenerateResponse.mockResolvedValueOnce(llmAnswer);
      
      const response = await coordinator.processMessage(generalMessageRequest);

      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "GENERAL_MESSAGE_RESPONSE",
        mockVideoTaskId,
        "RequestingAgent", // recipient is the original sender
        expect.objectContaining({ parts: expect.arrayContaining([expect.objectContaining({ text: llmAnswer })]) }),
        [],
        generalMessageRequest.id
      );
      const createdMessage = mockCreateA2AMessage.mock.results[0]?.value;
      expect(mockLogAgentMessage).toHaveBeenCalledWith(createdMessage, true);
      expect(response).toEqual(createdMessage);
    });

    it("should handle LLM (generateResponse) failure by logging error and sending an error response", async () => {
      mockGenerateResponse.mockResolvedValueOnce(null); // LLM fails
      await coordinator.processMessage(generalMessageRequest);

      // Error log for LLM failure
      const errorLogCall = mockLogAgentMessage.mock.calls.find(call => 
        call[0].type === 'ERROR_INTERNAL' && call[0].recipient === "CoordinatorAgent"
      );
      expect(errorLogCall).toBeDefined();
      if (errorLogCall) {
        expect(errorLogCall[0].payload.error).toContain("LLM failed to generate a response for GENERAL_MESSAGE_REQUEST");
      }

      // Send GENERAL_MESSAGE_RESPONSE with error content
      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "GENERAL_MESSAGE_RESPONSE",
        mockVideoTaskId,
        "RequestingAgent",
        expect.objectContaining({ parts: expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining("Sorry, I couldn't process your request due to an internal error.") })]) }),
        [],
        generalMessageRequest.id
      );
    });
  });

  describe("processMessage - Unhandled message types", () => {
    const unhandledMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "UNHANDLED_TYPE",
      sender: "SomeAgent",
      recipient: "CoordinatorAgent",
      payload: {
        taskId: mockVideoTaskId,
        message: createTextMessage("This is an unhandled message type"),
      },
      timestamp: new Date().toISOString(), // Changed from createdAt
    };

    it("should log the unhandled message", async () => {
      await coordinator.processMessage(unhandledMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(unhandledMessage, true);
    });

    it("should call generateStructuredResponse for routing/decision on unhandled types", async () => {
      mockGetTaskById.mockResolvedValueOnce({ id: mockVideoTaskId, state: "working" } as any);
      await coordinator.processMessage(unhandledMessage);
      expect(mockGenerateStructuredResponse).toHaveBeenCalled();
    });

    it("should send TASK_REJECTION if LLM suggests no agent or fails for unhandled type", async () => {
      mockGetTaskById.mockResolvedValueOnce({ id: mockVideoTaskId, state: "working" } as any);
      mockGenerateStructuredResponse.mockResolvedValueOnce(null); // LLM fails or suggests no agent
      
      const response = await coordinator.processMessage(unhandledMessage);

      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "TASK_REJECTION",
        mockVideoTaskId,
        unhandledMessage.sender,
        expect.objectContaining({ parts: expect.arrayContaining([expect.objectContaining({text: expect.stringContaining("Unable to handle message type UNHANDLED_TYPE")})])}),
        [],
        unhandledMessage.id
      );
      expect(mockLogAgentMessage).toHaveBeenCalledWith(mockCreateA2AMessage.mock.results[0]?.value, true);
      expect(mockUpdateTaskState).toHaveBeenCalledWith(mockVideoTaskId, "failed", expect.any(Object), undefined, "FAILED");
      expect(response).toEqual(mockCreateA2AMessage.mock.results[0]?.value);
    });

    it("should route to LLM-suggested agent if applicable for unhandled type", async () => {
      const suggestedNextAgent = "SpecializedAgent";
      mockGetTaskById.mockResolvedValueOnce({ id: mockVideoTaskId, state: "working" } as any);
      mockGenerateStructuredResponse.mockResolvedValueOnce({ nextStepAgent: suggestedNextAgent, reason: "Routing to specialized agent for unhandled type" });

      await coordinator.processMessage(unhandledMessage);

      expect(mockCreateA2AMessage).toHaveBeenCalledWith(
        "TASK_ASSIGNMENT", // Or a more generic routing type if defined
        mockVideoTaskId,
        suggestedNextAgent,
        expect.any(Object), // Original message or a wrapper
        expect.any(Array),
        unhandledMessage.id
      );
    });
  });

  describe("Error Handling in _handleErrorAndUpdateState", () => {
    it("should log error, update task state, and potentially call LLM for error strategy", async () => {
      // This tests the private method _handleErrorAndUpdateState indirectly via a path that calls it.
      // Let's use the ERROR_NOTIFICATION path which explicitly calls it.
      mockGetTaskById.mockResolvedValueOnce({ 
        id: mockVideoTaskId, 
        state: "working", 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        // Removed: retries, projectId, messages array
      });
      mockGenerateStructuredResponse.mockResolvedValueOnce({ nextStepAgent: "ErrorFixerAgent", reason: "Fixing now" });

      await coordinator.processMessage(errorNotificationMessage); // errorNotificationMessage defined in its describe block

      // Log incoming error notification
      expect(mockLogAgentMessage).toHaveBeenCalledWith(errorNotificationMessage, true);
      // Update task to failed from the notification
      expect(mockUpdateTaskState).toHaveBeenCalledWith(mockVideoTaskId, "failed", errorNotificationMessage.payload.message, errorNotificationMessage.payload.artifacts, "FAILED");
      // LLM called for error strategy
      expect(mockGenerateStructuredResponse).toHaveBeenCalledTimes(1); // Only once for the error handling strategy
      // Task assignment to error handling agent
      expect(mockCreateA2AMessage).toHaveBeenCalledWith("TASK_ASSIGNMENT", mockVideoTaskId, "ErrorFixerAgent", expect.any(Object), expect.any(Array), errorNotificationMessage.id);
    });

    it("should handle LLM failure when deciding error strategy", async () => {
      mockGetTaskById.mockResolvedValueOnce({ 
        id: mockVideoTaskId, 
        state: "working", 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
      mockGenerateStructuredResponse.mockResolvedValueOnce(null); // LLM fails to give strategy

      await coordinator.processMessage(errorNotificationMessage);

      // Final update to failed state due to LLM failure in error handling
      const updateCalls = mockUpdateTaskState.mock.calls;
      const finalErrorCall = updateCalls.find(call => call[0] === mockVideoTaskId && call[1] === "failed" && typeof call[2] === 'string' && call[2].includes("LLM failed to provide a next step for error handling"));
      expect(finalErrorCall).toBeDefined();
      // Ensure internalStatus was FAILED for this update
      expect(finalErrorCall?.[4]).toBe("FAILED");
      
      // Log the internal error for LLM failure
      const errorLogCall = mockLogAgentMessage.mock.calls.find(call => 
        call[0].type === 'ERROR_INTERNAL' && call[0].recipient === "CoordinatorAgent" && !call[1] // success = false
      );
      expect(errorLogCall).toBeDefined();
    });
  });

  // Test for when a task is not found by getTaskById
  describe("Task Not Found scenarios", () => {
    it("should log an error and not proceed if task not found for CREATE_COMPONENT_REQUEST", async () => {
      mockGetTaskById.mockResolvedValueOnce(null); // Task not found
      const incomingMessage: AgentMessage = {
        id: "msg-create-notfound",
        type: "CREATE_COMPONENT_REQUEST",
        sender: "APIService",
        recipient: "CoordinatorAgent",
        payload: { taskId: "non-existent-task", componentName: "TestComponent", props: { text: "Hello" } },
        timestamp: new Date().toISOString(), // Changed from createdAt
      };
      const response = await coordinator.processMessage(incomingMessage);

      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingMessage, true);
      const errorLogCall = mockLogAgentMessage.mock.calls.find(call => 
        call[0].type === 'ERROR_INTERNAL' && 
        call[0].recipient === "CoordinatorAgent" && 
        call[0].payload.error.includes("Task not found: non-existent-task")
      );
      expect(errorLogCall).toBeDefined();
      expect(mockUpdateTaskState).not.toHaveBeenCalledWith("non-existent-task", expect.anything(), expect.anything(), expect.anything(), expect.anything());
      expect(mockGenerateStructuredResponse).not.toHaveBeenCalled();
      expect(response).toBeNull();
    });

    it("should log an error and not proceed if task not found for ERROR_NOTIFICATION", async () => {
      mockGetTaskById.mockResolvedValueOnce(null); // Task not found
      const localErrorNotificationMessage: AgentMessage = { // Defined locally for this test
        id: "msg-error-notfound",
        type: "ERROR_NOTIFICATION",
        sender: "BuilderAgent",
        recipient: "CoordinatorAgent",
        payload: { taskId: "non-existent-task-for-error", message: createTextMessage("Build failed") },
        timestamp: new Date().toISOString(), // Changed from createdAt
      };
      const response = await coordinator.processMessage(localErrorNotificationMessage); 

      expect(mockLogAgentMessage).toHaveBeenCalledWith(localErrorNotificationMessage, true);
       const errorLogCall = mockLogAgentMessage.mock.calls.find(call => 
        call[0].type === 'ERROR_INTERNAL' && 
        call[0].recipient === "CoordinatorAgent" && 
        call[0].payload.error.includes("Task not found: non-existent-task-for-error")
      );
      expect(errorLogCall).toBeDefined();
      expect(mockUpdateTaskState).not.toHaveBeenCalledWith("non-existent-task-for-error", expect.anything(), expect.anything(), expect.anything(), expect.anything());
      expect(mockGenerateStructuredResponse).not.toHaveBeenCalled();
      expect(response).toBeNull();
    });
  });
});