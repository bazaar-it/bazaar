# Runbook — Scene Compilation/Execution Issues

Use this when preview or export fails after Phase 1.

## Symptoms → Likely Causes
- Error: "Identifier '...Remotion' has already been declared"
  - Wrapper re‑injection (regression) or duplicate top‑level in scene code
- White screen / no render
  - JS not compiled; `js_code` missing; Function returned undefined
- Export fails but preview works
  - Execution context mismatch (rare); Lambda logs helpful

## Quick Checks (Read‑Only)
1) Confirm compilation timestamps
- Query: scenes for `js_compiled_at IS NOT NULL` and recent timestamps
2) Compare TSX vs JS tail
- JS should end with `return ComponentName;`
3) Look for duplicate destructure
- Scene should contain a single top‑level `const { ... } = window.Remotion;` and wrapper should not add one.

## Safe Remediation
- If a single scene is broken: Re‑edit (small change) to trigger recompile; verify `js_compiled_at` updates.
- If multiple scenes: Temporarily enable client fallback path for those scenes only (ignore `js_code`).
- If wrapper regression suspected: Revert to last known good wrapper that does not inject Remotion destructure.

## What to Capture for Triage
- Project ID, Scene ID(s)
- Timestamps for creation and `js_compiled_at`
- Last action (create/edit/template add)
- Preview console errors and export job logs

## Escalation
- If errors persist after recompile: capture the scene’s TSX/JS diffs and open a ticket in `TICKETS.md` with reproduction steps.

