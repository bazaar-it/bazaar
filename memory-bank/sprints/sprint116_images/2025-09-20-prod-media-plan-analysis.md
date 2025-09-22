# 2025-09-20 – Production Media Plan Audit

## Data Source
- File: `logs/media-plan-prod.json` (50 prod samples captured via `run-media-plan-suite --mode prod`)
- Each row → structured summary emitted by orchestrator during media-plan resolution
- Supporting DB checks via `mcp__pg-dev__query` against `bazaar-vid_message`

## High-Level Metrics
- Tool selection: `editScene` 32 / `addScene` 18 (no other tools)
- imageAction distribution: recreate 31, embed 18, null 1
- Latency snapshot (ms): avg 29,906 · p75 36,253 · p90 40,131 · max 56,956
- NeedsClarification: 0 (none of the prod samples triggered clarifications)

## Anomalies Observed
1. **Resolved media count drift**
   - 21/50 rows (42%) report `resolvedMedia.images` ≠ attachment count despite only one uploaded image.
   - Drift appears in both tools (editScene: 13/32; addScene: 9/18) and actions (recreate: 14/31; embed: 7/18).
   - Example: `PROD-91d6ac1b-…` shows attachments=1 but resolvedMedia.images=2; DB confirms the message only carries one `image_url`.
   - Hypothesis: `mediaPlanService.resolvePlan()` merges Brain-ordered assets with attachments via `new Set([...plannedImages, ...attachments])`. When the plan references prior scene assets (e.g. tokens such as `scene:…`), we end up forwarding both the historical asset **and** the newly uploaded one to the tool. Need to audit whether this double-feed is intentional or leaking stale assets into recreate flows.

2. **Null imageAction despite UI attachment**
   - `PROD-2bd60eb6-0637-4915-a664-e1576110546f`: prompt "insert this image in the bottom left corner" with one attachment.
   - Tool = editScene, attachments=1, resolvedMedia.images=2, but `imageAction` surfaced as `null`.
   - Suggests heuristic fallthrough in `mediaPlanService`: neither Brain plan nor post-merge heuristics selected embed/recreate. Need to inspect asset tags + reasoning text fallback.

3. **Attachment-path mismatch**
   - Several recreate decisions reference R2 URLs under different `projects/<id>` prefixes than the current `projectId` (example: `989d5aac-…` message belongs to project `3be2ffd4…` but URL stored under `projects/84b82199…`). Possibly the asset was reused/cross-project, but verify whether media context is misaligned when counting attachments.

4. **Video stored inside `image_urls`**
   - Message `bf09dd57-…` ("Try to recreate this video") stores an `.mp4` in `image_urls`, leading to resolvedMedia.images=3. Needs schema enforcement or resolver guard so videos routed to `videoUrls`.

## Immediate Questions / Next Checks
- Inspect `[MEDIA_PLAN_RESOLVE]` logs for mismatched cases to confirm whether extra URLs originate from `plan.imagesOrdered` (scene context) or mis-resolved attachments.
- Trace `mediaPlan.mediaPlan.mapping` for duplicates; ensure `resolveToken()` is not mixing placeholder indices when Brain returns `image_1`, etc.
- For the null `imageAction` case, capture context tags from `mediaLibrary` to see why heuristic chain failed.
- Validate whether tool execution expects merged historical assets (maybe needed for edits) or if we should scope to current attachment only.

## Supporting Evidence
- SQL: `select id, "projectId", content, image_urls from "bazaar-vid_message" where id in (...)` run via `mcp__pg-dev__query` confirms single-image attachments for multiple mismatched entries.
- Node scripts (`logs/media-plan-prod.json` sweep) generated counts above; see shell history in transcript for exact commands.

