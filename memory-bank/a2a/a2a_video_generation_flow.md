# A2A Video Generation Flow

## Overview

This document describes the complete flow of a video generation request through the Agent-to-Agent (A2A) architecture in Bazaar-Vid. This architecture enables autonomous, specialized agents to collaborate efficiently while maintaining a standardized communication protocol.

## Agent Roles and Responsibilities

1. **CoordinatorAgent**
   - The entry point for user requests
   - Analyzes the request and routes it to appropriate specialized agents
   - Manages task lifecycle and status updates
   - Handles recovery from failures

2. **ScenePlannerAgent** (NEW)
   - Takes text prompts and creates structured scene plans
   - Uses LLM intelligence to determine scene ordering, duration, and transitions
   - Analyzes content complexity to recommend appropriate effects
   - Creates detailed scene descriptions with precise timing

3. **ADBAgent** (Animation Design Brief Agent)
   - Takes scene plans and converts them to detailed Animation Design Briefs
   - Defines visual elements, layouts, animations, and timings
   - Handles color palettes, typography, and style consistency
   - Produces structured design specifications

4. **BuilderAgent**
   - Takes Animation Design Briefs and generates React/Remotion components
   - Translates design specifications into executable code
   - Handles architecture and proper code structure
   - Creates bundled component assets

5. **ErrorFixerAgent**
   - Analyzes and fixes code issues in generated components
   - Applies common fixes and transformations
   - Ensures components are compatible with the Remotion environment
   - Verifies component rendering capability

6. **R2StorageAgent**
   - Manages component storage in R2 buckets
   - Handles uploading, versioning, and retrieval
   - Provides secure access URLs
   - Maintains asset metadata

7. **UIAgent**
   - Handles UI updates and notifications
   - Provides real-time status updates to users
   - Renders components and previews
   - Manages interactive elements

## End-to-End Flow

### 1. User Request Initiation
- User submits a text prompt for video generation
- Prompt and project context are sent to the CoordinatorAgent
- CoordinatorAgent creates an A2A task and initializes the workflow

### 2. Scene Planning (NEW)
- CoordinatorAgent routes the request to the ScenePlannerAgent
- ScenePlannerAgent uses LLM to analyze the request and create a structured scene plan
- LLM determines the optimal sequence, duration, and transitions between scenes
- Each scene includes a description, duration, and effectType (text or custom)
- ScenePlannerAgent returns the scene plan with creative reasoning artifacts
- The existing handleScenePlan service processes the enhanced scene plan

### 3. Animation Design
- ScenePlannerAgent forwards scene plan to ADBAgent
- ADBAgent converts each scene into a detailed Animation Design Brief
- Each brief contains elements, animations, timing, and layout specifications
- ADBAgent returns complete design briefs for all scenes

### 4. Component Building
- ADBAgent forwards design briefs to BuilderAgent
- BuilderAgent generates React/Remotion component code for each design
- Components include proper animations, timing, and visual elements
- BuilderAgent compiles and bundles components
- Building status is reported back to the task

### 5. Error Fixing (If Needed)
- If component build fails, BuilderAgent forwards to ErrorFixerAgent
- ErrorFixerAgent analyzes errors and applies fixes
- Fixed components are recompiled and verified
- Success or failure status is reported back

### 6. Storage and Delivery
- Successfully built components are forwarded to R2StorageAgent
- Components are uploaded to R2 storage with metadata
- Access URLs are generated and returned
- Component metadata is stored in the database

### 7. User Notification
- CoordinatorAgent receives final status and artifacts
- Status and results are forwarded to UIAgent
- UIAgent updates the UI with component status
- User receives the completed component or error details

## Communication Protocol

All agents communicate using the Google A2A protocol with:

1. **Standard Message Format**: JSON-RPC 2.0 structure
2. **Task Lifecycle States**: submitted, working, input-required, completed, canceled, failed
3. **Real-time Updates**: SSE streaming for status changes
4. **Structured Artifacts**: Data with proper typing and schema
5. **Agent Discovery**: Agent cards for capability advertisement

## Key Technical Components

1. **TaskManager**: Handles task state transitions and persistence
2. **MessageBus**: Routes messages between agents
3. **AgentRegistry**: Manages agent discovery and capability advertisement
4. **SSE Manager**: Provides real-time updates to clients
5. **LLM Integration**: Adds intelligence to agent decision-making

## Error Handling and Recovery

1. **Agent-level Recovery**: Each agent handles domain-specific errors
2. **Coordinator Oversight**: CoordinatorAgent monitors overall flow
3. **Retry Mechanisms**: Failed steps can be retried with backoff
4. **User Intervention**: Complex issues can request user input
5. **Detailed Logging**: Comprehensive logging for debugging

## Future Enhancements

1. **Agent Specialization**: Additional specialized agents for specific domains
2. **Cross-Agent Learning**: Sharing insights between agents for optimization
3. **Multi-modal Input**: Support for image, audio, and video input
4. **Advanced Streaming**: Full streaming of agent thought processes
5. **User Collaboration**: Deeper integration of user feedback in workflows

## Desired Video Generation Flow

### 1. User Input & Project Initiation
- **Trigger**: User submits a prompt (e.g., "create a 5 seconds animation of an old school snake game") via the test/evaluation-dashboard
- **Action**:
  - A new project is created in the system
  - A unique `projectId` is generated and associated with the session

