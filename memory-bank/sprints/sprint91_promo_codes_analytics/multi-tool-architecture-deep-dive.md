# Multi-Tool Architecture Deep Dive

## Current System Analysis

### How It Works Now (Single Tool)
1. User sends prompt → "Make scene 1 and 2 faster"
2. Brain analyzes intent → Selects ONE tool (editScene for scene 1)
3. Tool executes → Scene 1 is edited
4. User feedback → "Speeding up Scene 1. Request Scene 2 separately."
5. User must send another prompt for Scene 2

**Problems:**
- Requires multiple prompts for batch operations
- No context sharing between operations
- Poor UX for common tasks
- Brain explicitly says "MULTI-STEP HANDLING: pick the FIRST/MOST IMPORTANT one"

### What We Need (Multi-Tool)
1. User sends prompt → "Make all 4 scenes faster"
2. Brain creates execution plan → 4 edit operations
3. Progressive execution with live UI updates
4. All scenes updated in one flow
5. User sees progress and results in real-time

## New Architecture Design

### 1. Enhanced Brain Decision Format

```typescript
// Current format (single tool)
interface CurrentBrainDecision {
  toolName: string;
  reasoning: string;
  targetSceneId?: string;
  // ... single operation params
}

// NEW format (multi-tool capable)
interface EnhancedBrainDecision {
  executionPlan: {
    type: 'single' | 'multi' | 'sequential' | 'parallel';
    totalSteps: number;
    estimatedTime: number; // seconds
    
    steps: Array<{
      id: string; // unique step ID
      toolName: string;
      displayName: string; // User-friendly name like "Making Scene 1 faster"
      params: {
        targetSceneId?: string;
        prompt?: string;
        duration?: number;
        // ... tool-specific params
      };
      dependencies: string[]; // IDs of steps that must complete first
      canParallelize: boolean;
      contextKeys: string[]; // Keys from context manager this step needs
    }>;
    
    context: {
      needsWebSearch: boolean;
      searchQueries?: string[];
      sharedStyle?: any; // Style to apply across all scenes
      referenceSceneId?: string; // For "make others like scene 3"
    };
  };
  
  reasoning: string;
  userFeedback: string;
}
```

### 2. Context Management System

```typescript
// Global context manager for sharing between tools
class ContextManager {
  private contexts: Map<string, any> = new Map();
  
  // Store context from any source
  async set(key: string, value: any): Promise<void> {
    this.contexts.set(key, value);
    
    // Persist important contexts
    if (this.isPersistentContext(key)) {
      await this.persistToDatabase(key, value);
    }
  }
  
  // Retrieve context by key
  get(key: string): any {
    return this.contexts.get(key);
  }
  
  // Search contexts by pattern
  search(pattern: string): Map<string, any> {
    const results = new Map();
    for (const [key, value] of this.contexts) {
      if (key.includes(pattern)) {
        results.set(key, value);
      }
    }
    return results;
  }
  
  // Context types
  setWebContext(url: string, data: WebAnalysis): void {
    this.set(`web:${url}`, data);
  }
  
  setStyleContext(sceneId: string, style: SceneStyle): void {
    this.set(`style:${sceneId}`, style);
  }
  
  setSearchContext(query: string, results: SearchResults): void {
    this.set(`search:${query}`, results);
  }
  
  // Get all contexts for a tool execution
  getToolContext(contextKeys: string[]): Record<string, any> {
    const context: Record<string, any> = {};
    for (const key of contextKeys) {
      context[key] = this.get(key);
    }
    return context;
  }
}
```

### 3. New ContextGatherer Tool

```typescript
interface ContextGathererTool {
  name: 'contextGatherer';
  
  async execute(params: {
    queries: string[];
    sources: ('web' | 'examples' | 'trends')[];
    projectId: string;
  }): Promise<GatheredContext> {
    const results: GatheredContext = {
      webResults: [],
      examples: [],
      trends: [],
      summary: '',
      relevantStyles: [],
      colorPalettes: [],
      animations: []
    };
    
    // Parallel web searches
    if (params.sources.includes('web')) {
      const webPromises = params.queries.map(query => 
        this.searchWeb(query)
      );
      results.webResults = await Promise.all(webPromises);
    }
    
    // Search for examples
    if (params.sources.includes('examples')) {
      results.examples = await this.findExamples(params.queries);
    }
    
    // Get trend analysis
    if (params.sources.includes('trends')) {
      results.trends = await this.analyzeTrends(params.queries);
    }
    
    // Extract actionable context
    results.summary = await this.summarizeFindings(results);
    results.relevantStyles = await this.extractStyles(results);
    results.colorPalettes = await this.extractColors(results);
    results.animations = await this.extractAnimationPatterns(results);
    
    // Store in context manager
    const contextManager = new ContextManager();
    contextManager.set('gathered:latest', results);
    contextManager.set('gathered:styles', results.relevantStyles);
    contextManager.set('gathered:colors', results.colorPalettes);
    
    return results;
  }
  
  private async searchWeb(query: string): Promise<WebSearchResult> {
    // Use search API or scraping
    const searchResults = await webSearchAPI.search(query);
    
    // Analyze top results
    const analyzed = await Promise.all(
      searchResults.slice(0, 3).map(result => 
        this.analyzeWebPage(result.url)
      )
    );
    
    return {
      query,
      results: analyzed,
      extractedPatterns: this.extractPatterns(analyzed)
    };
  }
}
```

