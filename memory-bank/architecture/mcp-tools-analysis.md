# MCP Tools Analysis

This document provides a comprehensive analysis of all MCP (Model Context Protocol) tools in the `/src/server/services/mcp/tools/` directory.

## Overview

The MCP tools follow a consistent pattern using the `BaseMCPTool` class which implements:
- Input validation using Zod schemas
- Standardized result format with success/error handling
- Execution time tracking and metadata
- Tool registry for centralized management

## Base Infrastructure

### Base Tool Pattern (`base.ts`)

**Key Interfaces:**
- `MCPTool<TInput, TOutput>`: Core tool interface with name, description, inputSchema, and run method
- `MCPResult<T>`: Standardized result format with success, data, error, and metadata
- `MCPContext`: Execution context with userId, projectId, sessionId
- `BaseMCPTool<TInput, TOutput>`: Abstract base class that handles validation and error handling

**Tool Registry:**
- `MCPToolRegistry`: Manages tool registration and retrieval
- Provides tool definitions for LLM function calling
- HMR-safe singleton pattern in `registry.ts`

## Tool Analysis

### 1. AddScene Tool (`addScene.ts`)

**Purpose:** Create a new scene from user prompt

**Input Interface:**
```typescript
{
  userPrompt: string         // User's description
  projectId: string          // Project ID
  sceneNumber?: number       // Optional position
  storyboardSoFar?: any[]    // Existing scenes context
  replaceWelcomeScene?: boolean
  visionAnalysis?: any       // From analyzeImage tool
}
```

**Output Interface:**
```typescript
{
  sceneCode: string         // Generated scene code
  sceneName: string         // Scene name
  duration: number          // Duration in frames
  reasoning: string         // AI reasoning
  layoutJson?: string       // Scene layout spec
  debug?: any              // Debug info
  chatResponse?: string    // User-facing response
  replacedWelcomeScene?: boolean
}
```

**Services Used:**
- `~/server/services/generation/sceneBuilder.service` - Two-step code generation
- `~/server/services/ai/conversationalResponse.service` - Chat responses
- `~/server/db` - Database access for previous scene JSON

**Key Transformations:**
- Checks for welcome scene replacement
- Uses previous scene JSON for style consistency
- Supports progress callbacks for real-time updates
- Generates conversational response with scene details

### 2. ChangeDuration Tool (`changeDuration.ts`)

**Purpose:** Change scene duration without modifying animation code

**Input Interface:**
```typescript
{
  sceneId: string           // Scene to modify
  durationSeconds: number   // New duration in seconds
  projectId: string         // Project context
}
```

**Output Interface:**
```typescript
{
  success: boolean
  oldDurationFrames: number
  newDurationFrames: number
  oldDurationSeconds: number
  newDurationSeconds: number
  reasoning: string
  chatResponse: string
}
```

**Services Used:**
- `~/server/db` - Database operations
- `~/server/db/schema` - Scene schema

**Key Transformations:**
- Converts seconds to frames (30fps)
- Updates database directly
- Preserves all animation code
- Simple duration-only modification

### 3. CreateSceneFromImage Tool (`createSceneFromImage.ts`)

**Purpose:** Create motion graphics scene from uploaded images

**Input Interface:**
```typescript
{
  imageUrls: string[]       // Image URLs to recreate
  userPrompt: string        // User context
  projectId: string         // Project ID
  sceneNumber?: number      // Optional position
  visionAnalysis?: any      // Pre-computed vision analysis
}
```

**Output Interface:**
```typescript
{
  sceneCode: string
  sceneName: string
  duration: number
  reasoning: string
  debug?: any
  chatResponse?: string
}
```

**Services Used:**
- `~/server/services/generation/codeGenerator.service` - Image-to-code generation
- `~/server/services/ai/conversationalResponse.service` - Chat responses

**Key Transformations:**
- Direct image-to-code generation
- Uses vision analysis if provided
- Generates function names with timestamps
- Creates conversational response with image count

### 4. DeleteScene Tool (`deleteScene.ts`)

**Purpose:** Delete a scene from the project

**Input Interface:**
```typescript
{
  sceneId: string           // Scene to delete
  sceneName: string         // Scene name
  projectId: string         // Project ID
  remainingScenes?: {       // Scenes after deletion
    id: string
    name: string
  }[]
}
```

**Output Interface:**
```typescript
{
  success: boolean
  deletedSceneId: string
  deletedSceneName: string  // User-friendly name
  reasoning: string
  chatResponse?: string
}
```

**Services Used:**
- `~/server/services/ai/conversationalResponse.service` - Chat responses

**Key Transformations:**
- Converts technical names to display names (e.g., "Scene1_abc123" → "Scene 1")
- Generates contextual chat response
- No actual deletion (handled by orchestrator)

### 5. EditScene Tool (`editScene.ts`)

**Purpose:** Edit existing scene based on user modifications

