# Sprint 108: One Last Export – Reliable Export Pipeline

## Goal
Ship a rock-solid export experience where a single problematic icon or scene never breaks the whole render. Ensure all icons selected in the UI are either fully supported and inlined or safely degraded, and scenes are sandboxed so the rest of the video completes.

## Why
- A single unknown icon can trigger React #130 and break the entire export.
- Users can browse far more icons in the UI than our renderer guarantees.
- We need guaranteed inlining or graceful fallback, plus scene isolation.

## Scope
- Hybrid icon inlining in preprocess (local packages → Iconify HTTP API → placeholder SVG)
- Post-transform validation (no `window.IconifyIcon` remains)
- Small runtime Iconify shim (last-resort safety)
- Scene isolation verification (bad scene shows placeholder, others render)
- UI gating/badging for icon sets vs export support
- Remotion site redeploy and configuration alignment (REMOTION_SERVE_URL)
- Basic caching of fetched SVGs

## Non-Goals
- Full server-side compilation rollout (tracked in Sprint 106)
- New media/component features unrelated to export reliability

## Success Criteria
- 0 occurrences of React error #130 from Iconify during exports
- Exports complete even when one or more icons are missing/unknown (placeholders inline)
- No `window.IconifyIcon` references present in code sent to Lambda
- Scene-level failures are contained; remaining scenes still render
- UI accurately reflects export support (no silent breakage)
