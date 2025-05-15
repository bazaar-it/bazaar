import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../useSSE';
import type { SSEEventPayload, TaskStatusUpdateData, TaskArtifactUpdateData, Message, Artifact } from '~/types/a2a';
import { createTextMessage } from '~/types/a2a';

// Declare static properties for EventSource with literal types
declare global {
  interface EventSource {
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSED: 2;
  }
}

// Mock EventSource
let mockEventSourceInstance: {
  url: string;
  withCredentials?: boolean; // Added based on EventSourceInit
  close: jest.Mock;
  readyState: number;
  onopen: ((this: EventSource, ev: Event) => any) | null;
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null;
  onerror: ((this: EventSource, ev: Event) => any) | null;
  addEventListener: jest.Mock; // For completeness, though useSSE uses on*
  removeEventListener: jest.Mock; // For completeness
  // Methods to simulate server events
  __simulateOpen: () => void;
  __simulateMessage: (data: string) => void;
  __simulateError: (event?: Partial<Event>) => void;
  // Static properties expected by EventSource type
  CONNECTING: 0;
  OPEN: 1;
  CLOSED: 2;
};

const mockEventSourceGlobal = jest.fn((url: string, options?: EventSourceInit) => {
  mockEventSourceInstance = {
    url,
    withCredentials: options?.withCredentials || false,
    close: jest.fn(() => { 
      mockEventSourceInstance.readyState = EventSource.CLOSED; 
    }),
    readyState: EventSource.CONNECTING, 
    onopen: null,
    onmessage: null,
    onerror: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    __simulateOpen: () => {
      if (mockEventSourceInstance.onopen) {
        mockEventSourceInstance.readyState = EventSource.OPEN;
        // `this` should refer to mockEventSourceInstance itself when onopen is called by the hook
        mockEventSourceInstance.onopen.call(mockEventSourceInstance as unknown as EventSource, { type: 'open' } as Event);
      }
    },
    __simulateMessage: (data: string) => {
      if (mockEventSourceInstance.onmessage) {
        mockEventSourceInstance.onmessage.call(mockEventSourceInstance as unknown as EventSource, { data } as MessageEvent);
      }
    },
    __simulateError: (eventDetails?: Partial<Event>) => {
      if (mockEventSourceInstance.onerror) {
        mockEventSourceInstance.readyState = EventSource.CLOSED;
        mockEventSourceInstance.onerror.call(mockEventSourceInstance as unknown as EventSource, { type: 'error', ...eventDetails } as Event);
      }
    },
    CONNECTING: 0, // Add static properties to the instance for type compatibility
    OPEN: 1,
    CLOSED: 2,
  };
  return mockEventSourceInstance as unknown as EventSource; // More specific cast
});

(global as any).EventSource = mockEventSourceGlobal;
// Also assign static properties to the mock constructor if needed by tests or TS
(global as any).EventSource.CONNECTING = 0;
(global as any).EventSource.OPEN = 1;
(global as any).EventSource.CLOSED = 2;

describe('useSSE Hook', () => {
  const mockTaskId = 'test-task-123';
  let mockHookOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookOptions = {
      onTaskStatusUpdate: jest.fn(),
      onTaskArtifactUpdate: jest.fn(),
      onError: jest.fn(),
      onHeartbeat: jest.fn(),
      onOpen: jest.fn(),
      onClose: jest.fn(),
    };
  });

  it('should initialize with isConnected false and no error', () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should connect, call onOpen, and set isConnected to true', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    
    act(() => {
      result.current.connect(mockTaskId);
    });

    // Simulate EventSource opening by directly calling the mock's simulate method
    act(() => {
      mockEventSourceInstance.__simulateOpen();
    });

    expect(mockEventSourceGlobal).toHaveBeenCalledWith(`/api/a2a/tasks/${mockTaskId}/stream`, { withCredentials: true });
    expect(result.current.isConnected).toBe(true);
    expect(mockHookOptions.onOpen).toHaveBeenCalled();
  });

  it('should disconnect, call onClose, and set isConnected to false', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect(mockTaskId); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });

    act(() => {
      result.current.disconnect();
    });

    expect(mockEventSourceInstance.close).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
    expect(mockHookOptions.onClose).toHaveBeenCalled();
  });

  it('should process incoming task_status_update events', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect(mockTaskId); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });

    const eventPayload: SSEEventPayload = {
      type: 'task_status_update',
      data: { task_id: mockTaskId, state: 'working', message: createTextMessage('In progress') } as TaskStatusUpdateData,
    };
    act(() => {
      mockEventSourceInstance.__simulateMessage(JSON.stringify(eventPayload));
    });
    expect(mockHookOptions.onTaskStatusUpdate).toHaveBeenCalledWith(eventPayload);
  });

  it('should process incoming task_artifact_update events', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect(mockTaskId); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });
    
    const artifactData: Artifact = {id: "art1", type: "file", mimeType: "text/plain", url: "/file.txt", createdAt: "time", name:"file.txt" };
    const eventPayload: SSEEventPayload = {
      type: 'task_artifact_update',
      data: { task_id: mockTaskId, artifact: artifactData } as TaskArtifactUpdateData,
    };
    act(() => {
      mockEventSourceInstance.__simulateMessage(JSON.stringify(eventPayload));
    });
    expect(mockHookOptions.onTaskArtifactUpdate).toHaveBeenCalledWith(eventPayload);
  });

  it('should handle SSE connection errors and call onError', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect(mockTaskId); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });

    act(() => {
      mockEventSourceInstance.__simulateError(); 
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('SSE connection error');
    expect(mockHookOptions.onError).toHaveBeenCalledWith({type: 'error', data: {code: -1, message: "SSE connection error"}});
  });

  it('should cleanup event source on unmount', () => {
    const { result, unmount } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect(mockTaskId); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });
    
    unmount();
    expect(mockEventSourceInstance.close).toHaveBeenCalled();
  });
  
  it('should not connect if taskId is not provided', () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      result.current.connect("");
    });
    expect(mockEventSourceGlobal).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("SSE Connect: taskId is required.");
    consoleErrorSpy.mockRestore();
  });

  it('should disconnect previous connection if connect is called with a new taskId', async () => {
    const { result } = renderHook(() => useSSE(mockHookOptions));
    act(() => { result.current.connect("task1"); });
    act(() => { mockEventSourceInstance.__simulateOpen(); });
    const firstCloseMock = mockEventSourceInstance.close;

    act(() => { result.current.connect("task2"); });
    act(() => { mockEventSourceInstance.__simulateOpen(); }); 

    expect(firstCloseMock).toHaveBeenCalled();
    expect(mockEventSourceGlobal).toHaveBeenCalledTimes(2);
    expect(mockEventSourceGlobal).toHaveBeenLastCalledWith(expect.stringContaining("task2"), expect.anything());
    expect(result.current.isConnected).toBe(true); 
  });
}); 