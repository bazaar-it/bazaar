# Feature 007: Scene Transitions

**Feature ID**: 007  
**Priority**: HIGH  
**Complexity**: HIGH  
**Created**: January 2, 2025  

## Overview

Implement smooth transitions between scenes to create professional, polished videos. This feature adds visual continuity between scenes using various transition effects like fades, slides, and zooms, moving beyond the current hard-cut-only approach.

## Current State

- Hard cuts only between scenes
- No transition options or timing control
- Abrupt scene changes can be jarring
- No visual indication of scene boundaries
- Each scene is completely independent
- No transition preview or configuration

## Problem Statement / User Need

Professional video content requires smooth transitions:
- "The jump between scenes is too harsh"
- "Can I add a fade between clips?"
- "I want it to flow better, not just cut"
- "How do I make smooth transitions like in real videos?"

Market expectations:
- All video editing tools offer transitions
- Essential for professional-looking content
- Critical for storytelling and pacing
- Expected feature by content creators

Use cases:
- Fade to black between chapters
- Slide transitions for presentations
- Zoom transitions for dynamic content
- Cross-dissolve for smooth scene blending

## Proposed Solution

Create a comprehensive transition system:

1. **Transition Library**: Pre-built transition effects
2. **Transition UI**: Visual selection and configuration
3. **Timeline Integration**: Show transitions between scenes
4. **Timing Control**: Adjustable transition duration
5. **Preview System**: See transitions in real-time
6. **AI Integration**: Smart transition suggestions

## Technical Implementation

### Phase 1: Transition Infrastructure
```typescript
// src/lib/types/video.ts
export interface SceneTransition {
  id: string;
  type: TransitionType;
  duration: number; // frames
  fromSceneId: string;
  toSceneId: string;
  settings: TransitionSettings;
}

export type TransitionType = 
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'dissolve'
  | 'wipe'
  | 'none';

export interface TransitionSettings {
  easing?: string;
  color?: string; // for fade to color
  direction?: 'in' | 'out' | 'both';
  intensity?: number; // 0-1
}

// Update Scene type
export interface Scene {
  id: string;
  projectId: string;
  order: number;
  title: string;
  tsxCode: string;
  duration: number;
  // New transition field
  transitionIn?: SceneTransition;
  transitionOut?: SceneTransition;
}
```

### Phase 2: Transition Components
```typescript
// src/remotion/transitions/FadeTransition.tsx
import { interpolate, Sequence } from 'remotion';

export const FadeTransition: React.FC<{
  duration: number;
  type: 'in' | 'out' | 'cross';
  color?: string;
}> = ({ duration, type, color = 'black' }) => {
  const opacity = interpolate(
    frame,
    type === 'in' 
      ? [0, duration]
      : [0, duration],
    type === 'in'
      ? [1, 0]
      : [0, 1]
  );

  return (
    <AbsoluteFill style={{ 
      backgroundColor: color, 
      opacity,
      pointerEvents: 'none'
    }} />
  );
};

// src/remotion/transitions/SlideTransition.tsx
export const SlideTransition: React.FC<{
  duration: number;
  direction: 'left' | 'right' | 'up' | 'down';
  fromContent: React.ReactNode;
  toContent: React.ReactNode;
}> = ({ duration, direction, fromContent, toContent }) => {
  const progress = interpolate(frame, [0, duration], [0, 1]);
  
  const getTransform = (isFrom: boolean) => {
    const offset = isFrom ? -progress : 1 - progress;
    switch (direction) {
      case 'left':
        return `translateX(${offset * 100}%)`;
      case 'right':
        return `translateX(${-offset * 100}%)`;
      case 'up':
        return `translateY(${offset * 100}%)`;
      case 'down':
        return `translateY(${-offset * 100}%)`;
    }
  };

  return (
    <>
      <AbsoluteFill style={{ transform: getTransform(true) }}>
        {fromContent}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: getTransform(false) }}>
        {toContent}
      </AbsoluteFill>
    </>
  );
};

// src/remotion/transitions/ZoomTransition.tsx
export const ZoomTransition: React.FC<{
  duration: number;
  type: 'in' | 'out';
  fromContent: React.ReactNode;
  toContent: React.ReactNode;
}> = ({ duration, type, fromContent, toContent }) => {
  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const fromScale = type === 'in' 
    ? interpolate(progress, [0, 1], [1, 1.5])
    : interpolate(progress, [0, 1], [1, 0.5]);
    
  const toScale = type === 'in'
    ? interpolate(progress, [0, 1], [0.5, 1])
    : interpolate(progress, [0, 1], [1.5, 1]);

  const fromOpacity = interpolate(progress, [0, 0.5, 1], [1, 1, 0]);
  const toOpacity = interpolate(progress, [0, 0.5, 1], [0, 0, 1]);

  return (
    <>
      <AbsoluteFill style={{ 
        transform: `scale(${fromScale})`,
        opacity: fromOpacity
      }}>
        {fromContent}
      </AbsoluteFill>
      <AbsoluteFill style={{ 
        transform: `scale(${toScale})`,
        opacity: toOpacity
      }}>
        {toContent}
      </AbsoluteFill>
    </>
  );
};
```

