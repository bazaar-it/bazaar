# Function-Calling Implementation for Dual-LLM Architecture

## Overview
We've implemented a robust dual-LLM architecture that uses OpenAI's function calling capabilities to properly separate concerns between two distinct AI tasks:

1. **State-Patching LLM (LLM A)**: Modifies existing video state via JSON-Patch operations
2. **Code-Generation LLM (LLM B)**: Creates brand-new React/Remotion components when needed

This architecture replaces the previous keyword-based heuristics for routing user requests with a more reliable function-calling approach.

## Architectural Flow

```
┌───────────────┐                     ┌────────────────┐
│  User Input   │                     │ Build Worker   │
└──────┬────────┘                     └────────┬───────┘
       │                                       │
       ▼                                       │
┌────────────────────────────┐                │
│   processUserMessage…      │ ① call LLM A   │
│  – system: llm-remotion…   ├───────────────►│
│  – functions:              │                │
│      applyJsonPatch        │                │
│      generateRemotionComp. │                │
└────────┬───────────────────┘                │
         │ (A) Patch → applyJsonPatch         │
         │ (B) Needs new effect →             │
         │     function_call:{name:"generateRemotionComponent",        │
         │                      arguments:{effectDescription:"…"}}      │
         │                                       │
         │                    ② backend receives function call         │
         ▼                                       │
┌────────────────────────────┐ ③ call LLM B     │
│ generateComponentCode()    │─────────────────►│
│  – system: remotion-code   │                  │
│  – + remotion-prompt       │                  │
│  – returns {effect, tsxCode}                  │
└────────┬───────────────────┘                  │
         │ ④ enqueue job in customComponentJobs │
         │                                       │
         │                                       ▼
         │                             ┌────────────────────┐
         │                             │ esbuild → R2 upload│
         └────▶ patcher LLM    ◀───────┤ processPendingJobs │
               follow-up turn            └────────────────────┘
               inserts new `{type:'custom', componentId}` scene
```

## Implementation Details

### 1. Function Schemas
Two distinct function schemas are now exposed to the patcher LLM:

```typescript
// Existing schema for JSON-Patch operations
const applyPatchSchema = {
  name: "applyJsonPatch",
  description: "Apply a JSON-Patch to the video state...",
  parameters: {
    type: "object",
    properties: {
      operations: { type: "array", /* ... */ }
    }
    // ...
  }
};

// New schema for requesting component generation
const generateRemotionComponentSchema = {
  name: "generateRemotionComponent",
  description: "Queue the generation of a brand-new Remotion effect...",
  parameters: {
    type: "object",
    required: ["effectDescription"],
    properties: {
      effectDescription: {
        type: "string",
        description: "Natural-language description of the desired effect"
      }
    }
  }
};
```

### 2. LLM Decision-Making
The patcher LLM now decides autonomously whether to:
- Apply JSON patches to modify existing video state, or
- Request a brand-new component when the user's request requires custom animations

```typescript
// Updated system prompt
"You are a Remotion video assistant. Decide whether to apply a JSON patch or request a new custom component. 
When modifying the existing video, call applyJsonPatch. If a brand-new visual effect is needed, call generateRemotionComponent."
```

### 3. Response Handling
The backend now branches based on which function the LLM chooses to call:

```typescript
const msgResp = llmResp.choices[0]?.message;

// a) The LLM requested a new Remotion component
if (msgResp.function_call?.name === "generateRemotionComponent") {
  const args = JSON.parse(msgResp.function_call.arguments ?? "{}");
  const description = args.effectDescription ?? message;
  return await handleCustomComponentRequest(ctx, projectId, description, userMessageId);
}

// b) Process JSON-Patch for standard video state updates
// ...code for parsing patch operations and applying them
```

### 4. Prompt Files

We maintain three distinct prompt files:

1. **llm-remotion-system-prompt.txt**: Instructions for the patcher LLM, detailing the JSON schema and scene types
2. **remotion-code.txt**: High-level creative guidelines for the code-gen LLM on animation principles 
3. **remotion-prompt.txt**: Low-level Remotion code examples/rules appended to the code-gen prompt

## Benefits of the Implementation

1. **Cleaner Separation of Concerns**: Each LLM has one well-defined role
2. **Reliability**: Function calling provides structured outputs with enforced schemas
3. **Flexibility**: Easy to add new function types as features evolve
4. **Security**: Controlled paths for code generation
5. **Maintenance**: No brittle keyword heuristics to maintain

## Replaced Code

Removed keyword-based detection:
```typescript
// REMOVED: Keyword-based detection pattern
if (message.toLowerCase().includes("custom component") || 
    message.toLowerCase().includes("create effect") || 
    message.toLowerCase().includes("make effect") ||
    message.toLowerCase().includes("generate component") ||
    message.toLowerCase().includes("create a bouncing text") ||
    message.toLowerCase().includes("text animation") ||
    (message.toLowerCase().includes("animation") && 
     message.toLowerCase().includes("create"))) {
  console.log("[CUSTOM COMPONENT] Detected request for custom component:", message);
  return await handleCustomComponentRequest(ctx, projectId, message, userMessageId);
}
```

## Testing

To test the new implementation:
1. Try a standard video edit request (should use `applyJsonPatch`)
2. Try a request like "Create a bouncing text animation" (should trigger `generateRemotionComponent`)
3. Check console logs to ensure proper branching
4. Verify that components are compiled and available for insertion
