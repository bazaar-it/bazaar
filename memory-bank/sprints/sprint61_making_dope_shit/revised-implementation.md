# Revised Implementation - Sprint 61

## Core Principle: Guide Quality, Not Prescribe Duration

### System Prompt Updates

The system prompt should focus on:
1. **Animation Quality**: Fast entrances (8-12 frames), snappy timing
2. **Visual Hierarchy**: One focal element at a time
3. **Professional Standards**: Smooth easing, proper spacing

But NOT dictate scene duration - that's determined by user request and content needs.

### Smart Context Enhancement

#### 1. Text Only Generation

```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}

Generate a complete Remotion scene based on the user's request.
Create engaging motion graphics with smooth, professional animations.`;
```

Simple and clean - no hardcoded duration.

#### 2. With Previous Scene

```typescript
// Analyze previous scene for style patterns
const previousSceneInfo = extractSceneInfo(input.previousSceneCode);

const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE REFERENCE:
- Animation style: ${previousSceneInfo.animationSpeed} (e.g., "snappy 8-12 frame entries")
- Color palette: ${previousSceneInfo.mainColors.join(', ')}
- Duration: ${previousSceneInfo.duration} frames

FUNCTION NAME: ${input.functionName}

Create NEW content that matches the style and feel of the previous scene.`;
```

#### 3. With Images

```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

IMAGE CONTEXT: ${input.imageUrls.length} image(s) provided

Extract key visual elements from the images and create dynamic motion graphics.
Unless user requests exact recreation, use images as inspiration for animated content.`;
```

#### 4. With Web Context

```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

BRAND CONTEXT:
- Website: ${input.webContext.pageData.title}
- URL: ${input.webContext.originalUrl}

Analyze the website screenshots for brand colors and style.
Create motion graphics that feel on-brand while following the user's request.`;
```

### Helper Functions

```typescript
// Extract info from previous scene without being prescriptive
function extractSceneInfo(code: string) {
  const info = {
    duration: 90, // default
    animationSpeed: 'moderate',
    mainColors: [],
  };
  
  // Find durationInFrames
  const durationMatch = code.match(/durationInFrames[:\s]*(\d+)/);
  if (durationMatch) {
    info.duration = parseInt(durationMatch[1]);
  }
  
  // Analyze animation timing
  const interpolations = [...code.matchAll(/interpolate\([^,]+,\s*\[(\d+),\s*(\d+)\]/g)];
  if (interpolations.length > 0) {
    const avgTiming = interpolations.reduce((sum, match) => {
      return sum + (parseInt(match[2]) - parseInt(match[1]));
    }, 0) / interpolations.length;
    
    if (avgTiming < 15) info.animationSpeed = 'fast';
    else if (avgTiming > 30) info.animationSpeed = 'slow';
  }
  
  // Extract colors
  const colors = code.match(/#[0-9a-fA-F]{6}/g) || [];
  info.mainColors = [...new Set(colors)].slice(0, 3);
  
  return info;
}
```

### Benefits of This Approach

1. **User Control**: If user says "create 8 second video", they get 8 seconds
2. **Smart Defaults**: If no duration specified, AI chooses based on content
3. **Style Consistency**: Animation speed/quality guided by system prompt
4. **Flexible**: Works for any duration while maintaining quality

### What NOT to Do

❌ Don't hardcode durations in prompts
❌ Don't override user specifications
❌ Don't mix style guidance with duration requirements
❌ Don't assume all videos should be 2-4 seconds

### What TO Do

✅ Let user intent drive duration
✅ Use system prompt for animation quality
✅ Extract patterns from previous scenes
✅ Keep context enhancements focused and clear

This approach ensures we get fast, snappy animations regardless of whether the user wants a 2-second social media clip or an 8-second product demo.