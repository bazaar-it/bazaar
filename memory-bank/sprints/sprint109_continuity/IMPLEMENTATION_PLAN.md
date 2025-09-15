# Sprint 109: Implementation Plan - Continuous Video System

## Overview
Transform the scene-based architecture into a continuous video system while maintaining backward compatibility and user familiarity.

## Week 1: Foundation (Priority: CRITICAL)

### Day 1-2: Database Schema Updates

```sql
-- 1. Extend projects table for master video
ALTER TABLE "bazaar-vid_project" 
ADD COLUMN master_tsx_code TEXT,
ADD COLUMN master_js_code TEXT,
ADD COLUMN master_compiled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_duration INTEGER,
ADD COLUMN compilation_mode VARCHAR(20) DEFAULT 'scenes'; -- 'scenes' or 'continuous'

-- 2. Create sections table (replaces scenes conceptually)
CREATE TABLE "bazaar-vid_video_sections" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES "bazaar-vid_project"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_frame INTEGER NOT NULL,
  end_frame INTEGER NOT NULL,
  tsx_content TEXT NOT NULL,  -- Section-specific JSX
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_project_order UNIQUE(project_id, order_index),
  CONSTRAINT valid_frame_range CHECK(end_frame > start_frame)
);

-- 3. Create continuous elements tracking
CREATE TABLE "bazaar-vid_video_elements" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES "bazaar-vid_project"(id) ON DELETE CASCADE,
  element_id VARCHAR(255) NOT NULL,  -- 'heroButton', 'logo', etc
  element_type VARCHAR(50) NOT NULL,  -- 'button', 'text', 'image'
  timeline JSONB NOT NULL,  -- Complete interpolation data
  appears_in_sections TEXT[] DEFAULT '{}',
  first_frame INTEGER NOT NULL,
  last_frame INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_project_element UNIQUE(project_id, element_id)
);

-- 4. Create transition hints table
CREATE TABLE "bazaar-vid_transitions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES "bazaar-vid_project"(id) ON DELETE CASCADE,
  from_section UUID REFERENCES "bazaar-vid_video_sections"(id),
  to_section UUID REFERENCES "bazaar-vid_video_sections"(id),
  element_id VARCHAR(255),
  transition_type VARCHAR(50),  -- 'smooth', 'morph', 'fade'
  transition_data JSONB,  -- Specific transition parameters
  
  CONSTRAINT unique_transition UNIQUE(from_section, to_section, element_id)
);
```

### Day 3-4: Core Compilation Service

