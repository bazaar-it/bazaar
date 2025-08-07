# Multi-Tool Implementation Guide

## Step-by-Step Implementation Plan

### Step 1: Update Brain Types (Day 1)

**File**: `/src/lib/types/ai/brain.types.ts`

```typescript
// Add to existing types
export interface ExecutionStep {
  id: string;
  toolName: string;
  displayName: string; // User-friendly description
  params: Record<string, any>;
  dependencies: string[];
  canParallelize: boolean;
  contextKeys: string[];
  estimatedDuration: number; // seconds
}

export interface ExecutionPlan {
  type: 'single' | 'parallel' | 'sequential' | 'mixed';
  totalSteps: number;
  estimatedTime: number;
  steps: ExecutionStep[];
  context: {
    needsWebSearch: boolean;
    searchQueries?: string[];
    sharedStyle?: any;
    referenceSceneId?: string;
  };
}

export interface MultiToolDecision {
  executionPlan: ExecutionPlan;
  reasoning: string;
  userFeedback: string;
}

// Update existing ToolSelectionResult
export interface ToolSelectionResult {
  success: boolean;
  error?: string;
  
  // Single tool (backward compatible)
  toolName?: string;
  targetSceneId?: string;
  
  // Multi-tool (new)
  executionPlan?: ExecutionPlan;
  
  reasoning?: string;
  userFeedback?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}
```

### Step 2: Create Context Manager (Day 1)

**New File**: `/src/server/services/context/contextManager.ts`

```typescript
import { redis } from '~/server/redis'; // If using Redis
import { db } from '~/server/db';

export class ContextManager {
  private static instance: ContextManager;
  private memoryCache: Map<string, any> = new Map();
  private projectId: string;
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  static getInstance(projectId: string): ContextManager {
    if (!this.instance) {
      this.instance = new ContextManager(projectId);
    }
    return this.instance;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const fullKey = `${this.projectId}:${key}`;
    
    // Memory cache
    this.memoryCache.set(fullKey, value);
    
    // Redis cache (if available)
    if (redis) {
      await redis.set(fullKey, JSON.stringify(value), ttl ? { EX: ttl } : {});
    }
    
    // Persist important contexts to DB
    if (this.shouldPersist(key)) {
      await db.insert(executionContext).values({
        projectId: this.projectId,
        key,
        value,
        expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : null
      }).onConflictDoUpdate({
        target: [executionContext.projectId, executionContext.key],
        set: { value, updatedAt: new Date() }
      });
    }
  }
  
  async get(key: string): Promise<any> {
    const fullKey = `${this.projectId}:${key}`;
    
    // Check memory first
    if (this.memoryCache.has(fullKey)) {
      return this.memoryCache.get(fullKey);
    }
    
    // Check Redis
    if (redis) {
      const cached = await redis.get(fullKey);
      if (cached) {
        const value = JSON.parse(cached);
        this.memoryCache.set(fullKey, value);
        return value;
      }
    }
    
    // Check database
    const dbResult = await db.query.executionContext.findFirst({
      where: and(
        eq(executionContext.projectId, this.projectId),
        eq(executionContext.key, key)
      )
    });
    
    if (dbResult) {
      this.memoryCache.set(fullKey, dbResult.value);
      return dbResult.value;
    }
    
    return null;
  }
  
  // Context-specific methods
  async setStyleContext(sceneId: string, style: any): Promise<void> {
    await this.set(`style:${sceneId}`, style, 3600); // 1 hour TTL
  }
  
  async setWebContext(url: string, data: any): Promise<void> {
    await this.set(`web:${url}`, data, 7200); // 2 hour TTL
  }
  
  async setSearchResults(query: string, results: any): Promise<void> {
    await this.set(`search:${query}`, results, 3600);
  }
  
  async getToolContext(contextKeys: string[]): Promise<Record<string, any>> {
    const context: Record<string, any> = {};
    for (const key of contextKeys) {
      context[key] = await this.get(key);
    }
    return context;
  }
  
  private shouldPersist(key: string): boolean {
    // Persist style, web, and search contexts
    return key.startsWith('style:') || 
           key.startsWith('web:') || 
           key.startsWith('search:');
  }
}
```

### Step 3: Update Brain Orchestrator (Day 2)

**File**: `/src/brain/orchestrator_functions/intentAnalyzer.ts`

