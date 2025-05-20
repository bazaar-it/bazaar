import { MessageBus, messageBus } from "../../agents/message-bus";
import { setupAgentSystem } from "../../agents/setup";
import { TaskManager, taskManager } from "../../services/a2a/taskManager.service";
import { AgentRegistry, agentRegistry } from "../../services/a2a/agentRegistry.service";
import { db } from "~/server/db";
import { customComponentJobs, agentMessages, projects, users } from "~/server/db/schema";
import type { 
    JsonRpcRequest, 
    JsonRpcSuccessResponse, 
    JsonRpcErrorResponse, 
    Task, 
    TaskStatus,
    Message,
    TextPart,
    Artifact,
    SSEEvent,
    AnimationBriefGenerationParams
} from "~/types/a2a";
import { createTextMessage, createFileArtifact } from "~/types/a2a";
import { POST as a2aApiHandler } from "~/app/api/a2a/route";
import { GET as sseStreamHandler } from "~/app/api/a2a/tasks/[taskId]/stream/route";
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { CoordinatorAgent } from "../../agents/coordinator-agent";
import { BuilderAgent } from "../../agents/builder-agent";
import { ErrorFixerAgent } from "../../agents/error-fixer-agent";
import { R2StorageAgent } from "../../agents/r2-storage-agent";
import { UIAgent } from "../../agents/ui-agent";
import { ADBAgent } from "../../agents/adb-agent";
import type { AgentMessage as ConcreteAgentMessage } from "../../agents/base-agent";
import { repairComponentSyntax } from "~/server/workers/repairComponentSyntax";

// Mock external worker functions and services
import { generateComponentCode } from "~/server/workers/generateComponentCode";
import { buildCustomComponent } from "~/server/workers/buildCustomComponent";
import { generateAnimationDesignBrief } from "~/server/services/animationDesigner.service";
// import * as R2Service from "~/server/services/r2.service"; // Commented out, will use direct mock

const mockVerifyR2Component = jest.fn();
const mockUploadToR2 = jest.fn();

jest.mock("~/server/workers/generateComponentCode", () => ({
  generateComponentCode: jest.fn(),
}));
jest.mock("~/server/workers/buildCustomComponent", () => ({
  buildCustomComponent: jest.fn(),
}));
jest.mock("~/server/services/animationDesigner.service", () => ({
  generateAnimationDesignBrief: jest.fn(),
}));
// Mock for r2.service is now just the functions above
// jest.mock("~/server/services/r2.service", () => ({
//   verifyR2Component: mockVerifyR2Component,
//   uploadToR2: mockUploadToR2, 
// }));

// --- Mocking Setup ---
jest.mock("~/server/db", () => {
    const originalDb = jest.requireActual("~/server/db").db;
    return {
        db: {
            ...originalDb,
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockImplementation((fields) => Promise.resolve([{ id: crypto.randomUUID(), ...fields }])),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ id: crypto.randomUUID() }]),
            query: {
                customComponentJobs: {
                    findFirst: jest.fn(),
                },
                agentMessages: {
                    findFirst: jest.fn(),
                },
                projects: { findFirst: jest.fn() },
                users: { findFirst: jest.fn() }
            },
        },
        customComponentJobs: jest.requireActual("~/server/db/schema").customComponentJobs,
        agentMessages: jest.requireActual("~/server/db/schema").agentMessages,
    };
});

function createMockNextRequest(method: string, body?: any, routeParams?: Record<string, string>): NextRequest {
    let urlPath = '/api/a2a';
    if (routeParams && routeParams.taskId) {
      urlPath = `/api/a2a/tasks/${routeParams.taskId}/stream`;
    } else if (routeParams && routeParams.agentName) {
      urlPath = `/api/a2a/agents/${routeParams.agentName}`;
    }
    const url = `http://localhost${urlPath}`;
    
    const request = new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
    });
    return request;
}

