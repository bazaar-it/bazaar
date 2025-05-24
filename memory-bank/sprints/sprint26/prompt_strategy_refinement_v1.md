# Prompt Strategy Refinement for Video Generation: Prioritizing User Intent and Simplicity

## 1. Introduction
This document outlines the refined strategy for our video generation system. The primary goals are to:
- Prioritize and accurately reflect the user's explicit intent in generated videos.
- Simplify the initial user experience, focusing on delivering "one perfect scene" for the Minimum Viable Product (MVP).
- Establish a robust and scalable foundation for future enhancements, including multi-scene videos and advanced animation capabilities.
This refinement addresses challenges identified in earlier iterations and incorporates insights from collaborative discussions and analysis of different LLM-assisted approaches.

## 2. Current Challenges with Previous Approach
Our initial approach, while functional, presented several challenges that could hinder user experience and scalability:
- **Risk of Overriding Specific User Intent:** Injecting a large library of `animationTemplateExamples` into every system prompt could lead the LLM to ignore or misinterpret precise user instructions, especially when users provided detailed animation specifications.
- **Token Bloat & Performance Issues:** Large system prompts consume more tokens, increasing API costs and potentially leading to higher latency. This is particularly relevant for models like `gpt-4o-mini`.
- **Scalability of Examples:** Embedding an ever-growing list of animation templates directly into prompts is unsustainable.
- **Hardcoded Assumptions:** The system sometimes made assumptions (e.g., always generating intro/content/outro structures) that didn't align with users wanting quick, single-clip animations.
- **Iterative Editing Ambiguity:** Modifying specific aspects of a scene (e.g., "make it red") lacked a clear, unambiguous mechanism for targeting the correct scene and element.

## 3. Core Principles Guiding the Refinement
The new strategy is built upon the following core principles:
- **User's Explicit Intent is Paramount:** If the user provides specific details (duration, colors, fonts, animation types), the system *must* adhere to these instructions meticulously.
- **Simplicity for MVP: Focus on "One Perfect Scene":** The initial product release should excel at generating a single, high-quality scene based on the user's prompt. Multi-scene capabilities will be an incremental addition.
- **Adaptive System Behavior:** The system must differentiate between highly specific prompts (requiring direct translation) and vague prompts (where guidance can be offered).
- **Lean, Targeted LLM Interactions:** Prompts should be concise and focused, avoiding unnecessary information that could confuse the LLM or waste tokens.
- **Clear Context for Iterative Edits:** Changes to existing scenes must be precise and context-aware.

## 4. The Agreed "Pause & Tidy" Sprint: A Two-Step Model for MVP
To achieve the above principles for the MVP, we will implement a simplified two-step model for generating each scene:

### Step 1: Prompt Analysis (`promptInspector.ts`)
- **Purpose:** To analyze the user's raw prompt and determine its nature before extensive LLM processing.
- **Functionality:**
    - Classifies prompt specificity: `'high'` (user provided detailed instructions) or `'low'` (user request is vague).
    - May extract key details like requested duration, scene count hints (if any), and potential animation pattern hints (e.g., "logo," "text reveal," "bubble").
- **Initial Implementation:** Regex-based heuristics (e.g., looking for keywords like "seconds", hex color codes, font names, specific animation verbs like "fade in", "bounce").
- **Output:** An `PromptInsight` object, e.g., `{ specificity: 'high' | 'low', requestedDurationSec?: number, patternHint?: string }`.

### Step 2: Adaptive Code Generation (Single LLM Call per Scene)
- **Purpose:** To generate the Remotion component code for the scene, adapting the LLM's instructions based on the `PromptInsight`.
- **System Prompt Construction:**
    - **Base:** A concise prompt like: "You are a Remotion component coder. Generate a complete, ESM-compatible React component for a single scene. Ensure all necessary imports from 'remotion' and any specified assets are included. The component should accept props as defined by `SceneProps`. Adhere to `window.Remotion` for all Remotion API calls."
    - **For High Specificity Prompts (`PromptInsight.specificity === 'high'`):** Append: "CRITICAL: The user has provided specific instructions. You MUST follow these specifications meticulously and prioritize them over any general animation patterns."
    - **For Iterative Edits (when an `@scene(id)` tag is present):** A specialized system prompt will be used: "You are editing an existing Remotion component. Here is the previous code: [previous code]. Apply ONLY the following change based on the user's instruction: [user's edit instruction]. Output the complete, modified component code."
- **Assistant Message Construction (Conditional):**
    - **Only if `PromptInsight.specificity === 'low'` AND a relevant `patternHint` exists:**
        - Use `getTemplateSnippet.ts` (see below) to fetch *one* highly relevant and concise example snippet (e.g., ≤ 40 tokens, comment-stripped, no imports).
        - Include this snippet as an "assistant" message before the user's prompt. This guides the LLM on style and structure for common patterns without being overly prescriptive.
    - **Otherwise (high specificity or no relevant snippet for vague prompts):** No assistant message is used for initial generation.
- **User Message Construction:**
    - **Initial Generation:** The user's raw prompt.
    - **Iterative Edits:** The user's specific edit instruction (e.g., "Make the background red"), potentially prefixed with `@scene(id)`.

### Utility: `getTemplateSnippet.ts`
- **Purpose:** To provide concise, relevant examples for vague prompts.
- **Functionality:** Given a `patternHint` (e.g., "bubble," "logo") from `promptInspector.ts`, this utility retrieves a very short, illustrative code snippet from the `animationTemplates.ts` library.
- **`animationTemplates.ts` Role:** Evolves into a structured knowledge base of animation patterns and their core code snippets, used for targeted retrieval rather than wholesale injection.

