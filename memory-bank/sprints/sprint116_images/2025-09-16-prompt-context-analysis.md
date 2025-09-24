# 2025-09-16 – Prompt vs. Context Weighting Review

## Why we’re here
On dev the image workflow “feels random”: users upload an image, ask to embed or recreate it, and the system sometimes ignores the request, sometimes recreates when they wanted an embed, and occasionally drops the image entirely. Live used to be stable, so this dives into where we might have regressed and how much weight we give to the *current* user prompt vs. historical context.

## Symptoms observed on dev (Sep 16)

| Scenario | Expected | Actual | Notes |
| --- | --- | --- | --- |
| Upload image → “embed this screenshot” | addScene + `imageAction=embed` | addScene w/out the image or `imageAction=recreate` | Brain picked `imageAction` inconsistently |
| Upload UI mock → “recreate this” | addScene + `imageAction=recreate` | Either embed or loses image | Attachments present but plan empty |
| Add audio earlier → “add new scene” | new scene appended | addAudio ran again | Helper override forced addAudio (fixed 2025-09-16) |

## Flow checkpoints & weight distribution

1. **Attachments captured** – `ChatPanelG` stores uploads in state and the SSE route persists the asset (Cloudflare R2) + DB row via `assetContext.saveAsset`. ✔️
2. **Orchestrator context** – `ContextBuilder.buildContext` merges:
   - `userContext.imageUrls` (fresh attachments)
   - Media library (`assetContext.listProjectAssets`) – the *entire* project history, up to 50 assets
   - Scene history, chat history, template context
   The intent prompt enumerates both the storyboard and the asset inventory.
3. **Brain decision** – `IntentAnalyzer.analyzeIntent` sends the prompt assembled from the system prompt (`brain-orchestrator.ts`) plus all of the above context. The instructions bias toward `addScene` for new images but still leave interpretation to GPT-5 with temp 0.4.
4. **Media plan mapping** – `mediaPlanService.resolvePlan` maps the brain’s `mediaPlan.imagesOrdered` to URLs. If the plan is missing or empty we currently merge in the user attachments (`attachmentsImages`). If the plan references asset IDs we can’t resolve, the array collapses to `[]` and the merge falls back to attachments.
5. **Tool execution** – `AddTool.generateFromImages` reads `imageAction` (default embed) and pushes the value into the code generator prompt. `imageDirectives` are honored when present.

So: user prompt is just one component of the context the LLM sees, and the asset library + earlier messages now carry nearly equal weight. Without deterministic pre-rules, the brain’s choice depends on subtle wording variations.

## Regressions & reliability gaps discovered

1. **Add-scene override after audio** – The helper forcibly rerouted any `addScene` decision to `addAudio` if the project had `audioUrls`. Fixed today, but shows we lacked coverage around stateful combinations (audio + new scenes).
2. **Media plan null handling** – When the brain skipped `mediaPlan` (common for simple text prompts) we’d throw on `plan.imagesOrdered`. Fixed by bailing out early. Attachments now continue downstream, but we still don’t know if the brain is omitting plans more frequently in dev (no instrumentation).
3. **Context noise** – We now send *all* project assets + full chat history on every request. That gives the brain a lot to parse and likely dilutes the latest user prompt, especially when the project already contains similar images. There’s no ordering hint telling GPT “the last attachment is the highest priority.”
4. **`imageAction` heuristics drift** – The system prompt still says “animate this” should default to recreate, but we’ve seen embed requests turning into recreate and vice versa. Without logging the brain’s raw decision we can’t tell whether the misfire originates in `IntentAnalyzer` or `CodeGenerator`.

## Reliability levers we can pull

### 1. Deterministic pre-rules (before LLM)

- Detect keywords in the *current* user prompt (`embed`, `place`, `add`, `recreate`, `copy`, `exact`) and set `intentHint.imageAction = embed|recreate` before calling the brain. Pass this hint via `userContext` and let `mediaPlanService` fall back to it if the plan is missing.
- If the user attached images this round, pass only those to the brain as `currentImages` and demote historical assets (e.g., include them under “Optional inspiration assets”). That keeps the latest prompt top-of-mind.

### 2. Instrumentation to measure drift

- Log (dev/staging only) at the orchestrator boundary:
  ```json
  {
    "decisionId": "…",
    "prompt": "add this screenshot",
    "attachedImages": 1,
    "mediaPlan": {
      "present": true,
      "imagesOrdered": 1,
      "directives": ["recreate"]
    },
    "tool": "addScene",
    "imageAction": "embed"
  }
  ```
- Add a tiny metadata block to the assistant message (`message.metadata.intent`) with tool + `imageAction` so QA can see what the brain decided without digging through logs.
- Capture duration: Did `mediaPlanService` fall back to attachments? Was `imageAction` inferred? Without this we’re guessing.

### 3. Prompt hygiene / temp tuning

- Evaluate dropping the brain temperature to 0.2 for image flows. The liveness of gpt-5-mini + large context means we still get variety but fewer flukes.
- Tighten the “IMAGE DECISION CRITERIA” section to explicitly say “If the *latest* user message contains keywords {embed,…} you MUST return `imageAction=embed` regardless of older context.”

### 4. Automated checks

- Add regression tests under `src/tests/integration/` that simulate uploads: provide fake R2 URLs, run orchestrator with prompts (“embed this logo”, “recreate this UI”), assert tool + `imageAction` stable.
- Add a QA checklist entry requiring manual embed/recreate tests whenever dev → main merges.

## Immediate follow-ups

1. Implement logging/metadata instrumentation (dev only) to establish ground truth.
2. Draft deterministic pre-rules for embed/recreate and run them past product (to avoid breaking existing behavior).
3. Adjust the brain prompt once we confirm the instrumentation points to LLM ambiguity instead of mapping bugs.

## Open questions

- Do we still need the entire media library every time, or should we prioritize the latest 5 assets and mention the rest as “available if needed”?  This could reduce context noise.
- Should we store user intent hints (embed vs recreate) in the chat so follow-up edits inherit the user’s preference?  Currently each prompt starts “fresh.”

## References

- Pipeline walkthrough: `image-upload-pipeline-analysis.md`
- Prompt text: `src/config/prompts/active/brain-orchestrator.ts`
- Decision execution: `src/server/api/routers/generation/helpers.ts`
- Media mapping: `src/brain/services/media-plan.service.ts`

