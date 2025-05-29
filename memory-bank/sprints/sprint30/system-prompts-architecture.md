# System Prompts Architecture - Complete Flow Documentation

## 🎯 **System Prompts Overview**

The MCP system uses multiple layers of system prompts, each with specific responsibilities. This document maps out every system prompt, their inputs/outputs, and the flow between them.

## 🧠 **Layer 1: Brain LLM Orchestrator**

### **File**: `src/server/services/brain/orchestrator.ts`
### **Responsibility**: Intent analysis and tool selection
### **Model**: GPT-4o-mini (fast, cheap for decision making)

### **System Prompt**:
```typescript
buildIntentAnalysisPrompt(): string {
  return `You are an intelligent intent analyzer for a motion graphics creation system. 
  Your job is to analyze user requests and select the appropriate tool.

  AVAILABLE TOOLS:
  - addScene: Create a NEW scene or first scene
  - editScene: Modify an EXISTING scene (including "add more X" to existing)
  - deleteScene: Remove a scene explicitly
  - askSpecify: Request clarification (max 2 per session)

  CONTEXT-AWARE TOOL SELECTION RULES:
  1. addScene: Use when user wants to create a NEW scene, or this is the first scene
  2. editScene: Use when user wants to modify an EXISTING scene (including "add more X")
  3. deleteScene: Use when user explicitly wants to remove a scene
  4. askSpecify: Use when the request is ambiguous

  ENHANCED EDIT DETECTION:
  - "add more X" = editScene (when scene exists)
  - "make it more Y" = editScene
  - "change the Z" = editScene
  - "improve the A" = editScene

  Return JSON: { "toolName": "addScene|editScene|deleteScene|askSpecify", "reasoning": "..." }`
}
```

### **Input**:
```typescript
interface OrchestrationInput {
  prompt: string;                    // User's message
  projectId: string;                 // Project context
  userId: string;                    // User context
  userContext?: {                    // Scene selection context
    sceneId?: string;
    selectedScene?: Scene;
  };
  storyboardSoFar?: Scene[];         // Existing scenes for context
}
```

### **Output**:
```typescript
interface OrchestrationResult {
  success: boolean;
  toolUsed: 'addScene' | 'editScene' | 'deleteScene' | 'askSpecify';
  reasoning: string;
  result: any;                       // Tool-specific result
  error?: string;
}
```

### **Sends To**: Selected MCP Tool (addScene, editScene, deleteScene, askSpecify)
### **Receives From**: Generation Router

---

## 🛠️ **Layer 2A: AddScene Tool**

### **File**: `src/lib/services/mcp-tools/addScene.ts`
### **Responsibility**: Create new scenes with brain context
### **Model**: GPT-4o-mini (for brain context) → GPT-4o (for code generation)

### **Brain Context System Prompt**:
```typescript
const brainContextPrompt = `You are a strategic motion graphics advisor. 
Analyze the user's request and provide intelligent guidance for scene creation.

USER REQUEST: "${userPrompt}"
PROJECT CONTEXT: ${projectId}
EXISTING SCENES: ${storyboardSoFar?.length || 0} scenes

Provide strategic guidance in this JSON format:
{
  "userIntent": "Clear description of what user wants",
  "technicalRecommendations": ["specific technical suggestions"],
  "uiLibraryGuidance": "Flowbite components to use",
  "animationStrategy": "Motion graphics approach",
  "focusAreas": ["key areas to emphasize"]
}`;
```

### **Input**:
```typescript
interface AddSceneInput {
  userPrompt: string;
  projectId: string;
  sessionId: string;
  userId: string;
  userContext: Record<string, any>;
  storyboardSoFar?: Scene[];
}
```

### **Output**:
```typescript
interface AddSceneResult {
  sceneId: string;
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  brainContext: BrainContext;
}
```

### **Sends To**: SceneBuilder Service (generateDirectCode)
### **Receives From**: Brain Orchestrator

---

## 🛠️ **Layer 2B: EditScene Tool**

### **File**: `src/lib/services/mcp-tools/editScene.ts`
### **Responsibility**: Modify existing scenes with context awareness
### **Model**: GPT-4o-mini (for brain context) → GPT-4o (for code generation)

### **Brain Context System Prompt**:
```typescript
const brainContextPrompt = `You are a strategic motion graphics editor.
Analyze the user's edit request and provide intelligent modification guidance.

EDIT REQUEST: "${userPrompt}"
EXISTING SCENE: ${existingScene.name}
CURRENT CODE: ${existingScene.code}

