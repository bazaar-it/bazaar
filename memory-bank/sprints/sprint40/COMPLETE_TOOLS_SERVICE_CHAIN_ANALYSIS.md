# Complete Tools Service Chain Analysis

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
    → SceneBuilderService.buildScene()
      - Input: {userPrompt, projectId, sceneNumber?, previousSceneJson?, visionAnalysis?}
      → LayoutGeneratorService.generateLayout()
        - Input: {userPrompt, previousLayout?, visionAnalysis?}
        - Output: {layoutSpec (object), reasoning}
      → CodeGeneratorService.generateTwoStepCode()
        - Input: {layoutJson, userPrompt, functionName}
        - Output: {code, name, duration, reasoning, debug}
      → DurationExtractor.analyzeDuration()
        - Input: code (string)
        - Output: {frames, seconds}
      - Output: {code, name, duration, reasoning, layoutJson, debug}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt, operation: 'create', sceneName, sceneNumber}
      - Output: string (chat message)
    - Output: {sceneCode, sceneName, duration, reasoning, layoutJson?, debug?, chatResponse?, replacedWelcomeScene?}
```

### Issues Found
1. **Field Name Transformations**:
   - Service returns `code` → Tool outputs `sceneCode`
   - Service returns `name` → Tool outputs `sceneName`
   - Service returns object `layoutJson` → Tool outputs string `JSON.stringify(layoutJson)`

2. **Optional Fields Inconsistency**:
   - `sceneNumber` optional in tool but required for proper ordering
   - `visionAnalysis` passed through multiple layers but not always used

3. **Extra Processing**:
   - Technical name conversion happens in tool, not service
   - ConversationalResponse adds extra LLM call

---

## Tool 2: EditScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: projectId, sceneId, existingCode, existingName, existingDuration, storyboardSoFar, chatHistory, editComplexity, visionAnalysis
  → EditSceneTool.execute()
    - Input: {userPrompt, existingCode, existingName, existingDuration, projectId, sceneId?, storyboardSoFar?, chatHistory?, editComplexity?, visionAnalysis?}
    → DirectCodeEditorService.editCode()
      - Input: {userPrompt, existingCode, existingName, chatHistory?, editComplexity?, visionAnalysis?}
      → AIClient.generateStructuredOutput()
        - Uses different prompts based on editComplexity
      - Output: {code, changes[], preserved[], reasoning, newDurationFrames?, debug}
    → DurationExtractor.analyzeDuration()
      - Input: code (string)
      - Output: {frames, seconds}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt, operation: 'edit', sceneName, changes}
      - Output: string (chat message)
    - Output: {sceneCode, sceneName, duration, reasoning, changes[], preserved[], debug?, chatResponse?}
```

### Issues Found
1. **Input Naming Inconsistency**:
   - Tool expects `existingCode`, `existingName`, `existingDuration`
   - Could be simplified to `code`, `name`, `duration` with context

2. **EditComplexity Handling**:
   - Optional but affects entire flow
   - Service uses it to select different AI prompts

3. **Duration Extraction Duplication**:
   - Both tool and service extract duration
   - Should be handled in one place

---

## Tool 3: DeleteScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: sceneId, sceneName, projectId, remainingScenes
  → DeleteSceneTool.execute()
    - Input: {sceneId, sceneName, projectId, remainingScenes?}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt: "delete scene", operation: 'delete', sceneName}
      - Output: string (chat message)
    - Output: {success: true, deletedSceneId, deletedSceneName, reasoning, chatResponse?}
```

### Issues Found
1. **Different Output Structure**:
   - Returns `success` boolean unlike other tools
   - Uses `deletedSceneId` instead of just `sceneId`

2. **No Service Layer**:
   - Direct tool implementation
   - Only uses ConversationalResponse

3. **RemainingScenes**:
   - Calculated in orchestrator
   - Not actually used by tool

---

## Tool 4: FixBrokenScene

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: brokenCode, errorMessage, sceneId, sceneName, projectId
  → FixBrokenSceneTool.execute()
    - Input: {brokenCode, errorMessage, sceneId, sceneName, projectId}
    → AIClient.generateStructuredOutput()
      - Direct AI call with specific prompt
      - Output: {fixedCode, reasoning, changesApplied[]}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt: "fix scene", operation: 'fix', sceneName}
      - Output: string (chat message)
    - Output: {fixedCode, sceneName, sceneId, duration, reasoning, changesApplied[], chatResponse?, debug?}
```

### Issues Found
1. **Unique Field Names**:
   - Input: `brokenCode` (not `existingCode`)
   - Output: `fixedCode` (not `sceneCode`)
   - Output: `changesApplied` (not `changes`)

2. **SceneId in Output**:
   - Only tool that includes sceneId in output
   - Inconsistent with others

3. **Duration Calculation**:
   - Extracts from fixed code
   - Uses fallback from existing scene

---

