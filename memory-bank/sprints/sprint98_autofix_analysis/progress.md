# Sprint 98 — Auto-Fix Analysis & Stabilization

Date: 2025-08-30

- Added Deep Research “Make Better” design proposal.
- Defined flow: plan via Deep Research → apply via Code Editor → compile + auto-fix → eval.
- Outlined SSE streaming, job orchestration, safety rails, and rollout plan.

- Added Transition Tool design and scaffold.
  - New types: TransitionToolInput/Output + schemas.
  - New tool: src/tools/transition/transition.ts (pure boundary planner + snippets).
  - Noted dependency: Remotion composition needs overlap support for true crossfades.

Next: Decide on Phase 1 (plan-only) implementation and API scaffolding.

---

Date: 2025-09-01

- Timeline audio waveform desync investigation and fix.
  - Root causes: (1) waveform drawn for entire audio instead of selected segment (start/end), (2) canvas backing size not matching CSS size causing scaling drift, (3) redraw not triggered on resize.
  - Fixes implemented in `src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`:
    - Draw only the audio segment between `startTime` and `endTime` by slicing waveform samples via decoded duration mapping.
    - Use device-pixel-ratio aware canvas sizing (`clientWidth/Height * dpr`) and scale context for crisp, accurate positioning.
    - Increase waveform resolution (adaptive up to ~2000 samples) and add window resize redraw.
  - Outcome: Waveform now aligns with audible music and the playhead across zoom levels; no visual drift.

- Timeline audio editing UX added in TimelinePanel:
  - Drag to move audio segment horizontally (updates start/end).
  - Trim via left/right handles.
  - Inline volume slider and delete button with DB sync.
  - Uses same seconds-per-pixel mapping as playhead for consistent feel.

- Preview namespacing collision fix:
  - Symptom: New scenes intermittently failed with `Identifier 'SceneNS_1' has already been declared`.
  - Root cause: Namespaced wrappers used `const SceneNS_[index] = (...)()`; duplicate inclusion in a single generated module caused redeclaration errors.
  - Fix: Switched to redeclaration-tolerant `var` for the namespace and converted error boundary helper declarations to `var` assignments.
  - Files: `src/lib/video/wrapSceneNamespace.ts`, `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`.
  - Result: No collisions; new scenes compile and preview reliably.

- Preview namespace stability fix:
  - Symptom: Runtime `SceneNS_2 is not defined` after inserting a new scene.
  - Root cause: Wrapper name was index-based but cache key was ID-based; cached wrapper defined `SceneNS_1` while boundary referenced `SceneNS_2` after reordering.
  - Fix: Use ID-based namespace (`SceneNS_[first8OfId]`) and pass `namespaceName` into `wrapSceneNamespace`; cache now stores `{ code, usedRemotionFns }` to preserve import hoisting on cache hits.
  - Result: Reordering/inserting scenes no longer causes undefined namespace errors.

- Removed optimistic scene replace in ChatPanelG:
  - Symptom: After adding a scene, the new scene briefly appeared twice (e.g., order 1 and 3) until refresh.
  - Root cause: ChatPanelG appended an optimistic scene to VideoState while PreviewPanelG later replaced state with DB scenes; concurrent writes caused transient duplicates.
  - Fix: Removed optimistic `replace(projectId, updatedProps)` after create/restore; rely on `getProjectScenes` invalidation and PreviewPanelG DB sync.
  - Result: No transient duplicates; new scene appears in correct order after quick refetch.

- PreviewPanelG defense-in-depth dedupe:
  - Add a simple dedupe-by-id before writing scenes to VideoState from DB.
  - Purpose: Guard against any future multi-writer or optimistic reintroductions; keep state canonical with one scene per id.
  - Cost: O(n) Map; negligible.

- Preview wrapper cache hygiene:
  - Clear the namespace wrapper cache when the ordered-scenes fingerprint changes.
  - Purpose: Avoid any possibility of stale wrapped code after reorder/insert, even though namespaces are now ID-based.

---

Date: 2025-09-08

- Image upload → generation deep dive documented.
  - File: `memory-bank/sprints/sprint98_autofix_analysis/image-upload-pipeline-analysis.md`
  - Covers: UI upload, SSE, tRPC router, Brain orchestration, tool execution, prompts used.
  - Identified ambiguity: “animate this” + image can map to `addScene` or `imageRecreatorScene` depending on LLM interpretation.
  - Proposed stabilizers:
    - Pre-LMM deterministic rules for common patterns (recreate/for scene N/animate this).
    - Lower Brain temperature to 0.2 for intent classification.
    - Optional UX hint toggle when images attached (“recreate vs reference”).

—

Date: 2025-09-08 (cont.)

- Began unifying image handling into add/edit:
  - Brain types extended to include `imageAction` (embed|recreate) in decision.
  - Brain prompt updated to require `imageAction` when images present and stop recommending a separate image tool.
  - Router maps legacy `imageRecreatorScene` → `addScene` + `imageAction='recreate'` (soft deprecation).
  - AddTool now routes image generation by `imageAction` (embed → CodeGenerator; recreate → ImageRecreator prompt path).
  - Upload route: added async MediaMetadataService hook to tag assets (kind/layout/colors/text hints) for future intent accuracy without prompt-time latency.
