# Critical Workflow TargetSceneId Bug Fix

## Issue Summary

**Critical Bug**: Multi-step workflows were using incorrect scene IDs, causing "Scene with ID not found" errors even when the Brain LLM correctly identified the target scene.

**Error**: `Scene with ID eac17619-5f0c-42ec-8573-b87989995930 not found in storyboard`
- The workflow was created to target Scene 1 (ID: `2f16147d-3922-4afd-95c1-5222144d6c54`)
- But the execution was looking for the deleted Scene 3 ID

## Root Cause Analysis

The Brain LLM correctly created this workflow:
```json
{
  "workflow": [
    {"toolName": "analyzeImage", "context": "Analyze uploaded image content"},
    {"toolName": "editSceneWithImage", "targetSceneId": "2f16147d-3922-4afd-95c1-5222144d6c54", "context": "Incorporate image into existing scene"}
  ]
}
```

**But the workflow execution had 3 bugs:**

1. **`prepareWorkflowStepInput` method** wasn't extracting `targetSceneId` from step definition
2. **`executeWorkflow` type signature** didn't include `targetSceneId` in workflow step interface  
3. **`processToolResult` call** wasn't receiving the `targetSceneId` from the step

## Technical Fix

### Fix 1: Extract targetSceneId in prepareWorkflowStepInput

**Before:**
```typescript
const baseInput = await this.prepareToolInput(originalInput, { toolName: step.toolName });
```

**After:**
```typescript
// 🚨 CRITICAL FIX: Extract targetSceneId from step definition and pass to prepareToolInput
const toolSelection = { 
  toolName: step.toolName,
  targetSceneId: step.targetSceneId // Pass targetSceneId from workflow step
};
const baseInput = await this.prepareToolInput(originalInput, toolSelection);
```

### Fix 2: Update executeWorkflow type signature

**Before:**
```typescript
workflow: Array<{toolName: string, context: string, dependencies?: string[]}>
```

**After:**
```typescript
workflow: Array<{toolName: string, context: string, dependencies?: string[], targetSceneId?: string}>
```

### Fix 3: Pass targetSceneId to processToolResult

**Before:**
```typescript
const processedResult = await this.processToolResult(stepResult, toolNameEnum, input, {
  reasoning: `Workflow step ${i + 1}: ${step.context}`,
});
```

**After:**
```typescript
const processedResult = await this.processToolResult(stepResult, toolNameEnum, input, {
  reasoning: `Workflow step ${i + 1}: ${step.context}`,
  targetSceneId: step.targetSceneId, // Pass targetSceneId from workflow step
});
```

## Impact

- **Fixed**: Multi-step workflows now correctly use the targetSceneId from Brain LLM decisions
- **Resolved**: "Scene with ID not found" errors when Brain correctly identifies target scenes
- **Improved**: Workflow execution now properly handles scene targeting across all tools

## Files Modified

- `src/server/services/brain/orchestrator.ts` - Fixed workflow step input preparation and execution

## Testing Verification

This fix resolves the specific error where:
1. User uploads image and asks "can you add this to scene 1?"
2. Brain LLM correctly identifies Scene 1 and creates proper workflow 
3. Workflow execution now uses the correct scene ID instead of stale/incorrect IDs

The workflow system now properly propagates `targetSceneId` from Brain LLM decisions through to tool execution. 