```typescript
// Update processBrainDecision method
private processBrainDecision(parsed: any, input: OrchestrationInput): ToolSelectionResult {
  // Check for new multi-tool format
  if (parsed.executionPlan) {
    console.log('🎯 [INTENT] Multi-tool execution plan detected');
    return {
      success: true,
      executionPlan: parsed.executionPlan,
      reasoning: parsed.reasoning || "Multi-tool execution planned",
      userFeedback: parsed.userFeedback
    };
  }
  
  // Backward compatibility: Check for old workflow format
  if (parsed.workflow && Array.isArray(parsed.workflow)) {
    // Convert old workflow to new executionPlan format
    const executionPlan: ExecutionPlan = {
      type: 'sequential',
      totalSteps: parsed.workflow.length,
      estimatedTime: parsed.workflow.length * 10, // rough estimate
      steps: parsed.workflow.map((step: any, index: number) => ({
        id: `step-${index}`,
        toolName: step.tool,
        displayName: step.description || `Step ${index + 1}`,
        params: step.params || {},
        dependencies: index > 0 ? [`step-${index - 1}`] : [],
        canParallelize: false,
        contextKeys: [],
        estimatedDuration: 10
      }))
    };
    
    return {
      success: true,
      executionPlan,
      reasoning: parsed.reasoning || "Multi-step workflow planned"
    };
  }
  
  // ... existing single tool handling
}
```

### Step 4: Create Multi-Tool Executor (Day 2)

**New File**: `/src/server/services/execution/multiToolExecutor.ts`

```typescript
import { ContextManager } from '../context/contextManager';
import { addTool } from '~/tools/add/add';
import { editTool } from '~/tools/edit/edit';
// ... import other tools

export class MultiToolExecutor {
  private contextManager: ContextManager;
  private tools: Map<string, any>;
  
  constructor(projectId: string) {
    this.contextManager = new ContextManager(projectId);
    this.tools = new Map([
      ['addScene', addTool],
      ['editScene', editTool],
      ['deleteScene', deleteTool],
      ['contextGatherer', contextGathererTool],
      // ... register all tools
    ]);
  }
  
  async *executeMultiPlan(
    plan: ExecutionPlan,
    onProgress: (update: ProgressUpdate) => void
  ): AsyncGenerator<ExecutionResult> {
    const state = {
      completed: [] as string[],
      inProgress: [] as string[],
      pending: plan.steps.map(s => s.id),
      results: new Map<string, any>()
    };
    
    // Send initial plan to UI
    onProgress({
      type: 'plan-created',
      steps: plan.steps.map(s => ({
        id: s.id,
        name: s.displayName,
        status: 'pending'
      }))
    });
    
    // Main execution loop
    while (state.pending.length > 0 || state.inProgress.length > 0) {
      // Find steps ready to execute
      const ready = this.getReadySteps(plan, state);
      
      // Limit parallel executions
      const maxParallel = plan.type === 'parallel' ? 3 : 1;
      const toStart = ready.slice(0, Math.max(0, maxParallel - state.inProgress.length));
      
      // Start new executions
      const promises = toStart.map(async (stepId) => {
        const step = plan.steps.find(s => s.id === stepId)!;
        
        // Update state
        state.pending = state.pending.filter(id => id !== stepId);
        state.inProgress.push(stepId);
        
        // Notify UI
        onProgress({
          type: 'step-started',
          stepId,
          name: step.displayName
        });
        
        try {
          // Get context for this step
          const context = await this.contextManager.getToolContext(step.contextKeys);
          
          // Execute tool
          const tool = this.tools.get(step.toolName);
          if (!tool) throw new Error(`Unknown tool: ${step.toolName}`);
          
          const result = await tool.execute({
            ...step.params,
            context,
            projectId: this.contextManager.projectId
          });
          
          // Store generated context
          if (result.generatedContext) {
            for (const [key, value] of Object.entries(result.generatedContext)) {
              await this.contextManager.set(key, value);
            }
          }
          
          // Update state
          state.inProgress = state.inProgress.filter(id => id !== stepId);
          state.completed.push(stepId);
          state.results.set(stepId, result);
          
          // Notify UI
          onProgress({
            type: 'step-completed',
            stepId,
            result: result.preview
          });
          
          return { stepId, ...result };
          
        } catch (error) {
          // Handle errors
          state.inProgress = state.inProgress.filter(id => id !== stepId);
          
          onProgress({
            type: 'step-error',
            stepId,
            error: error.message
          });
          
          throw error;
        }
      });
      
      // Wait for at least one to complete
      if (promises.length > 0) {
        const result = await Promise.race(promises);
        yield result;
      } else if (state.inProgress.length > 0) {
        // Wait for in-progress to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // All done
    onProgress({
      type: 'execution-completed',
      results: Array.from(state.results.values())
    });
  }
  
  private getReadySteps(plan: ExecutionPlan, state: any): string[] {
    return state.pending.filter((stepId: string) => {
      const step = plan.steps.find(s => s.id === stepId)!;
      // Check if all dependencies are completed
      return step.dependencies.every(dep => state.completed.includes(dep));
    });
  }
}
```

### Step 5: Create ContextGatherer Tool (Day 3)

**New File**: `/src/tools/gather/contextGatherer.ts`

