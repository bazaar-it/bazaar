# Analysis: Code Generator Fine-Tune Dataset (Sprint 119)

## Objective
Train a supervised fine-tuned model that can output Remotion scene code directly from natural-language briefs, allowing us to replace (or drastically shrink) the existing `CODE_GENERATOR` system prompt. The dataset must pair realistic prompts with the exact TSX code we ship in production templates so the model learns:
- structural patterns of high-quality Bazaar scenes (sequences, timings, animations, responsive logic);
- stylistic mappings between user language (keywords, phrases, styles) and specific code implementations;
- frame timing + supported format considerations (landscape/portrait/square) baked into the templates;
- clean, comment-free responses that start at the top of a JS/TSX module with no prose.

## Source Data
- `src/templates/metadata/canonical.ts`: canonical metadata (keywords, user phrases, styles, supported formats, durations) for all registry + DB templates.
- Production template code from PostgreSQL (`public."bazaar-vid_templates".tsx_code`) – single source of truth for DB-backed scenes.
- Registry TSX modules in `src/templates/*.tsx` (optional future expansion, but the v1 dataset will focus on DB templates to avoid mismatches between live code and local component helpers).

## Dataset Shape
Use OpenAI fine-tuning chat format (JSONL with `{"messages": [...]}`). Each training example contains:
1. **System message** – minimal instruction baked into the dataset (e.g., _"You output only valid React/Remotion code using window.Remotion APIs."_). No giant soup; the fine-tune should absorb stylistic rules.
2. **User message** – natural-language brief assembled from canonical metadata (description, use case, elements, colors, animations, desired format, duration). We will synthesize 2+ prompts per template so the model sees varied phrasing.
3. **Assistant message** – the verbatim TSX code we serve to users today (trimmed, no surrounding explanation). This is the gold output.

Example row (simplified):
```json
{
  "messages": [
    { "role": "system", "content": "You are Bazaar's Remotion code generator. Respond with valid TSX only." },
    { "role": "user", "content": "Need a landscape fintech dashboard intro with animated card balances, soft gradients, and transaction list. Keep it professional and around 120 frames." },
    { "role": "assistant", "content": "const { AbsoluteFill, ... } = window.Remotion;\n\nexport default function RevolutApp() { ... }" }
  ],
  "meta": {
    "templateId": "revolut-app",
    "dbId": "bec6cc24-b737-4440-9441-f05b77b84fc9",
    "supportedFormats": ["landscape"],
    "duration": 120
  }
}
```
The `meta` block is optional but helps QA/curation.

## Prompt Synthesis Strategy
- **Primary brief**: Combine `primaryUse`, first description, and top styles/animations/elements to form a concise product-style request.
- **User-phrase variants**: For each template, select one or two `userPhrases` and turn them into conversational prompts ("Show a ..."). Append format + duration reminders.
- **Use-case emphasis**: When `useCases` or `categories` describe marketing or UI contexts, include them as additional guidance ("This is for a pricing hero" etc.).
- **Format gating**: Mention the required orientation (`landscape`, `portrait`, or `square`) based on canonical metadata; this teaches the model to respect format hints.
- **Duration contextualization**: Convert frames → seconds in the prompt copy (e.g., "≈ 4 seconds (120 frames)") so the model links textual timing to code.

## Generation Pipeline
1. **Load canonical metadata** and filter to DB-backed templates (source.type === 'db').
2. **Fetch TSX code** in a single query: `SELECT id, name, tsx_code FROM "public"."bazaar-vid_templates" WHERE id = ANY($1)`.
3. **Assemble prompt variants** per template using deterministic combiners (no randomness so reruns stay stable). Target ≥2 prompts per template → ~200 samples for 100 templates.
4. **Produce chat messages** (`system`, `user`, `assistant`). Ensure assistant string matches DB `tsx_code` exactly (trim trailing whitespace only).
5. **Split dataset** using seeded shuffle (80/10/10). Guarantee validation/test always have ≥1 sample when total ≥3.
6. **Emit JSONL files** under `data/fine-tuning/template-code-generator/v1/` plus a `stats.json` summary (counts, timestamp, seed, template coverage).
7. **Dry-run mode** prints a few examples without writing files for manual inspection.

## Validation
- Every assistant payload must start with `const` / `import` etc. (no prose). Add a lint step that rejects outputs containing ````` or "```" markers.
- Ensure prompts and code reference the same template ID + format.
- Optionally re-run `npm run lint` on generated TSX (future improvement).

## Open Questions / Future Enhancements
- Should we include registry templates once we guarantee `getCode()` matches production output? (Requires cross-checking with R2 stored bundles.)
- Do we need synthetic negative prompts ("avoid" instructions) to teach editing behaviour? For initial "generate" fine-tune we can skip.
- How many additional variations should we craft per template (e.g., style-focused vs. animation-focused prompts)?
- Post-training evaluation: run generated model across held-out prompts and compare structural metrics (number of sequences, animation usage) against ground truth.

## Next Steps
1. Ship dataset generator (`scripts/generate-template-code-sft.ts`) that pulls canonical metadata + TSX code and writes v1 splits.
2. Seed `data/fine-tuning/template-code-generator/prompts.json` (or similar) to track synthesized prompt variants per template.
3. Log generation stats + manual QA checks in sprint progress before triggering any fine-tune job.
4. Once satisfied, kick off a small GPT-4o-mini or GPT-3.5 FT run and benchmark against the current prompt-based generator.
