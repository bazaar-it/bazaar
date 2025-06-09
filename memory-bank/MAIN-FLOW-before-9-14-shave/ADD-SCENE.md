//memory-bank/sprints/sprint31/ADD-SCENE.md
# Add Scene Tool Analysis (`addScene.ts`)

This document provides a detailed analysis of the `AddSceneTool` found in `src/lib/services/mcp-tools/addScene.ts`. Its primary function is to create and add new Remotion scenes to a project based on user prompts.

## 1. Overview

- **File Location**: `src/lib/services/mcp-tools/addScene.ts`
- **Purpose**: To generate a new Remotion scene component, including its code, name, and duration, based on a user's natural language prompt. It can also handle context like existing scenes and project ID.
- **Core Mechanism**: It utilizes a `sceneBuilderService` (specifically `generateTwoStepCode`) for the core scene generation and a `conversationalResponseService` to create user-facing messages.

## 2. Input Schema (`addSceneInputSchema`)

The tool expects an input object validated by a Zod schema:

-   `userPrompt` (string, required): The user's description of the desired scene content and style.
    *   *Example*: "Create an intro scene with a spinning logo and the title 'My Awesome Video'."
-   `projectId` (string, required): The ID of the project to which this new scene will be added.
-   `sceneNumber` (number, optional): An optional suggested number or position for the new scene in the storyboard.
-   `storyboardSoFar` (array of any, optional): An array representing the existing scenes in the storyboard. This provides context for the new scene, potentially influencing style or content.
    *   *Structure*: Typically an array of objects, where each object might contain `sceneId`, `name`, `duration`, `data.isWelcomeScene`, `type` etc.
-   `replaceWelcomeScene` (boolean, optional): A flag indicating whether this new scene should replace an existing welcome scene. The tool also has internal logic to determine this if `storyboardSoFar` indicates a single welcome scene is present.

## 3. Output Structure (`AddSceneOutput`)

The tool produces an output object containing:

-   `sceneCode` (string): The generated JavaScript/TypeScript code for the new Remotion scene component.
-   `sceneName` (string): The name assigned to the new scene by the generation service (e.g., "SpinningLogoTitle").
-   `duration` (number): The calculated or suggested duration for the new scene in seconds.
-   `reasoning` (string): An explanation from the generation service about how the scene was constructed based on the prompt.
-   `layoutJson` (string, optional): A JSON string representing the layout or structural properties of the generated scene. This can be used for style consistency with subsequent scenes.
-   `debug` (any, optional): An optional object containing debugging information from the scene generation process.
-   `chatResponse` (string, optional): A user-facing message summarizing the action taken (e.g., "Okay, I've added the 'SpinningLogoTitle' scene for you!").
-   `replacedWelcomeScene` (boolean, optional): Indicates if a welcome scene was replaced by this new scene.

## 4. Operational Flow

1.  **Input Validation**: The input object is validated against `addSceneInputSchema`.
2.  **Contextual Analysis**:
    *   Determines if a welcome scene exists and if it should be replaced, based on `storyboardSoFar` and the tool's internal logic (e.g., if `storyboardSoFar` has only one scene and it's a welcome scene).
    *   Calls `getPreviousSceneJson` to fetch the `layoutJson` of the last scene in the project (if any) to maintain style consistency.
3.  **Scene Generation**:
    *   Invokes `sceneBuilderService.generateTwoStepCode` with the `userPrompt`, `projectId`, `sceneNumber` (optional), and `previousSceneJson` (optional).
    *   This service is responsible for the heavy lifting of interpreting the prompt and generating the `sceneCode`, `name`, `duration`, `layoutJson`, and `reasoning`.
4.  **Conversational Response Generation**:
    *   Calls `conversationalResponseService.generateContextualResponse` with details about the operation ('addScene'), the `userPrompt`, the generated scene's `name` and `duration`, and context like `sceneCount` and `projectId`.
5.  **Output Assembly**: The results from scene generation and conversational response services are compiled into the `AddSceneOutput` object.
6.  **Error Handling**: If any step fails (e.g., scene generation), an error is logged, and a user-facing error message is generated via `conversationalResponseService`. The output will contain empty/default values for scene details and the error message as `chatResponse`.

## 5. Integration with System

-   The `AddSceneTool` is an MCP tool, expected to be called by the `BrainOrchestrator` when the system determines a new scene needs to be created based on user interaction.
-   The output (`sceneCode`, `sceneName`, `duration`, `layoutJson`) is used by the orchestrator to create a new scene record in the database and to provide the necessary information to the frontend for rendering the new scene.
-   The `chatResponse` is displayed in the user interface.

## 6. Key Dependencies

-   **Zod**: For input schema definition and validation.
-   **`BaseMCPTool`**: The base class for MCP tools.
-   **`sceneBuilderService`**: The core service for generating scene code and properties.
-   **`conversationalResponseService`**: For generating user-friendly messages.
-   **`db` (Drizzle ORM)**: Used by `getPreviousSceneJson` to query the `scenes` table for the layout of the previous scene.
-   **`openai`**: Likely used indirectly by `sceneBuilderService` and `conversationalResponseService`.

## 7. Considerations

-   The effectiveness of scene generation relies heavily on the `sceneBuilderService`'s capabilities and the quality of its underlying LLM and prompt engineering.
-   The logic for `replaceWelcomeScene` and fetching `previousSceneJson` aims to provide a smoother user experience by default.
-   Error handling provides fallback conversational responses to inform the user of issues.


## 8. Future Improvements

-   **Idempotency**: The tool itself is not inherently idempotent. Repeatedly applying the same prompt to the same scene might lead to different or compounded results, depending on the LLM's behavior and the evolving `existingCode`.
-   **Prompt Engineering**: The quality of the generated scenes heavily depends on the clarity and specificity of the `userPrompt` and the effectiveness of the prompt engineering within `sceneBuilderService`.
-   **Code Validity**: Ensuring the LLM-generated `sceneCode` is always valid and functional Remotion code can be challenging. Robust error handling and potentially a validation step for the generated code might be necessary.
-   **Contextual Limitations**: While `storyboardSoFar` and `chatHistory` provide context, complex inter-scene dependencies or long-term project goals might not always be fully captured, potentially leading to suboptimal scenes.

