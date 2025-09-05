# Sprint 109: Technical Design - Continuous Video Architecture

## The Paradigm Shift

### Current Architecture (Isolated Scenes)
```
Scene1.tsx → Compile → JS → Execute(0-75) → END
Scene2.tsx → Compile → JS → Execute(76-150) → END  
Scene3.tsx → Compile → JS → Execute(151-225) → END
```

### New Architecture (Continuous Timeline)
```
Scene1.tsx ↘
Scene2.tsx → Build Timeline → Master Component → Execute(0-225)
Scene3.tsx ↗
```

## Core Components

### 1. Element Timeline Builder

```typescript
class ElementTimelineBuilder {
  private timelines = new Map<string, ElementTimeline>();
  
  async buildFromScenes(scenes: Scene[]): Promise<Map<string, ElementTimeline>> {
    let globalFrame = 0;
    
    for (const scene of scenes) {
      const elements = await this.extractElements(scene);
      
      for (const element of elements) {
        const timeline = this.getOrCreateTimeline(element.id);
        
        // Add keyframes with global frame offset
        element.localKeyframes.forEach(kf => {
          timeline.keyframes.push({
            ...kf,
            frame: globalFrame + kf.frame
          });
        });
        
        // Track lifecycle
        if (!timeline.firstAppearance) {
          timeline.firstAppearance = globalFrame;
        }
        timeline.lastAppearance = globalFrame + scene.duration;
      }
      
      globalFrame += scene.duration;
    }
    
    // Smooth transitions between scenes
    this.interpolateGaps();
    
    return this.timelines;
  }
  
  private interpolateGaps() {
    // Fill gaps where element exists in scene N and N+2 but not N+1
    for (const [id, timeline] of this.timelines) {
      const gaps = this.findGaps(timeline.keyframes);
      
      for (const gap of gaps) {
        // Create smooth interpolation through the gap
        const beforeKf = timeline.keyframes[gap.beforeIndex];
        const afterKf = timeline.keyframes[gap.afterIndex];
        
        // Add interpolated keyframes
        for (let frame = beforeKf.frame + 1; frame < afterKf.frame; frame++) {
          timeline.keyframes.push(
            this.interpolateKeyframe(beforeKf, afterKf, frame)
          );
        }
      }
    }
  }
}
```

### 2. Master Component Generator