**Input Interface:**
```typescript
{
  userPrompt: string        // Modification description
  existingCode: string      // Current code
  existingName: string      // Current name
  existingDuration: number  // Current duration
  projectId: string
  sceneId?: string
  storyboardSoFar?: any[]   // Context
  chatHistory?: { role: string, content: string }[]
  editComplexity?: "surgical" | "creative" | "structural"
  visionAnalysis?: any      // For image-guided editing
}
```

**Output Interface:**
```typescript
{
  sceneCode: string
  sceneName: string         // Display name
  duration: number
  reasoning: string
  changes: string[]         // What changed
  preserved: string[]       // What was preserved
  debug?: any
  chatResponse?: string
}
```

**Services Used:**
- `~/server/services/generation/directCodeEditor.service` - Surgical code modifications
- `~/server/services/ai/conversationalResponse.service` - Chat responses

**Key Transformations:**
- Converts technical names to display names
- Detects duration changes from prompts
- Supports different edit complexity levels
- Preserves existing functionality while making changes

### 6. EditSceneWithImage Tool (`editSceneWithImage.ts`)

**Purpose:** Edit existing scene using images as styling reference

**Input Interface:**
```typescript
{
  imageUrls: string[]       // Reference images
  userPrompt: string        // Change description
  existingCode: string
  existingName: string
  existingDuration: number
  projectId: string
  sceneId?: string
}
```

**Output Interface:**
```typescript
{
  sceneCode: string
  sceneName: string         // Display name
  duration: number          // Preserved
  reasoning: string
  changes: string[]         // Detected changes
  preserved: string[]
  debug?: any
  chatResponse?: string
}
```

**Services Used:**
- `~/server/services/generation/codeGenerator.service` - Image-guided code editing
- `~/server/services/ai/conversationalResponse.service` - Chat responses

**Key Transformations:**
- Applies visual styling from images
- Analyzes code changes (colors, layout, typography, styles)
- Preserves scene structure and animations
- Generates detailed change analysis

### 7. FixBrokenScene Tool (`fixBrokenScene.ts`)

**Purpose:** Automatically analyze and fix broken scene code

**Input Interface:**
```typescript
{
  brokenCode: string        // Broken code
  errorMessage: string      // Error details
  sceneId: string
  sceneName: string
  projectId: string
}
```

**Output Interface:**
```typescript
{
  fixedCode: string
  sceneName: string         // Display name
  sceneId: string
  duration: number          // Default 180 frames
  reasoning: string
  changesApplied: string[]
  chatResponse?: string
  debug?: any
}
```

**Services Used:**
- `~/server/services/ai/aiClient.service` - AI client for code fixing
- `~/config/models.config` - Model configuration
- `~/config/prompts.config` - System prompts
- `~/server/services/ai/conversationalResponse.service` - Chat responses
- `sucrase` - Code compilation validation

**Key Transformations:**
- Robust JSON extraction from LLM responses
- Code validation with Sucrase
- Multiple fix strategies (smart, fallback, emergency)
- Preserves extracted text content
- Validates fixed code before returning

### 8. AnalyzeImage Tool (`analyzeImage.ts`)

**Purpose:** Extract layout, colors, typography, and style from images

**Input Interface:**
```typescript
{
  imageUrls: string[]       // 1-2 images max
  userPrompt?: string       // Optional context
  projectId: string
  traceId?: string          // For debugging
}
```

**Output Interface:**
```typescript
{
  layoutJson: any           // Scene layout structure
  palette: string[]         // Hex colors
  typography: string        // Font description
  mood: string              // Style mood
  animations?: string[]     // Suggested animations
  rawModelResponse: string  // Debug info
  schemaVersion: "v1"
  processingTimeMs: number
}
```

**Services Used:**
- `~/server/services/ai/aiClient.service` - Vision model calls
- `~/config/models.config` - Model configuration
- `~/config/prompts.config` - Vision prompts

**Key Transformations:**
- Extremely lenient JSON parsing (handles truncation)
- Multiple extraction strategies (JSON, regex, fallbacks)
- Builds minimal valid layout from partial data
- Extracts colors, typography, mood from various formats
- Comprehensive fallback generation

## Common Patterns

### 1. Name Transformation
Most tools convert technical scene names to user-friendly display names:
```typescript
const displayName = sceneName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || sceneName;
```

### 2. Conversational Responses
All tools generate user-facing chat responses using the `conversationalResponseService`.

### 3. Error Handling
All tools inherit standardized error handling from `BaseMCPTool`:
- Validation errors (Zod)
- Execution errors
- Metadata tracking

### 4. Progress Tracking
Some tools (like `addScene`) support progress callbacks for real-time UI updates.

### 5. Vision Integration
Multiple tools accept `visionAnalysis` from the `analyzeImage` tool for image-guided operations.

## Registry Management

The `registry.ts` file implements an HMR-safe singleton pattern:
- Uses global variable to persist across hot reloads
- Registers all tools on initialization
- Provides centralized access to all MCP tools

## Usage Flow

1. Brain orchestrator selects appropriate tool based on user intent
2. Tool validates input using Zod schema
3. Tool executes business logic using various services
4. Tool returns standardized result with metadata
5. Orchestrator processes result and updates UI/database