# 2025-09-30 – Media Plan Resolution Triggered With Only User Library Assets

## Context
- Logs from prod run (`requestId 299CA4C1A044`) show the orchestrator resolving a media plan even though the active project has **zero** linked assets and the user did **not** attach new media.
- `ContextBuilder` reports `mediaLibrary.meta.projectImageCount = 0` and `userImageCount = 46`, indicating all media sits in the user-wide library.
- The Brain still emits a `mediaPlan` payload with:
  - Empty `imagesOrdered`/`videosOrdered`
  - `imageDirectives` referencing user-library asset IDs
  - A `mapping` entry describing optional reuse (`"userLibrary": …`) and site extraction rationale
- `shouldResolveMediaPlan()` currently returns `true` whenever any directives or mapping exist, so we call `mediaPlanService.resolvePlan()`.
- Resolver then spends cycles building lookup tables, only to drop everything as `plan-unlinked`. We land with no `imageUrls`, yet we still pay the orchestration cost and log noise.

## Problem Statement
- Resolve step is triggered purely because the user owns unrelated media elsewhere. In projects with no attached assets and no fresh uploads, the resolver cannot yield actionable media and just reports skipped URLs.
- This adds ~150–200ms of extra work per generation and clutters logs, while providing no benefit to the tool execution path.
- Users see confusing debug output suggesting media was considered even when none exists for the project.

## Proposed Fix
1. Refine `shouldResolveMediaPlan()` to factor in context + attachments:
   - Require at least one of:
     - `imagesOrdered` / `videosOrdered` with actual IDs
     - Resolvable directives *and* project-linked media or fresh attachments
     - Mapping entries **and** some project media / attachments to act on
   - When project media count is zero and the user didn’t attach anything, skip resolving even if directives/mapping exist (they reference user-library placeholders only).
2. Keep resolver behaviour unchanged when attachments or project media are present so linked assets still flow through.
3. Add structured log note when skipping due to “no project media + no attachments” for observability.

## Validation Plan
- Unit: extend `media-plan.service.test.ts` (or add new orchestrator test) to assert `shouldResolveMediaPlan()` returns `false` given:
  - Empty project media counts, zero attachments, directives referencing user-scope IDs.
  - Returns `true` when projectScoped media exists or attachments accompany directives.
- Manual: run a dry orchestrator call with a project lacking assets to verify skip log and ensure downstream tool input doesn’t list `imageUrls`.

## Follow-ups / Risks
- Brain still mentions user-library assets in its `userFeedback`. Consider separate UX copy to prompt linking, but outside scope.
- Ensure we don’t regress cases where the Brain genuinely needs to resolve plan for site extraction plus new uploads (they will have attachments, so the new guard keeps the call).