```typescript
class MasterComponentGenerator {
  generate(timelines: Map<string, ElementTimeline>, totalDuration: number): string {
    const imports = this.generateImports();
    const interpolations = this.generateInterpolations(timelines);
    const renders = this.generateRenders(timelines);
    
    return `
      ${imports}
      
      export default function MasterVideo() {
        const frame = useCurrentFrame();
        const { width, height, fps } = useVideoConfig();
        
        // Global interpolations for all elements
        ${interpolations}
        
        return (
          <AbsoluteFill style={{ backgroundColor: '#000' }}>
            ${renders}
          </AbsoluteFill>
        );
      }
    `;
  }
  
  private generateInterpolations(timelines: Map<string, ElementTimeline>): string {
    const interpolations: string[] = [];
    
    for (const [id, timeline] of timelines) {
      const xFrames = timeline.keyframes.map(kf => kf.frame);
      const xValues = timeline.keyframes.map(kf => kf.x);
      
      interpolations.push(`
        const ${id}_x = interpolate(
          frame,
          [${xFrames.join(', ')}],
          [${xValues.join(', ')}],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
      `);
      
      // Repeat for y, scale, rotation, opacity
    }
    
    return interpolations.join('\n');
  }
  
  private generateRenders(timelines: Map<string, ElementTimeline>): string {
    const renders: string[] = [];
    
    for (const [id, timeline] of timelines) {
      renders.push(`
        {frame >= ${timeline.firstAppearance} && 
         frame <= ${timeline.lastAppearance} && (
          <${timeline.componentType}
            style={{
              position: 'absolute',
              transform: \`
                translate(\${${id}_x}px, \${${id}_y}px)
                scale(\${${id}_scale})
                rotate(\${${id}_rotation}deg)
              \`,
              opacity: ${id}_opacity
            }}
            {...${id}_props}
          />
        )}
      `);
    }
    
    return renders.join('\n');
  }
}
```

### 3. State Continuity System

```typescript
interface SceneStateCapture {
  sceneId: string;
  endFrame: number;
  elements: Map<string, ElementEndState>;
}

class StateContinuityManager {
  async captureSceneEndState(
    scene: CompiledScene, 
    endFrame: number
  ): Promise<SceneStateCapture> {
    const capture: SceneStateCapture = {
      sceneId: scene.id,
      endFrame,
      elements: new Map()
    };
    
    // Execute scene at its final frame to get positions
    const finalState = await this.executeAtFrame(scene, endFrame);
    
    for (const element of finalState.elements) {
      capture.elements.set(element.id, {
        x: element.computedStyle.x,
        y: element.computedStyle.y,
        scale: element.computedStyle.scale,
        rotation: element.computedStyle.rotation,
        opacity: element.computedStyle.opacity
      });
    }
    
    return capture;
  }
  
  enhanceSceneWithContinuity(
    scene: Scene,
    previousCapture?: SceneStateCapture
  ): Scene {
    if (!previousCapture) return scene;
    
    // Inject starting positions from previous scene
    const enhanced = { ...scene };
    
    enhanced.initialStates = {};
    for (const [elementId, endState] of previousCapture.elements) {
      enhanced.initialStates[elementId] = endState;
    }
    
    // Modify scene code to use initial states
    enhanced.code = this.injectInitialStates(scene.code, enhanced.initialStates);
    
    return enhanced;
  }
}
```

### 4. AI Continuity Context

```typescript
class ContinuityAwareAI {
  async generateSceneWithContinuity(
    prompt: string,
    sceneIndex: number,
    context: {
      previousSceneEndState?: SceneStateCapture;
      nextSceneStartState?: SceneStateCapture;
      globalTimelines?: Map<string, ElementTimeline>;
    }
  ): Promise<Scene> {
    
    const enhancedPrompt = this.buildContinuityPrompt(prompt, context);
    
    // Example enhanced prompt:
    /*
    Create scene 2 based on: "${prompt}"
    
    CONTINUITY REQUIREMENTS:
    - Button must start at x=500, y=300 (from scene 1's end)
    - Logo should be at x=50, y=50, scale=0.5 (from scene 1's end)
    - Smoothly animate these elements to new positions
    
    AVAILABLE ELEMENTS (from previous scenes):
    - Button: A blue CTA button with hover effect
    - Logo: Company logo that's been scaling down
    
    Generate React component that respects these positions.
    */
    
    const generatedCode = await this.ai.generate(enhancedPrompt);
    
    // Validate continuity is maintained
    const validated = this.validateContinuity(generatedCode, context);
    
    return validated;
  }
}
```

## Implementation Strategy

### Phase 1: Parallel Tracks (Week 1)

**Track A: State Capture (Backend)**
```typescript
// 1. Modify scene compilation to capture end states
// 2. Store state captures in database
// 3. Pass captures to next scene generation
```

**Track B: Element Extraction (Analysis)**
```typescript
// 1. Build AST parser for element detection
// 2. Extract element IDs and properties
// 3. Match elements across scenes
```

### Phase 2: Timeline Building (Week 2)

```typescript
// 1. Implement ElementTimelineBuilder
// 2. Create gap interpolation logic
// 3. Build timeline visualization (for debugging)
```

### Phase 3: Master Compilation (Week 3)

```typescript
// 1. Implement MasterComponentGenerator
// 2. Integrate with PreviewPanelG
// 3. Maintain backward compatibility
```

### Phase 4: AI Integration (Week 4)

```typescript
// 1. Update prompts with continuity context
// 2. Validate generated code maintains continuity
// 3. Test with real user scenarios
```

## Migration Path

### Step 1: Invisible Backend Change
- Compile to master component internally
- Keep scene UI unchanged
- Users see no difference, but get smoother videos

### Step 2: Opt-in Continuity
- Add "Enable smooth transitions" toggle
- Show timeline view for power users
- Collect feedback

### Step 3: Default Behavior
- Make continuity default for new projects
- Migrate existing projects on demand
- Phase out isolated scene compilation

## Performance Considerations

### Memory Management
```typescript
// Instead of loading all scenes in memory
// Stream compilation with chunking

class ChunkedCompiler {
  async *compileInChunks(scenes: Scene[]): AsyncGenerator<string> {
    const chunkSize = 5; // Process 5 scenes at a time
    
    for (let i = 0; i < scenes.length; i += chunkSize) {
      const chunk = scenes.slice(i, i + chunkSize);
      const compiled = await this.compileChunk(chunk);
      yield compiled;
    }
  }
}
```

### Caching Strategy
```typescript
// Cache element timelines for faster recompilation
interface TimelineCache {
  projectId: string;
  version: number;
  timelines: Map<string, ElementTimeline>;
  compiledMaster?: string;
}
```

## Backward Compatibility

```typescript
// Detect if project uses new continuity system
function shouldUseContinuity(project: Project): boolean {
  return (
    project.version >= 2 ||
    project.settings?.enableContinuity ||
    project.scenes.some(s => s.continuityMetadata)
  );
}

// Compile appropriately
async function compileProject(project: Project) {
  if (shouldUseContinuity(project)) {
    return compileToContinuousMaster(project);
  } else {
    return compileScenesIndividually(project);
  }
}
```

## This Changes Everything

Instead of fixing symptoms (duplicate declarations, jarring cuts), we're fixing the ROOT CAUSE: scenes shouldn't be isolated. The video is ONE experience, and our architecture should reflect that.