# Demo Script — Server‑Side Compilation (5–7 minutes)

## Audience
Product/engineering teammates and stakeholders.

## Setup
- Project with 3–4 scenes (mix of templates + generated).
- Open DB viewer or have SQL snippets ready.

## Narrative Outline
1) Context (30s)
   - We had duplicate declaration crashes in preview/export.
   - Phase 1 moves compilation to the server and removes wrapper duplication.

2) Create + Preview (1–2m)
   - Create a new simple scene via chat.
   - Show instant preview; no errors.
   - Explain: compilation happened once on the server (ms), JS persisted.

3) Templates Together (1m)
   - Add 1–2 templates.
   - Show all scenes in the same project preview without collisions.

4) Export (1–2m)
   - Trigger export from header.
   - Show progress → auto download; open the file.
   - Key point: Same compiled JS powers preview and export.

5) Evidence in DB (1m)
   - Run SQL to show `js_compiled_at`, counts, recent compiles.
   - Show TSX vs JS difference: auto‑added `return ComponentName;`.

6) Why It’s Safe (30s)
   - Additive, reversible, consistent; fallback path exists.

7) What’s Next (30s)
   - Phase 2: artifact version, metrics, parameterized execution.

## Closing Line
“We went from brittle, client‑only compilation to a clean, consistent server‑side model. Preview and export now run on the same stable artifact, and users can create and share videos reliably.”
