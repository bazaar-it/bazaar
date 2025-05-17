# A2A Test Dashboard Architecture

## Overview

The A2A Test Dashboard provides a comprehensive visualization and debugging environment for the Agent-to-Agent system within Bazaar-Vid. This environment allows developers to monitor agent interactions, evaluate component generation, and assess the performance of the animation generation pipeline in a controlled setting.

## Purpose

The current development cycle has been hindered by challenges in debugging complex agent interactions and component generation issues. This test dashboard aims to:

1. Provide visual transparency into agent communications
2. Track the complete workflow from user prompt to visual output
3. Enable testing with different AI models (o4, Claude, Gemini)
4. Compare animation design briefs and their resulting components
5. Verify component rendering in Remotion Player
6. Facilitate faster debugging and system improvements

## Core Components

### 1. Agent Visualization Panel

- **Agent Directory:** Visual representation of all available agents and their statuses
- **Agent Cards:** Display of each agent's capabilities following the A2A protocol
- **Interaction Flow:** Visual animation of agent-to-agent communications
- **Message Inspector:** Real-time view of messages being exchanged between agents

### 2. Task Creation Interface

- **Prompt Input:** Simulates the chat interface from the main application
- **Task Controls:** Create, monitor, and manage A2A tasks
- **Task Timeline:** Visual representation of task lifecycle

### 3. Animation Design Brief Viewer

- **Brief Inspector:** Display and compare animation design briefs
- **Revision History:** Track changes in design specifications
- **Evaluation Metrics:** Assess quality and completeness of generated briefs

### 4. TSX Code Generation Monitor

- **Code Viewer:** Display generated TSX Remotion code
- **Syntax Highlighting:** Enhanced readability for code review
- **Diff View:** Compare code across multiple generations or models
- **Error Diagnostics:** Identify and display any syntax or compilation issues

### 5. Remotion Preview Panel

- **Component Renderer:** Display the actual rendered animation
- **Playback Controls:** Standard video controls for reviewing animations
- **Performance Metrics:** Track rendering times and performance

### 6. Model Selection and Comparison

- **Model Switcher:** Toggle between different LLM models (o4, Claude, Gemini)
- **Parallel Generation:** Generate components using multiple models simultaneously
- **Comparison View:** Side-by-side comparison of outputs from different models

## User Flow

1. User logs in to ensure access to protected routes
2. User navigates to the `/test` endpoint
3. User enters an animation prompt (e.g., "Create a bouncing ball animation")
4. System creates an A2A task and dispatches it to agents
5. Dashboard visualizes agent interactions in real-time
6. User observes:
   - Agent communications
   - Generated animation design brief
   - TSX code creation
   - Component compilation
   - Final animation in the Remotion Player
7. User can compare outputs, modify inputs, and re-evaluate

## Technical Implementation

### Frontend Components

- **AgentNetworkGraph:** Force-directed graph visualization of agent communications
- **TaskStatusBadge:** Indicator for current task state
- **AnimationDesignBriefCard:** Component for displaying ADB details
- **CodeEditor:** Monaco-based editor for viewing TSX code
- **RemotionPreviewPanel:** Embedded Remotion Player for viewing animations
- **EvaluationMetricsChart:** Data visualization for performance metrics

### Backend Services

- **A2A Task Creation Endpoint:** Creates tasks from user prompts
- **SSE Channel:** Server-sent events for real-time updates
- **Agent Communication Logger:** Captures and stores agent interactions
- **Model Switching Service:** Facilitates changing between different LLMs
- **Evaluation Metrics Service:** Collects and processes performance data

## Evaluation Framework

The dashboard will incorporate tools to evaluate:

1. **Animation Design Brief Quality:**
   - Completeness
   - Adherence to requirements
   - Technical feasibility

2. **Component Code Quality:**
   - Syntax correctness
   - Performance optimization
   - Animation complexity

3. **Rendering Performance:**
   - Compilation success rate
   - Rendering time
   - Visual quality

## Implementation Plan

### Phase 1: Core Dashboard Structure

- Create basic dashboard layout
- Implement task creation interface
- Set up agent directory display
- Establish SSE connections for real-time updates

### Phase 2: Agent Interaction Visualization

- Implement agent network graph
- Add animation for message passing
- Create message inspector
- Build agent card displays

### Phase 3: Component Generation & Preview

- Implement TSX code viewer
- Create animation design brief display
- Set up Remotion Player integration
- Add component compilation status tracking

### Phase 4: Evaluation & Comparison

- Implement model switching
- Add evaluation metrics collection
- Create comparison views
- Build performance dashboards

## Integration Points

- **A2A Protocol:** Follows the Google A2A framework for agent communication
- **Remotion Player:** Reuses the same player component from the main application
- **Database Schema:** Leverages existing project and task schema with additional tracking fields
- **LLM Integration:** Uses the same connectors as the main application with additional metadata

## Success Criteria

The test dashboard will be considered successful when it enables:

1. Complete visibility into the agent communication flow
2. Clear identification of failures in the component generation pipeline
3. Reliable comparison between different LLM models
4. Quick verification of generated components in the Remotion Player
5. Measurable improvement in debugging efficiency and development cycle

## Next Steps

After implementation, this dashboard will serve as the primary debugging and testing environment for the A2A system, informing improvements to the production application and enabling more rapid development cycles. 