# Cross-Scene Reference Implementation - Reviewed Plan

## Identified Issues with Original Plan

### Issue 1: Type Flow
The data flow is: Brain Prompt → ToolSelectionResult → OrchestrationOutput → BrainDecision
We need to update ALL of these, not just BrainDecision.

### Issue 2: Orchestrator Mapping
The orchestrator manually builds toolContext, so we need to pass referencedSceneIds through there too.

### Issue 3: Brain Prompt Detection
The Brain needs clear instructions on WHEN to identify referenced scenes.

## Revised Implementation Plan

### Step 1: Update Brain Prompt (brain-orchestrator.ts)
```typescript
// Add to response format section:
RESPONSE FORMAT (JSON):
{
  "toolName": "addScene" | "editScene" | "deleteScene" | "trimScene",
  "reasoning": "Clear explanation of why this tool was chosen",
  "targetSceneId": "scene-id-if-editing-deleting-or-trimming",
  "targetDuration": 120, // FOR TRIM ONLY
  "referencedSceneIds": ["scene-1-id", "scene-2-id"], // NEW: When user mentions other scenes for style/color matching
  "userFeedback": "Brief, friendly message about what you're doing",
  "needsClarification": false,
  "clarificationQuestion": "Optional: Ask user to clarify if ambiguous"
}

WHEN TO SET referencedSceneIds:
- User says "like scene X", "match scene X", "same as scene X"
- User mentions colors/styles from specific scenes
- User says "use the background from scene X"
- DO NOT set for general edits without scene references
```

### Step 2: Update ALL Type Definitions

```typescript
// In brain.types.ts

// 1. Update ToolSelectionResult (what intentAnalyzer returns)
export interface ToolSelectionResult {
  // ... existing fields
  referencedSceneIds?: string[]; // NEW
}

// 2. The BrainDecision toolContext already flows through, but let's be explicit
export interface BrainDecision {
  // ... existing fields
  toolContext?: {
    // ... existing fields
    referencedSceneIds?: string[]; // NEW - for passing to router
  };
}
```

### Step 3: Update Intent Analyzer to Pass Through
```typescript
// In intentAnalyzer.ts processBrainDecision method
const result: ToolSelectionResult = {
  success: true,
  toolName: parsed.toolName,
  reasoning: parsed.reasoning,
  targetSceneId: parsed.targetSceneId,
  targetDuration: parsed.targetDuration,
  userFeedback: parsed.userFeedback,
  referencedSceneIds: parsed.referencedSceneIds, // NEW: pass through
};
```

### Step 4: Update Orchestrator to Include in toolContext
```typescript
// In orchestratorNEW.ts
result: {
  toolName: toolSelection.toolName,
  toolContext: {
    userPrompt: input.prompt,
    targetSceneId: toolSelection.targetSceneId,
    targetDuration: toolSelection.targetDuration,
    imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
    referencedSceneIds: toolSelection.referencedSceneIds, // NEW
  },
  workflow: toolSelection.workflow,
}
```

### Step 5: Update helpers.ts (with safety checks)
```typescript
case 'editScene':
  if (!decision.toolContext.targetSceneId) {
    throw new Error("No target scene ID for edit operation");
  }
  
  const sceneToEdit = await db.query.scenes.findFirst({
    where: eq(scenes.id, decision.toolContext.targetSceneId),
  });
  
  if (!sceneToEdit) {
    throw new Error("Scene not found for editing");
  }
  
  // NEW: Get reference scenes if specified
  let referenceScenes: any[] = [];
  if (decision.toolContext.referencedSceneIds?.length > 0) {
    // Safety: Only include scenes that exist in storyboard
    referenceScenes = storyboard.filter(s => 
      decision.toolContext.referencedSceneIds!.includes(s.id)
    );
    
    console.log(`📝 [ROUTER] Including ${referenceScenes.length} reference scenes for edit`);
  }
  
  toolInput = {
    userPrompt: decision.toolContext.userPrompt,
    projectId,
    userId,
    sceneId: decision.toolContext.targetSceneId,
    tsxCode: sceneToEdit.tsxCode,
    currentDuration: sceneToEdit.duration,
    
    // NEW: Include reference scenes if any
    referenceScenes: referenceScenes.length > 0 ? referenceScenes.map(s => ({
      id: s.id,
      name: s.name,
      tsxCode: s.tsxCode
    })) : undefined,
    
    imageUrls: decision.toolContext.imageUrls,
    visionAnalysis: decision.toolContext.visionAnalysis,
    errorDetails: decision.toolContext.errorDetails,
  } as EditToolInput;
```

### Step 6: Update Edit Tool Types
```typescript
// Already correct in the plan - just add to EditToolInput
```

### Step 7: Update Edit Tool Implementation
```typescript
// The original plan is good, but let's add better formatting:
if (input.referenceScenes?.length) {
  context += `\n\nREFERENCE SCENES FOR STYLE/COLOR MATCHING:`;
  input.referenceScenes.forEach((scene) => {
    context += `\n\n${scene.name} (ID: ${scene.id}):\n\`\`\`tsx\n${scene.tsxCode}\n\`\`\``;
  });
  context += `\n\nIMPORTANT: Extract the specific colors, styles, animations, or patterns from the reference scenes that the user wants to apply. Be precise in matching the requested elements.`;
}
```

## Potential Pitfalls Addressed

1. **Type Safety**: We're updating the entire type chain, not just one interface
2. **Brain Understanding**: Clear instructions on when to set referencedSceneIds
3. **Safety Checks**: Only include scenes that actually exist in storyboard
4. **Clear Context**: Better formatting and instructions for the AI

## Testing Strategy

1. **Basic Test**: "Make scene 2 use the same background as scene 1"
2. **Multi-Reference**: "Make scene 3 combine the colors from scene 1 and animations from scene 2"
3. **Non-Reference Edit**: "Make the text bigger" (should NOT set referencedSceneIds)

This approach is more thorough and addresses the complete data flow from Brain → Tools.