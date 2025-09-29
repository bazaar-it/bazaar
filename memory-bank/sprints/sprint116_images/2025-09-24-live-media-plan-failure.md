# 2025-09-24 – Live media plan failure & GitHub token schema mismatch

## Incident snapshot
- **Timestamp (UTC)**: 2025-09-24T15:33:19.639Z
- **User prompt**: "animate this"
- **Project**: fa164d69-521e-45fc-8ea2-c2385810f0d8
- **Assets**: UI/dashboard screenshot (tags: `kind:ui`, `layout:dashboard`, `hint:recreate`)
- **Brain decision**: `toolName: editScene`, `mediaPlan.imagesOrdered: ["b7242e4f-a30a-42ba-911d-2ca43feaf4ff"]`, directives instruct recreate

## Observed errors
1. **TypeError inside `MediaPlanService.resolvePlan`**
   - Stack: `Cannot read properties of undefined (reading 'entries')` → `.next/server/chunks/8273.js:421:6444`
   - Stops orchestrator after tool selection, no scene execution
2. **Database error when checking GitHub connection**
   - `column "token_type" does not exist` (Postgres code 42703)
   - Query triggered from `scene-operations.ts` guard that runs before orchestration

## Immediate impact
- Generation halted post-tool selection; user receives generic failure
- GitHub connection check always falls back to "disconnected" and logs noisy errors in production

## Root causes (initial)
- `MediaPlanService.resolvePlan` builds debug instrumentation only when `NODE_ENV !== 'production'`, but later unconditionally accesses `debugSourceAccumulator.entries()`. In production (`shouldLog = false`), the accumulator is `undefined`, causing the crash.
- The GitHub connection schema includes a `token_type` column in Drizzle, but production database branch lacks that column. Selecting `*` pulls in the missing column, so the query fails even though connection state could otherwise be determined from existing fields.

## Proposed fixes
- Guard debug map usage when instrumentation is disabled; default `debug.sourceMap` to empty array.
- Narrow the GitHub connection query to explicit columns that exist on both schemas (id/access token/is_active) and tolerate schema drift until migrations catch up. Optionally harden schema detection for future discrepancies.

## Follow-ups / open questions
- Do we have remaining call sites that assume the debug accumulator exists? (`resolvePlan` should centralize guard rails.)
- Confirm production DB schema divergence and plan safe backfill for `token_type` (tracked separately in database ops docs?).
- Evaluate whether orchestrator should treat GitHub lookup failures as soft warnings to avoid noisy console spam.

## Next steps
- Implement guards in `media-plan.service.ts` and adjust GitHub lookup query.
- Add regression check to ensure `resolvePlan` works with `NODE_ENV=production` locally.
- Update sprint progress once fixes land.
