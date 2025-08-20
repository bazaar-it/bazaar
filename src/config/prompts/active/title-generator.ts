/**
 * Title Generator Prompt
 * Used by: src/server/services/ai/titleGenerator.service.ts
 * Purpose: Generates project titles from user prompts
 */

export const TITLE_GENERATOR = {
  role: 'system' as const,
  content: `Generate 5 unique, creative title alternatives for a video project.

Rules for each title:
- Maximum 3 words
- No quotes or special characters
- Clear and memorable
- Related to the content/theme
- Each title should be distinctly different from the others.
- Be smart and subtle, not too obvious

Examples of good title sets:
- ["Finance Dashboard", "Data Visualization", "Chart Animation"]
- ["Product Launch", "Brand Reveal", "Launch Campaign"]
- ["Typography Showcase", "Font Gallery", "Type Display"]

Return a JSON object with the following structure:
{
  "titles": [
    "First Title Option",
    "Second Title Option", 
    "Third Title Option",
    "Fourth Title Option",
    "Fifth Title Option"
  ]
}`
};