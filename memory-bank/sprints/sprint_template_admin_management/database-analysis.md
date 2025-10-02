# Database Analysis - Template Admin Management

## Production Database Queries (2025-10-02)

### Overview Statistics
- **Total Templates**: 72
- **Active Templates**: 71
- **Admin-Only Templates**: 2
- **Unique Categories**: 4
- **Unique Creators**: 3
- **Average Duration**: 127 seconds (~2 minutes)
- **Average Usage**: 2.3 uses per template

### Category Distribution
```
animation: 39 templates (54%)
text:      27 templates (38%)
business:   2 templates (3%)
background: 1 template  (1%)
null:       3 templates (4%) ← needs categorization
```

## Database Schema - `bazaar-vid_templates`

### Core Fields (Already Exist)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `name` | varchar(255) | NO | - | Display name |
| `description` | text | YES | - | Optional description |
| `tsx_code` | text | NO | - | TypeScript React code |
| `duration` | integer | NO | - | **Duration in FRAMES, not seconds!** |
| `category` | varchar(100) | YES | - | Category string |
| `is_active` | boolean | NO | true | Soft delete flag |
| `is_official` | boolean | NO | false | Official template flag |
| `created_by` | varchar(255) | NO | - | User ID (references users.id) |
| `source_project_id` | uuid | YES | - | References projects.id |
| `source_scene_id` | uuid | YES | - | References scenes.id |
| `usage_count` | integer | NO | 0 | Incremented on use |
| `created_at` | timestamptz | NO | CURRENT_TIMESTAMP | Creation time |
| `updated_at` | timestamptz | NO | CURRENT_TIMESTAMP | Last update time |

### Compilation Fields (Server-Side Compilation)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `js_code` | text | YES | - | Compiled JavaScript |
| `js_compiled_at` | timestamptz | YES | - | Compilation timestamp |
| `compilation_error` | text | YES | - | Error message if compilation failed |

### Display Fields
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `preview_frame` | integer | YES | 15 | Frame for thumbnail |
| `thumbnail_url` | text | YES | - | Preview image URL |
| `supported_formats` | jsonb | YES | ['landscape', 'portrait', 'square'] | Array of formats |
| `tags` | jsonb | YES | [] | Array of strings |

### Multi-Scene Template Fields
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `admin_only` | boolean | NO | false | **Admin visibility flag** |
| `scene_count` | integer | NO | 1 | Number of scenes in template |
| `total_duration` | integer | YES | - | Sum of all scene durations |

## Database Schema - `bazaar-vid_template_scene`

**Multi-scene templates** (like "OrbitFlow 4-scene Launch") use a separate table:

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NO | Primary key |
| `template_id` | uuid | NO | References templates.id |
| `name` | varchar | NO | Scene name |
| `description` | text | YES | Scene description |
| `order` | integer | NO | Scene order (0-indexed) |
| `duration` | integer | NO | Scene duration in frames |
| `tsx_code` | text | NO | Scene TSX code |
| `js_code` | text | YES | Compiled JS |
| `js_compiled_at` | timestamptz | YES | Compilation time |
| `compilation_error` | text | YES | Error message |
| `created_at` | timestamptz | NO | Creation time |
| `updated_at` | timestamptz | NO | Update time |

### Example Multi-Scene Template
```sql
-- Template: "OrbitFlow 4-scene Launch"
-- ID: 8f4e0a64-a4b3-4a0c-9da0-0df5d2b94803
-- scene_count: 4, admin_only: true, is_active: false

-- Associated scenes in bazaar-vid_template_scene:
1. "01 - Launch Hero" (order: 0, duration: 150)
2. "02 - Problem Framing" (order: 1, duration: 150)
3. "03 - Solution Walkthrough" (order: 2, duration: 150)
4. "04 - [Fourth Scene]" (order: 3, duration: ?)
```

## Database Schema - `bazaar-vid_template_usage`

Tracks individual template usage events for analytics:

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NO | Primary key |
| `template_id` | uuid | NO | References templates.id (cascade delete) |
| `user_id` | varchar(255) | YES | References users.id (set null on delete) |
| `project_id` | uuid | YES | References projects.id (set null on delete) |
| `scene_id` | uuid | YES | References scenes.id (set null on delete) |
| `created_at` | timestamptz | NO | Usage timestamp |

## Drizzle Schema Definition

Located in `/src/server/db/schema.ts:1308-1336`:

