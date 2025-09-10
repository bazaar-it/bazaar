# Design — Unified Image Workflow (First Principles)

## Goals
- No separate image tool. Brain decides add/edit and per-asset `imageAction` (embed/recreate).
- Sonnet 4 multimodal performs codegen/edit with strict, minimal prompts.
- Metadata at upload time informs decisions (logo/ui/photo/colors/text).

## Data Contracts
- Brain → Router decision (already present + additions):
  - toolName: 'addScene' | 'editScene' | ...
  - toolContext:
    - userPrompt
    - targetSceneId? (for edit)
    - imageUrls?: string[]
    - imageAction?: 'embed' | 'recreate'  // global default when single image
    - imageDirectives?: Array<{ url: string; action: 'embed'|'recreate'; target?: 'newScene' | { sceneId: string; selector?: string } }>
    - referencedSceneIds?, videoUrls?, audioUrls?, assetUrls?, modelOverride?, etc.

Note: `imageDirectives` supersedes `imageAction` when provided (handles mixed intent for multiple images). For now, we implemented `imageAction`; `imageDirectives` is in TODO.

- Upload-time Asset Metadata (phase 1 tags in `assets.tags`):
  - kind:logo/ui/product/photo/illustration/chart/text-only
  - layout: dashboard/screenshot/hero/banner/mobile-ui/icon
  - color:#RRGGBB (top 3)
  - hasText
  - hint:embed or hint:recreate

## Brain Input (ContextBuilder)
- Include recent assets summary with tags and quick examples (last N + referenced by name).
- If `sceneUrls` attached, emphasize edit priority.
- If multiple images in one prompt, instruct to produce `imageDirectives` (per-asset action), not only a single `imageAction`.

Brain prompt specifics (current)
- `src/config/prompts/active/brain-orchestrator.ts` now:
  - Requires `imageAction` when images are present (embed|recreate) and removes the separate image tool from choices.
  - Keeps attached `sceneUrls` as hard priority for edit decisions.
  - Next: add examples and explicit schema for `imageDirectives[]` to reduce ambiguity for multi-image prompts.

## Decision Flow (High Level)
1. If `sceneUrls` present → prefer edit; set `targetSceneId`.
2. If multiple images → produce `imageDirectives` per image using metadata + phrasing.
3. If single image → set `imageAction`:
   - phrasing: recreate/replicate/exact → 'recreate'
   - phrasing: insert/add/use/place/put → 'embed'
   - metadata: kind in {ui, chart} may bias toward 'recreate'; kind in {logo, photo, product} may bias toward 'embed'
4. toolName:
   - add vs edit based on scene targeting; if none, add.

## Tool Behavior
- AddTool:
  - imageAction='embed' → Insert <Img src> with fit, size derived from canvas + hint; minimal motion only if asked.
  - imageAction='recreate' → Do not display original; recreate with shapes/text/gradients and animate.
  - Multi-image → follow `imageDirectives` (mix of embed+recreate).
- EditTool:
  - imageAction='embed' → Insert <Img> into specified container/slot; allow selector hints.
  - imageAction='recreate' → Style transfer on target elements (colors, radius, font, spacing); no original image displayed.

Implementation notes
- AddTool: image generation is unified behind a single multimodal path; we only toggle the mode line in the system prompt to pick embed vs recreate.
- EditTool: we reuse CODE_EDITOR as the base system prompt and append the technical base + mode line; user content supplies existing code + images.

## Prompt Strategy (Sonnet 4 multimodal)
- Embed (minimal):
  - System: Strict rules to insert exact <Img src>, position/fit, no story narration.
  - User: short instruction + image_url(s) + canvas dims + optional selector hints.
- Recreate (strict):
  - System: Rules from `IMAGE_RECREATOR` adapted for Sonnet 4; scoping, duration, globals, no image display.
  - User: instruction + image_url(s) + recreate-only constraints.
- Edit variants add: existing code block, target hints, and change scope.

Modularization structure
- Base: `src/config/prompts/active/bases/technical-guardrails.ts` — single source for technical requirements.
- Modes: `src/config/prompts/active/modes/*.ts` — small deltas (embed vs recreate) with no intent language.
- Tools: assemble { base + mode + canvas } as system, send user content (instruction, dims, existing code, images).

Why this reduces maintenance
- If we add capabilities (e.g., avatars/globals), we update the Base once; Add/Edit automatically inherit.
- If we refine embed/recreate behavior, we tweak the Modes once; no need to touch many call sites.

## Multi-image Semantics
- Brain outputs `imageDirectives[]`; router splits per directive when helpful or passes vector to tools.
- Tools process in order (recreate first to establish structure, then embed overlays).

Open question: orchestration vs. single call
- For complex multi-image edits, we may execute multiple, targeted EditTool passes rather than a single monolithic request. This keeps diffs and scope precise.

## Evaluation
- Cases: single-image add (embed/recreate), edit (embed/recreate), mixed multi-image, ambiguous phrasing.
- Metrics: determinism (same output across runs), fidelity (visual match), compile rate, duration correctness.

Monitoring/Logs
- Router logs show tool + imageAction + hasImages.
- Add/Edit tools log mode, target scene, and (for edits) element targeting data.

## Migration
- Already soft-deprecated `imageRecreatorScene` → fully remove after telemetry shows zero usage.
- Replace legacy prompt fragments; keep unified prompt files.
