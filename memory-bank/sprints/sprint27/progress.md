//memory-bank/sprints/sprint27/progress.md
# Sprint 27 Kick-off: BAZAAR-305 - Core Features & Quality

## Sprint Goals:
- **Initiate "My Projects" Feature**: Begin frontend development for project listing and management.
- **Enhance Animation Quality**: Evaluate and iterate on LLM prompts for Remotion component generation (BAZAAR-301).
- **Advance Publish & Share**: Continue implementation of BAZAAR-303.
- **Finalize BAZAAR-302**: Address any remaining minor tasks.

## BAZAAR-305: Detailed Plan & Current Status (Start of Sprint 27)

This sprint focuses on the key deliverables for BAZAAR-305, building upon the completion of BAZAAR-304.

**Key Priorities & Status:**

1.  **Project Persistence & Retrieval ("My Projects") - CRITICAL**
    *   **Goal**: Enable users to view, open, and manage their video projects.
    *   **Backend Status (as of Jan 26, 2025)**:
        *   The `projects` table schema (`src/server/db/schema.ts`) is deemed suitable.
        *   The existing tRPC endpoint `project.list` (`src/server/api/routers/project.ts`) can fetch projects for the authenticated user. This endpoint currently selects all columns from the `projects` table; optimization to select only necessary fields (e.g., `id`, `title`, `createdAt`, `updatedAt`, thumbnail) can be a future task if performance dictates.
    *   **Sprint 27 Focus (Frontend)**:
        *   Design and implement the UI for the "My Projects" page/section.
        *   Integrate with the `project.list` tRPC endpoint to display user projects.
        *   Consider basic project management actions (e.g., open, rename, delete - design first).

2.  **Prompt Engineering & Animation Quality (Revisit BAZAAR-301) - CRITICAL**
    *   **Goal**: Ensure generated Remotion components are visually engaging animations, aligning with user intent.
    *   **System Prompt Status (as of Jan 26, 2025)**:
        *   The system prompt for `generateComponentCode` in `src/server/api/routers/generation.ts` is concise. It enforces ESM patterns and directs the LLM to "build visual animation."
        *   However, it lacks the detailed guidance on specific animation techniques, visual elements, and patterns to avoid, as outlined in the original `BAZAAR-301-improve-animation-focus.md` plan.
    *   **Sprint 27 Focus (Verification & Iteration)**:
        *   **Action (USER)**: Run test animation prompts (e.g., "a blue circle smoothly growing", "text 'Hello World' sliding in") to evaluate the current animation output quality.
        *   **Action (CASCADE & USER)**: Based on test results, if animation quality is subpar, collaboratively update the system prompt in `generation.ts`. This will involve incorporating more detailed instructions, examples, and potentially negative constraints from `BAZAAR-301-improve-animation-focus.md`.
        *   **Investigation**: Analyze the `scene.props` passed to `generateComponentCode`. Ensure these props are structured as animation parameters rather than descriptive text that might lead the LLM to generate static content.

3.  **Completing BAZAAR-303 (Publish & Share)**
    *   **Goal**: Deliver a functional end-to-end pipeline for bundling scenes and making them shareable.
    *   **Status (as of Jan 26, 2025)**: Early stages. R2 S3Client configuration in `packages/r2/index.ts` is updated. Storyboard publishing scope in tRPC API is currently stubbed.
    *   **Sprint 27 Focus**:
        *   Continue implementation of the publish workflow.
        *   Develop UI elements for initiating publishing and displaying shareable links.
        *   Address the `scope: 'storyboard'` functionality.

4.  **Wrap-up BAZAAR-302 (Scene-First Refactor)**
    *   **Goal**: Finalize any pending minor UX adjustments, tests, and documentation.
    *   **Sprint 27 Focus**: Review BAZAAR-302 notes and complete any small, outstanding tasks.

## Sprint 27 - TODO / Immediate Actions:

*   **[USER]** Execute test animation prompts and share results.
*   **[CASCADE/USER]** Based on test results, refine `generateComponentCode` system prompt in `generation.ts`.
*   **[CASCADE/USER]** Begin design and scaffolding for the "My Projects" UI.
    *   Create a new page/route (e.g., `/projects`).
    *   Develop a component to list projects, using `api.project.list.useQuery()`.
*   **[CASCADE]** Update main `progress.md` and `TODO.md` to reflect Sprint 27 start.
*   **[CASCADE/USER]** Plan specific tasks for BAZAAR-303 (Publish & Share) for this sprint.
*   **[CASCADE/USER]** Review and address any minor outstanding items from BAZAAR-302.
## [2025-05-27] Sidebar project list added in generate workspace for quick navigation.
