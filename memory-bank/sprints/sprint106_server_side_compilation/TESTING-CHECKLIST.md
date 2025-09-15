# Sprint 106 — Phase 1 Testing Checklist

Purpose: Validate server-side compilation reliability across create → preview → export and document any edge cases.

## Pre‑requisites
- App runs locally (`npm run dev`)
- Env set (DB, OpenAI, R2 optional, Lambda for export as configured)
- A project with at least 1 generated scene and 2 templates

## Smoke Tests
1) Create Scene (Chat)
- Action: Prompt a new simple scene (e.g., “Show fast text animation”).
- Verify: Scene appears; preview renders; no duplicate declaration errors.
- DB: `js_compiled_at` is set within milliseconds of creation.

2) Add Templates (Multiple)
- Action: Add 2+ templates (e.g., FruitBG, Today1%).
- Verify: All scenes preview together; no conflicts; timeline stable.
- DB: Each template has compiled JS stored.

3) Edit Scene
- Action: Ask to “Make the title blue and bigger”.
- Verify: Preview updates; no regressions.
- DB: `js_code` updated; `js_compiled_at` refreshed.

4) Export (Lambda)
- Action: Export the project from the preview header.
- Verify: Progress reaches 100%; file downloads and plays.
- Check: No wrapper/namespace errors during export logs.

## Edge Cases
5) Duplicate Component Names
- Setup: Two scenes each defining `Button`, `Card`, etc.
- Verify: No cross‑scene identifier collisions; preview/export fine.

6) Missing Export / Function Compatibility
- Ensure: Compiled JS ends with `return ComponentName;` for Function constructor.
- Verify: No runtime error like “undefined is not a function”.

7) Top‑Level Remotion Destructuring
- Confirm: Scenes keep `const { AbsoluteFill, ... } = window.Remotion;` at top‑level.
- Verify: Wrapper does NOT re‑inject this; no duplicate const error.

8) Syntax Errors / Broken Code
- Setup: Introduce known small syntax error, then revert.
- Verify: Auto‑fix flow is silent (Sprint 98), or the system yields a safe error and recovers.

## Performance Spot‑Checks
- Record: Time from scene creation to previewable state (target: seconds; JS compile is ms‑level)
- Confirm: `js_compiled_at` is near scene creation time.

## Rollback Safety
- If issues: Ignore `js_code` in client (fallback path still compiles on client for old scenes).

## Data Capture Template
- Project:
- Scenes: [names, frames]
- Actions performed:
- Results: [pass/fail + notes]
- Export file URL (if applicable):