```typescript
export const templates = createTable("templates", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  name: d.varchar("name", { length: 255 }).notNull(),
  description: d.text("description"),
  tsxCode: d.text("tsx_code").notNull(),
  jsCode: d.text("js_code"),
  jsCompiledAt: d.timestamp("js_compiled_at", { withTimezone: true }),
  compilationError: d.text("compilation_error"),
  duration: d.integer("duration").notNull(),
  previewFrame: d.integer("preview_frame").default(15),
  supportedFormats: d.jsonb("supported_formats").$type<('landscape' | 'portrait' | 'square')[]>().default(['landscape', 'portrait', 'square']),
  thumbnailUrl: d.text("thumbnail_url"),
  category: d.varchar("category", { length: 100 }),
  tags: d.jsonb("tags").$type<string[]>().default([]),
  isActive: d.boolean("is_active").default(true).notNull(),
  isOfficial: d.boolean("is_official").default(false).notNull(),
  createdBy: d.varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  sourceProjectId: d.uuid("source_project_id").references(() => projects.id),
  sourceSceneId: d.uuid("source_scene_id").references(() => scenes.id),
  usageCount: d.integer("usage_count").default(0).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("templates_active_idx").on(t.isActive),
  index("templates_official_idx").on(t.isOfficial),
  index("templates_category_idx").on(t.category),
  index("templates_created_by_idx").on(t.createdBy),
  index("templates_created_at_idx").on(t.createdAt),
]);
```

**NOTE**: The schema in code is MISSING the following columns that exist in production:
- `admin_only` (boolean)
- `scene_count` (integer)
- `total_duration` (integer)

## Existing API - `/src/server/api/routers/templates.ts`

### Public Procedures
- `getAll` - Get all active templates (supports pagination, category filter, format filter)
- `getById` - Get single template by ID
- `getCategories` - Get all categories with counts

### Protected Procedures
- `trackUsage` - Increment usage count and create usage event
- `getUserTemplates` - Get templates created by current user

### Admin Procedures
- `create` - Create template from scene (extracts code, processes it)
- `update` - Update template metadata (name, description, category, tags, etc.)
- `delete` - Soft delete (sets `isActive = false`)

### What's Missing (Our Sprint Adds)
- `rename` - Dedicated rename endpoint (currently part of `update`)
- `updateDuration` - Dedicated duration update (currently part of `update`)
- `updateCategory` - Dedicated category update (currently part of `update`)
- `updateCode` - **Update template code from a project scene** (NEW - core feature)

## Template Code Update Flow (NEW Feature)

### Current Template Creation Flow
```typescript
// /src/server/api/routers/templates.ts:43-100
create: adminProcedure
  .mutation(async ({ ctx, input }) => {
    // 1. Get scene from project
    const scene = await db.query.scenes.findFirst(...);

    // 2. Process code (remove scene-specific IDs)
    let templateCode = scene.tsxCode;
    templateCode = templateCode.replace(/Scene_[a-zA-Z0-9]{8}/g, 'TemplateScene');

    // 3. Create template
    const [newTemplate] = await db.insert(templates).values({
      tsxCode: templateCode,
      duration: scene.duration,
      // ... other fields
    }).returning();
  })
```

### Proposed Code Update Flow
```typescript
// NEW: templates.updateCode
updateCode: adminProcedure
  .input(z.object({
    templateId: z.string().uuid(),
    projectId: z.string().uuid(),
    sceneId: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify template exists
    const template = await db.query.templates.findFirst(...);

    // 2. Get scene code from project
    const scene = await db.query.scenes.findFirst({
      where: and(
        eq(scenes.id, input.sceneId),
        eq(scenes.projectId, input.projectId),
        isNull(scenes.deletedAt)
      )
    });

    // 3. Process code (same as create)
    let templateCode = scene.tsxCode;
    templateCode = templateCode.replace(/Scene_[a-zA-Z0-9]{8}/g, 'TemplateScene');

    // 4. Update template
    const [updated] = await db.update(templates)
      .set({
        tsxCode: templateCode,
        jsCode: null, // Clear compiled JS (will be recompiled)
        jsCompiledAt: null,
        compilationError: null,
        updatedAt: new Date(),
        sourceProjectId: input.projectId,
        sourceSceneId: input.sceneId,
      })
      .where(eq(templates.id, input.templateId))
      .returning();

    return updated;
  })
```

## Key Findings & Implications

### 1. Duration is in FRAMES, not seconds
- Production data shows `duration: 80, 90, 330` etc.
- These are frame counts, not seconds
- At 30 FPS: 90 frames = 3 seconds
- **UI must convert frames ↔ seconds for admin editing**

### 2. Schema Drift Issue
The production database has columns (`admin_only`, `scene_count`, `total_duration`) that are NOT in the Drizzle schema. This means:
- Either a migration added these columns outside Drizzle
- Or the schema.ts file is out of sync with production
- **MUST sync schema before adding new features**

