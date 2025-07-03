# Feature 005: Vertical Video Format

**Feature ID**: 005  
**Priority**: HIGH  
**Complexity**: LOW  
**Created**: January 2, 2025  

## Overview

Add support for vertical video format (9:16 aspect ratio) to enable content creation for TikTok, Instagram Reels, YouTube Shorts, and other mobile-first platforms. This feature provides the highest impact-to-effort ratio, immediately expanding our addressable market to mobile-first content creators.

## Current State

- Only supports 16:9 landscape format (1920x1080)
- All AI generation optimized for horizontal layouts
- Preview panel fixed to landscape dimensions
- Export only available in landscape format
- No format selection during project creation

## Problem Statement / User Need

The majority of social media video consumption happens on mobile devices in portrait orientation:
- TikTok has 1+ billion users consuming vertical content
- Instagram Reels and YouTube Shorts dominate engagement
- Users manually crop/reformat videos losing quality and composition
- Competitors like Canva offer multiple format options

User feedback:
- "Can I make TikTok videos with this?"
- "I need vertical format for my Instagram"
- "Everything I make needs cropping for mobile"

Market opportunity:
- 78% of video consumption is on mobile devices
- Vertical video has 90% completion rates vs 60% for horizontal
- Can charge premium tier for multi-format support

## Proposed Solution

Implement a simple yet comprehensive format selection system:

1. **Format Selector**: Add format choice during project creation
2. **Dynamic Dimensions**: Update composition to match selected format
3. **AI Optimization**: Enhance prompts for format-aware generation
4. **Preview Adaptation**: Resize preview panel based on format
5. **Export Support**: Ensure all formats export correctly

Supported formats:
- **Landscape (16:9)**: 1920×1080 - YouTube, desktop
- **Portrait (9:16)**: 1080×1920 - TikTok, Reels, Shorts
- **Square (1:1)**: 1080×1080 - Instagram posts

## Technical Implementation

### Phase 1: Database Schema Update
```typescript
// src/server/db/schema.ts
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  
  // New format fields
  format: varchar("format", { length: 50 }).default("landscape"), 
  width: integer("width").default(1920),
  height: integer("height").default(1080),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Migration to add format support to existing projects
ALTER TABLE projects 
ADD COLUMN format VARCHAR(50) DEFAULT 'landscape',
ADD COLUMN width INTEGER DEFAULT 1920,
ADD COLUMN height INTEGER DEFAULT 1080;
```

### Phase 2: Format Selection UI
```typescript
// src/app/projects/new/page.tsx
const VIDEO_FORMATS = [
  { 
    id: 'landscape',
    label: 'YouTube / Desktop',
    subtitle: '16:9 Landscape',
    width: 1920,
    height: 1080,
    icon: '🖥️'
  },
  { 
    id: 'portrait',
    label: 'TikTok / Reels',
    subtitle: '9:16 Portrait', 
    width: 1080,
    height: 1920,
    icon: '📱'
  },
  { 
    id: 'square',
    label: 'Instagram Post',
    subtitle: '1:1 Square',
    width: 1080,
    height: 1080,
    icon: '□'
  }
];

export function FormatSelector({ onSelect }: { onSelect: (format: Format) => void }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {VIDEO_FORMATS.map(format => (
        <button
          key={format.id}
          onClick={() => onSelect(format)}
          className="p-6 border rounded-lg hover:border-blue-500 transition"
        >
          <div className="text-4xl mb-2">{format.icon}</div>
          <div className="font-semibold">{format.label}</div>
          <div className="text-sm text-gray-500">{format.subtitle}</div>
          <div className="mt-2">
            <div 
              className="border-2 border-gray-300 mx-auto"
              style={{
                width: format.width / 20,
                height: format.height / 20
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
```

### Phase 3: Preview Panel Adaptation
```typescript
// src/components/preview/PreviewPanelG.tsx
export function PreviewPanelG({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { format, width, height } = project;

  // Calculate preview dimensions maintaining aspect ratio
  const previewDimensions = useMemo(() => {
    const containerWidth = 800; // Max width
    const containerHeight = 600; // Max height
    
    const aspectRatio = width / height;
    
    let previewWidth = containerWidth;
    let previewHeight = containerWidth / aspectRatio;
    
    if (previewHeight > containerHeight) {
      previewHeight = containerHeight;
      previewWidth = containerHeight * aspectRatio;
    }
    
    return { width: previewWidth, height: previewHeight };
  }, [width, height]);

  const composition = {
    id: "main",
    component: VideoComposition,
    width: width || 1920,
    height: height || 1080,
    fps: 30,
    durationInFrames: totalDuration,
    defaultProps: { scenes }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div 
          className="bg-black shadow-lg"
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height
          }}
        >
          <Player
            component={VideoComposition}
            inputProps={{ scenes }}
            durationInFrames={totalDuration}
            fps={30}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      <div className="p-2 bg-gray-50 text-center text-sm text-gray-600">
        {format === 'portrait' ? '📱' : format === 'square' ? '□' : '🖥️'} 
        {' '}{width}×{height} • {format}
      </div>
    </div>
  );
}
```