### 2. User Interaction & Initial Analysis
- **Agent**: `UserInteractionAgent` (interface agent)
- **Interface**: A chat-like panel (based on `ChatPanel.tsx`) to display communication with the user
- **Responsibilities**:
  - Receives the initial prompt
  - Performs initial analysis of the user's intent
  - Communicates progress, asks clarifying questions, and provides feedback throughout the process
  - Acts as the interface between user and the "system"

### 3. Orchestration by CoordinatorAgent
- **Agent**: `CoordinatorAgent`
- **Responsibilities**:
  - Manages the overall workflow and sequence of operations
  - Knows about all other specialized agents and their capabilities
  - Invokes subsequent agents based on the current state of the task
  - Receives results/status from other agents and decides the next step

### 4. Scene Planning
- **Agent**: `ScenePlannerAgent`
- **Services Used**: `scenePlanner.service.ts`
- **Responsibilities**:
  - Takes the user's prompt and breaks it down into a sequence of scenes
  - Defines the content, duration, and general characteristics of each scene
  - Outputs a scene plan (array of scene descriptions)

### 5. Animation Design Brief (ADB) Generation
- **Agent**: `ADBAgent` (Animation Design Brief Agent)
- **Services Used**: `animationDesigner.service.ts`
- **Responsibilities**:
  - Takes scene descriptions from the `ScenePlannerAgent`
  - Generates detailed Animation Design Briefs for scenes
  - Specifies elements, animations, timings, assets, etc. in a structured format

### 6. Remotion Code Generation
- **Agent**: `BuilderAgent` (or `ComponentBuilderAgent`)
- **Responsibilities**:
  - Takes ADBs as input
  - Generates corresponding Remotion React component code
  - Creates self-contained, importable components

### 7. Code Evaluation, Build, and Deployment
- **Agents**: `BuilderAgent` or specialized `BuildAgent`/`DeployAgent`
- **Responsibilities**:
  - **Evaluation**: Linting and basic static analysis of generated code
  - **Build**: Compiling the Remotion component/video
  - **Upload**: Storing build artifacts to storage (e.g., R2)
  - **Output URL**: Providing a publicly accessible URL for the video or preview

### 8. Display in Remotion Player
- **Interface**: Remotion Player instance on the frontend
- **Trigger**: Once the video is built and an output URL is available
- **Action**:
  - Output URL is provided to the Remotion Player
  - User can view the generated animation

### Continuous User Updates
- The `UserInteractionAgent` should provide feedback to the user in the `ChatPanel` at each significant step

## Current Implementation Issues

### 1. SSE Connection Loops
- **Symptom**: Infinite loops of SSE connect/disconnect messages
- **Root Causes**:
  - Ineffective connection tracking in React components
  - Task state updates causing rapid component re-renders
  - Missing proper debouncing and throttling
  - Improper cleanup of event sources
  - Race conditions during connection state transitions

### 2. Input Structure Mismatch
- **Problem**: The frontend sends simplified input but backend expects structured data
  - Frontend sends: `{ projectId, prompt, agentName }`
  - Backend expects: A complex payload with `targetAgent`, `effect`, message with `parts`, etc.
- This may lead to incomplete task initialization in the backend

### 3. Task Orchestration Gaps
- **Issue**: The coordinator agent may not be properly implementing the full multi-step workflow
- The sequence of: Scene Planning → ADB Generation → Component Building → etc. may be incomplete
- Missing explicit invocation of subsequent agents when prior steps complete

### 4. Missing User Interaction Interface
- The test/evaluation-dashboard lacks a proper chat interface for real-time user feedback
- No dedicated UserInteractionAgent to manage the conversation flow

### 5. Agent Communication Structure
- Missing clear data flow between agents
- Unclear how outputs from one agent (e.g., ScenePlannerAgent) are consumed by the next agent

## Technical Implementation Plan

### 1. Fix SSE Connection Issues
- Implement a formal connection state machine with explicit states:
  - disconnected
  - connecting
  - connected
  - disconnecting
- Add proper state transition management and timing
- Implement thorough debouncing of connections (500ms+)
- Properly track connected task ID to prevent duplicate connections
- Handle service worker interference

### 2. Align Frontend-Backend Contract
- Update TaskCreationPanel to send properly structured data
- Ensure the frontend properly formats:
  - Message with text parts
  - Target agent specification
  - Animation design brief parameters

### 3. Implement Complete CoordinatorAgent
- Create a robust state machine within the CoordinatorAgent
- Define clear transitions between workflow steps
- Implement proper agent invocation sequence
- Ensure outputs from each step are properly passed to the next agent

### 4. Add User Interaction Interface
- Create a ChatPanel component for the test/evaluation-dashboard
- Implement the UserInteractionAgent for handling real-time conversations
- Connect this agent to the SSE status updates

### 5. Enhance Task Status Monitoring
- Add detailed progress tracking for each step in the workflow
- Implement artifacts collection and display
- Provide rich status feedback on the dashboard

## Implementation Priority

1. **Immediate**: Fix SSE connection stability issues (in progress)
2. **Short-term**: Align frontend-backend data contract
3. **Medium-term**: Implement the user interaction interface
4. **Ongoing**: Complete the CoordinatorAgent workflow implementation

## Status Update

The SSE connection stability issues are being addressed with the following improvements:

- Added a formal connection state machine with explicit states
- Implemented proper state transition management
- Added 500ms debouncing between connection attempts
- Added service worker unregistration on component mount
- Improved error handling for connection failures

These changes should make the test/evaluation-dashboard much more stable and prevent the infinite connection loops that were occurring. 