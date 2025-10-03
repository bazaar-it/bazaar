# Plan Comparison: My Analysis vs Alternative Proposal

**Date**: 2025-09-30
**Context**: Reviewing two approaches to shared brand dataset architecture

## Summary

Both plans **agree on the core problem** and **converge on the same solution**, but the alternative plan has:
- ✅ **Better research** (found 3 tables I missed)
- ✅ **More practical details** (URL normalization, TTL, quality tracking)
- ✅ **Clearer migration path** (backfill strategy)

**Recommendation**: **Adopt the alternative plan** with minor enhancements from my analysis.

---

## Side-by-Side Comparison

### Problem Diagnosis

| My Analysis | Alternative Plan | Winner |
|------------|------------------|---------|
| Found `brand_profile` tied to `projectId` in dev | Found `brand_profile` + `brand_extraction` + `extraction_cache` + `personalization_target` | ✅ **Alternative** (more complete) |
| Noticed 31% waste (19 profiles, 13 URLs) | Found 4x duplication of ramp.com, screenshot URLs treated as websites | ✅ **Alternative** (specific examples) |
| Identified prod has no brand tables | Confirmed prod only has `personalization_target` with project-scoped uniqueness | ✅ **Tie** (same finding) |

### Root Cause Analysis

| My Analysis | Alternative Plan |
|------------|------------------|
| `projectId` foreign key NOT NULL creates isolation | ✅ Same |
| Missing URL uniqueness constraint | ✅ Same + **added**: No URL normalization (www/protocol/trailing slash) |
| - | ✅ **Added**: Empty `extraction_cache` has no dedupe guarantee |
| - | ✅ **Added**: Screenshot URLs (R2 assets) treated as websites |

**Winner**: ✅ **Alternative** - Identified normalization gap and asset URL pollution

### Proposed Schema

#### Shared Brand Repository

**My Proposal**:
```typescript
sharedBrandProfiles {
  id: uuid
  websiteUrl: text UNIQUE ✅
  firstExtractedBy: user_id (optional)
  brandData: jsonb
  timesUsed: integer
  lastUsedAt: timestamp
  extractionVersion: text
}
```

**Alternative Proposal**:
```typescript
brand_repository (or repurposed brand_profile) {
  id: uuid
  normalized_url: text UNIQUE ✅  // Better: explicit normalization
  last_extracted_by: user_id (optional)
  latest_extraction_id: uuid      // Links to full extraction record
  // Aggregate data:
  screenshots: jsonb
  palette: jsonb
  copy: jsonb
  usage_count: integer
  // Quality tracking:
  confidence_score: float
  review_status: enum             // human-reviewed vs automated
  last_used: timestamp
  ttl: timestamp                  // Freshness window
}
```

**Comparison**:
- ✅ **Alternative adds**: `normalized_url` (explicit), `latest_extraction_id` (traceability), `confidence_score`, `review_status`, `ttl`
- ✅ **My addition**: `firstExtractedBy` (credit tracking)

**Winner**: ✅ **Alternative** (more practical metadata)

#### Join Table

**Both plans agree**:
```typescript
project_brand_profile {  // or project_brand_usage
  project_id → brand_repository.id
  used_at: timestamp
}
```

**Winner**: ✅ **Tie**

### URL Normalization

| My Analysis | Alternative Plan |
|------------|------------------|
| Not mentioned | ✅ **Preprocessing step**: trim protocol, remove trailing slash, collapse www, filter asset URLs |
| - | ✅ **Gating**: prevent R2 URLs from being treated as websites |

**Winner**: ✅ **Alternative** (critical missing piece in my plan)

### Extraction Cache Strategy

| My Analysis | Alternative Plan |
|------------|------------------|
| Not analyzed | ✅ **Enforce uniqueness** on `url_hash` or `normalized_url` |
| - | ✅ **TTL-based reuse**: store raw scrape artifacts with freshness window |
| - | ✅ **Separate cache from repository**: cache = raw scrape, repository = processed brand data |

**Winner**: ✅ **Alternative** (I completely missed the extraction cache layer)

### Migration Strategy

#### My Plan:
```
Phase 1: Create new tables
Phase 2: Migrate data (dedupe URLs)
Phase 3: Update code
Phase 4: Deprecate old tables
```

