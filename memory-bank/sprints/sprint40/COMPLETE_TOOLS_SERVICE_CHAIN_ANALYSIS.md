# Complete Tools Service Chain Analysis (CORRECTED)

## Overview
This document provides a comprehensive analysis of all 8 MCP tools, their complete service chains, and input/output consistency throughout the system.

## Tool 1: AddScene

### Complete Flow
```
BrainOrchestrator 
  → prepareToolInput() 
    - Adds: projectId, storyboardSoFar, sceneNumber, visionAnalysis
  → AddSceneTool.execute()
    - Input: {userPrompt, projectId, sceneNumber?, storyboardSoFar?, replaceWelcomeScene?, visionAnalysis?}
    → SceneBuilderService.generateTwoStepCode()  // ✅ CORRECTED METHOD NAME
      - Input: {userPrompt, projectId, sceneNumber?, previousSceneJson?, visionAnalysis?}
      → LayoutGeneratorService.generateLayout()
        - Input: {userPrompt, previousLayout?, visionAnalysis?}
        - Output: {layoutSpec (object), reasoning}
      → CodeGeneratorService.generateCode()
        - Input: {layoutJson, userPrompt, functionName}
        - Output: {code, name, duration, reasoning, debug}
      → DurationExtractor.analyzeDuration()
        - Input: code (string)
        - Output: {frames, seconds}
      - Output: {code, name, duration, reasoning, layoutJson, debug}
    - Output: {sceneCode, sceneName, duration, reasoning, layoutJson?, debug?, chatResponse: undefined}
```

### Issues Found
1. **Field Name Transformations**:
   - Service returns `code` → Tool outputs `sceneCode`
   - Service returns `name` → Tool outputs `sceneName`
   - Service returns object `layoutJson` → Tool outputs string `JSON.stringify(layoutJson)`

2. **Optional Fields Inconsistency**:
   - `sceneNumber` optional in tool but required for proper ordering
   - `visionAnalysis` passed through multiple layers but not always used

---

## Tool 2: EditScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: projectId, sceneId, existingCode, existingName, existingDuration, editComplexity, visionAnalysis
  → EditSceneTool.execute()
    - Input: {userPrompt, existingCode, existingName, existingDuration, projectId, sceneId?, storyboardSoFar?, chatHistory?, editComplexity?, visionAnalysis?}
    → DirectCodeEditorService.editCode()
      - Input: {userPrompt, existingCode, existingName, chatHistory[], editComplexity, visionAnalysis?}
      → AIClientService.generateResponse()
        - Model: getClaude35SonnetModel()
      - Output: {code, changes[], preserved[], reasoning, newDurationFrames?, debug}
    - Output: {sceneCode, sceneName, duration, reasoning, changes, preserved, debug?, chatResponse: undefined}
```

### Issues Found
1. **Field Name Transformations**:
   - Service returns `code` → Tool outputs `sceneCode`
   - Service keeps `name` → Tool outputs `sceneName` (from displayName conversion)
   
2. **Duration Logic**:
   - Service returns optional `newDurationFrames`
   - Tool has fallback regex logic for duration changes

---

## Tool 3: DeleteScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: sceneId, sceneName, projectId, remainingScenes
  → DeleteSceneTool.execute()
    - Input: {sceneId, sceneName, projectId, remainingScenes?}
    - No service calls (just returns intent)
    - Output: {success, deletedSceneId, deletedSceneName, reasoning, chatResponse: undefined}
```

### Issues Found
1. **Minimal Processing**: Tool just formats the intent, no actual deletion
2. **Display Name Conversion**: Happens in tool, not service

---

## Tool 4: FixBrokenScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: brokenCode, errorMessage, sceneId, sceneName, projectId
  → FixBrokenSceneTool.execute()
    - Input: {brokenCode, errorMessage, sceneId, sceneName, projectId}
    → AIClientService.generateResponse() [DIRECT CALL]
      - Model: getFixBrokenSceneModel()
      - System prompt: getSystemPrompt('FIX_BROKEN_SCENE')
      - Response format: JSON
    → validateFixedCode() [internal method]
      - Uses Sucrase transform for validation
    → generateFallbackFix() [if needed]
    - Output: {fixedCode, sceneName, sceneId, duration, reasoning, changesApplied, chatResponse: undefined, debug?}
```

### Issues Found
1. **Different Field Names**:
   - Tool outputs `fixedCode` not `sceneCode`
   - Tool outputs `changesApplied` not `changes`
   
2. **Direct AI Usage**: 
   - Calls AIClientService directly, not through other services
   - Has own prompt building logic

---

## Tool 5: AnalyzeImage

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: projectId, imageUrls
  → AnalyzeImageTool.execute()
    - Input: {imageUrls[], projectId}
    → AIClientService.generateVisionResponse() [DIRECT CALL]
      - Model: getAnalyzeImageModel() 
      - Includes base64 image data
    - Output: {analysis, imageCount, projectId, reasoning}
```

