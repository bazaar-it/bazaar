# Sprint 48: Implementation Checklist

## ✅ Phase 1: Core Implementation (Day 1-2)

### Database Updates
- [ ] Add columns to projects table:
  ```sql
  ALTER TABLE projects 
  ADD COLUMN format VARCHAR(20) DEFAULT 'youtube',
  ADD COLUMN width INTEGER DEFAULT 1280,
  ADD COLUMN height INTEGER DEFAULT 720;
  ```
- [ ] Update Drizzle schema
- [ ] Create migration
- [ ] Run migration on development database

### Project Creation UI
- [ ] Create `VideoFormatSelector` component
- [ ] Add to project creation flow
- [ ] Store format selection in database
- [ ] Update project creation API endpoint

### Remove Hardcoded Dimensions
- [ ] Update `PreviewPanelG.tsx` (lines 634-635):
  ```typescript
  compositionWidth={project.width || 1280}
  compositionHeight={project.height || 720}
  ```
- [ ] Update `remotion-constants.ts` to use dynamic values
- [ ] Search for all `1280` and `720` hardcoded values
- [ ] Replace with project-based values

### Update InputProps
- [ ] Add width/height to meta section:
  ```typescript
  meta: {
    durationInFrames: number;
    fps: number;
    width: number;  // NEW
    height: number; // NEW
  }
  ```

## ✅ Phase 2: AI Integration (Day 3-4)

### Update AI Prompts
- [ ] Add format context to generation:
  ```typescript
  const context = `
  Video format: ${project.format} (${project.width}x${project.height})
  ${project.height > project.width ? 'VERTICAL' : 'HORIZONTAL'} layout
  `;
  ```
- [ ] Test generation for each format
- [ ] Verify appropriate layouts

### Format-Specific Guidelines
- [ ] Create helper function:
  ```typescript
  function getFormatGuidelines(format: string): string
  ```
- [ ] Add guidelines for:
  - YouTube: Multi-column, standard text
  - Stories: Stacked elements, large text
  - Square: Centered, balanced layouts

## ✅ Phase 3: Testing & Polish (Day 5)

### Testing Checklist
- [ ] Create project with YouTube format
- [ ] Create project with Stories format
- [ ] Create project with Square format
- [ ] Generate content for each format
- [ ] Verify preview dimensions
- [ ] Check AI generates appropriate layouts
- [ ] Test export functionality

### Edge Cases
- [ ] Existing projects default to YouTube format
- [ ] Preview scales correctly in workspace
- [ ] Chat still functions normally
- [ ] Scene editing works for all formats

### Documentation
- [ ] Update CLAUDE.md with format support
- [ ] Document in sprint folder
- [ ] Add to TODO-critical if any issues

## ✅ Phase 4: Future Enhancements (Later)

### Cross-Format Export
- [ ] Design "Export to Different Format" UI
- [ ] Implement batch scene conversion
- [ ] Create new project with converted scenes
- [ ] Test conversion quality

### Format Templates
- [ ] Create format-specific scene templates
- [ ] Mobile-optimized animations
- [ ] Platform-specific CTAs

## 🚀 Quick Wins (Do First)

1. **Update AI prompts** ✅ (Already done)
2. **Create constants file**:
   ```typescript
   // src/lib/constants/video-formats.ts
   export const VIDEO_FORMATS = [...];
   ```
3. **Simple format selector component**
4. **Update PreviewPanelG dimensions**

## 📝 Notes

- Keep existing projects working (default to YouTube)
- Focus on simplicity - no complex state management
- Test thoroughly before moving to next phase
- Document any issues in sprint folder

## Definition of Done

- [ ] Users can select format when creating project
- [ ] Preview shows correct dimensions
- [ ] AI generates format-appropriate content  
- [ ] All tests pass
- [ ] No regression in existing functionality
- [ ] Documentation updated