## Proposed Next Steps
1. Re-run `run-media-plan-suite` with logging to capture raw `mediaPlan` payloads for the 21 mismatched requests.
2. Augment `persistSummary` to record `resolvedMedia.imageDirectives` + `mappedImages` counts so drift is visible without console scraping.
3. Instrument `mediaPlanService.resolvePlan()` to tag each merged URL with source (`plan` vs `attachment`) and inspect whether duplications correlate with specific directives (e.g., `background` targets).
4. Patch `mediaResolver` / message ingestion to keep `.mp4` out of `image_urls`, or branch resolver logic to classify by MIME.
5. Add heuristic fallback in `resolvePlan()` for `imageAction` null when attachments include UI-tagged asset but Brain omitted action.

## Detailed Action Plan (2025-09-20 follow-up)
- **Drift replay scope**: Create a small helper inside `scripts/run-media-plan-suite.ts` that accepts a JSON list of request/message IDs (sourced from the 21 drift cases) and only replays those. While replaying, print the raw `toolSelection.mediaPlan` blob (including `imagesOrdered`, `mapping`, and `imageDirectives`) alongside the resolved attachment map. Persist this payload into an NDJSON file (e.g., `logs/media-plan-prod-drift-debug.ndjson`) for side-by-side comparison.
- **Source attribution**: Within `mediaPlanService.resolvePlan()`, annotate every resolved URL with its provenance: `plan` (explicit selection), `attachment` (current upload), `fallback-index` (placeholder match), or `historical` (media library match). Surface this array in the resolver return value (behind dev logging) so logs show exactly which path injected the duplicate URLs.
- **Attachment normalization**: Extend the resolver ingestion step to reclassify attachments based on MIME/extension; any `.mp4`, `.webm`, or `.mov` encountered in `imageUrls` should be moved to `videoUrls` before further processing to prevent counterfeit "additional images". For UI-tagged assets that still lack an `imageAction`, add a deterministic fallback that inspects `mediaLibrary` tags and the Brain reasoning snippet to default to `recreate` (UI) or `embed` (photo/logo) before handing off to tools.
- **Verification**: After implementing the above, rerun the focused suite with `NODE_ENV=development` to ensure the new debug fields appear. Confirm that the 21 drift cases now show correct source attribution and that video attachments no longer inflate `resolvedMedia.images`. Document outcomes in this file and the sprint progress log.

## Implementation Notes (2025-09-20 evening)
- Added provenance tracking inside `mediaPlanService.resolvePlan()`:
  - Every resolved URL now records `sources` (`attachment`, `plan`, `plan-fallback`, `plan-index`, etc.) plus contextual details.
  - The orchestrator forwards this debug payload (`mediaPlanDebug`) to callers and structured logs.
  - Dev logs `[MEDIA_PLAN_RESOLVE]` include `sourceMap` counts for quick diffing.
- Attachments are normalized before resolution. Any `.mp4/.webm/.mov` (or assets flagged as video in the media library) migrate from `imageUrls` to `videoUrls`, preventing accidental double counting.
- Image action heuristics now guarantee a non-null value:
  - UI-tagged assets (or filenames that smell like UI) default to `recreate`.
  - Photo/logo assets default to `embed`.
  - Mixed or ambiguous cases bias toward `recreate` while final fallback prefers `embed` to avoid breaking photo drops.
- `scripts/run-media-plan-suite.ts` gained a `--focus` option (file or comma-separated IDs) plus `mediaPlanDebug` output in the persisted summaries. A helper file `logs/media-plan-drift-requests.json` lists the 22 prod requestIds showing image-count drift.
- Polyfilled `fetch` when unavailable so the suite can run under Node 16 + `node --loader tsx` without choking on Neon’s HTTP client.
- **Execution status**: Attempted focused replay via `npx dotenv -e .env.local -- node --loader tsx ... --focus logs/media-plan-drift-requests.json`. Sandbox lacks outbound network access, so Neon API lookups fail with `ENOTFOUND api.us-east-1.aws.neon.tech`. Once network is permitted, rerun the command to generate `logs/media-plan-prod-drift-debug.ndjson` and compare source maps vs. previous sweeps.
