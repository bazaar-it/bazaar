//memory-bank/a2a/integration.md

# Integration with Existing Systems

This document details how the Agent-to-Agent (A2A) system integrates with the existing Bazaar-Vid architecture and outlines the plan for alignment with Google's A2A protocol.

## Overview

The A2A system is designed to enhance and extend the current component generation pipeline without requiring a complete rewrite. It leverages existing code while providing a more modular, resilient framework for managing the component lifecycle.

## Google A2A Protocol Alignment

Our implementation will align with Google's [Agent-to-Agent (A2A) protocol](https://github.com/google/A2A), an open standard for agent communication and interoperability. This alignment involves several key areas:

1. **Task Lifecycle**: Adopt standard A2A task states (submitted, working, input-required, completed, etc.)
2. **Agent Discovery**: Implement AgentCard endpoints for capability discovery
3. **Structured Content Types**: Use standard message part formats (text, file, data)
4. **SSE Streaming**: Replace Pusher with SSE for real-time updates

## Implementation Plan

The integration will be implemented in phases to minimize disruption to the existing system:

### Phase 1: Core Alignment (2-3 Weeks)
- Create A2A type definitions in `src/types/a2a.ts`
- Enhance `customComponentJobs` schema with A2A task states
- Create migration scripts for database changes
- Modify `BaseAgent` with methods for task state management
- Unit tests for core functionality

### Phase 2: Agent Discovery (1-2 Weeks)
- Create `AgentCard` definitions for each agent
- Implement `.well-known/agent.json` endpoint
- Add agent-specific discovery endpoints at `/api/agents/[agentName]`
- Add documentation for external system integration

### Phase 3: Standard Message Types (2 Weeks)
- Update message payloads to use A2A `Message` and `Part` formats
- Implement support for `Artifact` in component output
- Add metadata support across all agents
- Update message processing to handle the new formats

### Phase 4: SSE Implementation (2-3 Weeks)
- Create SSE endpoints for task updates
- Implement client reconnection capabilities
- Replace Pusher with SSE in UI components
- Create client utilities for SSE consumption

### Phase 5: Testing and Refinement (2 Weeks)
- End-to-end testing of A2A compliance
- Performance testing and optimization
- Documentation updates
- Sample integration examples

## Integration Points

### 1. Component Generation

**Current System:**
- `generateComponentCode` in `src/server/workers/generateComponentCode.ts`
- Direct calls from chat router to component generation functions
- Monolithic error handling

**A2A Integration:**
- BuilderAgent wraps `generateComponentCode`
- ErrorFixerAgent leverages `tsxPreprocessor.ts` functions
- More granular error tracking and handling
- Task states align with A2A protocol

```typescript
// Example of integrating with existing generateComponentCode
// src/server/agents/builder-agent.ts (partial)

import { generateComponentCode } from '~/server/workers/generateComponentCode';
import { TaskState } from '~/types/a2a';

export class BuilderAgent extends BaseAgent {
  // ...
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'BUILD_COMPONENT_REQUEST') {
      const { animationDesignBrief, projectId, componentJobId } = message.payload;
      
      // Update task state to 'working'
      await this.updateTaskState(componentJobId, 'working', 
        this.createTextMessage('agent', 'Generating component code...'));
      
      // Use existing function but with enhanced tracking & error handling
      const { componentCode, syntaxValidationResult } = await generateComponentCode({
        animationDesignBrief: message.payload.animationDesignBrief,
        projectId: message.payload.projectId,
        componentJobId: message.payload.componentJobId
      });
      
      // Rest of agent logic for handling the result...
    }
  }
}
```

### 2. Component Building

**Current System:**
- `buildCustomComponent` in `src/server/workers/buildCustomComponent.ts`
- esbuild integration for component compilation
- Direct file system operations for output

**A2A Integration:**
- BuilderAgent calls `buildCustomComponent`
- Enhanced error tracking and status updates
- Better verification of build success
- Component artifacts align with A2A protocol

