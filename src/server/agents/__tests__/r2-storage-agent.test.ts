import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { R2StorageAgent } from '../r2-storage-agent';
import { BaseAgent, type AgentMessage } from '../base-agent';
import { taskManager } from '~/server/services/a2a/taskManager.service';
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from '~/types/a2a';
import { createTextMessage, createFileArtifact } from '~/types/a2a';
import * as R2Service from '~/server/services/r2.service'; // Import actual module
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { r2 as mockR2Client } from '~/server/lib/r2'; // Corrected path to the mock R2 client

// Mock the actual r2 object from '~/server/lib/r2'
// This mock will be used by the R2StorageAgent when it imports '~/server/lib/r2'
jest.mock('~/server/lib/r2', () => ({
  __esModule: true, // This is important for modules with default exports or mixed exports
  r2: {
    send: jest.fn(), // Mock the 'send' method of the r2 object
  },
}));

// Mock R2Service functions
jest.mock("~/server/services/r2.service", () => ({
  verifyR2Component: jest.fn<(url: string) => Promise<boolean>>(),
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
const mockLogAgentMessage = jest.fn<typeof BaseAgent.prototype.logAgentMessage>();
const mockUpdateTaskStateBase = jest.fn<typeof BaseAgent.prototype.updateTaskState>();
const mockCreateA2AMessageBase = jest.fn<typeof BaseAgent.prototype.createA2AMessage>().mockImplementation(
  (type: string, taskId: string, recipient: string, message?: Message, artifacts?: Artifact[], correlationId?: string) => ({
    id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "R2StorageAgent", recipient, correlationId
  })
);
const mockCreateSimpleTextMessageBase: jest.MockedFunction<typeof BaseAgent.prototype.createSimpleTextMessage> = jest.fn((text: string): Message => createTextMessage(text));

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

// Represents the object after .set(values)
interface SetStep {
  where: jest.Mock<(condition: any) => Promise<any[]>>;
}
// Represents the object after .update(table)
interface UpdateQueryBuilder {
  set: jest.Mock<(values: any) => SetStep>;
}

const mockDbWhere = jest.fn<() => Promise<any[]>>().mockResolvedValue([{}]);
const mockDbSet = jest.fn<(values: any) => SetStep>().mockImplementation(() => ({
  where: mockDbWhere,
}));
const mockDbUpdateDirect = jest.fn<(table: any) => UpdateQueryBuilder>().mockImplementation(() => ({
  set: mockDbSet,
}));

jest.mock("~/server/db", () => ({
  db: {
    update: mockDbUpdateDirect,
    // query: { customComponentJobs: { findFirst: jest.fn() } } // Add if needed
  },
  customComponentJobs: {},
}));

describe("R2StorageAgent", () => {
  let r2StorageAgent: R2StorageAgent;
  const mockedTaskManager = taskManager as jest.Mocked<typeof taskManager>;
  const mockedR2 = mockR2Client as jest.Mocked<typeof mockR2Client>; // Use the imported mock directly
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
    r2StorageAgent = new R2StorageAgent(mockedTaskManager);

    // Spy on BaseAgent methods
    jest.spyOn(BaseAgent.prototype, 'logAgentMessage').mockImplementation(mockLogAgentMessage);
    jest.spyOn(BaseAgent.prototype, 'updateTaskState').mockImplementation(mockUpdateTaskStateBase);
    jest.spyOn(BaseAgent.prototype, 'createA2AMessage').mockImplementation(mockCreateA2AMessageBase);
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
      (R2Service.verifyR2Component as jest.MockedFunction<typeof R2Service.verifyR2Component>).mockResolvedValueOnce(true);
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
      (R2Service.verifyR2Component as jest.MockedFunction<typeof R2Service.verifyR2Component>).mockResolvedValueOnce(false);
      const incomingMessage = createStoreRequestMessage(mockArtifact);
      const response = await r2StorageAgent.processMessage(incomingMessage);

      expect(R2Service.verifyR2Component).toHaveBeenCalledWith(mockArtifactUrl);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'r2_failed');
      expect(response?.type).toBe("R2_STORAGE_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
    });

    it("should send COMPONENT_PROCESS_ERROR if artifact or URL is missing", async () => {
      const incomingMessageNoArtifact = createStoreRequestMessage(undefined);
      const responseNoArtifact = await r2StorageAgent.processMessage(incomingMessageNoArtifact);
      
      expect(responseNoArtifact).toBeDefined(); // Ensure response is not null
      expect(responseNoArtifact!.type).toBe("COMPONENT_PROCESS_ERROR");
      
      const payloadNoArtifact = responseNoArtifact!.payload;
      expect(payloadNoArtifact).toBeDefined();
      const messagePayloadNoArtifact = payloadNoArtifact.message;
      expect(messagePayloadNoArtifact).toBeDefined();
      // Assuming messagePayloadNoArtifact is of type Message, .parts is non-optional array
      expect(messagePayloadNoArtifact.parts.length).toBeGreaterThan(0);

      const firstPartNoArtifact = messagePayloadNoArtifact.parts[0] as { type?: string, text?: string };
      expect(firstPartNoArtifact.text).toBeDefined();
      if(typeof firstPartNoArtifact.text === 'string') {
          expect(firstPartNoArtifact.text).toContain("Missing component artifact or artifact URL");
      }

      const artifactNoUrl = { ...mockArtifact, url: undefined };
      const incomingMessageNoUrl = createStoreRequestMessage(artifactNoUrl as Artifact);
      const responseNoUrl = await r2StorageAgent.processMessage(incomingMessageNoUrl);
      
      expect(responseNoUrl).toBeDefined(); // Ensure response is not null
      expect(responseNoUrl!.type).toBe("COMPONENT_PROCESS_ERROR");
      
      const payloadNoUrl = responseNoUrl!.payload;
      expect(payloadNoUrl).toBeDefined();
      const messagePayloadNoUrl = payloadNoUrl.message;
      expect(messagePayloadNoUrl).toBeDefined();
      // Assuming messagePayloadNoUrl is of type Message, .parts is non-optional array
      expect(messagePayloadNoUrl.parts.length).toBeGreaterThan(0);

      const firstPartNoUrl = messagePayloadNoUrl.parts[0] as { type?: string, text?: string };
      expect(firstPartNoUrl.text).toBeDefined();
      if(typeof firstPartNoUrl.text === 'string') {
          expect(firstPartNoUrl.text).toContain("Missing component artifact or artifact URL");
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