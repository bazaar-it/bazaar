# Template Onboarding Strategy (Sprint 124)

## Context
- New-user drop-off: ~400 signups in the last 2–3 weeks churn after 1–2 prompts.
- Users expect polished output from a single prompt; current "generate from scratch" flow needs multiple iterations.
- Sprint 124 explores a template-first approach that upgrades first-touch quality without adding orchestration overhead for the user.

## High-Level Concept
Deliver a multi-scene, 30s video with music on the very first interaction by:
1. Selecting a full video template (5–8 scenes) that best matches the brand vertical and story arc.
2. Extracting brand signals (visual + narrative) from one of: 
   - A provided URL.
   - Uploaded screenshots or color palettes.
   - Plain-text prompt (fallback when no assets supplied).
3. Running **edit**-mode LLM calls on every scene in the template to personalize copy, visuals, and pacing without breaking the underlying timeline.

## Why Templates Instead of Net-New Generation
- Guarantees professional pacing, transitions, and soundtrack.
- Eliminates cold-start hallucinations—LLM edits in controlled scaffolds.
- Lets us align story beats (problem → solution → proof → CTA) out of the box.
- Gives measurable quality gains for the 85% of users who only try a single prompt.

## Template Library Requirements
- Curate 5–8 production-ready, multi-scene templates covering common SaaS/product stories.
- Every template exposes structured metadata per scene:
  - Scene role (hook, problem, solution, proof, CTA).
  - Editable regions (headline, supporting copy, imagery slots, accents).
  - Timing + transition guardrails.
  - Music bed compatibility notes.
- Templates remain deterministic—LLM edits must not reorder layers or break animation bindings.

## Brand Data Extraction
### URL Ingestion Path
- Headless crawler captures:
  - Full-page screenshots (hero, feature sections, testimonials).
  - CSS color tokens and font families.
  - Structured copy: headlines, value props, feature bullets, social proof, CTA language.
  - Brand tone hints (formal vs playful) via semantic analysis.
- Single JSON payload (`BrandProfile`) feeds all downstream edits.

### Asset Upload Paths
- Screenshots: run OCR + semantic segmentation to pull copy, detect UI motifs.
- Color palettes: compute primary/secondary/neutral swatches.
- Text-only prompt: fall back to LLM brand brief generator to synthesize missing fields.

## LLM Edit Pipeline
1. **Template Selection Agent** (optional future step): matches `BrandProfile` to best template using rules + vector similarity.
2. **Scene Edit Planner**: builds a per-scene plan so narrative progresses without repetition. Outputs a map of `{sceneId: editDirectives}`.
3. **Edit Executor**: for each scene, call the existing edit tool (`/src/tools/edit/edit.ts`) with:
   - Scene source code + metadata.
   - `BrandProfile` context.
   - Scene-specific directive from planner (what to emphasize, what assets to swap, voice/tone).
4. **Concurrency Considerations**:
   - Option A: Single agent edits sequentially, preserving memory of previous outputs (safer, slower).
   - Option B: Planner + parallel executors (faster). Requires shared context package so scenes stay consistent and non-redundant.
   - Initial recommendation: use planner + parallel execution with a shared `StorySynopsis` payload each executor references to avoid drift.
5. **Validation Pass**: ensure no scene duplicated copy, transitions intact, assets resolved.

## Guardrails & Instrumentation
- Diff-based lint to confirm edits only touch allowed slots.
- Story coherence check: verify each scene covers unique beats.
- Telemetry for template choice, edit success rate, time-to-first-video.
- Backstop: if any scene edit fails, fall back to original template copy and log incident.

## Open Questions
- Do we let the planner revise earlier scenes if later scenes demand setup (requires iterative loop)?
- How do we surface template provenance to the user (transparency vs magic)?
- Should we pre-render previews per template/brand combo or rely on on-demand Remotion renders?
- What music licensing constraints apply when reusing beds across brands?

## Next Steps for Sprint 124
1. Inventory existing multi-scene templates; evaluate suitability and metadata completeness.
2. Define the `BrandProfile` schema and extraction pipeline (URL + asset upload).
3. Prototype planner prompts that distribute narrative beats across scenes.
4. Decide on sequential vs parallel edit execution after running evals on both.
5. Document evaluation metrics: user satisfaction (first prompt NPS), completion rate, edit error rate.

## Deliverable for Amy (LLM Agent)
Provide this brief so the agent understands:
- The user churn and high-expectation context.
- The template-first personalization strategy.
- The need for precise brand-data extraction feeding edit calls.
- The orchestration debate (sequential vs parallel) and recommendation to test planner + parallel executors with shared synopsis.
- The guardrails and instrumentation required to keep templates stable while increasing personalization speed.
