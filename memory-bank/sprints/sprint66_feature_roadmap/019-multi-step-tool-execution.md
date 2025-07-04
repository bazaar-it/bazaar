# Feature 019: Multi-Step Tool Execution

**Status**: Not Started  
**Priority**: Medium  
**Complexity**: High (4-5 days)  
**Sprint**: 66 - Feature Roadmap

## Overview

Enable the Brain Orchestrator to execute multiple operations from a single natural language command, understanding concepts like "all", "every", filtering criteria, and batch operations. This dramatically improves user efficiency by eliminating repetitive manual tasks.

## Problem Statement

**Current Limitations**:
- Brain executes only one tool per request
- No understanding of collective operations ("all scenes")
- Can't filter and operate ("delete all text scenes")
- No batch processing capability
- Users must repeat commands for each scene

**User Pain Points**:
- "Update all backgrounds to black" - system doesn't understand "all"
- "Delete all scenes with text" - can't filter and batch operate
- "Make all animations faster" - can't apply to multiple scenes
- "Change every blue element to red" - no pattern recognition
- "Add fade to all scene transitions" - requires manual repetition

## Requirements

### Functional Requirements

1. **Pattern Recognition**:
   - Understand "all", "every", "each"
   - Recognize filtering patterns ("scenes with X")
   - Support ordinal selection ("every third scene")
   - Handle conditional operations ("scenes longer than X")

2. **Batch Operations**:
   - Plan multi-step execution
   - Execute operations in sequence or parallel
   - Transaction-like behavior (all or nothing)
   - Progress feedback during execution

3. **Smart Filtering**:
   - Filter by content type (text, image, shape)
   - Filter by properties (color, duration, position)
   - Filter by metadata (creation time, name)
   - Complex queries ("scenes with red text or blue background")

4. **Operation Types**:
   - Batch edit (style, timing, content)
   - Batch delete with confirmation
   - Batch reorder/reorganize
   - Batch duplicate with variations

### Non-Functional Requirements
- Execute 10 operations in <5 seconds
- Clear progress indication
- Rollback capability for failures
- Maintain system responsiveness
- Detailed execution logs

## Technical Design

### Brain Orchestrator Enhancement
```typescript
interface BatchOperation {
  filter: SceneFilter;
  operations: ToolOperation[];
  confirmation?: ConfirmationRequirement;
  executionMode: 'sequential' | 'parallel';
}

interface SceneFilter {
  type: 'all' | 'pattern' | 'conditional' | 'ordinal';
  criteria?: {
    contentType?: ('text' | 'image' | 'shape')[];
    hasElement?: string;
    duration?: { min?: number; max?: number };
    color?: string[];
    textContent?: RegExp;
    position?: 'first' | 'last' | 'middle';
    customPredicate?: (scene: Scene) => boolean;
  };
}

interface ToolOperation {
  tool: 'edit' | 'delete' | 'duplicate' | 'reorder';
  params: Record<string, any>;
  scene?: string; // specific scene or resolved from filter
}

class BatchOperationPlanner {
  async plan(input: string): Promise<BatchOperation> {
    // Parse natural language
    const intent = await this.parseIntent(input);
    
    // Build filter from intent
    const filter = this.buildFilter(intent);
    
    // Plan operations
    const operations = this.planOperations(intent);
    
    // Determine if confirmation needed
    const confirmation = this.needsConfirmation(operations);
    
    return { filter, operations, confirmation };
  }
  
  private buildFilter(intent: ParsedIntent): SceneFilter {
    // "all scenes" → { type: 'all' }
    // "scenes with text" → { type: 'conditional', criteria: { contentType: ['text'] } }
    // "every third scene" → { type: 'ordinal', criteria: { customPredicate } }
    // "scenes longer than 3 seconds" → { type: 'conditional', criteria: { duration: { min: 3000 } } }
  }
}
```