### 3. Multi-Scene Templates Exist
Two templates have `scene_count: 4`:
- "OrbitFlow 4-scene Launch" (admin_only, inactive)
- "tttttttt" (admin_only, active)

These use the `bazaar-vid_template_scene` join table. Our admin UI must handle:
- Single-scene templates (most common)
- Multi-scene templates (rare, but exist)

### 4. Admin-Only Flag Exists
`admin_only: boolean` column exists in production but NOT in schema.
- Currently 2 admin-only templates
- This flag likely controls visibility in template panel
- **Need to add this column to schema.ts**

### 5. Soft Delete Pattern
Templates use `is_active` for soft delete, not a `deleted_at` timestamp.
- `delete` mutation sets `is_active = false`
- Queries filter by `eq(templates.isActive, true)`
- Deleted templates are NOT shown to users

### 6. Source Tracking
Templates track their origin:
- `source_project_id` - Which project the template came from
- `source_scene_id` - Which scene was used to create the template
- When updating code, we should update these fields

### 7. Usage Tracking
Two-level usage tracking:
- `usage_count` (integer) - Quick counter on templates table
- `template_usage` (events table) - Detailed usage log for analytics
- `trackUsage` mutation increments both

## Admin Menu Requirements

Based on database structure, admin menu should support:

### Basic Metadata Edits
- [x] Rename (update `name`)
- [x] Edit duration (update `duration` in FRAMES, convert from seconds)
- [x] Re-categorize (update `category`)
- [x] Delete (set `is_active = false`)

### Code Update (NEW)
- [ ] Select scene from current project
- [ ] Update `tsx_code` from scene
- [ ] Clear `js_code`, `js_compiled_at`, `compilation_error`
- [ ] Update `source_project_id` and `source_scene_id`
- [ ] Update `updated_at`

### Advanced Features (Future)
- [ ] Toggle `admin_only` flag
- [ ] Toggle `is_official` flag
- [ ] Edit `tags` array
- [ ] Edit `supported_formats` array
- [ ] Update `description`
- [ ] Manage multi-scene templates (template_scene table)

## Migration Action Items

### CRITICAL: Fix Schema Drift
```typescript
// Add missing columns to src/server/db/schema.ts
export const templates = createTable("templates", (d) => ({
  // ... existing fields ...
  adminOnly: d.boolean("admin_only").default(false).notNull(),
  sceneCount: d.integer("scene_count").default(1).notNull(),
  totalDuration: d.integer("total_duration"),
}));
```

### Migration File Needed
```sql
-- Only if not already in production (check first!)
ALTER TABLE "bazaar-vid_templates"
  ADD COLUMN IF NOT EXISTS "admin_only" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "scene_count" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "total_duration" integer;
```

## Security Considerations

### Admin Role Check
All admin mutations MUST verify `ctx.session.user.isAdmin`:
```typescript
if (!ctx.session.user.isAdmin) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Admin access required",
  });
}
```

### Template Ownership
Currently `update` checks:
```typescript
if (existingTemplate.createdBy !== ctx.session.user.id && !ctx.session.user.isAdmin)
```

For new admin mutations, simplify to:
```typescript
// Admin procedures already enforce isAdmin, no need to check creator
```

### Input Validation
- Template IDs: Must be valid UUIDs
- Scene IDs: Must exist in the specified project
- Project IDs: No ownership check needed (admin can update any template with any scene)
- Duration: Must be positive integer (frames)
- Category: Optional, max 100 chars
- Name: Required, max 255 chars

## Code References

### Template Router
`/src/server/api/routers/templates.ts`
- Line 43: `create` mutation (template from scene)
- Line 212: `update` mutation (metadata only)
- Line 250: `delete` mutation (soft delete)
- Line 294: `trackUsage` mutation

### Template Operations
`/src/server/api/routers/generation/template-operations.ts`
- Line 17: `addTemplate` mutation (user adds template to project)
- Line 64: Server-side compilation via `sceneCompiler`

### Database Schema
`/src/server/db/schema.ts`
- Line 1308: `templates` table definition
- Line 1355: `templateUsages` table definition
- Missing: `admin_only`, `scene_count`, `total_duration` columns

## Next Steps

1. **Fix schema drift** - Add missing columns to schema.ts
2. **Verify migration state** - Check if columns need migration or just schema update
3. **Create admin mutations** - `updateCode`, and split `update` into specific mutations
4. **Build UI components** - Admin menu, modals, scene selector
5. **Test thoroughly** - Especially code update flow with compilation