```typescript
import { WebFetch } from '~/lib/utils/webFetch';
import { AIClientService } from '~/server/services/ai/aiClient.service';

export const contextGathererTool = {
  name: 'contextGatherer',
  
  async execute(params: {
    queries: string[];
    sources: ('web' | 'examples' | 'trends')[];
    targetSceneId?: string;
    extractStyle?: boolean;
  }): Promise<{
    success: boolean;
    generatedContext: Record<string, any>;
    summary: string;
  }> {
    const context: Record<string, any> = {};
    
    // Extract style from existing scene
    if (params.targetSceneId && params.extractStyle) {
      const sceneStyle = await this.extractSceneStyle(params.targetSceneId);
      context[`style:${params.targetSceneId}`] = sceneStyle;
    }
    
    // Web search for each query
    if (params.sources.includes('web')) {
      for (const query of params.queries) {
        const results = await this.searchWeb(query);
        context[`search:${query}`] = results;
        
        // Extract patterns from results
        const patterns = await this.extractPatterns(results);
        context[`patterns:${query}`] = patterns;
      }
    }
    
    // Find examples
    if (params.sources.includes('examples')) {
      const examples = await this.findExamples(params.queries);
      context['examples'] = examples;
    }
    
    // Analyze trends
    if (params.sources.includes('trends')) {
      const trends = await this.analyzeTrends(params.queries);
      context['trends'] = trends;
    }
    
    // Generate summary
    const summary = await this.generateSummary(context);
    
    return {
      success: true,
      generatedContext: context,
      summary
    };
  },
  
  async extractSceneStyle(sceneId: string): Promise<any> {
    // Get scene from database
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId)
    });
    
    if (!scene) return null;
    
    // Analyze the scene code for style patterns
    const styleAnalysis = await AIClientService.generateResponse(
      getModel('analyzer'),
      [{
        role: 'system',
        content: 'Extract style, colors, animations, and visual patterns from this React component code.'
      }, {
        role: 'user',
        content: scene.tsxCode
      }],
      undefined,
      { responseFormat: { type: 'json_object' } }
    );
    
    return JSON.parse(styleAnalysis.content);
  },
  
  async searchWeb(query: string): Promise<any> {
    // Use search API or web scraping
    const searchResults = await WebFetch.search(query, { limit: 3 });
    
    // Analyze each result
    const analyzed = await Promise.all(
      searchResults.map(async (result) => {
        const pageAnalysis = await WebFetch.analyzePage(result.url);
        return {
          url: result.url,
          title: result.title,
          analysis: pageAnalysis,
          relevantContent: await this.extractRelevantContent(pageAnalysis, query)
        };
      })
    );
    
    return analyzed;
  },
  
  async extractPatterns(searchResults: any[]): Promise<any> {
    // Use AI to extract common patterns
    const prompt = `Extract common design patterns, color schemes, and animation styles from these search results:
    ${JSON.stringify(searchResults, null, 2)}`;
    
    const analysis = await AIClientService.generateResponse(
      getModel('analyzer'),
      [{
        role: 'system',
        content: 'You are a design pattern analyzer. Extract actionable patterns for video creation.'
      }, {
        role: 'user',
        content: prompt
      }]
    );
    
    return JSON.parse(analysis.content);
  }
};
```

### Step 6: Update UI Components (Day 3-4)

