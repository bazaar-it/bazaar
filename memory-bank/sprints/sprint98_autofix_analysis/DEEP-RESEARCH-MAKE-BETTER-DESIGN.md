# Deep Research–Powered “Make Better” — Design Proposal (Sprint 98)

Status: Draft
Owner: AI Agent (with Mark)  
Scope: Project-wide quality pass (timing, transitions, consistency, polish)

## Goals
- Use OpenAI Deep Research to plan holistic improvements across an entire project.
- Preserve determinism and safety by applying edits via our existing Code Editor toolchain.
- Support long-running jobs (10–20 minutes) with resumability, progress streaming, and rollback.

## Why Deep Research here
- Long-horizon reasoning: Good for cross-scene cohesion (palette, typography, easing language, rhythm).
- Macro-to-micro: Produce a global plan, then scene-specific directives/diffs.
- Guardrails: Keep code edits inside our editor tool with compile + auto-fix + eval checks.

## High-Level Flow
1) Trigger: User clicks “Make Better” (scope: current scene | all scenes; intensity; dry-run; time/cost cap).
2) Summarize: Build lightweight project/scene summaries (durations, transitions, easings, colors, fonts, layout signals, errors).
3) Deep Research Run: Provide global objectives + scene summaries + constraints. Ask for:
   - Global Improvement Plan (style, rhythm, transition language, easing catalog, timing ranges).
   - Per-scene recommendations and, when useful, targeted diffs/snippets (not full files).
4) Apply Iteratively:
   - For each scene: call Code Editor tool with the plan + scene code (windowed) to produce a patch.
   - Persist → compile → silent auto-fix → re-compile.
   - Run eval scorecard; accept/revert based on thresholds.
5) Stream Progress: SSE updates: planning → scene n/N → eval deltas → final report.
6) Versioning: Dry-run (diff-only), or checkpoint project version; quick per-scene rollback.

## Data Contracts
- SceneSummary:
  - id, name, durationInFrames, fps, size
  - colors (top N), fonts, easing usage, transitions in/out
  - error flags (compile errors, auto-fix applied)
- GlobalContext:
  - brand/theme hints (if any), target platform (YT/TikTok/Square), user preferences
  - constraints: max duration budget, no layout shift, min contrast ratio
- EditRequest (per scene):
  - scene code window (+ anchors), global plan excerpt, desired changes
- EditResult:
  - patch, compile status, auto-fix actions, eval scores (before/after)

## API Integration Strategy
- Abstraction: `DeepResearchClient` with methods: `startRun(input)`, `getRun(id)`, `cancelRun(id)`.
- Inputs: global objectives + summaries + constraints (avoid raw full files to control tokens).
- Outputs: JSON plan with sections: `global_plan`, `scene_recommendations[]`, optional `diffs[]`.
- Model selection and budget: env-configurable; time cap in minutes; token cap by summarization.
- Fallback: If disabled/unavailable, fall back to existing Brain “planner” prompt.

## Safety Rails
- Never apply direct edits from Deep Research blindly; route through Code Editor tool.
- Per-edit compile + auto-fix + eval checks; revert on regression.
- Cost controls: summaries, cap scenes per pass, intensity levels, early stopping on diminishing returns.
- Secrets hygiene: only pass non-sensitive summaries and minimal code windows.

## SSE + Job Orchestration
- Create `improvement_jobs` concept (queued → in_progress → completed/failed/canceled).
- Persist: job meta (projectId, scope, intensity, caps), progress %, logs, artifacts (plan, diffs, eval deltas).
- Resumable: after crash/redeploy, continue at next scene.
- Streaming milestones: planning started/completed; per-scene: started → patch → compiled → auto-fixed → eval → accepted/reverted.

## Eval Scorecard (src/lib/evals/)
- TransitionConsistency: transitions form a coherent language (no random mixes).
- EasingNormalization: limit to curated set; detect jerky cubic-bezier outliers.
- Rhythm/Timing: avoid abrupt cuts; align to beat grid or even pacing.
- Visual Contrast: basic WCAG-ish check on text overlays.
- Layout Stability: detect large element shifts frame 0→n when not intended.

## UX Outline
- Button: “Make Better” in preview header.
- Controls: scope, intensity, dry-run, time/cost cap.
- Progress panel: live bullets; per-scene diff summaries.
- Review: Accept all, or per-scene rollback.
- Logs: link to job artifacts (plan JSON, eval report).

## Minimal Incremental Rollout
- Phase 1 (Plan-only): Run Deep Research → show Global Plan + scene suggestions (no edits).
- Phase 2 (One-scene apply): Apply to current scene with eval + rollback.
- Phase 3 (Batch): N scenes per run with caps.
- Phase 4 (Iterative): Multi-pass until evals plateau or budget exhausted.

## Open Questions
- Where to persist jobs? New table vs reuse existing job/task tables. Migration required.
- How to gate cost? Per-user daily budget vs org-wide cap.
- Planning repeatability: hash summaries to memoize plans for unchanged projects.

## Env Vars (proposed)
- DEEP_RESEARCH_ENABLED=true|false
- DEEP_RESEARCH_MODEL=deep-research-1
- DEEP_RESEARCH_MAX_MINUTES=20
- DEEP_RESEARCH_MAX_SCENES=10

## Next Steps
- Implement `DeepResearchClient` abstraction (no vendor lock in service layer).
- Add router: start/cancel/getProgress (dry-run plan first).
- Add SSE endpoint for job streaming.
- Add eval checkers (TransitionConsistency, EasingNormalization, Rhythm, Contrast).
- Add UI: MakeBetterButton + progress sheet.

