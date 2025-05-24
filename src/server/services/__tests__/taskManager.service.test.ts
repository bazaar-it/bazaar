import { TaskManager, taskManager } from "../a2a/taskManager.service";
import { db } from "~/server/db";
import { customComponentJobs, agentMessages } from "~/server/db/schema";
import type { Task, TaskStatus, Message, Artifact, TaskState, ComponentJobStatus, TextPart } from "~/types/a2a";
import { mapInternalToA2AState, createTextMessage } from "~/types/a2a";
import crypto from "crypto";
// Import types for better mocking where possible, but be flexible
// import type { PgInsertBase, PgUpdateBase, PgSelect } from "drizzle-orm/pg-core";

const mockFindFirst = jest.fn();

jest.mock("~/server/db", () => {
  // Define mocks for chained methods
  const mockDbReturning = jest.fn();
  // Loosen type for mockDbValues to avoid complex type mismatches
  const mockDbValues = jest.fn().mockReturnValue({ returning: mockDbReturning });

  // Mock .where() after .set()
  const mockDbWhere = jest.fn();
  // Loosen type for mockDbSet to avoid complex type mismatches
  const mockDbSet = jest.fn().mockReturnValue({ where: mockDbWhere });

  // Define mocks for base insert and update
  // Use arrow functions and loosen types
  const mockDbInsert = jest.fn(() => ({ values: mockDbValues })) as jest.Mock<any>;
  const mockDbUpdate = jest.fn(() => ({ set: mockDbSet })) as jest.Mock<any>;

  // Mock for select queries (like findFirst)
  // Use arrow function and loosen type
  const mockDbSelect = jest.fn(() => ({
    // Add other chained methods if needed, e.g., .where(), .limit()
    findFirst: mockFindFirst, // Use the outer mockFindFirst
  })) as jest.Mock<any>;

  return {
    db: {
      insert: mockDbInsert,
      update: mockDbUpdate,
      query: {
        customComponentJobs: mockDbSelect(), // Instantiate select mock
        // Instantiate select mock for agentMessages if needed, or use a separate mock if structure differs
        agentMessages: { findFirst: jest.fn() }, // Keep simple if only findFirst is used
      },
    },
    // Keep simplified table mocks for schema checks
    customComponentJobs: { id: "id", projectId: "projectId" },
    agentMessages: { id: "id" }
  };
});

// Mock crypto.randomUUID if not available in test environment (like older Node versions for Jest)
// Modern Jest with Node 16+ should have it globally.
// const mockUUID = 'mock-uuid-1234';
// jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);

