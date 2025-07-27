# Sprint 85: Context Engineering System

## Overview
Transform from multiple specialized agents to a unified context-based generation system using modular context files instead of hardcoded agent-specific prompts.

## Current State Analysis

### Problems with Current Architecture

1. **Agent Proliferation**
   - 7 different tools with similar functionality
   - Each requires its own system prompt
   - Typography agent, image recreator agent, etc. all doing similar things
   - Hard to combine capabilities (e.g., typography + image recreation)

2. **Redundant Code**
   - TYPOGRAPHY_AGENT and IMAGE_RECREATOR prompts exist but aren't used
   - All tools default to CODE_GENERATOR prompt
   - Same generation logic repeated across tools

3. **Limited Flexibility**
   - Can only use one agent at a time
   - No way to combine agent capabilities
   - Adding new capabilities requires new agents

4. **Context Loss**
   - Each agent call starts fresh
   - No memory of previous generations
   - Style consistency hard to maintain

## Proposed Context Engineering System

### Core Concept
Replace multiple specialized agents with:
- **1 Generator Agent** - Handles all creation tasks
- **1 Editor Agent** - Handles all modification tasks
- **Context Files** - Modular prompts loaded on-demand

### Architecture

```
/src/contexts/
├── typography.context.md       # Typography-specific instructions
├── image-recreation.context.md # Image recreation instructions
├── motion-graphics.context.md  # Animation patterns
├── data-viz.context.md        # Chart/graph generation
├── social-media.context.md    # Platform-specific optimizations
└── index.ts                   # Context loader system
```

### Implementation Strategy

#### Phase 1: Context Infrastructure
```typescript
// Context loader system
interface ContextFile {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  priority: number;
}

class ContextManager {
  async loadContext(contextIds: string[]): Promise<string> {
    // Load and merge multiple context files
    // Higher priority contexts override lower
  }
  
  async selectContexts(userPrompt: string, sceneType: string): Promise<string[]> {
    // AI-powered context selection
    // Based on user intent and content type
  }
}
```

#### Phase 2: Unified Agents

```typescript
// Single generator agent
async function generateWithContext(input: {
  prompt: string;
  contexts: string[];
  projectContext?: ProjectContext;
  styleMemory?: StyleMemory;
}) {
  const contextPrompt = await contextManager.loadContext(input.contexts);
  const fullPrompt = combinePrompts(basePrompt, contextPrompt, projectContext);
  
  return generateCode(fullPrompt, input.prompt);
}
```

#### Phase 3: Smart Context Selection

```typescript
// Brain orchestrator enhancement
interface BrainDecision {
  action: 'generate' | 'edit';
  contexts: string[]; // Instead of toolName
  reasoning: string;
  suggestions: string[]; // Additional contexts user might want
}

// Example: "Create animated typography with particle effects"
// Returns: contexts: ['typography', 'particle-effects', 'animations']
```

### Benefits

1. **Modularity**
   - Easy to add new capabilities (just add context file)
   - Mix and match contexts for complex generations
   - No code changes needed for new styles

2. **Performance**
   - Single agent = less overhead
   - Context files cached in memory
   - Faster decision making

3. **Flexibility**
   - Combine multiple contexts: typography + particles + data-viz
   - Progressive enhancement with additional contexts
   - User can specify contexts directly

4. **Maintainability**
   - Context files in markdown = easy to edit
   - No redeployment for prompt changes
   - Version control for context evolution

### Migration Path

1. **Week 1**: Create context infrastructure
2. **Week 2**: Migrate existing prompts to context files
3. **Week 3**: Implement unified generator/editor
4. **Week 4**: Smart context selection & testing

### Example Usage

**Current System:**
```typescript
// Limited to one agent
orchestrator.decide("Create animated text") -> typographyAgent
orchestrator.decide("Recreate this image") -> imageRecreatorAgent
// Can't do: "Create animated text that looks like this image"
```

**New System:**
```typescript
// Flexible context combination
orchestrator.decide("Create animated text") 
  -> generate(['typography.context'])

orchestrator.decide("Recreate this image with animated text") 
  -> generate(['image-recreation.context', 'typography.context'])

orchestrator.decide("Create particle text like this image style")
  -> generate(['typography.context', 'particle.context', 'image-style.context'])
```

### Technical Considerations

1. **Context Priority**: Some contexts might conflict - need priority system
2. **Context Size**: Keep contexts focused and under 2000 tokens each
3. **Caching**: Context files loaded once, cached in memory
4. **Versioning**: Track context versions for consistency
5. **Testing**: Evaluation framework for context combinations

### Next Steps

1. Review and approve architecture
2. Create POC with typography + image contexts
3. Test performance and quality
4. Plan full migration strategy