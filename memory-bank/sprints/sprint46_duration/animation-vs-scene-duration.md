# Animation Duration vs Scene Duration - Technical Deep Dive

## The Fundamental Concept

In Remotion (and video editing in general), there are two distinct duration concepts:

### 1. Scene Duration (Container)
- **What it is**: The total time slot allocated to a scene in the timeline
- **Controlled by**: The `duration` property in the scene object
- **Units**: Frames (at 30fps, 30 frames = 1 second)
- **Purpose**: Determines when this scene ends and the next begins

### 2. Animation Duration (Content)
- **What it is**: How long animations/movements take within the scene
- **Controlled by**: Interpolations, springs, and sequences in the component code
- **Units**: Frame ranges in interpolate() calls
- **Purpose**: Creates the actual visual motion

## How Bazaar-Vid Enforces Scene Duration

### In PreviewPanelG.tsx (Main Preview Implementation)

```tsx
// From src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx:405-419
<AbsoluteFill style={{ backgroundColor: 'black' }}>
  <Loop durationInFrames={totalDuration}>
    <Series>
      {sceneComponents.map((sceneItem, sceneIndex) => {
        const sceneDuration = scenes[sceneIndex]?.duration || 150;
        return (
          <Series.Sequence
            key={`${sceneItem.sceneName}-${sceneIndex}`}
            durationInFrames={sceneDuration} // THIS IS THE HARD LIMIT
            premountFor={60}
          >
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <sceneItem.Component />
            </ErrorBoundary>
          </Series.Sequence>
        );
      })}
    </Series>
  </Loop>
</AbsoluteFill>
```

### In AdminVideoPlayer.tsx (Admin Panel Implementation)

```tsx
// From src/components/admin/AdminVideoPlayer.tsx:200-217
let startFrame = 0;
return (
  <AbsoluteFill>
    {scenes.map((scene) => {
      const sceneDuration = scene.duration || 150; // Default 5 seconds
      const from = startFrame;
      startFrame += sceneDuration;
      
      return (
        <Sequence
          key={scene.id}
          from={from}
          durationInFrames={sceneDuration} // THIS IS THE HARD LIMIT
        >
          <DynamicScene code={scene.tsxCode} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
```

**Key Point**: Both `<Sequence>` and `<Series.Sequence>` components with `durationInFrames` create hard boundaries. Nothing inside can render beyond this limit.

## Inside a Scene Component

```tsx
export default function AnimatedScene() {
  const frame = useCurrentFrame(); // Current frame within THIS scene (0-based)
  const { durationInFrames } = useVideoConfig(); // Total frames for THIS scene
  
  // Animation that takes 4 seconds (120 frames)
  const scale = interpolate(
    frame,
    [0, 30, 90, 120], // Animation keyframes
    [0, 1, 1, 0],     // Scale values
    { extrapolateRight: "clamp" }
  );
  
  return <div style={{ transform: `scale(${scale})` }}>Content</div>;
}
```

## What Happens with Duration Mismatches

### Case 1: Animation Longer Than Scene
```tsx
// Scene duration: 90 frames (3 seconds)
// Animation duration: 150 frames (5 seconds)

const opacity = interpolate(
  frame,
  [0, 50, 100, 150], // Wants to run for 150 frames
  [0, 1, 1, 0]
);

// RESULT: Animation gets cut off at frame 90
// Opacity never reaches 0, scene ends while still visible
```

### Case 2: Animation Shorter Than Scene
```tsx
// Scene duration: 150 frames (5 seconds)
// Animation duration: 90 frames (3 seconds)

const opacity = interpolate(
  frame,
  [0, 30, 60, 90], // Completes at frame 90
  [0, 1, 1, 0],
  { extrapolateRight: "clamp" } // Important!
);

// RESULT: Animation completes, then holds final value (0) for remaining 60 frames
// Scene appears empty for the last 2 seconds
```

## Best Practices for Duration Alignment

### 1. Always Plan Exit Animations
```tsx
const { durationInFrames } = useVideoConfig();
const exitStart = durationInFrames - 30; // Start exit 1 second before end

const opacity = interpolate(
  frame,
  [0, 20, exitStart, durationInFrames],
  [0, 1, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

### 2. Use Relative Timing
```tsx
const { durationInFrames } = useVideoConfig();

// Define phases as percentages
const entranceEnd = Math.floor(durationInFrames * 0.2); // 20%
const mainStart = entranceEnd;
const mainEnd = Math.floor(durationInFrames * 0.8); // 80%
const exitStart = mainEnd;

// Now animations scale with scene duration
const scale = interpolate(
  frame,
  [0, entranceEnd, mainEnd, durationInFrames],
  [0.8, 1, 1, 0.8]
);
```

### 3. Minimum Duration Requirements
```tsx
// Some animations need minimum time to look good
const MIN_DURATION = 60; // 2 seconds

