// src/server/agents/__tests__/error-fixer-agent.test.ts
import { ErrorFixerAgent, type ErrorFixerAgentParams } from '../error-fixer-agent';
import { BaseAgent, type AgentMessage } from '../base-agent';
import { taskManager } from '~/server/services/a2a/taskManager.service';
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from '~/types/a2a';
import { createTextMessage, createFileArtifact, mapA2AToInternalState } from '~/types/a2a';
import { repairComponentSyntax } from '~/server/workers/repairComponentSyntax';
import crypto from "crypto";

// Mock repairComponentSyntax worker
jest.mock("~/server/workers/repairComponentSyntax", () => ({
  repairComponentSyntax: jest.fn(),
}));

// Mock TaskManager
jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    updateTaskState: jest.fn(), 
    getTaskById: jest.fn(),
    addTaskArtifact: jest.fn(),
  },
}));

// Mock BaseAgent methods
const mockLogAgentMessage = jest.fn();
const mockUpdateTaskStateBase = jest.fn(); 
const mockAddTaskArtifactBase = jest.fn();
const mockCreateA2AMessageBase = jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId, payload) => ({
  id: crypto.randomUUID(), type, payload: { taskId, message, artifacts, ...(payload || {}) }, sender: "ErrorFixerAgent", recipient, correlationId
}));
const mockCreateMessageBase = jest.fn().mockImplementation((type, payload, recipient, correlationId) => ({
    id: crypto.randomUUID(), type, payload, sender: "ErrorFixerAgent", recipient, correlationId
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
      agent.createMessage = mockCreateMessageBase; 
      agent.createSimpleTextMessage = mockCreateSimpleTextMessageBase;
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});

describe("ErrorFixerAgent", () => {
  let errorFixer: ErrorFixerAgent;
  const mockTaskId = "mock-task-fixer";
  const mockComponentCode = "const A = 1; const A = 2; export default A;";
  const mockErrors = ["Duplicate declaration A"];
  const mockAnimationDesignBrief = { description: "Test brief" };
  const defaultErrorFixerParams: ErrorFixerAgentParams = {
    modelName: 'test-fixer-model',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    errorFixer = new ErrorFixerAgent(defaultErrorFixerParams, taskManager as jest.Mocked<typeof taskManager>);

    // Spy on BaseAgent methods
    jest.spyOn(BaseAgent.prototype, 'logAgentMessage').mockImplementation(mockLogAgentMessage);
    jest.spyOn(BaseAgent.prototype, 'updateTaskState').mockImplementation(mockUpdateTaskStateBase);
    jest.spyOn(BaseAgent.prototype, 'addTaskArtifact').mockImplementation(mockAddTaskArtifactBase);
    jest.spyOn(BaseAgent.prototype, 'createA2AMessage').mockImplementation(mockCreateA2AMessageBase);
  });

  const createErrorFixRequestMessage = (
    type: "COMPONENT_SYNTAX_ERROR" | "COMPONENT_BUILD_ERROR", 
    payloadOverrides?: Partial<AgentMessage['payload']>
  ): AgentMessage => ({
    id: crypto.randomUUID(),
    type,
    payload: {
      taskId: mockTaskId,
      componentCode: mockComponentCode,
      errors: mockErrors,
      animationDesignBrief: mockAnimationDesignBrief,
      attempts: 0,
      ...payloadOverrides
    },
    sender: "BuilderAgent",
    recipient: "ErrorFixerAgent",
  });

  describe("processMessage - Error Fixing Scenarios", () => {
    it("should attempt to fix code and send REBUILD_COMPONENT_REQUEST if successful", async () => {
      const fixedCode = "const A = 1; export default A;";
      (repairComponentSyntax as jest.Mock).mockResolvedValueOnce({
        code: fixedCode,
        fixes: ["Removed duplicate A"],
        fixedSyntaxErrors: true,
      });

      const incomingMessage = createErrorFixRequestMessage("COMPONENT_SYNTAX_ERROR");
      const response = await errorFixer.processMessage(incomingMessage);

      expect(repairComponentSyntax).toHaveBeenCalledWith(mockComponentCode); 
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'generating');
      expect(response?.type).toBe("REBUILD_COMPONENT_REQUEST");
      expect(response?.recipient).toBe("BuilderAgent");
      expect(response?.payload.fixedCode).toBe(fixedCode);
      expect(response?.payload.taskId).toBe(mockTaskId);
      expect(mockCreateMessageBase).toHaveBeenCalled(); 
    });

    it("should send COMPONENT_FIX_ERROR to CoordinatorAgent if fix is unsuccessful (no changes made)", async () => {
      (repairComponentSyntax as jest.Mock).mockResolvedValueOnce({
        code: mockComponentCode, 
        fixes: [],
        fixedSyntaxErrors: false,
      });

      const incomingMessage = createErrorFixRequestMessage("COMPONENT_BUILD_ERROR");
      const response = await errorFixer.processMessage(incomingMessage);

      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'fix_failed');
      expect(response?.type).toBe("COMPONENT_FIX_ERROR");
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
          const errorText = firstPart.text; 
          expect(errorText).toContain("Failed to fix component errors after 1 attempt(s). Issues: none");
        }
      }
      expect(mockCreateA2AMessageBase).toHaveBeenCalled();
    });

    it("should increment attempts and reflect in error message if fix fails multiple times", async () => {
      (repairComponentSyntax as jest.Mock).mockResolvedValue({
        code: mockComponentCode, fixes: ["some attempted fix"], fixedSyntaxErrors: false
      }); 

      const incomingMessageAttempt1 = createErrorFixRequestMessage("COMPONENT_SYNTAX_ERROR", { attempts: 0 });
      const response1 = await errorFixer.processMessage(incomingMessageAttempt1);
      const messagePayload1 = response1?.payload.message;
      expect(messagePayload1?.parts?.length).toBeGreaterThan(0);
      if (messagePayload1 && messagePayload1.parts && messagePayload1.parts.length > 0) {
        const textPart1 = messagePayload1.parts[0] as { type?: string, text?: string };
        expect(textPart1?.text).toBeDefined();
        if (typeof textPart1?.text === 'string') {
          const errorText1 = textPart1.text;
          expect(errorText1).toContain("Failed to fix component errors after 1 attempt(s). Issues: some attempted fix");
        }
      }
      expect(response1?.payload.attempts).toBe(1);

      const incomingMessageAttempt2 = createErrorFixRequestMessage("COMPONENT_SYNTAX_ERROR", { attempts: 1, componentCode: "different bad code" });
      const response2 = await errorFixer.processMessage(incomingMessageAttempt2);
      const messagePayload2 = response2?.payload.message;
      expect(messagePayload2?.parts?.length).toBeGreaterThan(0);
      if (messagePayload2 && messagePayload2.parts && messagePayload2.parts.length > 0) {
        const textPart2 = messagePayload2.parts[0] as { type?: string, text?: string };
        expect(textPart2?.text).toBeDefined();
        if (typeof textPart2?.text === 'string') {
          const errorText2 = textPart2.text;
          expect(errorText2).toContain("Failed to fix component errors after 2 attempt(s). Issues: some attempted fix");
        }
      }
      expect(response2?.payload.attempts).toBe(2);
    });

    it("should return COMPONENT_PROCESS_ERROR if componentCode is missing", async () => {
      const incomingMessage = createErrorFixRequestMessage("COMPONENT_SYNTAX_ERROR", { componentCode: undefined });
      const response = await errorFixer.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      const messagePayload = response?.payload.message;
      expect(messagePayload?.parts?.length).toBeGreaterThan(0);
      if (messagePayload && messagePayload.parts && messagePayload.parts.length > 0) {
        const textPart = messagePayload.parts[0] as { type?: string, text?: string };
        expect(textPart?.text).toBeDefined();
        if (typeof textPart?.text === 'string') {
          const errorText = textPart.text;
          expect(errorText).toContain("Missing componentCode or errors");
        }
      }
    });

    it("should return COMPONENT_PROCESS_ERROR if errors array is missing", async () => {
      const incomingMessage = createErrorFixRequestMessage("COMPONENT_SYNTAX_ERROR", { errors: undefined });
      const response = await errorFixer.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      const messagePayload = response?.payload.message;
      expect(messagePayload?.parts?.length).toBeGreaterThan(0);
      if (messagePayload && messagePayload.parts && messagePayload.parts.length > 0) {
        const textPart = messagePayload.parts[0] as { type?: string, text?: string };
        expect(textPart?.text).toBeDefined();
        if (typeof textPart?.text === 'string') {
          const errorText = textPart.text;
          expect(errorText).toContain("Missing componentCode or errors");
        }
      }
    });
  });
  
  describe("getAgentCard", () => {
    it("should return an agent card with specific skills for error fixing", () => {
      const card = errorFixer.getAgentCard();
      expect(card.name).toBe("ErrorFixerAgent");
      expect(card.skills).toHaveLength(1);
      expect(card.skills[0].id).toBe("fix-component-code");
    });
  });
}); 