## 5. Handling Iterative Edits: The `@scene(id)` Mechanism
To ensure precise iterative edits:
- **UI Responsibility:** When a user focuses on a specific scene card in the UI (e.g., by clicking it), and then types an edit instruction in the chat, the frontend will silently prepend an `@scene(scene-id)` tag to the message sent to the backend (e.g., `@scene(scene-001) Make the background #FF0000`).
- **Backend Responsibility:**
    - The backend will parse this tag to identify the target `scene-id`.
    - It will fetch the existing code for that `scene-id`.
    - It will then call the code generation LLM using the specialized "edit" system prompt, providing the old code and the new instruction.
- **Edge Case (No Scene Focus):** If the user types an ambiguous edit instruction (e.g., "make it red") without a scene being focused/tagged, the UI should prompt them: "Please select a scene to edit, or specify the scene name/number in your message."

## 6. JSON Safeguard for LLM Calls
- **Purpose:** To improve the reliability of LLMs when `response_format: { type: 'json_object' }` is specified (e.g., for future scene planning or structured data extraction).
- **Action:** When making such calls, ensure that any system prompts are stripped of markdown examples or ```code``` blocks, as these can sometimes confuse the LLM and lead to invalid JSON output.

## 7. Benefits of This Approach for MVP
This refined two-step model offers significant advantages for our MVP:
- **Directly Achieves "One Perfect Scene":** Simplifies the core user flow to focus on high-quality single-scene generation.
- **Preserves User Intent:** Greatly reduces the risk of the system overriding specific user instructions.
- **Minimizes Token Usage:** Leads to leaner prompts, reducing costs and latency.
- **Simplified Backend Logic:** Easier to implement and maintain for the initial launch.
- **Clear Path for Iteration:** The `@scene(id)` mechanism provides a robust way to handle user refinements.

## 8. Future Evolution: Graduating to a Router-Based Architecture
This two-step model is designed as a strong foundation. As the application evolves and requires more sophisticated capabilities, we can seamlessly upgrade:
- **When to Evolve:**
    - When we have a large library of diverse animation pattern templates.
    - When we introduce automated multi-scene planning for complex videos in a single shot.
    - When different types of scenes require vastly different system prompts or even specialized LLM "coder" agents (e.g., 3D camera movements vs. kinetic typography).
- **Evolution Path:** The `promptInspector.ts` logic can be enhanced or replaced by a more sophisticated "Router" component. This Router (potentially an LLM call itself) would analyze the user prompt and scene requirements in more depth and then direct the request to one or more specialized "Coder" LLM calls, each configured for specific tasks or animation styles. The UI contract (like `@scene(id)`) can remain consistent.

## 9. Concrete Action List for Implementation (Pause & Tidy Sprint)
The following tasks will implement this refined strategy:
1.  **`promptInspector.ts` Implementation (Est. 1 hour):**
    *   Develop regex-based heuristics to detect specificity (hex colors, duration mentions like `\b\d+\s*(s|sec|seconds|frames)\b`, font names, explicit animation verbs like "fade," "slide," "bounce," "explode," "rotate") and potential `patternHint` (e.g., "logo," "text," "bubble").
    *   Ensure it outputs an `PromptInsight` object: `{ specificity: 'high'|'low', patternHint?: string }`.
    *   Include unit tests.
2.  **`getTemplateSnippet.ts` Implementation (Est. 30 mins):**
    *   Create a utility that, given a `patternHint`, retrieves a relevant, comment-stripped, import-free snippet (max ~40 tokens) from `animationTemplates.ts`.
3.  **Refactor Generator LLM Call (Est. 45 mins):**
    *   Modify the existing `generateComponentCode` (or equivalent) tRPC procedure.
    *   Dynamically construct the `system`, `assistant` (conditional snippet), and `user` messages as described in Section 4.
    *   Handle the "edit" prompt variant when `@scene(id)` is present.
4.  **Scene Focus UI Tweak & `@scene(id)` Tagging (Est. 1 hour):**
    *   Modify the chat input UI to silently prepend `@scene(scene-id)` when a scene card is selected/focused.
    *   Implement the UI toast/message for ambiguous edits if no scene is selected: "Select a scene to edit, or specify the scene name in your message."
5.  **Add JSON-only Safeguard (Est. 15 mins):**
    *   Review any LLM calls that expect JSON output and ensure their system prompts are free of markdown/code blocks that could interfere. (This might be more relevant for future planning steps).
6.  **Smoke Tests (Est. 30 mins):**
    *   **Test A (High Specificity):** Prompt: "One 3-second scene, white bg, black Arial 48px text ‘Hi’, fade-in." Expected: Exact code generated, no template snippet used by the LLM.
    *   **Test B (Vague Prompt):** Prompt: "Make a cool bubble animation." Expected: `promptInspector` identifies as 'low' specificity, a relevant bubble snippet is provided to the LLM, and the generated code reflects the bubble animation style.
    *   **Test C (Iterative Edit Loop):** Focus a generated scene, type "make it red." Expected: Only that scene is updated in the preview, and the change reflects the instruction.

**Total Estimated Time: ~4 hours**

## 10. Conclusion
This "pause & tidy" sprint, focusing on the refined two-step model, will deliver a more robust, user-centric, and predictable video generation experience for our MVP. It directly addresses the core feedback regarding simplicity and user intent, while establishing a clean and scalable architecture for future growth.