```typescript
// src/server/services/compilation/continuous-compiler.ts

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import type { Section, ElementTimeline, MasterVideo } from '~/lib/types/continuous-video';

export class ContinuousVideoCompiler {
  private projectId: string;
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  async compileFromScenes(scenes: Scene[]): Promise<MasterVideo> {
    // Convert scenes to sections
    const sections = this.scenesToSections(scenes);
    
    // Extract and track elements
    const elements = await this.extractContinuousElements(sections);
    
    // Build continuous timelines
    const timelines = this.buildContinuousTimelines(elements, sections);
    
    // Generate master component
    const masterComponent = this.generateMasterComponent(timelines, sections);
    
    // Compile to JS
    const jsCode = this.compileToJS(masterComponent);
    
    return {
      projectId: this.projectId,
      tsxCode: masterComponent,
      jsCode,
      totalDuration: this.calculateTotalDuration(sections),
      elements: timelines,
      sections
    };
  }
  
  private scenesToSections(scenes: Scene[]): Section[] {
    let currentFrame = 0;
    
    return scenes.map((scene, index) => {
      const section: Section = {
        id: scene.id,
        name: scene.name || `Section ${index + 1}`,
        startFrame: currentFrame,
        endFrame: currentFrame + (scene.duration || 150),
        content: scene.tsxCode,
        order: index
      };
      
      currentFrame = section.endFrame;
      return section;
    });
  }
  
  private async extractContinuousElements(
    sections: Section[]
  ): Promise<Map<string, ExtractedElement>> {
    const elements = new Map<string, ExtractedElement>();
    
    for (const section of sections) {
      const sectionElements = await this.extractElementsFromSection(section);
      
      sectionElements.forEach((element, id) => {
        if (elements.has(id)) {
          // Element appears in multiple sections - mark for continuity
          elements.get(id)!.appearInSections.push(section.id);
        } else {
          elements.set(id, {
            ...element,
            appearInSections: [section.id]
          });
        }
      });
    }
    
    return elements;
  }
  
  private buildContinuousTimelines(
    elements: Map<string, ExtractedElement>,
    sections: Section[]
  ): Map<string, ElementTimeline> {
    const timelines = new Map<string, ElementTimeline>();
    
    elements.forEach((element, id) => {
      const timeline = this.createElementTimeline(element, sections);
      
      // Ensure continuity between sections
      const continuousTimeline = this.ensureContinuity(timeline);
      
      timelines.set(id, continuousTimeline);
    });
    
    return timelines;
  }
  
  private ensureContinuity(timeline: ElementTimeline): ElementTimeline {
    const keyframes = [...timeline.keyframes];
    keyframes.sort((a, b) => a.frame - b.frame);
    
    const continuous: Keyframe[] = [];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      continuous.push(keyframes[i]);
      
      const current = keyframes[i];
      const next = keyframes[i + 1];
      const gap = next.frame - current.frame;
      
      // If there's a gap > 1 frame, add continuity keyframes
      if (gap > 1) {
        // Hold position at end of first section
        continuous.push({
          frame: current.frame + 1,
          properties: { ...current.properties }
        });
        
        // Start of transition
        if (gap > 2) {
          // Smooth transition over 6 frames if possible
          const transitionFrames = Math.min(6, gap - 2);
          for (let t = 1; t <= transitionFrames; t++) {
            const progress = t / transitionFrames;
            continuous.push({
              frame: next.frame - transitionFrames + t - 1,
              properties: this.interpolateProperties(
                current.properties,
                next.properties,
                this.easeInOut(progress)
              )
            });
          }
        }
      }
    }
    
    continuous.push(keyframes[keyframes.length - 1]);
    
    return {
      ...timeline,
      keyframes: continuous
    };
  }
  
  private generateMasterComponent(
    timelines: Map<string, ElementTimeline>,
    sections: Section[]
  ): string {
    // Generate interpolation declarations
    const interpolations = this.generateInterpolations(timelines);
    
    // Generate section renders
    const sectionRenders = this.generateSectionRenders(sections, timelines);
    
    return `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export default function MasterVideo() {
  const frame = useCurrentFrame();
  
  // Continuous element interpolations
  ${interpolations}
  
  // Render sections based on current frame
  return (
    <AbsoluteFill>
      ${sectionRenders}
    </AbsoluteFill>
  );
}`;
  }
  
  private generateInterpolations(
    timelines: Map<string, ElementTimeline>
  ): string {
    const interpolations: string[] = [];
    
    timelines.forEach((timeline, id) => {
      const frames = timeline.keyframes.map(k => k.frame);
      const xValues = timeline.keyframes.map(k => k.properties.x);
      const yValues = timeline.keyframes.map(k => k.properties.y);
      const scales = timeline.keyframes.map(k => k.properties.scale);
      const rotations = timeline.keyframes.map(k => k.properties.rotation);
      const opacities = timeline.keyframes.map(k => k.properties.opacity);
      
      interpolations.push(`
  // ${id} interpolations
  const ${id}X = interpolate(frame, [${frames.join(', ')}], [${xValues.join(', ')}]);
  const ${id}Y = interpolate(frame, [${frames.join(', ')}], [${yValues.join(', ')}]);
  const ${id}Scale = interpolate(frame, [${frames.join(', ')}], [${scales.join(', ')}]);
  const ${id}Rotation = interpolate(frame, [${frames.join(', ')}], [${rotations.join(', ')}]);
  const ${id}Opacity = interpolate(frame, [${frames.join(', ')}], [${opacities.join(', ')}]);`);
    });
    
    return interpolations.join('\n');
  }
  
  private easeInOut(t: number): number {
    return t < 0.5 
      ? 2 * t * t 
      : -1 + (4 - 2 * t) * t;
  }
}
```

