# Sprint 108 - TODO

## Icon Pipeline (Preprocess)
- [ ] Implement hybrid icon inliner: local package → Iconify HTTP API → placeholder SVG
- [ ] Add post-transform validation: remove any remaining `window.IconifyIcon` refs
- [ ] Inline placeholder SVG for unknown/missing icons with clear data-attributes
- [ ] Add simple cache for fetched SVGs (memory + optional R2 backing)

## UI Alignment
- [ ] Gate icon panel to preferred sets; badge others as "may render as placeholder"
- [ ] Document supported sets and fallback behavior in tooltip/help

## Runtime Safety & Isolation
- [ ] Verify `SceneErrorBoundary` containment on synthetic icon failures
- [ ] Keep runtime Iconify shim in Lambda site as last resort

## Deployment
- [ ] Redeploy Remotion site with updated `MainCompositionSimple` and shim
- [ ] Update `REMOTION_SERVE_URL` and restart app

## Tests & Monitoring
- [ ] Add tests: valid icon, unknown set, missing icon name → ensure no React #130
- [ ] Log metrics: icons requested, inlined, placeholder count per export

## Acceptance
- [ ] Export completes with mixed valid/invalid icons (placeholders inline)
- [ ] Zero `window.IconifyIcon` in jsCode sent to Lambda
- [ ] No React #130 in Lambda logs