// Helper to consume an SSE stream and collect events
async function collectSseEvents(stream: ReadableStream<Uint8Array>): Promise<any[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: any[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonData = line.substring(6);
            const parsedEventData = JSON.parse(jsonData);
            events.push({ type: parsedEventData.type, data: parsedEventData.data });
          } catch (e) {
            console.error("Failed to parse SSE event data:", line.substring(6), e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return events;
}

// Mock actual agent implementations to control their behavior and spy on methods
const mockCoordinatorProcessMessage = jest.fn();
const mockBuilderProcessMessage = jest.fn();
const mockErrorFixerProcessMessage = jest.fn();
const mockADBAgentProcessMessage = jest.fn();       // Added mock for ADBAgent
const mockR2StorageAgentProcessMessage = jest.fn(); // Added mock for R2StorageAgent
const mockUIAgentProcessMessage = jest.fn();        // Added mock for UIAgent

jest.mock("../../agents/coordinator-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    CoordinatorAgent: jest.fn().mockImplementation(() => ({
      name: "CoordinatorAgent",
      processMessage: mockCoordinatorProcessMessage,
      logAgentMessage: jest.fn(), 
      updateTaskState: jest.fn(),
      addTaskArtifact: jest.fn(),
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "CoordinatorAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)),
      getAgentCard: jest.fn().mockReturnValue({ name: "CoordinatorAgent", skills: [] }),
    }))
  };
});

jest.mock("../../agents/builder-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    BuilderAgent: jest.fn().mockImplementation(() => ({
      name: "BuilderAgent",
      processMessage: mockBuilderProcessMessage,
      logAgentMessage: jest.fn(), updateTaskState: jest.fn(), addTaskArtifact: jest.fn(), 
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "BuilderAgent", recipient, correlationId })),
      createMessage: jest.fn().mockImplementation((type, payload, recipient, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload, sender: "BuilderAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)),
      createSimpleFileArtifact: jest.fn().mockImplementation((id,url,mimeType,desc) => createFileArtifact(id,url,mimeType,desc)),
      getAgentCard: jest.fn().mockReturnValue({ name: "BuilderAgent", skills: [] }),
    }))
  };
});

jest.mock("../../agents/error-fixer-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    ErrorFixerAgent: jest.fn().mockImplementation(() => ({
      name: "ErrorFixerAgent",
      processMessage: mockErrorFixerProcessMessage,
      logAgentMessage: jest.fn(), updateTaskState: jest.fn(), addTaskArtifact: jest.fn(),
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "ErrorFixerAgent", recipient, correlationId })),
      createMessage: jest.fn().mockImplementation((type, payload, recipient, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload, sender: "ErrorFixerAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)),
      getAgentCard: jest.fn().mockReturnValue({ name: "ErrorFixerAgent", skills: [] }),
    }))
  };
});

jest.mock("../../agents/adb-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    ADBAgent: jest.fn().mockImplementation(() => ({
      name: "ADBAgent", processMessage: mockADBAgentProcessMessage, logAgentMessage: jest.fn(), updateTaskState: jest.fn(), addTaskArtifact: jest.fn(), 
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "ADBAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)), 
      getAgentCard: jest.fn().mockReturnValue({ name: "ADBAgent", skills:[] })
    }))
  };
});

jest.mock("../../agents/r2-storage-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    R2StorageAgent: jest.fn().mockImplementation(() => ({
      name: "R2StorageAgent", processMessage: mockR2StorageAgentProcessMessage, logAgentMessage: jest.fn(), updateTaskState: jest.fn(), addTaskArtifact: jest.fn(), 
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "R2StorageAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)), 
      getAgentCard: jest.fn().mockReturnValue({ name: "R2StorageAgent", skills:[] })
    }))
  };
});

jest.mock("../../agents/ui-agent", () => {
  const { randomUUID } = require('crypto');
  return {
    UIAgent: jest.fn().mockImplementation(() => ({
      name: "UIAgent", processMessage: mockUIAgentProcessMessage, logAgentMessage: jest.fn(), updateTaskState: jest.fn(), addTaskArtifact: jest.fn(), 
      createA2AMessage: jest.fn().mockImplementation((type, taskId, recipient, message, artifacts, correlationId) => 
        ({ id: crypto.randomUUID(), type, payload: { taskId, message, artifacts }, sender: "UIAgent", recipient, correlationId })),
      createSimpleTextMessage: jest.fn().mockImplementation((text) => createTextMessage(text)), 
      getAgentCard: jest.fn().mockReturnValue({ name: "UIAgent", skills:[] })
    }))
  };
});

