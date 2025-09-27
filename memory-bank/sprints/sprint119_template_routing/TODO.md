# Sprint 119 TODO – Template Routing

1. **Broaden template context injection**
   - Adjust `shouldAddTemplateContext` guards so template examples stay active beyond the first scene (e.g., supply on every prompt unless explicitly disabled or when existing scenes already cover the prompt intent).
   - Ensure Add tool remains aware of prior selections to maintain style continuity.

2. **Semantic intent matcher**
   - Replace the literal keyword scoring in `TemplateMatchingService` with embeddings or an intent classifier backed by the rich metadata fields.
   - Add tests showing paraphrased prompts ("pulsing dashboard", "ambient motion background") map to correct templates.

3. **Unify metadata sources**
   - Generate the server-safe `TEMPLATE_METADATA` from the canonical `templateMetadata` so website + brain flows share styles, categories, supported formats, and similarity links.
   - Add build step or script to validate metadata completeness.

4. **Website selector integration**
   - Refactor `TemplateSelector` to use the shared matcher instead of the hardcoded beat lists; incorporate brand context as matcher hints instead of first-match return.
   - Preserve narrative beat fallbacks for feature parity.

5. **Telemetry & feedback loop**
   - Log which templates were surfaced, chosen, or skipped in both orchestrator and website flows; persist in `template_usage` (or new table) with prompt intent snapshot.
   - Build quick dashboard or admin report to review match effectiveness over time.

6. **Diversity & thresholding safeguards**
   - Introduce minimum relevance thresholds plus rotation among top-N matches to prevent repeated selections.
   - Add regression tests verifying variety across similar prompts within a project.
