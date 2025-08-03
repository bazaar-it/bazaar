# Multi-Context Tool Decision System

## Executive Summary

Transform the Brain orchestrator from single-tool-per-request to multi-tool execution with parallel and sequential processing capabilities. This enables complex operations like "make all scenes faster" or "create a 20-second video with Apple aesthetics" in a single interaction.

## Current System Limitations

### Single Tool Execution
- Brain selects ONE tool per user request
- Multiple related operations require multiple prompts
- No context sharing between operations
- Poor UX for batch operations

### Missing Context Management
- No persistent context between tool executions
- Web search results not accessible to generation tools
- Style references not carried across scenes
- Each tool operates in isolation

## Proposed Architecture

### 1. Multi-Tool Decision Engine

```typescript
interface ToolDecision {
  id: string;
  tool: ToolType;
  params: any;
  dependencies: string[]; // IDs of tools that must complete first
  context: string[];      // Context keys this tool needs
  parallel: boolean;      // Can run in parallel with siblings
}

interface ExecutionPlan {
  decisions: ToolDecision[];
  context: Map<string, any>;
  estimatedDuration: number;
  userFacingSteps: StepDescription[];
}

class BrainOrchestratorV2 {
  async planExecution(prompt: string): Promise<ExecutionPlan> {
    // Analyze prompt for multiple intents
    const intents = await this.extractIntents(prompt);
    
    // Build dependency graph
    const decisions = await this.buildToolGraph(intents);
    
    // Optimize for parallel execution
    const optimized = this.optimizeExecution(decisions);
    
    return {
      decisions: optimized,
      context: new Map(),
      estimatedDuration: this.estimateDuration(optimized),
      userFacingSteps: this.generateStepDescriptions(optimized)
    };
  }
  
  async executeplan(plan: ExecutionPlan): AsyncGenerator<ExecutionUpdate> {
    const queue = new PriorityQueue(plan.decisions);
    const executing = new Map<string, Promise<any>>();
    
    while (queue.hasNext() || executing.size > 0) {
      // Start parallel operations
      while (queue.hasReady() && executing.size < MAX_PARALLEL) {
        const decision = queue.dequeue();
        executing.set(decision.id, this.executeTool(decision, plan.context));
        yield { type: 'started', decision };
      }
      
      // Wait for completions
      const completed = await Promise.race(executing.values());
      yield { type: 'completed', result: completed };
      
      // Update context and dependencies
      plan.context.set(completed.contextKey, completed.data);
      queue.markCompleted(completed.id);
    }
  }
}
```

### 2. Context Management System

```typescript
interface ContextManager {
  // Persistent context across tool executions
  global: {
    style: StyleContext;        // Visual style preferences
    tone: ToneContext;         // Writing tone
    brand: BrandContext;       // Brand guidelines
    research: ResearchContext; // Web search results
  };
  
  // Scene-specific context
  scenes: Map<string, SceneContext>;
  
  // Tool can read and write context
  async addContext(key: string, data: any): Promise<void>;
  async getContext(key: string): Promise<any>;
  async searchContext(query: string): Promise<any[]>;
}

// New tool type for context gathering
interface ContextGathererTool {
  type: 'context-gatherer';
  
  async execute(params: {
    queries: string[];        // What to search for
    sources: Source[];       // Web, examples, templates
    maxResults: number;
  }): Promise<ResearchContext>;
}
```

### 3. UI Progress System

```typescript
interface ProgressUI {
  steps: ProgressStep[];
  currentStep: number;
  overallProgress: number;
}

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'in-progress' | 'completed' | 'error';
  progress?: number;      // 0-100 for current step
  result?: any;          // Preview of result
  subSteps?: ProgressStep[]; // Nested steps
  canEdit: boolean;      // User can modify this step
  canCancel: boolean;    // User can skip this step
}

// React Component
function MultiStepProgress({ execution }: { execution: ExecutionPlan }) {
  return (
    <div className="space-y-2">
      {execution.userFacingSteps.map((step, i) => (
        <StepItem 
          key={step.id}
          step={step}
          onEdit={(newParams) => modifyStep(step.id, newParams)}
          onCancel={() => cancelStep(step.id)}
        />
      ))}
    </div>
  );
}

function StepItem({ step, onEdit, onCancel }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg",
      step.status === 'in-progress' && "bg-blue-50 border-blue-200",
      step.status === 'completed' && "bg-green-50 border-green-200",
      step.status === 'error' && "bg-red-50 border-red-200"
    )}>
      <StatusIcon status={step.status} />
      
      <div className="flex-1">
        <div className="font-medium">{step.title}</div>
        <div className="text-sm text-gray-600">{step.description}</div>
        {step.progress && (
          <Progress value={step.progress} className="mt-1" />
        )}
      </div>
      
      {step.canEdit && (
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      )}
      
      {step.canCancel && step.status === 'waiting' && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Skip
        </Button>
      )}
    </div>
  );
}
```