describe("A2A System Integration Tests", () => {
    let bus: MessageBus;
    let coordinator: CoordinatorAgent;
    let builder: BuilderAgent;
    let errorFixer: ErrorFixerAgent;
    let adbAgent: ADBAgent;
    let r2StorageAgent: R2StorageAgent;
    let uiAgent: UIAgent;

    beforeAll(() => {
        bus = setupAgentSystem(); 
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (taskManager as any).taskSubscriptions?.clear();
        (taskManager as any).taskStreams?.clear();
        (agentRegistry as any).agents?.clear();
        (messageBus as any).agents.clear();
        (messageBus as any).agentSubscribers.clear();
        setupAgentSystem(); 
        coordinator = agentRegistry.getAgent("CoordinatorAgent") as CoordinatorAgent;
        builder = agentRegistry.getAgent("BuilderAgent") as BuilderAgent;
        errorFixer = agentRegistry.getAgent("ErrorFixerAgent") as ErrorFixerAgent;
        adbAgent = agentRegistry.getAgent("ADBAgent") as ADBAgent;
        r2StorageAgent = agentRegistry.getAgent("R2StorageAgent") as R2StorageAgent;
        uiAgent = agentRegistry.getAgent("UIAgent") as UIAgent;
    });

    describe("JSON-RPC API Endpoint (/api/a2a)", () => {
        const mockProjectId = crypto.randomUUID();

        it("should handle tasks/create successfully", async () => {
            const taskId = crypto.randomUUID();
            const rpcRequestId = "rpc-create-1";
            const params = { projectId: mockProjectId, effect: "Test Create Effect", id: taskId }; 
            
            (taskManager.createTask as jest.Mock).mockResolvedValueOnce({
                id: taskId,
                state: 'submitted',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                message: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), parts: [{ type: 'text', text: "Task submitted" } as TextPart] } as Message,
            } as Task);

            const mockRequest = createMockNextRequest('POST', {
                jsonrpc: "2.0",
                method: "tasks/create",
                params,
                id: rpcRequestId,
            });

            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcSuccessResponse;

            expect(response.status).toBe(200);
            expect(jsonResponse.jsonrpc).toBe("2.0");
            expect(jsonResponse.id).toBe(rpcRequestId);
            expect(jsonResponse.result.id).toBe(taskId);
            expect(jsonResponse.result.state).toBe('submitted');
            expect(taskManager.createTask).toHaveBeenCalledWith(mockProjectId, params);
        });

        it("should handle tasks/get successfully", async () => {
            const taskId = crypto.randomUUID();
            const rpcRequestId = "rpc-get-1";
            const mockStatus: TaskStatus = {
                id: taskId,
                state: 'working',
                updatedAt: new Date().toISOString(),
                message: { id: crypto.randomUUID(), createdAt: new Date().toISOString(), parts: [{ type: 'text', text: "Task is working" } as TextPart] } as Message,
            };
            (taskManager.getTaskStatus as jest.Mock).mockResolvedValueOnce(mockStatus);

            const mockRequest = createMockNextRequest('POST', {
                jsonrpc: "2.0",
                method: "tasks/get",
                params: { id: taskId },
                id: rpcRequestId,
            });

            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcSuccessResponse;

            expect(response.status).toBe(200);
            expect(jsonResponse.result).toEqual(mockStatus);
            expect(taskManager.getTaskStatus).toHaveBeenCalledWith(taskId);
        });

        it("should handle tasks/cancel successfully", async () => {
            const taskId = crypto.randomUUID();
            const rpcRequestId = "rpc-cancel-1";
            (taskManager.cancelTask as jest.Mock).mockResolvedValueOnce(undefined);

            const mockRequest = createMockNextRequest('POST', {
                jsonrpc: "2.0",
                method: "tasks/cancel",
                params: { id: taskId },
                id: rpcRequestId,
            });

            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcSuccessResponse;

            expect(response.status).toBe(200);
            expect(jsonResponse.result).toEqual({ success: true });
            expect(taskManager.cancelTask).toHaveBeenCalledWith(taskId);
        });

        it("should return error for invalid JSON-RPC request", async () => {
            const mockRequest = createMockNextRequest('POST', { method: "tasks/create" }); 
            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcErrorResponse;
            expect(response.status).toBe(400);
            expect(jsonResponse.error.code).toBe(-32600);
        });

        it("should return error for method not found", async () => {
            const mockRequest = createMockNextRequest('POST', { jsonrpc: "2.0", method: "unknown/method", id: "1" });
            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcErrorResponse;
            expect(response.status).toBe(404);
            expect(jsonResponse.error.code).toBe(-32601);
        });

        it("should return error for invalid params in tasks/create", async () => {
            const mockRequest = createMockNextRequest('POST', {
                jsonrpc: "2.0",
                method: "tasks/create",
                params: { effect: "Missing projectId" }, 
                id: "err-params-1",
            });
            const response = await a2aApiHandler(mockRequest);
            const jsonResponse = await response.json() as JsonRpcErrorResponse;
            expect(response.status).toBe(400);
            expect(jsonResponse.error.code).toBe(-32602);
            expect(jsonResponse.error.message).toContain("projectId is required");
        });
    });

    describe("SSE Endpoint (/api/a2a/tasks/[taskId]/stream)", () => {
        let taskId: string;

        beforeEach(async () => {
            const createdTask = await taskManager.createTask(crypto.randomUUID(), { effect: "SSE Test Task" });
            taskId = createdTask.id;
            jest.clearAllMocks(); 
        });

        it("should stream initial task status and updates", async () => {
            const initialStatus: TaskStatus = {
                id: taskId,
                state: 'submitted',
                updatedAt: new Date().toISOString(),
                message: createTextMessage("Task submitted for SSE"),
            };
            (taskManager.getTaskStatus as jest.Mock).mockResolvedValueOnce(initialStatus);

            const mockSseRequest = createMockNextRequest('GET', null, { taskId });
            // @ts-ignore 
            const response = await sseStreamHandler(mockSseRequest, { params: { taskId } });
            const stream = response.body;
            expect(stream).not.toBeNull();
            if (!stream) return;

            const eventPromise = collectSseEvents(stream);

            await new Promise(resolve => setTimeout(resolve, 50)); 
            const workingMessage = createTextMessage("Task processing started");
            await taskManager.updateTaskStatus(taskId, 'working', workingMessage, []);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            const mockArtifact: Artifact = { id: "artifact-sse-1", type: "file", mimeType: "image/png", url: "/image.png", createdAt: new Date().toISOString(), name: "image.png" };
            await taskManager.addTaskArtifact(taskId, mockArtifact);

            await new Promise(resolve => setTimeout(resolve, 50));
            const completedMessage = createTextMessage("Task completed via SSE");
            await taskManager.updateTaskStatus(taskId, 'completed', completedMessage, []);

            const events = await eventPromise;

            expect(events.length).toBeGreaterThanOrEqual(4);

            const initialEventData = events.find(e => e.type === 'task_status_update' && e.data.state === 'submitted')?.data;
            expect(initialEventData).toBeDefined();
            expect((initialEventData?.message?.parts[0] as TextPart | undefined)?.text).toBe("Task submitted for SSE");

            const workingEventData = events.find(e => e.type === 'task_status_update' && e.data.state === 'working')?.data;
            expect(workingEventData).toBeDefined();
            expect((workingEventData?.message?.parts[0] as TextPart | undefined)?.text).toBe("Task processing started");

            const artifactEventData = events.find(e => e.type === 'task_artifact_update')?.data;
            expect(artifactEventData).toBeDefined();
            expect(artifactEventData?.artifact.id).toBe("artifact-sse-1");

            const completedEventData = events.find(e => e.type === 'task_status_update' && e.data.state === 'completed')?.data;
            expect(completedEventData).toBeDefined();
            expect((completedEventData?.message?.parts[0] as TextPart | undefined)?.text).toBe("Task completed via SSE");
        }, 10000);
    });

    describe("Inter-Agent Communication via MessageBus", () => {
        const mockAnimationDesignBrief = { sceneName: "Integration Test Scene", description: "Scene for integration test" };
        const initialProjectId = crypto.randomUUID();
        const initialTaskId = crypto.randomUUID();

        it("should route CREATE_COMPONENT_REQUEST to CoordinatorAgent, then to BuilderAgent", async () => {
            // Mock CoordinatorAgent to return a BUILD_COMPONENT_REQUEST
            mockCoordinatorProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                // Simulate Coordinator creating a task and forwarding to Builder
                if (msg.type === "CREATE_COMPONENT_REQUEST") {
                    return {
                        id: crypto.randomUUID(),
                        type: "BUILD_COMPONENT_REQUEST",
                        payload: { taskId: initialTaskId, animationDesignBrief: msg.payload.animationDesignBrief, projectId: msg.payload.projectId },
                        sender: "CoordinatorAgent",
                        recipient: "BuilderAgent",
                        correlationId: msg.id
                    };
                }
                return null;
            });

            // Mock BuilderAgent to just acknowledge
            mockBuilderProcessMessage.mockResolvedValueOnce(null);

            const entryMessage: ConcreteAgentMessage = {
                id: crypto.randomUUID(),
                type: "CREATE_COMPONENT_REQUEST",
                payload: { animationDesignBrief: mockAnimationDesignBrief, projectId: initialProjectId, taskId: initialTaskId },
                sender: "User/API",
                recipient: "CoordinatorAgent",
            };

            await bus.publish(entryMessage);

            expect(mockCoordinatorProcessMessage).toHaveBeenCalledWith(entryMessage);
            expect(mockBuilderProcessMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: "BUILD_COMPONENT_REQUEST",
                payload: expect.objectContaining({ taskId: initialTaskId }),
                sender: "CoordinatorAgent",
                recipient: "BuilderAgent",
                correlationId: entryMessage.id
            }));
        });

        it("BuilderAgent should send COMPONENT_SYNTAX_ERROR to ErrorFixerAgent", async () => {
            const syntaxErrorTaskId = crypto.randomUUID();
            const buildRequestPayload = { taskId: syntaxErrorTaskId, animationDesignBrief: mockAnimationDesignBrief, projectId: initialProjectId };

            // Mock BuilderAgent to produce a syntax error
            mockBuilderProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if (msg.type === "BUILD_COMPONENT_REQUEST") {
                    return {
                        id: crypto.randomUUID(),
                        type: "COMPONENT_SYNTAX_ERROR",
                        payload: { taskId: msg.payload.taskId, componentCode: "bad code", errors: ["syntax error"] },
                        sender: "BuilderAgent",
                        recipient: "ErrorFixerAgent",
                        correlationId: msg.id
                    };
                }
                return null;
            });
            
            // Mock ErrorFixerAgent to just acknowledge
            mockErrorFixerProcessMessage.mockResolvedValueOnce(null);

            const buildRequestMessage: ConcreteAgentMessage = {
                id: crypto.randomUUID(),
                type: "BUILD_COMPONENT_REQUEST",
                payload: buildRequestPayload,
                sender: "CoordinatorAgent",
                recipient: "BuilderAgent",
            };

            await bus.publish(buildRequestMessage);

            expect(mockBuilderProcessMessage).toHaveBeenCalledWith(buildRequestMessage);
            expect(mockErrorFixerProcessMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: "COMPONENT_SYNTAX_ERROR",
                payload: expect.objectContaining({ taskId: syntaxErrorTaskId, componentCode: "bad code" }),
                sender: "BuilderAgent",
                recipient: "ErrorFixerAgent",
                correlationId: buildRequestMessage.id
            }));
        });

        it("ErrorFixerAgent should send REBUILD_COMPONENT_REQUEST to BuilderAgent on successful fix", async () => {
            const errorFixTaskId = crypto.randomUUID();
            const originalBadCode = "let foo = 1; let foo = 2;";
            const fixedGoodCode = "let foo = 1;";
            const adbBrief = { description: "fix test" };

            mockErrorFixerProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if (msg.type === "COMPONENT_SYNTAX_ERROR" || msg.type === "COMPONENT_BUILD_ERROR") {
                    return {
                        id: crypto.randomUUID(), type: "REBUILD_COMPONENT_REQUEST",
                        payload: { taskId: msg.payload.taskId, fixedCode: fixedGoodCode, originalErrors: msg.payload.errors, animationDesignBrief: adbBrief },
                        sender: "ErrorFixerAgent", recipient: "BuilderAgent", correlationId: msg.id
                    };
                }
                return null;
            });
            mockBuilderProcessMessage.mockResolvedValueOnce(null);

            const errorFixRequest: ConcreteAgentMessage = {
                id: crypto.randomUUID(),
                type: "COMPONENT_SYNTAX_ERROR",
                payload: { taskId: errorFixTaskId, componentCode: originalBadCode, errors: ["duplicate const"], animationDesignBrief: adbBrief },
                sender: "BuilderAgent",
                recipient: "ErrorFixerAgent",
            };
            await bus.publish(errorFixRequest);
            expect(mockErrorFixerProcessMessage).toHaveBeenCalledWith(errorFixRequest);
            expect(mockBuilderProcessMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: "REBUILD_COMPONENT_REQUEST",
                payload: expect.objectContaining({ taskId: errorFixTaskId, fixedCode: fixedGoodCode }),
            }));
        });

        it("ErrorFixerAgent -> CoordinatorAgent (Fix Fails)", async () => {
            const taskId = crypto.randomUUID();
            const badCode = "this is very broken";
            const adbBrief = { description: "fix fail test" };

            mockErrorFixerProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                // Simulate ErrorFixerAgent determining the code cannot be fixed
                return {
                    id: crypto.randomUUID(), type: "COMPONENT_FIX_ERROR",
                    payload: { taskId: msg.payload.taskId, error: "Could not fix component", originalErrors: msg.payload.errors, attempts: (msg.payload.attempts || 0) + 1 },
                    sender: "ErrorFixerAgent", recipient: "CoordinatorAgent", correlationId: msg.id
                };
            });
            mockCoordinatorProcessMessage.mockResolvedValueOnce(null);

            const errorFixRequest: ConcreteAgentMessage = {
                id: crypto.randomUUID(),
                type: "COMPONENT_SYNTAX_ERROR",
                payload: { taskId, componentCode: badCode, errors: ["major issue"], animationDesignBrief: adbBrief, attempts: 0 },
                sender: "BuilderAgent",
                recipient: "ErrorFixerAgent"
            };
            await bus.publish(errorFixRequest);
            expect(mockErrorFixerProcessMessage).toHaveBeenCalledWith(errorFixRequest);
            expect(mockCoordinatorProcessMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: "COMPONENT_FIX_ERROR",
                payload: expect.objectContaining({ taskId, error: "Could not fix component", attempts: 1 }),
            }));
        });

        it("Full success flow: ADB -> Coordinator -> Builder -> R2Storage -> Coordinator -> UI", async () => {
            const fullFlowTaskId = crypto.randomUUID();
            const adbPayload = { description: "Full flow test", projectId: initialProjectId, sceneId: crypto.randomUUID(), taskId: fullFlowTaskId };
            const generatedBrief = { sceneName: "Full Flow Scene", description: "Full flow ADB" };
            const generatedComponentCode = "export default function FullFlowScene() { return <p>Full Flow</p>; }";
            const builtComponentUrl = "/r2/fullflow_component.js";

            (taskManager.createTask as jest.Mock).mockResolvedValueOnce(
                { id: fullFlowTaskId, state: 'submitted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Task
            );
            (generateAnimationDesignBrief as jest.Mock).mockResolvedValueOnce({ brief: generatedBrief, briefId: "adb-ff-id" });
            mockADBAgentProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "GENERATE_DESIGN_BRIEF_REQUEST"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("ADB: Generating"), []);
                    const adbArtifact = createFileArtifact("adb-id", "", "application/json", "ADB data", `adb-${fullFlowTaskId}.json`); // Pass name to createFileArtifact
                    // Simulate adding data to artifact if needed, though ADBgent passes `brief` in payload to Coordinator
                    (adbArtifact as any).data = generatedBrief; 
                    await taskManager.addTaskArtifact(fullFlowTaskId, adbArtifact);
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'completed', createTextMessage("ADB: Generated"), []);
                    return { id: crypto.randomUUID(), type: "CREATE_COMPONENT_REQUEST", 
                             payload: { taskId: fullFlowTaskId, animationDesignBrief: generatedBrief, projectId: initialProjectId, componentJobId: fullFlowTaskId }, 
                             sender: "ADBAgent", recipient: "CoordinatorAgent", correlationId: msg.id };
                }
                return null;
            });
            
            mockCoordinatorProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "CREATE_COMPONENT_REQUEST"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("Coordinator: Processing ADB"), []);
                    return { id: crypto.randomUUID(), type: "BUILD_COMPONENT_REQUEST", 
                             payload: { taskId: fullFlowTaskId, animationDesignBrief: msg.payload.animationDesignBrief, projectId: msg.payload.projectId }, 
                             sender: "CoordinatorAgent", recipient: "BuilderAgent", correlationId: msg.id };
                }
                return null;
            });

            (generateComponentCode as jest.Mock).mockResolvedValueOnce({ code: generatedComponentCode, processedCode: generatedComponentCode, valid: true });
            (buildCustomComponent as jest.Mock).mockResolvedValueOnce(true);
            const mockDbQuery = db.query as any;
            if (!mockDbQuery.customComponentJobs) mockDbQuery.customComponentJobs = {};
            mockDbQuery.customComponentJobs.findFirst = jest.fn().mockResolvedValueOnce({ id: fullFlowTaskId, outputUrl: builtComponentUrl });

            mockBuilderProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "BUILD_COMPONENT_REQUEST"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("Builder: Generating code"), []);
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("Builder: Building code"), []);
                    const artifact = createFileArtifact(fullFlowTaskId + "-bundle.js", builtComponentUrl, "application/javascript", "Built component");
                    await taskManager.addTaskArtifact(fullFlowTaskId, artifact);
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("Builder: Build success"), []);
                    return { id: crypto.randomUUID(), type: "COMPONENT_BUILD_SUCCESS", 
                             payload: { taskId: fullFlowTaskId, artifacts: [artifact] }, 
                             sender: "BuilderAgent", recipient: "CoordinatorAgent", correlationId: msg.id };
                }
                return null;
            });

            mockCoordinatorProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "COMPONENT_BUILD_SUCCESS"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("Coordinator: Build successful, storing..."), []);
                    return { id: crypto.randomUUID(), type: "STORE_COMPONENT_REQUEST", 
                             payload: { taskId: fullFlowTaskId, artifacts: msg.payload.artifacts }, 
                             sender: "CoordinatorAgent", recipient: "R2StorageAgent", correlationId: msg.id };
                }
                return null;
            });
            
            mockVerifyR2Component.mockResolvedValueOnce(true);
            mockR2StorageAgentProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "STORE_COMPONENT_REQUEST"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'working', createTextMessage("R2: Verifying component"), []);
                    const storedArtifact = msg.payload.artifacts[0];
                    await taskManager.addTaskArtifact(fullFlowTaskId, storedArtifact); 
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'completed', createTextMessage("R2: Component Stored and Verified"), []);

                    return { id: crypto.randomUUID(), type: "COMPONENT_STORED_SUCCESS", 
                             payload: { taskId: fullFlowTaskId, artifacts: msg.payload.artifacts }, 
                             sender: "R2StorageAgent", recipient: "CoordinatorAgent", correlationId: msg.id };
                }
                return null;
            });

            mockCoordinatorProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "COMPONENT_STORED_SUCCESS"){
                    await taskManager.updateTaskStatus(fullFlowTaskId, 'completed', createTextMessage("Coordinator: Storage successful, task complete."), []);
                    return { id: crypto.randomUUID(), type: "TASK_COMPLETED_NOTIFICATION", 
                             payload: { taskId: fullFlowTaskId, artifacts: msg.payload.artifacts }, 
                             sender: "CoordinatorAgent", recipient: "UIAgent", correlationId: msg.id };
                }
                return null;
            });
            
            mockUIAgentProcessMessage.mockImplementationOnce(async (msg: ConcreteAgentMessage) => {
                if(msg.type === "TASK_COMPLETED_NOTIFICATION"){
                }
                return null;
            });

            const initialMessageToAdb: ConcreteAgentMessage = {
                id: crypto.randomUUID(),
                type: "GENERATE_DESIGN_BRIEF_REQUEST",
                payload: adbPayload,
                sender: "User/API", 
                recipient: "ADBAgent"
            };
            await bus.publish(initialMessageToAdb);

            expect(mockADBAgentProcessMessage).toHaveBeenCalledWith(initialMessageToAdb);
            expect(mockCoordinatorProcessMessage).toHaveBeenCalledTimes(3); 
            expect(mockBuilderProcessMessage).toHaveBeenCalledTimes(1);   
            expect(mockR2StorageAgentProcessMessage).toHaveBeenCalledTimes(1); 
            expect(mockUIAgentProcessMessage).toHaveBeenCalledTimes(1);      

            expect(mockUIAgentProcessMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: "TASK_COMPLETED_NOTIFICATION",
                payload: expect.objectContaining({ taskId: fullFlowTaskId, artifacts: expect.arrayContaining([expect.objectContaining({url: builtComponentUrl})]) }),
            }));

            expect(taskManager.updateTaskStatus).toHaveBeenLastCalledWith(
                fullFlowTaskId, 'completed', 'complete', expect.objectContaining({ parts: [{text: "Coordinator: Storage successful, task complete."}]})
            );
        });
    });
}); 