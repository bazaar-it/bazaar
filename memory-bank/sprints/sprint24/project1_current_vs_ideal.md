// /memory-bank/sprints/sprint24/project1_current_vs_ideal.md
# Project 1: Standard Functionality - Current vs. Ideal Pipeline

## Overview
This document details the current end-to-end pipeline for Project 1 (Standard Video Editor Functionality) and proposes an ideal, simplified architecture. Project 1 focuses on the user experience within `src/app/projects/[id]/edit/page.tsx`, where users interact with a chat interface to generate and modify video scenes.

## Current End-to-End Pipeline

The current pipeline processes user prompts to generate Animation Design Briefs (ADBs), then custom components, and finally renders them in the Remotion player.

1.  **User Prompt Submission & Initial Processing:**
    *   **UI Interaction:** User types a prompt in `ChatPanel.tsx` within `src/app/projects/[id]/edit/page.tsx`.
    *   **API Call:** `chat.sendMessage` tRPC procedure in `src/server/api/routers/chat.ts` is invoked.
    *   **Database Entry:** User's message is saved, and a placeholder for the assistant's response is created.

2.  **Orchestration & LLM Interaction:**
    *   **Service Layer:** `chatOrchestration.service.ts` (`processUserMessage` function) takes over.
    *   **Context Gathering:** Retrieves conversation history and current project properties (scenes, assets, etc.) from the database.
    *   **LLM Call:** Sends a request to OpenAI (e.g., GPT-4) with function calling enabled. The prompt includes conversation history and project context.
    *   **Streaming Response:** Handles the streaming response from the LLM, which can include text and tool calls (function calls).

3.  **Animation Design Brief (ADB) Generation / Patching:**
    *   **Tool Call Handling:** If the LLM requests to generate or patch an ADB (e.g., via a `generateAnimationDesignBrief` or `patchAnimationDesignBrief` function call).
    *   **ADB Service:** `animationDesigner.service.ts` is invoked to process the request.
    *   **Schema Validation:** The generated/patched ADB (a JSON object defining scenes, elements, and animations) is validated against a Zod schema.
    *   **Database Update:** The valid ADB is saved to the project's scene data in the database.

4.  **Custom Component Generation (If Requested):**
    *   **Tool Call Handling:** If the LLM requests to generate a custom Remotion component (e.g., via a `generateCustomComponent` function call).
    *   **Component Service:** `customComponent.service.ts` and `buildCustomComponent.worker.ts` handle:
        *   Generating the TSX code for the component.
        *   Building the component into a JavaScript bundle using esbuild.
        *   Storing the bundle in R2 (or similar cloud storage).
    *   **Database Update:** The component's metadata (name, path to bundle) is saved.

5.  **UI Update & Rendering:**
    *   **SSE Updates:** Server-Sent Events (SSE) push updates to the client (`PreviewPanel.tsx`, `ChatPanel.tsx`, `ScenePlanningHistoryPanel.tsx`).
    *   **State Management:** Client-side state (e.g., Zustand store) is updated with new scene data or component information.
    *   **Remotion Player:** `PreviewPanel.tsx` re-renders the Remotion `Player`, which dynamically loads scenes and custom components.
    *   **Dynamic Loading:** Custom components are loaded using `React.lazy` and the stored bundle path.

## Current Assumptions & Challenges

*   **Sequential Process:** The pipeline largely assumes a sequential flow: prompt -> ADB -> (optional) component -> render.
*   **LLM Reliability:** Relies heavily on the LLM correctly interpreting prompts and generating valid ADBs/component code.
*   **Error Handling:** Errors in ADB generation or component builds can disrupt the flow; robust recovery is complex.
*   **State Synchronization:** Keeping client-side state synchronized with server-side changes, especially with concurrent operations, can be challenging.
*   **Component Rendering in PreviewPanel:** Ensuring newly generated or patched components render correctly and immediately in `PreviewPanel.tsx`.
*   **R2 Storage Discrepancies:** Occasional issues with finding or loading components from R2.
*   **Debugging Complexity:** The multi-step process involving LLMs, databases, build workers, and client-side rendering can be hard to debug.

## Desired State & Improvements

*   **Enhanced Modularity:** Clearer separation of concerns between services (chat, ADB, component generation, rendering).
*   **Improved Observability:** Better logging and tracing across the entire pipeline.
*   **Robust Error Handling & Recovery:** Graceful degradation and retry mechanisms.
*   **Transactional Operations:** Ensure atomicity for operations like ADB updates and component registration.
*   **Optimized State Management:** More efficient and reliable state synchronization.
*   **Faster Feedback Loop:** Quicker updates to the UI, especially for ADB changes and component availability.
*   **Standardized Interfaces:** Consistent data formats (e.g., for ADBs, component metadata).

## Simplified Architecture Proposal (Ideal)

1.  **Input Layer (Client):**
    *   `ProjectEditorRoot` (`page.tsx`) -> `ChatPanel.tsx`
    *   tRPC client calls to backend.

2.  **API Layer (tRPC Router - `chat.ts`):**
    *   Receives requests, basic validation.
    *   Delegates to `ChatOrchestrationService`.

3.  **Orchestration Layer (`ChatOrchestrationService`):**
    *   Manages the overall flow.
    *   Interacts with `LLMService` for AI processing.
    *   Interacts with `ProjectStateService` for DB operations.
    *   Dispatches events or calls other specific services based on LLM output.

4.  **Specialized Services:**
    *   `LLMService`: Handles all communication with OpenAI, prompt engineering, context management.
    *   `AnimationDesignBriefService`: Manages ADB creation, validation, and patching.
    *   `CustomComponentService`: Manages custom component code generation, building, storage, and registration.
        *   Includes `BuildWorker` for isolated component building.
    *   `ProjectStateService`: Manages all database interactions for project data (scenes, assets, ADBs, components).

5.  **Notification Layer (SSE - `sseManager.service.ts`):**
    *   Pushes real-time updates to the client based on events from services.

6.  **Client-Side Rendering:**
    *   `PreviewPanel.tsx` subscribes to project state updates and re-renders Remotion `Player`.
    *   Dynamic component loading mechanism remains.

This revised architecture aims for better separation, testability, and maintainability.
