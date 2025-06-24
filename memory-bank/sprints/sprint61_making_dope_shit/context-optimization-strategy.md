# Context Optimization Strategy - Sprint 61

## Current State Analysis

The system uses different user prompt enhancements for each scenario, but there are clear optimization opportunities. The system prompt stays the same, but user prompts are enhanced differently.

## Optimized Context Building for Each Scenario

### 1. Text Only (No Context)

**Current Issues:**
- Generic instructions ("Create engaging motion graphics")
- Mentions "Framer Motion" but system doesn't support it
- Default 5 seconds is too long for modern motion graphics

**Optimized Approach:**
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

SCENE TYPE: Standalone motion graphic
PACING: Fast and punchy (most animations 8-15 frames)
FOCUS: Create ONE hero element that commands attention

Generate a complete scene with:
- Quick, snappy animations (no animation over 30 frames)
- Clear visual hierarchy (1-2 main elements max)
- Dynamic composition (avoid centering everything)
- Scene duration based on content complexity (60-120 frames typical)`;
```

### 2. With Previous Scene Reference

**Current Issues:**
- Just dumps entire previous scene code
- No analysis of what made the previous scene good
- Doesn't extract key patterns (timing, colors, animations)

**Optimized Approach:**
```typescript
// First, analyze the previous scene
const previousSceneAnalysis = analyzePreviousScene(input.previousSceneCode);

const userPrompt = `USER REQUEST: "${input.userPrompt}"

STYLE REFERENCE FROM PREVIOUS SCENE:
- Animation timing: ${previousSceneAnalysis.timing} (e.g., "fast 8-12 frame entries")
- Color palette: ${previousSceneAnalysis.colors.join(', ')}
- Font choices: ${previousSceneAnalysis.fonts}
- Key animations: ${previousSceneAnalysis.animationPatterns}
- Composition style: ${previousSceneAnalysis.layout}

IMPORTANT: Create NEW content matching this style, don't copy the previous scene.
Focus on maintaining the FEEL and TIMING, not copying elements.`;
```

### 3. With Images

**Current Issues:**
- Vague instruction to "recreate UI/layout"
- No guidance on what to animate or how
- Includes reference to non-existent visionAnalysis

**Optimized Approach:**
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

IMAGE CONTEXT:
You're seeing ${input.imageUrls.length} image(s) that show design/UI elements.

YOUR TASK:
1. EXTRACT key visual elements (text, shapes, colors, layout)
2. RECREATE them as Remotion components
3. ADD motion based on element hierarchy:
   - Hero text: Scale + fade entry (12 frames)
   - Supporting elements: Staggered slide-ins (8 frames each)
   - Background: Subtle animation or gradient
4. IGNORE static positioning - make everything dynamic

PACING: Keep it fast - total scene 60-90 frames unless user specifies longer.`;
```

### 4. With Images + Previous Scenes

**New Scenario - Currently Missing!**

```typescript
const previousSceneAnalysis = analyzePreviousScene(previousScene.tsxCode);

const userPrompt = `USER REQUEST: "${input.userPrompt}"

IMAGE CONTEXT:
Analyzing ${input.imageUrls.length} image(s) for visual elements.

STYLE CONTINUITY:
Match the previous scene's:
- Animation speed: ${previousSceneAnalysis.timing}
- Color system: ${previousSceneAnalysis.colors.join(', ')}
- Entry/exit patterns: ${previousSceneAnalysis.animationPatterns}

YOUR TASK:
1. Extract visual elements from the image
2. Animate them using the established style
3. Maintain visual consistency across the video
4. Use similar timing and easing functions`;
```

### 5. With Web Context

**Current Issues:**
- Provides too much text data (headings, descriptions)
- Focuses on "brand matching" rather than creating motion
- Screenshots are mentioned but not emphasized

**Optimized Approach:**
```typescript
const enhancedPrompt = `${input.userPrompt}

WEBSITE VISUAL CONTEXT:
- Brand: ${input.webContext.pageData.title}
- Screenshots provided: Desktop and mobile views

YOUR TASK:
1. ANALYZE the screenshots for:
   - Primary colors (use these throughout)
   - Typography hierarchy
   - Key visual elements or logos
   
2. CREATE motion graphics that feel like they belong to this brand:
   - Use extracted colors as your palette
   - Match font weights/styles if visible
   - Incorporate brand elements tastefully
   
3. FOCUS on the user's request, using brand as styling guide
   - Don't recreate the website, create motion graphics
   - Brand elements are for consistency, not copying

PACING: Modern and fast - this is for social/video, not web.`;
```

### 6. With Videos

**Current Issues:**
- Good technical instructions for Video component
- But no guidance on creating compelling overlays
- Default duration too long (5-10 seconds)

**Optimized Approach:**
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

VIDEO BACKGROUND CONTEXT:
${input.videoUrls.length} video(s) provided as background elements.

COMPOSITION APPROACH:
1. VIDEO LAYER: 
   - Use as fullscreen background
   - Apply subtle color overlay if needed for contrast
   - Volume: 0 (always muted for background)

2. CONTENT LAYER:
   - Create HIGH CONTRAST text/graphics over video
   - Use bold, large typography (4-6rem)
   - Add drop shadows or outlines for readability
   
3. ANIMATION STRATEGY:
   - Quick text entrances (10-15 frames)
   - Synchronized with assumed video beats
   - Exit before video loops or ends

DURATION: Match user request, default 90 frames (3 seconds) for social media.`;
```

### 7. After Template Selection

**New Scenario - When user picks a template then adds scenes**

```typescript
// Assuming template metadata is available
const userPrompt = `USER REQUEST: "${input.userPrompt}"

TEMPLATE CONTEXT:
You're adding to a video that started with the "${templateName}" template.
This template style includes: ${templateDescription}

YOUR TASK:
1. Create NEW content based on the user request
2. Match the template's energy and pacing
3. Use complementary (not identical) animations
4. Maintain visual consistency without copying

IMPORTANT: Templates set the tone, but each scene should be unique.`;
```

## Key Improvements Summary

1. **Remove outdated references** (Framer Motion, visionAnalysis)
2. **Add scene analysis** for better style matching
3. **Emphasize speed** - modern motion graphics are FAST
4. **Focus on hierarchy** - one hero element at a time
5. **Provide specific timing** for each scenario
6. **Better image handling** - extract and animate, don't just recreate
7. **Smart web context** - use for styling, not content
8. **Video overlay guidance** - high contrast and readability

## Implementation Priority

1. First: Update system prompt with better timing/pacing rules
2. Second: Implement previousSceneAnalysis function
3. Third: Revise each user prompt enhancement
4. Fourth: Add missing scenarios (image + previous, template context)
5. Fifth: Test with real examples and iterate