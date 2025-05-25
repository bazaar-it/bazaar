//memory-bank/sprints/sprint27/image-vision-integration/planning.md
# Planning: Image-Aware Scene Generation ("Vision Mode") - BAZAAR-306

This document outlines planning for an MVP of the Image-Aware Scene Generation feature, designed for rapid development and iteration, and its integration with the existing system.

## 1. Core Concept (MVP)
Allow users to upload an image. The system analyzes it using an AI Vision model to extract key visual elements (dominant colors, prominent text, rough layout description). These elements bootstrap scene creation, providing a visually relevant starting point.

**User Flow (MVP):**
1. User uploads an image via the UI in `src/app/projects/[id]/generate/page.tsx`.
2. Frontend uploads image to R2 (obtaining a URL) and calls a new tRPC procedure in `src/server/api/routers/generation.ts` (e.g., `analyzeImageByUrl`).
3. `analyzeImageByUrl` sends the image URL to an AI Vision model (e.g., OpenAI Vision) with a targeted prompt.
4. Vision model returns structured JSON (colors, text, layout hints).
5. This JSON is returned to the client (`page.tsx`).
6. Client-side logic in `page.tsx` then incorporates these extracted elements into the props for the next call to `generateComponentCode` and/or `generateStyle` in `generation.ts`.

## 2. Integration with Current System

### Backend (`src/server/api/routers/generation.ts`)
*   **New tRPC Procedure**: `analyzeImageByUrl(imageUrl: string): Promise<ExtractedVisualElements>`
    *   Input: Publicly accessible URL of an image (e.g., from R2).
    *   Action: Calls the chosen Vision API (e.g., OpenAI Vision API) with the image URL and a specific prompt requesting structured JSON output (e.g., `{ "dominantColors": ["#hex1", ...], "headings": ["text1", ...], "layoutType": "hero_and_columns" }`).
    *   Output: Returns the parsed `ExtractedVisualElements` JSON.
    *   Error handling for API failures or invalid image URLs.
*   **Modifications to `generateStyle`**: 
    *   Optionally accept `dominantColors: string[]` as input.
    *   If provided, these colors could form the primary `colorPalette`, potentially bypassing or influencing the LLM's style generation for colors.
*   **Modifications to `generateComponentCode`**: 
    *   Optionally accept `extractedText: string[]` and `layoutHint: string` (or more structured layout data) as part of its input props.
    *   These can be injected into the system/user prompt to guide the LLM: e.g., "Create a scene incorporating the text: '{extractedText[0]}'. Arrange elements in a {layoutHint} style. Use the provided color palette."
*   **Asset Handling**: Uploaded images are stored in R2. Their URLs are used for analysis. The image itself might become an asset referenceable in generated scenes (e.g., as a background or element), linking to `identifyAssets` logic.

### Frontend (`src/app/projects/[id]/generate/page.tsx` & Components)
*   **UI for Image Upload**: 
    *   A new button/area in a relevant panel (e.g., `ChatPanelG`, a new "Inspiration Panel", or near scene creation controls).
    *   Handles file selection and triggers upload to R2 (e.g., using a presigned URL obtained via a tRPC call).
*   **Workflow Orchestration**:
    1.  After successful upload to R2, get the image URL.
    2.  Call the `api.generation.analyzeImageByUrl.useMutation()` with the URL.
    3.  Display loading/feedback to the user (e.g., "Analyzing your image...").
    4.  On successful analysis, store the `ExtractedVisualElements` in the component's state (e.g., React context or Zustand store for the workspace).
    5.  When the user next generates a scene or style:
        *   The stored `ExtractedVisualElements` are retrieved.
        *   Relevant parts (e.g., colors, text) are added to the input props for `generateStyle` or `generateComponentCode` tRPC calls.
*   **User Control (MVP - Minimal)**: Initially, the application of extracted elements might be automatic. Post-MVP, allow users to toggle/select which elements to use.

## 3. MVP Strategy & Considerations

*   **Lean Implementation**: Focus on dominant colors and 1-2 primary text extractions.
*   **Vision API**: Start with one provider (e.g., OpenAI Vision). Prompt for simple JSON.
*   **R2 Integration**: Leverage existing R2 setup for image uploads.
*   **Frontend**: Simple upload button. Analysis results automatically influence next generation request. Clear loading states.
*   **Error Handling**: Basic error messages if analysis fails or image is unsuitable.
*   **Cost/Caching**: For MVP, direct API calls. Cache Vision API responses per image hash as a fast follow-up if costs are an issue.
*   **Latency**: Analysis is asynchronous. User can continue working, next generation will pick up results if ready.

## 4. Iteration Path (Post-MVP)
*   More sophisticated layout analysis and mapping to Remotion layout components.
*   Extraction of fonts, logos, specific UI elements (buttons, cards).
*   UI for users to review and selectively apply extracted elements.
*   "Recreate vs. Avoid" toggle based on image analysis.
