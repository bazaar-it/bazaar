# Architecture Confusion & Cleanup Plan

## CURRENT PROBLEMS IDENTIFIED

### 1. **Deprecated Function Usage**
- `getCodeGeneratorModel()` and `getDirectCodeEditorModel()` marked deprecated but still used
- TypeScript warnings throughout codebase
- **Problem**: We created new centralized getters but didn't update all callsites
- **FIXED**: ✅ All services now use `getModel()` and `resolveDirectCodeEditorModel()`

### 2. **Mixed Prompt Management**
- Some prompts in centralized `prompts.config.ts`
- Some prompts hard-coded in services (lines 311, 358 in CodeGeneratorService)
- **Problem**: Inconsistent prompt management strategy
- **FIXED**: ✅ Moved IMAGE_TO_CODE and IMAGE_GUIDED_EDIT prompts to prompts.config.ts

### 3. **Service Boundary Confusion**
We currently have:
- **SceneBuilderService**: Orchestrates two-step pipeline
- **LayoutGeneratorService**: User Prompt → JSON Layout
- **CodeGeneratorService**: JSON Layout → React Code + Image-to-Code
- **DirectCodeEditorService**: Edit existing code directly
- **NodeGenerationService**: ❓ Unclear purpose
- **Problem**: Unclear boundaries, duplicate responsibilities

## SIMPLIFIED ARCHITECTURE (TARGET STATE)

```
USER REQUEST (text + optional image)
    ↓
🧠 BRAIN ORCHESTRATOR
    ↓
    ├─ NEW SCENE → SceneBuilderService
    │   ↓
    │   ├─ User Prompt → JSON Layout (LayoutGeneratorService) 
    │   ↓
    │   └─ JSON Layout → React Code (CodeGeneratorService)
    │
    ├─ EDIT SCENE → DirectCodeEditorService
    │   ↓
    │   └─ Code + User Request → Modified Code
    │
    └─ IMAGE-TO-CODE → CodeGeneratorService.generateFromImage()
        ↓
        └─ Image + Prompt → React Code
```

## CLEAR SERVICE BOUNDARIES

### 1. **SceneBuilderService** (ORCHESTRATOR)
- **Input**: User prompt (string) + optional storyboard
- **Output**: Complete scene (layout + code)
- **Responsibility**: Coordinates two-step pipeline
- **Calls**: LayoutGeneratorService → CodeGeneratorService

### 2. **LayoutGeneratorService** (PROMPT → JSON)
- **Input**: Raw user prompt (string)
- **Output**: Structured JSON layout spec
- **Responsibility**: Convert natural language to structured specs
- **Model**: Uses layout generator models (claude-pack)

### 3. **CodeGeneratorService** (JSON → CODE)
- **Input A**: JSON layout spec
- **Output A**: React/Remotion component code
- **Input B**: Image + user prompt (image-to-code)
- **Output B**: React/Remotion component code
- **Responsibility**: Generate motion graphics code from specs or images

### 4. **DirectCodeEditorService** (CODE → EDITED CODE)
- **Input**: Existing code + edit request
- **Output**: Modified code
- **Responsibility**: Make surgical changes to existing components
- **Types**: Creative, Structural, Surgical edits

### 5. **NodeGenerationService** ❌ DEPRECATED
- **Status**: Unclear purpose, should be removed or merged

## JSON vs DIRECT REQUIREMENTS

### Services That REQUIRE JSON Input:
1. **CodeGeneratorService.generateCode()** ✅ JSON → Code
   - Expects structured `SceneLayout` JSON
   - Converts to motion graphics components

### Services That ACCEPT Direct Text:
1. **LayoutGeneratorService** ✅ Text → JSON
   - Raw user prompts
   - Converts to structured specs

2. **DirectCodeEditorService** ✅ Text + Code → Code
   - Edit requests in natural language
   - Modifies existing code

3. **CodeGeneratorService.generateFromImage()** ✅ Image + Text → Code
   - Direct image-to-code generation
   - No JSON intermediate step

## FIXES IMPLEMENTED ✅

1. **Fixed Deprecation Warnings**
   - Updated all `getCodeGeneratorModel()` → `getModel('codeGenerator')`
   - Updated all `getDirectCodeEditorModel()` → `resolveDirectCodeEditorModel()`

