# BAZAAR-301: Improve Animation Focus in Generated Components

## Priority: 🔥 HIGH

## Summary
Improve LLM component generation to **match user intent** - focusing on visual animations when appropriate, but allowing text when the user specifically requests it. The goal is to avoid generic placeholder text that doesn't match the user's prompt while being production-ready and user-friendly.

## Problem Statement
Generated components are too literal about storyboard descriptions, resulting in:

### Current (Text-Heavy) Output:
```tsx
<h1>Dramatic Bubble Animation</h1>
<p>A mesmerizing journey of expansion and explosion</p>
```

### Expected (Animation-Focused) Output:
```tsx
<div style={{
  width: bubbleSize,
  height: bubbleSize,
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.3)',
  transform: `scale(${bubbleScale})`,
  // Actual bubble animation
}} />
```

## Root Cause Analysis

### 1. **Storyboard Structure Issue**
Current storyboard includes descriptive text in scene props:
```json
{
  "props": {
    "title": "Dramatic Bubble Animation",
    "text": "A mesmerizing journey of expansion and explosion"
  }
}
```

### 2. **LLM Prompt Lacks Animation Guidance**
Current prompt doesn't emphasize visual animation over text display.

### 3. **Scene Planning Too Descriptive**
Scene planning agent creates overly descriptive text that gets literally translated to JSX.

## Acceptance Criteria

### ✅ Must Have
1. Generated components **match user intent** - visual animations when requested, text when requested
2. **TitleScene/OutroScene exception**: May include text titles and CTAs as appropriate
3. Avoid generic placeholder text that doesn't match user prompt
4. Bubble animation example produces actual animated bubble, not text about bubbles
5. Components use interpolate, spring, and frame-based animations effectively
6. Scene props used for animation parameters, not display text
7. **Production-ready**: Allow iteration - users can reprompt and refine rather than strict blocking

### ✅ Should Have
1. Animation templates for common patterns (expand, explode, fade, slide)
2. Better separation between scene metadata and animation props
3. Visual complexity appropriate to scene duration

## Technical Implementation

### 1. Update Scene Planning to Separate Animation Props

**File**: `src/server/api/routers/generation.ts` (planScenes)

**Current Scene Props**:
```json
{
  "props": {
    "title": "Dramatic Bubble Animation",
    "text": "A mesmerizing journey of expansion and explosion"
  }
}
```

**New Animation-Focused Props**:
```json
{
  "props": {
    "animationType": "bubble-expand-explode",
    "primaryColor": "rgba(255,87,51,0.5)",
    "secondaryColor": "rgba(255,255,255,0.3)",
    "maxScale": 2.5,
    "explosionFrame": 120,
    "logoText": "bazaar"
  },
  "metadata": {
    "description": "Bubble expansion and explosion with logo reveal",
    "visualConcept": "Glass bubble slowly expanding then exploding"
  }
}
```

### 2. Enhanced LLM Prompt for Animation Focus

**File**: `src/server/api/routers/generation.ts` (generateComponentCode)

```typescript
const messages = [
  {
    role: 'system' as const,
    content: `You are a Remotion animation specialist. Create visually engaging animated components.

ANIMATION FOCUS REQUIREMENTS:
1. Prioritize VISUAL ELEMENTS over text display
2. Use scene props for animation parameters, not display text
3. Create smooth, frame-based animations using interpolate and spring
4. Build visual effects that match the scene concept

ANIMATION PATTERNS TO USE:
- Scaling: interpolate(frame, [0, 30], [0, 1])
- Rotation: interpolate(frame, [0, duration], [0, 360])
- Opacity: interpolate(frame, [0, 30], [0, 1])
- Position: interpolate(frame, [0, 60], [startPos, endPos])
- Spring effects: spring({ frame, fps, config: { damping: 10, stiffness: 100 } })

VISUAL ELEMENTS TO CREATE:
- Geometric shapes (circles, rectangles, polygons)
- SVG graphics for complex shapes
- CSS animations and transforms
- Particle-like effects using multiple elements
- Color transitions and gradients

AVOID:
❌ Large blocks of descriptive text
❌ Literal interpretation of scene descriptions
❌ Static layouts with minimal animation

