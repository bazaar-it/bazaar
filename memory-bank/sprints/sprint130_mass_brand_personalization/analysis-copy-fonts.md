# Copy & Font Tokenization Analysis (Sprint 130)

## Current State
- Brand extraction via `WebAnalysisAgentV4` → `convertV4ToSimplified` → `createBrandThemeFromExtraction` primarily populates color tokens, with only a single generic font entry and minimal copy mapping.
- `BrandTheme.copy` is an unstructured `Record<string, string>` and most tokenized scenes only reference `theme.colors`.
- `BRAND_TOKENIZER_PROMPT` focuses on colors/fonts but does not instruct the LLM to replace hardcoded marketing copy with theme-driven text tokens.
- Preview runtime (`PreviewPanelG.applyBrandTheme`) expects `theme.copy` but the fallback injected in `sceneTokenizer.service` only guarantees `{ colors, fonts, assets }`, so copy lookups currently produce `undefined`.

## Goals
1. Capture richer brand data (fonts, messaging, CTAs, feature bullets, canonical brand naming) during URL intake so `BrandTheme` exposes standardized copy tokens.
2. Update `BrandTheme` type + helpers to provide structured text fields (hero headline, subheadline, CTA labels, feature titles/descriptions, stats, problem/solution statements) with sensible defaults.
3. Teach the scene tokenizer to swap literal text with theme copy tokens while keeping original strings as fallbacks.
4. Ensure runtime fallback + preview sanitization handle the new structure and gracefully upgrade older stored themes.

## Approach
- **Data model**: Replace `BrandTheme.copy: Record<string, string>` with a typed `BrandThemeCopy` interface (`brand`, `hero`, `ctas`, `features`, `stats`, `statements`, `voice`) and persist per-target scene variants so the generate workspace can swap instantly. Provide defaults in `DEFAULT_BRAND_THEME` and build backward-compat conversion for legacy themes.
- **Extraction mapping**: Enhance `convertV4ToSimplified` to capture heading/body/mono fonts (using `stack.headings`, `stack.body`, etc.) and keep top CTA labels and feature content. Update `createBrandThemeFromExtraction` to populate the new copy structure + role-specific fonts.
- **Tokenizer prompt**: Expand `BRAND_TOKENIZER_PROMPT` directives so the LLM replaces text nodes with `theme.copy` lookups (`theme?.copy?.hero?.headline ?? 'Original'`, `theme?.copy?.features?.[0]?.title ?? 'Original'`, etc.) while preserving layout.
- **Fallback + sanitization**: Update `forceBrandThemeFallback` and `PreviewPanelG.sanitizeTheme` to supply defaults (`{ copy: DEFAULT_BRAND_THEME.copy }`) and auto-upgrade legacy `Record<string, string>` copy maps into the structured form.

## Risks & Mitigations
- **LLM overreach**: Prompt updates might cause scene restructuring. Mitigate with explicit instructions to only replace literals and keep structure intact.
- **Legacy data**: Existing targets store old copy shape. Implement runtime conversion when reading from DB + sanitize fallback to avoid crashes.
- **Token naming**: Ensure consistent field names so future components can rely on them. Document the schema in sprint README/TODO after implementation.
