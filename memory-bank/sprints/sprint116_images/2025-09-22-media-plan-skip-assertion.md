# 2025-09-22 – Media Plan Skip Assertion & Eval Refresh

## Context
- Guardrail in `mediaPlanService.resolvePlan()` now tags and suppresses cross-project plan assets (`plan-skipped`).
- Latest prod replay (`logs/media-plan-prod-drift-debug-2.ndjson`) shows 22 samples, 17 with skip hits (77%). Five foreign projects account for all blocked URLs.
- Need stronger automation: suite should fail when new cross-project pulls appear, and we must broaden sampling beyond the fixed 22 requests.
- After code updates we have to run the suite against dev/prod datasets, then clear lint/typecheck noise introduced by the changes.

## Objectives
1. Add an assertion/reporting path to the media-plan suite so `skippedPlan` occurrences are surfaced/fail the run based on configurable thresholds.
2. Expand suite inputs to avoid overfitting to a static drift list (e.g., allow pulling fresh prod samples or aggregating larger focus files).
3. Validate behaviour on dev server (end-to-end orchestrator call) and finish with lint/typecheck passes.

## Approach Sketch
- Update `scripts/run-media-plan-suite.ts` to:
  - Track `skippedPlan` counts across rows.
  - Exit non-zero (or flag) when count > 0, with option to downgrade to warning via flag for exploratory runs.
  - Provide aggregate summary (total, skipped count, offending project IDs).
  - Support reading multiple focus files or sampling from prod (so we can rotate datasets).
- Extend CLI (`npm run debug:media-plan-suite`) docs to note new flags.
- Run suite twice: (1) prod mode with larger limit (e.g., 100) to check guardrail stability, (2) dev/staging dataset to ensure no regressions.
- Capture outputs/logs for memory bank, then run `npm run lint` and `npm run typecheck`; address any issues.

## Open Questions / Risks
- Need to confirm failure policy: immediate non-zero exit vs. JSON report consumed by CI; lean towards exit code for now.
- Prod data fetch may still be rate-limited; ensure suite handles Neon pagination gracefully.
- Typecheck may require explicit types when adding summary struct; keep changes minimal.

## Next Steps
- Implement suite changes.
- Re-run suite with broader prod set and dev checks.
- Update memory-bank progress + TODO after verification.