EXAMPLE - Bubble Animation:
\`\`\`tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function BubbleScene({ primaryColor = "rgba(255,87,51,0.5)", maxScale = 2.5 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Bubble expansion animation
  const bubbleScale = interpolate(frame, [0, 90], [0.1, maxScale], {
    extrapolateRight: 'clamp'
  });
  
  // Explosion effect
  const isExploding = frame > 90;
  const explosionScale = isExploding ? 
    interpolate(frame, [90, 120], [maxScale, 0], { extrapolateRight: 'clamp' }) : 
    bubbleScale;
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          transform: \`scale(\${explosionScale})\`,
          boxShadow: \`0 0 \${explosionScale * 20}px \${primaryColor}\`,
        }}
      />
    </AbsoluteFill>
  );
}
\`\`\``
  },
  {
    role: 'user' as const,
    content: `Create an animated ${scene.template} component for "${scene.name}".

ANIMATION BRIEF: ${scene.metadata?.visualConcept || scene.metadata?.description}

Animation Props: ${JSON.stringify(scene.props, null, 2)}
Style Colors: ${JSON.stringify(style.colorPalette, null, 2)}
Duration: ${scene.duration} frames (${Math.round(scene.duration / 30 * 10) / 10}s)

Focus on creating smooth, visually engaging animations that bring the concept to life through movement, scaling, color, and effects - not through text descriptions.`
  }
];
```

### 3. Update Scene Planning Prompt

**File**: `src/server/api/routers/generation.ts` (planScenes)

Add animation-focused guidance to scene planning:

```typescript
const messages = [
  {
    role: 'system' as const,
    content: `You are a video storyboard planner specializing in animated content.

For each scene, focus on VISUAL CONCEPTS that can be animated, not text descriptions.

Scene props should contain ANIMATION PARAMETERS:
- animationType: "expand", "rotate", "fade", "slide", "bounce", "explode"
- colors: primary, secondary, accent colors for the animation
- timing: keyframe timings and animation speeds
- scale: size changes and transformations
- effects: special visual effects needed

AVOID putting descriptive text in props - use metadata instead.

Example good props:
{
  "animationType": "bubble-expand-explode",
  "primaryColor": "#ff5733",
  "maxScale": 2.5,
  "explosionFrame": 120,
  "logoText": "bazaar"
}

Example bad props:
{
  "title": "Dramatic Bubble Animation", 
  "text": "A mesmerizing journey of expansion and explosion"
}`
  }
];
```

### 4. Create Animation Template Library

**File**: `src/app/projects/[id]/generate/utils/animationTemplates.ts`

```typescript
export const animationTemplates = {
  'bubble-expand-explode': {
    description: 'Bubble that expands and then explodes',
    defaultProps: {
      primaryColor: 'rgba(255,87,51,0.5)',
      maxScale: 2.5,
      explosionFrame: 120
    },
    codeTemplate: `
      const bubbleScale = interpolate(frame, [0, explosionFrame], [0.1, maxScale]);
      const isExploding = frame > explosionFrame;
      const finalScale = isExploding ? 
        interpolate(frame, [explosionFrame, explosionFrame + 30], [maxScale, 0]) : 
        bubbleScale;
    `
  },
  'logo-reveal': {
    description: 'Logo appears with scaling and fade effect',
    defaultProps: {
      logoText: 'LOGO',
      revealFrame: 60,
      color: '#ffffff'
    }
  },
  'slide-in': {
    description: 'Element slides in from specified direction',
    defaultProps: {
      direction: 'left',
      distance: 200,
      duration: 60
    }
  }
};
```

## Testing Strategy

### Manual Testing
1. **Bubble Animation Test**: Submit "bubble expanding and exploding" prompt
   - ✅ Should generate actual animated bubble, not text about bubbles
   - ✅ Should use scaling and opacity animations
   - ✅ Should have explosion effect

2. **Logo Reveal Test**: Submit "logo appears" prompt
   - ✅ Should animate logo appearance, not display text about logos
   - ✅ Should use fade/scale effects

3. **General Animation Test**: Submit various animation prompts
   - ✅ Components should focus on visual movement
   - ✅ Minimal descriptive text in final output

### Automated Testing
1. Parse generated component code and count text elements vs animation elements
2. Verify presence of interpolate/spring functions in generated code
3. Check that scene props are used for animation parameters

## Success Metrics

### Before (Current State)
- Generated components: 70% text display, 30% animation
- Bubble prompt produces: Text saying "bubble animation"
- User experience: Static text-heavy videos

### After (Target State)
- Generated components: **Match user intent** (animation-focused prompts → 80% animation, text-focused prompts → appropriate text)
- Bubble prompt produces: Actual animated expanding/exploding bubble
- User experience: Visually engaging animated videos that match their request
- **Duration handling**: Address 25s vs 8s mismatch by trimming scenes to ≤45 frames (maintain 30fps)

## Files to Modify

### Primary Changes
- `src/server/api/routers/generation.ts` - Update both planScenes and generateComponentCode prompts
- `src/app/projects/[id]/generate/utils/animationTemplates.ts` - New animation template library

### Secondary Changes
- `src/app/projects/[id]/generate/agents/sceneAgent.ts` - Update fallback scene generation
- `src/app/projects/[id]/generate/types/storyboard.ts` - Add animation prop types

## Definition of Done
1. ✅ Bubble animation prompt generates actual animated bubble
2. ✅ Generated components use <80% text display, >80% visual animation
3. ✅ Scene props contain animation parameters, not display text
4. ✅ Components use interpolate/spring for smooth animations
5. ✅ Visual complexity matches scene duration appropriately
6. ✅ Animation templates available for common patterns

## Dependencies
- BAZAAR-300 (Fix Component Generation Patterns) should be completed first

## Estimated Effort
- **Development**: 6-8 hours
- **Testing**: 3-4 hours  
- **Total**: 9-12 hours

## Risk Assessment
- **Medium Risk**: Changes affect LLM output quality
- **High Impact**: Significantly improves user experience
- **Mitigation**: Gradual rollout with A/B testing of prompts 