# Context System Implementation Proposal

## Problem Statement

Users cannot perform basic cross-scene operations like "make scene 2 use the same background color as scene 1" because:
- The Brain AI doesn't see scene code to understand what needs matching
- Tools only receive the target scene's code, not reference scenes
- The system spends time on abstract "preferences" instead of concrete needs

## Proposed Solution: Smart Context Inclusion

### Core Principle
Only include scene code when the AI determines it's needed, not by default. This keeps the system efficient while enabling cross-scene operations.

## Implementation Steps

### Step 1: Enhance Brain Decision Output

Update the Brain's response format to request scene code when needed:

```typescript
// In brain-orchestrator.ts prompt
interface BrainDecision {
  toolName: string
  reasoning: string
  targetSceneId?: string
  
  // NEW: Request specific scene code
  needsSceneCode?: string[]  // Array of scene IDs to include
  
  // Example:
  // User: "make scene 2 match scene 1's colors"
  // Brain: { 
  //   toolName: "editScene",
  //   targetSceneId: "scene-2-id",
  //   needsSceneCode: ["scene-1-id"]  // Brain requests scene 1's code
  // }
}
```

### Step 2: Update Context Builder

Add method to fetch requested scene code:

```typescript
// In contextBuilder.ts
class ContextBuilder {
  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    // ... existing context building ...
    
    return {
      // ... existing fields ...
      sceneCodeMap: new Map<string, string>()  // Will be populated if needed
    };
  }
  
  // NEW: Fetch specific scene code when requested
  async fetchSceneCode(sceneIds: string[]): Promise<Map<string, string>> {
    const sceneCodeMap = new Map<string, string>();
    
    const scenes = await db
      .select({ id: scenes.id, tsxCode: scenes.tsxCode })
      .from(scenes)
      .where(inArray(scenes.id, sceneIds));
    
    scenes.forEach(scene => {
      sceneCodeMap.set(scene.id, scene.tsxCode);
    });
    
    return sceneCodeMap;
  }
}
```

### Step 3: Two-Phase Orchestration

Update the orchestrator to handle scene code requests:

```typescript
// In orchestratorNEW.ts
async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
  // Phase 1: Build initial context and get tool decision
  const contextPacket = await this.contextBuilder.buildContext(input);
  const toolSelection = await this.intentAnalyzer.analyzeIntent(input, contextPacket);
  
  // Phase 2: If Brain requests scene code, fetch it
  if (toolSelection.needsSceneCode?.length > 0) {
    contextPacket.sceneCodeMap = await this.contextBuilder.fetchSceneCode(
      toolSelection.needsSceneCode
    );
  }
  
  // Return decision with enriched context
  return {
    ...toolSelection,
    contextPacket  // Now includes requested scene code
  };
}
```

### Step 4: Update Tool Inputs

Enhance tool input types to accept reference scenes:

```typescript
// In types.ts
interface EditToolInput extends BaseToolInput {
  sceneId: string
  tsxCode: string  // Target scene code
  
  // NEW: Reference scenes for context
  referenceScenes?: Array<{
    id: string
    name: string
    tsxCode: string
  }>
}

interface AddToolInput extends BaseToolInput {
  // ... existing fields ...
  
  // NEW: Always include previous scene for continuity
  previousSceneCode?: string
  
  // NEW: Additional reference scenes if needed
  referenceScenes?: Array<{
    id: string
    name: string
    tsxCode: string
  }>
}
```

### Step 5: Update Router to Pass Context

Modify the router to pass reference scenes to tools:

```typescript
// In generation/helpers.ts
case 'editScene':
  const referenceScenes = [];
  
  // If Brain requested scene code, prepare it for the tool
  if (decision.contextPacket?.sceneCodeMap) {
    for (const [sceneId, tsxCode] of decision.contextPacket.sceneCodeMap) {
      const scene = storyboard.find(s => s.id === sceneId);
      if (scene) {
        referenceScenes.push({
          id: sceneId,
          name: scene.name,
          tsxCode: tsxCode
        });
      }
    }
  }
  
  toolInput = {
    userPrompt: decision.toolContext.userPrompt,
    sceneId: decision.toolContext.targetSceneId,
    tsxCode: sceneToEdit.tsxCode,
    referenceScenes,  // NEW: Pass reference scenes
    // ... other fields
  } as EditToolInput;
```

### Step 6: Update Tool Prompts

Enhance the Code Editor prompt to use reference scenes:

```typescript
// In code-editor.ts prompt
"When reference scenes are provided, analyze them to extract:
- Color schemes and backgrounds
- Animation patterns and timing
- Layout and positioning
- Typography and text styles
- Overall visual style

Use this analysis to match the requested properties in your edit."
```

## Smart Defaults

### 1. Add Scene Default
Always include the previous scene when adding:
```typescript
// In router, for addScene
if (storyboard.length > 0) {
  const previousScene = storyboard[storyboard.length - 1];
  toolInput.previousSceneCode = previousScene.tsxCode;
}
```

### 2. Edit Scene Intelligence
The Brain should detect when scene code is needed:
- "match", "same as", "like" → include referenced scene
- "continue", "extend" → include previous scene
- Color/style references → include mentioned scenes

## Benefits

1. **Efficient**: Only fetches scene code when needed
2. **Powerful**: Enables all cross-scene operations
3. **Backward Compatible**: Existing flows work unchanged
4. **Extensible**: Easy to add more context types

## Example User Flows

### Flow 1: Style Matching
```
User: "make scene 3 use the same background as scene 1"
Brain: Detects cross-scene reference, requests scene 1 code
Router: Fetches scene 1 code, passes to Edit tool
Edit Tool: Extracts background from scene 1, applies to scene 3
Result: Scene 3 now matches scene 1's background
```

### Flow 2: Style Continuation
```
User: "add a new scene"
Router: Automatically includes previous scene code
Add Tool: Analyzes previous scene style, creates matching new scene
Result: Visual continuity maintained
```

## Migration Path

1. **Phase 1**: Implement basic scene code inclusion (1-2 days)
2. **Phase 2**: Add Brain intelligence for detection (1 day)
3. **Phase 3**: Enhance tool prompts for style extraction (1 day)
4. **Phase 4**: Add semantic caching for performance (future)

This approach solves the immediate problem while setting up for future enhancements.