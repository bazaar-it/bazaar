# Sprint 48: Mobile Format Support Implementation Plan

## Overview
Enable Bazaar-Vid to support multiple video formats including mobile (portrait), square, and custom dimensions.

## Current State Analysis

### Hardcoded Dimensions (1280x720)
- `PreviewPanelG.tsx:634-635` - Player component props
- `remotion-constants.ts:650-651` - VIDEO_WIDTH/HEIGHT constants
- AI prompts reference fixed dimensions

### Architecture Readiness
- Templates already use `useVideoConfig()` for responsive sizing
- Remotion Player supports any `compositionWidth/Height`
- No dimension storage in database schema currently

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Add Format Selection to Project Creation**
   - Update project schema to include format/dimensions
   - Add format selector UI in project creation flow
   - Common formats:
     - Desktop (1280x720) - 16:9
     - Mobile Portrait (1080x1920) - 9:16
     - Square (1080x1080) - 1:1
     - Custom (user defined)

2. **Database Schema Updates**
   ```sql
   ALTER TABLE projects ADD COLUMN video_width INTEGER DEFAULT 1280;
   ALTER TABLE projects ADD COLUMN video_height INTEGER DEFAULT 720;
   ALTER TABLE projects ADD COLUMN video_format VARCHAR(50) DEFAULT 'desktop';
   ```

3. **Update InputProps Schema**
   ```typescript
   meta: {
     durationInFrames: number;
     fps: number;
     width: number;  // NEW
     height: number; // NEW
   }
   ```

### Phase 2: Player & Preview Updates
1. **Dynamic Player Configuration**
   - Pass project dimensions to PreviewPanelG
   - Update Player props to use dynamic values
   - Ensure preview scales correctly in UI

2. **Responsive Preview Container**
   - Calculate appropriate preview size based on format
   - Maintain aspect ratio in workspace
   - Handle different orientations gracefully

### Phase 3: AI Generation Updates
1. **Context-Aware Generation**
   - Pass canvas dimensions to AI prompts
   - Update system prompts to mention actual dimensions
   - Teach AI about mobile vs desktop layouts

2. **Format-Specific Templates**
   - Create mobile-optimized templates
   - Adjust font sizes and spacing for format
   - Consider safe zones for different platforms

### Phase 4: Export & Rendering
1. **Remotion Config Updates**
   - Pass dimensions to render pipeline
   - Ensure exports match selected format
   - Update render settings accordingly

2. **Format Presets**
   - TikTok/Reels: 1080x1920
   - YouTube Shorts: 1080x1920
   - Instagram Square: 1080x1080
   - Twitter: 1280x720

## Technical Implementation Details

### 1. Project Creation Flow
```typescript
// New project creation with format
interface ProjectFormat {
  name: string;
  width: number;
  height: number;
  label: string;
}

const VIDEO_FORMATS: ProjectFormat[] = [
  { name: 'desktop', width: 1280, height: 720, label: 'Desktop (16:9)' },
  { name: 'mobile', width: 1080, height: 1920, label: 'Mobile (9:16)' },
  { name: 'square', width: 1080, height: 1080, label: 'Square (1:1)' },
  { name: 'custom', width: 0, height: 0, label: 'Custom' }
];
```

### 2. Update Constants
```typescript
// remotion-constants.ts
export const getVideoConfig = (project: Project) => ({
  width: project.video_width || VIDEO_WIDTH,
  height: project.video_height || VIDEO_HEIGHT,
  fps: project.fps || FPS,
  durationInFrames: project.duration || DURATION_IN_FRAMES
});
```

### 3. AI Prompt Enhancement
```typescript
// Add to prompt context
const formatContext = `
Canvas dimensions: ${width}x${height}
Format: ${format} (${width > height ? 'landscape' : width < height ? 'portrait' : 'square'})
Design appropriately for this format.
`;
```

### 4. Preview Scaling
```typescript
// Calculate preview dimensions maintaining aspect ratio
const calculatePreviewSize = (width: number, height: number, maxWidth: number, maxHeight: number) => {
  const aspectRatio = width / height;
  let previewWidth = maxWidth;
  let previewHeight = maxWidth / aspectRatio;
  
  if (previewHeight > maxHeight) {
    previewHeight = maxHeight;
    previewWidth = maxHeight * aspectRatio;
  }
  
  return { width: previewWidth, height: previewHeight };
};
```

## Migration Strategy
1. Default existing projects to 1280x720
2. New projects get format selector
3. Gradual rollout with feature flag
4. Update templates to be format-aware

## Testing Plan
1. Test each format in preview
2. Verify AI generates appropriate content
3. Check export quality for each format
4. Mobile device preview testing

## Success Criteria
- [ ] Users can select video format on project creation
- [ ] Preview correctly displays selected format
- [ ] AI generates format-appropriate content
- [ ] Exports match selected dimensions
- [ ] Existing projects continue working

## Timeline
- Week 1: Database schema and project creation UI
- Week 2: Preview and player updates
- Week 3: AI prompt updates and testing
- Week 4: Export pipeline and final testing