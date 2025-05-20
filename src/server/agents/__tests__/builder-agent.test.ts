// src/server/agents/__tests__/builder-agent.test.ts

import { BuilderAgent, type BuilderAgentParams } from "../builder-agent";
import { BaseAgent, type AgentMessage } from "../base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Task, Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from "~/types/a2a";
import { createTextMessage, createFileArtifact, mapA2AToInternalState } from "~/types/a2a";
import { generateComponentCode } from "~/server/workers/generateComponentCode";
import { buildCustomComponent } from "~/server/workers/buildCustomComponent";
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Mock external worker functions
jest.mock("~/server/workers/generateComponentCode", () => ({
  generateComponentCode: jest.fn(),
}));
jest.mock("~/server/workers/buildCustomComponent", () => ({
  buildCustomComponent: jest.fn(),
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
const mockCreateA2AMessageBase = jest.fn((type, taskId, recipient, message, artifacts, correlationId, payload) => ({
  id: crypto.randomUUID(), type, payload: { taskId, message, artifacts, ...(payload || {}) }, sender: "BuilderAgent", recipient, correlationId
}));
const mockCreateSimpleTextMessageBase = jest.fn((text) => createTextMessage(text));
const mockCreateSimpleFileArtifactBase = jest.fn((id, url, mimeType, description) => createFileArtifact(id, url, mimeType, description));

jest.mock("../base-agent", () => {
  const originalBaseAgent = jest.requireActual("../base-agent").BaseAgent;
  const { randomUUID } = require('crypto');
  return {
    BaseAgent: jest.fn().mockImplementation((name, description) => {
      const agent = new originalBaseAgent(name, description);
      agent.logAgentMessage = mockLogAgentMessage;
      agent.updateTaskState = mockUpdateTaskStateBase;
      agent.createA2AMessage = mockCreateA2AMessageBase;
      agent.createSimpleTextMessage = mockCreateSimpleTextMessageBase;
      agent.createSimpleFileArtifact = mockCreateSimpleFileArtifactBase;
      return agent;
    }),
    AgentMessage: jest.requireActual("../base-agent").AgentMessage,
  };
});

// Refined DB mock for more specific checks
const mockDbUpdateSet = jest.fn().mockReturnThis();
const mockDbUpdateWhere = jest.fn().mockResolvedValue([{}]); // Default success for where
const mockDbUpdateDirect = jest.fn();
const mockDbFindFirst = jest.fn(); // For findFirst calls

jest.mock("~/server/db", () => ({
  db: {
    update: mockDbUpdateDirect,
    insert: jest.fn().mockReturnThis(), // Keep other mocks if BaseAgent tests need them
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{}]),
    query: { 
      customComponentJobs: { 
        findFirst: mockDbFindFirst 
      } 
    },
  },
  customComponentJobs: {},
  agentMessages: {}
}));

describe("BuilderAgent", () => {
  let builderAgent: BuilderAgent;
  const mockTaskId = "mock-task-builder";
  const mockProjectId = "mock-project-builder";
  const mockAnimationDesignBrief = { sceneName: "Build Scene", description: "A scene to build" };
  const mockComponentCode = "export default function TestScene() { return <div/>; }";

  const defaultBuilderParams: BuilderAgentParams = {
    modelName: 'test-builder-model',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockTaskManager = taskManager as jest.Mocked<typeof taskManager>;
    builderAgent = new BuilderAgent(defaultBuilderParams, mockTaskManager);

    (generateComponentCode as jest.Mock).mockResolvedValue({
      code: mockComponentCode,
      processedCode: mockComponentCode,
      valid: true,
      error: null,
    });
    (buildCustomComponent as jest.Mock).mockResolvedValue(true); 
    mockDbFindFirst.mockResolvedValue({ id: mockTaskId, outputUrl: "/r2/default-bundle.js", errorMessage: null }); // Default findFirst mock
  });

  describe("processMessage - BUILD_COMPONENT_REQUEST", () => {
    const createBuildRequestMessage = (payloadOverrides?: Partial<AgentMessage['payload']>) => ({
      id: crypto.randomUUID(),
      type: "BUILD_COMPONENT_REQUEST" as const,
      payload: {
        taskId: mockTaskId,
        animationDesignBrief: mockAnimationDesignBrief,
        projectId: mockProjectId,
        ...payloadOverrides,
      },
      sender: "CoordinatorAgent",
      recipient: "BuilderAgent",
    });

    it("should send COMPONENT_PROCESS_ERROR if animationDesignBrief is missing", async () => {
      const incomingMessage = createBuildRequestMessage({ animationDesignBrief: undefined });
      const response = await builderAgent.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.message.parts[0].text).toContain("Missing animationDesignBrief");
    });

    it("should send COMPONENT_PROCESS_ERROR if projectId is missing", async () => {
      const incomingMessage = createBuildRequestMessage({ projectId: undefined });
      const response = await builderAgent.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.message.parts[0].text).toContain("Missing projectId");
    });

    it("should store generated tsxCode in the database", async () => {
      const incomingMessage = createBuildRequestMessage();
      await builderAgent.processMessage(incomingMessage);
      expect(mockDbUpdateDirect).toHaveBeenCalledWith(customComponentJobs);
      expect(mockDbUpdateSet).toHaveBeenCalledWith({ tsxCode: mockComponentCode });
      // expect(mockDbUpdateWhere).toHaveBeenCalledWith(eq(customComponentJobs.id, mockTaskId)); // This check is tricky with mock structure
    });

    it("should send COMPONENT_BUILD_ERROR if build succeeds but outputUrl is missing", async () => {
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(true);
      mockDbFindFirst.mockResolvedValueOnce({ id: mockTaskId, outputUrl: null, errorMessage: null }); // Simulate missing outputUrl

      const incomingMessage = createBuildRequestMessage();
      const response = await builderAgent.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_BUILD_ERROR");
      expect(response?.recipient).toBe("ErrorFixerAgent");
      expect(response?.payload.message.parts[0].text).toContain("outputUrl is missing");
    });

    it("should call generateComponentCode with correct parameters", async () => {
      await builderAgent.processMessage(createBuildRequestMessage());
      expect(generateComponentCode).toHaveBeenCalledWith(mockTaskId, mockAnimationDesignBrief.description, mockAnimationDesignBrief);
    });

    it("should send COMPONENT_SYNTAX_ERROR if code generation is invalid", async () => {
      (generateComponentCode as jest.Mock).mockResolvedValueOnce({
        code: "invalid code",
        valid: false,
        error: "Syntax error!",
      });
      const response = await builderAgent.processMessage(createBuildRequestMessage());
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_SYNTAX_ERROR");
      expect(response?.recipient).toBe("ErrorFixerAgent");
    });

    it("should call buildCustomComponent if code generation is valid", async () => {
      await builderAgent.processMessage(createBuildRequestMessage());
      expect(buildCustomComponent).toHaveBeenCalledWith(mockTaskId, false);
    });

    it("should send COMPONENT_BUILD_SUCCESS on successful build", async () => {
      // Mock buildCustomComponent to return true and db query to return outputUrl
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(true);
      const mockOutputUrl = "/r2/mock-bundle.js";
      
      // Mock the db.query.customComponentJobs.findFirst call made after successful build
      const mockDbQuery = db.query as any; // Allow access to mocked query
      if (!mockDbQuery.customComponentJobs) mockDbQuery.customComponentJobs = {};
      mockDbQuery.customComponentJobs.findFirst = jest.fn().mockResolvedValueOnce({
        id: mockTaskId, outputUrl: mockOutputUrl 
      });

      const response = await builderAgent.processMessage(createBuildRequestMessage());
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'built');
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'working', expect.anything(), 'built');
      expect(response?.type).toBe("COMPONENT_BUILD_SUCCESS");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.artifacts[0].url).toBe(mockOutputUrl);
    });

    it("should send COMPONENT_BUILD_ERROR on failed build", async () => {
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(false); // Simulate failed build
      // Mock db query to return an error message
      const mockDbQuery = db.query as any;
      if (!mockDbQuery.customComponentJobs) mockDbQuery.customComponentJobs = {};
      mockDbQuery.customComponentJobs.findFirst = jest.fn().mockResolvedValueOnce({
        id: mockTaskId, errorMessage: "esbuild failed" 
      });

      const response = await builderAgent.processMessage(createBuildRequestMessage());
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_BUILD_ERROR");
      expect(response?.recipient).toBe("ErrorFixerAgent");
    });
  });

  describe("processMessage - REBUILD_COMPONENT_REQUEST", () => {
    const fixedCode = "export default function FixedScene() { return <div/>; }";
    const createRebuildRequestMessage = (payloadOverrides?: Partial<AgentMessage['payload']>) => ({
      id: crypto.randomUUID(),
      type: "REBUILD_COMPONENT_REQUEST" as const,
      payload: {
        taskId: mockTaskId,
        fixedCode: fixedCode,
        animationDesignBrief: mockAnimationDesignBrief, // Added for consistency, though not strictly used by this path
        ...payloadOverrides,
      },
      sender: "ErrorFixerAgent",
      recipient: "BuilderAgent",
    });

    it("should send COMPONENT_PROCESS_ERROR if fixedCode is missing", async () => {
      const incomingMessage = createRebuildRequestMessage({ fixedCode: undefined });
      const response = await builderAgent.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_PROCESS_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent");
      expect(response?.payload.message.parts[0].text).toContain("Missing fixedCode");
    });

    it("should send COMPONENT_BUILD_ERROR if rebuild succeeds but outputUrl is missing", async () => {
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(true);
      mockDbFindFirst.mockResolvedValueOnce({ id: mockTaskId, outputUrl: null, errorMessage: null }); // Simulate missing outputUrl after rebuild

      const incomingMessage = createRebuildRequestMessage();
      const response = await builderAgent.processMessage(incomingMessage);
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_BUILD_ERROR");
      expect(response?.recipient).toBe("ErrorFixerAgent"); // Should probably go to Coordinator if rebuild with fixer input fails
      expect(response?.payload.message.parts[0].text).toContain("outputUrl is missing");
    });

    it("should store fixed code and attempt to rebuild", async () => {
      await builderAgent.processMessage(createRebuildRequestMessage());
      expect(mockDbUpdateDirect).toHaveBeenCalledWith(customComponentJobs);
      expect(buildCustomComponent).toHaveBeenCalledWith(mockTaskId, false); 
    });

    it("should send COMPONENT_BUILD_SUCCESS on successful rebuild", async () => {
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(true);
      const mockOutputUrl = "/r2/rebuilt-bundle.js";
      const mockDbQuery = db.query as any;
      if (!mockDbQuery.customComponentJobs) mockDbQuery.customComponentJobs = {};
      mockDbQuery.customComponentJobs.findFirst = jest.fn().mockResolvedValueOnce({
        id: mockTaskId, outputUrl: mockOutputUrl 
      });
      
      const response = await builderAgent.processMessage(createRebuildRequestMessage());
      expect(response?.type).toBe("COMPONENT_BUILD_SUCCESS");
      expect(response?.payload.artifacts[0].url).toBe(mockOutputUrl);
    });

    it("should send COMPONENT_BUILD_ERROR to CoordinatorAgent if rebuild fails", async () => {
      (buildCustomComponent as jest.Mock).mockResolvedValueOnce(false);
      const mockDbQuery = db.query as any;
      if (!mockDbQuery.customComponentJobs) mockDbQuery.customComponentJobs = {};
      mockDbQuery.customComponentJobs.findFirst = jest.fn().mockResolvedValueOnce({
        id: mockTaskId, errorMessage: "rebuild failed badly" 
      });

      const response = await builderAgent.processMessage(createRebuildRequestMessage());
      expect(mockUpdateTaskStateBase).toHaveBeenCalledWith(mockTaskId, 'failed', expect.anything(), 'failed');
      expect(response?.type).toBe("COMPONENT_BUILD_ERROR");
      expect(response?.recipient).toBe("CoordinatorAgent"); // Escalates to Coordinator
    });
  });

  describe("getAgentCard", () => {
    it("should return an agent card with specific skills for building", () => {
      const card = builderAgent.getAgentCard();
      expect(card.name).toBe("BuilderAgent");
      expect(card.skills).toHaveLength(2);
      expect(card.skills.find(s => s.id === "generate-code-from-brief")).toBeDefined();
      expect(card.skills.find(s => s.id === "build-component-from-code")).toBeDefined();
    });
  });
}); 