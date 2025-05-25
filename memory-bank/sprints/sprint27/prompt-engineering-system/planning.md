//memory-bank/sprints/sprint27/prompt-engineering-system/planning.md
# Planning: Prompt Engineering System - BAZAAR-305

This document outlines planning for an MVP of the Prompt Engineering System, focusing on prompt and model agility, and its integration with the existing system.

## 1. Core Concept (MVP)
Decouple prompts and LLM model choices from the core application code (`src/server/api/routers/generation.ts`) to enable easier iteration, A/B testing, configuration, and auditing.

**Key Components for MVP:**
1.  **Prompt Registry (Simple)**: Store named, versioned prompts as JSON files within the project structure (e.g., `/src/server/prompts/registry.json` or individual files like `/src/server/prompts/generateComponentCode_system_v1.txt`).
2.  **Model Selection (Basic UI)**: Allow users (or devs via config) to select from a small list of supported LLM models (e.g., `gpt-4o-mini`, `gpt-3.5-turbo`).
3.  **Basic Logging**: Log which prompt version and model were used for a given generation request, along with a request/response identifier.

## 2. Integration with Current System

### Backend (`src/server/api/routers/generation.ts`)
*   **Prompt Loading Logic**: 
    *   Implement a helper function, e.g., `getPrompt(promptName: string, version?: string): string`.
    *   This function reads the content of the specified prompt from the JSON registry or file system.
    *   Procedures like `generateComponentCode`, `generateStyle`, `planScenes` will call `getPrompt()` to fetch their system and user prompt templates instead of having them hardcoded.
*   **Model Parameterization**: 
    *   All tRPC procedures in `generation.ts` that call an LLM (e.g., `generateComponentCode`, `generateStyle`) will be modified to accept an optional `modelName?: string` parameter in their input.
    *   This `modelName` will be passed to `openai.chat.completions.create({ model: modelName || 'default-model', ... })`.
*   **Configuration**: 
    *   A default model can be specified globally or per-prompt in the registry.
*   **Logging**: 
    *   After each LLM call, log essential details: `timestamp`, `trpcProcedureName`, `projectId`, `sceneId` (if applicable), `promptNameUsed`, `promptVersionUsed`, `modelUsed`, `openaiRequestId` (from response header), estimated tokens/cost (if available).
    *   MVP: Log to server console. Post-MVP: Log to a dedicated table or logging service.

### Frontend (`src/app/projects/[id]/generate/page.tsx` & Components)
*   **Model Selection UI**: 
    *   A simple dropdown or settings option in the workspace UI (e.g., in a settings modal or a corner of `ChatPanelG`).
    *   The selected model preference would be stored (e.g., in `localStorage`, user settings in DB, or project-level settings).
*   **Passing Model Preference**: 
    *   The selected `modelName` from the UI/settings needs to be included in the input when calling tRPC mutations in `generation.ts`.
    *   This might involve updating the state management (e.g., Zustand store) for the workspace to hold the current model preference.

## 3. MVP Strategy & Considerations

*   **Prompt Registry - File-Based**: Start with prompts stored as plain text or JSON files in the codebase (e.g., `src/server/config/prompts/`). This is simple to implement and version control with Git. A database-backed registry is a post-MVP enhancement.
*   **Model Selection - Limited Choice**: Offer 2-3 models initially. The UI should be a simple dropdown.
*   **Default Model**: Ensure a sensible default model is used if no preference is set.
*   **Logging - Console First**: For MVP, structured console logging on the server is sufficient for debugging and basic auditing. Database logging can follow.
*   **No UI for Prompt Editing (MVP)**: Prompt changes are done by developers editing the prompt files and redeploying. A full admin UI for prompt management is post-MVP.
*   **Temperature/Other Params**: For MVP, keep other LLM parameters (temperature, top_p) hardcoded within `generation.ts` procedures or defined alongside prompts in the registry, but not user-configurable via UI yet.

## 4. Iteration Path (Post-MVP)
*   Database-backed prompt registry with versioning and an admin UI for editing/managing prompts.
*   A/B testing framework for prompts/models.
*   More sophisticated logging and analytics dashboard.
*   User-configurable temperature and other LLM parameters.
*   Dynamic prompt construction based on context or user inputs (beyond simple templating).
*   Support for more LLM providers.
