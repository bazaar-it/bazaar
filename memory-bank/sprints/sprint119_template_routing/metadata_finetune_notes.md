# Metadata Fine-Tune Dataset Notes

## Dataset Path
- JSONL export: `memory-bank/sprints/sprint119_template_routing/metadata_canonical_db.jsonl`
- Each row contains: template_id, template_name, db_id, supported_formats, keywords, user_phrases, categories, styles, use_cases, animations, elements, colors, complexity, primary_use, similar_to, descriptions.

## Suggested Prompt/Output Schema
For supervised fine-tuning, create input/output pairs like:

```
INPUT: { "prompt": "mobile notification portrait" }
OUTPUT: { "template_id": "homescreen-notifications-portrait" }
```

- Use keywords + user_phrases to synthesize prompts. e.g., combine format cues with major nouns.
- Provide negatives or rankings. For direct classification, top-1 is fine; for ranking, supply ordered lists.
- Include `supported_formats` constraints: prefix prompts with `format:portrait` or similar.

## Pipeline Outline
1. **Generate Prompt Variants**
   - For each template, create N prompts mixing `user_phrases`, `keywords`, and format hints.
   - Example generator script stub (see `scripts/metadata/generate_prompts.py`).
2. **Assemble JSONL** with fields `prompt`, `expected_template_id`, optionally `candidate_templates` for ranking tasks.
3. **Fine-tune** via OpenAI SFT or other frameworks.
   - Example CLI: `openai api fine_tuning.jobs.create -t dataset.jsonl -m gpt-3.5-turbo`.
4. **Evaluation**: hold out prompts, compare accuracy vs. keyword matcher.

## Helper Scripts (to create)
- `scripts/metadata/generate_prompt_dataset.py`: reads `metadata_canonical_db.jsonl`, emits prompt samples.
- `scripts/metadata/prepare_finetune.py`: merges prompts into OpenAI finetune format.

## Next Steps
- Decide on classification vs. ranking output.
- Add telemetry to record real prompts + chosen template for future incremental fine-tuning.
