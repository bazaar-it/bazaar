# Sprint 108 - Progress

## 2025-09-02
- Created Sprint 108 docs (README, TODO)
- Decided on Hybrid icon strategy (local → API → placeholder)
- Added runtime Iconify shim; removed Remotion destructure injection
- Installed healthicons support in icon loader; pending npm install
- Implemented robust replacer + post-validation
- Added icon panel badges showing availability
- Redeployed Remotion site multiple times
- Fixed React Error #130 with complete icon replacement solution
- Discovered Function constructor not returning Component issue
- User added explicit return statements
- **NEW ISSUE**: delayRender timeout crash after user's changes

## Current Crisis: delayRender Timeout

After adding explicit return statements to fix component rendering, exports now crash with:
```
A delayRender() was called but not cleared after 28000ms
```

This affects all 5 chunks in the video export, happening in VideoComposition component.

## Next
- Investigate why delayRender is not being cleared
- Check if explicit return broke async loading
- Fix VideoComposition component timeout issue

## 2025-09-12
- Reviewed Sprint 108 docs (README, TODO, STATUS, DIAGNOSIS, REGRESSION_ANALYSIS)
- Verified preprocess appends `return Component;` to scene jsCode
- Added explicit return fallback in `src/remotion/MainCompositionSimple.tsx` after `${executableCode}`
  - Guarantees the Function constructor returns a component even if preprocessing misses it
  - Safe (guarded by `typeof Component !== 'undefined'`)
- Fixed literal Iconify calls not getting inlined:
  - Extended `replace-iconify-icons.ts` to handle:
    - `window.IconifyIcon({...})` and `IconifyIcon({...})` direct calls with literal `icon` → inline SVG via React.createElement('svg', ...)
    - Retains existing React.createElement and JSX paths
  - Expected result: No more white-square placeholders when icon names are literal strings
- Next: Validate deployed Remotion site uses this version and re-test export
  - Redeploy site, update `REMOTION_SERVE_URL` to new deployment
  - Run export and check for any remaining `delayRender()` timeouts in Lambda logs
  - If timeouts persist, inspect for any FontLoader usage or implicit delays in deployed composition
  
- Added documentation: `EXPORT_RELIABILITY_PLAYBOOK.md` with end-to-end reliability plan (constraints, preprocess enforcement, asset strategy, reporting, deployment, and canary tests)

- Deployed new Remotion site:
  - Serve URL: https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-icon-robust-20250912/index.html
  - Updated `.env.local` `REMOTION_SERVE_URL` to this URL

- Validation (canary) export via Remotion CLI:
  - Composition: `MainCompositionSimple`
  - Frames: 0–149 (5s @ 30fps), 1920x1080
  - Output: S3 public URL (see CLI output)
- Result: ✅ Success (mp4 ~266kB)

## 2025-09-12 (refactor + DX)
- SceneErrorBoundary: Dev vs Prod behavior
  - In dev, show verbose overlay (no masking); in prod, friendly placeholder
  - File: `src/remotion/MainCompositionSimple.tsx`
- Icon replacer refactor for maintainability
  - Extracted helpers:
    - `icon-replacement/extract-icon-names.ts`
    - `icon-replacement/visitors.ts` (JSX/CallExpression visitors)
  - Orchestrator remains `replace-iconify-icons.ts`
  - No runtime behavior change intended; improves readability and ownership boundaries

## 2025-09-15
- Implemented robust false-positive filtering in `extract-icon-names.ts`:
  - Whitelisted known prefixes (mdi, material-symbols, lucide, etc.)
  - Rejected time-like strings (e.g., 9:41) and emoji/Unicode
  - Tightened generic token pattern to require letter-led prefixes and valid tail
- Guaranteed runtime injection for `__InlineIcon` in `replace-iconify-icons.ts`:
  - If any `__InlineIcon` usage exists after transforms and no dynamic map was injected, inject a minimal runtime placeholder to avoid `__InlineIcon is not defined`
  - Keeps existing dynamic runtime map path when dynamic icons are detected
- Rationale: Addresses root causes from ICON_REPLACEMENT_ANALYSIS.md — false positives and missing runtime function
- Next: Run tests and re-validate export with a scene that includes time strings and dynamic icon arrays

