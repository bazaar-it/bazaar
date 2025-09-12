export const IMAGE_EMBED_MODE = `
MODE: EMBED (Images must be displayed)
- You MUST display the exact uploaded image(s) using <Img src="URL">.
- Never hallucinate or alter URLs; use given URLs verbatim.
- No narration or multi-step sequencing; only place images and apply minimal motion if requested.
- Respect canvas and aspect ratio: choose contain/cover and size/position appropriately.
- For edits: insert into the specified container/slot; keep unrelated code unchanged.
`;