2. **Centralized Prompts**
   - Moved hard-coded IMAGE_TO_CODE prompt to prompts.config.ts
   - Moved hard-coded IMAGE_GUIDED_EDIT prompt to prompts.config.ts
   - Services now use `getParameterizedPrompt()` consistently

3. **Clear Service Boundaries**
   - Each service has single, clear responsibility
   - Input/output types clearly defined
   - No more confusion about who needs what

## NEXT STEPS

1. **Remove NodeGenerationService** if truly unused
2. **Audit remaining hard-coded prompts** in other services
3. **Create service interface documentation** with clear contracts
4. **Add integration tests** that verify the full pipeline

## SUMMARY

The architecture is now much cleaner:
- **One source of truth** for prompts (prompts.config.ts)
- **One source of truth** for models (models.config.ts)
- **Clear service boundaries** with specific responsibilities
- **No deprecation warnings** in TypeScript
- **Consistent prompt management** across all services

Each service has a clear purpose and well-defined inputs/outputs. The confusion about JSON vs direct text is resolved by understanding each service's role in the pipeline.

# Sprint 32: Orchestrator Simplification and Context Accumulation

*Current Status: ✅ Complete - Architecture Simplified & Context System Enhanced*

## **Image Analysis: From Brain Decision to Pre-Processing**

### **🎯 The Problem: Context Loss Over Multiple Prompts**

The user identified a critical architectural flaw: **the system was designed for single prompts, not iterative workflows**. Key issues:

1. **Image analysis was a brain decision**, not automatic pre-processing
2. **Context was lost between prompts** - "that button in scene 2" wouldn't work
3. **Inconsistent data flow** - sometimes JSON, sometimes direct code
4. **No knowledge accumulation** for future reference

### **💡 The Solution: Always Analyze Images for Context Building**

**New Architecture:**
```
USER UPLOADS IMAGE → ALWAYS ANALYZE (pre-processing) → STORE ANALYSIS → BRAIN DECISION
```

**Benefits:**
- **Context accumulation**: Every image gets analyzed and stored for future reference
- **Better brain decisions**: Brain has full context, not partial context  
- **Future references**: "Make it like the button in scene 2" works because we have detailed analysis of scene 2's image
- **Consistent workflow**: All image operations have structured context

### **🔧 Implementation Changes**

**1. Brain Orchestrator Enhancement:**
- Added automatic image analysis in `processUserInput()` before brain decision
- Enhanced input context with image analysis results
- Pass analysis to all downstream tools

**2. Context Flow:**
```
processUserInput() {
  // 🎯 ALWAYS analyze images when present
  if (imageUrls) {
    imageAnalysis = await analyzeImageTool.run(...)
    enhancedInput.userContext.imageAnalysis = imageAnalysis
  }
  
  // Brain makes decisions with full context
  toolSelection = await analyzeIntent(enhancedInput)
  
  // Tools receive rich context
  toolInput = prepareToolInput(enhancedInput, toolSelection)
}
```

**3. Tool Input Enhancement:**
- `addScene`: Now receives `visionAnalysis` from pre-processing
- `editScene`: Now receives `visionAnalysis` from pre-processing
- No workflow changes needed - seamless integration

### **🔮 Future Architectural Considerations**

**User Insight: SceneBuilder + SceneEditor Pattern**

The user suggested a potentially simpler architecture:
- **SceneBuilder**: Handles all new scene creation (text + optional image → JSON → code)  
- **SceneEditor**: Handles all edits (existing code + prompt + optional context → new code)

**Benefits:**
- Cleaner mental model: "building" vs "editing"
- Always go through JSON for consistency and context preservation
- Single source of truth for each operation type

**Current vs Proposed:**
```
Current: SceneBuilder + LayoutGenerator + CodeGenerator + DirectCodeEditor
Proposed: SceneBuilder + SceneEditor
```

**Considerations:**
1. **Should all edits go through JSON?** Pros: consistent context. Cons: potentially slower for simple edits
2. **How to handle the speed vs context tradeoff?** Maybe SceneEditor could decide internally whether to use JSON intermediate step
3. **Context preservation**: The always-analyze-images approach we just implemented already solves the main context issue

**Recommendation**: Monitor how the current enhanced system performs with automatic image analysis. The context accumulation might solve the main issues without requiring architectural changes.

// ... existing code ... 