# Bazaar-Vid Service Hierarchy Analysis

## Overview
This document analyzes the complete service call chains in the Bazaar-Vid codebase, documenting field name inconsistencies and service dependencies.

## Service Call Chains

### 1. Brain Orchestrator → MCP Tools → Services

#### AddScene Flow
```
BrainOrchestrator 
  → addSceneTool.run({
      userPrompt,
      projectId,
      sceneNumber,
      storyboardSoFar,
      visionAnalysis
    })
  → SceneBuilderService.generateTwoStepCode({
      userPrompt,
      projectId,
      sceneNumber,
      previousSceneJson,
      visionAnalysis
    })
    → LayoutGeneratorService.generateLayout({
        userPrompt,
        projectId,
        previousSceneJson,
        isFirstScene,
        visionAnalysis
      })
    → CodeGeneratorService.generateCode({
        layoutJson,     // From LayoutGenerator
        userPrompt,
        functionName
      })
  → ConversationalResponseService.generateContextualResponse()
```

**Field Name Issues:**
- Tool returns: `sceneCode`, `sceneName`, `duration`
- Services use: `code`, `name`, `duration`
- Brain expects: `sceneCode`, `sceneName` from tool output

#### EditScene Flow
```
BrainOrchestrator
  → editSceneTool.run({
      userPrompt,
      existingCode,
      existingName,
      existingDuration,
      projectId,
      sceneId,
      chatHistory,
      editComplexity,
      visionAnalysis
    })
  → DirectCodeEditorService.editCode({
      userPrompt,
      existingCode,
      existingName,
      chatHistory,
      editComplexity,
      visionAnalysis
    })
  → ConversationalResponseService.generateContextualResponse()
```

**Field Name Issues:**
- Tool returns: `sceneCode`, `sceneName`, `duration`
- Service returns: `code` (not `sceneCode`)
- Brain expects: `sceneCode` from tool output

### 2. Field Name Mapping

#### Scene Code Field
- **Tools output**: `sceneCode`
- **Services output**: `code`
- **Database schema**: `tsxCode`
- **Frontend expects**: `tsxCode`

#### Scene Name Field
- **Tools output**: `sceneName`
- **Services output**: `name`
- **Database schema**: `name`
- **Frontend expects**: `name`

#### Duration Field
- **Consistent across all layers**: `duration`

### 3. Service Dependencies

#### SceneBuilderService
- Depends on:
  - LayoutGeneratorService
  - CodeGeneratorService
- Purpose: Orchestrates the two-step generation pipeline

#### LayoutGeneratorService
- Depends on:
  - AIClientService
- Inputs: User prompt, vision analysis
- Outputs: JSON layout specification

#### CodeGeneratorService
- Depends on:
  - AIClientService
- Inputs: Layout JSON, user prompt
- Outputs: React/Remotion code
- Also has methods for:
  - `generateCodeFromImage()` - Direct image to code
  - `editCodeWithImage()` - Image-guided editing

#### DirectCodeEditorService
- Depends on:
  - AIClientService
- Has three modes:
  - Surgical: Minimal, precise changes
  - Creative: Style improvements
  - Structural: Layout changes
- Unified methods combine analysis and modification

#### ConversationalResponseService
- Depends on:
  - AIClientService
  - Database (for message storage)
- Generates user-friendly chat responses
- Handles clarification questions

### 4. Vision Analysis Integration

Vision analysis flows through the system:
1. `analyzeImageTool` creates vision analysis
2. Brain passes `visionAnalysis` to scene creation/editing tools
3. Tools pass it to services:
   - SceneBuilder → LayoutGenerator (for vision-driven layouts)
   - EditScene → DirectCodeEditor (for vision context)

### 5. Critical Issues Found

1. **Field Name Inconsistency**:
   - Tools return `sceneCode` but services return `code`
   - This requires mapping at the tool level
   - Example in editSceneTool: `sceneCode: result.code`

2. **System Prompt Awareness**:
   - Brain's system prompt (BRAIN_ORCHESTRATOR) lists tool names and capabilities
   - But doesn't specify exact field names tools expect/return
   - This could lead to mismatches

3. **Service Layering**:
   - SceneBuilder adds an orchestration layer
   - Some tools bypass it (e.g., fixBrokenScene goes direct to service)
   - Inconsistent abstraction levels

4. **Progress Callbacks**:
   - AddSceneTool has progress callback support
   - Other tools don't have this feature
   - Inconsistent progress reporting

### 6. Recommendations

1. **Standardize Field Names**:
   - Use consistent names across all layers
   - Either `code`/`name` or `sceneCode`/`sceneName` everywhere
   - Update database schema if needed

2. **Update System Prompts**:
   - Add field specifications to BRAIN_ORCHESTRATOR prompt
   - Specify exact input/output field names for each tool

3. **Consistent Service Usage**:
   - All scene generation should go through SceneBuilder
   - Direct service calls should be avoided in tools

4. **Type Safety**:
   - Use shared TypeScript interfaces for tool outputs
   - Ensure field names are enforced by types

5. **Progress Reporting**:
   - Standardize progress callbacks across all tools
   - Add to base tool class if needed

## Conclusion

The service hierarchy is well-structured but suffers from field name inconsistencies between layers. The main issue is the `code`/`sceneCode` and `name`/`sceneName` mismatch between services and tools. This is currently handled by manual mapping in each tool, but should be standardized for maintainability.