// src/server/agents/__tests__/ui-agent.test.ts
import { UIAgent } from "../ui-agent";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, TaskStatus, SSEEvent, AgentSkill } from "~/types/a2a";
import { createTextMessage, createStatusUpdateEvent } from "~/types/a2a";
import crypto from "crypto";
import { Subject } from "rxjs";

// Mock TaskManager
const mockCreateTaskStream = jest.fn(() => new Subject<SSEEvent>());
const mockGetTaskStatus = jest.fn();

jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    getTaskStatus: mockGetTaskStatus,
    createTaskStream: mockCreateTaskStream,
  },
}));

// Mock BaseAgent methods
const mockLogAgentMessage = jest.fn();

jest.mock("../base-agent", () => {
  const originalBaseAgent = jest.requireActual("../base-agent").BaseAgent;
  return {
    BaseAgent: jest.fn().mockImplementation((name, description) => {
      const agent = new originalBaseAgent(name, description);
      agent.logAgentMessage = mockLogAgentMessage;
      // UIAgent doesn't typically send messages, so createA2AMessage mock might not be strictly needed for its own actions
      agent.createA2AMessage = jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => ({
        id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: name, recipient, correlationId
      }));
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});

describe("UIAgent", () => {
  let uiAgent: UIAgent;
  const mockTaskId = "mock-task-ui";
  const mockTaskManager = taskManager as jest.Mocked<typeof taskManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    uiAgent = new UIAgent(mockTaskManager);
  });

  const createNotificationMessage = (type: "TASK_COMPLETED_NOTIFICATION" | "TASK_FAILED_NOTIFICATION", errorMsg?: string): AgentMessage => ({
    id: crypto.randomUUID(),
    type,
    payload: {
      taskId: mockTaskId,
      componentJobId: mockTaskId, // for consistency
      error: errorMsg,
      // artifacts might be present in a real COMPLETED notification
    },
    sender: "CoordinatorAgent",
    recipient: "UIAgent",
  });

  describe("processMessage - TASK_COMPLETED_NOTIFICATION", () => {
    it("should emit a 'completed' SSE event if task state is completed", async () => {
      const mockStream = new Subject<SSEEvent>();
      mockCreateTaskStream.mockReturnValue(mockStream);
      const nextSpy = jest.spyOn(mockStream, 'next');
      const completeSpy = jest.spyOn(mockStream, 'complete');

      const mockTaskStatus: TaskStatus = { id: mockTaskId, state: 'completed', updatedAt: new Date().toISOString(), message: createTextMessage("Done!") };
      mockGetTaskStatus.mockResolvedValue(mockTaskStatus);

      const incomingMessage = createNotificationMessage("TASK_COMPLETED_NOTIFICATION");
      await uiAgent.processMessage(incomingMessage);

      expect(taskManager.getTaskStatus).toHaveBeenCalledWith(mockTaskId);
      expect(mockCreateTaskStream).toHaveBeenCalledWith(mockTaskId);
      expect(nextSpy).toHaveBeenCalledWith(createStatusUpdateEvent(mockTaskStatus));
      expect(completeSpy).toHaveBeenCalled();
      expect(mockLogAgentMessage).toHaveBeenCalledWith(incomingMessage, true);
    });

    it("should log a warning if task state is not completed", async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockTaskStatus: TaskStatus = { id: mockTaskId, state: 'working', updatedAt: new Date().toISOString() }; // Not completed
      mockGetTaskStatus.mockResolvedValue(mockTaskStatus);

      const incomingMessage = createNotificationMessage("TASK_COMPLETED_NOTIFICATION");
      await uiAgent.processMessage(incomingMessage);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("but its state is working"));
      consoleWarnSpy.mockRestore();
    });
  });

  describe("processMessage - TASK_FAILED_NOTIFICATION", () => {
    it("should emit a 'failed' SSE event if task state is failed", async () => {
      const mockStream = new Subject<SSEEvent>();
      mockCreateTaskStream.mockReturnValue(mockStream);
      const nextSpy = jest.spyOn(mockStream, 'next');
      const completeSpy = jest.spyOn(mockStream, 'complete');
      
      const mockErrorMessage = "It broke";
      const mockTaskStatus: TaskStatus = { id: mockTaskId, state: 'failed', updatedAt: new Date().toISOString(), message: createTextMessage(mockErrorMessage) };
      mockGetTaskStatus.mockResolvedValue(mockTaskStatus);

      const incomingMessage = createNotificationMessage("TASK_FAILED_NOTIFICATION", mockErrorMessage);
      await uiAgent.processMessage(incomingMessage);

      expect(taskManager.getTaskStatus).toHaveBeenCalledWith(mockTaskId);
      expect(mockCreateTaskStream).toHaveBeenCalledWith(mockTaskId);
      expect(nextSpy).toHaveBeenCalledWith(createStatusUpdateEvent(mockTaskStatus));
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  it("should log unhandled message types and return null", async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const unhandledMessage: AgentMessage = {
      id: "unhandled-id",
      type: "UNKNOWN_MESSAGE_TYPE",
      payload: { taskId: mockTaskId },
      sender: "SomeAgent",
      recipient: "UIAgent"
    };
    const response = await uiAgent.processMessage(unhandledMessage);
    expect(response).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("UIAgent received unhandled message type: UNKNOWN_MESSAGE_TYPE"));
    consoleWarnSpy.mockRestore();
  });

  describe("getAgentCard", () => {
    it("should return an agent card with UI notification skills", () => {
      const card = uiAgent.getAgentCard();
      expect(card).toBeDefined();
      expect(card.name).toBe("UIAgent");
      expect(card.skills).toBeDefined();
      expect(card.skills).toHaveLength(1);
      
      const firstSkill = card.skills?.[0];
      expect(firstSkill).toBeDefined(); // Explicitly check if the first skill exists
      if (firstSkill) { // Type guard
        expect(firstSkill.id).toBe("notify-ui-task-status");
      }
      
      expect(card.capabilities.streaming).toBe(true);
    });
  });
}); 