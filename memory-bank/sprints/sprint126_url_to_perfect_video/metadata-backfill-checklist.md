# Template Metadata Backfill – Manual Process

**Date:** 2025-10-04  
**Owner:** Bazaar AI Templates Squad  
**Context:** Database now stores all new templates, but detailed matching/editability metadata only exists in scattered legacy files or not at all. This checklist documents the manual review required to backfill accurate metadata for every template before we automate guardrails and story planning.

---

## 1. Goals
- Move from the legacy static registry to DB-backed metadata without losing descriptive richness.
- Capture *structured* fields for matching (keywords, phrases), structure (slot schemas, required assets), and editability (lock flags, palette overrides).
- Ensure multi-scene templates and single-scene social shells receive consistent guardrails so URL branding/edit flows cannot break layouts.

## 2. Inputs & References
- **Database:** `bazaar-vid_templates`, `bazaar-vid_template_scene` (prod contains 96 templates).
- **Source code:** `src/templates/*.tsx`, `src/templates/compiled-templates.ts` (for runtime-compiled scenes).
- **Legacy metadata:** `src/templates/metadata.ts` and sprint doc `memory-bank/sprints/sprint126_url_to_perfect_video/metdata.ts` (good reference for desired vocabulary).
- **Existing hints:** `editPromptHints` inside `src/server/services/templates/multi-scene-metadata.ts` (useful for narrative tone, but not yet structured).

## 3. Canonical Fields to Capture
For every *template* (single or multi-scene):
- `matchingMetadata`
  - `keywords[]`, `userPhrases[]`, `categories[]`, `styles[]`, `animations[]`, `elements[]`, `useCases[]`
  - Optional `similarTo[]`, `complexity`, `primaryUse`
- `editability`
  - `lockBrandShell?: boolean`
  - `allowPaletteOverride?: boolean`
  - `editableTextSlots[]`, `editableMediaSlots[]`
  - `disallowedAttributes[]` (e.g., `logoColor`, `platformBadge`)
  - `requiresExactAssets?: string[]` (icon packs, platform logos)
- `slotPlan` (for single-scene shells that still need slot hints)
  - `slots[{ id, kind (headline|body|cta|metric|avatar|media), maxChars, required }]`
  - `layoutNotes` (one-liner describing structure)

For every *scene* inside a multi-scene template:
- `beatType`
- `requires`
  - `text[]`, `colors[]`, `images[]`, `metrics[]`
- `slotSchema`
  - same structure as `slotPlan`, but scoped to the scene
- `editability`
  - overrides (e.g., `allowPaletteOverride: false` for LinkedIn shell)
  - `transitionLock?: boolean` if motion timings must remain untouched

## 4. Manual Review Workflow
1. **Enumerate targets**
   - Export `SELECT id, name, scene_count, tags FROM "bazaar-vid_templates" ORDER BY created_at DESC;`
   - Flag rows missing tags/categories or newly added (past 30 days).
2. **Inspect source code**
   - Locate the TSX file (by name or `template_scene.tsx_code`).
   - Note layout structure, hard-coded colors, assets, slot usage (headline/body/etc.).
3. **Determine guardrails**
   - Ask: what visual elements must never change? (platform chrome, mascots, logos)
   - Identify which text/media elements are intended for updates.
   - Record palette rules (e.g., gradient background must stay, text may adopt brand colors).
4. **Author metadata entry**
   - Populate a working JSON snippet following the canonical schema.
   - Include reasoning comments when the decision is not obvious (keep alongside doc for review).
5. **Review & QA**
   - Peer-review each metadata block (two-person rule for flagship templates).
   - Validate against rendered scene—ensure editability flags align with real component props.
6. **Ready for import**
   - Store approved snippets in `memory-bank/sprints/sprint126_url_to_perfect_video/backfill-drafts/` (git-tracked).
   - Once migrations land, run an import script to push JSONB fields into DB.

## 5. Prioritization Queue (Prod 2025-10-04)
1. **Platform shells** – `Linkedin Post`, `X Post Animation`, `Announcement`, `Instagram Story` variants.
2. **URL multi-scene sets** – `OrbitFlow 4-scene Launch`, `Rivian Order Confirmation`, `revolut` (9-scene).
3. **High-usage hero scenes** – `Google AI Search`, `Search box animation`, `Logo slide & scale`.
4. **Remaining single-scene templates** – grouped by category (`text`, `UI Animation`, `animation`).

## 6. Review Checklist (per template)
- [ ] DB record has non-empty `tags`, `category`, `supported_formats`.
- [ ] `matchingMetadata.keywords` covers component nouns & verbs.
- [ ] `editability.lockBrandShell` set for any platform-specific UI.
- [ ] Slot schema enumerates every editable text/media surface.
- [ ] Durations/preview frames verified against TSX constants.
- [ ] Multi-scene: each scene’s `beatType` and `requires` align with narrative plan.
- [ ] Companion doc links to reference screenshots or Loom, if available.

## 7. Tooling Support (to build after manual pass)
- `scripts/export-template-metadata.ts` – pulls DB rows + JSONB fields and writes `src/templates/generated-metadata.ts` with hash/version.
- `scripts/validate-template-metadata.ts` – ensures every official template has the required fields and editability flags before deployment.
- Admin dashboard checklist highlighting templates missing metadata blocks.

## 8. Open Questions
- Do we treat compiled templates without source TSX differently? (Need to decompile or locate original project.)
- Should we capture motion timing ranges (min/max) to guard against LLM altering keyframe counts?
- How do we version metadata so exported snapshot stays in sync across environments?

---

**Next Action:** Begin with Platform Shell batch (LinkedIn/X/Announcement). For each, create a backfill draft file under `memory-bank/sprints/sprint126_url_to_perfect_video/backfill-drafts/` with the JSON structure above, then schedule a review before import.
