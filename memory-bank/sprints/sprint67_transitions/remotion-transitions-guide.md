# Remotion Transitions - Official Documentation Guide

**Date**: January 3, 2025  
**Purpose**: Comprehensive guide to Remotion's official transition system and how Bazaar-Vid should implement it

## Executive Summary

Remotion provides a sophisticated transition system through the `@remotion/transitions` package. This system is fundamentally different from our current implementation and offers a production-ready solution for scene-to-scene transitions.

## Core Concepts

### 1. TransitionSeries Component

The foundation of Remotion transitions is the `<TransitionSeries>` component, which replaces our current `<Series>` approach:

```tsx
// Current Bazaar-Vid approach (no transitions)
<Series>
  <Series.Sequence durationInFrames={40}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <SceneB />
  </Series.Sequence>
</Series>

// Remotion transition approach
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={40}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 30 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### 2. Key Components of a Transition

#### Presentations (Visual Effects)
Define how the transition looks:
- `fade()` - Opacity-based transition
- `slide()` - Slides new scene in, pushes old out
- `wipe()` - New scene slides over old scene
- `flip()` - 3D rotation effect
- `clockWipe()` - Circular reveal
- `iris()` - Circular mask from center
- `cube()` - 3D cube rotation (paid feature)
- `none()` - No visual effect

#### Timings (Animation Curves)
Control the transition duration and easing:
- `linearTiming({ durationInFrames, easing? })`
- `springTiming({ durationInFrames, config, durationRestThreshold? })`

### 3. Duration Calculation

**Critical**: Total duration = Scene1 + Scene2 - TransitionDuration

Example:
- Scene A: 40 frames
- Scene B: 60 frames
- Transition: 30 frames
- Total duration: 40 + 60 - 30 = 70 frames

## Detailed Presentation APIs

### fade()
```typescript
fade({
  enterStyle?: React.CSSProperties,
  exitStyle?: React.CSSProperties,
  shouldFadeOutExitingScene?: boolean // default: false
})
```

### slide()
```typescript
slide({
  direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom',
  outerEnterStyle?: React.CSSProperties,
  outerExitStyle?: React.CSSProperties,
  innerEnterStyle?: React.CSSProperties,
  innerExitStyle?: React.CSSProperties
})
```

### wipe()
```typescript
wipe({
  direction: 'from-left' | 'from-top-left' | 'from-top' | 
            'from-top-right' | 'from-right' | 'from-bottom-right' | 
            'from-bottom' | 'from-bottom-left',
  outerEnterStyle?: React.CSSProperties,
  outerExitStyle?: React.CSSProperties,
  innerEnterStyle?: React.CSSProperties,
  innerExitStyle?: React.CSSProperties
})
```

### flip()
```typescript
flip({
  direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom',
  perspective?: number, // default: 1000
  outerEnterStyle?: React.CSSProperties,
  outerExitStyle?: React.CSSProperties,
  innerEnterStyle?: React.CSSProperties,
  innerExitStyle?: React.CSSProperties
})
```

## Custom Presentations

Remotion allows creating custom transition effects:

```typescript
import { TransitionPresentation } from '@remotion/transitions';

type CustomPresentationProps = {
  width: number;
  height: number;
};

const customPresentation = (
  props: CustomPresentationProps
): TransitionPresentation<CustomPresentationProps> => {
  return {
    component: CustomPresentationComponent,
    props
  };
};

const CustomPresentationComponent = ({
  children,
  presentationDirection, // 'entering' | 'exiting'
  presentationProgress,  // 0 to 1
  passedProps
}) => {
  // Implement custom transition logic
  return <div>{children}</div>;
};
```

## Implementation Strategy for Bazaar-Vid

### Phase 1: Replace Series with TransitionSeries

Update `/src/remotion/MainComposition.tsx`:

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { fade, slide, wipe } from '@remotion/transitions';
import { linearTiming, springTiming } from '@remotion/transitions';

export const VideoComposition = ({ scenes = [] }) => {
  return (
    <TransitionSeries>
      {scenes.map((scene, index) => {
        const nextScene = scenes[index + 1];
        const transition = scene.transitionToNext;
        
        return (
          <React.Fragment key={scene.id}>
            <TransitionSeries.Sequence durationInFrames={scene.duration}>
              <SceneErrorBoundary sceneName={scene.name}>
                <SceneComponent />
              </SceneErrorBoundary>
            </TransitionSeries.Sequence>
            
            {transition && nextScene && (
              <TransitionSeries.Transition
                presentation={getPresentation(transition)}
                timing={getTiming(transition)}
              />
            )}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};
```

### Phase 2: Map Our Schema to Remotion

Our schema already has the right structure:
```typescript
transitionToNext: {
  type: 'fade' | 'slide' | 'wipe',
  duration?: number,
  direction?: 'from-left' | 'from-right' | 'from-top' | 'from-bottom',
  useSpring?: boolean
}
```

Mapping function:
```typescript
const getPresentation = (transition) => {
  switch (transition.type) {
    case 'fade':
      return fade();
    case 'slide':
      return slide({ direction: transition.direction || 'from-right' });
    case 'wipe':
      return wipe({ direction: transition.direction || 'from-right' });
    default:
      return fade();
  }
};

const getTiming = (transition) => {
  const duration = transition.duration || 30;
  
  if (transition.useSpring) {
    return springTiming({
      durationInFrames: duration,
      config: { damping: 200 },
      durationRestThreshold: 0.0001
    });
  }
  
  return linearTiming({ durationInFrames: duration });
};
```

### Phase 3: AI Prompt Updates

Update code generator to include transitions:

```typescript
// When generating multiple scenes
scenes.push({
  id: generateId(),
  duration: 150,
  tsxCode: sceneCode,
  transitionToNext: {
    type: 'fade', // or intelligently choose based on content
    duration: 30,
    useSpring: true
  }
});
```

### Phase 4: UI Controls

Add transition controls in timeline:
- Transition type selector between scenes
- Duration slider (10-60 frames)
- Direction picker (for slide/wipe)
- Spring vs linear timing toggle

## When to Use Official vs Custom

### Use Official Remotion Transitions:
- **Standard transitions**: fade, slide, wipe
- **Professional polish**: Well-tested, performant
- **Quick implementation**: Less code to maintain
- **Cross-browser compatibility**: Handled by Remotion

### Create Custom Transitions When:
- **Brand-specific effects**: Unique to user's style
- **Content-aware transitions**: Based on scene content
- **Complex animations**: Multi-step or morphing transitions
- **Special effects**: Particle dissolves, shatter effects

## Migration Path

1. **Install dependency**: `npm install @remotion/transitions`
2. **Update MainComposition**: Replace Series with TransitionSeries
3. **Test with hardcoded transitions**: Verify rendering works
4. **Add UI controls**: Let users configure transitions
5. **Update AI prompts**: Generate intelligent transitions
6. **Create custom effects**: Build unique transitions

## Performance Considerations

- Transitions render both scenes simultaneously during overlap
- This doubles render load during transition period
- Keep transition durations reasonable (15-45 frames)
- Test on lower-end devices

## Conclusion

Remotion's transition system is:
- **Production-ready**: Used by thousands of projects
- **Well-designed**: Clean API, extensible
- **Compatible**: Fits our existing schema perfectly
- **Professional**: Provides high-quality effects

Recommendation: Adopt Remotion transitions as our primary implementation, with custom transitions for special cases.