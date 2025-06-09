//memory-bank/sprints/sprint31/DELETE-SCENE.md
# Delete Scene Tool Analysis (`deleteScene.ts`)

This document analyzes the `DeleteSceneTool` from `src/lib/services/mcp-tools/deleteScene.ts`. This tool is responsible for processing a user's request to delete a scene.

## 1. Overview

- **File Location**: `src/lib/services/mcp-tools/deleteScene.ts`
- **Purpose**: To handle the intention of deleting a scene. It doesn't perform the actual database deletion itself but prepares information and a conversational response for the orchestrator, which would then manage the deletion.
- **Core Mechanism**: Primarily uses the `conversationalResponseService` to generate a user-facing message about the deletion.

## 2. Input Schema (`deleteSceneInputSchema`)

The tool expects an input object validated by a Zod schema:

-   `sceneId` (string, required): The unique identifier of the scene that the user wants to delete.
-   `sceneName` (string, required): The name of the scene being targeted for deletion. This is used in conversational responses.
-   `projectId` (string, required): The ID of the project from which the scene will be deleted.
-   `remainingScenes` (array of objects, optional): A list of scenes that will remain in the project after the specified scene is deleted. Each object contains:
    *   `id` (string)
    *   `name` (string)
    *   This context helps in generating more informative responses (e.g., "Scene X deleted. Y scenes remain.").

## 3. Output Structure (`DeleteSceneOutput`)

The tool produces an output object containing:

-   `success` (boolean): Indicates whether the tool successfully processed the request (true, unless an internal error occurred while generating the response).
-   `deletedSceneId` (string): The ID of the scene marked for deletion (passed through from input).
-   `deletedSceneName` (string): The name of the scene marked for deletion (passed through from input).
-   `reasoning` (string): A brief internal note about the action, e.g., "Scene 'SceneName' marked for deletion".
-   `chatResponse` (string, optional): A user-facing message confirming the deletion intent or reporting an error.

## 4. Operational Flow

1.  **Input Validation**: The input object is validated against `deleteSceneInputSchema`.
2.  **Conversational Response Generation**:
    *   Invokes `conversationalResponseService.generateContextualResponse`.
    *   The `operation` is set to 'deleteScene'.
    *   The `userPrompt` is constructed internally (e.g., "Delete scene: {sceneName}").
    *   `result` context includes `deletedScene` (name) and `remainingCount`.
    *   `context` includes `sceneName`, `sceneCount` (remaining), `availableScenes` (remaining), and `projectId`.
3.  **Output Assembly**: The `success` flag is set (typically to true), `deletedSceneId` and `deletedSceneName` are passed through, a `reasoning` string is set, and the generated `chatResponse` is included.
4.  **Error Handling**: If `conversationalResponseService` fails, an error is logged, and an error-specific `chatResponse` is generated. The `success` flag might be set to false in such cases, and the `reasoning` would indicate failure.

## 5. Integration with System

-   The `DeleteSceneTool` is an MCP tool. The `BrainOrchestrator` calls this tool when a user's intent to delete a scene is identified.
-   **Important**: This tool *does not* perform the actual deletion from the database. It signals the intent. The orchestrator is responsible for using the `deletedSceneId` from the output to remove the scene record from the database and update the project's scene order.
-   The `chatResponse` is sent back to the user interface to confirm the action.

## 6. Key Dependencies

-   **Zod**: For input schema definition and validation.
-   **`BaseMCPTool`**: The base class for MCP tools.
-   **`conversationalResponseService`**: For generating all user-facing messages related to the deletion.

## 7. Considerations

-   The separation of concerns (tool signals intent, orchestrator executes deletion) is a key design choice. This keeps the tool focused on intent processing and conversational aspects.
-   The quality of the `chatResponse` depends on the `conversationalResponseService` and the context provided (like `remainingScenes`).
