# Bazaar-Vid Context System Analysis

## Executive Summary

The current context system in Bazaar-Vid is architecturally over-engineered and functionally broken. It makes 4 database queries per request, with 2 of them querying empty tables that are never written to. The system spends ~50ms and ~170 tokens on completely unused features (user preferences, image analyses) while failing to provide the one thing tools actually need: the ability to see other scenes' code for cross-scene operations.

## Current Architecture Overview

### 1. Context Flow Pipeline

```
User Input → Orchestrator → Context Builder → Intent Analyzer → Tool Decision → Tool Execution
```

### 2. Key Components

#### A. Brain Orchestrator (`orchestratorNEW.ts`)
- **Role**: Central coordinator
- **Process**:
  1. Receives user input with project context
  2. Delegates context building to ContextBuilder
  3. Passes context to IntentAnalyzer
  4. Returns tool decision (no execution)
- **Key insight**: Orchestrator is purely declarative - it decides but doesn't execute

#### B. Context Builder (`contextBuilder.ts`)
- **What it builds**:
  ```typescript
  ContextPacket {
    userPreferences: Record<string, any>     // Vague key-value pairs
    sceneHistory: Array<{id, name, type}>    // Metadata only, NO CODE
    imageAnalyses: Array<{...}>              // Past image processing
    conversationContext: string              // Topic summary
    last5Messages: Array<{...}>              // Recent chat
    sceneList: Array<{id, name}>            // Current scenes, NO CODE
    imageContext: {...}                      // Image positions in chat
  }
  ```
- **Critical gap**: No scene TSX code included

#### C. Intent Analyzer (`intentAnalyzer.ts`)
- **Process**:
  1. Builds structured prompt for AI
  2. Includes scene metadata (names, IDs, durations)
  3. Adds image context and conversation history
  4. AI analyzes and returns tool selection
- **What AI sees**:
  ```
  USER: "edit scene 2 to match scene 1's colors"
  
  STORYBOARD:
  Scene 1: "Tech Animation" (ID: abc-123, Duration: 150 frames)
  Scene 2: "Product Demo" (ID: def-456, Duration: 180 frames) [NEWEST]
  
  CONVERSATION: Conversation about: scene creation, styling
  ```
- **What AI doesn't see**: The actual code of any scene

### 3. Tool Context Reception

#### Add Tool
```typescript
interface AddToolInput {
  userPrompt: string
  previousSceneContext?: {
    tsxCode: string    // Only if explicitly passed
    style?: string
  }
  // No other scenes' code available
}
```

#### Edit Tool
```typescript
interface EditToolInput {
  sceneId: string
  tsxCode: string      // Only the target scene's code
  // No reference scenes available
}
```

## System Prompt Analysis

### Brain Orchestrator Prompt
- Focuses on tool selection logic
- Provides decision rules for ambiguous cases
- No mention of analyzing scene relationships or styles
- No instruction to include scene code in decisions

### Code Generator/Editor Prompts
- Receive only isolated context
- No awareness of other scenes in the project
- Cannot reference styles or patterns from other scenes

## The Core Problem

### High Effort, Low Reward

**Current Focus (High Effort)**:
1. **User Preferences**: Abstract key-value pairs with unclear purpose
2. **Conversation Summarization**: Generic topic extraction
3. **Complex Context Building**: Multiple async operations
4. **Image Analysis Storage**: Detailed but rarely used

**What Users Actually Need (Not Provided)**:
1. "Make this scene match the previous one"
2. "Use the same colors as scene 1"
3. "Continue the animation style"
4. Cross-scene consistency

### Why Cross-Scene References Fail

When a user says "edit scene 2 to use scene 1's background color":

1. **Brain** sees only: Scene 1 exists with name "Tech Animation"
2. **Brain** cannot: Analyze what colors are in Scene 1
3. **Edit Tool** receives: Only Scene 2's code
4. **Edit Tool** cannot: See Scene 1's code to extract colors

## Architectural Options for Improvement

### Option 1: Enhanced Context Packet
```typescript
interface EnhancedContextPacket {
  // ... existing fields ...
  scenesWithCode: Array<{
    id: string
    name: string
    tsxCode: string  // NEW: Include actual code
    order: number
  }>
}
```
**Pros**: Complete information available
**Cons**: Large token usage, every request pays the cost

### Option 2: Smart Context Inclusion
```typescript
// In IntentAnalyzer
if (detectsCrossSceneReference(prompt)) {
  // Brain requests specific scene code
  contextPacket.requestedScenes = extractReferencedScenes(prompt)
}
```
**Pros**: Efficient, only loads when needed
**Cons**: Requires two-phase analysis

### Option 3: Tool-Level Context Enhancement
```typescript
// Tools can request additional context
interface EditToolInput {
  // ... existing fields ...
  referenceScenes?: string[]  // IDs of scenes to include
}
```
**Pros**: Tools control what they need
**Cons**: Requires router changes

### Option 4: Semantic Scene Embeddings
Store semantic representations of scenes:
```typescript
interface SceneEmbedding {
  sceneId: string
  colors: string[]
  animations: string[]
  layout: string
  style: string
}
```
**Pros**: Compact, searchable
**Cons**: Additional processing layer

## Recommendations

### Immediate Fix (Option 2 + 3 Hybrid)
1. **Brain Enhancement**: Detect cross-scene references in prompts
2. **Context Builder**: Include referenced scene code when requested
3. **Tool Input**: Add optional `contextScenes` field
4. **Router**: Fetch and pass requested scene code

### Long-term Solution
1. **Semantic Understanding**: Build scene style profiles
2. **Smart Defaults**: Always include previous scene for Add operations
3. **Context Window Management**: Limit to 3-5 most relevant scenes
4. **Caching**: Cache analyzed scene properties

## Implementation Path

### Phase 1: Basic Cross-Scene Support
```typescript
// 1. Update ContextPacket type
interface ContextPacket {
  // ... existing ...
  requestedSceneCode?: Map<string, string>
}

// 2. Enhance Brain prompt
"When users reference other scenes (e.g., 'match scene 1'), 
set needsSceneCode: ['scene-1-id'] in your response"

// 3. Update tool inputs
interface EditToolInput {
  // ... existing ...
  contextScenes?: Array<{id: string, tsxCode: string}>
}
```

### Phase 2: Automatic Context
- Add tool: Always include previous scene
- Edit tool: Include scenes mentioned in prompt
- Smart detection of style continuity needs

### Phase 3: Semantic Layer
- Extract and store scene properties
- Enable style-based search and matching
- Reduce token usage through summaries

## Conclusion

The current context system is well-architected but misses the mark on user needs. It spends effort on abstract concepts while failing at concrete requirements. The fix is straightforward: include scene code when tools need it for cross-scene operations. This would transform the system from "high effort, low reward" to actually useful.

The irony is that the system can understand complex intent but can't see the code it needs to act on that intent. It's like having a brilliant chef who can plan a meal but isn't allowed to see the ingredients.