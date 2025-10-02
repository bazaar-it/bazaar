# Sprint: Template Admin Management - TODO

## Phase 1: Foundation

### Admin Infrastructure
- [ ] Create `isAdmin()` utility function in `/src/lib/utils/auth.ts`
- [ ] Add admin role check to session type
- [ ] Create `TemplateAdminMenu.tsx` component (dropdown with 5 actions)
- [ ] Integrate admin menu into `TemplatesPanel.tsx` (conditional render)

### Modal Components Scaffolding
- [ ] Create `TemplateRenameModal.tsx`
- [ ] Create `TemplateDurationModal.tsx`
- [ ] Create `TemplateCategoryModal.tsx`
- [ ] Create `TemplateDeleteConfirmation.tsx`
- [ ] Create `TemplateEditModal.tsx` (scene selector)

## Phase 2: Basic Operations

### Rename Template
- [ ] Create `template.rename` tRPC mutation
  - [ ] Admin authentication check
  - [ ] Input validation (name length, duplicates)
  - [ ] Database update
- [ ] Build rename modal UI (text input + submit)
- [ ] Connect modal to mutation
- [ ] Add success/error toast

### Edit Duration
- [ ] Create `template.updateDuration` tRPC mutation
  - [ ] Admin auth check
  - [ ] Validate duration (positive number)
  - [ ] Database update
- [ ] Build duration modal UI (number input)
- [ ] Connect modal to mutation
- [ ] Add success/error toast

### Re-categorize
- [ ] Create `template.updateCategory` tRPC mutation
  - [ ] Admin auth check
  - [ ] Validate category exists
  - [ ] Database update
- [ ] Build category modal UI (dropdown/select)
- [ ] Fetch available categories
- [ ] Connect modal to mutation
- [ ] Add success/error toast

### Delete Template
- [ ] Create `template.delete` tRPC mutation
  - [ ] Admin auth check
  - [ ] Check if template in use (optional warning)
  - [ ] Soft delete or hard delete decision
  - [ ] Database deletion
- [ ] Build delete confirmation dialog
- [ ] Connect confirmation to mutation
- [ ] Add success/error toast
- [ ] Refresh templates list after delete

## Phase 3: Edit Code Flow (Most Complex)

### Scene Selector Modal
- [ ] Design scene selector UI
  - [ ] List all scenes from current project
  - [ ] Show scene name + preview thumbnail (optional)
  - [ ] Radio button selection
  - [ ] Selected scene highlight
- [ ] Fetch current project scenes from `videoState`
- [ ] Handle empty project (no scenes) edge case

### Code Update Mutation
- [ ] Create `template.updateCode` tRPC mutation
  - [ ] Admin auth check
  - [ ] Input validation (templateId, sceneId, projectId)
  - [ ] Fetch scene code from database
  - [ ] Update template code in database
  - [ ] Update `updatedAt` timestamp
  - [ ] Return updated template
- [ ] Handle code dependencies edge case
- [ ] Test code transfer integrity

### Integration
- [ ] Connect scene selector to code update mutation
- [ ] Show loading state during update
- [ ] Success confirmation with template name
- [ ] Refresh templates panel after update
- [ ] Close modal on success

## Phase 4: Polish & Testing

### UI/UX Enhancements
- [ ] Add loading spinners to all mutations
- [ ] Add optimistic updates where appropriate
- [ ] Add toast notifications for all operations
- [ ] Add keyboard shortcuts (Esc to close, Enter to submit)
- [ ] Improve modal accessibility (focus trap, ARIA labels)

### Error Handling
- [ ] Handle network errors gracefully
- [ ] Handle validation errors with clear messages
- [ ] Handle permission errors (403)
- [ ] Add retry logic for failed mutations

### Testing
- [ ] Test rename flow end-to-end
- [ ] Test duration update flow
- [ ] Test category change flow
- [ ] Test delete flow with confirmation
- [ ] Test edit code flow with multiple scenes
- [ ] Test admin-only access (non-admins can't see menu)
- [ ] Test concurrent edits (multiple admins)

### Documentation
- [ ] Update CLAUDE.md with new admin features
- [ ] Document admin menu in sprint progress
- [ ] Add comments to complex code sections
- [ ] Create admin user guide (optional)

## Future Enhancements (Out of Scope)

- [ ] Template activation toggle (enable/disable)
- [ ] Template version history
- [ ] Bulk operations (select multiple templates)
- [ ] Template preview before code update
- [ ] Audit log for admin actions
- [ ] Template usage analytics
- [ ] Duplicate template feature
- [ ] Template export/import

## Dependencies

### Existing Systems
- Auth system (`ctx.session.user.role`)
- Templates database schema
- Templates panel UI
- Video state store (`videoState`)
- tRPC API router

### New Dependencies
- None (using existing stack)

## Risks & Mitigations

### Risk: Breaking existing templates
- **Mitigation**: Add confirmation dialogs, test thoroughly, consider soft delete

### Risk: Admin accidentally deletes critical template
- **Mitigation**: Confirmation dialog, consider "undo" feature or soft delete

### Risk: Code transfer includes project-specific dependencies
- **Mitigation**: Validate code before saving, strip project-specific imports

### Risk: Non-admins bypass UI and call mutations directly
- **Mitigation**: Server-side admin checks on all mutations (critical)

## Notes
- All mutations must have server-side admin authentication
- UI components are secondary - security is in the API layer
- Consider template "in use" check before deletion
- Scene code may need sanitization before template update
