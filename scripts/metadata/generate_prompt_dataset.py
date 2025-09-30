import json
from pathlib import Path

SOURCE = Path('memory-bank/sprints/sprint119_template_routing/metadata_canonical_db.jsonl')
OUT = Path('memory-bank/sprints/sprint119_template_routing/metadata_prompt_dataset.jsonl')

FORMAT_HINTS = {
    'landscape': ['format:landscape', 'desktop layout', 'wide hero'],
    'portrait': ['format:portrait', 'mobile layout', 'vertical video'],
    'square': ['format:square', 'social square', '1:1 canvas'],
}

VARIANTS_PER_TEMPLATE = 4

def main():
    examples = []
    for line in SOURCE.read_text().splitlines():
        data = json.loads(line)
        formats = data.get('supported_formats') or ['landscape']
        phrases = data.get('user_phrases') or data.get('keywords') or []
        if not phrases:
            continue
        hints = [hint for fmt in formats for hint in FORMAT_HINTS.get(fmt, [])]
        hints = hints or ['generic format']
        for idx, phrase in enumerate(phrases[:VARIANTS_PER_TEMPLATE]):
            prompt_parts = []
            if idx < len(hints):
                prompt_parts.append(hints[idx])
            prompt_parts.append(phrase)
            prompt = ' '.join(prompt_parts)
            examples.append({
                'prompt': prompt,
                'expected_template_id': data['template_id'],
                'expected_template_name': data['template_name'],
                'db_id': data.get('db_id')
            })
    with OUT.open('w') as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + '\n')
    print(f'Generated {len(examples)} prompt examples to {OUT}')

if __name__ == '__main__':
    main()