### Day 5: Integration with Existing System

```typescript
// src/server/api/routers/generation.continuous.ts

export const continuousGenerationRouter = createTRPCRouter({
  compileToContinuous: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      mode: z.enum(['preview', 'export'])
    }))
    .mutation(async ({ input, ctx }) => {
      // Get all scenes
      const scenes = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
        orderBy: [asc(scenes.order)]
      });
      
      // Compile to continuous video
      const compiler = new ContinuousVideoCompiler(input.projectId);
      const masterVideo = await compiler.compileFromScenes(scenes);
      
      // Store master compilation
      await ctx.db.update(projects)
        .set({
          masterTsxCode: masterVideo.tsxCode,
          masterJsCode: masterVideo.jsCode,
          masterCompiledAt: new Date(),
          totalDuration: masterVideo.totalDuration,
          compilationMode: 'continuous'
        })
        .where(eq(projects.id, input.projectId));
      
      // Store element timelines
      for (const [elementId, timeline] of masterVideo.elements) {
        await ctx.db.insert(videoElements)
          .values({
            projectId: input.projectId,
            elementId,
            elementType: timeline.type,
            timeline: timeline.keyframes,
            appearsInSections: timeline.appearInSections,
            firstFrame: timeline.appearsAt,
            lastFrame: timeline.disappearsAt
          })
          .onConflictDoUpdate({
            target: [videoElements.projectId, videoElements.elementId],
            set: {
              timeline: timeline.keyframes,
              appearsInSections: timeline.appearInSections,
              firstFrame: timeline.appearsAt,
              lastFrame: timeline.disappearsAt,
              updatedAt: new Date()
            }
          });
      }
      
      return masterVideo;
    })
});
```

## Week 2: AI Integration & Testing

### Day 6-7: Update AI Context System

```typescript
// src/tools/edit/edit-with-continuity.ts

export async function editWithContinuity(
  prompt: string,
  targetSection: string,
  projectId: string
) {
  // Get full project context
  const elements = await getProjectElements(projectId);
  const sections = await getProjectSections(projectId);
  
  // Find elements that appear before and after target
  const continuousElements = findContinuousElements(
    elements,
    targetSection,
    sections
  );
  
  // Build enhanced prompt
  const enhancedPrompt = `
${prompt}

PROJECT CONTEXT:
Total Duration: ${calculateTotalDuration(sections)} frames

CONTINUOUS ELEMENTS (maintain continuity):
${continuousElements.map(el => `
- ${el.id}:
  Position at section start: x=${el.startX}, y=${el.startY}
  Position at section end: x=${el.endX}, y=${el.endY}
  Appears in: ${el.sections.join(', ')}
`).join('\n')}

IMPORTANT RULES:
1. If an element appears in the previous section, it should start where it ended
2. If an element continues to the next section, plan its end position accordingly
3. Use smooth interpolations for any position changes
4. Maintain consistent element IDs across sections

TARGET SECTION: ${targetSection}
`;
  
  return await generateWithAI(enhancedPrompt);
}
```

### Day 8-9: Preview System Updates

```typescript
// src/components/panels/PreviewPanelContinuous.tsx

export function PreviewPanelContinuous({ projectId }: Props) {
  const { data: masterVideo } = api.continuous.getMasterVideo.useQuery({ 
    projectId 
  });
  
  const { data: project } = api.projects.get.useQuery({ projectId });
  
  if (!masterVideo || !project) return <Loading />;
  
  // Use continuous compilation if available
  const videoComponent = useMemo(() => {
    if (project.compilationMode === 'continuous' && masterVideo.jsCode) {
      // Use pre-compiled continuous video
      return createComponentFromJS(masterVideo.jsCode);
    } else {
      // Fallback to scene-based rendering
      return createSceneBasedComponent(project.scenes);
    }
  }, [masterVideo, project]);
  
  return (
    <Player
      component={videoComponent}
      durationInFrames={masterVideo.totalDuration || 300}
      fps={30}
      compositionWidth={project.width || 1920}
      compositionHeight={project.height || 1080}
    />
  );
}
```

