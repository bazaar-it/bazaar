# 🚨 CRITICAL: Brand Profile Architecture - Shared vs Isolated

**Date**: 2025-09-30
**Sprint**: 125 - Shared Brand Profiles
**Status**: BLOCKED - Tables exist in dev but tied to projectId

## The Problem

Current brand profile architecture **defeats compounding value**:

```
CURRENT (BROKEN):
User A extracts github.com → Saved to projectId_123
User B extracts github.com → Saved to projectId_456 (DUPLICATE!)
User C extracts github.com → Saved to projectId_789 (DUPLICATE!)

Result: 19 profiles, only 13 unique URLs - 6 WASTED extractions
```

## Why This Matters

### The Vision (from user)
> "Goal is URL → full multiscene perfect video in ONE prompt"
> "Every new URL benefits everyone from a richer dataset perspective"
> "We're going to launch this in 3 weeks"

### Current Reality
- Brand extraction is **expensive** (Claude Sonnet 4 + screenshots + analysis)
- Each user re-extracts the same URLs
- No shared learning across users
- Testing requires re-running extraction every time

### What We Need
```
SHARED (CORRECT):
User A extracts github.com → Saved once with URL as key
User B needs github.com → Instant cache hit ✅
User C needs github.com → Instant cache hit ✅

Result: Compounding value, instant testing, shared dataset
```

## Current Schema Analysis

### Tables in DEV (not in PROD yet)

#### `bazaar-vid_brand_profile`
```sql
-- PROBLEM: projectId is NOT NULL and has foreign key
project_id uuid NOT NULL → REFERENCES projects(id) CASCADE

-- INDEX on projectId means queries are tied to projects
CREATE INDEX brand_profiles_project_idx ON project_id
```

**This is fundamentally wrong for shared data.**

#### Data in Dev Database
- **19 total profiles**
- **13 unique URLs**
- **19 unique projects**
- **6 duplicate extractions** (31% waste rate)

Examples of waste:
- `github.com` extracted twice
- Other URLs likely duplicated across projects

### Current Code Flow

#### 1. Save Flow (`save-brand-profile.ts:10`)
```typescript
export async function saveBrandProfile(
  projectId: string,  // ❌ Requires project
  websiteUrl: string,
  extractedData: any
)
```

#### 2. Query Flow (`brandProfile.ts:8`)
```typescript
getByProject: protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.projectId, input.projectId))  // ❌ Query by project
```

**Both flows are project-centric instead of URL-centric.**

## Proposed Solution

### New Schema Design

```typescript
// Global brand profiles - NO project ownership
export const sharedBrandProfiles = createTable("shared_brand_profile", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),

  // URL is the primary key concept (unique constraint)
  websiteUrl: d.text("website_url").notNull(),

  // Optional: Track who first extracted it (for credit/analytics)
  firstExtractedBy: d.varchar("first_extracted_by", { length: 255 })
    .references(() => users.id, { onDelete: "set null" }),

  // Full brand data (same structure)
  brandData: d.jsonb("brand_data").$type<BrandData>().notNull(),
  colors: d.jsonb("colors").$default(() => ({})),
  typography: d.jsonb("typography").$default(() => ({})),
  logos: d.jsonb("logos").$default(() => ({})),
  copyVoice: d.jsonb("copy_voice").$default(() => ({})),
  productNarrative: d.jsonb("product_narrative").$default(() => ({})),
  socialProof: d.jsonb("social_proof").$default(() => ({})),
  screenshots: d.jsonb("screenshots").$default(() => []),
  mediaAssets: d.jsonb("media_assets").$default(() => []),

  // Versioning for re-extraction
  extractionVersion: d.text("extraction_version").default("4.0.0"),
  extractionConfidence: d.jsonb("extraction_confidence").$default(() => ({})),

  // Analytics
  timesUsed: d.integer("times_used").default(0),
  lastUsedAt: d.timestamp("last_used_at", { withTimezone: true }),
  lastAnalyzedAt: d.timestamp("last_analyzed_at", { withTimezone: true }),

  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  // URL must be unique - this is the key insight
  uniqueIndex("shared_brand_url_unique_idx").on(t.websiteUrl),

  // Fast lookups by URL
  index("shared_brand_url_idx").on(t.websiteUrl),

  // Analytics queries
  index("shared_brand_usage_idx").on(t.timesUsed),
  index("shared_brand_last_used_idx").on(t.lastUsedAt),
]);

// Join table: Which projects use which brand profiles
export const projectBrandUsage = createTable("project_brand_usage", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  brandProfileId: d.uuid("brand_profile_id")
    .notNull()
    .references(() => sharedBrandProfiles.id, { onDelete: "cascade" }),

  // When this project started using this brand
  usedAt: d.timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  // One brand per project (if needed)
  uniqueIndex("project_brand_unique_idx").on(t.projectId, t.brandProfileId),
  index("project_brand_project_idx").on(t.projectId),
  index("project_brand_profile_idx").on(t.brandProfileId),
]);
```

