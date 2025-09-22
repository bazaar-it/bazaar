# URL Intake → Brand Theme Personalization (Analysis)

## Context
- Personalize page currently shows static sample targets; there is no way to capture real company branding without uploading CSV/JSON.
- Sprint 130 scope requires deterministic brand themes so we can generate N variants from a single mastered project.
- We already have WebAnalysisAgentV4 + brand profile helpers that scrape a website (Playwright via Browserless) and store branding in `brand_profile`.
- Preview panel now supports switching between brand themes (`BrandTheme` JSON), so we can reuse this path for ad-hoc targets if we persist their extracted data.

## Goals for this feature
1. Allow a user to paste a website URL on `/projects/[id]/personalize` and kick off brand extraction without leaving the app.
2. Persist each target (URL + extracted branding + derived `BrandTheme`) so it can be reused for preview/export and bulk runs.
3. Surface status in the Personalize UI (pending → extracting → ready/failed) and list all saved targets.
4. Pipe the extracted themes into the Generate preview brand selector so QA can switch scenes into each company palette on demand.

## Proposed Architecture

### Data Model
- New table `personalization_target`:
  - `id` (UUID PK)
  - `project_id` FK → `projects`
  - `website_url`, optional `company_name`, `contact_email`
  - `status` enum: `pending` | `extracting` | `ready` | `failed`
  - `brand_profile` JSON (Simplified brand extraction payload)
  - `brand_theme` JSON (`BrandTheme` contract used in preview renderer)
  - `error_message`, `extracted_at`, `created_at`, `updated_at`
  - Unique index on `(project_id, website_url)` to avoid duplicate entries

### Brand Extraction Flow
1. User submits URL → tRPC mutation `personalizationTargets.createFromUrl`.
2. Mutation verifies project access, inserts row with status `extracting`.
3. Run Playwright scraper (`WebAnalysisAgentV4.analyze(url)`), convert to SimplifiedBrandData (`convertV4ToSimplified`).
4. Derive `BrandTheme` via helper (`createBrandThemeFromExtraction` → uses `createBrandThemeFromProfile`).
5. Update row with theme/profile JSON + `status = 'ready'`, `company_name` (from brand identity/title) and `extracted_at` timestamp.
6. On failure, update row `status = 'failed'` + `error_message` and bubble toast to UI.

### UI Updates
- Personalize page:
  - Replace static sample list with query `personalizationTargets.list` (server component fetch).
  - Add “Add from website” form (URL input + optional name/email) in step 1 card.
  - Table shows status badge with extraction progress; on success row highlights (e.g. green/“ready”).
  - Keep sample dataset download CTA for CSV ingest placeholder.
- Generate preview (`PreviewPanelG`):
  - Query new target list via `api.personalizationTargets.list.useQuery`.
  - Populate brand selector with `[Default, …targets]`, using stored `brandTheme`.
  - Reset button still returns to default theme.

### Supporting Helpers
- `createBrandThemeFromExtraction(simplifiedBrandData)` converts scraped colors/fonts to `BrandTheme`:
  - Colors: primary/secondary from scrape, background/text fallback to neutrals/dark.
  - Accents: palette slice (max 4), fallback to accent/primary.
  - Fonts: heading = typography.headings[0] or primary fallback; body = typography.body[0]. Provide weights `[400,500]` and `[600,700]` defaults.
  - Logo: attempt to map from extraction (hero screenshot or placeholder if none).
- Optional heuristics: infer sector by keywords? (Not MVP—display “pending/ready” without sector change.)

### API Surface
- `personalizationTargets.list` (query by project, returns rows sorted newest → oldest).
- `personalizationTargets.createFromUrl` (mutation described above).
- Future: `delete`/`retry` endpoints when the workflow expands.

## Edge Cases & Considerations
- Browserless connectivity failures → return `failed` status with message; leave existing row for retry.
- Duplicate URL submissions → update existing row (set status back to `extracting` before re-running) rather than inserting duplicates.
- Browserless credentials required (`BROWSERLESS_URL`) — ensure error message clarifies if missing.
- Brand extraction may take ~20s; mutation runs synchronously for now (UI shows loading). If this becomes an issue we can offload to background worker.
- Logo extraction is best-effort (scraper primarily captures colors/fonts); we’ll fallback to hero screenshot or leave asset empty.

## Implementation Checklist
1. Add Drizzle schema + migration for `personalization_target` table.
2. Implement helper to map SimplifiedBrandData → `BrandTheme`.
3. Create tRPC router (`personalizationTargetRouter`) with `list` + `createFromUrl`.
4. Update Personalize server page + client component to fetch and display new targets, add URL form, refresh after mutation.
5. Update Preview panel to pull real targets into brand selector.
6. Document behaviour & add progress note to Sprint 130 log.
