# Exact Last Frames Strategy - Real Transitions

## The Problem with Our Current Transitions

You're right - our transitions suck because each scene is isolated. Real motion graphics flow continuously.

## Two Powerful Approaches

### Approach 1: Extract EXACT Last 30 Frames Code

Instead of summarizing, extract the actual code that affects the last second:

```typescript
function extractLastFramesExact(code: string, frameCount: number = 30): string {
  const lines = code.split('\n');
  const durationMatch = code.match(/durationInFrames[:\s]*[=\s]*(\d+)/);
  if (!durationMatch) return '';
  
  const totalFrames = parseInt(durationMatch[1]);
  const lastFrameStart = totalFrames - frameCount;
  
  // Extract relevant code sections
  const relevantCode: string[] = [];
  let inRelevantSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains animation affecting last 30 frames
    if (line.includes('interpolate') || line.includes('spring')) {
      const frameRangeMatch = line.match(/\[(\d+),\s*(\d+)\]/);
      if (frameRangeMatch) {
        const start = parseInt(frameRangeMatch[1]);
        const end = parseInt(frameRangeMatch[2]);
        
        // If animation is active in last 30 frames
        if (end >= lastFrameStart) {
          // Include the entire block around this animation
          relevantCode.push(line);
          inRelevantSection = true;
        }
      }
    }
    
    // Include style objects that might be relevant
    if (inRelevantSection && (line.includes('style') || line.includes('transform'))) {
      relevantCode.push(line);
    }
  }
  
  return `
// EXACT CODE FROM LAST 30 FRAMES (frames ${lastFrameStart}-${totalFrames}):
${relevantCode.join('\n')}

// Key exit states:
// - Final positions and transforms
// - Active colors at scene end
// - Elements still visible
`;
}
```

### Approach 2: Continuous Scene Building (Your Discovery!)

This is brilliant - instead of discrete scenes, build ONE continuous flow:

```typescript
// In system prompt, add:
"IMPORTANT: Your code may be extended by future additions. Structure your code modularly:
- Use clear variable names for animations (exitTextX, heroScale, etc.)
- Group related animations together
- Comment major sections
- Design for extensibility - future code will ADD to this scene"

// Example structure:
export default function ContinuousScene() {
  const { frame } = useCurrentFrame();
  
  // === SECTION 1: Hero Text (frames 0-30) ===
  const heroOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  // === SECTION 2: Product Demo (frames 30-60) ===
  const productScale = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp"
  });
  
  // === SECTION 3: Call to Action (frames 60-90) ===
  // ... future additions go here
}
```

## Overhead Analysis

**Last 30 Frames Approach:**
- Text overhead: ~200-500 chars
- Processing: Negligible
- Benefit: Smooth transitions
- Risk: None

**Continuous Scene Approach:**
- Text overhead: Grows with each addition
- Processing: Slightly more as scene grows
- Benefit: Perfect flow, no transitions needed
- Risk: Could hit token limits, harder to manage

## Hybrid Solution

What if we do BOTH?

1. **Start with scenes** for major sections
2. **Use exact last 30 frames** for smooth transitions
3. **Allow continuous building** within logical sections
4. **Split only when** content changes dramatically

```typescript
// Context for new addition:
const userPrompt = `USER REQUEST: "${input.userPrompt}"

SCENE CONTEXT:
This will extend the current scene. The last 30 frames show:
${extractLastFramesExact(previousCode)}

IMPORTANT: Structure your addition to flow from where the previous animation ends.
Consider this a continuation, not a new scene.

FUNCTION NAME: ${input.functionName}`;
```

## Implementation Recommendation

1. **Quick Win**: Implement exact last 30 frames extraction (low risk, high reward)
2. **Experiment**: Try continuous scene building for specific use cases
3. **Smart Splitting**: Only create new scenes for major topic changes
4. **Modular Code**: Always structure for future additions

The key insight: Motion graphics are about FLOW. Our current approach breaks that flow. Your discoveries point to a better way - treating video as a continuous stream rather than discrete chunks.

## Why This Works

- Real motion designers work in one timeline
- Transitions happen naturally within the flow
- Colors, positions, and timing stay consistent
- No jarring cuts between ideas

This could be the difference between "decent" and "dope" motion graphics!