Provide strategic editing guidance in this JSON format:
{
  "userIntent": "What user wants to change/add",
  "technicalRecommendations": ["specific modifications needed"],
  "uiLibraryGuidance": "Flowbite components to add/modify",
  "animationStrategy": "How to enhance animations",
  "preservationAreas": ["what to keep unchanged"],
  "focusAreas": ["key areas to modify"]
}`;
```

### **Input**:
```typescript
interface EditSceneInput {
  sceneId: string;
  userPrompt: string;
  projectId: string;
  sessionId: string;
  userId: string;
  userContext: Record<string, any>;
}
```

### **Output**:
```typescript
interface EditSceneResult {
  sceneId: string;
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  brainContext: BrainContext;
  changes: string[];
}
```

### **Sends To**: SceneBuilder Service (generateEditCode)
### **Receives From**: Brain Orchestrator

---

## 🛠️ **Layer 2C: DeleteScene Tool**

### **File**: `src/lib/services/mcp-tools/deleteScene.ts`
### **Responsibility**: Remove scenes with confirmation
### **Model**: None (direct database operation)

### **No System Prompt**: Direct database operation with validation

### **Input**:
```typescript
interface DeleteSceneInput {
  sceneId: string;
  projectId: string;
  userId: string;
  confirmDeletion?: boolean;
}
```

### **Output**:
```typescript
interface DeleteSceneResult {
  deletedSceneId: string;
  success: boolean;
  message: string;
}
```

### **Sends To**: Database (direct)
### **Receives From**: Brain Orchestrator

---

## 🛠️ **Layer 2D: AskSpecify Tool**

### **File**: `src/lib/services/mcp-tools/askSpecify.ts`
### **Responsibility**: Request clarification from user
### **Model**: GPT-4o-mini (for clarification generation)

### **Clarification System Prompt**:
```typescript
const clarificationPrompt = `You are a helpful motion graphics assistant.
The user's request needs clarification before proceeding.

USER REQUEST: "${userPrompt}"
AMBIGUITY REASON: "${ambiguityReason}"

Generate a helpful clarification question that will help you understand:
- What specific visual elements they want
- What animation style they prefer  
- What the main message/goal is

Be conversational and specific. Ask for 1-2 specific details.`;
```

### **Input**:
```typescript
interface AskSpecifyInput {
  userPrompt: string;
  ambiguityReason: string;
  sessionId: string;
  userId: string;
}
```

### **Output**:
```typescript
interface AskSpecifyResult {
  clarificationQuestion: string;
  reasoning: string;
  suggestedResponses?: string[];
}
```

### **Sends To**: User (via chat interface)
### **Receives From**: Brain Orchestrator

---

## 🏗️ **Layer 3: SceneBuilder Service**

### **File**: `src/lib/services/sceneBuilder.service.ts`
### **Responsibility**: Generate React/Remotion code with ESM compliance
### **Model**: GPT-4o (for complex code generation)

### **Code Generation System Prompt**:
```typescript
const systemPrompt = `You are an expert React/Remotion code generator following strict ESM component loading rules.

🚨 CRITICAL ESM REQUIREMENTS - NEVER VIOLATE:
1. NEVER import React: React is globally available
2. NEVER import Remotion: Use window.Remotion destructuring ONLY
3. NEVER import external libraries: NO THREE.js, GSAP, D3, etc.
4. NEVER import CSS files or stylesheets
5. ONLY use window.Remotion destructuring: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

CORRECT PATTERN:
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

BRAIN CONTEXT INTEGRATION:
${brainContext ? `
USER INTENT: ${brainContext.userIntent}
TECHNICAL RECOMMENDATIONS: ${brainContext.technicalRecommendations.join(', ')}
UI LIBRARY GUIDANCE: ${brainContext.uiLibraryGuidance}
ANIMATION STRATEGY: ${brainContext.animationStrategy}
FOCUS AREAS: ${brainContext.focusAreas.join(', ')}
` : ''}

Generate ONLY the React component code that implements the specific requirements from the brain context. Do not add animations or effects unless explicitly specified in the brain context.`;
```

### **Input (generateDirectCode)**:
```typescript
interface DirectCodeInput {
  userPrompt: string;
  projectId: string;
  sceneNumber?: number;
  brainContext?: BrainContext;
}
```

### **Input (generateEditCode)**:
```typescript
interface EditCodeInput {
  userPrompt: string;
  existingCode: string;
  existingName: string;
  projectId: string;
  brainContext?: BrainContext;
}
```

### **Output**:
```typescript
interface CodeGenerationResult {
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  debug: any;
}
```

### **Sends To**: Database (scene persistence)
### **Receives From**: AddScene Tool, EditScene Tool

---

## 🔄 **Complete System Flow**

