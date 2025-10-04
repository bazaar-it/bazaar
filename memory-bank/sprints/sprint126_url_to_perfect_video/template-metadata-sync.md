# Template Metadata Sync & Story Planner Plan (2025-10-04)

## Current State
- **Static registry (`src/templates/metadata.ts`)** still lists the original ~70 hand-authored templates (WordFlip, HeroTemplate, etc.). None of the templates created in the last 72 hours show up here, so anything that depends on this file (matching, loader, prompt context) cannot discover the latest work.
- **DB templates (`bazaar-vid_templates`)** hold the live catalog. Prod now has 96 templates (dev has 7 seed rows). 90/96 are single-scene, 6/96 are multi-scene. Category spread skews toward `text` (33), `animation` (21), `UI Animation` (16), but 5 rows are still `NULL`/unassigned. 79/96 templates have empty `tags`, so matching metadata is effectively missing in the DB copy.
- **Multi-scene metadata (`src/server/services/templates/multi-scene-metadata.ts`)** carries rich beat definitions, requirements, and prompt hints. That information never lands in the database or scene props, so current-scene branding edits cant reuse it.
- **Branding pipeline** only sees generic data (colors, typography, value prop). There are no editability or slot guardrails, so LLM edits happily recolor platform shells or reuse the same headline across beats.

## Problems to Solve
- Source of truth split: new templates live in the DB, but AI matching & prompt builders read the static file.
- Missing guardrails: no place to express `lockBrandShell`, `editableTextSlots`, `allowPaletteOverride`, etc.
- No story planning: URL pipeline extracts brand data and immediately edits scenes, so value props repeat and testimonial slots go empty.
- Synchronization burden: keeping metadata manually in two places is already failing; we need generation or hydration.

## Proposed Direction

### 1. Unify Metadata Shape
- Define a canonical metadata schema that covers **matching**, **editability**, and **slot/story hints**.
- Break it into modules:
  - `matching`: keywords, user phrases, use cases, animations, styles.
  - `structure`: slot definitions per scene, required assets, beat type, suggested text lengths.
  - `editability`: lock flags (shell, palette), lists of editable text/media slots, disallowed attributes.
- Ship this schema both in code (for type safety & edge runtimes) and in DB (for authoring & admin tools).

### 2. Database Extensions
- `templates` table:
  - Add `matching_metadata JSONB` (keywords, phrases, categories, similarTo, etc.).
  - Add `editability JSONB` (lock flags, allowed slot types, palette override booleans).
  - Add `slot_plan JSONB` for single-scene templates that still need slot hints (e.g. LinkedIn post headline/body/avatar).
- `template_scene` table:
  - Add `beat_type TEXT`, `slot_schema JSONB`, `editability JSONB`, `requires JSONB`.
- Backfill existing rows by hydrating from code metadata where possible; leave placeholders flagged for completion.

### 3. Static Snapshot Generation
- Introduce `scripts/export-template-metadata.ts` that reads DB rows and outputs a generated module (`src/templates/generated-metadata.ts`).
  - Include hashes/`updatedAt` so we can fast-fail if the DB changed without regenerating.
  - Keep `src/templates/metadata.ts` as a thin loader that merges generated data with any fallback registry entries while un-migrated templates still exist.
- Wire CI/dev start scripts to run the exporter (or fetch a prebuilt artifact) so the client bundle always sees the latest catalog.

### 4. Story Planner Stage
- After `analyzeWebsiteBranding`, run `StoryPlanner.planNarrative(brandData, templateSet)`:
  - Reads scene slot metadata from DB (or generated snapshot).
  - Produces JSON plan `{ sceneId, slots: { headline, body, cta, testimonialQuote, ... } }` with diversity constraints.
  - Stores plan on the project (Zustand + DB) so later edits can reference it.
- Branding applier consumes the plan, respects editability flags, and only asks the Edit tool to touch allowed slots.

### 5. Backfill & Validation Workflow
- Build an admin checklist that surfaces templates missing `matching_metadata` or `editability`.
- Provide seed YAML/JSON configs so designers can author metadata without touching SQL.
- Add an evaluation that loads every official template, ensures the exported metadata matches DB (hash comparison), and verifies per-template guardrails (e.g., LinkedIn lock prevents palette change during simulated edit).

## Next Steps
1. Finalize canonical metadata interfaces (`matching`, `structure`, `editability`) and add TypeScript types.
2. Design Drizzle migrations for new JSONB columns (dev first, double-check destructive risk before prod).
3. Write exporter script + generated module wiring.
4. Implement story planner prototype that uses the new slot metadata for URL pipeline.
5. Update WebsiteBrandingSceneApplier to read `editability` & slot plans and adjust prompts accordingly.
6. Backfill metadata for the newest social templates (LinkedIn Post, X Post, Announcement, etc.) as proof of concept.

## Open Questions
- How do we version metadata so client bundles know when to invalidate caches? (Potential answer: embed `updated_at` + `schema_version` in the generated module.)
- Do we allow per-user overrides of template metadata (e.g. custom slots)? If so, how do we merge them with official definitions?
- Should story planner run multiple LLM passes (analysis → slot assignment → copy generation) or can we get reliable output from a single prompt with `Thought`/`Plan` sections?
- For production, do we generate the static snapshot at build time or fetch from an API endpoint at runtime to avoid bundling 96 templates worth of metadata?

