# Current System vs. Optimal Image-Oriented Orchestration

Date: 2025-09-16  
Author: Codex (analysis request from dev)

## 1. Executive Summary

Our present pipeline for image-informed prompts works, but it leans on a single LLM decision point with high context noise and limited deterministic safeguards.  It produces decent results most of the time, yet QA reports from dev show inconsistent tool selection (embed vs. recreate), fragile attachment handling, and occasional loss of user intent when the project accumulates assets.  The optimal system should provide deterministic, user-first intent handling, explicit metadata propagation, guardrails against regressions, and scalable instrumentation.

This document compares the *current* implementation with an *optimal/target* solution, using concrete evidence drawn from code, logs, and the new evaluation guide.  It concludes with a prioritized delta list.

## 2. Current System: Evidence & Characteristics

### 2.1 Ingestion & Storage
- `/api/upload` stores each asset in Cloudflare R2 and persists metadata via `assetContext.saveAsset`.  Evidence: dev logs (`[AssetContext] Successfully linked asset…`).  Assets enter the media library immediately (subject to DB lag).
- Attachments delivered to generation via SSE `ready` event (see `ChatPanelG` → `useSSEGeneration`).  State is kept in Zustand’s `draftAttachments`.

### 2.2 Context & Decision (Brain)
- `ContextBuilder.buildContext` supplies:
  - Entire scene history (TSX code), recent conversation, all project assets (limit 50), and template context.
  - `imageContext.currentImages` (attachments this round) plus `recentImagesFromChat` (historical sequence).  **Impact**: The LLM receives both the fresh upload and historical assets with equal prominence.
- Prompt: `src/config/prompts/active/brain-orchestrator.ts`.  It includes heuristics for embed vs. recreate but relies on LLM interpretation with temperature 0.4.  There is no deterministic post-processing step.
- Instrumentation gap: we do not currently log whether the LLM returned `mediaPlan`.  When `mediaPlan` is missing, `MediaPlanService.resolvePlan` now returns “No mediaPlan” and relies purely on attachments.

### 2.3 Execution & Metadata
- `AddTool` decides `imageAction` based on `input.imageAction` (from orchestrator) or heuristics.  There is no structured metadata emitted for QA besides console logs.
- Music override bug (now fixed) shows that helper-level “smartness” can accidentally overrule the brain if not covered by tests.
- Large `code-generator` prompt with numerous instructions; the same prompt handles text, images, and Figma data.  While flexible, it is heavy and hard to reason about.

### 2.4 Observed Failure Modes
- **Attachment priority loss**: After multiple uploads, the LLM may reference older assets because we include the entire media library in context. Evidence: QA bug reports where “Use this new screenshot” still used an older image.
- **Ambiguous prompts**: Without deterministic pre-rules, phrases like “animate this” may map to embed or recreate inconsistently (see logs in dev). The “IMAGE DECISION CRITERIA” section instructs but doesn’t guarantee behavior.
- **Instrumentation blind spot**: We lack logs tying the final assistant output to the selected tool / `imageAction`. QA cannot easily confirm whether the code path matched user intent.
- **Testing gap**: No automated evaluation ensures that embed vs. recreate stays stable. Regressions slip into dev (e.g., audio override) because there’s no guard.

## 3. Optimal System: Target Capabilities

### 3.1 Deterministic Intent Layer
- **Rule-based pre-processing**: Parse the current user prompt for deterministic signals:
  - Keywords: `embed`, `place`, `add` → `imageAction=embed`
  - `recreate`, `copy`, `exact`, `animate this (UI)` → `imageAction=recreate`
  - `scene X` + image → `editScene` with `targetSceneId`
- Adjust orchestrator input to include a `intentHint` object; `IntentAnalyzer` uses it to bias or override LLM output.
- If attachments exist this turn, treat them as high priority: pass them separately from the historical media library.

### 3.2 Structured Metadata & Logging
- For every generation call, log a JSON envelope:
  ```json
  {
    "requestId": "…",
    "prompt": "…",
    "attachments": ["imageUrl1", …],
    "plan": { "present": true, "imagesOrdered": 1, "directives": ["embed"] },
    "tool": "addScene",
    "imageAction": "embed"
  }
  ```
- Attach the same metadata to the assistant chat message (hidden) so QA/Support can inspect decisions.
- Emit metrics (e.g., StatsD / OpenTelemetry) for `imageAction` frequency, plan presence, clarifications triggered.

### 3.3 Model & Prompt Adjustments
- Lower brain temperature (0.2) for intent decisions.  Keep the generator temperature higher if needed for creativity.
- Refine the brain prompt to explicitly prioritize “latest attachments” and treat `userContext.intentHint` as authoritative unless it conflicts with explicit user instructions.
- Consider splitting `code-generator` prompt into specialized templates (text-only, embed, recreate) to reduce prompt bloat and increase determinism.

### 3.4 Evaluation Harness
- Build automated tests using the new evaluation guide (30 cases).  Each test should feed the orchestrator with simulated context and assert:
  - Tool selection
  - `imageAction`
  - Presence of `imageDirectives` when multiple images are supplied
  - Whether clarification is requested for ambiguous prompts
- Integrate with MCP evaluation suite (both dev & prod DB) to ensure asset lookup logic works with real data.

### 3.5 UX Enhancements
- Display a small toggle/dropdown when attachments are present: “Embed exact image” vs. “Recreate design”.  Feed this selection into `intentHint`.
- Provide user-visible feedback (toast or assistant message) summarizing the action taken (“I’m embedding your image exactly” vs. “I’ll recreate this UI”).
- In case of ambiguity, front-load clarifying questions *before* contacting the LLM long-context pipeline.

### 3.6 Scalability & Maintenance
- Modular prompts allow updates without touching every scenario.
- Deterministic layer reduces reliance on prompt tweaking; easier to audit.
- Structured logging makes downstream analytics/ML models feasible (e.g., training a classifier to pre-route embed vs. recreate).

## 4. Delta Summary

| Area | Current | Optimal | Delta |
| --- | --- | --- | --- |
| Intent handling | Single LLM decision (temp 0.4) with heuristics | Rule-guided pre-layer + low-temp LLM confirmation | Add deterministic parser; adjust temp |
| Attachment priority | Entire media library merged | Fresh attachments prioritized, historical demoted | Modify context builder / prompt |
| Metadata | Console logs only | Structured JSON logs + message metadata | Implement logging / message extensions |
| Instrumentation | None in production for media plan / imageAction | Dev/staging logs, metrics, QA metadata | Add instrumentation hooks |
| Prompt structure | Monolithic `code-generator` prompt | Potential specialized prompts or templated sections | Refactor prompt strategy |
| Tests | Manual QA | Eval suite built from 30 canonical cases | Implement automated + manual checklist |
| UX | No user choice for embed vs. recreate | Inline toggle/intent hints | Product/UX change |

## 5. Next Steps (prioritized)

1. **Implement instrumentation** – Structured logs + assistant metadata in dev/staging (unblocks measurement).
2. **Deterministic parser prototype** – Parse attachment-focused keywords, feed `intentHint` into orchestrator.
3. **Run evaluation suite manually** – Use `image-prompt-eval-guide.md` to collect baseline data from dev/prod.
4. **Adjust brain temperature / prompt** – Based on data, lower temp and clarify instructions about latest attachments.
5. **Automate tests** – Add integration tests covering at least embed vs. recreate cases.
6. **Explore UX toggle** (with product) – Ensure user has explicit control when desired.

With these changes we can reach a system that is:* deterministic around attachments*, *transparent to QA*, *correct for user intent*, and *scalable* for future feature work.