### **New Scene Creation Flow**:
```
1. User Input → Generation Router
2. Generation Router → Brain Orchestrator
   - System Prompt: Intent analysis
   - Input: User prompt + context
   - Output: Tool selection (addScene)

3. Brain Orchestrator → AddScene Tool
   - System Prompt: Brain context generation
   - Input: User prompt + project context
   - Output: Strategic guidance

4. AddScene Tool → SceneBuilder Service
   - System Prompt: Code generation with brain context
   - Input: User prompt + brain context
   - Output: React/Remotion code

5. SceneBuilder → Database
   - Persist scene data
   - Emit SSE events

6. Database → User Interface
   - Real-time scene updates
   - Video preview
```

### **Scene Editing Flow**:
```
1. User Input ("add more X") → Generation Router
2. Generation Router → Brain Orchestrator
   - System Prompt: Context-aware intent analysis
   - Input: Edit prompt + selected scene
   - Output: Tool selection (editScene)

3. Brain Orchestrator → EditScene Tool
   - System Prompt: Edit-specific brain context
   - Input: Edit prompt + existing scene
   - Output: Modification guidance

4. EditScene Tool → SceneBuilder Service
   - System Prompt: Code modification with preservation
   - Input: Edit prompt + existing code + brain context
   - Output: Modified React/Remotion code

5. SceneBuilder → Database
   - Update scene data
   - Preserve version history

6. Database → User Interface
   - Updated scene preview
   - Conversation continuity
```

## 📊 **System Prompt Summary Table**

| Layer | File | Model | Prompt Purpose | Input | Output | Next Layer |
|-------|------|-------|----------------|-------|--------|------------|
| **Brain** | orchestrator.ts | GPT-4o-mini | Intent analysis & tool selection | User prompt + context | Tool selection + reasoning | MCP Tools |
| **AddScene** | addScene.ts | GPT-4o-mini | Strategic scene guidance | User prompt + project | Brain context | SceneBuilder |
| **EditScene** | editScene.ts | GPT-4o-mini | Strategic edit guidance | Edit prompt + existing scene | Brain context | SceneBuilder |
| **AskSpecify** | askSpecify.ts | GPT-4o-mini | Clarification generation | Ambiguous prompt | Clarification question | User |
| **SceneBuilder** | sceneBuilder.service.ts | GPT-4o | ESM-compliant code generation | Prompt + brain context | React/Remotion code | Database |

## 🎯 **Key Insights**

### **Prompt Hierarchy**:
1. **Brain Layer**: Fast intent recognition (GPT-4o-mini)
2. **Tool Layer**: Strategic guidance generation (GPT-4o-mini)  
3. **Code Layer**: Complex code generation (GPT-4o)

### **Context Flow**:
- **User Context** flows down through all layers
- **Brain Context** enriches code generation
- **Project Context** maintains consistency
- **Scene Context** enables intelligent editing

### **Model Selection Strategy**:
- **GPT-4o-mini**: Fast decisions, strategic guidance, clarifications
- **GPT-4o**: Complex code generation, ESM compliance, advanced reasoning

## 🚨 **CRITICAL ARCHITECTURE CORRECTIONS**

### **Current Issues Fixed**:

1. **ESM Compliance**: ✅ SceneBuilder now uses correct `window.Remotion` pattern
2. **Over-Prescription**: ✅ SceneBuilder only implements what's specified in brain context
3. **Separation of Concerns**: ⚠️ **NEEDS IMPROVEMENT**

### **Recommended Architecture Improvement**:

**Current (Problematic)**:
```
Brain Layer: Tool selection only
Tool Layer: Vague "brain context" 
SceneBuilder: All planning + code generation
```

**Improved (Proper Separation)**:
```
Brain Layer: Intent analysis + tool selection
Tool Layer: Complete technical specification
SceneBuilder: Pure code generation from specs
```

### **Enhanced Tool Layer Responsibilities**:

**AddScene Tool Should Generate**:
```typescript
interface DetailedSceneSpec {
  components: Array<{
    type: "TextInput" | "Button" | "Card";
    props: Record<string, any>;
    layout: { x: number; y: number; width: number; height: number };
  }>;
  animations: Array<{
    target: string;
    type: "fadeIn" | "slideIn" | "typewriter" | "custom";
    duration: number;
    delay: number;
    params?: Record<string, any>;
  }>;
  styling: {
    background: string;
    colors: string[];
    typography: Record<string, any>;
  };
  content: {
    text: string[];
    images?: string[];
  };
}
```

**SceneBuilder Should Only**:
- Convert DetailedSceneSpec to React/Remotion code
- Apply ESM compliance rules
- Generate clean, working component
- NO creative decisions, NO adding extra animations

This architecture ensures intelligent, context-aware scene generation while maintaining clean separation of concerns and optimal model usage. 