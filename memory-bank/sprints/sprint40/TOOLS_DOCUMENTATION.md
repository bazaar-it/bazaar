# MCP Tools Documentation

## Overview
This document details the current input/output interfaces for all MCP tools and their service dependencies.

## Tool Analysis

### 1. AddScene Tool
**Purpose**: Creates new scenes from user prompts

**Input Interface**:
```typescript
{
  userPrompt: string;
  projectId: string;
  sceneNumber?: number;
  storyboardSoFar?: Array<any>;
  replaceWelcomeScene?: boolean;
  visionAnalysis?: any;
}
```

**Output Interface**:
```typescript
{
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  layoutJson?: string;  // JSON string
  debug?: any;
  chatResponse?: string;
  replacedWelcomeScene?: boolean;
}
```

**Services Used**:
- `sceneBuilder.service` - Primary scene generation
- `directToVideo.service` - Welcome scene replacement
- `conversationalResponse.service` - User responses

**Data Transformations**:
- Converts technical names (e.g., "Scene1_abc123") to display names ("Scene 1")
- Serializes `layoutJson` object to string

---

### 2. ChangeDuration Tool
**Purpose**: Modifies scene duration only

**Input Interface**:
```typescript
{
  sceneId: string;
  durationSeconds: number;  // Input in seconds
  projectId: string;
}
```

**Output Interface**:
```typescript
{
  success: boolean;
  oldDurationFrames: number;
  newDurationFrames: number;
  oldDurationSeconds: number;
  newDurationSeconds: number;
  reasoning: string;
  chatResponse: string;  // NOT optional
}
```

**Services Used**:
- `conversationalResponse.service` - User responses only

**Data Transformations**:
- Converts seconds to frames (30 fps)
- No actual code modification

---

### 3. CreateSceneFromImage Tool
**Purpose**: Generates scenes based on uploaded images

**Input Interface**:
```typescript
{
  imageUrls: string[];
  userPrompt: string;
  projectId: string;
  sceneNumber?: number;
  visionAnalysis?: any;
}
```

**Output Interface**:
```typescript
{
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  debug?: any;
  chatResponse?: string;
}
```

**Services Used**:
- `sceneBuilder.service` - Scene generation with image context
- `conversationalResponse.service` - User responses

**Data Transformations**:
- Technical to display name conversion
- No `layoutJson` returned (unlike addScene)

---

### 4. DeleteScene Tool
**Purpose**: Marks scenes for deletion

**Input Interface**:
```typescript
{
  sceneId: string;
  sceneName: string;
  projectId: string;
  remainingScenes?: Array<{id: string, name: string}>;
}
```

**Output Interface**:
```typescript
{
  success: boolean;
  deletedSceneId: string;
  deletedSceneName: string;
  reasoning: string;
  chatResponse?: string;
}
```

**Services Used**:
- `conversationalResponse.service` - User responses only

**Data Transformations**:
- None (pass-through operation)

---

### 5. EditScene Tool
**Purpose**: Modifies existing scene code

**Input Interface**:
```typescript
{
  userPrompt: string;
  existingCode: string;
  existingName: string;
  existingDuration: number;
  projectId: string;
  sceneId?: string;
  storyboardSoFar?: Array<any>;
  chatHistory?: Array<{role: string, content: string}>;
  editComplexity?: "surgical" | "creative" | "structural";
  visionAnalysis?: any;
}
```

**Output Interface**:
```typescript
{
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  changes: string[];
  preserved: string[];
  debug?: any;
  chatResponse?: string;
}
```

**Services Used**:
- `directCodeEditor.service` - For all edits
- `conversationalResponse.service` - User responses

**Data Transformations**:
- Technical to display name conversion
- Extracts duration from edited code or uses existing

---

### 6. EditSceneWithImage Tool
**Purpose**: Edits scenes using image-based styling

**Input Interface**:
```typescript
{
  imageUrls: string[];
  userPrompt: string;
  existingCode: string;
  existingName: string;
  existingDuration: number;
  projectId: string;
  sceneId?: string;
}
```