### Day 10: Testing & Validation

```typescript
// src/lib/tests/continuous-compilation.test.ts

describe('Continuous Video Compilation', () => {
  it('should maintain element position continuity', async () => {
    const scenes = [
      createScene('Scene1', 'button', { endX: 500 }),
      createScene('Scene2', 'button', { startX: 0 }) // Would jump
    ];
    
    const result = await compiler.compileFromScenes(scenes);
    const buttonTimeline = result.elements.get('button');
    
    // Check that position is continuous
    const frame75 = buttonTimeline.keyframes.find(k => k.frame === 75);
    const frame76 = buttonTimeline.keyframes.find(k => k.frame === 76);
    
    expect(frame76.properties.x).toBe(frame75.properties.x); // No jump!
  });
  
  it('should handle elements appearing in non-consecutive sections', async () => {
    // Button in section 1 and 3, but not 2
    const result = await compiler.compileFromScenes(scenesWithGaps);
    
    expect(result.elements.get('button')).toBeDefined();
    expect(result.jsCode).toContain('interpolate');
  });
});
```

## Week 3: Migration & Rollout

### Day 11-12: Migration Tools

```typescript
// scripts/migrate-to-continuous.ts

async function migrateProject(projectId: string) {
  console.log(`Migrating project ${projectId} to continuous system...`);
  
  // 1. Load existing scenes
  const scenes = await db.query.scenes.findMany({
    where: eq(scenes.projectId, projectId),
    orderBy: [asc(scenes.order)]
  });
  
  // 2. Compile to continuous
  const compiler = new ContinuousVideoCompiler(projectId);
  const masterVideo = await compiler.compileFromScenes(scenes);
  
  // 3. Validate compilation
  const isValid = await validateMasterVideo(masterVideo);
  if (!isValid) {
    console.error('Compilation failed validation');
    return false;
  }
  
  // 4. Store results
  await storeMasterVideo(masterVideo);
  
  // 5. Test preview
  const previewWorks = await testPreview(projectId);
  
  console.log(`Migration ${previewWorks ? 'successful' : 'failed'}`);
  return previewWorks;
}
```

### Day 13-14: Feature Flags & Gradual Rollout

```typescript
// src/lib/features.ts

export const FEATURE_FLAGS = {
  CONTINUOUS_VIDEO: {
    enabled: process.env.ENABLE_CONTINUOUS_VIDEO === 'true',
    rolloutPercentage: parseInt(process.env.CONTINUOUS_ROLLOUT || '0'),
    
    isEnabledForProject(projectId: string): boolean {
      if (!this.enabled) return false;
      
      // Check if project is in rollout
      const hash = hashProjectId(projectId);
      return hash % 100 < this.rolloutPercentage;
    }
  }
};
```

### Day 15: Documentation & Training

Create comprehensive documentation:
- User guide for smooth transitions
- Developer guide for continuous system
- Migration guide for existing projects
- Troubleshooting common issues

## Success Metrics to Track

1. **Transition Quality**
   - Measure position jumps between sections
   - Track user reports of jarring transitions

2. **Compilation Success**
   - Success rate of continuous compilation
   - Performance vs scene-based compilation

3. **AI Generation Quality**
   - Reduced retry rate for AI generations
   - Better continuity in AI-generated content

4. **User Satisfaction**
   - Feedback on video smoothness
   - Export success rate

## Rollback Plan

If issues arise:
1. Disable feature flag immediately
2. Projects revert to scene-based compilation
3. Preserve continuous compilation data for debugging
4. Fix issues and re-attempt rollout

## Next Steps

After successful implementation:
1. Remove scene-based compilation code
2. Optimize continuous compilation performance
3. Add advanced transition effects
4. Implement element morphing between sections