if (durationInFrames < MIN_DURATION) {
  // Simplified animation for short scenes
  return <div style={{ opacity: 1 }}>Quick content</div>;
}

// Full animation for longer scenes
```

## How Code Generation Should Handle This

### 1. Parse Requested Duration
```typescript
// User: "Create a text animation for 5 seconds"
const requestedFrames = 5 * 30; // 150 frames
```

### 2. Generate Matching Animation Timeline
```typescript
const codeTemplate = `
const { durationInFrames } = useVideoConfig(); // Will be ${requestedFrames}

// Plan animation to fit exactly
const entranceFrames = 30; // 1 second entrance
const exitFrames = 30; // 1 second exit
const displayFrames = durationInFrames - entranceFrames - exitFrames;

// Animation that respects scene duration
const opacity = interpolate(
  frame,
  [0, entranceFrames, entranceFrames + displayFrames, durationInFrames],
  [0, 1, 1, 0]
);
`;
```

### 3. Validate Animation Feasibility
```typescript
function validateDuration(requestedSeconds: number, animationType: string): boolean {
  const frames = requestedSeconds * 30;
  
  switch(animationType) {
    case 'simple-fade':
      return frames >= 30; // 1 second minimum
    case 'complex-particles':
      return frames >= 90; // 3 seconds minimum
    case 'typewriter':
      // Depends on text length
      return frames >= textLength * 2; // 2 frames per character
  }
}
```

## Real-World Example from Bazaar-Vid

Looking at the actual Welcome Scene from `/src/lib/types/video/remotion-constants.ts`:

```tsx
// Scene duration: 300 frames (10 seconds)
// From the createDefaultProjectProps() function

export default function WelcomeScene({
  title = "Welcome to Bazaar",
  subtitle = "Transform Your Ideas Into Motion",
  backgroundColor = "#0f0f23",
  textColor = "#ffffff"
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Multi-stage animation sequences (10 seconds total)
  // Stage 1: Logo reveal (0-2s)
  // Stage 2: Main title and subtitle (1.5-3.5s)
  // Stage 3: Feature showcase (3.5-6s) - FAST!
  // Stage 4: Call to action (6-10s)

  // Global exit animation (last 1 second)
  const exitStart = durationInFrames - fps; // 270 frames (9s)
  const globalFadeOut = interpolate(
    frame,
    [exitStart, durationInFrames], // [270, 300]
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Logo reveal animation (0-2 seconds)
  const logoRevealStart = 0;
  const logoRevealEnd = fps * 2; // 60 frames
  const logoProgress = spring({
    frame: frame - logoRevealStart,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  // Main title animation (1.5-3.5 seconds)
  const titleStart = fps * 1.5; // 45 frames
  const titleEnd = fps * 3.5;   // 105 frames
  
  return (
    <AbsoluteFill style={{ opacity: globalFadeOut }}>
      {/* Conditional rendering based on frame ranges */}
      {frame >= logoRevealStart && frame < logoRevealEnd && (
        <LogoComponent progress={logoProgress} />
      )}
      
      {frame >= titleStart && frame < titleEnd && (
        <TitleComponent />
      )}
    </AbsoluteFill>
  );
}
```

## How Scene Duration Gets Set in Bazaar-Vid

### 1. From User Input (via Brain Orchestrator)
```typescript
// src/brain/orchestratorNEW.ts:70
requestedDurationSeconds: toolSelection.requestedDurationSeconds,
```

### 2. In Scene Creation (Add Tool)
```typescript
// When creating a new scene, duration is calculated:
// - From code analysis using codeDurationExtractor
// - From user request (requestedDurationSeconds)
// - Default: 150 frames (5 seconds)
```

### 3. Scene Storage Structure
```typescript
// From src/lib/types/video/input-props.ts:32
duration: z.number().int().min(1).describe("Duration in frames"),

// Example scene object:
{
  id: "scene-123",
  type: "custom",
  start: 0,
  duration: 180, // 6 seconds at 30fps
  data: { code: "...", name: "..." }
}
```

### 4. Duration Flow Through the System
1. **User Request**: "Create a 5-second animation"
2. **Brain Orchestrator**: Extracts `requestedDurationSeconds: 5`
3. **Code Generator**: Converts to frames (5 * 30 = 150)
4. **Scene Object**: Sets `duration: 150`
5. **Preview/Player**: Uses this duration in `<Sequence durationInFrames={150}>`

## Summary

1. **Scene duration** is the hard limit enforced by Remotion's `<Sequence>` component
2. **Animation duration** should be planned to fit within scene duration
3. In Bazaar-Vid, scene duration is set through:
   - User requests parsed by the brain orchestrator
   - Code analysis by the duration extractor
   - Default values (150 frames / 5 seconds)
4. Always include exit animations that complete before `durationInFrames`
5. Generated code must respect the requested duration by planning animation phases accordingly