### Test Run (icon isolation suite)
- Command: `npm run test -- src/server/services/render/__tests__/icon-isolation.test.ts`
- Result: 7 passed, 1 failing
  - Passing: valid icon inline, unknown set fallback, missing icon name fallback, dynamic runtime map, scene isolation (x2), Lambda compilation
  - Failing: post-validation “no IconifyIcon references” — regex still matches `IconifyIcon` in emitted code
    - Likely cause: leftover literal in emitted code (comment or rare path); internal post-validation passes, so mismatch is due to string content rather than unresolved usage
    - Plan: Inspect output strings for the 4 post-validation cases; remove any literal `IconifyIcon` mentions in injected snippets (already removed), add final hard sweep if needed

## 2025-09-15 (avatars dynamic fix)
- Root cause: Export preprocess only replaced static `window.BazaarAvatars['literal']`, but scenes use dynamic `window.BazaarAvatars[avatarName]` → undefined in Lambda
- Implemented dynamic avatar handling in `render.service.ts`:
  - Injects `__AVATAR_REGISTRY` (built from catalog) and `__ResolveAvatar(name)`
  - Transforms `window.BazaarAvatars[expr]` → `__ResolveAvatar(expr)`
  - Keeps existing static replacements and direct path rewrites
  - Placeholder: transparent 1x1 PNG data URL for unknown names
- Expected result: Avatar-heavy scenes export correctly; no dependency on `window.BazaarAvatars` in Lambda
## 2025-09-16 — Share Page playback fix

- Bug: All scenes on `/share/[id]` failed with "Scene Error: Illegal return statement".
- Root cause: Share route used `dbScene.jsCode` (Lambda-targeted) which embeds a top-level `return Component;` and strips `window.Remotion` destructuring. This is valid for `new Function(...)` execution in Lambda/preview, but illegal in ES module dynamic `import()` used by the share player.
- Fix: In `ShareVideoPlayerClient(Optimized)`, detect precompiled code and adapt it to ESM at runtime:
  - Prepend bindings: `const React = window.React;` and `const { ... } = (window.Remotion || {});`
  - Replace trailing `return Component;` with `export default Component;`
  - Ensure `window.React` and `window.Remotion` are populated from app imports (`import * as Remotion from 'remotion'`).
- Result: Share page correctly loads both TSX scenes (client-compiled) and precompiled JS scenes (Lambda-style) without server/DB changes.
- Next: Consider emitting a dual artifact in DB (Lambda `jsCode_function` + ESM `jsCode_esm`) to avoid client-side adaptation, and add an evaluation in `/src/lib/evals/` to assert share playback across artifact types.

## 2025-09-21 – Export QA automation plan
- Added `n8n-export-gemini-analysis.md` outlining a poll-based n8n workflow that watches `export_analytics` completions, uploads MP4s to Gemini for qualitative review, and emails the findings plus playback link.
- Confirmed Neon schema (exports + users) provides everything needed to hydrate analysis context without extra app changes; documented fallback paths if Gemini upload or email fails.

## 2025-09-21 – Bulk brand customization workflow
- Authored `bulk-brand-customization-workflow.md` outlining how n8n orchestrates brand scraping, project cloning, and render queueing for 200 personalized exports.
- Catalogued service gaps: service-token access for brand extraction, new `BulkBrandRenderer` helper, and render job throttling.

## 2025-09-21 – Token-driven brand variants
- Authored deep dive (`token-driven-brand-variants.md`) detailing how to shift from per-scene LLM rewrites to brand JSON driven renders, plus trade-offs across storage, orchestration, and testing.

## 2025-10-04 – Banana Image Studio failure audit
- Prod project `fdd4eece-c98a-4bd5-a3aa-5981ece6ada3` still ships a hero scene without `export default`; admin/share players import TSX via dynamic `import()`, so the module resolves with `module.default === undefined` and surfaces the red "Scene Compilation Error" pane (pulls from `AdminVideoPlayer`).
- `SceneCompilerService` rewrote the compiled JS to append `return BananaImageStudioPresentation`, masking the bug in the in-app preview, but the TSX persisted unmodified; we lack a guard that patches `export const` → `export default` during compilation.
- Latest render attempt (`bazaar-vid_exports.id = d5adef1d-56c9-42d0-99af-cc19db11e17f`) failed with `Easing is not defined`, which means the Lambda preprocess removed the `const { …, Easing } = window.Remotion` destructure without re-injecting the helper under the server-side scope. Need to confirm Easing is included in the Remotion bindings Sprint 108 planned.
- No auto-fix iteration was recorded (only two `scene_iteration` rows, both `create`), so the system never re-ran compilation after the export failure; consider triggering a silent fix when export telemetry sees missing defaults.
