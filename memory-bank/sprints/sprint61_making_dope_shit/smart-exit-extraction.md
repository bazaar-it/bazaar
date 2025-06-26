# Smart Exit State Extraction - Not Hardcoded

## The Problem

You're right - we can't hardcode what to look for because:
- Styles could be: `backgroundColor`, `background`, `bg`, inline styles, styled components
- Animations could be: `interpolate`, `spring`, manual calculations, CSS animations
- We don't know what creative approaches the AI will use

## Better Approach: Let the AI Do It

Instead of regex parsing, leverage the AI's understanding:

### Option 1: AI-Powered Analysis

```typescript
async function extractExitStateWithAI(code: string, lastNFrames: number = 30) {
  // Use a quick AI call to analyze the exit state
  const analysisPrompt = `Analyze this Remotion component code and describe what's happening in the last 30 frames (final 1 second):

${code}

Provide a concise summary of:
1. What elements are exiting and how (direction, fade, scale)
2. Final colors/styles visible
3. Overall motion direction
4. Energy level (fast/slow/stopped)

Keep it under 100 words, focus on what matters for transitions.`;

  // This would be a quick call with a smaller model
  const exitAnalysis = await quickAIAnalysis(analysisPrompt);
  
  return exitAnalysis;
}
```

### Option 2: Just Pass the Whole Last Section

Simpler and more robust:

```typescript
function extractLastSectionOfCode(code: string, lastNFrames: number = 30): string {
  const lines = code.split('\n');
  const durationMatch = code.match(/durationInFrames[:\s]*[=\s]*(\d+)/);
  
  if (!durationMatch) return code; // Just return it all if we can't find duration
  
  const totalFrames = parseInt(durationMatch[1]);
  const startFrame = totalFrames - lastNFrames;
  
  // Just include ANY line that mentions a frame number >= startFrame
  const relevantLines: string[] = [];
  
  lines.forEach(line => {
    // Look for any number that could be a frame reference
    const numbers = line.match(/\d+/g);
    if (numbers) {
      const hasRelevantFrame = numbers.some(num => 
        parseInt(num) >= startFrame && parseInt(num) <= totalFrames
      );
      if (hasRelevantFrame) {
        relevantLines.push(line);
      }
    }
  });
  
  // If we found relevant lines, use them. Otherwise, just take the last quarter of the code
  if (relevantLines.length > 0) {
    return relevantLines.join('\n');
  } else {
    // Fallback: just include the last 25% of the component
    const startLine = Math.floor(lines.length * 0.75);
    return lines.slice(startLine).join('\n');
  }
}
```

### Option 3: The Simplest Solution (Probably Best)

Just include the entire previous component code but with clear instructions:

```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE (for transition reference):
\`\`\`tsx
${previousScene.code}
\`\`\`

TRANSITION INSTRUCTIONS:
- Focus on the LAST 30 frames (1 second) of the previous scene
- Create entrance animations that flow from how the previous scene exits
- If elements exit left, consider entering from right
- Match the energy and pacing of the exit

FUNCTION NAME: ${input.functionName}`;
```

## Why This is Better

1. **Not brittle** - Works with any code style
2. **AI understands context** - It can figure out what's important
3. **Future proof** - Works even if we add new animation methods
4. **Simple** - Less code to maintain

## About "Only Spring and Interpolate"

You caught another assumption! The AI might use:
- Math calculations: `Math.sin(frame * 0.1)`
- Conditional rendering: `frame > 60 ? 1 : 0`
- Custom easing functions
- CSS animations
- Any creative approach

So we shouldn't limit our search to specific functions.

## Recommended Approach

I think Option 3 is best because:
- Simple to implement
- No fragile parsing
- AI is smart enough to understand "focus on the last 30 frames"
- Token overhead is acceptable (most components are <2000 tokens)
- Works with ANY coding style

The key insight: Don't try to be too clever with parsing. Let the AI understand the code and create smooth transitions naturally.