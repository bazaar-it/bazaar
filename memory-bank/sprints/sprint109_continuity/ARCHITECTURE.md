# Sprint 109: Continuous Video Architecture - Technical Design

## Core Concept: One Video, Many Sections

### The Paradigm Shift

```typescript
// OLD: Multiple isolated scenes
Project = Scene1 + Scene2 + Scene3  // Disconnected parts

// NEW: One continuous video with sections
Project = MasterVideo {
  sections: [intro, features, outro]  // Logical divisions
  elements: continuous across entire timeline
}
```

## Technical Architecture

### 1. Master Component Structure

```typescript
interface MasterVideo {
  id: string;
  projectId: string;
  
  // The compiled master component
  jsCode: string;
  tsxCode: string;
  
  // Total video duration
  totalDuration: number;
  
  // Logical sections (for editing)
  sections: Section[];
  
  // Continuous elements
  elements: Map<string, ElementTimeline>;
}

interface Section {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  content: string;  // JSX content for this section
  order: number;
}

interface ElementTimeline {
  elementId: string;
  type: 'button' | 'text' | 'image' | 'shape';
  
  // Full lifecycle
  appearsAt: number;
  disappearsAt: number;
  
  // Continuous interpolation points
  keyframes: Keyframe[];
  
  // Which sections use this element
  appearInSections: string[];
}

interface Keyframe {
  frame: number;
  properties: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    // Any other animatable properties
  };
}
```

### 2. Compilation Pipeline

```typescript
class ContinuousVideoCompiler {
  compile(sections: Section[]): MasterVideo {
    // Step 1: Extract all unique elements
    const elements = this.extractElements(sections);
    
    // Step 2: Build continuous timelines
    const timelines = this.buildTimelines(elements, sections);
    
    // Step 3: Generate interpolations
    const interpolations = this.generateInterpolations(timelines);
    
    // Step 4: Create master component
    const masterComponent = this.generateMasterComponent(
      interpolations,
      sections
    );
    
    return {
      jsCode: masterComponent,
      totalDuration: this.calculateDuration(sections),
      elements: timelines
    };
  }
  
  private extractElements(sections: Section[]): Map<string, Element> {
    const elements = new Map();
    
    sections.forEach(section => {
      const ast = parse(section.content);
      
      // Find all JSX elements
      traverse(ast, {
        JSXElement(path) {
          const element = {
            id: this.getElementId(path),
            type: this.getElementType(path),
            properties: this.extractProperties(path)
          };
          
          if (!elements.has(element.id)) {
            elements.set(element.id, element);
          }
        }
      });
    });
    
    return elements;
  }
  
  private buildTimelines(
    elements: Map<string, Element>,
    sections: Section[]
  ): Map<string, ElementTimeline> {
    const timelines = new Map();
    
    elements.forEach((element, id) => {
      const timeline: ElementTimeline = {
        elementId: id,
        type: element.type,
        appearsAt: Infinity,
        disappearsAt: -Infinity,
        keyframes: [],
        appearInSections: []
      };
      
      // Build keyframes across all sections
      sections.forEach(section => {
        if (this.sectionContainsElement(section, id)) {
          timeline.appearInSections.push(section.id);
          
          // Update appear/disappear frames
          timeline.appearsAt = Math.min(timeline.appearsAt, section.startFrame);
          timeline.disappearsAt = Math.max(timeline.disappearsAt, section.endFrame);
          
          // Add keyframes for this section
          const sectionKeyframes = this.extractKeyframes(section, element);
          timeline.keyframes.push(...sectionKeyframes);
        }
      });
      
      // Ensure continuity between sections
      timeline.keyframes = this.ensureContinuity(timeline.keyframes);
      
      timelines.set(id, timeline);
    });
    
    return timelines;
  }
  
  private ensureContinuity(keyframes: Keyframe[]): Keyframe[] {
    // Sort by frame
    keyframes.sort((a, b) => a.frame - b.frame);
    
    // Fill gaps to ensure smooth transitions
    const continuous: Keyframe[] = [];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      continuous.push(keyframes[i]);
      
      const current = keyframes[i];
      const next = keyframes[i + 1];
      
      // If there's a gap between sections
      if (next.frame - current.frame > 1) {
        // Add continuity keyframe
        continuous.push({
          frame: current.frame + 1,
          properties: current.properties  // Hold position
        });
        continuous.push({
          frame: next.frame - 1,
          properties: current.properties  // Hold until next
        });
      }
    }
    
    continuous.push(keyframes[keyframes.length - 1]);
    return continuous;
  }
  
  private generateMasterComponent(
    interpolations: Map<string, string>,
    sections: Section[]
  ): string {
    return `
      export default function MasterVideo() {
        const frame = useCurrentFrame();
        
        // Continuous element interpolations
        ${Array.from(interpolations.entries()).map(([id, interp]) => 
          interp
        ).join('\n')}
        
        // Render sections based on current frame
        return (
          <AbsoluteFill>
            ${sections.map(section => `
              {/* Section: ${section.name} (${section.startFrame}-${section.endFrame}) */}
              {frame >= ${section.startFrame} && frame < ${section.endFrame} && (
                <React.Fragment>
                  ${this.injectInterpolations(section.content)}
                </React.Fragment>
              )}
            `).join('\n')}
          </AbsoluteFill>
        );
      }
    `;
  }
}
```

