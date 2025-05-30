# askSpecify Tool Fixes - Complete Analysis

**Date**: 2025-01-26  
**Status**: ✅ FIXED  
**Problem**: askSpecify tool was completely broken due to multiple issues

## 🐛 **ROOT CAUSE ANALYSIS**

### **Issue 1: LLM Response Parsing Failure**
**Problem**: Brain LLM returned correct response but orchestrator couldn't parse it
```json
// LLM Response (Correct)
{
  "toolName": "askSpecify",
  "reasoning": "...",
  "clarificationNeeded": "duration_intent"  // ❌ This field was ignored
}

// orchestrator.ts was looking for:
toolSelection.toolInput?.clarificationNeeded // ❌ Wrong path - was always undefined
// Fell back to: "unclear_intent" // ❌ Invalid enum value
```

**Fix**: Modified `analyzeIntent()` to extract `clarificationNeeded` from top-level response:
```typescript
// 🚨 CRITICAL FIX: Extract clarificationNeeded from top-level parsed response
if (parsed.clarificationNeeded) {
  result.clarificationNeeded = parsed.clarificationNeeded;
  console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
}
```

### **Issue 2: Incorrect Input Schema Mapping**
**Problem**: orchestrator passed wrong field names to askSpecify tool
```typescript
// ❌ Before (orchestrator.ts)
return {
  userPrompt: input.prompt,
  sessionId: input.projectId,  // ❌ Wrong field name
  ambiguityType: "unclear_intent"  // ❌ Invalid enum value
};

// ✅ askSpecify.ts expected:
{
  projectId: string,  // ❌ Not sessionId
  ambiguityType: 'scene-selection' | 'action-unclear' | 'parameter-missing' | 'duration_intent'
}
```

**Fix**: Updated `prepareToolInput()` case for askSpecify:
```typescript
return {
  userPrompt: input.prompt,
  projectId: input.projectId, // 🚨 FIXED: Use projectId, not sessionId 
  ambiguityType: toolSelection.clarificationNeeded || "action-unclear", // 🚨 FIXED: Correct mapping + valid fallback
  availableScenes: (input.storyboardSoFar || []).map(scene => ({ // 🚨 FIXED: Map to expected format
    id: scene.id,
    name: scene.name || `Scene ${scene.order || '?'}`,
    number: scene.order
  })),
  context: input.userContext || {},
};
```

### **Issue 3: UI Showing Wrong Messages**
**Problem**: ChatPanelG showed "askSpecify completed: make it 3 ✅" instead of clarification question

**Fix**: Added proper askSpecify handling in mutation callback:
```typescript
// 🚨 CRITICAL FIX: Handle askSpecify responses differently from scene generation
if (result.isAskSpecify) {
  console.log('[ChatPanelG] ❓ askSpecify response received, showing clarification question');
  
  if (activeAssistantMessageId) {
    updateOptimisticMessage(activeAssistantMessageId, {
      content: result.chatResponse || result.clarificationQuestion || 'I need more information...',
      status: 'pending', // 🚨 KEEP as pending - this is a question, not completion
    });
  }
  
  setIsGenerating(false);
  setGenerationComplete(false); // 🚨 Don't mark as complete - waiting for user response
  return; // 🚨 Early return - don't execute scene generation logic
}
```

## ✅ **IMPLEMENTATION DETAILS**

### **Backend Changes (`orchestrator.ts`)**

1. **Enhanced `analyzeIntent()` return type**:
```typescript
{
  success: boolean;
  toolName?: string;
  reasoning?: string;
  toolInput?: Record<string, unknown>;
  targetSceneId?: string;
  workflow?: Array<{toolName: string, context: string, dependencies?: string[]}>;
  error?: string;
  clarificationNeeded?: string; // 🚨 NEW: Extract clarificationNeeded from LLM
}
```

2. **Fixed LLM response parsing**:
```typescript
// 🚨 CRITICAL FIX: Extract clarificationNeeded from top-level parsed response
if (parsed.clarificationNeeded) {
  result.clarificationNeeded = parsed.clarificationNeeded;
  console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
}
```

3. **Updated `prepareToolInput()` signature and logic**:
```typescript
private async prepareToolInput(
  input: OrchestrationInput, 
  toolSelection: { 
    toolName?: string; 
    toolInput?: Record<string, unknown>; 
    targetSceneId?: string; 
    clarificationNeeded?: string  // 🚨 NEW: Add clarificationNeeded
  }
): Promise<Record<string, unknown>>
```

### **Frontend Changes (`ChatPanelG.tsx`)**

1. **Added state for tracking active assistant message**:
```typescript
const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null);
```

2. **Updated helper to track message ID**:
```typescript
const addOptimisticAssistantMessage = useCallback((content: string = 'Generating scene...') => {
  // ... create message ...
  setActiveAssistantMessageId(optimisticMessage.id); // 🚨 NEW: Track this message ID
  return optimisticMessage.id;
}, []);
```

3. **Enhanced mutation success handler**:
```typescript
onSuccess: async (result: any) => {
  // 🚨 CRITICAL FIX: Handle askSpecify responses differently from scene generation
  if (result.isAskSpecify) {
    // Show clarification question, keep as pending, don't mark complete
    return; // Early return
  }
  
  // Regular scene generation success logic...
}
```

## 🧪 **TESTING SCENARIOS**

### **Scenario 1: Duration Ambiguity**
```
User: "make it 3 seconds"
Expected: Brain LLM → askSpecify → "When you mention changing the duration, do you want to: 1. Change total scene length 2. Speed up animations 3. Both?"
```

### **Scenario 2: Scene Reference Ambiguity**  
```
User: "make it blue" (with multiple scenes)
Expected: Brain LLM → askSpecify → "Which scene are you referring to? I see Scene 1 and Scene 2."
```

### **Scenario 3: Action Unclear**
```
User: "fix it"
Expected: Brain LLM → askSpecify → "What would you like me to do exactly?"
```

## 📊 **VALIDATION RESULTS**

### **Before Fix**:
- ❌ askSpecify tool validation errors: `Invalid enum value "unclear_intent"`, `projectId Required`
- ❌ UI showed: "askSpecify completed: make it 3 ✅" 
- ❌ On refresh: Fallback message "I need more information..."

### **After Fix**:
- ✅ askSpecify tool executes successfully with valid inputs
- ✅ UI shows actual clarification question immediately  
- ✅ User can respond directly without page refresh
- ✅ No misleading success checkmarks for questions

## 🔄 **DATA FLOW (Fixed)**

```
User: "make it 3 seconds"
  ↓
Brain LLM: { toolName: "askSpecify", clarificationNeeded: "duration_intent" }
  ↓
orchestrator.ts: Extracts clarificationNeeded → maps to ambiguityType
  ↓
askSpecify.ts: { projectId: "...", ambiguityType: "duration_intent", ... }
  ↓
askSpecify.ts: Generates specific clarification question
  ↓
ChatPanelG.tsx: Shows question with pending status, no checkmark
  ↓
User sees: "When you mention changing the duration, do you want to: 1. Change total scene length 2. Speed up animations 3. Both?"
```

## 🎯 **IMPACT**

- **User Experience**: Users now get clear, actionable clarification questions instead of generic errors
- **System Reliability**: askSpecify tool no longer fails due to validation errors  
- **Conversational Flow**: Proper back-and-forth conversation for ambiguous requests
- **Debug Clarity**: Enhanced logging shows exact LLM responses and tool inputs
- **Code Quality**: Fixed type safety issues and scope problems in React components 