### 4. Execution Engine Updates

```typescript
class MultiToolExecutor {
  private contextManager: ContextManager;
  private activeExecutions: Map<string, ExecutionState> = new Map();
  
  async executeMultiPlan(
    plan: ExecutionPlan,
    onProgress: (update: ProgressUpdate) => void
  ): AsyncGenerator<ExecutionResult> {
    // Initialize execution state
    const executionId = crypto.randomUUID();
    const state: ExecutionState = {
      id: executionId,
      plan,
      completed: [],
      inProgress: [],
      pending: plan.steps.map(s => s.id),
      results: new Map(),
      startTime: Date.now()
    };
    
    this.activeExecutions.set(executionId, state);
    
    // Send initial UI update
    onProgress({
      type: 'execution-started',
      executionId,
      steps: plan.steps.map(s => ({
        id: s.id,
        name: s.displayName,
        status: 'pending'
      }))
    });
    
    // Execute steps
    while (state.pending.length > 0 || state.inProgress.length > 0) {
      // Find steps ready to execute
      const ready = this.getReadySteps(state);
      
      // Start parallel executions (max 3)
      const toStart = ready.slice(0, Math.min(3 - state.inProgress.length, ready.length));
      
      for (const stepId of toStart) {
        const step = plan.steps.find(s => s.id === stepId)!;
        
        // Update state
        state.pending = state.pending.filter(id => id !== stepId);
        state.inProgress.push(stepId);
        
        // Send UI update
        onProgress({
          type: 'step-started',
          executionId,
          stepId,
          name: step.displayName
        });
        
        // Start execution (don't await)
        this.executeStep(step, state).then(result => {
          // Update state
          state.inProgress = state.inProgress.filter(id => id !== stepId);
          state.completed.push(stepId);
          state.results.set(stepId, result);
          
          // Send UI update
          onProgress({
            type: 'step-completed',
            executionId,
            stepId,
            result: result.preview // Small preview for UI
          });
          
          // Yield full result
          return result;
        });
      }
      
      // Wait for at least one to complete
      if (state.inProgress.length > 0) {
        await this.waitForAnyCompletion(state);
      }
    }
    
    // Final update
    onProgress({
      type: 'execution-completed',
      executionId,
      totalTime: Date.now() - state.startTime
    });
  }
  
  private async executeStep(
    step: ExecutionStep,
    state: ExecutionState
  ): Promise<StepResult> {
    // Get context for this step
    const context = this.contextManager.getToolContext(step.contextKeys);
    
    // Execute the tool
    const tool = this.getToolByName(step.toolName);
    const result = await tool.execute({
      ...step.params,
      context // Pass gathered context
    });
    
    // Store any new context generated
    if (result.generatedContext) {
      for (const [key, value] of Object.entries(result.generatedContext)) {
        this.contextManager.set(key, value);
      }
    }
    
    return result;
  }
  
  private getReadySteps(state: ExecutionState): string[] {
    return state.pending.filter(stepId => {
      const step = state.plan.steps.find(s => s.id === stepId)!;
      // Check if all dependencies are completed
      return step.dependencies.every(dep => state.completed.includes(dep));
    });
  }
}
```

### 5. Progressive UI Component

```tsx
// Main progress component
export function MultiStepProgress({ 
  executionId 
}: { 
  executionId: string 
}) {
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  
  // Subscribe to SSE updates
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/execution-progress/${executionId}`
    );
    
    eventSource.addEventListener('step-update', (e) => {
      const update = JSON.parse(e.data);
      updateStepStatus(update);
    });
    
    return () => eventSource.close();
  }, [executionId]);
  
  return (
    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Processing your request...
      </div>
      
      {steps.map((step, index) => (
        <StepProgressItem
          key={step.id}
          step={step}
          index={index}
          isActive={step.id === currentStep}
          onEdit={(params) => editStep(step.id, params)}
          onCancel={() => cancelStep(step.id)}
        />
      ))}
    </div>
  );
}

