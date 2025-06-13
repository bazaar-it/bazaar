# Sprint 41: Key Features to Implement

## 1. Multi-Step Tool Execution ✅

The brain should be able to return multi-step workflows:

```typescript
// Example: User says "Create a hero section with a blue background and then add a title"
{
  workflow: [
    {
      tool: 'addScene',
      context: {
        prompt: 'hero section with blue background',
        projectId: '...'
      }
    },
    {
      tool: 'editScene',
      context: {
        prompt: 'add a title saying Welcome',
        sceneId: '${step0.result.sceneId}', // Reference previous step
      },
      dependsOn: 0
    }
  ],
  reasoning: "User wants to create and customize a scene"
}
```

### Implementation in generation.ts:
```typescript
if (decision.workflow) {
  const stepResults = new Map();
  
  for (const [index, step] of decision.workflow.entries()) {
    // Replace references to previous steps
    const resolvedContext = resolveStepReferences(step.context, stepResults);
    
    const result = await executeTool(step.tool, resolvedContext);
    stepResults.set(index, result);
    
    // Update UI after each step
    videoState.handleApiResponse(result);
  }
}
```

## 2. Version Control System ✅

### Features:
- **Automatic snapshots** before each operation
- **Undo/redo** functionality
- **Version history** with timestamps
- **Rollback** to any previous state

### Implementation:
```typescript
// In VideoState
class VideoStateNormalized {
  private history: VersionSnapshot[] = [];
  private currentIndex: number = -1;
  
  // Before any change
  saveSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      scenes: { ...this.scenes },
      messages: { ...this.messages },
      operation: currentOperation
    };
    
    // Remove any "future" history if we're not at the end
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new snapshot
    this.history.push(snapshot);
    this.currentIndex++;
    
    // Limit history size (e.g., 50 snapshots)
    if (this.history.length > 50) {
      this.history.shift();
      this.currentIndex--;
    }
  }
  
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const snapshot = this.history[this.currentIndex];
      this.restoreSnapshot(snapshot);
    }
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const snapshot = this.history[this.currentIndex];
      this.restoreSnapshot(snapshot);
    }
  }
}
```

### UI Integration:
```typescript
// In toolbar or keyboard shortcuts
<Button onClick={() => videoState.undo()} disabled={!videoState.canUndo()}>
  ↶ Undo
</Button>
<Button onClick={() => videoState.redo()} disabled={!videoState.canRedo()}>
  ↷ Redo
</Button>

// Keyboard shortcuts
useEffect(() => {
  const handleKeyboard = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      if (e.shiftKey) {
        videoState.redo();
      } else {
        videoState.undo();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, []);
```

## 3. Smart Context Preservation

When executing multi-step workflows, preserve context between steps:

```typescript
// Brain returns workflow with context dependencies
{
  workflow: [
    {
      tool: 'addScene',
      context: { prompt: 'blue background' },
      preserveFor: ['style', 'colors']  // What to preserve
    },
    {
      tool: 'addScene',
      context: { 
        prompt: 'title scene',
        inherit: ['style', 'colors']  // Inherit from previous
      }
    }
  ]
}
```

## 4. Optimistic UI with Rollback

For multi-step operations:

```typescript
// Start optimistic updates
const rollbackStack = [];

for (const step of workflow) {
  // Save current state for rollback
  rollbackStack.push(videoState.snapshot());
  
  try {
    // Optimistic update
    videoState.applyOptimistic(step);
    
    // Execute
    const result = await executeTool(step);
    
    // Confirm update
    videoState.confirmOptimistic(result);
  } catch (error) {
    // Rollback all changes
    while (rollbackStack.length) {
      videoState.restore(rollbackStack.pop());
    }
    throw error;
  }
}
```

## 5. Progress Tracking for Multi-Step

Show progress for multi-step operations:

```typescript
// In ChatPanel
{decision.workflow && (
  <div className="flex items-center gap-2">
    <span>Executing {currentStep + 1} of {decision.workflow.length}</span>
    <Progress value={(currentStep + 1) / decision.workflow.length * 100} />
  </div>
)}
```

## 6. Intelligent Error Recovery

If one step in a workflow fails:

```typescript
// Options:
1. Rollback entire workflow
2. Retry failed step
3. Skip and continue
4. Ask user what to do

// Implementation
catch (error) {
  const recovery = await brain.suggestRecovery({
    workflow,
    failedStep: index,
    error
  });
  
  switch (recovery.action) {
    case 'retry':
      // Retry with modified context
      result = await executeTool(step.tool, recovery.modifiedContext);
      break;
    case 'skip':
      // Continue with next steps
      continue;
    case 'abort':
      // Rollback and stop
      rollbackAll();
      break;
  }
}
```

## 7. Database Transaction Support

For multi-step operations, use transactions:

```typescript
// In generation.ts
const results = await db.transaction(async (tx) => {
  const results = [];
  
  for (const step of workflow) {
    const result = await executeToolInTransaction(tx, step);
    results.push(result);
  }
  
  return results;
});

// All succeed or all rollback
```

## Summary

These features make the system:
- **Powerful**: Multi-step operations
- **Safe**: Version control and rollback
- **Smart**: Context preservation
- **Reliable**: Error recovery
- **Fast**: Optimistic UI
- **Consistent**: Database transactions

All while maintaining:
- Brain only decides
- Generation.ts only executes
- VideoState as single source of truth
- <16ms UI updates