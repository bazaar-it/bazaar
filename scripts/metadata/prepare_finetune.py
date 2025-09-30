"""Prepare fine-tune JSONL where each prompt asks for best template given format hints."""
import json
from pathlib import Path

PROMPTS = Path('memory-bank/sprints/sprint119_template_routing/metadata_prompt_dataset.jsonl')
OUTPUT = Path('memory-bank/sprints/sprint119_template_routing/metadata_finetune_dataset.jsonl')

prefix_system = "You are a template routing assistant. Given user intent, respond with the best template id."

with OUTPUT.open('w') as out:
    for line in PROMPTS.read_text().splitlines():
        example = json.loads(line)
        prompt = example['prompt']
        template_id = example['expected_template_id']
        record = {
            'messages': [
                {'role': 'system', 'content': prefix_system},
                {'role': 'user', 'content': prompt},
                {'role': 'assistant', 'content': template_id},
            ]
        }
        out.write(json.dumps(record, ensure_ascii=False) + '\n')

print(f"Wrote fine-tune JSONL to {OUTPUT}")
