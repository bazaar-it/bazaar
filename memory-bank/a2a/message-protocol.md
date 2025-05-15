//memory-bank/a2a/message-protocol.md

# A2A Message Protocol

This document defines the standard message types and formats used in the Agent-to-Agent (A2A) system for Bazaar-Vid, aligned with Google's A2A protocol.

## A2A Protocol Alignment

Our message protocol follows Google's [Agent-to-Agent (A2A) protocol](https://github.com/google/A2A) with adaptations specific to our component generation workflow. Key alignments include:

- Standard task states (submitted, working, input-required, completed, etc.)
- Structured content types (text, file, data)
- Messages and artifacts format
- Support for streaming updates

## Standard A2A Types

### Message Structure

```typescript
// Internal message structure for inter-agent communication
interface AgentMessage {
  type: string;            // The message type (e.g., 'BUILD_COMPONENT_REQUEST')
  payload: Record<string, any>; // Message data
  sender: string;          // Sender agent name
  recipient: string;       // Recipient agent name
  id: string;              // Unique message ID
  correlationId?: string;  // For linking related messages
}

// A2A-compliant content part types
interface TextPart {
  type: "text";
  text: string;
  metadata?: Record<string, any> | null;
}

interface FilePart {
  type: "file";
  file: {
    name?: string | null;
    mimeType?: string | null;
    bytes?: string | null; // Base64 encoded content
    uri?: string | null;   // URL to the file
  };
  metadata?: Record<string, any> | null;
}

interface DataPart {
  type: "data";
  data: Record<string, any>;
  metadata?: Record<string, any> | null;
}

type Part = TextPart | FilePart | DataPart;

// A2A-compliant message structure
interface Message {
  role: "user" | "agent";
  parts: Part[];
  metadata?: Record<string, any> | null;
}

// A2A-compliant artifact (output)
interface Artifact {
  name?: string | null;
  description?: string | null;
  parts: Part[];
  index: number;
  append?: boolean | null;
  lastChunk?: boolean | null;
  metadata?: Record<string, any> | null;
}

// A2A-compliant task state
interface TaskStatus {
  state: "submitted" | "working" | "input-required" | "completed" | "canceled" | "failed" | "unknown";
  message: Message | null;
  timestamp: string; // ISO 8601 timestamp
}
```

## Standard Message Types

### Coordination Messages

| Message Type | Sender | Recipient | Description | Key Payload Fields | A2A Task State |
|-------------|--------|-----------|-------------|-------------------|----------------|
| `CREATE_COMPONENT_REQUEST` | User/ADBAgent | CoordinatorAgent | Initiates component creation | `animationDesignBrief`, `projectId` | submitted |
| `COMPONENT_PROGRESS_UPDATE` | Any | CoordinatorAgent | Updates on component progress | `componentJobId`, `status`, `progress` | working |
| `COMPONENT_PROCESS_ERROR` | Any | CoordinatorAgent | General error notification | `componentJobId`, `error` | failed |
| `COMPONENT_FAILED` | CoordinatorAgent | UIAgent | Final failure notification | `componentJobId`, `error` | failed |
| `COMPONENT_READY` | R2StorageAgent | UIAgent | Component ready notification | `componentJobId`, `outputUrl` | completed |

### Builder Messages

| Message Type | Sender | Recipient | Description | Key Payload Fields | A2A Task State |
|-------------|--------|-----------|-------------|-------------------|----------------|
| `BUILD_COMPONENT_REQUEST` | CoordinatorAgent | BuilderAgent | Request to build component | `animationDesignBrief`, `projectId`, `componentJobId` | working |
| `COMPONENT_SYNTAX_ERROR` | BuilderAgent | ErrorFixerAgent | Syntax errors in component | `componentCode`, `errors`, `componentJobId` | working |
| `COMPONENT_BUILD_ERROR` | BuilderAgent | ErrorFixerAgent | Build errors in component | `componentCode`, `errors`, `componentJobId` | working |
| `COMPONENT_BUILD_SUCCESS` | BuilderAgent | R2StorageAgent | Component built successfully | `componentJobId`, `outputUrl` | working |

### Error Fixer Messages

| Message Type | Sender | Recipient | Description | Key Payload Fields | A2A Task State |
|-------------|--------|-----------|-------------|-------------------|----------------|
| `COMPONENT_FIX_RESULT` | ErrorFixerAgent | BuilderAgent | Fixed component code | `componentJobId`, `fixedCode`, `originalErrors` | working |
| `COMPONENT_FIX_ERROR` | ErrorFixerAgent | CoordinatorAgent | Unable to fix component | `componentJobId`, `error` | failed |
| `COMPONENT_FIX_INPUT_REQUIRED` | ErrorFixerAgent | UIAgent | User input needed to fix | `componentJobId`, `options` | input-required |

### R2 Storage Messages

| Message Type | Sender | Recipient | Description | Key Payload Fields | A2A Task State |
|-------------|--------|-----------|-------------|-------------------|----------------|
| `R2_STORAGE_ERROR` | R2StorageAgent | CoordinatorAgent | Error storing in R2 | `componentJobId`, `error` | failed |