## Tool 5: AnalyzeImage

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: imageUrl (from imageUrls[0]), userPrompt, projectId
  → AnalyzeImageTool.execute()
    - Input: {imageUrl, analysisPrompt?}
    → AIClient.generateStructuredOutput()
      - Vision model analysis
      - Output: complex analysis object
    - Output: {analysis: {description, elements[], colors[], composition, mood, suggestedAnimations?}, reasoning, debug?}
```

### Issues Found
1. **Input Field Mismatch**:
   - Orchestrator provides `imageUrl` (singular)
   - Other image tools use `imageUrls` (array)

2. **No Chat Response**:
   - Doesn't use ConversationalResponse
   - Returns raw analysis data

3. **Rarely Used**:
   - Brain prefers direct image operations
   - Could be deprecated or hidden

---

## Tool 6: CreateSceneFromImage

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: imageUrls, userPrompt, projectId, sceneNumber
  → CreateSceneFromImageTool.execute()
    - Input: {imageUrls[], userPrompt, projectId, sceneNumber?, visionAnalysis?}
    → SceneBuilderService.buildScene()
      - Input: {userPrompt, projectId, sceneNumber?, visionAnalysis?, imageUrls}
      → LayoutGeneratorService.generateLayout()
        - With image context
      → CodeGeneratorService.generateTwoStepCode()
        - With image references
      - Output: {code, name, duration, reasoning, layoutJson, debug}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt, operation: 'create', sceneName}
      - Output: string (chat message)
    - Output: {sceneCode, sceneName, duration, reasoning, debug?, chatResponse?}
```

### Issues Found
1. **Missing LayoutJson**:
   - SceneBuilder returns it
   - Tool doesn't include in output
   - Inconsistent with AddScene

2. **Image Context Flow**:
   - imageUrls passed through multiple layers
   - visionAnalysis optional but not always clear when used

---

## Tool 7: EditSceneWithImage

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: imageUrls, userPrompt, existingCode, existingName, existingDuration, projectId, sceneId
  → EditSceneWithImageTool.execute()
    - Input: {imageUrls[], userPrompt, existingCode, existingName, existingDuration, projectId, sceneId?}
    → CodeGeneratorService.generateCodeFromPrompt()
      - Input: {prompt (includes image context), functionName}
      - Output: {code, name, duration, reasoning, debug}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt, operation: 'edit', sceneName}
      - Output: string (chat message)
    - Output: {sceneCode, sceneName, duration, reasoning, changes[], preserved[], debug?, chatResponse?}
```

### Issues Found
1. **Different Service Path**:
   - Uses CodeGenerator directly (not DirectCodeEditor)
   - Complete regeneration, not incremental edit

2. **Changes/Preserved**:
   - Tool generates these, not service
   - Generic messages, not actual diff

3. **Image Context**:
   - Built into prompt string
   - Not structured data

---

## Tool 8: ChangeDuration

### Complete Flow
```
BrainOrchestrator
  → prepareToolInput()
    - Adds: sceneId, durationSeconds (extracted from prompt), projectId
  → ChangeDurationTool.execute()
    - Input: {sceneId, durationSeconds, projectId}
    → ConversationalResponseService.generateResponse()
      - Input: {userPrompt, operation: 'changeDuration', sceneName, oldDuration, newDuration}
      - Output: string (chat message)
    - Output: {success: true, oldDurationFrames, newDurationFrames, oldDurationSeconds, newDurationSeconds, reasoning, chatResponse}
```

### Issues Found
1. **Input Units Mismatch**:
   - Input: `durationSeconds`
   - Output: both frames and seconds
   - Other tools use frames only

2. **Required ChatResponse**:
   - Only tool where chatResponse is NOT optional
   - Inconsistent with others

3. **No Code Modification**:
   - Database-only operation
   - Different from other "edit" operations

---

## Summary of Inconsistencies

### 1. Field Name Inconsistencies
| Layer | Code Field | Name Field | Duration Field | Changes Field |
|-------|------------|------------|----------------|---------------|
| Database | `tsxCode` | `name` | `duration` | - |
| Services | `code` | `name` | `duration`/`newDurationFrames` | `changes` |
| Tools Output | `sceneCode`/`fixedCode` | `sceneName` | `duration` | `changes`/`changesApplied` |
| Orchestrator | `existingCode`/`brokenCode` | `existingName`/`sceneName` | `existingDuration` | - |

### 2. Service Usage Patterns
- **SceneBuilder**: Used by AddScene, CreateSceneFromImage
- **DirectCodeEditor**: Used by EditScene only
- **CodeGenerator**: Used by EditSceneWithImage (should use DirectCodeEditor?)
- **AIClient**: Used directly by FixBrokenScene, AnalyzeImage
- **ConversationalResponse**: Used by ALL except AnalyzeImage (redundant)

### 3. Input Preparation Inconsistencies
- **Scene identification**: `sceneId`, `targetSceneId`, scene object lookup
- **Image handling**: `imageUrl` (singular) vs `imageUrls` (array)
- **Context passing**: `storyboardSoFar`, `chatHistory`, `visionAnalysis` - not consistently used
- **Duration units**: Seconds in input, frames in processing, both in output

### 4. Output Structure Variations
- **Success indicators**: Some use `success: boolean`, others don't
- **Operation-specific fields**: `deletedSceneId`, `fixedCode`, unique to specific tools
- **Optional fields**: `chatResponse` optional except in ChangeDuration
- **Debug information**: Inconsistently included

---

## Recommended Standardization

### 1. Base Tool Input Interface
```typescript
interface BaseToolInput {
  projectId: string;
  userPrompt: string;
}

