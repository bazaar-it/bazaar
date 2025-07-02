# Feature 024: Loop Control

**Priority**: LOW  
**Complexity**: LOW  
**Effort**: 1 day  
**Dependencies**: Code generation system, Scene metadata

## Overview

Add loop control functionality to individual scenes, allowing users to specify how many times animations should loop instead of running infinitely. This feature provides better control over animation timing and prevents indefinite loops that can be distracting or consume unnecessary resources.

## Problem Statement

### Current Issues
- All animations loop infinitely by default
- No way to control animation repetition
- Cannot create finite animation sequences
- Difficult to time animations precisely
- No user control over loop behavior
- Animations may feel repetitive or overwhelming

### User Needs
- Set specific number of loops for animations
- One-shot animations that play once
- Control timing and pacing of video content
- Reduce visual fatigue from infinite loops
- Sync animations with overall video timing
- Professional animation control

## Technical Specification

### Scene Metadata Extension

#### 1. Database Schema Update
```typescript
// Add loop control to scene metadata
export const scenes = pgTable('scenes', {
  // ... existing fields
  loopCount: integer('loop_count').default(-1), // -1 = infinite, 0 = no animation, >0 = specific count
  loopDuration: real('loop_duration'), // duration of one loop in seconds
  animationType: varchar('animation_type', { length: 50 }), // 'infinite', 'finite', 'once'
});
```

#### 2. Scene Interface Extension
```typescript
// Update Scene type
interface Scene {
  // ... existing properties
  loopCount: number; // -1 for infinite, 0 for static, >0 for specific count
  loopDuration?: number; // duration of single loop
  animationType: 'infinite' | 'finite' | 'once' | 'static';
}
```

### Code Generation Updates

#### 1. Animation Code Modification
```typescript
// Update code generator to include loop controls
const generateAnimationCode = (animation: AnimationConfig, loopControl: LoopControl) => {
  const { loopCount, animationType } = loopControl;
  
  if (animationType === 'static') {
    // Remove all animations
    return generateStaticVersion(animation);
  }
  
  if (animationType === 'once') {
    // Single play, no loop
    return `
      const progress = useCurrentFrame() / ${animation.duration};
      const animationValue = progress <= 1 ? 
        interpolate(progress, [0, 1], [${animation.from}, ${animation.to}]) :
        ${animation.to};
    `;
  }
  
  if (animationType === 'finite' && loopCount > 0) {
    // Finite loops
    return `
      const totalLoops = ${loopCount};
      const loopDuration = ${animation.duration};
      const currentFrame = useCurrentFrame();
      const currentLoop = Math.floor(currentFrame / loopDuration);
      
      const animationValue = currentLoop < totalLoops ?
        interpolate(
          currentFrame % loopDuration,
          [0, loopDuration],
          [${animation.from}, ${animation.to}]
        ) : ${animation.to};
    `;
  }
  
  // Default infinite loop
  return generateInfiniteLoop(animation);
};
```

#### 2. Remotion Integration
```typescript
// Update Remotion components with loop control
const AnimatedElement = ({ loopControl, children, ...props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const getAnimationProgress = () => {
    if (loopControl.animationType === 'static') return 0;
    
    if (loopControl.animationType === 'once') {
      const progress = frame / (loopControl.loopDuration * fps);
      return Math.min(progress, 1);
    }
    
    if (loopControl.animationType === 'finite') {
      const loopFrames = loopControl.loopDuration * fps;
      const currentLoop = Math.floor(frame / loopFrames);
      
      if (currentLoop >= loopControl.loopCount) {
        return 1; // Final state
      }
      
      return (frame % loopFrames) / loopFrames;
    }
    
    // Infinite loop
    const loopFrames = loopControl.loopDuration * fps;
    return (frame % loopFrames) / loopFrames;
  };
  
  const progress = getAnimationProgress();
  
  return (
    <div style={{
      transform: getTransformForProgress(progress),
      opacity: getOpacityForProgress(progress),
      ...props.style
    }}>
      {children}
    </div>
  );
};
```

