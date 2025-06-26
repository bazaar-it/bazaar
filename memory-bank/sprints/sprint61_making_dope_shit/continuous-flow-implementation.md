# Continuous Flow Implementation - Making Transitions Seamless

## The Core Insight

You're absolutely right - the best motion graphics feel like one continuous piece, not separate scenes stitched together. 

## Practical Implementation Plan

### Step 1: Extract Real Exit State (Not Just Animations)

```typescript
function extractExitState(code: string, lastNFrames: number = 30): string {
  const lines = code.split('\n');
  const durationMatch = code.match(/durationInFrames[:\s]*[=\s]*(\d+)/);
  if (!durationMatch) return '';
  
  const totalFrames = parseInt(durationMatch[1]);
  
  // Find all animated values at the last frame
  const exitStates: string[] = [];
  
  // Extract final values
  const interpolateRegex = /const\s+(\w+)\s*=\s*interpolate\([^,]+,\s*\[([^\]]+)\],\s*\[([^\]]+)\]/g;
  let match;
  
  while ((match = interpolateRegex.exec(code)) !== null) {
    const varName = match[1];
    const frameRanges = match[2].split(',').map(f => parseInt(f.trim()));
    const valueRanges = match[3].split(',').map(v => v.trim());
    
    // Find what value this variable has at the last frame
    for (let i = 0; i < frameRanges.length - 1; i++) {
      if (totalFrames >= frameRanges[i] && totalFrames <= frameRanges[i + 1]) {
        exitStates.push(`// ${varName} ends at: ${valueRanges[i + 1]}`);
      }
    }
  }
  
  // Extract colors and styles that are active
  const colorMatches = code.match(/color:\s*["']([^"']+)["']/g) || [];
  const bgMatches = code.match(/background(?:Color)?:\s*["']([^"']+)["']/g) || [];
  
  return `
// EXIT STATE at frame ${totalFrames}:
${exitStates.join('\n')}

// Active colors:
${[...colorMatches, ...bgMatches].join('\n')}

// Last 30 frames of actual code:
${extractRelevantCode(code, totalFrames - lastNFrames, totalFrames)}
`;
}

function extractRelevantCode(code: string, startFrame: number, endFrame: number): string {
  // Extract the actual JSX and animations active in this range
  // This is the key - we want the EXACT code, not a summary
  const lines = code.split('\n');
  const relevant: string[] = [];
  
  lines.forEach(line => {
    // Include any animation active in our frame range
    if (line.includes('interpolate') || line.includes('spring')) {
      const rangeMatch = line.match(/\[(\d+),\s*(\d+)\]/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (end >= startFrame || start >= startFrame) {
          relevant.push(line);
        }
      }
    }
  });
  
  return relevant.join('\n');
}
```

### Step 2: Smart Scene Continuation

Add to system prompt:
```
SCENE CONTINUATION RULES:
- When provided with "EXIT STATE", your animations should flow from those values
- If previous text exited at translateX(-100), consider entering new text from translateX(100)
- If previous scene ended with opacity 0, start new content from opacity 0
- Match the energy: fast exits should lead to fast entrances
- Use complementary motions (left→right, up→down, scale down→scale up)
```

### Step 3: Context for Continuous Building

```typescript
// For adding to existing scene vs new scene
const shouldContinueScene = (userPrompt: string, previousScene?: any) => {
  // Continue if:
  // - User says "add", "continue", "then"
  // - Previous scene is under 150 frames (5 seconds)
  // - Content is related
  
  const continueKeywords = ['add', 'continue', 'then', 'next', 'also'];
  const hasKeyword = continueKeywords.some(word => 
    userPrompt.toLowerCase().includes(word)
  );
  
  const previousIsShort = previousScene && 
    previousScene.duration < 150;
  
  return hasKeyword && previousIsShort;
};

// Different prompts for different approaches
const buildPrompt = (input: any, approach: 'new' | 'continue' | 'extend') => {
  if (approach === 'continue') {
    return `USER REQUEST: "${input.userPrompt}"

APPROACH: Add to the existing scene timeline
Current scene duration: ${previousScene.duration} frames

${extractExitState(previousScene.code)}

Extend the scene by adding new animations that start where the previous ones end.
Structure your additions clearly with comments.

FUNCTION NAME: Same as existing`;
  }
  
  if (approach === 'extend') {
    return `USER REQUEST: "${input.userPrompt}"

APPROACH: Seamless transition to new scene

${extractExitState(previousScene.code, 30)}

Create animations that flow naturally from the exit state above.
Your entrance animations should complement the exit motion.

FUNCTION NAME: ${input.functionName}`;
  }
  
  // Standard new scene...
};
```

### Step 4: Overhead Management

The overhead is minimal:
- Exit state: ~500-1000 characters
- Worth it for smooth transitions
- Still well within token limits

### Benefits of This Approach

1. **Natural Flow**: Scenes connect seamlessly
2. **Consistent Style**: Colors and motion carry through
3. **Professional Look**: Like one continuous piece
4. **Flexible**: Can still split when needed

## Quick Test Implementation

Try this with a simple test:
1. First prompt: "Create a title that says 'Welcome' sliding in"
2. Second prompt: "Add 'to our product' continuing the flow"
3. Compare to: Creating two separate scenes

The continuous version should feel much more cohesive.

This could be the key to making your motion graphics feel truly professional!