interface SceneToolInput extends BaseToolInput {
  sceneId?: string;  // For operations on existing scenes
}

interface ImageToolInput extends BaseToolInput {
  imageUrls: string[];  // Always array, even for single image
  visionAnalysis?: VisionAnalysisResult;
}
```

### 2. Base Tool Output Interface
```typescript
interface BaseToolOutput {
  operation: 'create' | 'update' | 'delete';
  reasoning: string;
  chatResponse?: string;  // Optional - Brain can add if missing
  debug?: any;
}

interface SceneToolOutput extends BaseToolOutput {
  scene: {
    id?: string;
    projectId: string;
    order: number;
    name: string;        // NOT sceneName
    tsxCode: string;     // NOT code or sceneCode
    props?: any;
    duration: number;    // Always in frames
    layoutJson?: string; // Always as string
  };
}

interface DeleteToolOutput extends BaseToolOutput {
  operation: 'delete';
  deletedSceneId: string;
}
```

### 3. Base Service Interfaces
```typescript
interface BaseServiceOutput {
  reasoning: string;
  debug?: any;
}

interface SceneServiceOutput extends BaseServiceOutput {
  name: string;
  tsxCode: string;
  duration: number;  // Always in frames
}

interface SceneBuildOutput extends SceneServiceOutput {
  layoutJson: any;  // Object, not string
}

interface SceneEditOutput extends SceneServiceOutput {
  changes: string[];
  preserved: string[];
}
```

---

## Implementation Plan

### Phase 1: Remove ConversationalResponse (1 day)
1. Remove from all tool imports
2. Delete ConversationalResponse calls from each tool
3. Make `chatResponse` optional in all tool outputs
4. Update Brain to generate chat responses in main flow
5. Test each tool still works

### Phase 2: Standardize Field Names (2 days)
1. Update all services to output `tsxCode` instead of `code`
2. Update all tools to expect `tsxCode` from services
3. Remove field name transformations in tools
4. Update Brain's prepareToolInput to use consistent names
5. Update TypeScript interfaces

### Phase 3: Create Base Interfaces (1 day)
1. Create base tool interfaces in `/lib/types/ai/tool-contracts.ts`
2. Create base service interfaces in `/lib/types/api/service-contracts.ts`
3. Update all tools to implement base interfaces
4. Update all services to implement base interfaces
5. Add TypeScript strict checking

### Phase 4: Standardize Service Usage (2 days)
1. Make EditSceneWithImage use DirectCodeEditor (not CodeGenerator)
2. Standardize image handling (always arrays)
3. Remove redundant duration extraction
4. Consolidate scene identification patterns

### Phase 5: Update Brain System Prompt (1 day)
1. Add exact field names to prompt
2. Clarify tool selection criteria
3. Remove references to unused patterns
4. Add examples with correct field names

---

## Critical Implementation Notes

### 1. Database Field Names Are Truth
- Always use `tsxCode`, `name`, `duration`
- These are the canonical names throughout the system
- No variations or aliases

### 2. Remove All Transformations
- Services output exactly what database expects
- Tools pass through without transformation
- Frontend receives consistent format

### 3. Single Update Path
- All updates go through videoState.ingest()
- No special cases or alternate paths
- Consistent envelope format

### 4. Test After Each Phase
- Run evaluation suite after each phase
- Ensure no regressions
- Document any issues found

### 5. Backwards Compatibility
- Keep old field names during transition
- Add deprecation warnings
- Remove after full migration

---

## Success Criteria

✅ **Phase 1 Success**: All tools work without ConversationalResponse, 30% speed improvement
✅ **Phase 2 Success**: No field transformations in code, all names match database
✅ **Phase 3 Success**: All tools/services implement base interfaces, TypeScript catches errors
✅ **Phase 4 Success**: Consistent service usage patterns, no redundant processing
✅ **Phase 5 Success**: Brain selects tools correctly with new field names

---

## Conclusion

The current system has grown organically with many inconsistencies. By following this plan, we'll achieve:
- **30% performance improvement** (removing ConversationalResponse)
- **50% less code** (removing transformations)
- **Type safety** (base interfaces)
- **Maintainability** (consistent patterns)
- **Extensibility** (new tools follow same pattern)

The key is to implement in phases, testing thoroughly after each phase to ensure stability.