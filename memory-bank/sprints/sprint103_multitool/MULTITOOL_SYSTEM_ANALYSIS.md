# Sprint 103: Multi-Tool System Analysis

## Current System: How Brain Selects Tools

### 1. Context Flow (User → Brain → Tool)

When a user submits a prompt:

```
User Prompt → Orchestrator → Context Builder → Intent Analyzer → Tool Selection → Execution
```

#### What Context the Brain Has:

1. **Storyboard Context**
   - All existing scenes (id, name, duration, order, tsxCode)
   - Scene positions ("Scene 1", "Scene 2", "[NEWEST/LAST ADDED]")
   - Selected scene (if user clicked on one)

2. **Image Context**
   - Current uploaded images
   - Recent images from chat history
   - Persistent project assets (logos, previously uploaded)

3. **Chat History**
   - Last 100 messages (after our optimization)
   - Recent conversation pairs for context

4. **Web/YouTube Context**
   - Website screenshots and metadata
   - YouTube video analysis
   - Brand extraction data

5. **Project Assets**
   - All previously uploaded files
   - Logos detected
   - Asset URLs for enforcement

### 2. How Brain Analyzes Intent

The Brain (using GPT-5-mini) receives a JSON-formatted prompt with all context and must return:

```json
{
  "toolName": "addScene" | "editScene" | "deleteScene" | "trimScene" | "imageRecreatorScene" | "addAudio" | "websiteToVideo",
  "reasoning": "Why this tool was chosen",
  "targetSceneId": "scene-id-if-editing",
  "targetDuration": 120, // For trim operations
  "referencedSceneIds": ["scene-1", "scene-2"], // For style matching
  "userFeedback": "What I'm doing"
}
```

**Current Limitation**: Can only return ONE tool at a time.

### 3. Conditional Context Application

Each tool receives different context based on the operation:

#### addScene:
- Previous scene context (for style continuity)
- Template examples (if first scene)
- Image/video URLs
- Web context (if from website)
- Reference scenes (for style matching)

#### editScene:
- Current scene code
- Neighboring scenes (n-1, n+1) for continuity
- Error details (if fixing)
- Image/video URLs for updates
- Reference scenes for style matching

#### deleteScene:
- Just the scene ID (minimal context)

#### trimScene:
- Current duration
- Target duration

## Multi-Tool Scenarios: What Happens Now

### Example 1: "Delete scene 4 and 5"

**Current Behavior**:
- Brain picks deleteScene for scene 4
- Returns: "Deleting Scene 4. You'll need to ask me to delete Scene 5 separately."
- User must request second deletion manually

**Time**: ~3 seconds per deletion (6 seconds total + user interaction)

### Example 2: "Make background in all scenes match scene 3"

**Current Behavior**:
- Brain likely returns clarification: "Which scene would you like me to update first?"
- OR picks editScene for scene 1 with reference to scene 3
- User must request each scene edit separately

**Time**: ~55 seconds per edit × N scenes

### Example 3: "Add 3 text scenes about our product features"

**Current Behavior**:
- Brain picks addScene
- Creates one scene
- Returns: "I've created the first scene. Request additional scenes for more features."

**Time**: ~15 seconds per scene × 3

## Multi-Tool Implementation: Complexity Analysis

### Approach 1: Sequential Execution (Low Complexity)

```typescript
// Brain returns array of operations
{
  "operations": [
    { "toolName": "deleteScene", "targetSceneId": "scene-4" },
    { "toolName": "deleteScene", "targetSceneId": "scene-5" }
  ]
}
```

**Complexity**: 
- **Brain**: Minor prompt update to return array
- **Orchestrator**: Loop through operations
- **UI**: Show progress for each operation
- **Error handling**: Stop on first failure

**Implementation Time**: ~2 days

### Approach 2: Parallel Execution (Medium Complexity)

```typescript
// Brain categorizes operations
{
  "parallelOperations": {
    "deletes": ["scene-4", "scene-5"],
    "edits": [
      { "sceneId": "scene-1", "changes": "match background to scene-3" },
      { "sceneId": "scene-2", "changes": "match background to scene-3" }
    ]
  }
}
```

**Complexity**:
- **Brain**: Must understand dependencies
- **Orchestrator**: Parallel execution logic
- **State Management**: Handle concurrent updates
- **Database**: Transaction management

**Implementation Time**: ~1 week

### Approach 3: Workflow System (High Complexity)

```typescript
// Brain creates execution plan
{
  "workflow": [
    {
      "step": 1,
      "parallel": [
        { "tool": "deleteScene", "target": "scene-4" },
        { "tool": "deleteScene", "target": "scene-5" }
      ]
    },
    {
      "step": 2,
      "tool": "addScene",
      "prompt": "Create transition scene"
    }
  ]
}
```

**Complexity**:
- **Brain**: Complex workflow planning
- **Orchestrator**: State machine for workflow
- **Error Recovery**: Rollback capabilities
- **UI**: Complex progress visualization

**Implementation Time**: ~2-3 weeks

## Recommendations

### Start with Sequential Multi-Tool (Approach 1)

**Why**:
1. **80% of use cases covered**: Most multi-tool requests are simple lists
2. **Minimal risk**: No concurrency issues
3. **Fast to implement**: 2 days
4. **Easy to debug**: Linear execution flow
5. **Graceful fallback**: Can always revert to single-tool

### Implementation Plan

#### Phase 1: Brain Update (4 hours)
```typescript
// Update brain prompt to detect multi-operations
"When user requests multiple operations (delete 3 and 4, edit all scenes):
1. Return array of operations in execution order
2. Consider dependencies (delete before add, etc.)
3. Limit to 5 operations per request"
```

#### Phase 2: Orchestrator Update (4 hours)
```typescript
async processMultiTool(operations: ToolOperation[]) {
  const results = [];
  for (const op of operations) {
    try {
      const result = await this.executeTool(op);
      results.push(result);
      
      // Update UI after each operation
      await this.updateProgress(op, results.length, operations.length);
    } catch (error) {
      // Stop on first error
      return { success: false, completed: results, error };
    }
  }
  return { success: true, results };
}
```

#### Phase 3: UI Updates (4 hours)
- Show multi-operation progress: "Executing 1 of 3..."
- List completed operations
- Handle partial success

#### Phase 4: Testing (4 hours)
- Test common multi-operations
- Error scenarios
- Performance impact

### Future Enhancements

Once sequential works, consider:
1. **Smart batching**: Group similar operations
2. **Dependency detection**: Understand which operations can parallelize
3. **Partial rollback**: Undo failed operations
4. **Macro recording**: Save common multi-operations

## Cost-Benefit Analysis

### Benefits of Multi-Tool:
- **User Experience**: 3x faster for bulk operations
- **Reduced Friction**: No need for multiple prompts
- **Natural Language**: "Delete scenes 3, 4, and 5" just works
- **Power Users**: Unlock complex workflows

### Costs:
- **Development**: 2 days (sequential) to 3 weeks (workflow)
- **Testing**: More edge cases
- **Error Handling**: Complex failure scenarios
- **Brain Tokens**: Slightly larger responses

### ROI:
**Sequential approach**: High ROI - minimal cost, significant UX improvement
**Workflow approach**: Lower ROI - high complexity for rare use cases

## Decision

**Implement Sequential Multi-Tool in Sprint 103**

Start simple, ship fast, learn from users. The sequential approach gives us 80% of the value with 20% of the complexity.