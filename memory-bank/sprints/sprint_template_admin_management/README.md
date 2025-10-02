# Sprint: Template Admin Management

## Goal
Add comprehensive admin functionality to the Templates Panel for managing templates directly from the generate/workspace page.

## Scope
Enable admins to perform full CRUD operations on templates without leaving the project generation page.

## Admin Capabilities Required

### 1. Template Management Menu
- **Location**: Templates Panel (top-right of each template when admin is logged in)
- **Actions Available**:
  - Rename template
  - Edit default duration
  - Re-categorize template
  - Delete template
  - Edit/update template code

### 2. Basic Operations (Modal-based)
All these operations should open a modal for the selected template:

#### Rename
- Update template display name
- Mutation: `api.template.rename`

#### Edit Duration
- Update default duration (seconds/frames)
- Mutation: `api.template.updateDuration`

#### Re-categorize
- Change template category (dropdown of existing categories)
- Mutation: `api.template.updateCategory`

#### Delete
- Remove template from database
- Confirmation dialog required
- Mutation: `api.template.delete`

### 3. Edit/Update Code Flow
**This is the most complex operation:**

#### Workflow:
1. Admin clicks "Edit" on a template in Templates Panel
2. Modal opens showing:
   - Current template info (name, duration, category)
   - **Scene Selector**: List of all scenes from the current project
3. Admin selects one scene from the current project
4. Click "Update Template" button
5. System updates the template's code with the selected scene's code
6. **Important**: Original template is updated, not duplicated

#### Technical Details:
- **Source**: Current project's scenes (`projects[projectId].scenes`)
- **Target**: Template database record (`templates` table)
- **Operation**:
  - Copy scene code from `scenes[selectedSceneId].code`
  - Update `templates[templateId].code` with new code
  - Preserve template metadata (name, duration, category)
  - Update `updatedAt` timestamp

## UI/UX Design

### Template Card Enhancement
```
┌─────────────────────────┐
│   Template Preview      │
│                         │
│   Template Name         │
│   Category • Duration   │
│                    [⋮]  │ ← Admin menu (only visible to admins)
└─────────────────────────┘
```

### Admin Menu Dropdown
```
⋮ (Click)
├─ Rename
├─ Edit Duration
├─ Re-categorize
├─ Edit Code (from scene)
└─ Delete
```

### Edit Code Modal
```
┌─────────────────────────────────────────┐
│ Update Template: "Floating Particles"  │
├─────────────────────────────────────────┤
│ Select a scene from current project:   │
│                                         │
│ ○ Scene 1: Product Showcase            │
│ ○ Scene 2: Animated Logo               │
│ ● Scene 3: Floating Particles (NEW)    │ ← Selected
│ ○ Scene 4: Call to Action              │
│                                         │
│ Template will use code from Scene 3    │
│                                         │
│        [Cancel]  [Update Template]     │
└─────────────────────────────────────────┘
```

## Database Schema Considerations

### Templates Table
Ensure the following fields exist (reference: `src/server/db/schema.ts`):
- `id` - Template ID
- `name` - Display name
- `code` - TSX code
- `category` - Category string
- `duration` - Default duration in seconds
- `userId` - Creator/owner
- `updatedAt` - Last modified timestamp
- `active` - Boolean (for template activation)

### Required Mutations
All in `src/server/api/routers/template.ts` (or create if doesn't exist):

```typescript
// Basic CRUD
template.rename
template.updateDuration
template.updateCategory
template.delete
template.updateCode // For the edit flow

// Each requires:
// - Admin authentication check
// - Input validation
// - Database mutation
// - Return updated template
```

## Authentication & Authorization

### Admin Check
- Use existing auth system (`ctx.session.user.role === 'admin'`)
- UI elements only render for admins
- Server-side mutations must verify admin role
- Reject non-admin requests with 403

### Security Considerations
- Validate template ownership or admin role
- Sanitize all inputs (especially code)
- Rate limiting on mutations
- Audit log for admin actions (optional enhancement)

## File Structure

```
src/
├── app/projects/[id]/generate/
│   └── workspace/panels/
│       └── TemplatesPanel.tsx              # Add admin menu here
├── components/templates/
│   ├── TemplateAdminMenu.tsx              # New: Dropdown menu
│   ├── TemplateEditModal.tsx              # New: Edit code modal
│   ├── TemplateRenameModal.tsx            # New: Rename modal
│   ├── TemplateDurationModal.tsx          # New: Duration modal
│   ├── TemplateCategoryModal.tsx          # New: Category modal
│   └── TemplateDeleteConfirmation.tsx     # New: Delete dialog
├── server/api/routers/
│   └── template.ts                         # Admin mutations
└── lib/types/
    └── template.ts                         # Type definitions
```

## Implementation Phases

### Phase 1: Foundation
- [ ] Create admin check utility
- [ ] Add admin menu component to TemplatesPanel
- [ ] Create basic modal components (rename, duration, category, delete)

### Phase 2: Basic Operations
- [ ] Implement rename mutation + UI
- [ ] Implement duration mutation + UI
- [ ] Implement category mutation + UI
- [ ] Implement delete mutation + UI

### Phase 3: Code Edit Flow
- [ ] Create scene selector modal
- [ ] Implement code update mutation
- [ ] Connect scene selection to template update
- [ ] Test code transfer from scene to template

### Phase 4: Polish
- [ ] Add loading states
- [ ] Add success/error toasts
- [ ] Add confirmation dialogs
- [ ] Test all flows thoroughly

## Technical Notes

### State Management
- Use existing `videoState` store for current project scenes
- Refresh templates list after mutations
- Optimistic updates where appropriate

### Code Transfer Logic
```typescript
// Pseudo-code for edit flow
async function updateTemplateFromScene(
  templateId: string,
  sceneId: string,
  projectId: string
) {
  // 1. Get scene code from current project
  const scene = await getScene(projectId, sceneId);

  // 2. Update template with scene code
  await db.update(templates)
    .set({
      code: scene.code,
      updatedAt: new Date()
    })
    .where(eq(templates.id, templateId));

  // 3. Return updated template
  return getTemplate(templateId);
}
```

### Edge Cases to Handle
- What if template is in use by other projects?
- What if scene code has project-specific dependencies?
- What if category dropdown is empty?
- What if admin deletes last template in a category?

## Success Criteria

- [ ] Admins can rename templates without leaving generate page
- [ ] Admins can change template duration
- [ ] Admins can re-categorize templates
- [ ] Admins can delete templates (with confirmation)
- [ ] Admins can update template code from any scene in current project
- [ ] All operations are secure (admin-only)
- [ ] UI is intuitive and follows existing design patterns
- [ ] Changes persist to database correctly
- [ ] Templates panel refreshes after mutations

## Related Sprints
- Sprint 93: Admin Templates (previous admin work)
- Sprint 99: Template Context Engineering
- Sprint 99: Template Docs

## Questions/Decisions Needed
- Should we add an "activation" toggle (enable/disable templates)?
- Should we track template version history?
- Should we allow bulk operations (select multiple templates)?
- Should we add template preview before updating code?