### Phase 3: Transition Selection UI
```typescript
// src/components/timeline/TransitionSelector.tsx
const TRANSITIONS = [
  { id: 'none', name: 'Cut', icon: '✂️', duration: 0 },
  { id: 'fade', name: 'Fade', icon: '🌅', duration: 15 },
  { id: 'slide-left', name: 'Slide Left', icon: '←', duration: 20 },
  { id: 'slide-right', name: 'Slide Right', icon: '→', duration: 20 },
  { id: 'zoom-in', name: 'Zoom In', icon: '🔍+', duration: 25 },
  { id: 'zoom-out', name: 'Zoom Out', icon: '🔍-', duration: 25 },
  { id: 'dissolve', name: 'Dissolve', icon: '💧', duration: 30 }
];

export function TransitionSelector({ 
  onSelect,
  currentTransition 
}: {
  onSelect: (transition: TransitionConfig) => void;
  currentTransition?: TransitionConfig;
}) {
  const [showDuration, setShowDuration] = useState(false);

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-sm font-medium mb-3">Scene Transition</h3>
      
      <div className="grid grid-cols-4 gap-2">
        {TRANSITIONS.map(transition => (
          <button
            key={transition.id}
            onClick={() => onSelect(transition)}
            className={cn(
              "p-3 rounded border text-center hover:bg-gray-50",
              currentTransition?.id === transition.id && "border-blue-500 bg-blue-50"
            )}
          >
            <div className="text-2xl mb-1">{transition.icon}</div>
            <div className="text-xs">{transition.name}</div>
          </button>
        ))}
      </div>

      {currentTransition && currentTransition.id !== 'none' && (
        <div className="mt-4">
          <label className="text-sm">
            Duration: {currentTransition.duration} frames
          </label>
          <input
            type="range"
            min="5"
            max="60"
            value={currentTransition.duration}
            onChange={(e) => onSelect({
              ...currentTransition,
              duration: parseInt(e.target.value)
            })}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
```

### Phase 4: Timeline Integration
```typescript
// src/components/timeline/Timeline.tsx enhancement
export function Timeline({ scenes, transitions }: TimelineProps) {
  return (
    <div className="timeline-container">
      {scenes.map((scene, index) => (
        <React.Fragment key={scene.id}>
          {/* Scene thumbnail */}
          <div className="scene-block">
            <SceneThumbnail scene={scene} />
          </div>
          
          {/* Transition indicator between scenes */}
          {index < scenes.length - 1 && (
            <TransitionIndicator
              transition={getTransitionBetween(scene.id, scenes[index + 1].id)}
              onEdit={(transition) => updateTransition(transition)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Transition indicator component
function TransitionIndicator({ transition, onEdit }) {
  return (
    <div 
      className="transition-indicator"
      onClick={() => onEdit(transition)}
    >
      {transition ? (
        <div className="transition-icon">
          {getTransitionIcon(transition.type)}
        </div>
      ) : (
        <div className="add-transition">+</div>
      )}
    </div>
  );
}
```