```typescript
// Example of integrating with existing buildCustomComponent
// src/server/agents/builder-agent.ts (partial)

import { buildCustomComponent } from '~/server/workers/buildCustomComponent';

export class BuilderAgent extends BaseAgent {
  // ...
  
  async buildComponent(componentJobId: string, code: string): Promise<AgentMessage> {
    try {
      // Update task state
      await this.updateTaskState(componentJobId, 'working',
        this.createTextMessage('agent', 'Building component...'));
        
      // Use existing build function
      const buildResult = await buildCustomComponent(componentJobId, code);
      
      if (buildResult.success) {
        // Create file artifact
        const fileArtifact = this.createFileArtifact(
          "component.js",
          buildResult.outputUrl,
          "application/javascript"
        );
        
        // Add artifact to the task
        await this.addTaskArtifact(componentJobId, fileArtifact);
        
        // Update task state
        await this.updateTaskState(componentJobId, 'working',
          this.createTextMessage('agent', 'Component built successfully'));
          
        return this.createMessage(
          'COMPONENT_BUILD_SUCCESS', 
          { componentJobId, outputUrl: buildResult.outputUrl },
          'R2StorageAgent'
        );
      } else {
        // Update state for build error
        await this.updateTaskState(componentJobId, 'working',
          this.createTextMessage('agent', `Build error: ${buildResult.error}`));
          
        return this.createMessage(
          'COMPONENT_BUILD_ERROR',
          { componentCode: code, errors: buildResult.error, componentJobId },
          'ErrorFixerAgent'
        );
      }
    } catch (error) {
      // Update state for unexpected error
      await this.updateTaskState(componentJobId, 'failed',
        this.createTextMessage('agent', `Unexpected error: ${error.message}`));
        
      return this.createMessage(
        'COMPONENT_PROCESS_ERROR',
        { error: error.message, componentJobId },
        'CoordinatorAgent'
      );
    }
  }
}
```

### 3. Syntax Validation and Fixing

**Current System:**
- `validateComponentSyntax` in `src/server/workers/generateComponentCode.ts`
- `fixUnclosedJsxTags`, `fixJsxStructure`, etc. in `tsxPreprocessor.ts`

**A2A Integration:**
- ErrorFixerAgent leverages these functions
- More systematic application of fixes
- Multiple fix attempts with escalation
- Support for requesting user input via `input-required` state

```typescript
// Example of creating a componentFixer service that integrates existing code
// src/server/agents/error-fixer-agent.ts (partial)

import { 
  fixUnclosedJsxTags, 
  fixJsxStructure, 
  fixImports 
} from '~/server/utils/tsxPreprocessor';

export class ErrorFixerAgent extends BaseAgent {
  // ...
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'COMPONENT_SYNTAX_ERROR' || message.type === 'COMPONENT_BUILD_ERROR') {
      const { componentCode, errors, componentJobId } = message.payload;
      
      // Check if the error might require user input
      if (this.mightRequireUserInput(errors)) {
        // Update task state to request user input
        await this.updateTaskState(componentJobId, 'input-required',
          this.createTextMessage('agent', 'Component has complex errors that may require user guidance'));
          
        return this.createMessage(
          'COMPONENT_FIX_INPUT_REQUIRED',
          {
            componentJobId,
            options: this.generateFixOptions(errors),
            componentCode
          },
          'UIAgent'
        );
      }
      
      // Otherwise proceed with automatic fixing
      try {
        // Update task state
        await this.updateTaskState(componentJobId, 'working',
          this.createTextMessage('agent', 'Fixing component errors...'));
        
        // Fix component code
        const fixedCode = await this.fixComponentSyntax(componentCode, errors);
        
        return this.createMessage(
          'COMPONENT_FIX_RESULT',
          {
            componentJobId,
            fixedCode,
            originalErrors: errors
          },
          'BuilderAgent'
        );
      } catch (error) {
        // Update state for fix failure
        await this.updateTaskState(componentJobId, 'failed',
          this.createTextMessage('agent', `Failed to fix component: ${error.message}`));
          
        return this.createMessage(
          'COMPONENT_FIX_ERROR',
          { error: error.message, componentJobId },
          'CoordinatorAgent'
        );
      }
    }
    
    return null;
  }
}
```

### 4. Animation Design Brief Integration

**Current System:**
- `generateAnimationDesignBrief` in `src/server/services/animationDesigner.service.ts`
- Called directly from chat router

