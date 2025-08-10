/**
 * Simple YouTube Description Prompt - Just describe what you see
 * No complex JSON, no frame timing, just observations
 */

export const YOUTUBE_DESCRIPTION_PROMPT = `Watch this video carefully and describe EXACTLY what you see happening.

Tell me:
1. What text appears on screen (exact words)
2. What colors you see (backgrounds, text colors)
3. How things move (fade in, slide, zoom)
4. What shapes or graphics appear
5. The order things happen in
6. How long each thing stays on screen (roughly)

Be specific about:
- Background colors (e.g., "white background", "purple gradient", "light beige #F5F5DC")
- Text content (write the EXACT words you see, in quotes)
- Text size relative to screen (e.g., "large text filling 1/3 of screen", "small subtitle")
- Position (center, left side, top third, etc.)
- Motion (fades in over 0.5 seconds, slides from left, zooms out)
- Timing relationships (appears AFTER X disappears, overlaps with Y)

Do NOT:
- Make up content you don't see
- Add creative interpretation
- Describe audio or music
- Guess if you're unsure

Example description:
"The video starts with a white background. The word 'Hello' fades in as large black text in the center, stays for about 1 second, then fades out. Next, a purple gradient background appears with the text 'Welcome' sliding in from the left in white..."

Just describe what you observe, step by step, like you're explaining it to someone who can't see the video.`;