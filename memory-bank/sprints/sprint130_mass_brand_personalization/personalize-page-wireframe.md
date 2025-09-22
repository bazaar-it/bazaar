# `/projects/[id]/personalize` Wireframe (Sprint 130)

## High-Level Layout
```
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│  < Back to editor   |  Project: SaaS Demo  |  Variant capacity│
├──────────────────────────────────────────────────────────────┤
│ Hero Summary                                                 │
│ ┌───────────────┐  ┌──────────────────────────────────────┐  │
│ │ Preview GIF   │  │ Master video stats                   │  │
│ │  (160x120)    │  │ - Duration: 02:00                    │  │
│ │               │  │ - Scenes tokenized: ✓                │  │
│ └───────────────┘  │ - Last updated: 2025-09-18           │  │
│                    │ - Export template: Lambda MP4        │  │
│                    └──────────────────────────────────────┘  │
│                    ┌──────────────────────────────────────┐  │
│                    │ [Convert scenes automatically] button │  │
│                    │ triggers brand tokenization mutation  │  │
│                    └──────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ Step Tabs                                                    │
│ [1. Upload targets] [2. Review & enrich] [3. Launch batch]   │
├──────────────────────────────────────────────────────────────┤
│ Content Area (changes per step)                              │
│                                                              │
│ Step 1 — Upload                                               │
│  - CSV drag/drop zone (schema hint + sample download)        │
│  - Manual add row button                                     │
│  - Dataset preview: first 5 rows with validation chips       │
│                                                              │
│ Step 2 — Review                                               │
│  Left column: table of targets (company, website, sector,    │
│  status, last scrape).                                       │
│  Right column: Brand detail drawer (color swatches, fonts,   │
│  logo thumbnails, copy overrides).                           │
│  Actions per row: "Rescrape", "Edit tokens", "Remove".      │
│                                                              │
│ Step 3 — Launch                                               │
│  Batch summary card: total targets, estimated render time,   │
│  credit cost.                                                │
│  Rate limit selector (max concurrent exports).               │
│  CTA button: "Start personalization".                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Batch Progress Timeline                                      │
│  - Real-time log stream (n8n/worker events)                  │
│  - Status filters (All / In progress / Completed / Failed)   │
│  - Batch metadata: started at, started by, webhook URL       │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                       │
│  - Export all MP4s (zip)                                     │
│  - Download CSV report                                       │
│  - Link to documentation                                     │
└──────────────────────────────────────────────────────────────┘
```

## Key Components
- **UploadDropzone**: accepts CSV/JSON, validates schema, dedupes by `websiteUrl`.
- **TargetTable**: virtualized table with row-level actions, color chips, variant count.
- **BrandInspectorPanel**: side drawer showing theme tokens + quick edit form.
- **BatchSummaryCard**: displays counts, estimated duration, credit usage.
- **ProgressStream**: timeline fed by SSE/worker events (`queued`, `scraped`, `rendering`, `completed`, `failed`).

## Data Requirements
- Master project metadata API: `GET /api/projects/{id}/personalize-summary` (duration, tokenization status, preview URL).
- Target dataset API: permits CRUD on `bulk_personalization_targets` before launch.
- Batch API: create batch, poll status, list exports.

## Navigation Entry
- Add button `Personalize for clients` in workspace header → `router.push('/projects/[id]/personalize')`.
- Show badge if previous batches exist (`n variants delivered`).

## UX Notes
- Emphasize that scenes must be tokenized; show warning if lint check fails.
- Provide sandbox mode for 3 targets before unlocking large batches.
- Display per-target download links once exports finish + option to email prospects (future).
- All actions auditable; log who launched batch and when.
