import { ADBAgent } from "../adb-agent";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill, AnimationBriefGenerationParams, StructuredAgentMessage } from "~/types/a2a";
import { createTextMessage, createFileArtifact } from "~/types/a2a";
import { generateAnimationDesignBrief } from "~/server/services/animationDesigner.service";
import crypto from "crypto";

// Mock generateAnimationDesignBrief service
jest.mock("~/server/services/animationDesigner.service", () => ({
  generateAnimationDesignBrief: jest.fn(),
}));

// Mock TaskManager
jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    updateTaskState: jest.fn(),
    addTaskArtifact: jest.fn(),
    // No need to mock createTask as ADBAgent doesn't call it directly when processing its primary message type
  },
}));

// Mock BaseAgent methods
const mockLogAgentMessage = jest.fn();
const mockUpdateTaskStateBase = jest.fn();
const mockAddTaskArtifactBase = jest.fn(); 
const mockCreateA2AMessageBase = jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId, payload) => ({
  id: crypto.randomUUID(), type, payload: { taskId, message, artifacts, ...(payload || {}) }, sender: "ADBAgent", recipient, correlationId
}));
const mockCreateSimpleTextMessageBase = jest.fn((text) => createTextMessage(text));

jest.mock("../base-agent", () => {
  const originalBaseAgent = jest.requireActual("../base-agent").BaseAgent;
  return {
    BaseAgent: jest.fn().mockImplementation((name, description) => {
      const agent = new originalBaseAgent(name, description);
      agent.logAgentMessage = mockLogAgentMessage;
      agent.updateTaskState = mockUpdateTaskStateBase; 
      agent.addTaskArtifact = mockAddTaskArtifactBase; 
      agent.createA2AMessage = mockCreateA2AMessageBase;
      agent.createSimpleTextMessage = mockCreateSimpleTextMessageBase;
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});

describe("ADBAgent", () => {
  let adbAgent: ADBAgent;
  const mockTaskId = "mock-task-adb";
  const mockProjectId = "mock-project-adb";
  const mockSceneId = "mock-scene-adb";
  const mockBriefData = { title: "Generated ADB" };
  const mockBriefId = "mock-brief-id";

  beforeEach(() => {
    jest.clearAllMocks();
    adbAgent = new ADBAgent();

    (generateAnimationDesignBrief as jest.Mock).mockResolvedValue({
      brief: mockBriefData,
      briefId: mockBriefId,
    });
  });

  const createGenerateBriefMessage = (payloadOverrides: Partial<AnimationBriefGenerationParams & { componentJobId?: string, taskId?: string }> = {}): AgentMessage => ({
    id: crypto.randomUUID(),
    type: "GENERATE_DESIGN_BRIEF_REQUEST",
    payload: {
      description: "Test ADB description",
      projectId: mockProjectId,
      sceneId: mockSceneId,
      duration: 150,
      dimensions: { width: 1920, height: 1080 },
      taskId: mockTaskId, // Ensure taskId is part of payload for consistency
      ...payloadOverrides,
    },
    sender: "UserInterfaceAgent", // Or another agent that might trigger this
    recipient: "ADBAgent",
  });

  describe("processMessage - GENERATE_DESIGN_BRIEF_REQUEST", () => {
    it("should call generateAnimationDesignBrief with correct parameters", async () => {
      const incomingMessage = createGenerateBriefMessage();
      await adbAgent.processMessage(incomingMessage);
      expect(generateAnimationDesignBrief).toHaveBeenCalledWith(expect.objectContaining({
        projectId: mockProjectId,
        sceneId: mockSceneId,
        scenePurpose: "Test ADB description",
        desiredDurationInFrames: 150,
        componentJobId: mockTaskId, // Ensure this is passed to the service
      }));
    });

    it("should log the incoming message and update task state to 'working'", async () => {
      const incomingMessage = createGenerateBriefMessage();
      await adbAgent.processMessage(incomingMessage);
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingMessage, true);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'pending');
    });

    it("should add the generated brief as an artifact and update task state to 'completed'", async () => {
      const incomingMessage = createGenerateBriefMessage();
      await adbAgent.processMessage(incomingMessage);
      expect(mockAddTaskArtifactBase).toHaveBeenCalledWith(mockTaskId, expect.objectContaining({
        type: "data",
        mimeType: "application/json",
        data: mockBriefData,
        description: "Animation Design Brief",
      }));
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'completed', expect.anything(), 'pending');
    });

    it("should return a CREATE_COMPONENT_REQUEST message for CoordinatorAgent", async () => {
      const incomingMessage = createGenerateBriefMessage();
      const response = await adbAgent.processMessage(incomingMessage);
      expect(response?.type).toBe("CREATE_COMPONENT_REQUEST");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.taskId).toBe(mockTaskId);

      const messagePayload = response?.payload.message;
      expect(messagePayload).toBeDefined();
      expect(messagePayload?.parts).toBeDefined();
      expect(messagePayload?.parts.length).toBeGreaterThan(0);
      if (messagePayload && messagePayload.parts && messagePayload.parts.length > 0) {
        const firstPart = messagePayload.parts[0] as { type?: string, text?: string };
        expect(firstPart).toBeDefined();
        expect(firstPart.type).toBe('text');
        expect(firstPart.text).toBeDefined();
        if (typeof firstPart.text === 'string') {
          expect(firstPart.text).toContain("Request to create component from generated ADB");
        }
      }
      
      expect(response?.payload.artifacts[0].data).toEqual(mockBriefData);
      expect(response?.payload.animationDesignBrief).toEqual(mockBriefData); 
      expect(response?.payload.projectId).toBe(mockProjectId);
    });

    it("should handle errors during ADB generation and notify CoordinatorAgent", async () => {
      const genError = new Error("ADB generation failed");
      (generateAnimationDesignBrief as jest.Mock).mockRejectedValueOnce(genError);
      const incomingMessage = createGenerateBriefMessage();
      const response = await adbAgent.processMessage(incomingMessage);

      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("ADB_GENERATION_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      
      const errorMessagePayload = response?.payload.message;
      expect(errorMessagePayload).toBeDefined();
      expect(errorMessagePayload?.parts).toBeDefined();
      expect(errorMessagePayload?.parts.length).toBeGreaterThan(0);

      if (errorMessagePayload && errorMessagePayload.parts && errorMessagePayload.parts.length > 0) {
        const firstErrorPart = errorMessagePayload.parts[0] as { type?: string, text?: string };
        expect(firstErrorPart).toBeDefined();
        expect(firstErrorPart.type).toBe('text');
        expect(firstErrorPart.text).toBeDefined();
        if (typeof firstErrorPart.text === 'string') {
          const errorText = firstErrorPart.text;
          expect(errorText).toContain("ADBAgent error: ADB generation failed");
        }
      }
    });
  });
  
  describe("getAgentCard", () => {
    it("should return an agent card with ADB generation skills", () => {
      const card = adbAgent.getAgentCard();
      expect(card.name).toBe("ADBAgent");
      expect(card.skills).toHaveLength(1);
      expect(card.skills[0].id).toBe("generate-animation-design-brief");
    });
  });
}); 