#### Alternative Plan:
```
1. Dedupe existing dev rows by domain (keep freshest)
2. Migrate survivors into shared table
3. Ship missing Sprint 99.5 migration to prod with seed data
4. Backfill with curated targets
```

**Comparison**:
- ✅ **Alternative**: More specific about "keep freshest" strategy
- ✅ **Alternative**: Recognizes Sprint 99.5 drift issue
- ✅ **Alternative**: Includes "curated targets" for initial prod seed
- ✅ **My plan**: Clearer phase separation

**Winner**: ✅ **Alternative** (more actionable)

### Quality & Lifecycle Tracking

| My Analysis | Alternative Plan |
|------------|------------------|
| `timesUsed`, `lastUsedAt` | ✅ Same + `confidence_score`, `review_status`, `ttl` |
| `extractionVersion` | ✅ Same + `latest_extraction_id` for full audit trail |

**Winner**: ✅ **Alternative** (better quality controls)

---

## What the Alternative Plan Got Right (That I Missed)

### 1. **URL Normalization is Critical** 🔥
```typescript
// Without normalization, these are all different:
"https://github.com"
"https://www.github.com"
"https://github.com/"
"http://github.com"

// Cache hit rate stays near zero ❌
```

### 2. **Asset URL Gating** 🔥
```typescript
// Currently treated as "websites":
"https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/.../image.png"

// This pollutes the brand dataset with screenshot metadata ❌
```

### 3. **Extraction Cache ≠ Brand Repository** 🔥
```
extraction_cache:     // Raw scrape artifacts (HTML, screenshots, colors)
  ↓ Processing
brand_repository:     // Structured brand data (palette, typography, voice)
```

I conflated these two layers in my proposal.

### 4. **TTL & Freshness Window**
```typescript
// Brands update their websites
ttl: timestamp  // Re-extract after 30 days
last_extracted: timestamp
```

This prevents stale data without manual intervention.

### 5. **Quality Metadata**
```typescript
confidence_score: float  // AI extraction confidence
review_status: enum      // 'automated' | 'human-reviewed' | 'curated'
```

Enables preferring high-quality extractions when multiple exist.

---

## What My Analysis Got Right (To Keep)

### 1. **Usage Analytics**
```typescript
timesUsed: integer       // Track popularity
lastUsedAt: timestamp    // Identify stale/unused brands
```

Good for cache eviction and prioritizing re-extraction.

### 2. **Credit Tracking**
```typescript
firstExtractedBy: user_id  // Who contributed this brand
```

Nice for gamification or contributor credits.

### 3. **Clearer Impact Analysis**
- Specific waste calculation (31%)
- Cost savings projection
- Testing velocity improvement

### 4. **User-Facing Questions**
- Privacy concerns (opt-in vs public)
- Re-extraction frequency
- Admin controls

---

## Unified Recommendation

### Final Schema (Best of Both)

