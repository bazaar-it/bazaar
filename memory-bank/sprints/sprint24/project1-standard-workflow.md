# Project 1: Standard Functionality Workflow

## Current Status

Project 1 represents the standard functionality path in Bazaar-Vid, centered around `src/app/projects/[id]/edit/page.tsx`. This workflow uses direct service calls to process user prompts, generate components, and update the project state.

### End-to-End Pipeline: From Prompt to Video

When a user submits a prompt in the standard functionality path, the following sequence occurs:

1. **User Input**
   - User navigates to `/projects/[id]/edit` where `ProjectEditorRoot` is rendered
   - User enters a prompt in the chat interface (in `ChatPanel.tsx`)
   - Chat message is sent to the tRPC router via `chat.sendMessage` procedure

2. **Message Processing**
   - `src/server/api/routers/chat.ts` receives the message
   - Creates database entries for the user message and a pending assistant response
   - Calls `processUserMessage` in `chatOrchestration.service.ts`

3. **LLM Processing**
   - `chatOrchestration.service.ts` establishes a connection to OpenAI
   - Retrieves conversation context from the database
   - Adds current project properties as context
   - Streams request to OpenAI with function calling enabled
   - Processes the streaming response (content and tool calls)

4. **Tool Execution**
   - As tool calls are received from the LLM, they are accumulated and executed
   - Three main tools are available:
     - `applyJsonPatch`: Updates project properties
     - `generateRemotionComponent`: Creates custom components
     - `planVideoScenes`: Plans and creates scenes for the video
   - For component generation, calls `handleGenerateComponent` which invokes `componentGenerator.service.ts`

5. **Component Generation**
   - `componentGenerator.service.ts` creates a component job in the database
   - Processes the effect description through LLM
   - Generates component code
   - `buildCustomComponent.ts` handles the actual code generation
   - Generated code is validated, fixed if needed, and stored

6. **Scene Planning**
   - `scenePlanner.service.ts` processes scene descriptions
   - Converts user intentions into structured scene data
   - Updates project timeline with new scenes

7. **Preview & Rendering**
   - Components are made available in the `PreviewPanel.tsx`
   - `TimelinePanel.tsx` shows the structured timeline 
   - User can preview the animation in the browser
   - Can export final video through Remotion's render functionality

8. **Database Updates**
   - Throughout the process, database is updated via Drizzle ORM
   - Messages, components, and project properties are stored 
   - SSE (Server-Sent Events) keep the UI updated in real-time

### Key Files in the Standard Workflow

```
src/
├── app/
│   └── projects/
│       └── [id]/
│           └── edit/
│               ├── page.tsx                         # Entry point
│               ├── ProjectEditorRoot.tsx            # Main container
│               └── panels/
│                   ├── ChatPanel.tsx                # User prompt input
│                   ├── PreviewPanel.tsx             # Video preview
│                   └── TimelinePanel.tsx            # Timeline editor
├── server/
│   ├── api/
│   │   └── routers/
│   │       ├── chat.ts                             # tRPC chat procedures
│   │       └── customComponent.ts                  # tRPC component procedures
│   ├── services/
│   │   ├── chatOrchestration.service.ts            # Main chat flow controller
│   │   ├── componentGenerator.service.ts           # Custom component generation
│   │   └── scenePlanner.service.ts                 # Scene planning logic
│   └── workers/
│       ├── buildCustomComponent.ts                 # Component build pipeline
│       └── generateComponentCode.ts                # Component code generation
└── trpc/
    └── trpc.ts                                     # tRPC configuration
```

## Current Assumptions

1. **Single User Flow**: The current design assumes a single user per project.
2. **Synchronous Processing**: Component generation is mostly synchronous within a single request-response cycle.
3. **Direct Service Communication**: Services call each other directly, creating tight coupling.
4. **Client-Server Boundary**: Clear separation between client and server code, with tRPC as the communication layer.
5. **Component Persistence**: Generated components are stored in the database and can be reused.
6. **OpenAI Availability**: The system assumes OpenAI API is always available and responsive.
7. **Error Recovery**: Limited mechanisms for recovering from errors in the middle of processing.

## Ideal Simplified Architecture

If the standard project were redesigned for simplicity, it could look like:

### Architecture Principles

1. **Event-Driven Design**: Replace direct service calls with event emission and subscription.
2. **Clear Boundaries**: Establish clear boundaries between UI, business logic, and data access.
3. **Stateless Services**: Make services stateless where possible to improve scalability.
4. **Consistent Error Handling**: Implement a consistent error handling strategy across the system.
5. **Modular Components**: Design each part of the system to be independently testable and replaceable.

### Simplified Design

```
User Input → Event Bus → LLM Processing → Event Bus → Component Generation → Event Bus → UI Updates
```

### Key Improvements

1. **Event-Based Communication**:
   - Introduce a lightweight event bus for all internal communication
   - Decouple service dependencies, allowing independent scaling and testing

2. **Separated Responsibilities**:
   - Split the monolithic `chatOrchestration.service.ts` into focused services
   - Create dedicated handlers for each tool type

3. **Progressive Loading**:
   - Support partial state updates throughout the process
   - Allow users to see intermediate results and make corrections

4. **Improved Error Recovery**:
   - Store intermediate state at key points
   - Allow resuming from partial failures

5. **Consistent Interfaces**:
   - Standardize service interfaces
   - Use common patterns for success/failure responses

6. **Observability**:
   - Add comprehensive logging and tracing throughout the pipeline
   - Implement better metrics for performance monitoring

This simplified architecture would maintain the same user-facing functionality while making the system more robust, testable, and maintainable. 