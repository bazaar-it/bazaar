# Prompt Audit — Code Generator + Code Editor

Date: 2025-09-11
Sprint: 111 — Motion Graphics Principles
Scope: `src/config/prompts/active/code-generator.ts`, `src/config/prompts/active/code-editor.ts`

## Executive Summary
Both active prompts have solid technical guardrails (no imports, window globals only, duration exports, naming discipline). However, they lack an explicit “quality rubric” and deterministic guardrails for premium, consistent motion design. The result is acceptable but often flat compositions, inconsistent depth/stagger/easing, and occasional readability issues on image backgrounds. Below are surgical, insertion-ready improvements that raise the floor of quality without encouraging bloat.

## Strengths (Keep)
- Strong safety rails: window.Remotion-only, code-only responses, duration exports, scoping patterns.
- Clear image intent model (embed vs recreate) and format awareness.
- Good duration guidance and typography baseline.

## Gaps Observed
1. No explicit premium motion rubric (anticipation, stagger, depth, parallax, composition safety).
2. Readability: text-over-image lacks mandated overlays/contrast guardrails.
3. Depth: no default parallax/micro-motion; scenes feel flat.
4. Easing consistency: no categorized presets for hero vs secondary.
5. Multi-image layouts: no standard grid/stagger pattern.
6. Determinism not mandated: randomness or volatile timing can sneak in.
7. Generator doesn’t explicitly require width/height usage from `useVideoConfig()`; editor does.
8. Icon fallback missing (ties to Sprint 108 reliability).
9. No silent self-check forcing duration/export/scoping compliance at the end.
10. Sprint 116 signals (imageAction/imageDirectives) not explicitly honored if present.

## Code Generator — Insertions (Exact, ready to paste)

Add to HARD PROHIBITIONS
- “NEVER use Math.random(), Date.now(), setTimeout, requestAnimationFrame, fetch, or any non‑deterministic source. All animations must be fully deterministic.”

Under REQUIRED VARIABLE AND FUNCTION NAMES
- “Always call `useVideoConfig()` and read `{ width, height, fps }`. All layout calculations must respect `width/height` for the current format.”

New section: QUALITY RUBRIC (Apply Silently)
- “Before outputting code (no extra text), ensure:
  - Depth: background parallax (scale 1.03–1.08) or 4–8px slow translate over the scene; foreground micro‑motion (1–3px translate) where appropriate.
  - Stagger: reveal grouped/list elements with 40–120ms offsets (≈1–4 frames @ 30fps), sequenced consistently.
  - Easing: hero elements use `spring({ frame, fps, config:{ damping:20, stiffness:170 }})`; secondary use `{ damping:18, stiffness:140 }`; clamp with interpolate.
  - Contrast: when text overlays an image/video, add a semi‑transparent gradient overlay (black→transparent, 0.25–0.35 alpha) behind text.
  - Composition: maintain 5–8% safe margins from edges; align to an 8px grid; never touch edges.
  - Duration: total frames match content beats; never default to 180 frames.”

// Removed: Icon fallback belongs to runtime/post-transform, not the generator prompt.

New section: MULTI‑IMAGE LAYOUTS
- “For ≥2 images:
  - Grid: 8–16px gap; portrait 2 cols, landscape 3 cols, square 2–3 cols depending on width.
  - Tiles: 8–12px radius, subtle shadow rgba(0,0,0,0.18), objectFit: 'cover' for visual pieces, 'contain' for UI.
  - Stagger each tile’s entrance by 4–8 frames.”

Image handling (EMBED)
- “If using an image as background, set `objectFit:'cover'` and add a backdrop gradient overlay (black→transparent, 20–35% alpha) behind text for legibility.”

Honor Sprint 116 signals
- “If `imageAction` or `imageDirectives` are provided in context, follow them exactly (override heuristic keyword detection).”

## Code Editor — Insertions (Exact)

CRITICAL RULES
- “Never introduce randomness (Math.random, Date.now) or timers; animations must be deterministic.”
- “Any new top‑level variables must end with the existing ID suffix to avoid redeclaration collisions.”

INTELLIGENT DURATION WHEN EDITING
- “If polishing animations (user asks to ‘make it better’), adjust by the minimal amount necessary (typically +10–30 frames) to fit added beats.”

New section: POLISH WHEN ASKED (Preserve structure)
- “If the request is to improve motion/quality:
  - Add subtle background parallax (scale 1.03–1.05) on hero layers with `spring({ damping:20, stiffness:170 })`.
  - Stagger grouped elements by 3–6 frames using consistent spring presets.
  - Ensure text overlaying images has a gradient or solid overlay (rgba(0,0,0,0.25–0.35)).
  - Tighten typography: `lineHeight 1.15–1.25`; maintain 5–8% safe margins.”

IMAGE HANDLING
- “If converting any image to background, keep `objectFit:'cover'` and add gradient overlay for legibility; do not recompose unless asked.”

Respect Sprint 116 signals
- “If the generated scene used `imageAction`/`imageDirectives`, preserve that intent unless explicitly overridden by the user.”

## Rationale
- Determinism produces consistent preview/export behavior and reduces flakiness.
- Depth/parallax and staggered reveals are low‑cost, high‑impact upgrades to perceived quality.
- Contrast overlays prevent common “looks great but unreadable” failures.
- Standard multi‑image patterns reduce ad‑hoc layout quality variance.
- Explicit width/height usage improves cross‑format composition.
- Icon fallback is better handled by post-transform validation or a runtime wrapper (see Sprint 108 “hybrid inlining”).

## Validation Plan
- Add evals in `src/lib/evals/` for:
  - Readability: text-on-image scenes must render overlays; detect lack of overlay via heuristics in compiled code.
  - Determinism: scan generated code for banned APIs (random, timers).
  - Duration correctness: parse duration export vs expected beats.
  - Multi-image: when n ≥ 2 URLs present, ensure grid & stagger present.
- A/B a small set of prompts and compare user approval time and edit rate.

## Rollout
1. Patch prompts with insertions above (code‑only changes, no runtime risk).
2. Runtime: keep icon fallback in the hybrid inlining/validation layer (not in the prompt).
3. Lower temperature or narrow top‑p in “premium” contexts (config‑side, optional).
4. Add a small internal few‑shot for generator that demonstrates the rubric.
5. Monitor evals and production telemetry; iterate thresholds for overlay alpha, stagger, and parallax scale.

## Open Questions
- Do we want a theme/style toggle (e.g., “minimal”, “lively”) to pick easing/stagger presets? Could be a non‑user‑visible hint.
- Should we add a compact “motion blueprint” JSON preamble for complex scenes (kept internal), or continue purely code‑first?