### New API Flow

```typescript
// GET or CREATE brand profile by URL
getOrExtractByUrl: protectedProcedure
  .input(z.object({
    websiteUrl: z.string().url(),
    forceRefresh: z.boolean().optional()
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Check if we already have this URL
    const existing = await ctx.db
      .select()
      .from(sharedBrandProfiles)
      .where(eq(sharedBrandProfiles.websiteUrl, input.websiteUrl))
      .limit(1);

    if (existing[0] && !input.forceRefresh) {
      // Update usage analytics
      await ctx.db
        .update(sharedBrandProfiles)
        .set({
          timesUsed: existing[0].timesUsed + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(sharedBrandProfiles.id, existing[0].id));

      return existing[0]; // ✅ Instant cache hit
    }

    // 2. Extract brand data (expensive operation)
    const extractedData = await extractBrandFromUrl(input.websiteUrl);

    // 3. Save to shared table
    if (existing[0]) {
      // Update existing
      await ctx.db
        .update(sharedBrandProfiles)
        .set({
          brandData: extractedData,
          extractionVersion: "4.0.0",
          lastAnalyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sharedBrandProfiles.id, existing[0].id));
    } else {
      // Create new
      await ctx.db
        .insert(sharedBrandProfiles)
        .values({
          websiteUrl: input.websiteUrl,
          brandData: extractedData,
          firstExtractedBy: ctx.session.user.id,
          extractionVersion: "4.0.0",
          timesUsed: 1,
          lastUsedAt: new Date(),
          lastAnalyzedAt: new Date(),
        });
    }

    return extractedData;
  }),
```

## Migration Strategy

### Phase 1: Create New Tables (Safe)
```sql
-- Add new shared tables WITHOUT touching old ones
CREATE TABLE "bazaar-vid_shared_brand_profile" (...)
CREATE TABLE "bazaar-vid_project_brand_usage" (...)
```

### Phase 2: Migrate Data
```typescript
// Script to migrate existing data
// 1. Get all unique URLs from old brand_profiles
// 2. For each unique URL:
//    - Create entry in shared_brand_profiles
//    - Create entries in project_brand_usage for all projects that used it
// 3. Verify data integrity
```

### Phase 3: Update Code
```typescript
// Change all references:
// - saveBrandProfile() → saveSharedBrandProfile()
// - getByProject() → getOrExtractByUrl()
// - Remove projectId parameter from extraction functions
```

### Phase 4: Deprecate Old Tables
```sql
-- Only after verifying all systems work
-- DROP old brand_profile tables
```

## Impact Analysis

### Code Changes Required

1. **Schema** (`src/server/db/schema.ts:1660`)
   - Add new `sharedBrandProfiles` table
   - Add new `projectBrandUsage` join table

2. **API Router** (`src/server/api/routers/brandProfile.ts`)
   - Change `getByProject` → `getOrExtractByUrl`
   - Add `getAllBrands` for admin panel
   - Add `getUsageStats` for analytics

3. **Save Service** (`src/server/services/website/save-brand-profile.ts`)
   - Remove `projectId` parameter
   - Add URL uniqueness check
   - Add usage analytics updates

4. **Website Tool** (`src/tools/website/websiteToVideoHandler.ts`)
   - Update to use shared brand profiles
   - Check cache before extraction

5. **Context Builder** (`src/brain/orchestrator_functions/contextBuilder.ts`)
   - Update brand profile queries

### Benefits

✅ **Instant cache hits** for repeated URLs
✅ **Compounding value** - every extraction benefits all users
✅ **Faster testing** - no re-extraction needed
✅ **Cost savings** - 31% fewer extractions based on current data
✅ **Better data quality** - single source of truth per URL
✅ **Analytics** - track which URLs are most popular
✅ **Easy updates** - refresh brand data for all users at once

### Risks

⚠️ **Privacy**: Some users might not want to share their brand data
   - Mitigation: Make it opt-in or only share public URLs

⚠️ **Stale data**: Brands update their websites
   - Mitigation: Add `forceRefresh` option and automatic re-extraction schedule

⚠️ **Data quality**: Bad extraction affects everyone
   - Mitigation: Version tracking + admin review system

## Next Steps

1. ✅ Analysis complete
2. ⏳ Get user approval on architecture
3. ⏳ Create schema migration files
4. ⏳ Update API routers
5. ⏳ Update save services
6. ⏳ Migrate existing data
7. ⏳ Test thoroughly in dev
8. ⏳ Deploy to production

## Questions for User

1. **Privacy**: Should brand profiles be public for ALL URLs, or opt-in?
2. **Re-extraction**: How often should we refresh brand data? (weekly? monthly?)
3. **Admin controls**: Do you want ability to manually review/edit shared brands?
4. **Migration timing**: Do this before or after the 3-week launch?

---

**CRITICAL**: This is a foundational architecture change. The current project-based model is fundamentally incompatible with the vision of compounding URL dataset value.