### UI Implementation

#### 1. Loop Control Panel
```typescript
// Scene settings component for loop control
const LoopControlPanel = ({ scene, onUpdate }) => {
  const [animationType, setAnimationType] = useState(scene.animationType || 'infinite');
  const [loopCount, setLoopCount] = useState(scene.loopCount || 1);
  const [loopDuration, setLoopDuration] = useState(scene.loopDuration || 2);
  
  const handleUpdate = () => {
    onUpdate({
      animationType,
      loopCount: animationType === 'finite' ? loopCount : -1,
      loopDuration
    });
  };
  
  return (
    <div className="loop-control-panel">
      <h3>Animation Control</h3>
      
      <div className="animation-type">
        <Label>Animation Type</Label>
        <Select value={animationType} onValueChange={setAnimationType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="infinite">Infinite Loop</SelectItem>
            <SelectItem value="finite">Limited Loops</SelectItem>
            <SelectItem value="once">Play Once</SelectItem>
            <SelectItem value="static">No Animation</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {animationType === 'finite' && (
        <div className="loop-count">
          <Label>Number of Loops</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={loopCount}
            onChange={(e) => setLoopCount(parseInt(e.target.value))}
          />
        </div>
      )}
      
      {['infinite', 'finite', 'once'].includes(animationType) && (
        <div className="loop-duration">
          <Label>Loop Duration (seconds)</Label>
          <Input
            type="number"
            min={0.5}
            max={10}
            step={0.1}
            value={loopDuration}
            onChange={(e) => setLoopDuration(parseFloat(e.target.value))}
          />
        </div>
      )}
      
      <Button onClick={handleUpdate}>Apply Changes</Button>
    </div>
  );
};
```

#### 2. Quick Loop Controls
```typescript
// Quick controls in scene card
const SceneLoopControls = ({ scene, onQuickUpdate }) => {
  const quickPresets = [
    { label: '∞', type: 'infinite', icon: Infinity },
    { label: '1x', type: 'once', icon: PlayOnce },
    { label: '3x', type: 'finite', count: 3, icon: Repeat },
    { label: '◦', type: 'static', icon: Pause }
  ];
  
  return (
    <div className="quick-loop-controls">
      {quickPresets.map(preset => (
        <Button
          key={preset.label}
          variant={scene.animationType === preset.type ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onQuickUpdate(preset)}
          title={`Set to ${preset.label}`}
        >
          <preset.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
};
```

#### 3. Visual Loop Indicator
```typescript
// Show loop status in scene preview
const LoopIndicator = ({ scene }) => {
  const getLoopText = () => {
    switch (scene.animationType) {
      case 'infinite': return '∞ loop';
      case 'once': return 'Play once';
      case 'finite': return `${scene.loopCount}x loops`;
      case 'static': return 'Static';
      default: return '';
    }
  };
  
  return (
    <div className="loop-indicator">
      <Badge variant="secondary" className="text-xs">
        {getLoopText()}
      </Badge>
    </div>
  );
};
```

### Chat Integration

#### 1. Natural Language Commands
```typescript
// Extend Brain Orchestrator to understand loop commands
const loopCommands = [
  'make it loop 3 times',
  'stop the animation after 2 loops',
  'make this play once',
  'remove the animation',
  'make it static',
  'infinite loop',
  'loop forever'
];

// Pattern matching for loop control
const parseLoopCommand = (prompt: string) => {
  // "loop 3 times" or "3 loops"
  const finiteMatch = prompt.match(/(?:loop|repeat)\s*(\d+)\s*times?|(\d+)\s*loops?/i);
  if (finiteMatch) {
    const count = parseInt(finiteMatch[1] || finiteMatch[2]);
    return { type: 'finite', count };
  }
  
  // "play once"
  if (/play\s+once|one\s+time/i.test(prompt)) {
    return { type: 'once' };
  }
  
  // "no animation" or "static"
  if (/no\s+animation|static|remove\s+animation/i.test(prompt)) {
    return { type: 'static' };
  }
  
  // "infinite" or "forever"
  if (/infinite|forever|continuously/i.test(prompt)) {
    return { type: 'infinite' };
  }
  
  return null;
};
```

