# Sprint 108 - TODO

## Icon Pipeline (Preprocess)
- [x] Implement hybrid icon inliner: local package → Iconify HTTP API → placeholder SVG
- [x] Add post-transform validation: remove any remaining `window.IconifyIcon` refs
- [x] Inline placeholder SVG for unknown/missing icons with clear data-attributes
- [x] Add cache for fetched SVGs (memory + R2 backing)
- [x] Prevent false positives (times/emoji) in icon extraction
- [x] Ensure `__InlineIcon` runtime is injected whenever replacements introduce it

## UI Alignment
- [ ] (Defer) Document supported sets and fallback behavior in docs (no gating)

## Runtime Safety & Isolation
- [x] Verify `SceneErrorBoundary` containment on synthetic icon failures
- [x] Keep runtime Iconify shim in Lambda site as last resort

## Deployment
- [x] Redeploy Remotion site with updated `MainCompositionSimple` and shim
- [x] Update `REMOTION_SERVE_URL` and restart app

## Tests & Monitoring
- [ ] Add tests: valid icon, unknown set, missing icon name → ensure no React #130
- [ ] Add tests for time-string arrays and dynamic icon arrays → ensure no unwanted API calls and runtime is present
- [x] Log metrics: icons requested, inlined, placeholder count per export

## User Notification (New)
- [ ] Collect render warnings per scene (icons/media/fonts) during preprocess
- [ ] Persist warnings on export and expose via getRenderStatus
- [ ] Show post‑export summary (no UI redesign; simple modal/toast)
- [ ] “Copy email to markus@bazaar.it” with prefilled diagnostics + suggestions

## Acceptance
- [ ] Export completes with mixed valid/invalid icons (placeholders inline)
- [ ] Zero `window.IconifyIcon` in jsCode sent to Lambda
- [ ] No React #130 in Lambda logs
