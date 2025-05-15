import { MessageBus, messageBus } from "../message-bus";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { db } from "~/server/db";
import { agentMessages } from "~/server/db/schema";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { SSEEvent } from "~/types/a2a";
import crypto from "crypto";
import { Subject } from "rxjs";

// Mock BaseAgent for MessageBus tests
class MockBusAgent extends BaseAgent {
  public receivedMessage: AgentMessage | null = null;
  public processMessageMock = jest.fn<Promise<AgentMessage | null>, [AgentMessage]>();

  constructor(name: string) {
    super(name);
    this.processMessageMock.mockResolvedValue(null); // Default to no response
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.receivedMessage = message;
    return this.processMessageMock(message);
  }
}

// Mock db calls
const mockDbInsertReturning = jest.fn();
const mockDbValues = jest.fn().mockReturnValue({ returning: mockDbInsertReturning });
const mockDbInsert = jest.fn().mockReturnValue({ values: mockDbValues });

const mockDbWhere = jest.fn();
const mockDbSet = jest.fn().mockReturnValue({ where: mockDbWhere });
const mockDbUpdate = jest.fn().mockReturnValue({ set: mockDbSet });

jest.mock("~/server/db", () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
    query: { 
      // customComponentJobs: { findFirst: jest.fn() }, // Add if needed
    },
  },
  agentMessages: {}, 
}));

const mockCreateTaskStream = jest.fn(() => new Subject<SSEEvent>());
jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    createTaskStream: mockCreateTaskStream,
  },
}));

describe("MessageBus Service", () => {
  let busInstance: MessageBus;
  let agentA: MockBusAgent;
  let agentB: MockBusAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    busInstance = messageBus; // Use the actual singleton instance
    // Manually clear the internal state of the singleton for test isolation
    (busInstance as any).agents.clear();
    (busInstance as any).agentSubscribers.clear();
    
    agentA = new MockBusAgent("AgentA");
    agentB = new MockBusAgent("AgentB");

    busInstance.registerAgent(agentA);
    busInstance.registerAgent(agentB);
  });

  it("should register agents", () => {
    expect(busInstance.getAgent("AgentA")).toBe(agentA);
    expect(busInstance.getAgent("AgentB")).toBe(agentB);
  });

  describe("publish", () => {
    const testMessage: AgentMessage = {
      id: crypto.randomUUID(),
      type: "TEST_MESSAGE",
      payload: { data: "test_payload" },
      sender: "AgentA",
      recipient: "AgentB",
      correlationId: undefined,
    };

    it("should log the message to the database with status 'pending'", async () => {
      await busInstance.publish(testMessage);
      expect(mockDbInsert).toHaveBeenCalledWith(agentMessages);
      expect(mockDbValues).toHaveBeenCalledWith(expect.objectContaining({
        id: testMessage.id,
        sender: "AgentA",
        recipient: "AgentB",
        type: "TEST_MESSAGE",
        status: "pending",
      }));
    });

    it("should route the message to the correct recipient agent", async () => {
      await busInstance.publish(testMessage);
      expect(agentB.processMessageMock).toHaveBeenCalledWith(testMessage);
      expect(agentA.processMessageMock).not.toHaveBeenCalled();
    });

    it("should mark the message as 'processed' after successful processing", async () => {
      agentB.processMessageMock.mockResolvedValueOnce(null);
      await busInstance.publish(testMessage);
      expect(mockDbUpdate).toHaveBeenCalledWith(agentMessages);
      expect(mockDbSet).toHaveBeenCalledWith({ status: "processed", processedAt: expect.any(Date) });
      expect(mockDbWhere).toHaveBeenCalledWith(expect.objectContaining({ id: testMessage.id })); 
    });

    it("should publish a response message if the recipient agent returns one", async () => {
      const responsePayload = { result: "agentB_processed" };
      const responseFromB: AgentMessage = {
        id: "response-id-from-b", 
        type: "TEST_RESPONSE",
        payload: responsePayload,
        sender: "AgentB",
        recipient: "AgentA", 
      };
      agentB.processMessageMock.mockResolvedValueOnce(responseFromB);
      
      const publishSpy = jest.spyOn(busInstance, 'publish');
      
      await busInstance.publish(testMessage);

      expect(publishSpy).toHaveBeenCalledTimes(2); 
      expect(publishSpy).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({
          type: "TEST_RESPONSE",
          payload: responsePayload,
          sender: "AgentB",
          recipient: "AgentA",
          correlationId: testMessage.id, 
          id: expect.not.stringMatching(testMessage.id) 
        })
      );
      publishSpy.mockRestore();
    });

    it("should mark message as 'failed' if recipient agent is not found", async () => {
      const messageToNonExistentAgent = { ...testMessage, recipient: "NonExistentAgent" };
      await busInstance.publish(messageToNonExistentAgent);
      expect(mockDbUpdate).toHaveBeenCalledWith(agentMessages);
      expect(mockDbSet).toHaveBeenCalledWith(expect.objectContaining({ 
        status: "failed", 
        payload: expect.objectContaining({ error: "Recipient not found: NonExistentAgent" })
      }));
    });

    it("should mark message as 'failed' if agent processing throws an error", async () => {
      const processingError = new Error("Agent B failed");
      agentB.processMessageMock.mockRejectedValueOnce(processingError);
      await busInstance.publish(testMessage);
      expect(mockDbUpdate).toHaveBeenCalledWith(agentMessages);
      expect(mockDbSet).toHaveBeenCalledWith(expect.objectContaining({ 
        status: "failed", 
        payload: expect.objectContaining({ error: processingError.toString() })
      }));
    });

    it("should notify direct agent subscribers", async () => {
      const subscriberMock = jest.fn().mockResolvedValue(undefined);
      busInstance.subscribeToAgentMessages("AgentB", subscriberMock);
      await busInstance.publish(testMessage);
      expect(subscriberMock).toHaveBeenCalledWith(testMessage);
    });
  });

  describe("SSE Stream Management", () => {
    it("getTaskStream should call taskManager.createTaskStream", () => {
      const taskId = "sse-task-1";
      busInstance.getTaskStream(taskId);
      expect(mockCreateTaskStream).toHaveBeenCalledWith(taskId);
    });

    it("emitToTaskStream should get stream from taskManager and emit event", () => {
      const taskId = "sse-task-2";
      const mockStreamSubject = new Subject<SSEEvent>();
      const nextSpy = jest.spyOn(mockStreamSubject, 'next');
      mockCreateTaskStream.mockReturnValueOnce(mockStreamSubject);
      
      const testEvent: SSEEvent = { id: "event1", event: "status", data: JSON.stringify({ state: "working" }) };
      busInstance.emitToTaskStream(taskId, testEvent);
      
      expect(mockCreateTaskStream).toHaveBeenCalledWith(taskId);
      expect(nextSpy).toHaveBeenCalledWith(testEvent);
    });
  });

  describe("cleanup", () => {
    it("should clear agentSubscribers", () => {
      const subscriberMock = jest.fn().mockResolvedValue(undefined);
      busInstance.subscribeToAgentMessages("AgentA", subscriberMock);
      busInstance.cleanup();
      const consoleSpy = jest.spyOn(console, 'log');
      busInstance.cleanup(); 
      expect(consoleSpy).toHaveBeenCalledWith("MessageBus: Cleaned up direct agent message subscribers.");
      consoleSpy.mockRestore();
    });
  });
}); 