**A2A Integration:**
- ADBAgent wraps this functionality
- Provides more control over the design brief generation process
- Uses A2A task states for design brief creation

```typescript
// Example of ADBAgent integration with existing animationDesigner service
// src/server/agents/adb-agent.ts (partial)

import { generateAnimationDesignBrief } from '~/server/services/animationDesigner.service';

export class ADBAgent extends BaseAgent {
  // ...
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'GENERATE_DESIGN_BRIEF') {
      const { description, projectId, sceneId, dimensions, duration } = message.payload;
      const componentJobId = message.payload.componentJobId || crypto.randomUUID();
      
      try {
        // Update task state to working
        await this.updateTaskState(componentJobId, 'working',
          this.createTextMessage('agent', 'Generating animation design brief...'));
        
        // Use existing animation designer service
        const { brief, briefId } = await generateAnimationDesignBrief({
          description,
          projectId,
          sceneId,
          durationInSeconds: duration || 5,
          dimensions: dimensions || { width: 1280, height: 720 }
        });
        
        // Add brief as a data artifact
        await this.addTaskArtifact(componentJobId, {
          name: 'animation-design-brief',
          description: 'Animation design brief for component generation',
          parts: [{
            type: 'data',
            data: brief
          }],
          index: 0
        });
        
        // Update task state to working (still in progress)
        await this.updateTaskState(componentJobId, 'working',
          this.createTextMessage('agent', 'Animation design brief generated successfully'));
        
        // Forward to component creation process
        return this.createMessage(
          'CREATE_COMPONENT_REQUEST',
          {
            animationDesignBrief: brief,
            projectId,
            designBriefId: briefId,
            componentJobId
          },
          'CoordinatorAgent'
        );
      } catch (error) {
        // Update state for ADB generation failure
        await this.updateTaskState(componentJobId, 'failed',
          this.createTextMessage('agent', `Failed to generate design brief: ${error.message}`));
          
        return this.createMessage(
          'ADB_GENERATION_ERROR',
          { 
            error: error.message, 
            projectId,
            sceneId,
            componentJobId
          },
          'CoordinatorAgent'
        );
      }
    }
    
    return null;
  }
}
```

### 5. API Integration

#### tRPC Integration

```typescript
// src/server/api/routers/agent.ts
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import { CoordinatorAgent } from '~/server/agents/coordinator-agent';
import { messageBus } from '~/server/agents/message-bus';
import { observable } from '@trpc/server/observable';

const coordinatorAgent = new CoordinatorAgent();
messageBus.register(coordinatorAgent);

export const agentRouter = createTRPCRouter({
  // Start a component generation process
  createComponent: protectedProcedure
    .input(z.object({
      animationDesignBrief: z.any(), // Use proper schema
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { animationDesignBrief, projectId } = input;
      const message = coordinatorAgent.initiateComponentCreation(animationDesignBrief, projectId);
      await messageBus.publish(message);
      return { success: true, componentJobId: message.payload.componentJobId };
    }),
  
  // Get task details with A2A format
  getTask: protectedProcedure
    .input(z.object({
      componentJobId: z.string().uuid(),
      historyLength: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      // Implementation to get task details in A2A format
    }),
    
  // Subscribe to real-time task updates via SSE
  subscribeToTask: protectedProcedure
    .input(z.object({
      componentJobId: z.string().uuid(),
      clientId: z.string().optional(),
      lastEventId: z.string().optional()
    }))
    .subscription(async ({ input }) => {
      // Implementation for SSE subscription
    }),
});
```

#### REST API Routes

For A2A protocol compatibility, we'll add standard REST API endpoints:

```typescript
// src/app/api/agents/[agentName]/tasks/send/route.ts
import { NextResponse } from 'next/server';
import { messageBus } from '~/server/agents/message-bus';

export async function POST(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  // Implementation for A2A tasks/send endpoint
}
```

```typescript
// src/app/api/agents/[agentName]/tasks/sendSubscribe/route.ts
import { streamResponse } from 'next/server';
import { messageBus } from '~/server/agents/message-bus';

export async function POST(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  // Implementation for A2A tasks/sendSubscribe endpoint (SSE)
}
```

