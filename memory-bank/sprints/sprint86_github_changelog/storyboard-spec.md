# Storyboard Spec

Purpose: small, robust contract from analysis → video. Keeps LLM output bounded and mappable.

## JSON Schema (informal)
- `title: string`
- `category: 'feature' | 'fix' | 'performance' | 'docs' | 'security' | 'refactor'`
- `bullets: string[3..6]` (short, declarative)
- `highlights?: {label: string; path: string}[]` (≤ 4)
- `cta?: string`
- `durationSec: number` (20–40)
- `theme?: { format: 'square'|'landscape'|'portrait'; style: 'branded'|'minimal' }`

## Constraints
- No code blocks in bullets; < 80 chars each.
- Prefer active voice; avoid internal jargon.
- Map category → color accent + icon in composition.

## Mapping Rules
- Title scene: 3s intro; brand colors; category tag.
- Bullets: 3–5 scenes, ~4–6s each; staggered enter animations.
- Highlights: overlay chips or final card (2–4s total).
- CTA: final 3–4s.
- Add 0.3s crossfades between scenes.