#### 2. Loop Tool Implementation
```typescript
// New MCP tool for loop control
export const loopControlTool = {
  name: 'setLoopControl',
  description: 'Control animation looping behavior',
  parameters: {
    sceneId: z.string(),
    animationType: z.enum(['infinite', 'finite', 'once', 'static']),
    loopCount: z.number().optional(),
    loopDuration: z.number().optional()
  },
  execute: async ({ sceneId, animationType, loopCount, loopDuration }) => {
    const scene = await getScene(sceneId);
    
    // Update scene metadata
    await updateScene(sceneId, {
      animationType,
      loopCount: animationType === 'finite' ? loopCount : -1,
      loopDuration
    });
    
    // Regenerate code with loop controls
    const updatedCode = await regenerateSceneWithLoopControl(scene, {
      animationType,
      loopCount,
      loopDuration
    });
    
    return {
      success: true,
      message: getLoopMessage(animationType, loopCount),
      updatedCode
    };
  }
};
```

## Implementation Plan

### Phase 1: Backend Foundation (0.5 days)
1. Add loop control fields to database schema
2. Update Scene interface and types
3. Create loop control MCP tool
4. Add database migration

### Phase 2: Code Generation (0.25 days)
1. Modify animation code generation
2. Update Remotion component templates
3. Test loop control in generated code
4. Handle edge cases

### Phase 3: UI Implementation (0.25 days)
1. Create loop control panel component
2. Add quick controls to scene cards
3. Implement visual loop indicators
4. Test user interactions

## Success Metrics

- **Functionality**: All loop types work correctly in preview and export
- **Code Quality**: Generated code handles loops without errors
- **User Experience**: Loop controls are intuitive and discoverable
- **Performance**: Loop control doesn't impact rendering performance

## Animation Types Supported

### 1. Infinite Loop (Default)
- Animations repeat continuously
- Standard behavior for motion graphics
- Best for background elements

### 2. Finite Loops
- Specific number of repetitions (1-10)
- Useful for emphasis or attention-drawing
- Good for text animations and call-to-actions

### 3. Play Once
- Single animation play-through
- Professional look for presentations
- Good for entrance/exit animations

### 4. Static (No Animation)
- Removes all animation
- Clean, minimal appearance
- Good for final states or screenshots

## Edge Cases & Considerations

1. **Animation Timing**
   - Ensure loop duration matches scene duration
   - Handle cases where scene is shorter than one loop
   - Synchronize multiple animated elements

2. **Code Complexity**
   - Keep generated code readable
   - Handle nested animations properly
   - Maintain performance with complex loops

3. **User Expectations**
   - Clear messaging about what each type does
   - Preview behavior matches export behavior
   - Consistent terminology across UI

4. **Export Behavior**
   - Loop controls work in exported videos
   - Final frame state is appropriate
   - No jarring transitions

## Related Features

- Scene duration control (existing)
- Animation libraries (future)
- Timeline controls (future)
- Keyframe editing (future)

## Future Enhancements

1. **Advanced Loop Controls**
   - Ease in/out for loop transitions
   - Different loop types per element
   - Loop delays and offsets
   - Reverse loops (ping-pong)

2. **Loop Presets**
   - Save common loop configurations
   - Apply to multiple scenes
   - Template-based loop patterns
   - Community-shared presets

3. **Timeline Integration**
   - Visual representation of loops in timeline
   - Drag to adjust loop timing
   - Loop markers and indicators
   - Multi-track loop management

## Testing Checklist

- [ ] All animation types work in preview
- [ ] Loop controls persist across sessions
- [ ] Generated code compiles correctly
- [ ] Export respects loop settings
- [ ] UI controls are responsive
- [ ] Natural language commands work
- [ ] Edge cases handled gracefully
- [ ] Performance impact minimal
- [ ] Backward compatibility maintained
- [ ] Documentation updated