// Individual step component
function StepProgressItem({ 
  step, 
  index, 
  isActive,
  onEdit,
  onCancel
}: StepProgressItemProps) {
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
  
  const getBgColor = () => {
    switch (step.status) {
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        getBgColor(),
        isActive && "shadow-sm"
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {step.name}
          </span>
          {step.status === 'in-progress' && (
            <span className="text-xs text-blue-600 animate-pulse">
              Generating...
            </span>
          )}
        </div>
        
        {step.detail && (
          <div className="text-xs text-gray-500 mt-0.5">
            {step.detail}
          </div>
        )}
        
        {step.progress && step.status === 'in-progress' && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all"
              style={{ width: `${step.progress}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Actions */}
      {step.canEdit && step.status === 'pending' && (
        <button
          onClick={() => onEdit(step)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Edit
        </button>
      )}
      
      {step.canCancel && step.status === 'pending' && (
        <button
          onClick={() => onCancel()}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          Skip
        </button>
      )}
    </div>
  );
}
```

### 6. SSE Updates for Multi-Tool

```typescript
// Server-side SSE handler
export async function* streamMultiToolExecution(
  executionPlan: ExecutionPlan,
  projectId: string
): AsyncGenerator<SSEMessage> {
  const executor = new MultiToolExecutor();
  
  // Send initial plan
  yield {
    type: 'execution-plan',
    data: {
      steps: executionPlan.steps.map(s => ({
        id: s.id,
        name: s.displayName,
        status: 'pending'
      })),
      totalSteps: executionPlan.steps.length
    }
  };
  
  // Execute and stream updates
  for await (const result of executor.executeMultiPlan(executionPlan)) {
    yield {
      type: 'step-update',
      data: {
        stepId: result.stepId,
        status: result.status,
        preview: result.preview,
        error: result.error
      }
    };
    
    // If scene was updated, send scene update
    if (result.sceneUpdate) {
      yield {
        type: 'scene-update',
        data: result.sceneUpdate
      };
    }
  }
  
  // Send completion
  yield {
    type: 'execution-complete',
    data: {
      success: true,
      totalTime: Date.now() - startTime
    }
  };
}
```

## Implementation Examples

### Example 1: "Make all scenes faster"

**Brain Decision:**
```json
{
  "executionPlan": {
    "type": "parallel",
    "totalSteps": 4,
    "estimatedTime": 20,
    "steps": [
      {
        "id": "step-1",
        "toolName": "editScene",
        "displayName": "Making Scene 1 faster paced",
        "params": {
          "targetSceneId": "scene-1",
          "prompt": "Make animations faster and more energetic"
        },
        "dependencies": [],
        "canParallelize": true
      },
      {
        "id": "step-2",
        "toolName": "editScene",
        "displayName": "Making Scene 2 faster paced",
        "params": {
          "targetSceneId": "scene-2",
          "prompt": "Make animations faster and more energetic"
        },
        "dependencies": [],
        "canParallelize": true
      }
      // ... scenes 3 and 4
    ]
  }
}
```

**UI Display:**
```
Processing your request...
✓ Making Scene 1 faster paced
⟳ Making Scene 2 faster paced ... Generating...
○ Making Scene 3 faster paced
○ Making Scene 4 faster paced
```

### Example 2: "Make scenes 1, 2, and 4 like scene 3"

**Brain Decision:**
```json
{
  "executionPlan": {
    "type": "sequential",
    "totalSteps": 4,
    "estimatedTime": 30,
    "steps": [
      {
        "id": "analyze",
        "toolName": "contextGatherer",
        "displayName": "Analyzing Scene 3's style",
        "params": {
          "targetSceneId": "scene-3",
          "extractStyle": true
        },
        "dependencies": [],
        "canParallelize": false
      },
      {
        "id": "edit-1",
        "toolName": "editScene",
        "displayName": "Applying Scene 3's style to Scene 1",
        "params": {
          "targetSceneId": "scene-1",
          "prompt": "Match the style, energy, and animations"
        },
        "dependencies": ["analyze"],
        "canParallelize": true,
        "contextKeys": ["style:scene-3"]
      }
      // ... scenes 2 and 4
    ]
  }
}
```

### Example 3: "Create Apple-style video about my product"

**Brain Decision:**
```json
{
  "executionPlan": {
    "type": "sequential",
    "totalSteps": 5,
    "estimatedTime": 45,
    "steps": [
      {
        "id": "research",
        "toolName": "contextGatherer",
        "displayName": "Researching Apple design trends",
        "params": {
          "queries": [
            "Apple design language 2024",
            "minimalist product showcase",
            "Apple animation style"
          ],
          "sources": ["web", "examples", "trends"]
        },
        "dependencies": [],
        "canParallelize": false
      },
      {
        "id": "scene-1",
        "toolName": "addScene",
        "displayName": "Creating minimalist intro",
        "params": {
          "prompt": "Minimalist Apple-style intro with smooth fade-in"
        },
        "dependencies": ["research"],
        "contextKeys": ["gathered:styles", "gathered:colors"]
      },
      {
        "id": "scene-2",
        "toolName": "addScene",
        "displayName": "Creating product reveal",
        "params": {
          "prompt": "Elegant product reveal with subtle animations"
        },
        "dependencies": ["scene-1"],
        "contextKeys": ["gathered:styles", "gathered:animations"]
      }
      // ... more scenes
    ]
  }
}
```

## Critical Implementation Requirements

### 1. Brain Prompt Updates

Update `BRAIN_ORCHESTRATOR` prompt to:
```typescript
const ENHANCED_BRAIN_ORCHESTRATOR = {
  content: `...existing content...
  
  MULTI-TOOL EXECUTION:
  You can now plan multiple tool executions for a single request.
  
  When user asks for operations on multiple items:
  - "all scenes" → Create parallel edit operations for each
  - "scenes 1, 2, and 3" → Create specific operations
  - "make them like X" → Analyze X first, then apply
  
  When user asks for complex creation:
  - Research/gather context first if needed
  - Then create scenes using that context
  - Build scenes sequentially if they depend on each other
  
  RESPONSE FORMAT FOR MULTI-TOOL:
  {
    "executionPlan": {
      "type": "single" | "parallel" | "sequential",
      "totalSteps": number,
      "estimatedTime": number,
      "steps": [...],
      "context": {...}
    }
  }
  `
};
```

### 2. Database Schema for Context

```sql
-- Context storage table
CREATE TABLE "bazaar-vid_execution_context" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES "bazaar-vid_project"(id),
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(project_id, key)
);

-- Execution history
CREATE TABLE "bazaar-vid_multi_executions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES "bazaar-vid_project"(id),
  user_id VARCHAR(255) REFERENCES "bazaar-vid_user"(id),
  plan JSONB NOT NULL,
  status VARCHAR(50),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  results JSONB
);
```

### 3. State Management Updates

```typescript
// Add to videoState.ts
interface VideoState {
  // ... existing state
  
  activeExecutions: Map<string, {
    id: string;
    steps: ExecutionStep[];
    currentStep: number;
    results: Map<string, any>;
  }>;
  
  startMultiExecution: (plan: ExecutionPlan) => void;
  updateExecutionStep: (executionId: string, stepId: string, status: StepStatus) => void;
  completeExecution: (executionId: string) => void;
}
```

## Rollout Strategy

### Phase 1: Backend (Week 1)
1. Update Brain prompt for multi-tool decisions
2. Implement ContextManager
3. Create MultiToolExecutor
4. Add ContextGatherer tool

### Phase 2: UI Components (Week 2)
1. Build MultiStepProgress component
2. Update ChatPanelG to handle multi-step
3. Modify SSE handlers for progressive updates
4. Add step editing/cancellation

### Phase 3: Testing (Week 3)
1. Test parallel execution limits
2. Verify context sharing
3. Test error recovery
4. Performance benchmarking

### Phase 4: Polish (Week 4)
1. Add time estimates
2. Implement partial retries
3. Create preset workflows
4. User preference learning

## Performance Considerations

- **Parallel Limit**: Max 3 concurrent tool executions
- **Context Size**: 100KB max per context entry
- **Cache Duration**: 1 hour for web search results
- **SSE Updates**: Throttle to every 500ms
- **Memory**: Clear completed execution data after 10 minutes

## Success Metrics

- **Efficiency**: 70% reduction in user prompts for multi-scene tasks
- **Speed**: 50% faster completion for batch operations
- **Understanding**: 90% of users understand progress UI
- **Reliability**: <1% failure rate for multi-tool executions
- **Context Quality**: 85% accuracy in style matching