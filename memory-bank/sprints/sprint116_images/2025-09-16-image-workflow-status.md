# 2025-09-16 – Image Workflow Regression Sweep

## Why this exists
Develop wrote that “image upload / embed / recreate is super flaky in dev now”. The live site used to behave fine, so we’re hunting for regressions across the attachment → tool-selection → generation pipeline.

## Quick status snapshot

- **Attachment ingestion**: `/api/upload` → `assetContext.saveAsset` still runs for new uploads.  Logs show fallback INSERTs firing when the production schema is missing the `added_at/added_via` columns, but the asset ends up linked.  No blocking changes here.
- **Brain decision**: `orchestrator.processUserInput` merges `userContext.imageUrls` (attachments) with the asset-driven media library.  The latest code still hands both over to the LLM.  No hard crash in intent phase.
- **Media-plan mapping**: `MediaPlanService.resolvePlan` used to throw when the Brain skipped `mediaPlan`.  We added a guard today (`return { suppressed: false, reason: 'No mediaPlan' }`) so decision-only hints don’t crash add/edit.  Attachments continue to flow through because the orchestrator falls back to `userContext.imageUrls` when `planned.imageUrls` is undefined.
- **Tool execution override**: We discovered a separate regression—the helpers forced `addAudio` whenever `audioUrls` existed, even if the brain wanted `addScene`.  That blocked any scene creation once a project had background audio.  Removed the override; scene creation now obeys the brain.

## Open questions / suspected regressions

1. **Plan content from Brain**  
   We need telemetry showing when the Brain actually emits `mediaPlan` with `imagesOrdered` / `imageDirectives` vs. when it punts.  Without that data we can’t tell if the flaky behavior is from the Brain’s output or our mapping layer.

2. **Asset availability timing**  
   Context builder pulls the media library via `assetContext.listProjectAssets`.  That query is limited to 50 rows and sorted by created date.  Need to confirm that freshly uploaded assets appear there immediately on dev (no replication lag).  Otherwise the plan would point to IDs we can’t resolve, causing the tool to lose the uploaded image.

3. **Tool-specific prompts**  
   The add-tool (`CodeGeneratorNEW.generateCodeFromImage`) vs. image-recreator prompts may have diverged—if Sonnet returns different JSON shape/dev instructions on dev vs. prod we need fresh samples.

4. **User-context retention**  
   `ChatPanelG` stores `draftAttachments` in Zustand, but switching panels or reloading can wipe attachments.  Users reporting “embed” vs “recreate” failing might actually be losing the attachments mid-flow.

5. **Prompt determinism**  
   Even in the healthy pipeline the brain prompt is still temperature 0.4.  We should capture seeds / decisions and attach them to assistant messages so QA can see exactly what tool was chosen and why.

## Automated evaluation snapshots — 2025-09-17

- **Prod sample run (50 uploads)**: `npm run debug:media-plan-suite -- --mode prod --limit 50 --output logs/media-plan-prod.ndjson` recorded 10 rows before hitting rate limits. Tool split stays healthy (`editScene`: 3, `addScene`: 7) and `imageAction` returned `recreate` seven times. Three requests still surfaced `imageAction: null`, so the Brain is not asserting embed/recreate for ~30 % of sampled prod prompts (`logs/media-plan-prod.ndjson`).
- **Curated regression deck (4 cases)**: `npm run debug:media-plan-suite -- --mode cases --cases scripts/data/media-plan-curated.json --output logs/media-plan-curated.ndjson` shows the Brain always picking `addScene` but returning `imageAction: null` for every case—even when metadata or instructions should force `embed`/`recreate`. The deck includes explicit embed expectations (Chrome demo) and multi-image `mixed` directives, so we’re missing the decision signal during orchestration.
- **Latency**: Curated cases averaged **35.1 s** (max 55.2 s); prod samples averaged **28.3 s** (max 41.2 s). These runs measure just the Brain phase (no tool execution) and indicate we’re routinely waiting ~30 s for a decision.
- **Gap surfaced**: `run-media-plan-suite` is read-only: it prints summaries but doesn’t assert against `expectedTool` / `expectedImageAction`, so regressions slide by silently. We need automated comparisons alongside the NDJSON logs.

## Next instrumentations / diagnostics

- [ ] Add structured logging in `MediaPlanService.resolvePlan` summarising `{ planPresent, mappedImages, mappedDirectives, suppressedReason }` so we can diff dev vs. prod.  (Dev only log level.)
- [ ] Attach the selected tool + imageAction reasoning to the assistant chat message metadata for user-visible debugging.
- [ ] Extend QA checklist: “Upload → Embed” + “Upload → Recreate” flows in dev, note tool + `imageAction` result.  Capture logs with above instrumentation.

## Immediate fixes (today)

- ✅ Guarded `MediaPlanService` against missing plans (prevents crash).
- ✅ Removed helper override that hijacked `addScene` decisions when audio was present.

## Risks / unknowns

- No automated coverage for the media-plan path.  Regression sneaked in unnoticed.
- Dev/staging DB schema still missing `token_type` on the GitHub tokens table; the warnings are noisy but not blocking image workflows.
- We still rely on Sonnet/OpenAI to honor `imageAction`.  Need data to see if the dev drift is in model output.

## Next steps

1. Implement the logging instrumentation and run through both “embed” and “recreate” flows on dev.
2. Compare with prod logs; note differences in `mediaPlan` or attachments.
3. Decide whether to add deterministic pre-rules (e.g., when user attaches images and types “embed”, force `imageAction='embed'`).

## Breadcrumbs for deeper reading

- Pipeline walkthrough: `memory-bank/sprints/sprint116_images/image-upload-pipeline-analysis.md`
- Orchestrator decision prompt: `src/config/prompts/active/brain-orchestrator.ts`
- Media mapping logic: `src/brain/services/media-plan.service.ts`
- Add tool pipeline: `src/tools/add/add.ts`
- Image recreator: `src/tools/image-recreator/image-recreator.ts`
