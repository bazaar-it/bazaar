# Sprint 48: Mobile Support TODO

## Phase 1: Core Infrastructure (Priority: HIGH)
- [ ] Add video_width, video_height, video_format columns to projects table
- [ ] Update project creation UI with format selector
- [ ] Define VIDEO_FORMATS constant with presets
- [ ] Update Drizzle schema with new fields
- [ ] Create migration for existing projects

## Phase 2: Dynamic Dimensions (Priority: HIGH)
- [ ] Update PreviewPanelG to use project dimensions
- [ ] Remove hardcoded 1280x720 from Player props
- [ ] Create getVideoConfig helper function
- [ ] Update remotion-constants.ts to support dynamic values
- [ ] Add dimensions to InputProps meta section

## Phase 3: AI Updates (Priority: MEDIUM)
- [ ] Update code-generator.ts prompt with format context
- [ ] Update code-editor.ts prompt with format context
- [ ] Create format-specific generation examples
- [ ] Test AI generation for each format
- [ ] Add responsive design patterns to prompts

## Phase 4: UI/UX Updates (Priority: MEDIUM)
- [ ] Create format selector component
- [ ] Update preview container for different aspect ratios
- [ ] Add preview scaling logic
- [ ] Ensure workspace adapts to format
- [ ] Add format indicator in UI

## Phase 5: Templates (Priority: LOW)
- [ ] Audit existing templates for responsiveness
- [ ] Create mobile-specific template examples
- [ ] Update template metadata with supported formats
- [ ] Test all templates at different dimensions

## Phase 6: Export & Rendering (Priority: LOW)
- [ ] Update render configuration with dynamic dimensions
- [ ] Test exports for each format
- [ ] Add format presets for social platforms
- [ ] Verify output quality

## Testing Checklist
- [ ] Desktop format (1280x720) works as before
- [ ] Mobile portrait (1080x1920) generates correctly
- [ ] Square format (1080x1080) displays properly
- [ ] Custom dimensions are supported
- [ ] AI generates appropriate content for each format
- [ ] Preview scales correctly in workspace
- [ ] Exports match selected dimensions

## Quick Wins (Can do immediately)
1. Update AI prompts to use responsive patterns ✅
2. Create sprint documentation ✅
3. Identify all hardcoded dimension locations
4. Plan database schema changes