### Issues Found
1. **No Field Transformations**: Clean pass-through
2. **Direct AI Usage**: Appropriate for analysis tool

---

## Tool 6: CreateSceneFromImage

### Complete Flow  
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: imageUrls, userPrompt, projectId, sceneNumber, visionAnalysis
  → CreateSceneFromImageTool.execute()
    - Input: {imageUrls[], userPrompt, projectId, sceneNumber?, visionAnalysis?}
    → CodeGeneratorService.generateCodeFromImage() // ✅ CORRECTED - DIRECT CALL, NO SceneBuilder
      - Input: {imageUrls, userPrompt, functionName, visionAnalysis?}
      → AIClientService.generateVisionResponse() [inside service]
        - Model: getCodeGeneratorModel() with vision
      - Output: {code, name, duration, reasoning, debug}
    - Output: {sceneCode, sceneName, duration, reasoning, chatResponse: undefined, debug?}
```

### Issues Found
1. **Bypasses Two-Step Pipeline**: Goes directly to CodeGenerator, not through SceneBuilder
2. **Field Transformations**: 
   - Service returns `code` → Tool outputs `sceneCode`
   - Service returns `name` → Tool outputs `sceneName`

---

## Tool 7: EditSceneWithImage

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: imageUrls, userPrompt, existingCode, existingName, existingDuration, projectId, sceneId
  → EditSceneWithImageTool.execute()
    - Input: {imageUrls[], userPrompt, existingCode, existingName, existingDuration, projectId, sceneId?}
    → CodeGeneratorService.editCodeWithImage() // ✅ CORRECTED METHOD NAME
      - Input: {imageUrls, existingCode, userPrompt, functionName}
      → AIClientService.generateCodeFromImages() [inside service]
        - Model: getCodeGeneratorModel() with vision
      - Output: {code, reasoning, debug}
    → analyzeChanges() [internal method]
      - Detects color, layout, typography, style changes
    - Output: {sceneCode, sceneName, duration, reasoning, changes, preserved, debug?, chatResponse: undefined}
```

### Issues Found
1. **Wrong Service Method in Docs**: Uses `editCodeWithImage()` NOT `generateCodeFromPrompt()`
2. **Field Transformations**:
   - Service returns `code` → Tool outputs `sceneCode`
   - Tool generates its own `changes` array via analysis
3. **Duration Handling**: Always keeps existing duration

---

## Tool 8: ChangeDuration

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: sceneId, durationSeconds, projectId
  → ChangeDurationTool.execute()
    - Input: {sceneId, durationSeconds, projectId}
    → db.query.scenes.findMany() [DIRECT DB ACCESS]
    → db.update(scenes) [DIRECT DB UPDATE]
    - Output: {success, oldDurationFrames, newDurationFrames, oldDurationSeconds, newDurationSeconds, reasoning, chatResponse: undefined}
```

### Issues Found
1. **Direct Database Access**: Only tool that modifies DB directly
2. **No Service Layer**: Bypasses all services
3. **Different Output Structure**: Returns frame/second pairs

---

## Summary of Key Issues

### 1. Inconsistent Field Names Across System
- **Database Schema**: `tsxCode`, `name`, `duration`
- **Services Output**: `code`, `name`, `duration`  
- **Tools Output**: `sceneCode`, `sceneName`, `duration`
- **Special Cases**: `fixedCode` (FixBrokenScene), `changesApplied` vs `changes`

### 2. Service Usage Patterns
- **Two-Step Pipeline**: Only AddScene uses SceneBuilder → Layout → Code
- **Direct Code Generation**: CreateSceneFromImage, EditSceneWithImage bypass SceneBuilder
- **Direct AI Calls**: FixBrokenScene, AnalyzeImage call AIClientService directly
- **Direct DB Access**: ChangeDuration bypasses all services

### 3. Unnecessary Transformations
- Every tool transforms field names instead of using consistent names
- Display name conversion happens in tools, not services
- JSON stringification of layoutJson in AddScene

### 4. Missing Standardization
- No base interfaces for tool inputs/outputs
- No standard service contracts
- Each tool implements its own patterns

## Recommendations

### Phase 1: Remove ConversationalResponse ✅ COMPLETE
- All tools now return `chatResponse: undefined`
- Orchestrator handles chat response generation

### Phase 2: Standardize Field Names
- Change all services to output `tsxCode`, `name`, `duration`
- Remove all field transformations in tools
- Update FixBrokenScene to use `tsxCode` not `fixedCode`

### Phase 3: Create Base Interfaces
- Define standard tool input/output contracts
- Define standard service response contracts
- Enforce through TypeScript

### Phase 4: Standardize Service Usage
- Move EditSceneWithImage to use DirectCodeEditor (like EditScene)
- Consider if image tools should use two-step pipeline
- Move display name conversion to services

### Phase 5: Update Brain System Prompt
- Document the standardized field names
- Clarify when to use each tool
- Update examples with correct field names