### Execution Engine
```typescript
class BatchExecutor {
  async execute(
    batch: BatchOperation,
    scenes: Scene[],
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // Filter scenes
    const targetScenes = this.filterScenes(scenes, batch.filter);
    
    // Confirm if needed
    if (batch.confirmation) {
      const confirmed = await this.requestConfirmation(
        batch.confirmation,
        targetScenes
      );
      if (!confirmed) return { cancelled: true };
    }
    
    // Execute operations
    const results = batch.executionMode === 'parallel'
      ? await this.executeParallel(targetScenes, batch.operations)
      : await this.executeSequential(targetScenes, batch.operations);
    
    return {
      success: results.every(r => r.success),
      results,
      summary: this.generateSummary(results)
    };
  }
  
  private async executeSequential(
    scenes: Scene[],
    operations: ToolOperation[]
  ): Promise<OperationResult[]> {
    const results = [];
    
    for (const scene of scenes) {
      for (const operation of operations) {
        try {
          // Update progress
          await this.updateProgress({
            current: results.length,
            total: scenes.length * operations.length,
            currentScene: scene.name
          });
          
          // Execute operation
          const result = await this.executeTool(operation, scene);
          results.push(result);
          
        } catch (error) {
          // Rollback previous operations
          await this.rollback(results);
          throw error;
        }
      }
    }
    
    return results;
  }
}
```

### Natural Language Parser
```typescript
class NaturalLanguageParser {
  private patterns = {
    all: /\b(all|every|each)\b/i,
    filter: /\b(with|containing|having|that have)\b/i,
    ordinal: /\b(first|last|second|third|every \d+)\b/i,
    conditional: /\b(longer|shorter|before|after|greater|less)\b/i,
    operation: /\b(change|update|delete|remove|make|set|add)\b/i
  };
  
  async parse(input: string): Promise<ParsedIntent> {
    const tokens = this.tokenize(input);
    const intent = {
      scope: this.extractScope(tokens),
      filters: this.extractFilters(tokens),
      operations: this.extractOperations(tokens),
      parameters: this.extractParameters(tokens)
    };
    
    return this.enhanceWithAI(intent, input);
  }
  
  private extractScope(tokens: Token[]): Scope {
    // "all scenes" → { type: 'all', target: 'scenes' }
    // "every text element" → { type: 'all', target: 'elements', elementType: 'text' }
    // "the first three scenes" → { type: 'specific', count: 3, position: 'first' }
  }
}
```

### Progress Feedback System
```typescript
interface ProgressUpdate {
  operationId: string;
  status: 'planning' | 'confirming' | 'executing' | 'complete' | 'failed';
  current: number;
  total: number;
  currentItem?: string;
  message: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

class ProgressReporter {
  async reportProgress(update: ProgressUpdate) {
    // Send via SSE to client
    await this.sse.send({
      type: 'batch-progress',
      data: {
        ...update,
        percentage: (update.current / update.total) * 100,
        elapsed: Date.now() - update.startTime.getTime()
      }
    });
  }
}
```

## Implementation Plan

### Phase 1: Parser Development (Day 1)
1. Natural language pattern recognition
2. Intent extraction system
3. Filter building logic
4. Operation planning
5. Test with common patterns

### Phase 2: Batch Executor (Day 2)
1. Scene filtering engine
2. Sequential execution logic
3. Parallel execution support
4. Rollback mechanism
5. Progress reporting

### Phase 3: Brain Integration (Day 3)
1. Integrate with existing Brain Orchestrator
2. Update prompt system
3. Add confirmation flows
4. Error handling enhancement
5. Execution coordination

### Phase 4: UI Updates (Day 4)
1. Progress visualization
2. Confirmation dialogs
3. Batch operation results
4. Undo/rollback UI
5. Operation history

### Phase 5: Testing & Polish (Day 5)
1. Edge case handling
2. Performance optimization
3. User testing
4. Documentation
5. Example patterns

## UI/UX Considerations

