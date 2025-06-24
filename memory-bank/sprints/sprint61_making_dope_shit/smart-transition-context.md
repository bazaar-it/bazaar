# Smart Transition Context - Handling Large Scenes

## The Problem

Including a 2000-line previous scene is:
- Token wasteful
- Confusing (too much irrelevant info)
- Slow
- Might hit context limits

## Smarter Solutions

### Solution 1: Tail Extraction (Simple but Effective)

```typescript
function getTransitionContext(previousCode: string): string {
  const lines = previousCode.split('\n');
  
  // If it's huge, just take the last portion
  if (lines.length > 200) {
    // Take last ~50 lines (usually includes the return statement and final animations)
    const tailLines = lines.slice(-50);
    
    // Try to find the start of the return statement and include from there
    let returnIndex = -1;
    for (let i = tailLines.length - 1; i >= 0; i--) {
      if (tailLines[i].includes('return (')) {
        returnIndex = i;
        break;
      }
    }
    
    if (returnIndex !== -1) {
      return tailLines.slice(returnIndex).join('\n');
    }
    
    return tailLines.join('\n');
  }
  
  // If it's reasonable size, include it all
  return previousCode;
}

const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE ENDING (for smooth transition):
\`\`\`tsx
${getTransitionContext(previousScene.code)}
\`\`\`

Focus on how elements exit in the last ~30 frames to create smooth entrances.

FUNCTION NAME: ${input.functionName}`;
```

### Solution 2: Two-Pass Approach

```typescript
// First, get AI to summarize the exit
async function getExitSummary(code: string): Promise<string> {
  // Quick call to a fast model
  const summary = await quickAI({
    prompt: `Briefly describe what happens in the last 30 frames of this scene:
    ${code.slice(-1000)} // Just the tail
    
    Focus on: exit directions, final colors, animation style.
    Keep under 50 words.`,
    model: 'gpt-3.5-turbo' // Fast and cheap
  });
  
  return summary;
}

// Then use the summary
const exitSummary = await getExitSummary(previousScene.code);
const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE EXIT: ${exitSummary}

Create entrance animations that flow from this exit.

FUNCTION NAME: ${input.functionName}`;
```

### Solution 3: Smart Section Extraction

```typescript
function extractRelevantSection(code: string, targetFrames: number = 30): string {
  const lines = code.split('\n');
  const relevant: string[] = [];
  let inReturnBlock = false;
  let braceCount = 0;
  
  // Find total duration
  const durationMatch = code.match(/durationInFrames[:\s]*[=\s]*(\d+)/);
  const totalFrames = durationMatch ? parseInt(durationMatch[1]) : 90;
  const targetStart = totalFrames - targetFrames;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track if we're in the return statement
    if (line.includes('return (')) {
      inReturnBlock = true;
    }
    
    if (inReturnBlock) {
      relevant.push(line);
      
      // Count braces to know when return block ends
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (line.includes(')') && braceCount <= 0) {
        break; // End of return statement
      }
    } else {
      // Include any animation that might affect the end
      if (line.includes(targetStart.toString()) || 
          line.includes((targetStart + 10).toString()) ||
          line.includes((targetStart + 20).toString()) ||
          line.includes((targetStart + 30).toString())) {
        relevant.push(line);
      }
    }
  }
  
  return relevant.join('\n');
}
```

### Solution 4: The Pragmatic Approach (Recommended)

```typescript
function getSceneTransitionContext(previousCode: string): string {
  const lines = previousCode.split('\n');
  const codeLength = previousCode.length;
  
  // Size-based strategy
  if (codeLength < 3000) {
    // Small enough, include it all
    return previousCode;
  } else if (codeLength < 8000) {
    // Medium: include last half
    return lines.slice(Math.floor(lines.length / 2)).join('\n');
  } else {
    // Large: just the return statement + some context
    let returnStart = lines.findIndex(line => line.includes('return ('));
    if (returnStart === -1) returnStart = lines.length - 100;
    
    // Include ~20 lines before return for context
    const contextStart = Math.max(0, returnStart - 20);
    return lines.slice(contextStart).join('\n');
  }
}

const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE CONTEXT (for transitions):
\`\`\`tsx
${getSceneTransitionContext(previousScene.code)}
\`\`\`
${previousScene.code.length > 3000 ? '\n[Note: Showing end portion of large scene]' : ''}

Create entrance animations that flow naturally from the previous scene's exit.

FUNCTION NAME: ${input.functionName}`;
```

## Recommendation

I'd go with Solution 4 because:
- Handles all sizes gracefully
- Always includes the visual output (return statement)
- Doesn't waste tokens on huge scenes
- Simple to implement
- No extra AI calls

The key insight: We really just need the JSX return statement and nearby animations to understand the exit. Everything else is implementation details we don't need for transitions.