### Animation Design Brief Messages

| Message Type | Sender | Recipient | Description | Key Payload Fields | A2A Task State |
|-------------|--------|-----------|-------------|-------------------|----------------|
| `GENERATE_DESIGN_BRIEF` | User/UI | ADBAgent | Request to generate ADB | `description`, `projectId`, `sceneId` | submitted |
| `ADB_GENERATION_ERROR` | ADBAgent | CoordinatorAgent | Error generating ADB | `projectId`, `sceneId`, `error` | failed |

## A2A-Compliant Streaming Events

For SSE streaming, the system produces standard A2A event types:

```typescript
interface TaskStatusUpdateEvent {
  id: string;           // Task ID
  status: TaskStatus;   // New status
  final: boolean;       // Is this the terminal event?
  metadata?: Record<string, any> | null;
}

interface TaskArtifactUpdateEvent {
  id: string;           // Task ID
  artifact: Artifact;   // The artifact data
  final: boolean;       // Usually false for artifacts
  metadata?: Record<string, any> | null;
}
```

## Message Flow Examples

### Successful Component Generation

```
User/UI → CoordinatorAgent: CREATE_COMPONENT_REQUEST (submitted)
CoordinatorAgent → BuilderAgent: BUILD_COMPONENT_REQUEST (working)
BuilderAgent → R2StorageAgent: COMPONENT_BUILD_SUCCESS (working)
R2StorageAgent → UIAgent: COMPONENT_READY (completed)
```

### Component with Syntax Errors

```
User/UI → CoordinatorAgent: CREATE_COMPONENT_REQUEST (submitted)
CoordinatorAgent → BuilderAgent: BUILD_COMPONENT_REQUEST (working)
BuilderAgent → ErrorFixerAgent: COMPONENT_SYNTAX_ERROR (working)
ErrorFixerAgent → BuilderAgent: COMPONENT_FIX_RESULT (working)
BuilderAgent → R2StorageAgent: COMPONENT_BUILD_SUCCESS (working)
R2StorageAgent → UIAgent: COMPONENT_READY (completed)
```

### Component with Build Errors

```
User/UI → CoordinatorAgent: CREATE_COMPONENT_REQUEST (submitted)
CoordinatorAgent → BuilderAgent: BUILD_COMPONENT_REQUEST (working)
BuilderAgent → ErrorFixerAgent: COMPONENT_BUILD_ERROR (working)
ErrorFixerAgent → BuilderAgent: COMPONENT_FIX_RESULT (working)
BuilderAgent → R2StorageAgent: COMPONENT_BUILD_SUCCESS (working)
R2StorageAgent → UIAgent: COMPONENT_READY (completed)
```

### Component with Unfixable Errors

```
User/UI → CoordinatorAgent: CREATE_COMPONENT_REQUEST (submitted)
CoordinatorAgent → BuilderAgent: BUILD_COMPONENT_REQUEST (working)
BuilderAgent → ErrorFixerAgent: COMPONENT_SYNTAX_ERROR (working)
ErrorFixerAgent → CoordinatorAgent: COMPONENT_FIX_ERROR (failed)
CoordinatorAgent → UIAgent: COMPONENT_FAILED (failed)
```

### Component Needing User Input

```
User/UI → CoordinatorAgent: CREATE_COMPONENT_REQUEST (submitted)
CoordinatorAgent → BuilderAgent: BUILD_COMPONENT_REQUEST (working)
BuilderAgent → ErrorFixerAgent: COMPONENT_BUILD_ERROR (working)
ErrorFixerAgent → UIAgent: COMPONENT_FIX_INPUT_REQUIRED (input-required)
User/UI → ErrorFixerAgent: USER_FIX_SELECTION (working)
ErrorFixerAgent → BuilderAgent: COMPONENT_FIX_RESULT (working)
BuilderAgent → R2StorageAgent: COMPONENT_BUILD_SUCCESS (working)
R2StorageAgent → UIAgent: COMPONENT_READY (completed)
```

## Message Persistence

All messages are persisted in the database in the `agent_messages` table, which allows for:

- Auditing the complete history of a component's lifecycle
- Debugging failures by inspecting the message chain
- Analyzing performance bottlenecks
- Generating metrics on component success rates

Additionally, task state transitions are stored in the `customComponentJobs` table for A2A protocol compatibility.

## Message Handling

When an agent receives a message, it should:

1. Validate the message structure and payload
2. Update the task state in the database according to A2A protocol standards
3. Process the message according to its type
4. Create any necessary artifacts
5. Return a response message if appropriate
6. Handle any errors and send error messages to the appropriate recipient

## Error Handling

Errors should be propagated through the system as specific error message types. The general pattern is:

1. Agent encounters an error during processing
2. Agent updates the component job status to the appropriate A2A task state
3. Agent sends an error message to the appropriate recipient
4. Recipient processes the error and decides on next steps (retry, escalate, notify)

This ensures that errors are properly tracked and handled throughout the system while maintaining A2A protocol compliance.