```typescript
// Canonical brand repository
export const brandRepository = createTable("brand_repository", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),

  // Normalized URL as primary key concept
  normalizedUrl: d.text("normalized_url").notNull(),  // ✅ From alternative
  originalUrl: d.text("original_url").notNull(),      // Keep for display

  // Traceability
  firstExtractedBy: d.varchar("first_extracted_by", { length: 255 })
    .references(() => users.id, { onDelete: "set null" }),  // ✅ From my plan
  latestExtractionId: d.uuid("latest_extraction_id")
    .references(() => brandExtractions.id),                 // ✅ From alternative

  // Brand data (aggregate from extractions)
  brandData: d.jsonb("brand_data").notNull(),
  colors: d.jsonb("colors").$default(() => ({})),
  typography: d.jsonb("typography").$default(() => ({})),
  logos: d.jsonb("logos").$default(() => ({})),
  copyVoice: d.jsonb("copy_voice").$default(() => ({})),
  productNarrative: d.jsonb("product_narrative").$default(() => ({})),
  socialProof: d.jsonb("social_proof").$default(() => ({})),
  screenshots: d.jsonb("screenshots").$default(() => []),
  mediaAssets: d.jsonb("media_assets").$default(() => []),

  // Quality tracking
  confidenceScore: d.real("confidence_score").default(0.95),      // ✅ From alternative
  reviewStatus: d.text("review_status").default("automated"),     // ✅ From alternative
  extractionVersion: d.text("extraction_version").default("4.0.0"),

  // Lifecycle tracking
  usageCount: d.integer("usage_count").default(0),               // ✅ From my plan
  lastUsedAt: d.timestamp("last_used_at", { withTimezone: true }),
  lastExtractedAt: d.timestamp("last_extracted_at", { withTimezone: true }),
  ttl: d.timestamp("ttl", { withTimezone: true }),               // ✅ From alternative

  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("brand_repo_url_unique_idx").on(t.normalizedUrl),  // ✅ Critical
  index("brand_repo_url_idx").on(t.normalizedUrl),
  index("brand_repo_usage_idx").on(t.usageCount),
  index("brand_repo_quality_idx").on(t.reviewStatus, t.confidenceScore),
  index("brand_repo_ttl_idx").on(t.ttl),
]);

// Project → Brand linkage (many-to-many)
export const projectBrandUsage = createTable("project_brand_usage", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  brandRepositoryId: d.uuid("brand_repository_id")
    .notNull()
    .references(() => brandRepository.id, { onDelete: "cascade" }),
  usedAt: d.timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("project_brand_unique_idx").on(t.projectId, t.brandRepositoryId),
  index("project_brand_project_idx").on(t.projectId),
  index("project_brand_repo_idx").on(t.brandRepositoryId),
]);

// Raw extraction cache (separate from processed brand data)
export const brandExtractionCache = createTable("brand_extraction_cache", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  normalizedUrl: d.text("normalized_url").notNull(),  // ✅ Match repository key

  // Raw scrape artifacts
  rawHtml: d.text("raw_html"),
  screenshotUrls: d.jsonb("screenshot_urls").$default(() => []),
  colorSwatches: d.jsonb("color_swatches").$default(() => []),

  // Cache metadata
  cacheKey: d.text("cache_key").notNull(),
  ttl: d.timestamp("ttl", { withTimezone: true }).notNull(),  // Freshness window
  extractedAt: d.timestamp("extracted_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("brand_cache_url_unique_idx").on(t.normalizedUrl),  // ✅ Dedupe guarantee
  uniqueIndex("brand_cache_key_unique_idx").on(t.cacheKey),
  index("brand_cache_ttl_idx").on(t.ttl),
]);
```

### URL Normalizer Function

```typescript
/**
 * Normalize URL for consistent lookups and deduplication
 * Based on alternative plan's preprocessing requirements
 */
export function normalizeUrl(url: string): string | null {
  try {
    // 1. Filter asset URLs (R2, S3, image CDNs)
    if (isAssetUrl(url)) {
      console.warn(`[normalizeUrl] Rejecting asset URL: ${url}`);
      return null;
    }

    const parsed = new URL(url);

    // 2. Normalize protocol (always https)
    parsed.protocol = 'https:';

    // 3. Remove www prefix
    parsed.hostname = parsed.hostname.replace(/^www\./, '');

    // 4. Remove trailing slash
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';

    // 5. Remove query params and hash (optional - decide based on use case)
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString();
  } catch (error) {
    console.error(`[normalizeUrl] Invalid URL: ${url}`, error);
    return null;
  }
}

function isAssetUrl(url: string): boolean {
  const assetPatterns = [
    /\.r2\.dev\//,                    // Cloudflare R2
    /\.s3\.amazonaws\.com\//,         // AWS S3
    /\.(png|jpg|jpeg|gif|svg|webp)$/i, // Image extensions
    /\/images\//,                     // Common image paths
    /\/assets\//,
    /\/media\//,
  ];

  return assetPatterns.some(pattern => pattern.test(url));
}
```

### Migration Steps (Unified)

#### Step 1: Create Tables in Dev
```sql
-- New tables (don't touch existing ones yet)
CREATE TABLE "bazaar-vid_brand_repository" (...);
CREATE TABLE "bazaar-vid_project_brand_usage" (...);
UPDATE TABLE "bazaar-vid_extraction_cache" ADD UNIQUE (normalized_url);
```

