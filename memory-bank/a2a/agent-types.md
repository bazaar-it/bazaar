//memory-bank/a2a/agent-types.md

# A2A Agent Types

This document describes the specialized agents in the A2A system, their responsibilities, and implementation details.

## Coordinator Agent

The central orchestrator that initiates and monitors the overall component generation process.

```typescript
// src/server/agents/coordinator-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super('CoordinatorAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'CREATE_COMPONENT_REQUEST') {
      const { animationDesignBrief, projectId } = message.payload;
      
      // Create component job in database
      const componentJobId = await this.createComponentJob(animationDesignBrief, projectId);
      
      // Forward to builder agent
      return this.createMessage(
        'BUILD_COMPONENT_REQUEST',
        {
          animationDesignBrief,
          projectId,
          componentJobId
        },
        'BuilderAgent'
      );
    } 
    else if ([
      'COMPONENT_PROCESS_ERROR',
      'COMPONENT_FIX_ERROR',
      'R2_STORAGE_ERROR'
    ].includes(message.type)) {
      // Handle errors by updating job status and notifying UI
      const { componentJobId, error } = message.payload;
      await this.updateComponentJobStatus(componentJobId, 'failed', { error });
      
      return this.createMessage(
        'COMPONENT_FAILED',
        { componentJobId, error },
        'UIAgent'
      );
    }
    
    return null;
  }
  
  async createComponentJob(animationDesignBrief, projectId) {
    const result = await db.insert(customComponentJobs).values({
      id: crypto.randomUUID(),
      projectId,
      effect: animationDesignBrief.sceneName || 'Custom Component',
      status: 'pending',
      createdAt: new Date(),
      animationDesignBriefId: animationDesignBrief.id,
    }).returning({ id: customComponentJobs.id });
    
    return result[0].id;
  }
  
  async updateComponentJobStatus(componentJobId, status, metadata = {}) {
    await db.update(customComponentJobs)
      .set({ 
        status,
        updatedAt: new Date(),
        metadata: metadata
      })
      .where(eq(customComponentJobs.id, componentJobId));
  }
  
  // Method to initiate the process from an API endpoint
  async initiateComponentCreation(animationDesignBrief, projectId) {
    return this.createMessage(
      'CREATE_COMPONENT_REQUEST',
      { animationDesignBrief, projectId },
      'CoordinatorAgent'
    );
  }
}
```

## Builder Agent

Responsible for generating component code and building it.

