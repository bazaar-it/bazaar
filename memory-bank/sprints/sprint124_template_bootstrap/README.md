# Sprint 124: Template Bootstrap Onboarding

## Goal
Deliver first-session videos that feel production-ready by reusing curated multi-scene templates and personalizing them with brand data extracted from a single prompt, URL, or asset upload.

## Why
- 400+ new users churned after only 1–2 prompts in the past few weeks.
- They expect a polished video immediately; the current scratch-generation loop needs too many iterations.
- Using template edits instead of net-new generation keeps pacing, transitions, and soundtrack intact while still reflecting the user's brand.

## Scope
1. Document the template-first onboarding strategy and decision tree for asset inputs (URL, screenshots, colors, plain prompt).
2. Specify the `BrandProfile` extraction pipeline (headless crawl, OCR, palette detection, fallback prompt synthesis).
3. Define how multi-scene templates expose editable regions, scene roles, and guardrails for LLM edit calls.
4. Evaluate orchestration options (sequential vs planner + parallel executors) and recommend guardrails/telemetry.
5. Outline success metrics and evaluation hooks to validate higher first-touch quality.

## Success Metrics (targeted)
- Increase first-prompt video completion rate (baseline TBD) by focusing on template edits.
- Capture actionable telemetry for template selection accuracy and story coherence.

## Key Docs
- `2025-09-29-template-onboarding-strategy.md`
- `TODO.md` (upcoming tactical tasks)
- `progress.md` (running log)
