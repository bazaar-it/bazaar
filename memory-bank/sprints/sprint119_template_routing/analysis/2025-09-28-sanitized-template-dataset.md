# 2025-09-28 – Sanitized Template Dataset plan

## Context
- Current SFT dataset generator (`scripts/generate-template-code-sft.ts`) pulls `tsx_code` directly from `public."bazaar-vid_templates"`.
- Several legacy templates in the DB still contain raw, pre-scene-compiler code (e.g. `React.createElement` wrappers, missing `export default`, trailing `return Scene_X`).
- Training on the raw blobs teaches the model to output code that still requires the post-processing stack, defeating the goal of producing copy/paste-ready scenes from the LLM.

## Goal
Emit the same sanitized TSX module that Preview/Export actually run after validators + `SceneCompilerService` have finished.

## Approach
1. Extend the dataset generator so every template TSX is passed through the existing code validation + scene compilation pipeline before it is written to JSONL.
   - Use `validateAndFixCode` to strip markdown/preambles and ensure baseline exports/imports.
   - Call `SceneCompilerService.compileScene()` with a stable project/scene id to capture any identifier conflict fixes the compiler applies. The returned `tsxCode` represents the sanitized module.
   - Prefer `result.tsxCode` (post-fix TSX). If compilation fails, surface the error and skip that template; we do not want fallback placeholders in the dataset.
2. Preserve the existing overrides flow (`LOCAL_TEMPLATE_CODE_OVERRIDES`) in case a template is still missing in the DB, but run those overrides through the same sanitizer path for consistency.
3. After wiring the sanitizer, regenerate the dataset (`npm run data:code-sft`), check the `.upload.jsonl` diff, and note any templates that were skipped due to hard failures.
 4. Prevent accidental overwrites by letting the generator pick a fresh directory (e.g., `v1-1/`, `v1-2/`) when a tagged folder already contains files.
 5. Primary train/validation/test JSONL now contain only the chat messages; metadata is saved separately in matching `*.meta.jsonl` files so fine-tune uploads stay clean.
 6. Future: add an integration test that feeds a known raw template into the generator helpers and asserts the emitted code starts with `export default` + `export const durationInFrames`.

## Open Questions
- Do we also want to attach the compiled JS in the dataset metadata for future distillation? Not required for this pass.
- Should we store sanitizer logs per template for auditing? Could be added later if needed.
