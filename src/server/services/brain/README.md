# Brain Orchestrator - Simplified Architecture

## Overview
The Brain is a decision engine that:
1. Gets context (chat history, scenes, preferences)
2. Understands user intent
3. Chooses the right tool(s)
4. Provides tool-specific context and reasoning

## Key Principles
- **No execution** - Brain only decides, generation.ts executes
- **No state** - Fresh context for each request
- **Minimal logic** - ~100 lines in main orchestrator
- **Modular functions** - Each responsibility in its own file

## Architecture

```
brain/
├── orchestrator.ts          # Main entry (~100 lines)
├── config/
│   ├── models.config.ts     # AI model selection
│   └── prompts.config.ts    # System prompts
└── orchestrator_functions/
    ├── contextBuilder.ts    # Gathers context from DB
    ├── intentAnalyzer.ts    # Understands user intent
    ├── toolSelector.ts      # Chooses appropriate tool(s)
    ├── contextPreparer.ts   # Prepares tool-specific context
    └── types.ts            # Shared type definitions
```

## Data Flow

```
1. User Input
    ↓
2. Context Building (cached when possible)
    ↓
3. Intent Analysis (determines what user wants)
    ↓
4. Tool Selection (picks right tool for the job)
    ↓
5. Context Preparation (minimal context for each tool)
    ↓
6. Return Decision to generation.ts
```

## Context Requirements by Tool

### deleteScene
- Minimal: just sceneId

### editScene (duration only)
- Minimal: sceneId + new duration

### editScene (surgical)
- Medium: sceneId + existing code + specific reasoning

### editScene (creative)
- Full: sceneId + existing code + style preferences

### addScene
- Full: previous scenes + user preferences + project context

## Example Usage

```typescript
const decision = await brainOrchestrator.orchestrate({
  prompt: "Make the button red",
  projectId: "proj_123",
  userId: "user_456"
});

// Returns:
{
  tool: "editScene",
  reasoning: "User wants to change button color to red, keeping everything else",
  context: {
    sceneId: "scene_789",
    existingCode: "...",
    editType: "surgical",
    prompt: "Change button color to red"
  }
}
```