### 6. UI Integration

**Current System:**
- `CustomComponentsPanel.tsx` directly queries component status
- Manual refresh or polling for updates
- Pusher for real-time notifications

**A2A Integration:**
- UI Agent pushes updates via SSE
- Real-time status updates
- Support for task states and artifacts

#### Client-Side Implementation

```typescript
// UI Component Example for SSE Streaming
// src/app/components/CustomComponentsPanel.tsx (partial)

import { useEffect, useState } from 'react';
import { api } from '~/utils/api';

function CustomComponentMonitor({ componentJobId }: { componentJobId: string }) {
  const [status, setStatus] = useState('submitted');
  const [artifacts, setArtifacts] = useState([]);
  const [isStreaming, setIsStreaming] = useState(true);
  
  // Initial task data
  const { data: taskData } = api.agent.getTask.useQuery(
    { componentJobId },
    { enabled: !!componentJobId }
  );
  
  // Subscribe to streaming updates
  useEffect(() => {
    if (!componentJobId || !isStreaming) return;
    
    // Get tRPC client
    const { client } = api.useContext();
    
    // Create subscription
    const subscription = client.agent.subscribeToTask.subscribe(
      { componentJobId },
      {
        onData: (event) => {
          // Handle status updates
          if (event.status) {
            setStatus(event.status.state);
            // Show message if available
            if (event.status.message?.parts[0]?.text) {
              console.log(`Status message: ${event.status.message.parts[0].text}`);
            }
          }
          
          // Handle artifact updates
          if (event.artifact) {
            setArtifacts((prev) => [...prev, event.artifact]);
          }
          
          // If this is the final event, stop streaming
          if (event.final) {
            setIsStreaming(false);
          }
        },
        onError: (err) => {
          console.error("Streaming error:", err);
          setIsStreaming(false);
        }
      }
    );
    
    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [componentJobId, isStreaming]);
  
  // Return appropriate UI based on status
  return (
    <div>
      <div className="status-indicator">
        {status === 'submitted' && <div>Submitted</div>}
        {status === 'working' && <div>Working...</div>}
        {status === 'input-required' && <div>Input Required</div>}
        {status === 'completed' && <div>Completed</div>}
        {status === 'failed' && <div>Failed</div>}
      </div>
      
      {/* Display artifacts if available */}
      {artifacts.length > 0 && (
        <div className="artifacts">
          <h3>Artifacts</h3>
          <ul>
            {artifacts.map((artifact, index) => (
              <li key={index}>
                {artifact.name || `Artifact ${index + 1}`}
                {/* Render appropriate content based on part type */}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Migration Strategy

To minimize disruption, we'll follow these steps:

1. **Database Preparation**: Add new fields to `customComponentJobs` while maintaining backward compatibility
2. **Agent Framework**: Create the A2A agent framework alongside existing code
3. **Incremental Agent Implementation**: Begin with CoordinatorAgent and BuilderAgent
4. **Parallel Operation**: Allow both old and new systems to run in parallel initially
5. **Gradual Replacement**: As agents prove stable, replace direct calls with agent-based calls
6. **Feature Completeness**: Add more advanced A2A features (streaming, agentCards, etc.)
7. **Final Transition**: Remove old code paths once A2A system is fully functional

## Benefits of A2A Protocol Alignment

1. **Standardization**: Following an industry standard will make the system more maintainable
2. **Interoperability**: Potential to communicate with other A2A-compliant agents
3. **Streaming Updates**: More efficient and responsive UI with SSE
4. **Enhanced Capabilities**: Structured artifacts, dynamic task states, etc.
5. **Future Compatibility**: As A2A ecosystem grows, our system will be able to integrate with new tools

## Initial Integration Steps

1. Create the base agent framework without changing existing functionality
2. Add the agent message table to the database
3. Create the CoordinatorAgent and BuilderAgent first
4. Wire them into the existing component generation flow as a pass-through
5. Gradually add more sophisticated agent behavior
6. Implement the remaining agents one by one

This approach ensures minimal disruption to the existing system while incrementally adding the benefits of the A2A architecture and protocol alignment.
