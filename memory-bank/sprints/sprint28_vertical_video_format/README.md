# Sprint 28: Vertical Video Format Support

**Sprint Goal**: Enable multi-format video creation (landscape, portrait, square) with format selection at project creation time.

**Duration**: January 3-4, 2025  
**Status**: In Progress  
**Priority**: HIGH  
**Complexity**: LOW (1-2 days)

## Overview

Add support for multiple video formats to enable content creation for TikTok, Instagram Reels, YouTube Shorts, and other platforms. Users select the format when creating a project, and all scenes within that project use the selected format.

## User Stories

1. **As a content creator**, I want to choose my video format when creating a project so that I can create content optimized for my target platform.

2. **As a TikTok creator**, I want to create vertical videos (9:16) so that my content looks native on mobile platforms.

3. **As an Instagram user**, I want to create square videos (1:1) for posts and vertical videos for Reels.

4. **As a developer**, I want the AI to generate layout-appropriate code based on the selected format.

## Technical Approach

### 1. Format Storage Strategy
- Store format information in project's InputProps meta object
- No database schema changes needed
- All format data travels with the project props

### 2. Supported Formats
```typescript
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
```

### 3. Implementation Plan

#### Phase 1: Update Types & Models
- [x] Update InputProps type to include format metadata
- [ ] Update createDefaultProjectProps to accept format parameter

#### Phase 2: Project Creation UI
- [ ] Create format selection component
- [ ] Update project creation flow to include format step
- [ ] Pass selected format to project creation

#### Phase 3: Preview Panel Adaptation
- [ ] Read format from project props
- [ ] Use dynamic width/height instead of hardcoded 1920x1080
- [ ] Maintain aspect ratio in preview container

#### Phase 4: AI Prompt Enhancement
- [ ] Pass format context to Brain Orchestrator
- [ ] Update CODE_GENERATOR prompt with format guidelines
- [ ] Add format-specific layout rules

#### Phase 5: Export Updates
- [ ] Ensure Lambda render uses correct dimensions
- [ ] Update export filename to include format

## File Changes

### 1. `/src/lib/types/video/input-props.ts`
```typescript
meta: z.object({
  duration: z.number().int().min(1),
  title: z.string().min(1),
  backgroundColor: z.string().optional(),
  // New format fields
  format: z.enum(["landscape", "portrait", "square"]).optional().default("landscape"),
  width: z.number().int().optional().default(1920),
  height: z.number().int().optional().default(1080)
}).strict()
```

### 2. `/src/app/projects/new/FormatSelector.tsx` (NEW)
- Format selection UI component
- Visual preview of each format
- Clear labeling for platforms

### 3. `/src/app/projects/new/page.tsx`
- Add format selection step before project creation
- Pass format to createDefaultProjectProps

### 4. `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`
- Read format from currentProps?.meta
- Use dynamic dimensions instead of hardcoded values

### 5. `/src/config/prompts/active/code-generator.ts`
- Add format-aware guidelines
- Different layout rules for each format

## Success Criteria

1. ✅ Users can select format when creating new project
2. ✅ Preview panel displays correct aspect ratio
3. ✅ AI generates appropriate layouts for each format
4. ✅ Export produces videos with correct dimensions
5. ✅ Existing projects continue to work (default to landscape)

## Testing Plan

1. **Format Selection**
   - Create project with each format
   - Verify dimensions stored correctly

2. **Preview Display**
   - Check aspect ratio matches selected format
   - Ensure preview scales appropriately

3. **AI Generation**
   - Test prompts with each format
   - Verify layouts are format-appropriate

4. **Export**
   - Export videos in each format
   - Verify output dimensions are correct

## Rollback Plan

If issues arise:
1. Remove format selection from UI
2. Default all projects to landscape
3. Hardcode dimensions back to 1920x1080

## Future Enhancements

1. **Format Switching**: Change format after project creation
2. **Multi-Format Export**: Export same project in multiple formats
3. **Custom Dimensions**: Allow any width/height combination
4. **Platform Presets**: TikTok safe zones, Instagram requirements
5. **Responsive Scenes**: Single scene adapts to multiple formats

## Notes

- All scenes within a project use the same format
- Format is chosen once at project creation
- No migration needed for existing projects (default to landscape)
- Clean, simple implementation that can be extended later