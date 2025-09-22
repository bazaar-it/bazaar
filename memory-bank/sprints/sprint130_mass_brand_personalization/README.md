# Sprint 130: Mass Brand Personalization

## Goal
Turn a single mastered Bazaar demo into hundreds of client-branded variants without per-export LLM edits. Scenes consume a `BrandTheme` JSON, variants are generated via render props, and orchestration pipelines batch-render MP4s for B2B outreach.

## Why
- Unlock B2B personalization: sales teams deliver “your product, in your colors” demos to 50–500 prospects.
- Slash compute cost and latency versus rerunning LLM edits per prospect.
- Centralize variant management with deterministic code + theme JSON.

## Scope
1. **Theme Infrastructure**
   - Define `BrandTheme` contract; build provider/hooks for Remotion scenes.
   - Refactor master templates to remove hard-coded styling.
2. **Variant Generation**
   - Implement `BulkBrandRenderer` service using brand JSON props.
   - Store variant configs + outputs separate from core projects.
   - Integrate render queue with per-variant metadata + throttling.
3. **Orchestration UX**
   - Build “Personalize for Clients” dashboard (CSV/JSON upload, status, downloads).
   - Optional n8n/worker orchestration for batch processing.
4. **Reliability & QA**
   - Snapshot/eval tests for themed renders.
   - Brand extraction fallbacks, caching, rate limiting.
   - Analytics and audit logs per variant.

## Out of Scope
- New scene types or animation features.
- General chat/editor UI changes unrelated to the bulk personalization flow.
- Pricing/billing work (tracked separately).

## Links
- `token-driven-brand-variants.md`
- `bulk-brand-customization-workflow.md`
- `n8n-export-gemini-analysis.workflow.json`