### Phase 4: AI Prompt Enhancement
```typescript
// src/config/prompts/active/code-generator.ts
export const CODE_GENERATOR_PROMPT = `
You are generating a video scene with these specifications:

FORMAT: {format}
DIMENSIONS: {width}x{height}
ASPECT RATIO: {aspectRatio}

{formatGuidelines}

LAYOUT GUIDELINES:
{layoutGuidelines}

Generate Remotion React code that respects these dimensions and optimizes for the target format.
`;

// src/server/services/ai/formatGuidelines.ts
export function getFormatGuidelines(format: string) {
  switch (format) {
    case 'portrait':
      return `
PORTRAIT FORMAT (9:16) - Mobile First:
- Stack elements vertically
- Use larger text (min 24px) for mobile readability  
- Center important content in safe zone (middle 80%)
- Avoid wide horizontal layouts
- Use full height for dramatic effect
- Optimize for one-handed viewing
- Consider thumb-friendly interaction zones
`;

    case 'square':
      return `
SQUARE FORMAT (1:1) - Balanced Composition:
- Center focal points
- Use radial or symmetric layouts
- Ensure content works when cropped to 4:5 or 9:16
- Balance all four quadrants
- Avoid content at extreme edges
- Perfect for grids and centered designs
`;

    case 'landscape':
    default:
      return `
LANDSCAPE FORMAT (16:9) - Traditional Wide:
- Use horizontal space effectively
- Side-by-side layouts work well
- Standard text sizes (16-60px)
- Cinematic compositions
- Multi-column layouts possible
- Desktop viewing optimized
`;
  }
}

// Update Brain Orchestrator context
const formatContext = {
  format: project.format,
  width: project.width,
  height: project.height,
  aspectRatio: project.width / project.height,
  guidelines: getFormatGuidelines(project.format),
  isMobile: project.format === 'portrait',
  safeZone: calculateSafeZone(project.format)
};
```

### Phase 5: Export Configuration
```typescript
// src/server/services/render/renderService.ts
export async function configureRenderSettings(project: Project) {
  const { format, width, height } = project;
  
  return {
    composition: "main",
    codec: "h264",
    width,
    height,
    fps: 30,
    
    // Format-specific optimizations
    ...(format === 'portrait' && {
      // Mobile-optimized encoding
      videoBitrate: "4M",
      audioBitrate: "128k",
      preset: "fast"
    }),
    
    ...(format === 'square' && {
      // Instagram-optimized
      videoBitrate: "5M", 
      pixelFormat: "yuv420p"
    }),
    
    // Metadata for social platforms
    metadata: {
      title: project.title,
      format: format,
      platform: getPlatformFromFormat(format)
    }
  };
}
```

## Success Metrics

1. **Adoption**: 30% of new projects use portrait format within first month
2. **User Growth**: 20% increase in mobile-first content creators
3. **Engagement**: 15% increase in exports (users creating more content)
4. **Revenue**: Premium tier adoption for multi-format access
5. **Market Reach**: Enter TikTok/Reels creator market segment

## Future Enhancements

1. **Custom Dimensions**: Allow any width/height combination
2. **Multi-Format Export**: Export same project in multiple formats
3. **Format Switching**: Change format after project creation
4. **Platform Presets**: TikTok with safe zones, Instagram with specific requirements
5. **Responsive Scenes**: Single scene adapts to multiple formats
6. **Format Templates**: Pre-built templates optimized per format
7. **Batch Processing**: Generate all formats from one prompt

## Implementation Timeline

- **Day 1 Morning**: Database schema and migration
- **Day 1 Afternoon**: Format selector UI and project creation flow
- **Day 2 Morning**: Preview panel dynamic sizing
- **Day 2 Afternoon**: AI prompt enhancements and testing
- **Polish**: Export testing, UI refinements

## Dependencies

- Database migration capability
- Remotion support for custom dimensions (already available)
- Preview panel refactoring (minimal)
- AI prompt system access

## Risks and Mitigations

1. **Existing Projects**: All current projects are landscape
   - Mitigation: Safe default, migration adds format field
2. **AI Quality**: Vertical layouts might be suboptimal initially
   - Mitigation: Enhanced prompts, collect feedback for improvement
3. **Preview Performance**: Different dimensions might affect rendering
   - Mitigation: Test thoroughly, optimize preview scaling

## Related Features

- Scene Transitions (must work in all formats)
- Timeline UI (should adapt to format)
- Image in Video (positioning varies by format)
- Export Options (format affects codec choices)