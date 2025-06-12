# MCP Tools Meta-Analysis

## Current Tool Architecture Issues

### 1. Tool Proliferation (8 Tools)
We currently have 8 separate tools, many doing similar operations:
- **Create operations**: addScene, createSceneFromImage
- **Update operations**: editScene, editSceneWithImage, changeDuration, fixBrokenScene
- **Delete operations**: deleteScene
- **Analysis operations**: analyzeImage

### 2. Service Chain Complexity

#### Complete Service Call Chains

**AddScene Chain**:
```
BrainOrchestrator 
  → AddSceneTool (uses "sceneCode", "sceneName")
    → SceneBuilderService (returns "code", "name")
      → LayoutGeneratorService (returns layoutJson object)
      → CodeGeneratorService (returns "code", "name")
        → AIClient (OpenAI)
      → DurationExtractor (analyzes "code")
    → ConversationalResponseService
      → AIClient (OpenAI) - EXTRA LLM CALL!
```

**EditScene Chain**:
```
BrainOrchestrator
  → EditSceneTool (uses "sceneCode", "sceneName")
    → DirectCodeEditorService (returns "code", "changes")
      → AIClient (OpenAI)
    → DurationExtractor
    → ConversationalResponseService
      → AIClient (OpenAI) - EXTRA LLM CALL!
```

### 3. Field Name Inconsistencies Through Layers

| Layer | Code Field | Name Field | Duration Field |
|-------|------------|------------|----------------|
| Database | `tsxCode` | `name` | `duration` |
| Services | `code` | `name` | `duration` |
| Tools Output | `sceneCode` | `sceneName` | `duration` |
| Frontend Expects | `tsxCode` | `name` | `duration` |

### 4. Conversational Response Analysis

**Current Issue**: Every tool calls `conversationalResponseService`, which:
1. Makes a separate LLM call (GPT-4o-mini)
2. Adds ~1-2 seconds latency
3. Creates redundant AI processing

**Evidence from Code**:
```typescript
// In tools:
const chatResponse = await this.conversationalResponse.generateResponse({
  userPrompt: input.userPrompt,
  operation: 'create',
  sceneName: displaySceneName,
  // ...
});
```

**But the Brain Orchestrator already has context** and could generate responses directly!

## Proposed Architecture Simplification

### Option 1: Consolidate to 3 Core Tools

```typescript
// Base interfaces
interface BaseServiceOutput {
  tsxCode: string;      // Match database
  name: string;         // Match database
  duration: number;     // Match database
  reasoning: string;
  debug?: any;
}

interface SceneBuildOutput extends BaseServiceOutput {
  layoutJson?: any;
}

interface SceneEditOutput extends BaseServiceOutput {
  changes: string[];
  preserved: string[];
}

// Tools
class CreateSceneTool {
  // Handles: addScene, createSceneFromImage
  // Logic: if (imageUrls) { /* image logic */ } else { /* text logic */ }
}

class UpdateSceneTool {
  // Handles: editScene, editSceneWithImage, changeDuration, fixBrokenScene
  // Logic: Switch on update type
}

class DeleteSceneTool {
  // Handles: deleteScene
}
```

### Option 2: Keep Specialized Tools but Standardize

```typescript
// Common base output for ALL tools
interface SceneToolOutput {
  scene: {
    id?: string;
    projectId: string;
    order: number;
    name: string;        // Database field name
    tsxCode: string;     // Database field name
    props?: any;
    duration: number;
    layoutJson?: string;
  };
  operation: 'create' | 'update' | 'delete';
  reasoning: string;
  chatResponse?: string;  // Optional - Brain can add if missing
  debug?: any;
}

// All tools extend BaseSceneTool<TInput, SceneToolOutput>
```

## Service Interface Inheritance

```typescript
// Base for ALL services
interface BaseServiceOutput {
  reasoning: string;
  debug?: any;
}

// Scene generation services
interface SceneGenerationOutput extends BaseServiceOutput {
  tsxCode: string;      // NOT "code"
  name: string;
  duration: number;
}

// Layout service
interface LayoutGenerationOutput extends BaseServiceOutput {
  layoutJson: any;      // Object format
}

// Code editing service
interface CodeEditOutput extends SceneGenerationOutput {
  changes: string[];
  preserved: string[];
}

// Vision analysis
interface VisionAnalysisOutput extends BaseServiceOutput {
  description: string;
  elements: string[];
  colors: string[];
  composition: string;
  mood: string;
  suggestedAnimations?: string[];
}
```

## Recommendations

### 1. Remove ConversationalResponseService
- The Brain Orchestrator already has full context
- It can generate chat responses in its main LLM call
- Saves 1-2 seconds per operation
- Reduces token usage by ~30%

### 2. Standardize Field Names
- Use database field names everywhere: `tsxCode`, `name`, `duration`
- Update all services to output these names
- No transformation needed in tools

### 3. Simplify Tool Architecture
I recommend **Option 2**: Keep specialized tools but standardize their output format. This:
- Maintains clear separation of concerns
- Makes the system easier to understand
- Allows specific error handling per operation
- But ensures consistent output format

### 4. Fix Service Hierarchy
```
Tools should call services like this:
- CreateScene tools → SceneBuilderService
- UpdateScene tools → DirectCodeEditorService
- All tools → NO ConversationalResponseService
```

### 5. Update Brain System Prompt
Add explicit field specifications:
```
When calling tools, use these exact field names:
- userPrompt: The user's request
- projectId: The project ID
- existingCode: Current scene code (for edits)
- existingName: Current scene name (for edits)
- tsxCode: The React/Remotion code (NOT "code" or "sceneCode")
- name: The scene name (NOT "sceneName")
```

## Migration Priority

1. **High Priority**: Remove conversationalResponseService (immediate 30% speed improvement)
2. **High Priority**: Standardize field names to match database
3. **Medium Priority**: Update service interfaces with inheritance
4. **Low Priority**: Consider tool consolidation in future phase

## Technical Debt to Address

1. **"Technical to Display Name" Pattern**: Should be handled at the database layer with a computed field or at the API boundary, not in every tool
2. **Scene Order Management**: Should be centralized in a SceneOrderService
3. **Duration Extraction**: Should be a property of the scene entity, not calculated repeatedly