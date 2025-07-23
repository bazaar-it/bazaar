# Sprint 84: Dynamic Duration Implementation Plan

## Goal: Make scene durations dynamic based on content, not always 6 seconds

## Current State Analysis ✅

### 1. Duration Flow Works Correctly
- User can specify duration: "5 second intro" → 150 frames
- Brain orchestrator parses it with `parseDurationFromPrompt()`
- Passes to ADD tool as `requestedDurationFrames`
- Code generator includes it in prompt:
  ```
  DURATION REQUIREMENT: The scene MUST be exactly 150 frames (5.0 seconds).
  Ensure all animations complete before frame 140.
  Export the duration: export const durationInFrames_ABC123 = 150;
  ```
- LLM generates code with correct duration
- System extracts and stores it

### 2. Problem: When User Doesn't Specify Duration
- System doesn't analyze content to suggest duration
- LLM defaults to 180 frames (6 seconds) for everything
- Result: All scenes are 6 seconds regardless of content

## Implementation Plan

### Phase 1: Fix Inconsistency (Quick Win) ✅
**Issue**: Database default is 150, code default is 180
**Fix**: Update database schema to use 180 as default

### Phase 2: Content-Based Duration Guidelines
Create duration suggestions based on scene type:

```typescript
// Scene Type Duration Map
const CONTENT_DURATION_MAP = {
  // Simple text
  'simple_text': { min: 60, default: 90, max: 120 },      // 2-4 seconds
  'heading_only': { min: 60, default: 90, max: 120 },     // 2-4 seconds
  
  // Medium complexity
  'text_with_icon': { min: 90, default: 120, max: 150 },  // 3-5 seconds
  'logo_animation': { min: 120, default: 150, max: 180 }, // 4-6 seconds
  'data_visualization': { min: 150, default: 180, max: 240 }, // 5-8 seconds
  
  // Complex scenes
  'multi_element': { min: 150, default: 210, max: 300 },  // 5-10 seconds
  'sequential_text': { min: 180, default: 240, max: 360 }, // 6-12 seconds
  'complex_animation': { min: 180, default: 270, max: 360 }, // 6-12 seconds
  
  // Special cases
  'transition': { min: 30, default: 60, max: 90 },        // 1-3 seconds
  'intro': { min: 120, default: 180, max: 300 },          // 4-10 seconds
  'outro': { min: 90, default: 150, max: 240 },           // 3-8 seconds
};
```

### Phase 3: Enhance Brain Orchestrator
Add content analysis BEFORE calling tools:

```typescript
// In orchestratorNEW.ts
async analyzeContentComplexity(prompt: string, imageUrls?: string[]): Promise<{
  suggestedDuration: number;
  reasoning: string;
}> {
  // Quick heuristics
  const wordCount = prompt.split(' ').length;
  const hasImages = imageUrls && imageUrls.length > 0;
  const isSimpleText = /^(text|show|display).*["'].*["']$/i.test(prompt);
  const isLogo = /logo/i.test(prompt);
  const isIntro = /intro|opening|start/i.test(prompt);
  const isOutro = /outro|ending|closing/i.test(prompt);
  
  // Determine duration
  if (isSimpleText && wordCount < 10) {
    return { suggestedDuration: 90, reasoning: "Simple text display" };
  }
  if (isLogo) {
    return { suggestedDuration: 150, reasoning: "Logo animation" };
  }
  // ... more rules
  
  // Default
  return { suggestedDuration: 180, reasoning: "Standard scene" };
}
```

### Phase 4: Update Code Generator Prompt
Add duration guidance to the system prompt:

```
DURATION GUIDELINES:
Based on your scene content, choose appropriate duration:
- Simple text (1-5 words): 60-90 frames (2-3 seconds)
- Text with icon/logo: 90-120 frames (3-4 seconds)
- Multiple text elements: 120-180 frames (4-6 seconds)
- Complex animations: 180-300 frames (6-10 seconds)
- Transitions: 30-60 frames (1-2 seconds)

Calculate duration based on:
1. Number of elements to show
2. Animation complexity
3. Reading time for text
4. Sequential vs simultaneous animations

ALWAYS export duration that matches your content needs.
```

### Phase 5: Smart Duration in ADD Tool
When no explicit duration is requested:

```typescript
// In add.ts
if (!input.requestedDurationFrames) {
  // Analyze prompt to suggest duration
  const analysis = await this.analyzePromptComplexity(input.prompt);
  
  // Pass suggestion to code generator
  input.suggestedDurationFrames = analysis.suggestedDuration;
  input.durationReasoning = analysis.reasoning;
}
```

### Phase 6: Update Trim Tool
Make trim tool smarter about relative adjustments:

```typescript
// Smart trim based on content
if (userSays === "make it snappier") {
  newDuration = Math.max(60, currentDuration * 0.7); // 30% faster
} else if (userSays === "give it more time") {
  newDuration = Math.min(300, currentDuration * 1.3); // 30% slower
}
```

## Expected Outcomes

### Before:
- Every scene: 180 frames (6 seconds)
- "Text: Hello" → 6 seconds (too long!)
- Complex animation → 6 seconds (too short!)

### After:
- "Text: Hello" → 90 frames (3 seconds)
- Logo animation → 150 frames (5 seconds)
- Complex multi-element → 240 frames (8 seconds)
- User can still override: "make it 10 seconds"

## Testing Plan

1. Create test scenes without duration:
   - Simple text
   - Logo animation
   - Multi-element scene
   - Verify each gets appropriate duration

2. Test with explicit duration:
   - "5 second intro"
   - Verify it overrides smart duration

3. Test trim tool:
   - "Make it snappier"
   - "Add 2 seconds"
   - Verify smart adjustments

## Success Metrics

- 80% of scenes have appropriate duration for content
- Users need to trim less often
- Better pacing in final videos
- Scenes feel "just right" in length