## Implementation Examples

### Example 1: "Make all scenes faster paced"

```javascript
// Brain creates execution plan:
{
  decisions: [
    { 
      id: '1', 
      tool: 'edit', 
      params: { sceneId: 'scene-1', instruction: 'faster paced' },
      parallel: true 
    },
    { 
      id: '2', 
      tool: 'edit', 
      params: { sceneId: 'scene-2', instruction: 'faster paced' },
      parallel: true 
    },
    { 
      id: '3', 
      tool: 'edit', 
      params: { sceneId: 'scene-3', instruction: 'faster paced' },
      parallel: true 
    }
  ],
  userFacingSteps: [
    { title: "Editing Scene 1", description: "Making animations faster" },
    { title: "Editing Scene 2", description: "Increasing tempo" },
    { title: "Editing Scene 3", description: "Speeding up transitions" }
  ]
}
```

### Example 2: "Create Apple-style video with latest trends"

```javascript
{
  decisions: [
    { 
      id: 'research', 
      tool: 'context-gatherer',
      params: { 
        queries: ['Apple design 2024', 'motion design trends', 'minimalist animation'],
        sources: ['web', 'examples'] 
      },
      parallel: false 
    },
    { 
      id: 'scene1', 
      tool: 'add',
      params: { prompt: 'Opening scene...', contextKeys: ['research.apple', 'research.trends'] },
      dependencies: ['research'],
      parallel: true 
    },
    { 
      id: 'scene2', 
      tool: 'add',
      params: { prompt: 'Product showcase...', contextKeys: ['research.apple'] },
      dependencies: ['research'],
      parallel: true 
    }
  ],
  userFacingSteps: [
    { title: "Researching Design Trends", description: "Gathering Apple aesthetics and current trends" },
    { title: "Creating Opening Scene", description: "Minimalist intro with brand colors" },
    { title: "Creating Product Scene", description: "Clean product showcase" }
  ]
}
```

## Implementation Phases

### Phase 1: Backend Multi-Tool Support (Week 1)
- Modify Brain to return multiple tool decisions
- Implement execution queue with dependency resolution
- Add parallel execution support
- Create context manager

### Phase 2: Context Gathering Tool (Week 2)
- Implement web search integration
- Create context storage system
- Add context access to existing tools
- Build style/tone extraction

### Phase 3: UI Progress System (Week 3)
- Create progress component
- Implement SSE updates for multi-step
- Add step editing capabilities
- Build cancellation system

### Phase 4: Advanced Features (Week 4)
- Add step reordering
- Implement partial retries
- Create templates for common multi-step operations
- Add time estimates

## Technical Considerations

### Performance
- Parallel execution max: 3 operations
- Context size limits: 10KB per key
- Web search caching: 1 hour
- Progress updates: Every 500ms

### Error Handling
- Failure of one step doesn't stop others (unless dependent)
- Automatic retry with backoff
- Graceful degradation if context unavailable
- User notification for critical failures

### State Management
```typescript
// Zustand store for multi-step execution
interface MultiStepState {
  executions: Map<string, ExecutionPlan>;
  currentExecution: string | null;
  progress: Map<string, ProgressUpdate>;
  
  startExecution: (plan: ExecutionPlan) => void;
  updateProgress: (executionId: string, update: ProgressUpdate) => void;
  modifyStep: (executionId: string, stepId: string, params: any) => void;
  cancelStep: (executionId: string, stepId: string) => void;
}
```

## Migration Strategy

1. **Keep existing single-tool flow** as fallback
2. **Enable multi-tool for specific patterns** first:
   - Batch edits (all scenes)
   - Template-based creation
   - Style transfers
3. **Gradual rollout** with feature flag
4. **Monitor performance** and adjust parallelization
5. **Gather user feedback** on progress UI

## Success Metrics

- **Efficiency**: 60% reduction in prompts for multi-scene operations
- **Speed**: 40% faster completion for parallel operations  
- **Satisfaction**: Improved user understanding of system actions
- **Capability**: Enable previously impossible complex operations
- **Context Quality**: 80% improvement in style consistency

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Parallel operations overwhelming system | High | Rate limiting, queue management |
| Context conflicts between tools | Medium | Context versioning, conflict resolution |
| UI complexity confusing users | Medium | Progressive disclosure, good defaults |
| Increased API costs | Low | Caching, smart batching |
| Execution plan too rigid | Low | Allow dynamic replanning |

## Next Steps

1. Review and approve architecture
2. Create detailed technical specifications
3. Set up development branch
4. Implement Phase 1 (Backend)
5. Test with simple multi-edit scenarios
6. Iterate based on results