# Before/After: Real Examples of Context System

## Example 1: "Add another scene"

### BEFORE (Current Broken System)
```
User: "Add another scene"

Context Builder:
- Queries empty user preferences ❌
- Queries empty image analyses ❌  
- Builds primitive conversation summary
- Does NOT pass previous scene code

Add Tool Receives:
{
  userPrompt: "Add another scene",
  previousSceneContext: undefined  // MISSING!
}

Result: Generic scene with random colors, no style match
```

### AFTER (With Fix)
```
User: "Add another scene"

Context Builder:
- Skips ghost features ✓
- Provides scene metadata

Router:
- Automatically includes last scene as previousSceneContext

Add Tool Receives:
{
  userPrompt: "Add another scene",
  previousSceneContext: {
    tsxCode: "// Scene with blue gradient, floating particles..."
  }
}

Result: New scene with matching blue gradient and similar particles
```

## Example 2: "Make scene 3 use the same background as scene 1"

### BEFORE (Current Broken System)
```
User: "Make scene 3 use the same background as scene 1"

Brain:
- Sees scene names but NO CODE
- Picks edit tool for scene 3
- Cannot identify what needs matching

Edit Tool Receives:
{
  sceneId: "scene-3",
  tsxCode: "// Only scene 3 code",
  referenceScenes: undefined  // MISSING!
}

AI Prompt:
"USER REQUEST: Make scene 3 use the same background as scene 1
EXISTING CODE: [only scene 3]"

Result: AI has no idea what scene 1's background is. Fails.
```

### AFTER (With Fix)
```
User: "Make scene 3 use the same background as scene 1"

Brain:
- Detects cross-scene reference
- Sets referencedSceneIds: ["scene-1"]

Edit Tool Receives:
{
  sceneId: "scene-3",
  tsxCode: "// Scene 3 code",
  referenceScenes: [{
    id: "scene-1",
    name: "Intro",
    tsxCode: "// backgroundColor: '#0066CC'..."
  }]
}

AI Prompt:
"USER REQUEST: Make scene 3 use the same background as scene 1

REFERENCE SCENES:
Intro (Scene 1):
```tsx
// Scene 1 code showing backgroundColor: '#0066CC'
```

EXISTING CODE: [scene 3]

IMPORTANT: Extract colors from reference scenes and apply"

Result: Scene 3 now has #0066CC background. Success!
```

## Example 3: Building a Cohesive Video

### BEFORE (Each Scene is an Island)
```
Scene 1: Blue tech theme
User: "Add another scene"
Scene 2: Random red theme (no continuity)
User: "Add another scene"  
Scene 3: Random green theme (no continuity)
User: "Why don't my scenes match??"
```

### AFTER (Natural Flow)
```
Scene 1: Blue tech theme with particles
User: "Add another scene"
Scene 2: Blue tech theme with particles (auto-matched!)
User: "Add another scene"
Scene 3: Blue tech theme with particles (consistent!)
User: "Perfect! Now make scene 2 purple instead"
Scene 2: Purple but keeps the particles and style
```

## The Code Difference

### Just 1 Line for Basic Continuity
```typescript
// In helpers.ts
previousSceneContext: previousScene ? {
  tsxCode: previousScene.tsxCode
} : undefined,
```

### Just 20 Lines for Cross-References
```typescript
// In Brain prompt
"referencedSceneIds": ["scene-1-id"]

// In helpers.ts  
if (decision.referencedSceneIds?.length > 0) {
  referenceScenes = storyboard.filter(s => 
    decision.referencedSceneIds!.includes(s.id)
  );
}

// In edit tool
if (input.referenceScenes?.length) {
  context += `\n\nREFERENCE SCENES:`;
  // ... include scene code
}
```

## User Experience Transformation

### Current Experience
- "Why doesn't it match?"
- "How do I make them consistent?"
- "It looks so random"
- Manually copying colors between scenes

### New Experience  
- Scenes naturally flow together
- Style references just work
- Cohesive videos by default
- Focus on content, not fighting the tool

## The Bottom Line

**Current**: System spends 50ms querying empty tables while basic features don't work

**Fixed**: System spends 0ms on ghost features and actually enables what users need

The fix is embarrassingly simple. The impact is transformative.