### Phase 5: Video Compilation with Transitions
```typescript
// src/remotion/VideoComposition.tsx enhancement
export const VideoComposition: React.FC<VideoProps> = ({ scenes }) => {
  const renderScenesWithTransitions = () => {
    const elements: React.ReactNode[] = [];
    let currentFrame = 0;

    scenes.forEach((scene, index) => {
      const nextScene = scenes[index + 1];
      const transition = scene.transitionOut;
      
      if (transition && nextScene) {
        // Scene with transition
        const sceneDuration = scene.duration - transition.duration;
        
        // Main scene content
        elements.push(
          <Sequence
            key={`scene-${scene.id}`}
            from={currentFrame}
            durationInFrames={sceneDuration}
          >
            <SceneRenderer code={scene.tsxCode} />
          </Sequence>
        );

        // Transition
        elements.push(
          <Sequence
            key={`transition-${scene.id}-${nextScene.id}`}
            from={currentFrame + sceneDuration}
            durationInFrames={transition.duration}
          >
            <TransitionRenderer
              type={transition.type}
              duration={transition.duration}
              fromContent={<SceneRenderer code={scene.tsxCode} />}
              toContent={<SceneRenderer code={nextScene.tsxCode} />}
              settings={transition.settings}
            />
          </Sequence>
        );

        currentFrame += scene.duration;
      } else {
        // Scene without transition
        elements.push(
          <Sequence
            key={`scene-${scene.id}`}
            from={currentFrame}
            durationInFrames={scene.duration}
          >
            <SceneRenderer code={scene.tsxCode} />
          </Sequence>
        );
        
        currentFrame += scene.duration;
      }
    });

    return elements;
  };

  return <>{renderScenesWithTransitions()}</>;
};
```

### Phase 6: AI Transition Suggestions
```typescript
// src/server/services/ai/transitionSuggestions.ts
export async function suggestTransitions(
  scenes: Scene[],
  context: ProjectContext
): Promise<TransitionSuggestion[]> {
  const prompt = `
Given these video scenes, suggest appropriate transitions:

${scenes.map(s => `- ${s.title}: ${s.description}`).join('\n')}

Project style: ${context.style}
Video type: ${context.type}

Suggest transitions between each scene pair considering:
1. Content relationship
2. Pacing
3. Emotional flow
4. Visual continuity

Return format: [{ from: sceneId, to: sceneId, type: transitionType, reason: explanation }]
`;

  const suggestions = await llm.generateJSON(prompt);
  
  return suggestions.map(s => ({
    ...s,
    confidence: calculateConfidence(s, scenes)
  }));
}

// Auto-apply high-confidence suggestions
export async function autoApplyTransitions(
  projectId: string,
  threshold: number = 0.8
) {
  const scenes = await getProjectScenes(projectId);
  const suggestions = await suggestTransitions(scenes);
  
  const highConfidence = suggestions.filter(s => s.confidence > threshold);
  
  for (const suggestion of highConfidence) {
    await applyTransition(projectId, suggestion);
  }
}
```

## Success Metrics

1. **Feature Adoption**: 70% of projects use at least one transition
2. **Video Quality**: 30% increase in "professional" ratings
3. **Export Increase**: 20% more videos completed and exported
4. **User Satisfaction**: Transitions in top 3 requested features
5. **Performance**: Transitions add <10% to render time

## Future Enhancements

1. **Custom Transitions**: User-created transition effects
2. **Motion Graphics**: Animated transition overlays
3. **Sound Integration**: Audio crossfades with transitions
4. **Transition Templates**: Pre-built transition sequences
5. **AI Timing**: Automatic transition timing based on music
6. **Advanced Effects**: Blur, distortion, particle transitions
7. **Transition Marketplace**: Share and sell custom transitions

## Implementation Timeline

- **Week 1**: Core infrastructure and basic transitions (fade, slide)
- **Week 2**: UI integration and timeline visualization
- **Week 3**: Advanced transitions and preview system
- **Week 4**: AI suggestions and performance optimization
- **Week 5**: Polish, testing, and edge cases

## Dependencies

- Timeline UI (must be implemented first)
- Video state management enhancement
- Remotion composition refactoring
- Preview system updates

## Risks and Mitigations

1. **Performance Impact**: Transitions might slow rendering
   - Mitigation: Optimize with React.memo, lazy loading
2. **Complexity**: Many edge cases with timing
   - Mitigation: Comprehensive testing, gradual rollout
3. **User Confusion**: Too many options
   - Mitigation: Smart defaults, progressive disclosure

## Related Features

- Timeline UI (displays transitions)
- AI Backend Improvements (powers suggestions)
- Audio Integration (coordinate with audio transitions)
- Export Options (ensure transitions render correctly)