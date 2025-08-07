# Sprint 93 - Admin Templates System Analysis

## Current State Analysis

### 1. Template Storage Architecture
**Current Implementation: HARDCODED in Codebase**
- Templates are stored as React components in `/src/templates/` directory
- Each template is a `.tsx` file with:
  - A React component (the actual rendered template)
  - A `templateConfig` export with metadata (id, name, duration, getCode function)
- Templates are registered in `/src/templates/registry.ts`
- NO database storage - everything is hardcoded

### 2. Template Registry System
- `registry.ts` imports all template files manually
- Maintains a `TEMPLATES` array with all available templates
- Uses `templateFormatAnalysis` to determine format support
- Templates have format restrictions (landscape/portrait/square)

### 3. Template Display & Usage
- `TemplatesPanelG.tsx` displays templates in a grid
- Uses Remotion Player for preview (static frame 15, plays on hover)
- When clicked, calls `addTemplate` mutation which:
  - Gets the template code via `template.getCode()`
  - Makes components unique by adding suffixes
  - Saves as a new scene in the database

### 4. Key Issues with Current System
1. **Slow Addition**: Must manually create `.tsx` files and update registry
2. **Deployment Required**: New templates need code deployment
3. **No Dynamic Updates**: Can't add templates without pushing code
4. **Limited Access**: Only developers can add templates
5. **No User Content**: Can't convert user scenes to templates

## Proposed Solution: Dynamic Template System

### 1. Database Schema Addition
```typescript
// Add to schema.ts
export const templates = d.table("templates", {
  id: d.uuid().primaryKey().defaultRandom(),
  name: d.varchar({ length: 255 }).notNull(),
  description: d.text(),
  tsxCode: d.text().notNull(),
  duration: d.integer().notNull(),
  previewFrame: d.integer().default(15),
  supportedFormats: d.json().$type<('landscape' | 'portrait' | 'square')[]>().default(['landscape', 'portrait', 'square']),
  thumbnailUrl: d.text(), // Optional: Store a thumbnail
  category: d.varchar({ length: 100 }), // e.g., "text", "background", "animation"
  tags: d.json().$type<string[]>().default([]),
  isActive: d.boolean().default(true),
  isOfficial: d.boolean().default(false), // Official vs user-created
  createdBy: d.varchar({ length: 255 }).references(() => users.id),
  sourceProjectId: d.uuid().references(() => projects.id), // Original project
  sourceSceneId: d.uuid().references(() => scenes.id), // Original scene
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
});
```

### 2. Admin UI Flow
```
Project Page (for admins):
├── Existing "Add Scene" button
├── Existing "Export" button
└── NEW: "Create Template" button (only visible if user.isAdmin)
    └── Opens modal:
        ├── Scene selector (if multiple scenes)
        ├── Template name input
        ├── Description textarea
        ├── Format compatibility checkboxes
        ├── Category dropdown
        ├── Tags input
        └── "Save as Template" button
```

### 3. Implementation Steps

#### Phase 1: Database & API
1. Add templates table to schema
2. Create template CRUD operations:
   - `createTemplate` - Admin only
   - `getTemplates` - Public (filter by isActive)
   - `updateTemplate` - Admin only
   - `deleteTemplate` - Admin only (soft delete via isActive)

#### Phase 2: Admin UI
1. Add "Create Template" button to project page (conditional on isAdmin)
2. Create `CreateTemplateModal` component:
   ```tsx
   interface CreateTemplateModalProps {
     projectId: string;
     scenes: Scene[];
     onClose: () => void;
   }
   ```
3. Modal should:
   - List all scenes with preview
   - Allow metadata input
   - Call `createTemplate` mutation

#### Phase 3: Update Templates Panel
1. Modify `TemplatesPanelG` to:
   - First load hardcoded templates (for backward compatibility)
   - Then fetch database templates via `getTemplates` query
   - Merge both sources
   - Show "Official" badge on database templates where `isOfficial = true`

#### Phase 4: Template Code Processing
1. When creating template from scene:
   - Extract the scene's `tsxCode`
   - Clean up any project-specific IDs
   - Make component names generic
   - Store in database

### 4. Migration Strategy
1. Keep existing hardcoded templates working
2. Gradually migrate popular hardcoded templates to database
3. Eventually deprecate hardcoded system

### 5. Benefits
- **Instant Updates**: New templates available immediately
- **User Content**: Convert any good scene to template
- **No Deployment**: Add templates without code changes
- **Better Organization**: Categories, tags, search
- **Version Control**: Track template updates
- **Analytics**: See which templates are popular

### 6. Security Considerations
- Only admins can create/edit/delete templates
- Code validation before storage (no malicious code)
- Sanitize template code before rendering
- Rate limiting on template creation

## Technical Feasibility: HIGH

This is definitely doable with the current architecture. The system already:
- Stores and renders TSX code (scenes)
- Has admin checks (user.isAdmin)
- Has modal UI patterns
- Has code uniquification logic

The main work is:
1. Database schema (1 hour)
2. API endpoints (2 hours)
3. Admin UI (3-4 hours)
4. Update templates panel (2 hours)

Total estimate: 8-10 hours for full implementation