describe("TaskManager Service", () => {
  let tmInstance: TaskManager;

  beforeEach(() => {
    jest.clearAllMocks();
    tmInstance = TaskManager.getInstance();

    // Default mock for findFirst to return a basic job structure
    mockFindFirst.mockImplementation(async ({ where }: any) => {
      const mockJobId = where?.args?.[0]?.value || "mock-task-id-from-db";
      return {
        id: mockJobId,
        taskId: mockJobId,
        projectId: "mock-project-id",
        effect: "Test Effect",
        status: 'pending' as ComponentJobStatus,
        internalStatus: 'pending' as ComponentJobStatus,
        // Ensure taskState has the correct structure for TaskStatus, using undefined for optional message
        taskState: { id: mockJobId, state: 'submitted', updatedAt: new Date().toISOString(), message: undefined } as TaskStatus,
        artifacts: [] as Artifact[],
        history: [] as TaskStatus[],
        createdAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
        outputUrl: null,
        requiresInput: false,
      };
    });
  });

  describe("createTask", () => {
    it("should create a new task and return an A2A Task object", async () => {
      const projectId = "test-project-id";
      const params = { effect: "New Test Effect" };
      const mockGeneratedTaskId = crypto.randomUUID();

      // Mock the DB insert call for customComponentJobs
      // Use the mockDbValues defined in the factory
      // Access the mockDbValues through the returned object from db.insert().values
      const valuesMock = db.insert(customComponentJobs).values as jest.Mock;
      valuesMock.mockImplementationOnce((valuesPassedToDbInsert: any) => {
        // Assert that the taskId passed to DB is the one we expect to be generated for the Task object
        expect(valuesPassedToDbInsert.taskId).toBe(mockGeneratedTaskId);
        // The returning() part simulates Drizzle returning the ID of the inserted row
        return { returning: jest.fn().mockResolvedValueOnce([{id: valuesPassedToDbInsert.id}]) };
      });

      // Temporarily mock crypto.randomUUID to control the generated Task ID for this test
      const originalRandomUUID = crypto.randomUUID;
      Object.defineProperty(crypto, 'randomUUID', { value: jest.fn().mockReturnValue(mockGeneratedTaskId), writable: true });

      const task = await tmInstance.createTask(projectId, params);

      Object.defineProperty(crypto, 'randomUUID', { value: originalRandomUUID }); // Restore original crypto.randomUUID

      expect(db.insert).toHaveBeenCalledWith(customComponentJobs);
      // Correctly check arguments passed to the values method
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        projectId,
        effect: params.effect,
        status: 'pending',
        internalStatus: 'pending',
        taskId: mockGeneratedTaskId,
        sseEnabled: true,
        // taskState should be an object matching TaskStatus, with initial message
        taskState: expect.objectContaining({
            id: mockGeneratedTaskId,
            state: 'submitted',
            message: expect.objectContaining({
                parts: [expect.objectContaining({ type: 'text', text: "Task created for component generation"})]
            })
        })
      }));
      expect(task.id).toBe(mockGeneratedTaskId);
      expect(task.state).toBe('submitted');
      expect(task.message?.parts[0]).toEqual(expect.objectContaining({ type: 'text', text: "Task created for component generation" }));
    });
  });

  describe("getTaskStatus", () => {
    it("should retrieve and return task status in A2A format if taskState exists", async () => {
      const taskId = "existing-task-with-state";
      const mockDate = new Date().toISOString();
      const mockMessage = createTextMessage("Currently processing");
      const mockTaskStateFromDb: TaskStatus = {
        id: taskId,
        state: 'working',
        updatedAt: mockDate,
        message: mockMessage,
        artifacts: []
      };
      mockFindFirst.mockResolvedValueOnce({
        id: taskId, taskId, taskState: mockTaskStateFromDb, internalStatus: 'generating', status: 'working',
        artifacts: [] as Artifact[], createdAt: new Date(), updatedAt: new Date(), errorMessage: null, outputUrl: null, requiresInput: false, history: []
      });

      const status = await tmInstance.getTaskStatus(taskId);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: expect.anything() });
      expect(status).toEqual(mockTaskStateFromDb);
    });

    it("should infer A2A status from internalStatus if taskState is missing", async () => {
      const taskId = "existing-task-no-state";
      const mockDate = new Date();
      mockFindFirst.mockResolvedValueOnce({
        id: taskId, taskId, taskState: null, internalStatus: 'building', status: 'building',
        updatedAt: mockDate, createdAt: mockDate, errorMessage: "Build in progress...", outputUrl: null, artifacts: [], requiresInput: false, history: []
      });

      const status = await tmInstance.getTaskStatus(taskId);
      expect(status.id).toBe(taskId);
      expect(status.state).toBe('working');
      expect((status.message?.parts[0] as TextPart | undefined)?.text).toBe("Build in progress...");
    });

    it("should return 'unknown' state if task is not found", async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      const status = await tmInstance.getTaskStatus("non-existent-task");
      expect(status.state).toBe('unknown');
    });
  });

  describe("updateTaskStatus", () => {
    it("should update the task status in the database and notify subscribers", async () => {
      const taskId = "task-to-update";
      const newState: TaskState = 'completed';
      const newMessage = createTextMessage("Task finished.");
      const mockUpdateCallback = jest.fn();
      tmInstance.subscribeToTaskUpdates(taskId, mockUpdateCallback);

      await tmInstance.updateTaskStatus(taskId, newState, 'complete', newMessage);

      expect(db.update).toHaveBeenCalledWith(customComponentJobs);
      // Use the mockDbSet defined in the factory and check its call with the expected object
      const setMock = db.update(customComponentJobs).set as jest.Mock;
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'complete',
        internalStatus: 'complete',
        taskState: expect.objectContaining({
          id: taskId,
          state: newState,
          message: newMessage,
          updatedAt: expect.any(String),
        }),
        updatedAt: expect.any(Date),
      }));
      // Correctly check arguments passed to the where method
      const whereMock = db.update(customComponentJobs).set(expect.anything()).where as jest.Mock;
      expect(whereMock).toHaveBeenCalledWith(expect.anything());
      expect(mockUpdateCallback).toHaveBeenCalledWith({ type: 'status', state: newState, message: newMessage });
    });
  });

  describe("addTaskArtifact", () => {
    it("should add an artifact to the task and notify subscribers", async () => {
      const taskId = "task-for-artifact";
      const newArtifact: Artifact = { id: "artifact-1", type: "file", mimeType: "text/plain", url: "/file.txt", createdAt: new Date().toISOString(), name: "file.txt" };
      const mockUpdateCallback = jest.fn();
      tmInstance.subscribeToTaskUpdates(taskId, mockUpdateCallback);

      await tmInstance.addTaskArtifact(taskId, newArtifact);

      expect(db.update).toHaveBeenCalledWith(customComponentJobs);
      // Use the mockDbSet defined in the factory and check its call with the expected object
      const setMock = db.update(customComponentJobs).set as jest.Mock;
      // Explicitly define the structure expected by the mockDbSet, including taskState with message
      // This might help the type checker understand the structure being passed
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        artifacts: expect.arrayContaining([newArtifact]),
        // Include taskState in the expectation to match the likely update structure
        taskState: expect.objectContaining({ // Loosely type taskState expectation
            artifacts: expect.arrayContaining([newArtifact]), // Check artifacts within taskState
        }), // Use any to bypass strict type check here if necessary
      }));
      expect(mockUpdateCallback).toHaveBeenCalledWith({ type: 'artifact', artifact: newArtifact });
    });
  });

  describe("cancelTask", () => {
    it("should set task status to 'canceled' and log the cancellation", async () => {
      const taskId = "task-to-cancel";
      await tmInstance.cancelTask(taskId);

      // Use the mockDbSet defined in the factory and check its call with the expected object
      const setMock = db.update(customComponentJobs).set as jest.Mock;
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'canceled',
        taskState: expect.objectContaining({ state: 'canceled' }),
      }));
      expect(db.insert).toHaveBeenCalledWith(agentMessages);
      // Use the mockDbValues defined in the factory and check its call with the expected object
      const valuesMock = db.insert(agentMessages).values as jest.Mock;
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "TASK_CANCELED",
        payload: { taskId },
      }));
    });

    it("should throw an error if trying to cancel a task in a terminal state", async () => {
      const taskId = "completed-task";
      mockFindFirst.mockResolvedValueOnce({
        id: taskId, taskId,
        taskState: { state: 'completed', id:taskId, updatedAt: new Date().toISOString(), message: undefined } as TaskStatus,
        status: 'completed', internalStatus: 'complete', artifacts: [] as Artifact[], createdAt: new Date(), updatedAt: new Date(), errorMessage: null, outputUrl: null, requiresInput: false, history: []
      });
      await expect(tmInstance.cancelTask(taskId)).rejects.toThrow("Cannot cancel task in state: completed");
    });
  });

  describe("submitTaskInput", () => {
    it("should update task to 'working' and log input if task is 'input-required'", async () => {
      const taskId = "task-needs-input";
      const userInputMessage = createTextMessage("User provided input");
      mockFindFirst.mockResolvedValueOnce({
        id: taskId, taskId, status: 'input-required', internalStatus: 'fix_failed',
        taskState: { state: 'input-required', id:taskId, updatedAt: new Date().toISOString(), message: undefined } as TaskStatus,
        artifacts: [] as Artifact[], createdAt: new Date(), updatedAt: new Date(), errorMessage: null, outputUrl: null, requiresInput: true, history: []
      });

      await tmInstance.submitTaskInput(taskId, userInputMessage);

      // Use the mockDbSet defined in the factory and check its call with the expected object
      const setMock = db.update(customComponentJobs).set as jest.Mock;
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'working',
        requiresInput: false,
        taskState: expect.objectContaining({ state: 'working', message: userInputMessage }),
      }));
      expect(db.insert).toHaveBeenCalledWith(agentMessages);
      // Use the mockDbValues defined in the factory and check its call with the expected object
      const valuesMock = db.insert(agentMessages).values as jest.Mock;
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "TASK_INPUT",
        payload: { taskId, message: userInputMessage },
      }));
    });

    it("should throw an error if task is not in 'input-required' state", async () => {
      const taskId = "task-not-needing-input";
      mockFindFirst.mockResolvedValueOnce({
        id: taskId, taskId, status: 'working', internalStatus: 'building', 
        taskState: { state: 'working', id:taskId, updatedAt: new Date().toISOString(), message: undefined } as TaskStatus,
        artifacts: [], createdAt: new Date(), updatedAt: new Date(), errorMessage: null, outputUrl: null, requiresInput: false, history: []
      });
      await expect(tmInstance.submitTaskInput(taskId, createTextMessage("test"))).rejects.toThrow("Task is not waiting for input");
    });
  });

  // TODO: Add tests for SSE stream creation and event emission via taskStreams
}); 