**File**: `/src/components/chat/MultiStepProgress.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Check, Clock, Loader2, X, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/cn';

interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  detail?: string;
  progress?: number;
  canEdit?: boolean;
  canCancel?: boolean;
}

export function MultiStepProgress({ 
  executionId,
  onStepEdit,
  onStepCancel
}: {
  executionId: string;
  onStepEdit?: (stepId: string, params: any) => void;
  onStepCancel?: (stepId: string) => void;
}) {
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  
  // Subscribe to SSE updates
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/execution-progress?id=${executionId}`
    );
    
    eventSource.addEventListener('plan-created', (e) => {
      const data = JSON.parse(e.data);
      setSteps(data.steps);
    });
    
    eventSource.addEventListener('step-started', (e) => {
      const data = JSON.parse(e.data);
      setSteps(prev => prev.map(s => 
        s.id === data.stepId 
          ? { ...s, status: 'in-progress', detail: 'Generating...' }
          : s
      ));
    });
    
    eventSource.addEventListener('step-completed', (e) => {
      const data = JSON.parse(e.data);
      setSteps(prev => prev.map(s => 
        s.id === data.stepId 
          ? { ...s, status: 'completed', detail: 'Done' }
          : s
      ));
    });
    
    eventSource.addEventListener('step-error', (e) => {
      const data = JSON.parse(e.data);
      setSteps(prev => prev.map(s => 
        s.id === data.stepId 
          ? { ...s, status: 'error', detail: data.error }
          : s
      ));
    });
    
    return () => eventSource.close();
  }, [executionId]);
  
  if (steps.length === 0) return null;
  
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const isComplete = completedCount === totalCount;
  
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight 
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              !collapsed && "rotate-90"
            )}
          />
          <span className="text-sm font-medium text-gray-700">
            {isComplete 
              ? `Completed ${totalCount} steps`
              : `Processing ${completedCount}/${totalCount} steps...`
            }
          </span>
        </div>
        
        {!isComplete && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-xs text-gray-500">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Steps */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              onEdit={onStepEdit}
              onCancel={onStepCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StepItem({ 
  step, 
  index,
  onEdit,
  onCancel
}: {
  step: ProgressStep;
  index: number;
  onEdit?: (stepId: string, params: any) => void;
  onCancel?: (stepId: string) => void;
}) {
  const getIcon = () => {
    switch (step.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };
  
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
      step.status === 'in-progress' && "bg-blue-50",
      step.status === 'completed' && "bg-green-50",
      step.status === 'error' && "bg-red-50"
    )}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900">
          {step.name}
        </div>
        {step.detail && (
          <div className="text-xs text-gray-500 mt-0.5">
            {step.detail}
          </div>
        )}
      </div>
      
      {step.canEdit && step.status === 'pending' && (
        <button
          onClick={() => onEdit?.(step.id, {})}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
      )}
      
      {step.canCancel && step.status === 'pending' && (
        <button
          onClick={() => onCancel?.(step.id)}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          Skip
        </button>
      )}
    </div>
  );
}
```

### Step 7: Update ChatPanelG Integration (Day 4)

**File**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`

Add multi-step handling:

```typescript
// In ChatPanelG component
const [activeExecution, setActiveExecution] = useState<string | null>(null);

// In the message rendering section
{message.executionId && (
  <MultiStepProgress
    executionId={message.executionId}
    onStepEdit={(stepId, params) => {
      // Handle step editing
      api.execution.editStep.mutate({ 
        executionId: message.executionId,
        stepId,
        params 
      });
    }}
    onStepCancel={(stepId) => {
      // Handle step cancellation
      api.execution.cancelStep.mutate({ 
        executionId: message.executionId,
        stepId 
      });
    }}
  />
)}
```

### Step 8: Update SSE Handler (Day 5)

**File**: `/src/app/api/generate-stream/route.ts`

```typescript
// Add multi-tool execution handling
if (result.executionPlan) {
  const executor = new MultiToolExecutor(projectId);
  
  // Stream execution updates
  for await (const update of executor.executeMultiPlan(
    result.executionPlan,
    (progress) => {
      // Send progress updates via SSE
      encoder.encode(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
    }
  )) {
    // Send scene updates
    if (update.sceneUpdate) {
      encoder.encode(`event: scene-update\ndata: ${JSON.stringify(update.sceneUpdate)}\n\n`);
    }
  }
}
```

## Testing Strategy

### Test Cases

1. **Parallel Execution**
   - "Make all 4 scenes faster"
   - Verify all execute in parallel
   - Check preview updates correctly

2. **Sequential with Dependencies**
   - "Create 3 scenes about product launch"
   - Verify execution order
   - Check context passing

3. **Style Transfer**
   - "Make scenes 1 and 2 like scene 3"
   - Verify style extraction
   - Check style application

4. **Context Gathering**
   - "Create Apple-style video"
   - Verify web search works
   - Check context usage in generation

5. **Error Recovery**
   - Force error in middle step
   - Verify other steps continue
   - Check retry mechanism

6. **Cancellation**
   - Cancel pending steps
   - Verify clean shutdown
   - Check partial results saved

## Deployment Checklist

- [ ] Update database schema for context storage
- [ ] Deploy Redis for context caching (optional)
- [ ] Update Brain prompt in production
- [ ] Feature flag for gradual rollout
- [ ] Monitor parallel execution load
- [ ] Set up error tracking
- [ ] Create user documentation
- [ ] Train support team

## Performance Monitoring

```typescript
// Add metrics tracking
const metrics = {
  executionStarted: Date.now(),
  stepsCompleted: 0,
  parallelExecutions: 0,
  contextCacheHits: 0,
  contextCacheMisses: 0,
  errors: []
};

// Track in executor
onStepComplete(() => {
  metrics.stepsCompleted++;
  analytics.track('multi-tool-step-complete', {
    executionId,
    stepNumber: metrics.stepsCompleted,
    duration: Date.now() - metrics.executionStarted
  });
});
```

## Rollback Plan

If issues arise:
1. Disable multi-tool via feature flag
2. Brain reverts to single tool selection
3. UI hides multi-step progress
4. Existing single-tool flow continues working
5. Debug issues with captured telemetry