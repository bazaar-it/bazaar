# 2025-09-27 – Template Panel Compilation Regression

## What we saw
- Opening the Templates panel on `/projects/[id]/generate` creates dozens of Remotion `<Player>` instances at once.
- Each card runs `sucrase.transform` on the template TSX in the browser if no pre-rendered thumbnail exists.
- Prod database query sample (latest 5 rows) shows `js_code` and `js_compiled_at` are `NULL`, so the client never receives a compiled artifact.
- Sanitization SQL scripts from 2025-09-14 explicitly set `js_code`/`js_compiled_at` to `NULL` after rewriting risky backticks, but no follow-up job repopulated them.

## Impact
- Heavy CPU usage causes the panel to freeze or crash when it mounts.
- Users see spinner/blank template cards while compilation finishes.
- Conflicts with Sprint 106 goal of server-side compilation everywhere; trust in precompiled artifacts is broken.

## Plan of record
1. **Backfill** – Recompile every template with missing `js_code` via `sceneCompiler.compileScene` and persist `js_code`, `js_compiled_at`, `compilation_error`.
2. **Keep fresh** – Update template creation/update flows to always write compiled JS, and add a sanity check in verification scripts.
3. **API payload** – Expose compiled JS (plus version metadata) from `templates.getAll` so clients can rely on it.
4. **Client update** – Change `TemplatesPanelG`/mobile variant to consume compiled JS and avoid mass Remotion mounts until preview is requested.

## Open questions
- Do we want IndexedDB/localStorage caching keyed by `templateId + js_compiled_at` to avoid refetch on every open?
- Should we generate static video/GIF thumbs server-side to skip running Remotion players in the grid entirely?
