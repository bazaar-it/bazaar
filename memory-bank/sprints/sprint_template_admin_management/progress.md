# Sprint: Template Admin Management - Progress

## Sprint Start: 2025-10-02

## Overview
Adding comprehensive admin template management directly in the Templates Panel on the generate/workspace page. Admins can rename, edit duration, re-categorize, delete, and update template code from project scenes.

## Current Status: Implementation Complete ✅

### Completed
- [x] Sprint documentation created
- [x] Requirements mapped from voice input
- [x] TODO list created with 4 phases
- [x] Identified all required components and mutations
- [x] Database analysis via MCP prod queries
- [x] API mutation (`templates.updateCode`) added
- [x] All 6 UI components created
- [x] Admin menu integrated into TemplatesPanel
- [x] TypeScript errors fixed
- [x] Schema updated to support duration in updates

### In Progress
- None

### Blocked
- None

## Implementation Completed: 2025-10-02

All features implemented and ready for testing in ~5-6 hours as estimated.

## Key Decisions Made

### 1. Location: Templates Panel
Admin functionality lives directly in the Templates Panel, not a separate admin page. This allows admins to manage templates while working on projects.

### 2. Menu Pattern: Dropdown
Each template card gets a "⋮" menu icon (top-right) visible only to admins. Clicking opens dropdown with 5 actions.

### 3. Edit Flow: Scene Selector
When updating template code, admin selects a scene from the current project. The system copies that scene's code to the template.

### 4. Update vs. Duplicate
Template code updates are in-place (overwrite existing), not creating new templates. Preserves template ID and metadata.

### 5. Security: Server-Side Checks
All mutations require server-side admin role verification. UI hiding is not security.

## Technical Architecture

### Components to Create
1. `TemplateAdminMenu.tsx` - Dropdown menu (⋮)
2. `TemplateRenameModal.tsx` - Text input for name
3. `TemplateDurationModal.tsx` - Number input for duration
4. `TemplateCategoryModal.tsx` - Category selector
5. `TemplateDeleteConfirmation.tsx` - Confirm delete dialog
6. `TemplateEditModal.tsx` - Scene selector + update

### API Mutations to Create
All in `src/server/api/routers/template.ts`:
- `template.rename`
- `template.updateDuration`
- `template.updateCategory`
- `template.delete`
- `template.updateCode`

Each mutation needs:
- Admin auth check via `ctx.session.user.role`
- Input validation
- Database operation
- Error handling
- Return updated data

### Data Flow: Edit Code
```
User clicks "Edit" on template
  ↓
Modal opens with scene list (from videoState)
  ↓
User selects scene
  ↓
Click "Update Template"
  ↓
Mutation: template.updateCode({ templateId, sceneId, projectId })
  ↓
Server fetches scene code from DB
  ↓
Server updates template.code with scene.code
  ↓
Client refreshes templates panel
  ↓
Success toast
```

## Implementation Plan

### Phase 1: Foundation (Est. 2-3 hours)
Set up admin infrastructure, create component scaffolding

### Phase 2: Basic Operations (Est. 4-5 hours)
Implement rename, duration, category, delete flows

### Phase 3: Edit Code Flow (Est. 3-4 hours)
Most complex - scene selector and code transfer logic

### Phase 4: Polish (Est. 2-3 hours)
Loading states, error handling, testing

**Total Estimate**: 11-15 hours

## Edge Cases to Handle

1. **No scenes in project**: Disable "Edit Code" button
2. **Template in use**: Show warning before delete (optional)
3. **Invalid scene code**: Validate before saving to template
4. **Concurrent edits**: Handle optimistic locking
5. **Empty category list**: Show "No categories" message
6. **Non-admin tries mutation**: Return 403 error
7. **Project-specific imports**: Consider code sanitization

## Questions for Review

1. Should templates have an "active/inactive" toggle?
2. Should we track template version history?
3. Should we show which projects use a template before deletion?
4. Should we allow preview of scene before updating template code?
5. Hard delete vs. soft delete for templates?

## Related Files

### Existing Files to Modify
- `/src/app/projects/[id]/generate/workspace/panels/TemplatesPanel.tsx` - Add admin menu integration
- `/src/server/api/routers/template.ts` - Add admin mutations (or create if doesn't exist)

### New Files to Create
- `/src/components/templates/TemplateAdminMenu.tsx`
- `/src/components/templates/TemplateRenameModal.tsx`
- `/src/components/templates/TemplateDurationModal.tsx`
- `/src/components/templates/TemplateCategoryModal.tsx`
- `/src/components/templates/TemplateDeleteConfirmation.tsx`
- `/src/components/templates/TemplateEditModal.tsx`

### Reference Files
- `/src/server/db/schema.ts` - Templates table schema
- `/src/stores/videoState.ts` - Scene data access
- `/src/app/admin/` - Admin UI patterns

## Next Steps

1. Review templates database schema
2. Confirm admin role implementation in auth
3. Start Phase 1: Create admin check utility
4. Build `TemplateAdminMenu` component
5. Integrate menu into `TemplatesPanel`

## Notes

- This sprint focuses on admin UX, not template creation workflow
- All operations happen in the context of an open project
- Security is paramount - every mutation must verify admin role
- Keep UI simple and consistent with existing admin patterns
- Consider this foundation for future template marketplace