**Output Interface**:
```typescript
{
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  changes: string[];
  preserved: string[];
  debug?: any;
  chatResponse?: string;
}
```

**Services Used**:
- `codeGenerator.service` - Complete regeneration with image context
- `conversationalResponse.service` - User responses

**Data Transformations**:
- Technical to display name conversion
- Complete code replacement (not incremental edit)

---

### 7. FixBrokenScene Tool
**Purpose**: Auto-repairs compilation errors

**Input Interface**:
```typescript
{
  brokenCode: string;
  errorMessage: string;
  sceneId: string;
  sceneName: string;
  projectId: string;
}
```

**Output Interface**:
```typescript
{
  fixedCode: string;  // Different field name!
  sceneName: string;
  sceneId: string;    // Included in output
  duration: number;
  reasoning: string;
  changesApplied: string[];  // Different field name!
  chatResponse?: string;
  debug?: any;
}
```

**Services Used**:
- `aiClient.service` - Direct AI interaction
- `conversationalResponse.service` - User responses

**Data Transformations**:
- Robust error extraction with multiple fallback formats
- Different output field names than other edit tools

---

### 8. AnalyzeImage Tool (Hidden)
**Purpose**: Extracts visual information from images

**Input Interface**:
```typescript
{
  imageUrls: string[];
  analysisPrompt?: string;
}
```

**Output Interface**:
```typescript
{
  analysis: {
    description: string;
    elements: string[];
    colors: string[];
    composition: string;
    mood: string;
    suggestedAnimations?: string[];
  };
  reasoning: string;
  debug?: any;
}
```

**Services Used**:
- `aiClient.service` - Vision model interaction

**Data Transformations**:
- Complex JSON parsing with fallbacks
- No scene generation

---

## Key Inconsistencies Found

### 1. Output Field Names
- Most tools: `sceneCode`
- fixBrokenScene: `fixedCode`
- Most tools: `changes`
- fixBrokenScene: `changesApplied`

### 2. Optional vs Required Fields
- Most tools: `chatResponse?: string` (optional)
- changeDuration: `chatResponse: string` (required)

### 3. Scene ID Handling
- Most tools: Don't include scene ID in output
- fixBrokenScene: Includes `sceneId` in output

### 4. Layout JSON
- addScene: Returns `layoutJson` as string
- createSceneFromImage: No `layoutJson` field
- Other tools: No `layoutJson` field

### 5. Duration Units
- changeDuration: Input in seconds, output in frames
- All others: Frames throughout

---

## MCP Base Pattern

All tools extend `BaseMCPTool` which provides:
```typescript
abstract class BaseMCPTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: z.ZodType<TInput>;
  
  abstract execute(
    input: TInput,
    context?: MCPContext
  ): Promise<TOutput>;
  
  // Handles validation, error handling, and formatting
  async run(args: unknown): Promise<MCPToolResult<TOutput>>
}
```

The base provides:
- Input validation via Zod schemas
- Error handling and formatting
- Progress tracking capability
- Standardized result wrapping

---

## Registry vs Index

**registry.ts**: 
- Singleton pattern for tool registration
- HMR-safe (survives hot reloads)
- Dynamic tool registration
- Tool lookup by name

**index.ts**:
- Re-exports all tools
- Convenience imports
- Static tool references

Both are needed: registry for dynamic runtime lookup, index for static imports.

---

## Recommendations for Standardization

1. **Unify Output Field Names**:
   - All tools should use `tsxCode` (not `sceneCode` or `fixedCode`)
   - All tools should use `changes` (not `changesApplied`)

2. **Consistent Optional Fields**:
   - Make `chatResponse` consistently optional
   - Make `layoutJson` available in all creation tools

3. **Scene Identification**:
   - All tools should include `sceneId` in output when relevant

4. **Service Return Types**:
   - `SceneBuilder` → `BuildResult`
   - `DirectCodeEditor` → `EditResult`
   - `CodeGenerator` → `GenerateResult`
   - Each with specific, typed interfaces

5. **Order Field**:
   - Database uses 0-based indexing
   - Order represents position in timeline
   - Should be managed by orchestrator, not individual tools