### 3. Smart Transition System

```typescript
class TransitionGenerator {
  generateTransition(
    element: ElementTimeline,
    fromSection: Section,
    toSection: Section
  ): Keyframe[] {
    // Get element state at end of first section
    const endState = this.getElementState(element, fromSection.endFrame);
    
    // Get desired state at start of next section
    const startState = this.getElementState(element, toSection.startFrame);
    
    // Generate smooth transition
    const transitionFrames = [];
    const transitionDuration = 6; // 0.2 seconds at 30fps
    
    for (let i = 0; i <= transitionDuration; i++) {
      const progress = i / transitionDuration;
      transitionFrames.push({
        frame: fromSection.endFrame + i,
        properties: this.interpolateProperties(endState, startState, progress)
      });
    }
    
    return transitionFrames;
  }
  
  private interpolateProperties(
    from: Properties,
    to: Properties,
    progress: number
  ): Properties {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      scale: from.scale + (to.scale - from.scale) * progress,
      rotation: from.rotation + (to.rotation - from.rotation) * progress,
      opacity: from.opacity + (to.opacity - from.opacity) * progress
    };
  }
}
```

### 4. Runtime Execution

```typescript
// In PreviewPanelG
function PreviewPanelG({ projectId }) {
  const { data: masterVideo } = api.video.getMasterVideo.useQuery({ projectId });
  
  if (!masterVideo) return <Loading />;
  
  // Render the single master component
  return (
    <Player
      component={createComponentFromCode(masterVideo.jsCode)}
      durationInFrames={masterVideo.totalDuration}
      fps={30}
      compositionWidth={1920}
      compositionHeight={1080}
    />
  );
}

// No more scene-by-scene compilation!
function createComponentFromCode(jsCode: string): React.FC {
  const func = new Function('React', 'useCurrentFrame', 'interpolate', jsCode);
  return func(React, useCurrentFrame, interpolate);
}
```

## Key Advantages

### 1. No Duplicate Identifiers
Each element is defined once and referenced by ID across the entire video.

### 2. Automatic Continuity
Elements naturally continue their motion across section boundaries.

### 3. Simplified Compilation
One compilation step instead of N scene compilations.

### 4. Better Performance
Single component renders more efficiently than multiple scenes.

### 5. AI Context Awareness
AI sees the entire video structure and can plan accordingly.

## Migration Strategy

### Step 1: Dual Mode
- Keep scene-based system running
- Add continuous compilation in parallel
- Compare outputs

### Step 2: Gradual Migration
- New projects use continuous system
- Migrate simple projects first
- Learn and refine

### Step 3: Full Transition
- Convert all projects
- Remove scene-based code
- Optimize performance

## Example: Button Across Sections

```typescript
// The button appears in intro and features sections
const buttonTimeline: ElementTimeline = {
  elementId: 'heroButton',
  type: 'button',
  appearsAt: 0,
  disappearsAt: 150,
  keyframes: [
    // Intro section (0-75)
    { frame: 0, properties: { x: 100, y: 100, scale: 0 } },
    { frame: 15, properties: { x: 100, y: 100, scale: 1 } },
    { frame: 75, properties: { x: 500, y: 300, scale: 1 } },
    
    // Automatic continuity
    { frame: 76, properties: { x: 500, y: 300, scale: 1 } },
    
    // Features section (76-150)
    { frame: 90, properties: { x: 600, y: 200, scale: 1.2 } },
    { frame: 150, properties: { x: 900, y: 400, scale: 0 } }
  ],
  appearInSections: ['intro', 'features']
};

// Generated interpolation
const heroButtonX = interpolate(
  frame,
  [0, 15, 75, 76, 90, 150],
  [100, 100, 500, 500, 600, 900]
);
```

This creates a smooth, continuous motion for the button across the entire video!