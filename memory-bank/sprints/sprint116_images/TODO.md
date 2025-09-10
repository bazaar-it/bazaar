# TODO — Sprint 116 Images

1) Brain + Intent
- [ ] Prompt: Add `imageDirectives[]` schema with examples; `imageAction` remains fallback for single image
- [ ] IntentAnalyzer: parse `imageDirectives[]` and pass through; prefer directives over `imageAction`
- [ ] Attached scenes: if `sceneUrls` present and Brain picked addScene, re-ask Brain with hint to prefer edit (or apply a safe server-side override)

2) ContextBuilder + Metadata
- [ ] Include asset tag summary (kind/layout/colors/hasText/hints) in the Brain user message (last N + referenced by name)
- [ ] Add simple asset-name resolution (e.g., “logo”) to reference exact asset IDs for tools
- [ ] MediaMetadataService: expand tags —
     - Dominant color palette (3–5), brandText OCR cache, ui-type (navbar/card/button)
     - Retry/backoff + metrics; write minimal failures (don’t block)

3) AddTool (Multimodal)
- [ ] Replace any leftover storytelling text in embed path; ensure only placement + optional minimal motion
- [ ] Confirm system assembly: Base + Mode (embed/recreate) + Canvas; user content includes image_url array
- [ ] Unify codegen paths: reduce public surface to one `generateFromImages` call with mode switch

4) EditTool (Branching)
- [ ] Mode=embed: insert <Img> at target container/slot; compute fit/size using canvas dims and aspect ratio; minimal changes
- [ ] Mode=recreate: style transfer (colors/fonts/radius/spacing/layout) limited to targeted elements; validate no <Img>
- [ ] Add logging: ✏️ Mode, target scene ID, selector hints

5) CodeGeneratorNEW Simplification
- [ ] Extract common system prompt builder (Base + Mode + Canvas) to a helper
- [ ] Consolidate name extraction + duration analysis; remove duplication
- [ ] Ensure storyboardContext and templateContext remain optional and well-bounded

6) Legacy Removal & Types
- [ ] Remove `src/tools/image-recreator/image-recreator.ts`
- [ ] Remove `'imageRecreatorScene'` from ToolName/TOOL_OPERATION_MAP/isValidToolName
- [ ] Delete `src/config/prompts/active/image-recreator.ts`
- [ ] Drop all imports and switch cases; CI verify no references

7) Observability & Evals
- [ ] Add router/tool logs: tool, imageAction, hasImages; edit target (selector)
- [ ] Evals: embed vs recreate determinism; fidelity checks (colors/fonts/layout), compile rate; multi-image mixed intent
- [ ] Add metric on metadata coverage and usage (how often hints influenced decisions)

8) Docs
- [ ] Update brain orchestrator docs to reflect `imageDirectives` and edit priority rules
- [ ] Update developer guide on modular prompts (Base + Modes) and how to extend guardrails

