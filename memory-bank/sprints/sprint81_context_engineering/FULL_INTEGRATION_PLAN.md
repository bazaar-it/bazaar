# Full ProjectMemory Integration Plan

## Current Implementation
We've successfully integrated asset storage using projectMemory. Here's how to expand it to use ALL projectMemory features:

## 1. Enhanced Context Builder

```typescript
// src/brain/orchestrator_functions/contextBuilder.ts

import { projectMemoryService } from "~/server/services/data/projectMemory.service";

class ContextBuilder {
  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    // ... existing code ...
    
    // Get ALL project memory data
    const [
      userPreferences,
      sceneRelationships,
      conversationContext,
      projectAssets
    ] = await Promise.all([
      projectMemoryService.getUserPreferences(input.projectId),
      projectMemoryService.getSceneRelationships(input.projectId),
      projectMemoryService.getConversationContext(input.projectId),
      assetContext.getProjectAssets(input.projectId) // Our existing asset context
    ]);
    
    return {
      // ... existing fields ...
      
      // Enhanced context from projectMemory
      userPreferences: {
        duration: userPreferences.duration_preference, // "short", "medium", "long"
        style: userPreferences.style_preference, // "minimalist", "vibrant", etc
        pace: userPreferences.pace_preference, // "fast", "slow"
        brand: userPreferences.brand_style, // "apple", "startup", etc
      },
      
      sceneRelationships: {
        // Which scenes reference each other
        references: sceneRelationships,
      },
      
      conversationMemory: conversationContext,
      
      assetContext: { /* existing */ }
    };
  }
}
```

## 2. Capture User Preferences

```typescript
// In generation router or brain orchestrator

// When user says things like "make all my videos fast-paced"
if (detectsPreference(userMessage)) {
  await projectMemoryService.upsertMemory({
    projectId,
    memoryType: 'user_preference',
    memoryKey: 'pace_preference',
    memoryValue: 'fast',
    confidence: 0.9,
    sourcePrompt: userMessage
  });
}

// When user consistently makes 5-second scenes
if (averageDuration === 150) { // 5 seconds
  await projectMemoryService.upsertMemory({
    projectId,
    memoryType: 'user_preference',
    memoryKey: 'duration_preference',
    memoryValue: 'short',
    confidence: 0.7,
    sourcePrompt: 'Inferred from usage patterns'
  });
}
```

## 3. Track Scene Relationships

```typescript
// When a scene references another

// "Make it like scene 2"
await projectMemoryService.saveMemory({
  projectId,
  memoryType: 'scene_relationship',
  memoryKey: `${newSceneId}_references_${referencedSceneId}`,
  memoryValue: JSON.stringify({
    type: 'style_match',
    sourcePrompt: userMessage
  })
});

// "Continue from the previous scene"
await projectMemoryService.saveMemory({
  projectId,
  memoryType: 'scene_relationship',
  memoryKey: `${newSceneId}_continues_${previousSceneId}`,
  memoryValue: JSON.stringify({
    type: 'narrative_continuation',
    sourcePrompt: userMessage
  })
});
```

## 4. Store Conversation Context

```typescript
// After important interactions

// User teaches the AI something
"Always use fade-in for my text"
await projectMemoryService.saveMemory({
  projectId,
  memoryType: 'conversation_context',
  memoryKey: 'animation_rule_text',
  memoryValue: 'always_fade_in',
  sourcePrompt: userMessage,
  confidence: 1.0
});
```

## 5. Use Context in Brain Decisions

```typescript
// In brain orchestrator prompt

const enhancedPrompt = `
USER PREFERENCES (from project history):
- Preferred duration: ${context.userPreferences.duration || 'not set'}
- Style preference: ${context.userPreferences.style || 'not set'}
- Pace: ${context.userPreferences.pace || 'not set'}

LEARNED PATTERNS:
${Object.entries(context.conversationMemory).map(([key, value]) => 
  `- ${key}: ${value}`
).join('\n')}

When generating scenes, respect these learned preferences unless the user explicitly asks for something different.
`;
```

## Benefits of Full Integration

1. **Personalization**: Each project learns user preferences
2. **Consistency**: Maintains style across sessions
3. **Intelligence**: AI understands project context deeply
4. **Efficiency**: Users don't repeat preferences

## Implementation Priority

1. **Phase 1** (Done ✅): Asset persistence
2. **Phase 2**: Duration preferences (detect from patterns)
3. **Phase 3**: Style preferences (from explicit statements)
4. **Phase 4**: Scene relationships
5. **Phase 5**: Full conversation memory

## Example User Journey

```
Day 1:
User: "Create a minimalist intro"
→ System saves: style_preference = "minimalist"

Day 2:
User: "Add a new scene"
→ AI automatically uses minimalist style

User: "I prefer 3-second scenes"
→ System saves: duration_preference = "3s"

Day 7:
User: "Create 5 scenes about our product"
→ AI creates 5 minimalist, 3-second scenes without being told
```

## Code Locations to Modify

1. `/src/brain/orchestrator_functions/contextBuilder.ts` - Add full memory retrieval
2. `/src/server/api/routers/generation/scene-operations.ts` - Capture preferences
3. `/src/brain/orchestrator_functions/intentAnalyzer.ts` - Use preferences in prompts
4. `/src/config/prompts/active/brain-orchestrator.ts` - Add preference awareness

## Testing Strategy

1. Create project
2. Make several scenes with consistent style
3. Check if preferences are captured
4. Make new scene without specifying style
5. Verify it uses learned preferences