```typescript
// src/server/agents/builder-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { generateComponentCode } from '~/server/workers/generateComponentCode';
import { buildCustomComponent } from '~/server/workers/buildCustomComponent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export class BuilderAgent extends BaseAgent {
  constructor() {
    super('BuilderAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'BUILD_COMPONENT_REQUEST') {
      const { animationDesignBrief, projectId, componentJobId } = message.payload;
      
      try {
        // Update job status
        await db.update(customComponentJobs)
          .set({ status: 'generating' })
          .where(eq(customComponentJobs.id, componentJobId));
        
        // Generate component code from the brief
        const { componentCode, syntaxValidationResult } = await generateComponentCode({
          animationDesignBrief,
          projectId,
          componentJobId
        });
        
        // Store the generated code
        await db.update(customComponentJobs)
          .set({ 
            componentCode,
            syntaxValidation: syntaxValidationResult
          })
          .where(eq(customComponentJobs.id, componentJobId));
        
        if (!syntaxValidationResult.isValid) {
          // Forward to error fixer
          return this.createMessage(
            'COMPONENT_SYNTAX_ERROR',
            {
              componentCode, 
              errors: syntaxValidationResult.errors,
              componentJobId,
              projectId,
              animationDesignBrief
            },
            'ErrorFixerAgent'
          );
        }
        
        // Update status before building
        await db.update(customComponentJobs)
          .set({ status: 'building' })
          .where(eq(customComponentJobs.id, componentJobId));
        
        // Build component
        const buildResult = await buildCustomComponent(componentJobId, componentCode);
        
        if (buildResult.success) {
          // Update with build success
          await db.update(customComponentJobs)
            .set({ 
              status: 'built',
              outputUrl: buildResult.outputUrl
            })
            .where(eq(customComponentJobs.id, componentJobId));
          
          return this.createMessage(
            'COMPONENT_BUILD_SUCCESS',
            { 
              componentJobId,
              outputUrl: buildResult.outputUrl 
            }, 
            'R2StorageAgent'
          );
        } else {
          // Update with build failure
          await db.update(customComponentJobs)
            .set({ 
              status: 'build_failed',
              errorMessage: buildResult.error
            })
            .where(eq(customComponentJobs.id, componentJobId));
          
          return this.createMessage(
            'COMPONENT_BUILD_ERROR', 
            {
              componentCode,
              errors: buildResult.error,
              componentJobId,
              projectId
            },
            'ErrorFixerAgent'
          );
        }
      } catch (error) {
        // Update with unexpected error
        await db.update(customComponentJobs)
          .set({ 
            status: 'failed',
            errorMessage: error.message
          })
          .where(eq(customComponentJobs.id, componentJobId));
        
        return this.createMessage(
          'COMPONENT_PROCESS_ERROR', 
          { error: error.message, componentJobId },
          'CoordinatorAgent'
        );
      }
    }
    
    // Handle component fix results
    if (message.type === 'COMPONENT_FIX_RESULT') {
      const { componentJobId, fixedCode } = message.payload;
      
      // Update the component with fixed code
      await db.update(customComponentJobs)
        .set({ 
          componentCode: fixedCode,
          status: 'fixing'
        })
        .where(eq(customComponentJobs.id, componentJobId));
      
      // Try building again
      try {
        const buildResult = await buildCustomComponent(componentJobId, fixedCode);
        
        if (buildResult.success) {
          await db.update(customComponentJobs)
            .set({ 
              status: 'built',
              outputUrl: buildResult.outputUrl
            })
            .where(eq(customComponentJobs.id, componentJobId));
          
          return this.createMessage(
            'COMPONENT_BUILD_SUCCESS',
            { 
              componentJobId,
              outputUrl: buildResult.outputUrl 
            }, 
            'R2StorageAgent'
          );
        } else {
          // If still failing, we might need more advanced fixing or manual review
          await db.update(customComponentJobs)
            .set({ 
              status: 'fix_failed',
              errorMessage: buildResult.error
            })
            .where(eq(customComponentJobs.id, componentJobId));
          
          return this.createMessage(
            'COMPONENT_BUILD_ERROR', 
            {
              componentCode: fixedCode,
              errors: buildResult.error,
              componentJobId,
              attempts: (message.payload.attempts || 0) + 1
            },
            // If we've tried fixing multiple times, escalate to coordinator
            (message.payload.attempts || 0) >= 2 ? 'CoordinatorAgent' : 'ErrorFixerAgent'
          );
        }
      } catch (error) {
        return this.createMessage(
          'COMPONENT_PROCESS_ERROR', 
          { error: error.message, componentJobId },
          'CoordinatorAgent'
        );
      }
    }
    
    return null;
  }
}
```

## Error Fixer Agent

Specializes in analyzing and fixing code errors.

