# Last 30 Frames Context Strategy

## The Power of Transition Context

Providing the last 30 frames (1 second) of the previous scene helps the AI:
- Create smooth transitions
- Maintain visual momentum
- Match exit animations with entrances
- Understand the video's flow

## Implementation Approach

### 1. Extract Last 30 Frames Function

```typescript
function extractLastFrames(code: string, frameCount: number = 30): string {
  // Find the total duration
  const durationMatch = code.match(/durationInFrames[:\s]*[=\s]*(\d+)/);
  if (!durationMatch) return '';
  
  const totalFrames = parseInt(durationMatch[1]);
  const startFrame = Math.max(0, totalFrames - frameCount);
  
  // Extract animations that happen in the last 30 frames
  const lines = code.split('\n');
  const relevantAnimations: string[] = [];
  
  lines.forEach(line => {
    // Look for interpolations that include our frame range
    const interpolateMatch = line.match(/interpolate\([^,]+,\s*\[(\d+),\s*(\d+)\]/);
    if (interpolateMatch) {
      const animStart = parseInt(interpolateMatch[1]);
      const animEnd = parseInt(interpolateMatch[2]);
      
      // If animation overlaps with last 30 frames
      if (animEnd >= startFrame || animStart >= startFrame) {
        relevantAnimations.push(line.trim());
      }
    }
  });
  
  return `
// Last 30 frames context (frames ${startFrame}-${totalFrames}):
// Total duration: ${totalFrames} frames
// Exit animations:
${relevantAnimations.join('\n')}
`;
}
```

### 2. Enhanced Context Building (Corrected)

#### Text Only (with previous scene context if available)
```typescript
const lastFramesContext = previousScene 
  ? extractLastFrames(previousScene.tsxCode) 
  : '';

const userPrompt = `USER REQUEST: "${input.userPrompt}"
${lastFramesContext}
FUNCTION NAME: ${input.functionName}`;
```

#### With Previous Scene Reference
```typescript
const userPrompt = `PREVIOUS SCENE CODE:
\`\`\`tsx
${input.previousSceneCode}
\`\`\`

LAST 30 FRAMES CONTEXT:
${extractLastFrames(input.previousSceneCode)}

USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;
```

#### With Images
```typescript
const lastFramesContext = previousScene 
  ? extractLastFrames(previousScene.tsxCode) 
  : '';

const userPrompt = `USER REQUEST: "${input.userPrompt}"
${lastFramesContext}
[${input.imageUrls.length} image(s) provided below]

FUNCTION NAME: ${input.functionName}`;
```

#### With Web Context
```typescript
const lastFramesContext = previousScene 
  ? extractLastFrames(previousScene.tsxCode) 
  : '';

const userPrompt = `USER REQUEST: "${input.userPrompt}"
${lastFramesContext}
WEBSITE CONTEXT:
- URL: ${input.webContext.originalUrl}
- Title: ${input.webContext.pageData.title}
[Screenshots provided below]

FUNCTION NAME: ${input.functionName}`;
```

## Why Last 30 Frames Matter

### Example Scenario
Previous scene ends with:
- Text sliding out to the left (frames 60-90)
- Background fading to black (frames 80-90)
- Logo scaling down (frames 70-90)

New scene can:
- Slide text in from the right (momentum transfer)
- Start from black and fade in new background
- Scale up new element from where logo disappeared

### Benefits
1. **Natural Flow**: Scenes feel connected, not disjointed
2. **Smart Transitions**: AI can create complementary animations
3. **Maintains Energy**: If previous scene exits fast, new scene enters fast
4. **Visual Continuity**: Colors/positions can flow between scenes

## Implementation Notes

- Only include if there IS a previous scene
- Keep it lightweight - just the relevant animations
- Don't include the entire previous scene code (that's for style matching)
- Focus on exit animations and final state

This gives the AI just enough context to create flowing videos without overwhelming it with information.