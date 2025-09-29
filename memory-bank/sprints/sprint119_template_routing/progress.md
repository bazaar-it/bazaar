# Sprint 119 – Template Routing Improvements

## 2025-09-30 – Template routing audit
- Deep dive across brain template context, template matcher, and website selector; captured findings + opportunities in `analysis/2025-09-30-template-routing-deep-dive.md`.
- Highlighted gating that limits template usage to first scenes and deterministic beat routing that still picks the first template in every bucket.
- Noted metadata fragmentation and missing telemetry as blockers for improving smart routing.

## 2025-09-30 – Canonical metadata pilot ticket
- Authored pilot plan for unifying metadata using five highest-usage DB templates, covering schema, projections, integration steps, and success criteria in `analysis/2025-09-30-canonical-metadata-pilot.md`.

## 2025-09-30 – Canonical module scaffolding
- Introduced `src/templates/metadata/canonical.ts` to aggregate registry + DB templates, exposing brain and server projections with the pilot DB entries.
- Updated `TemplateMatchingService` and server `template-metadata` utility to consume the canonical views.

## 2025-09-30 – Second batch metadata drafting
- Documented natural-language metadata for the next five high-usage DB templates (notifications + text effects) in the canonical pilot plan before integration.

## 2025-09-30 – Third batch metadata wired
- Added corporate credit card, gradient globe, pill bar chart, text sparkles, and portrait Airbnb templates to the canonical metadata module and updated the pilot doc with detailed descriptors.

## 2025-09-30 – Fourth batch metadata wired
- Drafted and integrated TBPN intro, responsive text animation, vibe-coded finance app, Hello Circles, and Log-in templates into the canonical metadata system and documentation.

## 2025-09-30 – Fifth batch metadata wired
- Added Shazam animation, Testimonials, UI Data Visualisation, 50+ Integrations, and Bar Chart DB templates to both the pilot analysis and canonical metadata list.

## 2025-09-30 – Coverage tracking
- Generated `template-metadata-coverage.md` listing every production template with ID, supported formats, and checkbox status for canonical metadata completion.

## 2025-09-30 – Sixth batch metadata wired
- Documented and added Toggle, Banking App, Blur, Gradient globe (portrait), and I want to break free templates to the canonical metadata set and updated the coverage tracker.

## 2025-09-30 – Seventh batch metadata wired
- Captured metadata for portrait Log In, Message notification, Scale down text effect, Screenshot intro, Text & UI Animation, and Text Shimmer (portrait), then synced canonical module and coverage.

## 2025-09-30 – Eighth batch metadata wired
- Documented Word Replace, Yellow Bar Chart, Animated UI (portrait), Credit Card Expenses, and Customer Testimonials (portrait), added them to the canonical module, and refreshed the coverage checklist.

## 2025-09-30 – Ninth batch metadata wired
- Added portrait Google AI Search Box, Growth Graph, Homescreen Notifications, Message, and Pill Chart metadata to canonical and updated the coverage tracker.

## 2025-09-28 – Sanitized dataset groundwork
- Logged analysis in `analysis/2025-09-28-sanitized-template-dataset.md` outlining how to swap the SFT generator over to sanitized template code (validator + scene compiler pipeline).
- Extended `scripts/generate-template-code-sft.ts` to run every template TSX through `validateAndFixCode` and `SceneCompilerService.compileScene` before emitting JSONL entries; failures now surface as explicit sanitization skips.
- Added dataset stats logging for sanitizer failures so we can track which templates still need upstream fixes when the generator runs.
- Protected existing datasets by auto-writing to a fresh directory (`v1`, `v1-1`, `v1-2`, …) whenever the chosen tag already has contents.

## 2025-10-01 – Code generator fine-tune scaffolding
- Authored `analysis/2025-10-01-template-code-generator-finetune-sft.md` documenting the SFT plan (prompt synthesis, dataset shape, validation) for replacing the manual code-generator prompt.
- Seeded `data/fine-tuning/template-code-generator/` with override hooks, README, and output staging for JSONL splits.
- Built `scripts/generate-template-code-sft.ts` plus npm script `data:code-sft` to pull DB TSX code + canonical metadata into train/validation/test JSONL (supports dry-run + deterministic seeds).

## 2025-10-01 – Code fine-tune prompt refresh
- Pointed the TSX dataset generator at the curated prompt sets in `metadata_prompt_dataset.jsonl` / `metadata_finetune_dataset.jsonl`, normalizing format hints into natural briefs and falling back to metadata synthesis only when we lack coverage.
- The generator now logs which templates still rely on fallback prompts (when run with --verbose) so we can author missing scenarios before training.
- Added a local TSX override for `pill-shaped-bar-chart` so training stays complete until the prod `tsx_code` is restored.
- Limited curated prompt usage to a single entry per template in `scripts/generate-template-code-sft.ts` so the fine-tune doesn’t overweight canonical template code. Overrides can still add explicit variants if needed.

## 2025-09-28 – Sanitized dataset generated
- Ran the updated generator against the full canonical set; sanitized TSX for all 51 templates landed in `data/fine-tuning/template-code-generator/v1-1` with 40/5/6 splits and zero sanitizer failures.
- Console output showed the validator still flagging missing exports pre-compiler, but `SceneCompilerService` returned clean modules for every template, matching the dataset plan.

## 2025-09-28 – Message-only dataset export
- Switched the generator to write chat-only JSONL alongside `*.meta.jsonl` descriptors, removing template metadata from the training files while preserving context for analysis.