#### Step 2: Backfill from Existing Data
```typescript
// Migration script
async function migrateExistingBrands() {
  // 1. Get all brand_profile rows
  const allProfiles = await db.select().from(brandProfiles);

  // 2. Group by normalized URL
  const byNormalizedUrl = new Map<string, typeof allProfiles>();
  for (const profile of allProfiles) {
    const normalized = normalizeUrl(profile.websiteUrl);
    if (!normalized) continue; // Skip asset URLs

    if (!byNormalizedUrl.has(normalized)) {
      byNormalizedUrl.set(normalized, []);
    }
    byNormalizedUrl.get(normalized)!.push(profile);
  }

  // 3. For each unique URL, pick the freshest profile
  for (const [normalizedUrl, profiles] of byNormalizedUrl) {
    const freshest = profiles.sort((a, b) =>
      b.lastAnalyzedAt.getTime() - a.lastAnalyzedAt.getTime()
    )[0];

    // 4. Insert into brand_repository
    const [newBrand] = await db.insert(brandRepository).values({
      normalizedUrl,
      originalUrl: freshest.websiteUrl,
      brandData: freshest.brandData,
      // ... copy all fields
      firstExtractedBy: freshest.projectId, // Track origin
      usageCount: profiles.length,          // How many projects used it
    }).returning();

    // 5. Create linkage for ALL projects that used this URL
    for (const profile of profiles) {
      await db.insert(projectBrandUsage).values({
        projectId: profile.projectId,
        brandRepositoryId: newBrand.id,
      });
    }
  }
}
```

#### Step 3: Update Code to Use New Tables
```typescript
// Update all services to use brandRepository instead of brandProfiles
// Update API routers to query by normalizedUrl
```

#### Step 4: Ship to Production
```sql
-- Production migration (creates tables + seeds from curated list)
-- Include deduplicated data from dev as seed
```

#### Step 5: Deprecate Old Tables
```sql
-- Only after full validation
DROP TABLE "bazaar-vid_brand_profile";
DROP TABLE "bazaar-vid_brand_extraction";
```

---

## Open Questions from Alternative Plan

### 1. Multiple variants per domain?
**Question**: Do we store light/dark mode variants separately?

**Answer**:
- Initial: Single brand profile per URL (use latest extraction)
- Future: Add `variant` field if needed (e.g., "light", "dark", "mobile")

### 2. Screenshot retention policy?
**Question**: What happens to R2 screenshots after caching?

**Answer**:
- Keep screenshots in `mediaAssets` array
- Add TTL-based cleanup job for unused screenshots (>90 days)
- Admin panel to manually curate important brands

### 3. Confidence/quality exposure?
**Question**: How do we prefer human-reviewed brands?

**Answer**:
```typescript
// Query prioritization
SELECT * FROM brand_repository
WHERE normalized_url = $1
ORDER BY
  CASE review_status
    WHEN 'curated' THEN 1
    WHEN 'human-reviewed' THEN 2
    WHEN 'automated' THEN 3
  END,
  confidence_score DESC,
  last_extracted_at DESC
LIMIT 1;
```

---

## Final Verdict

### Adopt Alternative Plan With Enhancements

**From Alternative**:
- ✅ URL normalization + asset gating
- ✅ Separation of extraction cache and brand repository
- ✅ TTL and freshness tracking
- ✅ Quality metadata (confidence, review status)
- ✅ Backfill strategy (dedupe + keep freshest)

**Add From My Plan**:
- ✅ `firstExtractedBy` for contributor tracking
- ✅ `usageCount` for analytics
- ✅ Clear impact metrics (31% waste reduction)
- ✅ User-facing questions (privacy, refresh policy)

**Result**: **Unified schema and migration plan above** ☝️

---

## Next Actions

1. ✅ **Get user approval** on unified plan
2. ⏳ **Implement URL normalizer** with tests
3. ⏳ **Create schema migration files** (dev first)
4. ⏳ **Write backfill script** with dry-run mode
5. ⏳ **Update API routers** to use new tables
6. ⏳ **Update services** (save-brand-profile.ts, etc.)
7. ⏳ **Test in dev** with real URLs
8. ⏳ **Ship to production** with Sprint 99.5 migration