### Confirmation Dialog
```
┌─────────────────────────────────────────────────┐
│ Confirm Batch Operation                         │
├─────────────────────────────────────────────────┤
│ This will affect 7 scenes:                      │
│                                                 │
│ • Scene 1: "Introduction"                       │
│ • Scene 3: "Features Overview"                  │
│ • Scene 4: "Benefits Text"                      │
│ • ... and 4 more                               │
│                                                 │
│ Operations to perform:                          │
│ ✓ Change background color to black              │
│ ✓ Update text color to white                    │
│                                                 │
│ [Cancel] [Preview Changes] [Confirm]            │
└─────────────────────────────────────────────────┘
```

### Progress Indicator
```
┌─────────────────────────────────────────────────┐
│ Executing Batch Operation                       │
├─────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 65%                     │
│                                                 │
│ Currently processing:                           │
│ Scene 5 of 7 - "Product Demo"                   │
│ Operation 2 of 2 - Updating text color          │
│                                                 │
│ Time elapsed: 3.2s                              │
│ Estimated completion: 1.7s                      │
│                                                 │
│ [Pause] [Cancel]                                │
└─────────────────────────────────────────────────┘
```

## Example Commands

### Supported Patterns
```
✓ "Delete all text scenes"
✓ "Change all blue backgrounds to red"
✓ "Make every animation 2x faster"
✓ "Add fade out to all scenes"
✓ "Remove scenes shorter than 2 seconds"
✓ "Update all titles to use Arial font"
✓ "Delete every third scene"
✓ "Make all text larger in scenes with images"
✓ "Add drop shadow to all text elements"
✓ "Change duration of all scenes to 5 seconds"
```

### Complex Examples
```
✓ "In all scenes with product images, make the text bold and increase size by 50%"
✓ "Delete all scenes except the first and last"
✓ "For every scene with animation, reduce speed by half and add ease-out"
✓ "Update all blue or green elements to match our brand purple"
```

## Testing Strategy

### Unit Tests
- Pattern recognition accuracy
- Filter building logic
- Operation planning
- Execution order

### Integration Tests
- End-to-end batch operations
- Rollback scenarios
- Progress reporting
- Concurrent operations

### User Testing
- Natural language understanding
- Confirmation clarity
- Progress feedback
- Result satisfaction

## Success Metrics

### Quantitative
- 80% reduction in repetitive tasks
- 90% natural language understanding accuracy
- <5 seconds for 10-scene batch operation
- 95% successful batch completions

### Qualitative
- Users feel more efficient
- Reduced frustration with repetitive tasks
- Confidence in batch operations
- Clear understanding of what will happen

## Migration & Rollback

### Migration
- Feature flag: `enableBatchOperations`
- Backward compatible with single operations
- Gradual prompt enhancement
- A/B testing with power users

### Rollback
- Disable batch planning
- Fall back to single operations
- Keep execution logs
- No data model changes

## Dependencies

### Internal
- Brain Orchestrator
- Scene management system
- Tool execution framework
- SSE communication

### External
- None (all internal enhancement)

## Risks & Mitigations

### Risk 1: Misunderstood Intent
**Mitigation**: Clear confirmation dialogs, preview mode, undo capability

### Risk 2: Performance Issues
**Mitigation**: Parallel execution, progress indicators, cancelation support

### Risk 3: Data Corruption
**Mitigation**: Transaction support, automatic backups, rollback system

### Risk 4: Complex Edge Cases
**Mitigation**: Extensive testing, fallback to manual, clear error messages

## Future Enhancements

1. **Conditional Logic**:
   - "If scene has text, make it bold, else add text"
   - Branching operations
   - Complex conditions

2. **Operation Templates**:
   - Save common batch operations
   - Share operation patterns
   - Quick apply presets

3. **Smart Suggestions**:
   - Suggest batch operations based on content
   - Learn from user patterns
   - Proactive recommendations

4. **Advanced Queries**:
   - SQL-like filtering
   - Regular expressions
   - Custom predicates
   - Set operations (union, intersection)

## References

- Natural language processing patterns
- Database query languages
- Batch processing systems
- Video editing software batch operations
- File manager multi-select patterns