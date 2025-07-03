# Custom Motion Graphics Transitions

This directory contains unique transition effects designed specifically for motion graphics videos. These transitions go beyond the basic fade/slide/wipe to create more dynamic and engaging scene changes.

## Available Transitions

### 1. Particle Dissolve (`ParticleDissolve.tsx`)
**Effect**: Scenes dissolve into particles that scatter and reform
**Best for**: Magical, dreamy, or tech content
**Parameters**:
- `particleCount`: Number of particles (default: 80)
- `particleSize`: Size of each particle (default: 4)
- `spread`: How far particles spread (default: 100)
- `colors`: Array of particle colors

```typescript
particleDissolve({
  particleCount: 100,
  particleSize: 6,
  spread: 150,
  colors: ['#FFE66D', '#FF6B6B', '#4ECDC4']
})
```

### 2. Glitch Transition (`GlitchTransition.tsx`)
**Effect**: Digital glitch effect with horizontal displacement and color shifts
**Best for**: Tech, gaming, cyberpunk content
**Parameters**:
- `intensity`: Glitch displacement amount (default: 20)
- `sliceCount`: Number of glitch slices (default: 8)
- `colorShift`: Enable RGB channel shifts (default: true)

```typescript
glitchTransition({
  intensity: 30,
  sliceCount: 12,
  colorShift: true
})
```

### 3. Circular Reveal (`CircularReveal.tsx`)
**Effect**: Reveals new scene through expanding/contracting circle
**Best for**: Focus transitions, spotlight effects
**Parameters**:
- `direction`: 'in' or 'out' (default: 'in')
- `center`: Center point {x, y} in percentages (default: {x: 50, y: 50})
- `smoothness`: Spring smoothness (default: 1)
- `rotation`: Add rotation during reveal (default: false)

```typescript
circularReveal({
  direction: 'in',
  center: { x: 50, y: 50 },
  smoothness: 1.5,
  rotation: true
})
```

### 4. Morph Transition (`MorphTransition.tsx`)
**Effect**: Organic shape morphing between scenes
**Best for**: Creative, artistic content
**Parameters**:
- `morphType`: 'liquid', 'geometric', or 'organic' (default: 'liquid')
- `color`: Morph shape color (default: '#000000')
- `segments`: Number of morph segments (default: 5)

```typescript
morphTransition({
  morphType: 'liquid',
  color: '#7FD8BE',
  segments: 8
})
```

### 5. Split Transition (`SplitTransition.tsx`)
**Effect**: Scene splits into multiple segments that slide in
**Best for**: Dynamic, energetic content
**Parameters**:
- `direction`: 'horizontal', 'vertical', 'diagonal', or 'radial' (default: 'vertical')
- `splits`: Number of split segments (default: 5)
- `stagger`: Stagger the animation (default: true)
- `reverse`: Reverse the stagger order (default: false)

```typescript
splitTransition({
  direction: 'vertical',
  splits: 7,
  stagger: true,
  reverse: false
})
```

### 6. Pixelate Transition (`PixelateTransition.tsx`)
**Effect**: Scenes transition through pixelation effect
**Best for**: Retro, gaming, digital content
**Parameters**:
- `maxPixelSize`: Maximum pixel size (default: 40)
- `colorShift`: Apply color shifting (default: true)
- `pattern`: 'random', 'wave', 'center', or 'corners' (default: 'random')

```typescript
pixelateTransition({
  maxPixelSize: 30,
  colorShift: true,
  pattern: 'center'
})
```

## Usage

These transitions are designed to work with Remotion's TransitionSeries component:

```typescript
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { particleDissolve } from './transitions/ParticleDissolve';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={particleDissolve({ particleCount: 100 })}
    timing={linearTiming({ durationInFrames: 45 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

## Testing

Use `TransitionShowcase.tsx` to preview all transitions:

```typescript
import { TransitionShowcase } from './transitions/TransitionShowcase';

// In your Remotion composition
<TransitionShowcase />
```

## Design Philosophy

These transitions are designed to:
1. **Be Unique**: Not found in typical video editors
2. **Be Configurable**: Extensive parameters for customization
3. **Be Performant**: Optimized for smooth playback
4. **Be Motion-Graphics Focused**: Designed for modern, dynamic content
5. **Be Context-Aware**: Different styles for different content types

## Future Transitions Ideas

- **Shatter**: Scene breaks into glass-like pieces
- **Liquid Fill**: Scene fills like pouring liquid
- **Typography Morph**: Letters transform between scenes
- **3D Flip**: Perspective-based card flip
- **Particle Swirl**: Vortex/tornado effect
- **Data Stream**: Matrix-like data flow
- **Kaleidoscope**: Geometric pattern transition