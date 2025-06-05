# Critical Multi-Step Workflow Detection Fix - Sprint 32

## 🚨 **Critical Issue Identified**

**Date**: 2025-01-25  
**Severity**: HIGH - Architectural violation causing incorrect scene generation  
**Impact**: Brain LLM was generating invalid scene code with embedded "fake scenes"

## 🎯 **User's Problem**

**Request**: *"add a mouse to scene 1. a mouse that clicks the try now button and the end of the scene. and then make a simple transition into a new scene - scene 2"*

**Expected Behavior**:
1. **Step 1**: `editScene` - Add mouse animation to Scene 1 
2. **Step 2**: `addScene` - Create new Scene 2 as separate database entity
3. **Result**: Two distinct scenes with proper database records

**Actual Behavior**:
1. **Brain Decision**: Single `editScene` with "structural" complexity
2. **DirectCodeEditor**: Generated code embedding "Scene 2" content within Scene 1 component
3. **Result**: Architectural violation - fake Scene 2 hardcoded in Scene 1's code

## 🔍 **Root Cause Analysis**

### **1. Missing Workflow Pattern Detection**
The Brain Orchestrator prompt lacked specific patterns for detecting requests that require multiple tools:
- Scene transitions (edit existing + create new)
- Content movement between scenes  
- Extract and create operations

### **2. Scene Boundary Misunderstanding**
The Brain LLM didn't understand that:
- Scenes are separate database entities
- "new scene" always means `addScene`, never embedded content
- Scene transitions require separate database records

### **3. Insufficient Multi-Step Examples**
The prompt had basic workflow examples but missed the specific pattern the user hit:
- "add X to existing scene AND create new scene Y" = editScene + addScene workflow

## 🔧 **Technical Fix Applied**

### **Enhanced Brain Orchestrator Prompt**
**File**: `src/config/prompts.config.ts` - BRAIN_ORCHESTRATOR section

**Added Section**: 
```
🔄 MULTI-STEP WORKFLOW DETECTION:
CRITICAL: Some user requests require MULTIPLE tools in sequence. Look for these patterns:

1. **Scene Transitions**: "add X and then create/transition to new scene Y"
   → Workflow: [{editScene: "add X"}, {addScene: "create scene Y"}]

2. **Move Content**: "take X from scene A and put it in new scene B"  
   → Workflow: [{editScene: "remove X from scene A"}, {addScene: "create scene B with X"}]

3. **Extract & Create**: "make the title animation a separate intro scene"
   → Workflow: [{editScene: "remove title"}, {addScene: "create intro with title"}]

🚨 SCENE BOUNDARY RULES:
- Scene transitions = separate database entities, NEVER embedded content
- "new scene" always means addScene tool, never embedded within editScene
- Scene 1 → Scene 2 = two database records with transition logic, not one component
```

**Updated Tool Selection Hierarchy**:
- Added step 4: "Does the user request involve MULTIPLE operations?"
- Prioritizes workflow detection before single tool selection

**Enhanced Workflow Example**:
```json
{
  "workflow": [
    {"toolName": "editScene", "context": "Add mouse animation to Scene 1", "targetSceneId": "uuid-of-scene-1"},
    {"toolName": "addScene", "context": "Create Scene 2 with transition from Scene 1"}
  ],
  "reasoning": "User request requires editing existing scene then creating new scene for transition"
}
```

## 📊 **Expected Impact**

### **User Experience**
- ✅ Natural requests like "add X then create scene Y" will work correctly
- ✅ Scene transitions will create proper database entities
- ✅ No more fake embedded scenes in code
- ✅ Proper scene separation and organization

### **System Architecture**
- ✅ Maintains database entity integrity
- ✅ Enables proper scene transitions
- ✅ Supports complex multi-step operations
- ✅ Better separation of concerns

### **Code Quality**
- ✅ No more architectural violations
- ✅ Clean scene components without embedded content
- ✅ Proper scene-to-scene transition logic
- ✅ Maintainable and scalable code structure

## 🧪 **Testing Required**

### **Test Cases to Verify**
1. **Scene Transition Request**: "add a button to scene 1 then create scene 2"
   - Expected: editScene + addScene workflow
   - Verify: Two separate database entities created

2. **Content Movement**: "take the title from scene 1 and make it scene 2"
   - Expected: editScene (remove) + addScene (create with title)
   - Verify: Title removed from scene 1, new scene 2 created

3. **Complex Transitions**: "add mouse click then transition to new scene"
   - Expected: editScene (add mouse) + addScene (create new scene)
   - Verify: Proper workflow execution

## 🎯 **Next Steps**

1. **Restart Development Server**: Apply the prompt changes
2. **Test Multi-Step Workflows**: Verify the fix works with real user requests
3. **Monitor Brain Decisions**: Check logs to ensure correct workflow detection
4. **Update Documentation**: Document the enhanced workflow capabilities

## 🏆 **Success Metrics**

- ✅ Zero fake embedded scenes in generated code
- ✅ Proper database entity creation for all scenes
- ✅ Successful execution of multi-step user requests
- ✅ Clean separation between scene editing and scene creation 