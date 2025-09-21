# 2025-09-21 – Media Plan Guardrail

## Problem
Focused audit (`logs/media-plan-prod-drift-debug.ndjson`) showed 21/22 prod requests resolving with extra image URLs sourced from *other projects*. Example: `PROD-0f2d552d-…` attached `projects/fd7d15…` but the plan injected `projects/e2a6b548…`. This explains the attachment/resolved drift and is a privacy concern.

## Fix
- Added project-aware filtering in `mediaPlanService.resolvePlan()`:
  - Accepts `projectId` (threaded in from orchestrator).
  - Any plan/fallback/index/direct URL whose project ID mismatches the active project is skipped; we log it via `plan-skipped` and persist the URL in `skippedPlanUrls` for debugging.
- Extended debug output (`mediaPlanDebug`, `MEDIA_PLAN_SUMMARY`, CLI scripts) to include `skippedPlan` counts and the exact URLs that were dropped.

## Notes
- Attempted to rerun the 22-case suite after the change, but sandbox lacks outbound access to Neon (`ENOTFOUND api.us-east-1.aws.neon.tech`). Needs re-run in an environment with DB connectivity to confirm metrics.
- Remaining open question: whether to also drop same-project plan reuse (`PROD-91d6…` kept a plan asset from the same project). For now we allow same-project reuse so palette/logo continuity still works.
