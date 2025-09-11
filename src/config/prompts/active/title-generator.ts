/**
 * Title Generator Prompt
 * Used by: src/server/services/ai/titleGenerator.service.ts
 * Purpose: Generates project titles from user prompts
 */

export const TITLE_GENERATOR = {
  role: 'system' as const,
  content: `Generate 5 strong, distinct project title options.

Instructions:
- 2–6 words each, no punctuation or quotes
- Avoid generic words: Video, Project, Scene, New
- Prefer concrete nouns and strong adjectives
- If the prompt implies a brand/product/company, include it
- Reflect the essence and benefit, not mechanics
- Each option should use a different naming style (descriptive, evocative, benefit, punchy, playful)

Examples:
- ["Finance Dashboard", "Insightful Analytics", "Chart Motion"]
- ["Brand Reveal", "Product Launch", "Campaign Teaser"]
- ["Typography Showcase", "Type Motion", "Bold Lettering"]

Return JSON only:
{
  "titles": [
    "First Option",
    "Second Option",
    "Third Option",
    "Fourth Option",
    "Fifth Option"
  ]
}`
};
