# Bulk Brand Customization Workflow (n8n + Bazaar services)

## Objective
Automate mass-personalized Remotion exports from a single master project by ingesting ~200 company homepages, extracting each brand’s visual DNA, and re-theming the video scenes to match their palettes, typography, and logos before rendering.

## High-Level Flow
```
Input CSV / Google Sheet
├── baseProjectId (Remotion template)
├── renderProfile ( format / fps / duration )
└── targets[] { companyName, websiteUrl, contactEmail }

n8n Workflow (bulk-brand-customize)
├── 0. Fetch master project + scenes
├── 1. Iterate targets (SplitInBatches, size=5)
│   ├── 1a. Ensure brand profile (call /api/website/extractBrandProfile)
│   ├── 1b. Store brand JSON → R2 `brand-profiles/{targetId}.json`
│   ├── 1c. Invoke BulkBrandRenderer service
│   │       ▸ clone master scenes
│   │       ▸ apply brand tokens (colors, fonts, logos)
│   │       ▸ persist new project → `projects` + `scenes`
│   ├── 1d. Queue render (POST /api/render/queue)
│   └── 1e. Append job metadata to running report (Sheets + Postgres)
├── 2. Wait for render webhooks (/render/callback)
└── 3. Email / Slack digest with per-company status + links
```

## Required Bazaar Services

### 1. Brand Profile API (already present)
- `POST /api/website/extractBrandProfile` → returns `brand_profile.id`
- Ensure endpoint accepts admin credentials + bypass project ownership check when invoked with service token.
- Output JSON matches `brandProfiles.brandData` schema (colors, typography, logos, etc.).

### 2. Bulk Brand Renderer (new service)
Create `src/server/services/automation/bulkBrandRenderer.ts`:
```ts
interface BulkBrandRenderJob {
  masterProjectId: string;
  targetCompany: {
    name: string;
    website: string;
    brandProfileId: string;
  };
  outputProjectSlug: string; // e.g. `${master.slug}-${slugify(company)}`
  overrides?: {
    customCopy?: Record<string, string>;
    additionalAssets?: string[];
  };
}
```
Responsibilities:
1. Fetch master project + ordered scenes (`tsxCode` or compiled `jsCode`).
2. Load brand profile JSON + logos from R2.
3. Run `BrandFormatter` to map profile into template tokens:
   ```ts
   const theme = brandFormatter.format(profile.brandData);
   ```
4. Pass theme + scenes into `TemplateCustomizer` (extend to accept arbitrary scenes, not only website pipeline).
5. Persist new project (cloned metadata) + updated scenes (`order`, `duration`, `jsCode`).
6. Return `newProjectId` and `renderId` (if render queued).

Expose as tRPC mutation for internal calls:
`POST /api/automation/bulk-brand-render` with body `{ masterProjectId, companyName, websiteUrl }`.

### 3. Render Queue Integration
Reuse existing `RenderService.queueProjectRender(projectId, options)`.
- Accept `renderMode` (lambda), `quality`, `format`.
- Attach custom metadata: `{ source: 'bulk-brand', masterProjectId, companyName }`.

### 4. Status Webhook (optional)
- On render completion, call n8n webhook with payload containing `{ companyName, outputUrl, status, duration, thumbnails }` to update sheet/email.

## n8n Workflow Design

### Nodes Overview
1. **Webhook / Manual Trigger** – payload includes base project + list of targets.
2. **Function: Normalize Targets** – parse CSV/Google Sheet rows.
3. **Split In Batches (5)** – small concurrency to respect rate limits.
4. **HTTP Node: Ensure Brand Profile** – POST to `/api/website/extractBrandProfile`:
   ```json
   {
     "url": "https://acme.com",
     "projectId": "${masterProjectId}"
   }
   ```
   Response → `brandProfileId`.
5. **HTTP Node: BulkBrandRenderer** – body `{ masterProjectId, companyName, websiteUrl, brandProfileId }`.
6. **HTTP Node: Queue Render** – `POST /api/render/queue` with returned `newProjectId`.
7. **Set Node: Collect Progress** – push job record into running array.
8. **Write to Google Sheet / Postgres** – store job metadata.
9. **After Loop: Send Summary Email/Slack** – include counts + links.
10. **Wait for Render Callbacks** – optional: separate workflow listening on webhook for completion.

### Credential Strategy
- Use service account API key stored in n8n credentials (Basic Auth or Bearer token).
- For website scraping, `EnhancedWebAnalyzer` handles fetch; ensure concurrency limit (<=3 parallel) to avoid rate limiting.

## Brand JSON Schema
Re-use `brandProfiles.brandData` structure. Example stored in R2 per company:
```json
{
  "colors": {
    "primary": "#1F4FFF",
    "secondary": "#101828",
    "accents": ["#38B6FF", "#FDB022"],
    "neutrals": ["#FFFFFF", "#F2F4F7", "#101828"],
    "gradients": []
  },
  "typography": {
    "fonts": [
      { "family": "Inter", "weights": [400, 600], "fallback": "-apple-system" },
      { "family": "Space Grotesk", "weights": [500] }
    ],
    "scale": { "h1": 56, "h2": 42, "body": 18 }
  },
  "logo": {
    "light": "https://cdn.bazaar.it/brands/acme/light.svg",
    "dark": "https://cdn.bazaar.it/brands/acme/dark.svg"
  },
  "iconography": {
    "style": "line",
    "detectedIcons": ["mdi:chart-line", "mdi:shield-check"]
  },
  "imageryStyle": ["high-contrast", "soft-gradients"],
  "backgroundEffects": ["diagonal-gradient", "grid-overlay"]
}
```

## Scene Customization Strategy
- Extend `TemplateCustomizer.customizeTemplates` to accept existing scene code:
  ```ts
  customizeScenes({
    scenes,
    brandTheme,
    replace: {
      colors: true,
      typography: true,
      logos: true,
      iconStyle: true,
      backgrounds: true,
    }
  });
  ```
- Use deterministic tokens in master template (e.g. `--brand-primary`, `--brand-font-heading`). Customizer replaces tokens with brand values.
- For logos, ensure fallback if brand profile lacks vector asset.
- Maintain timeline durations; only adjust styles.

## Scaling & Rate Limits
- Brand extraction (EnhancedWebAnalyzer + LLM) ~3-4 requests/site. Set n8n batch size 5, delay 15s between batches (n8n Wait node) to stay under provider rate limits.
- Rendering 200 projects → queue to Remotion Lambda; enforce max 10 concurrent exports (use internal rate limiter or n8n gating).
- Storage: store brand JSON + logos in R2 under `brand-profiles/{companySlug}/` for future reuse.

## Failure Handling
- If brand extraction fails → log and continue; mark job as `brand_failed`. Optionally retry with fallback LLM prompt using screenshot only.
- If customization fails → store scene diff + error in `automation_run_logs` table.
- If render fails → rely on existing export tracking; requeue after investigation.

## Deliverables
1. `bulk-brand-customize` n8n workflow (import JSON) pointing to Bazaar API endpoints.
2. New tRPC mutation + service (`BulkBrandRenderer`) for cloning & theming scenes.
3. Documentation updates: `memory-bank/sprints/sprint108_one_last_export/progress.md` + runbook.
4. Optional: command-line runner `scripts/bulk-brand-runner.ts` for local dry runs.

## Open Questions
- Should the customized projects live under the same user or a service user? (Recommend dedicated `automation@bazaar.it` account.)
- Do we need per-company copy variation (CTAs)? If yes, extend input sheet with overrides.
- Should we auto-email the resulting video to each company contact? (Add optional mailing step after render completion.)