```typescript
// src/server/agents/error-fixer-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { fixComponentSyntax } from '~/server/services/componentFixer.service';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export class ErrorFixerAgent extends BaseAgent {
  constructor() {
    super('ErrorFixerAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'COMPONENT_SYNTAX_ERROR' || message.type === 'COMPONENT_BUILD_ERROR') {
      const { componentCode, errors, componentJobId, projectId, animationDesignBrief } = message.payload;
      
      try {
        // Update job status
        await db.update(customComponentJobs)
          .set({ status: 'fixing' })
          .where(eq(customComponentJobs.id, componentJobId));
        
        // Fix component code
        // This would leverage your existing tsxPreprocessor.ts utilities or use LLM for more complex fixes
        const fixedCode = await fixComponentSyntax(componentCode, errors, animationDesignBrief);
        
        // Send fixed code back to builder
        return this.createMessage(
          'COMPONENT_FIX_RESULT',
          {
            componentJobId,
            projectId,
            fixedCode,
            originalErrors: errors,
            attempts: message.payload.attempts || 0
          },
          'BuilderAgent'
        );
      } catch (error) {
        await db.update(customComponentJobs)
          .set({ 
            status: 'fix_failed',
            errorMessage: error.message
          })
          .where(eq(customComponentJobs.id, componentJobId));
          
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

## R2 Storage Agent

Handles the storing and verification of component bundles in R2.

```typescript
// src/server/agents/r2-storage-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { verifyR2Component } from '~/server/services/r2.service';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export class R2StorageAgent extends BaseAgent {
  constructor() {
    super('R2StorageAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'COMPONENT_BUILD_SUCCESS') {
      const { componentJobId, outputUrl } = message.payload;
      
      try {
        // Verify the component exists in R2 and is accessible
        const isValid = await verifyR2Component(outputUrl);
        
        if (isValid) {
          // Update job status
          await db.update(customComponentJobs)
            .set({ 
              status: 'complete',
              r2Verified: true
            })
            .where(eq(customComponentJobs.id, componentJobId));
          
          // Notify UI that component is ready
          return this.createMessage(
            'COMPONENT_READY',
            { componentJobId, outputUrl },
            'UIAgent'
          );
        } else {
          // R2 verification failed
          await db.update(customComponentJobs)
            .set({ 
              status: 'r2_failed',
              errorMessage: 'Component failed R2 verification'
            })
            .where(eq(customComponentJobs.id, componentJobId));
            
          return this.createMessage(
            'R2_STORAGE_ERROR',
            { 
              error: 'Component failed R2 verification', 
              componentJobId 
            },
            'CoordinatorAgent'
          );
        }
      } catch (error) {
        await db.update(customComponentJobs)
          .set({ 
            status: 'r2_failed',
            errorMessage: error.message
          })
          .where(eq(customComponentJobs.id, componentJobId));
          
        return this.createMessage(
          'R2_STORAGE_ERROR',
          { error: error.message, componentJobId },
          'CoordinatorAgent'
        );
      }
    }
    
    return null;
  }
}
```

## UI Agent

Updates the frontend UI based on component status.

```typescript
// src/server/agents/ui-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { pusherServer } from '~/server/lib/pusher';

export class UIAgent extends BaseAgent {
  constructor() {
    super('UIAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'COMPONENT_READY') {
      const { componentJobId, outputUrl } = message.payload;
      
      try {
        // Get component details for UI update
        const component = await db.query.customComponentJobs.findFirst({
          where: eq(customComponentJobs.id, componentJobId)
        });
        
        if (component) {
          // Notify frontend via Pusher
          await pusherServer.trigger(
            `project-${component.projectId}`, 
            'component-ready',
            {
              componentJobId,
              outputUrl,
              effect: component.effect
            }
          );
        }
      } catch (error) {
        console.error('Error notifying UI:', error);
      }
    }
    else if (message.type === 'COMPONENT_FAILED') {
      const { componentJobId, error } = message.payload;
      
      try {
        // Get component details for UI update
        const component = await db.query.customComponentJobs.findFirst({
          where: eq(customComponentJobs.id, componentJobId)
        });
        
        if (component) {
          // Notify frontend via Pusher
          await pusherServer.trigger(
            `project-${component.projectId}`, 
            'component-failed',
            {
              componentJobId,
              error,
              effect: component.effect
            }
          );
        }
      } catch (error) {
        console.error('Error notifying UI of failure:', error);
      }
    }
    
    return null;
  }
}
```

## ADB Agent

Handles Animation Design Brief management.

```typescript
// src/server/agents/adb-agent.ts
import { BaseAgent, AgentMessage } from './base-agent';
import { generateAnimationDesignBrief } from '~/server/services/animationDesigner.service';
import { db } from '~/server/db';
import { animationDesignBriefs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export class ADBAgent extends BaseAgent {
  constructor() {
    super('ADBAgent');
  }
  
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    if (message.type === 'GENERATE_DESIGN_BRIEF') {
      const { description, projectId, sceneId, duration, dimensions } = message.payload;
      
      try {
        // Generate animation design brief
        const { brief, briefId } = await generateAnimationDesignBrief({
          description,
          projectId,
          sceneId,
          durationInSeconds: duration || 5,
          dimensions: dimensions || { width: 1280, height: 720 }
        });
        
        // Send brief to coordinator to start component generation
        return this.createMessage(
          'CREATE_COMPONENT_REQUEST',
          {
            animationDesignBrief: brief,
            projectId,
            designBriefId: briefId
          },
          'CoordinatorAgent'
        );
      } catch (error) {
        console.error('Error generating design brief:', error);
        return this.createMessage(
          'ADB_GENERATION_ERROR',
          { error: error.message, projectId, sceneId },
          'CoordinatorAgent'
        );
      }
    }
    
    return null;
  }
}
```
