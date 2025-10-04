# 2025-10-04 — URL-to-Video modal: apply branding to existing scenes

## Goal
Let admins run the URL branding flow against the *current project* instead of always generating a new multi‑scene template. Same brand extraction, but the LLM should edit selected scenes in place (using the Edit tool) with the extracted palette/fonts/images.

## Context & Constraints
- Current modal only has one flow: URL → generate multi-scene template via `WebsiteToVideoHandler`.
- Admins need a tab switcher: "Generate new video" (existing behaviour) vs "Apply to current scenes".
- Scene selection UI must support multi-select; default to all scenes or none? (lean toward explicit selection).
- The edit path should reuse existing auto-save pipeline: compile, update DB, push iterations, stream progress.
- Need to avoid duplicating website extraction logic; share between generate + edit paths.
- SSE endpoint already handles `websiteUrl` branch; extend to distinguish mode and stream progress per edited scene.
- URL analysis should still persist personalization target + brand profile for future polling.
- Non-admins must never see the modal at all (already gated by sidebar); reiterate to avoid regressions.

## High-Level Flow (new tab)
1. Admin opens modal → chooses "Current scenes" tab.
2. Inputs: URL (required), optional text (problem / differentiators), optional attachments (defer), multi-select scenes.
3. Submit → SSE `generate` request includes `mode=current-scenes` + `sceneIds=[...]` + same url/userInputs.
4. SSE route extracts brand (shared helper) and iterates selected scenes:
   - Build prompt: "Apply ${domain} brand colors/fonts/etc" + optional text.
   - Call Edit tool for each scene via existing helper; wrap in DB transaction per scene.
   - Stream progress events (`scene_updated` etc) so UI mirrors multi-scene flow.
5. On success, assistant summary and progress copy should reflect edits not new scenes.

## Open Questions
- Should we allow audio updates (AddAudioTool) on current scenes? Probably skip for v1.
- Do we update personalization_target entry per URL even when editing? Lean yes for parity.
- Need fallback when no scenes selected (disable submit).
- Do we need to capture undo seeds / iterations? Use existing logging (sceneIterations & revision increments).

## Implementation Sketch
- Refactor brand extraction from `WebsiteToVideoHandler` into shared service returning `{websiteData, brandStyle, screenshots, savedTarget}`.
- New service `WebsiteBrandingSceneApplier.apply(...)`:
  - Accepts projectId, userId, url, sceneIds, optional userInputs, streaming callback.
  - Uses shared extraction (with caching) and loops through scenes → builds `BrainDecision` for `editScene` or direct helper invocation (reuse `executeToolFromDecision`).
  - Compose `userPrompt` referencing brand style (color hexes, fonts) + optional text.
  - Build `webContext` struct (desktop/mobile screenshot URLs, headings, etc) for Edit tool.
  - Stream progress after each edit.
- Update SSE route to inspect new `mode` param, call appropriate handler, send new event types (`scene_edited`?).
- Extend modal UI: `Tabs` component, new form section for scene list (checkbox grid), optional note field.
- Wire to `useSSEGeneration`: pass `mode`, `sceneIds`, `applyNotes` in query.
- Update progress UI to show editing messages ("Updated Scene X").
- Document behaviour in sprint progress + TODO if follow-ups remain.

## Risks
- LLM might over-edit without stricter prompts. Need targeted instructions focusing on colors/fonts/logos.
- Large scenes might exceed tokens; include guard (maybe send trimmed code?) for future.
- Streaming order must remain deterministic; ensure edits happen sequentially to avoid concurrency on same scene.
- Need to respect existing revision/undo stack semantics (relying on helper should cover this).

## Next Steps
1. Draft detailed plan + confirm UX microcopy (tab labels, empty state).
2. Refactor website extraction logic for reuse.
3. Implement backend edit handler + SSE integration.
4. Update modal UI + state management.
5. QA end-to-end in dev (mock URL) before merging.
6. Update sprint126 progress + global progress docs.
