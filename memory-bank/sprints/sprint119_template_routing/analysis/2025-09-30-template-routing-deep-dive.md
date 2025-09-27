# 2025-09-30 – Template Routing Deep Dive

## Current Routing Surfaces
- **Context builder** now injects template examples when `shouldAddTemplateContext` allows it, then loads code via `templateLoader` so the add tool can ask the LLM to copy/adapt real scenes (`src/brain/orchestrator_functions/contextBuilder.ts:447`).
- **Add tool / Code generator** explicitly tells the model to copy one of the supplied templates verbatim and only adjust content (`src/tools/add/add_helpers/CodeGeneratorNEW.ts:560`).
- **Website pipeline** still relies on the beat→template map inside `TemplateSelector`, selecting the first surviving option after lightweight brand filtering (`src/server/services/website/template-selector-v2.ts:90`).

## Key Findings
1. **Template context rarely fires after the first scene** – we only add template examples when a project has zero scenes or a prompt includes a small keyword list (“style”, “similar”, etc.), so multi-scene workflows mostly bypass the template system (`src/brain/orchestrator_functions/contextBuilder.ts:507`).
2. **Matcher scores depend on literal string overlap** – `TemplateMatchingService` just lower-cases the prompt and looks for exact keyword / phrase matches, so anything phrased differently (“dashboards that pulse”) can return score 0 even if we have perfect templates (`src/services/ai/templateMatching.service.ts:28`).
3. **Website journey routing still deterministic** – even after adding brand filters, `TemplateSelector` iterates the static beat list and returns on the first template whose TSX loads successfully (`src/server/services/website/template-selector-v2.ts:101`), recreating the Sprint 99 issue where every beat resolved to the same asset family.
4. **Metadata is fragmented** – brain-side matching uses the rich `templateMetadata` object with styles/use cases, but the website selector depends on the trimmed `TEMPLATE_METADATA` array, so improvements in one system do not reach the other (`src/server/services/website/template-metadata.ts:14`).
5. **No telemetry closes the loop** – neither flow records which templates were offered, copied, or rejected, so we cannot learn from successful matches or prune noisy metadata.

## Opportunities
- **Broaden gating**: treat templates as default context unless an explicit flag opts out, or at least keep providing matches once a project already has scenes so style stays consistent.
- **Intent extraction**: add lightweight NLP (embedding + cosine, semantic categories, or prompt -> structured intent) instead of raw string includes, building on the metadata work captured in Sprint 99.
- **Score & diversity controls**: rank by score but require minimum thresholds, fall back to category-level picks, and rotate between the top N to avoid repeated selections.
- **Unify metadata**: generate the server-safe metadata from the canonical JSON so both the brain and website flows see styles, archetypes, supported formats, and similarity clusters.
- **Instrumentation**: log the template IDs + scores returned by `templateMatcher` and whether the final scene kept the template structure, so we can tighten metadata and surface a feedback UI later.

## Open Questions
- Should the website pipeline reuse `TemplateMatchingService` with brand intent inputs rather than maintaining a bespoke beat map?
- Do we want to persist template choices per project so later prompts keep refining the same base instead of switching randomly?
- How do we handle prompts that need composite scenes (e.g., “text with chart and particles”)—single template copy or multi-template assembly?
