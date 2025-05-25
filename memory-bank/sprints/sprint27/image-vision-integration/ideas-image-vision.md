//memory-bank/sprints/sprint27/ideas-image-vision.md
# Ideas: Image-Aware Scene Generation ("Vision Mode")

This document outlines strategic thinking for an MVP of the Image-Aware Scene Generation feature, designed for rapid development and iteration.

## Core Concept (MVP)

The primary goal is to allow users to upload an image, which the system then analyzes to extract key visual elements. These elements (e.g., dominant colors, prominent text, a rough layout description) are then used to bootstrap scene creation, providing a visually relevant starting point that aligns with the user's existing branding or visual style.

**User Flow (MVP):**
1. User uploads an image (e.g., a screenshot of their app, a design mock-up).
2. System sends the image to an AI Vision model (e.g., OpenAI Vision, Claude Haiku Vision) with a targeted prompt.
3. Vision model returns a structured JSON response containing extracted visual elements.
4. These elements are mapped to scene props (e.g., `colorPalette`, `textBlocks`, basic layout hints).
5. The enriched props are used by `generateComponentCode` to produce an initial scene.

## Key Considerations for MVP & Startup Context

*   **Speed of Implementation**: Prioritize the simplest, leanest path to demonstrate core value. Avoid over-engineering in the first pass.
*   **Cost Management**: Vision API calls can be costly. Implement strict controls:
    *   **Caching**: Cache API responses based on image content hash to avoid re-processing identical images.
    *   **Resolution Limits**: Downscale images to a maximum resolution (e.g., 1024x1024 or 1MP) before sending to the API.
    *   **Rate Limiting/Quotas**: Consider per-user or global limits if necessary, though perhaps not for the very first MVP.
*   **User Experience (UX)**:
    *   **Feedback**: Provide clear feedback during analysis (e.g., "Analyzing your image...").
    *   **Error Handling**: Gracefully handle API errors or images that yield poor/no results.
    *   **Expectation Setting**: Make it clear that this is an assistive feature; results might not be pixel-perfect recreations but good starting points.
*   **Accuracy vs. Speed**: For an MVP, aim for "good enough" extraction that provides tangible value quickly. Perfect accuracy can be an iteration goal.
*   **Privacy**: Uploaded images might be sensitive. Clearly communicate how images are stored (e.g., temporarily for analysis, or longer if part of a project) and who can access them. Flag assets as private if they are not intended for public sharing via generated videos.
*   **Latency**: Image analysis can take several seconds. Manage user expectations:
    *   **Asynchronous Processing**: The analysis could happen in the background.
    *   **Stub/Placeholder Scenes**: Upload could immediately create a placeholder scene that gets updated once analysis is complete.

## Potential MVP Strategies

*   **Minimal Viable Extraction**: Focus on extracting a few high-impact elements:
    *   **Dominant Colors**: 3-5 dominant colors for a palette.
    *   **Prominent Text**: Extract 1-2 key text strings (e.g., main heading).
    *   **Layout**: For the very first MVP, layout description might be too complex. If included, keep it very high-level (e.g., "single column with hero image", "two-column text").
*   **Targeted Vision API Prompting**: Craft specific prompts for the Vision API to request output in a structured JSON format. This simplifies parsing on our end. Example prompt fragment: `"...Respond with a JSON object containing 'dominantColors' (array of hex strings) and 'mainHeadings' (array of strings)."`
*   **Direct Prop Mapping**: Simple, direct mapping from the Vision API's JSON output to our existing scene prop structures. Avoid complex transformation logic initially.
*   **"Recreate vs. Avoid" Toggle**: For MVP, focus on the "recreate" or "inspire" use case. The "avoid" logic can be a fast follow.
*   **Storage**: Utilize existing R2 infrastructure for temporary or persistent image storage, linking asset IDs to projects/scenes.

## Iteration Path (Post-MVP)

*   Improve extraction accuracy for colors, text.
*   Add more sophisticated layout analysis (e.g., identifying grids, columns, hero sections).
*   Introduce element-level segmentation (detecting specific UI elements like buttons, cards) for more granular control or animation ideas.
*   Detect and extract logos or key brand marks.
*   Allow users to select *which* extracted elements to apply.
*   Refine the "avoid this style" functionality.

## Relation to Other Features

*   **GitHub Integration**: The screenshot analysis component of GitHub integration will directly use this Vision Mode pipeline.
*   **Prompt Engineering System**: Extracted visual elements can serve as powerful inputs/context for the prompt engineering system, guiding the LLM more effectively.
*   **Asset Management**: Uploaded images become assets linked to a project, managed via R2.
