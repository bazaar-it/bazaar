import { R2StorageAgent } from "../r2-storage-agent";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from "~/types/a2a";
import { createTextMessage, createFileArtifact } from "~/types/a2a";
import * as R2Service from "~/server/services/r2.service"; // Import actual module
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Mock R2Service functions
jest.mock("~/server/services/r2.service", () => ({
  verifyR2Component: jest.fn(),
  uploadToR2: jest.fn(), // Assuming this might be used if direct upload was part of R2StorageAgent
}));

// Mock TaskManager
jest.mock("~/server/services/a2a/taskManager.service", () => ({
  taskManager: {
    updateTaskState: jest.fn(),
    addTaskArtifact: jest.fn(),
  },
}));

// Mock BaseAgent methods
const mockLogAgentMessage = jest.fn();
const mockUpdateTaskStateBase = jest.fn();
const mockCreateA2AMessageBase = jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => ({
  id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "R2StorageAgent", recipient, correlationId
}));
const mockCreateSimpleTextMessageBase = jest.fn((text) => createTextMessage(text));

jest.mock("../base-agent", () => {
  const originalBaseAgent = jest.requireActual("../base-agent").BaseAgent;
  return {
    BaseAgent: jest.fn().mockImplementation((name, description) => {
      const agent = new originalBaseAgent(name, description);
      agent.logAgentMessage = mockLogAgentMessage;
      agent.updateTaskState = mockUpdateTaskStateBase;
      agent.createA2AMessage = mockCreateA2AMessageBase;
      agent.createSimpleTextMessage = mockCreateSimpleTextMessageBase;
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});

// Mock db calls for any direct DB interactions by R2StorageAgent (if any beyond TaskManager)
const mockDbUpdateSet = jest.fn().mockReturnThis();
const mockDbUpdateWhere = jest.fn().mockResolvedValue([{}]);
const mockDbUpdateDirect = jest.fn(() => ({ set: mockDbUpdateSet, where: mockDbUpdateWhere }));

jest.mock("~/server/db", () => ({
  db: {
    update: mockDbUpdateDirect,
    // query: { customComponentJobs: { findFirst: jest.fn() } } // Add if needed
  },
  customComponentJobs: {},
}));


describe("R2StorageAgent", () => {
  let r2StorageAgent: R2StorageAgent;
  const mockTaskId = "mock-task-r2";
  const mockArtifactUrl = "https://r2.example.com/component.js";
  const mockArtifact: Artifact = {
    id: "artifact-r2-1",
    type: "file",
    mimeType: "application/javascript",
    url: mockArtifactUrl,
    createdAt: new Date().toISOString(),
    name: "component.js"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    r2StorageAgent = new R2StorageAgent();
  });

  const createStoreRequestMessage = (artifact?: Artifact): AgentMessage => ({
    id: crypto.randomUUID(),
    type: "STORE_COMPONENT_REQUEST",
    payload: {
      taskId: mockTaskId,
      componentJobId: mockTaskId, // for consistency if older code uses this
      artifacts: artifact ? [artifact] : [],
    },
    sender: "CoordinatorAgent",
    recipient: "R2StorageAgent",
  });

  describe("processMessage - STORE_COMPONENT_REQUEST", () => {
    it("should verify component in R2 and send COMPONENT_STORED_SUCCESS if valid", async () => {
      (R2Service.verifyR2Component as jest.Mock).mockResolvedValueOnce(true);
      const incomingMessage = createStoreRequestMessage(mockArtifact);
      const response = await r2StorageAgent.processMessage(incomingMessage);

      expect(R2Service.verifyR2Component).toHaveBeenCalledWith(mockArtifactUrl);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'completed', expect.anything(), 'complete');
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'building'); // from earlier in the process
      expect(taskManager.addTaskArtifact).toHaveBeenCalledWith(mockTaskId, mockArtifact);
      expect(response?.type).toBe("COMPONENT_STORED_SUCCESS");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.artifacts[0]).toEqual(mockArtifact);
    });

    it("should send R2_STORAGE_ERROR if R2 verification fails", async () => {
      (R2Service.verifyR2Component as jest.Mock).mockResolvedValueOnce(false);
      const incomingMessage = createStoreRequestMessage(mockArtifact);
      const response = await r2StorageAgent.processMessage(incomingMessage);

      expect(R2Service.verifyR2Component).toHaveBeenCalledWith(mockArtifactUrl);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'r2_failed');
      expect(response?.type).toBe("R2_STORAGE_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
    });

    it("should send COMPONENT_PROCESS_ERROR if artifact or URL is missing", async () => {
      const incomingMessageNoArtifact = createStoreRequestMessage(undefined);
      let response = await r2StorageAgent.processMessage(incomingMessageNoArtifact);
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      
      let messagePayload = response?.payload.message;
      expect(messagePayload).toBeDefined();
      expect(messagePayload?.parts).toBeDefined();
      expect(messagePayload?.parts.length).toBeGreaterThan(0);
      if (messagePayload && messagePayload.parts && messagePayload.parts.length > 0) {
        const firstPart = messagePayload.parts[0] as { type?: string, text?: string };
        expect(firstPart.text).toBeDefined();
        if(typeof firstPart.text === 'string') {
            expect(firstPart.text).toContain("Missing component artifact or artifact URL"); // Adjusted to check for the more general part of the message
        }
      }

      const artifactNoUrl = { ...mockArtifact, url: undefined };
      const incomingMessageNoUrl = createStoreRequestMessage(artifactNoUrl as Artifact);
      response = await r2StorageAgent.processMessage(incomingMessageNoUrl);
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      
      messagePayload = response?.payload.message;
      expect(messagePayload).toBeDefined();
      expect(messagePayload?.parts).toBeDefined();
      expect(messagePayload?.parts.length).toBeGreaterThan(0);
      if (messagePayload && messagePayload.parts && messagePayload.parts.length > 0) {
        const firstPart = messagePayload.parts[0] as { type?: string, text?: string };
        expect(firstPart.text).toBeDefined();
        if(typeof firstPart.text === 'string') {
            expect(firstPart.text).toContain("Missing component artifact or artifact URL");
        }
      }
    });
  });

  describe("getAgentCard", () => {
    it("should return an agent card with specific skills for R2 storage", () => {
      const card = r2StorageAgent.getAgentCard();
      expect(card.name).toBe("R2StorageAgent");
      expect(card.skills).toHaveLength(1);
      expect(card.skills[0].id).toBe("store-and-verify-component");
    });
  });
}); 