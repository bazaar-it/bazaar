//memory-bank/sprints/sprint33/codebase-cleanup-analysis.md
# Codebase Cleanup Analysis (Sprint 33)

This document outlines files and folders identified as potentially unused or deprecated within the Bazaar-Vid codebase. The analysis focuses on identifying code that is not referenced by recent development efforts (primarily sprint32, MAIN-FLOW, and other recent sprint documentation) and may be a candidate for removal to improve codebase maintainability.

**Methodology:**

1.  Review codebase structure by listing directories and files.
2.  Analyze references from recent sprint folders (sprint30, sprint31, sprint32, sprint33) and the `memory-bank/MAIN-FLOW` directory.
3.  Cross-reference with existing memories about refactoring, deprecated features, and architectural changes.
4.  Use `grep_search` and `codebase_search` to find usages of suspicious files/components.
5.  List potential candidates for deprecation/deletion with justifications in this document.

**Disclaimer:** This is an initial analysis. Further investigation and confirmation by the development team are required before any actual deletion of files or folders.

## Initial `src` Directory Overview:

- `__mocks__` (dir, 2 children)
- `__tests__` (dir, 1 child)
- `app` (dir, 93 children) - Core Next.js App Router.
- `client` (dir, 39 children) - Potential legacy client code.
- `components` (dir, 53 children) - UI components.
- `config` (dir, 4 children) - Application configuration.
- `env.js` (file)
- `hooks` (dir, 13 children) - Custom React hooks.
- `index.css` (file)
- `instrumentation.ts` (file)
- `layouts` (dir, 1 child) - Potential legacy layouts.
- `lib` (dir, 49 children) - Libraries, utilities, services.
- `memory-bank` (dir, 4 children) - Documentation and memories.
- `pages` (dir, 1 child) - Potential legacy pages/API routes.
- `queues` (dir, 1 child) - Background job processing.
- `remotion` (dir, 36 children) - Remotion video generation code.
- `scripts` (dir, 184 children) - Build/utility scripts; may contain unused ones.
- `server` (dir, 123 children) - Backend logic, API routes, services.
- `shared` (dir, 3 children) - Code shared between client/server.
- `stores` (dir, 4 children) - State management.
- `styles` (dir, 1 child)
- `templates` (dir, 32 children) - May contain unused templates.
- `tests` (dir, 33 children) - Test files.
- `tree.json` (file)
- `trpc` (dir, 3 children) - tRPC setup.
- `types` (dir, 12 children) - TypeScript type definitions.
- `utils` (dir, 3 children) - Utility functions.

## Potential Candidates for Deprecation/Deletion:

**Status Update (as of 2025-06-03):** The USER has performed significant deletions. This document is being updated to reflect these changes and incorporate findings from memory `f915b483-0d33-46be-8b48-49f43057c073`.

**NOTE:** The core component `src/app/projects/[id]/generate/GenerateVideoClient.tsx` was also deleted by the USER on 2025-06-03. This was a central piece of the video generation UI and its removal signifies a major refactoring or change in approach.

### 1. `src/pages/api` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/pages/api`
*   **Status (2025-06-03):** CONFIRMED DELETED. Attempts to list this directory and its subdirectories failed, indicating it has already been removed from the codebase.

### 2. `src/client` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/client`
*   **Contents:** Contains `components` (34 children) and `hooks` (5 children) subdirectories.
*   **Analysis (Initial):** This directory may contain legacy client-side code. The Next.js App Router encourages co-locating client components within `app` or using a main `src/components` directory. Specific subdirectories like `test-harness` seem particularly likely to contain non-production or experimental code.
*   **`src/client/components` contains:**
    *   `AnalyticsProvider.tsx`
    *   `ErrorBoundary.tsx`
    *   `a2a` (dir, 4 children)
    *   `custom-component` (dir, 6 children)
    *   `test-harness` (dir, 22 children)
*   **`src/client/hooks` contains:**
    *   `a2a` (dir, 1 child)
    *   `sse` (dir, 4 children)
*   **Recommendation:** Further investigation needed for each subdirectory to determine current usage.

    *   **`src/client/components/test-harness` contents:**
        *   `A2AIntegrationTest.tsx`
        *   `AgentNetworkGraph.tsx`
        *   `AnimationDesignBriefViewer.tsx`
        *   `CodeViewer.tsx`
        *   `EvaluationDashboard.tsx` (Potentially related to AI eval system, see memory `8053694d-456a-48ae-aad1-a3641c42bf7b`)
        *   `MessageDetailModal.tsx`
        *   `MessagePreview.tsx`
        *   `MinimalA2ATest.tsx`
        *   `SimpleA2ATest.tsx`
        *   `TaskCreationPanel.tsx`
        *   `TaskDetails.tsx`
        *   `TaskInputForm.tsx`
        *   `__tests__` (dir, 1 child)
        *   `evaluation` (dir, 9 children) (Potentially related to AI eval system)
        *   **Analysis:** These components seem highly specialized for testing/debugging.
        *   **Further Analysis (Update for `EvaluationDashboard.tsx` and `evaluation` subdir):**
            *   A `grep_search` for `EvaluationDashboard` within `src` only found references within its own file (`src/client/components/test-harness/EvaluationDashboard.tsx`), suggesting it is not imported or used by other application code outside this test harness.
            *   The `src/client/components/test-harness/evaluation` directory contains UI components like `AgentCard.tsx`, `MetricsOverview.tsx`, `PerformanceMetricsView.tsx`, etc., clearly related to an evaluation dashboard UI.
            *   Memory `8053694d-456a-48ae-aad1-a3641c42bf7b` details a comprehensive CLI-based AI evaluation system (`npm run evals`) with results stored in `/memory-bank/evals/`. This suggests the UI in `test-harness` might be an older, experimental, or deprecated version.
        *   **Recommendation:** The entire `src/client/components/test-harness` directory, including `EvaluationDashboard.tsx` and its `evaluation` subdirectory, was a very strong candidate for deprecation/deletion.
        *   **Status (2025-06-03):** USER CONFIRMED DELETED. The following files from this directory (and its `evaluation` subdirectory) have been removed:
            *   `src/client/components/test-harness/A2AIntegrationTest.tsx`
            *   `src/client/components/test-harness/AgentNetworkGraph.tsx`
            *   `src/client/components/test-harness/AnimationDesignBriefViewer.tsx`
            *   `src/client/components/test-harness/CodeViewer.tsx`
            *   `src/client/components/test-harness/EvaluationDashboard.tsx`
            *   `src/client/components/test-harness/MessageDetailModal.tsx`
            *   `src/client/components/test-harness/MessagePreview.tsx`
            *   `src/client/components/test-harness/SimpleA2ATest.tsx`
            *   `src/client/components/test-harness/MinimalA2ATest.tsx`
            *   `src/client/components/test-harness/TaskCreationPanel.tsx`
            *   `src/client/components/test-harness/TaskDetails.tsx`
            *   `src/client/components/test-harness/TaskInputForm.tsx`
            *   `src/client/components/test-harness/evaluation/TaskTimeline.tsx`
            *   `src/client/components/test-harness/evaluation/TaskDetailsPanel.tsx`
            *   `src/client/components/test-harness/evaluation/RemotionPreview.tsx`
            *   `src/client/components/test-harness/evaluation/PerformanceMetricsView.tsx`
            *   `src/client/components/test-harness/evaluation/MetricsOverview.tsx`
            *   `src/client/components/test-harness/evaluation/ErrorAnalysis.tsx`
            *   `src/client/components/test-harness/evaluation/ChatPanel.tsx`
            *   `src/client/components/test-harness/evaluation/CategoryBreakdown.tsx`
            *   `src/client/components/test-harness/evaluation/AgentCard.tsx`

    *   **`src/client/components/a2a` contents:**
        *   `AgentMessageList.tsx`
        *   `TaskStatus.tsx`
        *   `TaskStatusBadge.tsx`
        *   `index.ts`
        *   **Analysis:** These components appear related to displaying Agent-to-Agent (A2A) communication or task statuses. They might be linked to the A2A test components found in `test-harness` and could be part of a specialized debugging or experimental UI.
        *   **Recommendation:** Needs further investigation to see if these A2A UI components are used anywhere in the production application or if they are solely for debugging/testing. If the latter, they are candidates for deletion.

    *   **`src/client/components/custom-component` contents:**
        *   `ArtifactViewer.tsx`
        *   `ComponentStatusSSE.tsx`
        *   `CustomComponentsPanelSSE.tsx`
        *   `TaskInputForm.tsx` (Note: A file with the same name also exists in `src/client/components/test-harness`)
        *   `TaskMonitor.tsx`
        *   `index.ts`
        *   **Analysis:** These components, especially those with 'SSE' in their names, seem related to a UI for Server-Sent Events, possibly for monitoring custom component generation or status. This could be another specialized debugging or experimental UI.
        *   **Recommendation:** Investigate usage. If this is for debugging/testing and not part of the core user-facing application, it's a candidate for deletion.

    *   **`src/client/hooks/a2a` contents:**
        *   `useAgentMessages.ts`
        *   **Analysis:** This hook likely supports the A2A components in `src/client/components/a2a`.
        *   **Recommendation:** Same as for `src/client/components/a2a`.

    *   **`src/client/hooks/sse` contents:**
        *   `__tests__` (dir, 1 child)
        *   `index.ts`
        *   `useSSE.ts`
        *   `useTaskStatus.ts`
        *   **Analysis:** These hooks likely support the SSE-related components in `src/client/components/custom-component`.
        *   **Recommendation:** Same as for `src/client/components/custom-component`.

*   **Overall `src/client` Recommendation:** The `src/client` directory housed components and hooks for specialized UIs. Many of these have now been deleted.
    *   **Status (2025-06-03):** USER CONFIRMED DELETED `src/client/components/AnalyticsProvider.tsx` and `src/client/components/ErrorBoundary.tsx`.
    *   The remaining subdirectories (`a2a`, `custom-component` in `components`, and `a2a`, `sse` in `hooks`) should still be investigated.

### 3. `src/layouts` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/layouts`
*   **Status (2025-06-03):** CONFIRMED DELETED. An attempt to list this directory failed, indicating it has already been removed from the codebase.

### 4. Analysis of Specific Components (from Memory/Previous Sprints)

*   **`ImageUploadArea.tsx`**
    *   **Context:** Memory `c5887e1c-8e66-4101-8290-0171750c6553` identified this component as potentially deprecated and used in `BasicSceneCreator.tsx` (also potentially old).
    *   **Objective:** Determine if `ImageUploadArea.tsx` is used elsewhere or if it and its primary known consumer can be deprecated.
    *   **Initial `grep_search` Findings:**
        *   The search for `ImageUploadArea` primarily returned results from its own definition file: `src/components/ImageUploadArea.tsx` (interface `ImageUploadAreaProps`, function `ImageUploadArea`, and internal console logs).
        *   No immediate external usages were identified in this initial broad search.
    *   **Update:** A `find_by_name` search for `BasicSceneCreator.tsx` within the `src` directory yielded no results. This suggests that `BasicSceneCreator.tsx`, the primary known consumer of `ImageUploadArea.tsx` (according to memory `c5887e1c-8e66-4101-8290-0171750c6553`), may have already been deleted or was named differently.
    *   **Recommendation:** Given that `ImageUploadArea.tsx` has no other identified significant usages and its main known dependent `BasicSceneCreator.tsx` cannot be found, `ImageUploadArea.tsx` is a **very strong candidate for deletion**.

*   **`SceneCreatorLayout.tsx` and `SceneTypeSelector.tsx`**
    *   **Context:** Memory `c5887e1c-8e66-4101-8290-0171750c6553` also identified these components as potentially deprecated.
    *   **Objective:** Determine their current status and usage.
    *   **Update:** `find_by_name` searches for `SceneCreatorLayout.tsx` and `SceneTypeSelector.tsx` within the `src` directory yielded no results.
    *   **Recommendation:** Similar to `BasicSceneCreator.tsx`, these components were likely already deleted or were part of a deprecated feature set. They are confirmed as not present and thus not requiring further action beyond noting their absence.

*   **`src/app/old-videogen-process/` directory**
    *   **Context:** Memory `c5887e1c-8e66-4101-8290-0171750c6553` identified this directory as potentially deprecated.
    *   **Update:** A `list_dir` command for `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/app/old-videogen-process` failed, indicating the directory does not exist.
    *   **Recommendation:** This directory has already been removed from the codebase.

*   **`src/app/test-beds/` directory**
    *   **Context:** Memory `c5887e1c-8e66-4101-8290-0171750c6553` identified this directory as potentially deprecated.
    *   **Update:** A `list_dir` command for `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/app/test-beds` failed, indicating the directory does not exist.
    *   **Recommendation:** This directory has also been removed from the codebase.

### 6. `src/components/ImageUploadArea.tsx`

*   **Status (2025-06-03):** USER CONFIRMED DELETED.

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/components/ImageUploadArea.tsx`
*   **Analysis:**
    *   No significant external usages were found in previous `grep_search` attempts.
    *   Its primary known consumer, `BasicSceneCreator.tsx` (identified in memory `c5887e1c-8e66-4101-8290-0171750c6553`), could not be found and was likely already deleted.
    *   A newer, minimal image upload UX has been implemented in `ChatPanelG` (see memory `e2a26b6e-7f5d-4484-9924-77644038af96`), which supersedes bulky UI like `ImageUploadArea`.
*   **Recommendation:** Was a very high candidate for deletion. Now confirmed deleted.

### 5. `src/app/projects/[id]/edit/` Directory (including `page.tsx`)

*   **Status (2025-06-03):** USER CONFIRMED DELETED.
*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/app/projects/[id]/edit/`
*   **Analysis:**
    *   User has indicated this directory and its contents (specifically `page.tsx`) might be unused as focus is on `src/app/projects/[id]/generate/page.tsx`.
    *   The directory contains UI components like `EditorLayout.tsx`, `ProjectEditorRoot.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `WorkspaceContentArea.tsx`, `page.tsx`, and a `panels/` subdirectory. It also contains some backup files.
    *   **Grep Search Findings (2025-06-03):**
        *   A search for the path segment `app/projects/[id]/edit` yielded no results outside of the directory itself, suggesting the route is not directly linked or imported elsewhere.
        *   A search for `edit/page.tsx` only found the file itself, indicating it's not imported elsewhere.
        *   A search for `ProjectEditorRoot` (a key component in `edit/`) found it's only imported by `edit/page.tsx` (internal usage) and its own definition file.
        *   A search for `EditorLayout` (another component in `edit/`) only found its own definition file.
    *   These searches strongly suggest the directory is self-contained and not used by other parts of the application.
    *   Deletion of this frontend route, if confirmed unused, is unlikely to affect the usage of backend services in `src/server/services/`.
*   **Recommendation:** Directory was confirmed unused and deleted by the user.

### 4. `src/app/projects/[id]/generate/GenerateVideoClient.tsx`

*   **Status (2025-06-03):** USER CONFIRMED DELETED (after prior restoration).

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/app/projects/[id]/generate/GenerateVideoClient.tsx`
*   **Analysis:**
    *   This component was previously deleted, then restored, and has now been confirmed deleted again by the user. Its deletion significantly impacts the assessment of other files, particularly within `src/app/projects/[id]/generate/agents/`, as it was the primary known consumer of `PromptOrchestrator`.
    *   The restored client code appears to still use these older, potentially missing, tRPC procedures.
*   **Recommendation:** With the file now deleted, the focus is on ensuring that its removal does not negatively impact the primary generation interface located in `src/app/projects/[id]/generate/page.tsx` and the `src/app/projects/[id]/generate/workspace/` directory. Any dependencies it had (like `agents/PromptOrchestrator`) need to be re-evaluated for usage by the remaining active components.

### 5. `src/app/projects/[id]/generate/` Subdirectories (`agents/`, `components/`, `types/`, `utils/`) Analysis

*   **Status (2025-06-03):** Under Investigation.
*   **Paths:**
    *   `src/app/projects/[id]/generate/agents/`
    *   `src/app/projects/[id]/generate/components/`
    *   `src/app/projects/[id]/generate/types/`
    *   `src/app/projects/[id]/generate/utils/`
*   **Context:** User has confirmed `GenerateVideoClient.tsx` is deleted. The goal is to determine if these directories (or files within them) are used by the remaining active generation UI. The essential files to preserve are primarily:
    *   `src/app/projects/[id]/generate/page.tsx`
    *   `src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx`
    *   `src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx`
    *   `src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx`
    *   Files within `src/app/projects/[id]/generate/workspace/panels/` (e.g., `ChatPanelG.tsx`, `PreviewPanelG.tsx`, etc.).
*   **Contents Overview:**
    *   `agents/`: Contains `promptOrchestrator.ts`, `assetAgent.ts`, `codeGenerator.ts`, `sceneAgent.ts`, `styleAgent.ts`, `interfaces.ts`, `index.ts`.
    *   `components/`: Contains `GenerationProgress.tsx`, `PromptForm.tsx`, `RemotionLoader.tsx`, `RemotionPreview.tsx`, `SceneEditor.tsx`, `StoryboardViewer.tsx`.
    *   `types/`: Contains `storyboard.ts`.
    *   `utils/`: Contains `animationTemplates.ts`, `getTemplateSnippet.ts`, `promptInspector.ts`, and several test files (`.spec.ts`, `.test.ts`).
*   **Investigation Plan:**
    *   Systematically check for imports from these four directories into the essential files/directories listed above.
*   **`agents/` Directory Findings (2025-06-03):**
    *   `promptOrchestrator.ts` was the primary known dependency from `agents/`, used by the now-deleted `GenerateVideoClient.tsx`.
    *   Targeted `grep_search` for imports from `agents/` (using patterns like `/agents/`, `from "./agents"`, `from "../agents"`) into `src/app/projects/[id]/generate/workspace/` and `src/app/projects/[id]/generate/page.tsx` yielded **no results**.
    *   This strongly indicates that the `agents/` directory is not currently used by the active generation UI.
    *   **Conclusion for `agents/`**: High candidate for deletion.
*   **Recommendation:** Proceed with targeted `grep_search` for imports into the essential files.

*   **`components/` Directory Findings (2025-06-03):**
    *   The directory contains: `GenerationProgress.tsx`, `PromptForm.tsx`, `RemotionLoader.tsx`, `RemotionPreview.tsx`, `SceneEditor.tsx`, `StoryboardViewer.tsx`.
    *   Targeted `grep_search` for imports from `components/` into `src/app/projects/[id]/generate/workspace/` and `src/app/projects/[id]/generate/page.tsx` found one key import:
        *   `PreviewPanelG.tsx` imports `RemotionPreview.tsx` using the path `../../components/RemotionPreview`.
    *   This confirms `src/app/projects/[id]/generate/components/RemotionPreview.tsx` is actively used.
    *   Other imports found (e.g., `from "~/components/..."`) refer to the global `src/components/` directory, not the local `generate/components/`.
    *   **Conclusion for `components/`**: The directory cannot be deleted wholesale as `RemotionPreview.tsx` is used. Further investigation is needed for the other components within this directory.
    *   **Individual Component Analysis (2025-06-03):**
        *   `GenerationProgress.tsx`: Grep searches within `src/app/projects/[id]/generate/` found no imports of this component. **Likely unused.**
        *   `PromptForm.tsx`: Grep searches within `src/app/projects/[id]/generate/` found no imports of this component. Was likely used by `GenerateVideoClient.tsx`. **Likely unused.**
        *   `SceneEditor.tsx`: Grep searches within `src/app/projects/[id]/generate/` found no imports of this component. **Likely unused.**
        *   `StoryboardViewer.tsx`: Grep searches within `src/app/projects/[id]/generate/` found no imports of this component. **Likely unused.**
        *   `RemotionLoader.tsx`: Grep search within `RemotionPreview.tsx` found no imports of this component. **Likely unused.**
    *   **Overall Conclusion for `src/app/projects/[id]/generate/components/` (2025-06-03):**
        *   Only `RemotionPreview.tsx` is confirmed to be used (by `PreviewPanelG.tsx`).
        *   The following components are likely unused and are candidates for deletion: `GenerationProgress.tsx`, `PromptForm.tsx`, `RemotionLoader.tsx`, `SceneEditor.tsx`, `StoryboardViewer.tsx`.
        *   The directory itself should be kept for `RemotionPreview.tsx`, but the unused files within it can be removed.

*   **`types/` Directory Findings (2025-06-03):**
    *   This directory contains `storyboard.ts`, which defines types like `Storyboard`, `Scene`, `Asset`, `GenerationState`, etc.
    *   Initial broad `grep_search` for "storyboard" and "/types/" in active UI components (`page.tsx`, `workspace/*`, `components/RemotionPreview.tsx`) did not reveal direct imports from `src/app/projects/[id]/generate/types/storyboard.ts`.
    *   Some *likely unused* components within `generate/components/` (e.g., `GenerationProgress.tsx`, `SceneEditor.tsx`, `StoryboardViewer.tsx`) *do* import types from `../types/storyboard.ts`. If these components are deleted, these dependencies become irrelevant.
    *   **`types/` Directory Search Results (2025-06-03):**
    *   Targeted `grep_search` for imports of `storyboard.ts` (e.g., `from '../types/storyboard'`) or specific types from it (`Storyboard`, `Scene`, `Asset`, `GenerationState` via relative paths) into active UI components (`page.tsx`, `workspace/*`, `components/RemotionPreview.tsx`) and `src/stores/videoState.ts` yielded **no results**.
    *   This strongly suggests that `src/app/projects/[id]/generate/types/storyboard.ts` is not directly used by the current active generation UI or the `videoState` store.
    *   Its previous known usages were in components within `generate/components/` that are now identified as likely unused (e.g., `GenerationProgress.tsx`, `SceneEditor.tsx`, `StoryboardViewer.tsx`).
    *   **Conclusion for `types/`**: If the unused components in `generate/components/` are deleted, then `src/app/projects/[id]/generate/types/storyboard.ts` (and the `types/` directory itself) is a high candidate for deletion.

*   **`utils/` Directory Initial Investigation (2025-06-03):**
    *   This directory is expected to contain `animationTemplates.ts`, `getTemplateSnippet.ts`, `promptInspector.ts`, and various test files.
    *   `MEMORY[6dd0fc2b-1b34-45bd-82a3-19756d93f359]` indicated `promptInspector.ts` and `getTemplateSnippet.ts` were key for `generate/page.tsx`.
    *   Initial `grep_search` for relative imports (e.g., `from '../utils/...'`) of these files into `src/app/projects/[id]/generate/` yielded no results.
    *   **`utils/` Directory File List (2025-06-03):** `animationTemplates.ts`, `getTemplateSnippet.ts`, `promptInspector.spec.ts`, `promptInspector.ts`, `smoke302.test.ts`, `textRatioTest.ts`, `validateComponent.test.ts`.
    *   **Search Results (2025-06-03):**
        *   `grep_search` for `animationTemplates`, `getTemplateSnippet`, and `promptInspector` (as filenames or import strings) within `src/app/projects/[id]/generate/page.tsx` and `src/app/projects/[id]/generate/workspace/` yielded **no results**.
        *   This is contrary to `MEMORY[6dd0fc2b-1b34-45bd-82a3-19756d93f359]` which indicated `promptInspector.ts` and `getTemplateSnippet.ts` were key for `page.tsx`.
    *   **`utils/` Directory - `promptInspector.ts` Findings (2025-06-03):**
        *   `promptInspector.ts` exports: `PromptInsight` (interface), `analyzePrompt` (function), `getPatternHint` (function).
        *   `grep_search` for these exports in `page.tsx`, `workspace/` directory, and `src/server/api/routers/generation.ts` yielded **no results**.
        *   This suggests `promptInspector.ts` is **likely unused**, despite its previous importance in Sprint 26. Its functionality may have been refactored or removed.
        *   The associated test file `promptInspector.spec.ts` would also be a candidate for deletion if `promptInspector.ts` is deleted.

    *   **`utils/` Directory - `getTemplateSnippet.ts` Findings (2025-06-03):**
        *   `getTemplateSnippet.ts` exports: `getTemplateSnippet` (function), `getDefaultStyleHint` (function).
        *   `grep_search` for these exports in `page.tsx`, `workspace/` directory, and `src/server/api/routers/generation.ts` yielded **no results**.
        *   This suggests `getTemplateSnippet.ts` is also **likely unused**. Its functionality, like that of `promptInspector.ts`, may have been refactored or removed.
        *   The test file `smoke302.test.ts` was related to the BAZAAR-302 refactor which introduced these utils. If both `promptInspector.ts` and `getTemplateSnippet.ts` are unused, `smoke302.test.ts` is also a strong candidate for deletion.

    *   **`utils/` Directory - `animationTemplates.ts` Findings (2025-06-03):**
        *   `animationTemplates.ts` exports: `AnimationTemplate` (interface), `animationTemplates` (const), `getTemplateByCategory` (function), `getTemplateById` (function), `getAllTemplates` (function), `getTemplateExamplesForPrompt` (function).
        *   `grep_search` for these exports in `page.tsx`, `workspace/` directory, and `src/server/api/routers/generation.ts` yielded **no results**.
        *   This suggests `animationTemplates.ts` is also **likely unused**.

    *   **`utils/` Directory - Conclusion (2025-06-03):**
        *   The primary utility files (`promptInspector.ts`, `getTemplateSnippet.ts`, `animationTemplates.ts`) within `src/app/projects/[id]/generate/utils/` all appear to be **unused** by the active generation UI (`page.tsx`, `workspace/`) or the main generation tRPC router (`src/server/api/routers/generation.ts`).
        *   Consequently, the entire `utils/` directory, including its test files (`promptInspector.spec.ts`, `smoke302.test.ts`, `textRatioTest.ts`, `validateComponent.test.ts`), is a **strong candidate for deletion**.
        *   `promptInspector.spec.ts` tests the unused `promptInspector.ts`.
        *   `smoke302.test.ts` was related to the BAZAAR-302 refactor, which introduced `promptInspector.ts` and `getTemplateSnippet.ts`, both now unused.
        *   `textRatioTest.ts` and `validateComponent.test.ts` are presumed to test utilities within this directory or related to the now-obsolete generation flow features. If the core utils are deleted, these tests lose their relevance in this location.

    *   **`utils/` Directory - Other Test Files:**
        *   `smoke302.test.ts`, `textRatioTest.ts`, `validateComponent.test.ts` will be evaluated based on the status of the primary files/features they test.

### 6. `src/scripts` Directory Analysis (Largely Addressed by User Deletions)

**Update:** The USER is actively deleting files within the `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/scripts` directory. Many of the specific broken shell scripts, missing target files, and orphaned scripts previously detailed in this section are likely now removed. The focus will shift to other areas of the codebase.

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/scripts`
*   **Initial Overview:** This directory is quite large and contains numerous individual script files (`.js`, `.ts`, `.sh`, `.mjs`) and subdirectories (`a2a-test`, `bin`, `commands`, `config`, `debug`, `diagnostics`, `evaluation`, `lib`, `log-agent`, `log-tools`, `migration-tools`, `test`, `test-components`).
    *   It appears to be a central location for utility scripts, one-off migration scripts, debugging tools, evaluation scripts, and potentially older helper scripts.
    *   Notable files include a `README.md`, `package.json`, and `tsconfig.json`, suggesting it might be managed as a distinct scripting environment.
    *   Many script names suggest database operations, component manipulation, testing, and emergency fixes.
*   **Potential Issues:** High likelihood of outdated, redundant, or one-off scripts that are no longer needed.
*   **Plan:**
    1.  Review `README.md` and `package.json` for context.
    2.  Categorize scripts by function.
    3.  Identify scripts related to already deprecated features or completed one-off tasks.
    4.  Check for duplication (e.g., `.js` vs `.ts` versions of similar scripts).

### 7. `src/__mocks__` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/__mocks__`
*   **Analysis (from memory `f915b483-0d33-46be-8b48-49f43057c073`):**
    *   `env.js` identified as a strong candidate for deletion.
*   **Recommendation:** Review `env.js` and confirm deletion if appropriate. Other mocks (`rxjs.ts`, `observable-fns.js`) have been actively worked on and are likely in use.

### 8. `src/queues/` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/queues/`
*   **Contents:** `publish.ts` (scene-publishing queue)
*   **Analysis (from memory `f915b483-0d33-46be-8b48-49f43057c073`):**
    *   `publish.ts` confirmed as unused and a strong candidate for deletion.
*   **Recommendation:** Delete `publish.ts` and potentially the `src/queues` directory if it becomes empty.

### 9. Root `scripts/` Directory (Project Root Level)

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/scripts` (Note: This is different from `src/scripts`)
*   **Analysis (from memory `f915b483-0d33-46be-8b48-49f43057c073`):**
    *   `switch-models.cjs`: Strong candidate for deletion.
    *   `test-data-lifecycle.js`: Strong candidate for deletion.
    *   `stress-test.js`: Strong candidate for deletion.
    *   `run-evals.ts`: To be kept.
*   **Recommendation:** Proceed with deleting the identified scripts.

### 10. `src/hooks/` Directory

*   **Path:** `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/hooks/`
*   **Analysis (from memory `f915b483-0d33-46be-8b48-49f43057c073`):**
    *   `useTimelineDragAndDrop.tsx`: Candidate for deletion.
    *   `useTimelineEventHandlers.tsx`: Candidate for deletion.
    *   `useTimelinePositioning.tsx`: Candidate for deletion.
    *   `useTimelineState.tsx`: Candidate for deletion.
    *   `__tests__/useRemoteComponent.test.tsx`: To be kept along with its corresponding hook (`useRemoteComponent.tsx`).
    *   All other hooks are actively used.
*   **Recommendation:** Investigate and delete the identified unused timeline-related hooks.

### 12. `src/server/services/` Directory Analysis (Files Investigated 2025-06-03)

Investigated a list of service files provided by the user to determine if they are candidates for deletion. The following files were checked for usages across the codebase:

*   `toolExecution.service.ts`
*   `titleGenerator.service.ts`
*   `scenePlanner.service.ts`
*   `sceneAnalyzer.service.ts`
*   `llm.service.ts` (which re-exports `llm/LLMService.ts`)
*   `llm/LLMService.ts`
*   `eventBuffer.service.ts`
*   `conversationalResponse.service.ts`
*   `componentGenerator.service.ts`
*   `codeValidation.service.ts`
*   `chatOrchestration.service.ts`
*   `animationDesigner.service.ts`
*   `componentJob.service.ts`

**Findings:**
*   All of the listed services are actively imported and used by other parts of the application, including API routers (e.g., `chat.ts`, `project.ts`, `generation.ts`), server-side agents (e.g., `scene-planner-agent.ts`), background workers (e.g., `generateComponentCode.ts`), or other services. Many also have dedicated test suites.
*   The `src/server/services/llm/` directory contains `LLMService.ts` and its tests, both of which are necessary.

**Recommendation:** None of these services are candidates for deletion at this time as they are integral to the application's functionality.

### 11. Project Root Directory Analysis (Based on User-Provided Image 2025-06-03)

This section analyzes files directly in the project root directory.

**Likely Keep / Core Configuration:**
*   `instrumentation.ts`: Potentially for monitoring/tracing (e.g., OpenTelemetry). Needs usage verification.
*   `jest.config.cjs`: Main Jest configuration.
*   `next-env.d.ts`: Next.js auto-generated TypeScript definitions.
*   `next.config.js`: Main Next.js configuration.
*   `package-lock.json`, `package.json`: Essential Node.js project files.
*   `postcss.config.cjs` / `postcss.config.mjs`: PostCSS configuration. Investigate if both are needed or if one is primary.
*   `prettier.config.js`: Prettier code formatter configuration.
*   `remotion.config.ts`: Remotion library configuration.
*   `server-log-config.js`: Likely configuration for server-side logging. Verify usage.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `tsconfig.json`: Main TypeScript project configuration.
*   `tsconfig.task-processor.json`: TypeScript configuration, likely for a specific part of the build or a task runner. Verify its corresponding task processor.

**Jest Setup Files (Review for Redundancy):**
*   `jest-special-paths.config.cjs`, `jest-special-paths.config.ts`: Jest path mapping. `.ts` is likely primary if project uses TS for config.
*   `jest.env.setup.js`, `jest.setup.cjs`, `jest.setup.js`, `jest.setup.ts`: Various Jest setup files. Consolidate to the one actively used by `jest.config.cjs` (likely `jest.setup.ts` or `jest.setup.js`) and remove others.

**Scripts (Investigate Purpose & Obsolescence):**
*   `quick-admin-setup.js`: Potentially a one-off setup script. Candidate for deletion if task is complete.
*   `reset-components.sh`: Shell script. Investigate purpose; could be a dev utility or obsolete.
*   `start-database.sh`: Shell script, likely a development utility to start the database. Keep if used.
*   `test-ai-generation.js`, `test-editscene.js`: Test scripts. Consider moving to a dedicated test directory or deleting if obsolete.

**SQL Files (Likely One-Off):**
*   `fix-schema.sql`, `fix-tetris-final.sql`: Database schema modification scripts. Candidates for deletion if they've been applied and are not part of a repeatable migration process.

**Temporary / Backup / Generated Files (Strong Deletion Candidates):**
*   `jest.config.ts.bak`: Backup file.
*   `neon-move.dump`: Database dump file. Likely temporary or for a specific migration.
*   `next.config.js.enhanced`, `next.config.js.new`: Alternative/backup Next.js configs.
*   `scene_planner_logs.json`: Log file. Consider adding to `.gitignore` or deleting.
*   `simple-test.html`: HTML file for simple tests. Delete if not actively used.
*   `test-results` (file/directory): Test output. Add to `.gitignore` or delete.
*   `test-results.html`: HTML test report. Add to `.gitignore` or delete.
*   `tsconfig.task-processor.tsbuildinfo`, `tsconfig.tsbuildinfo`: TypeScript build cache files. Add to `.gitignore`.

**Documentation (Review and Keep if Relevant):**
*   `logging.md`: Documentation related to logging.
*   `PRODUCTION-DEPLOYMENT.md`: Documentation for production deployment.
*   `README.md`: Main project README.
*   `tests.md`: Documentation about testing.

**Unusual Location / Needs Investigation:**
*   `OnceARowScene.tsx`: A React component (`.tsx`) in the root is unusual. Investigate if it's an example, a misplaced file, or truly unused. Candidate for moving or deletion.

## Comprehensive Cleanup Candidates Summary

Based on the detailed analysis above, here is a categorized list of files and folders that are candidates for deletion, retention, or restructuring. This summary aims to consolidate findings for easier review.

**Note on `src/scripts`:** The user is actively cleaning up this directory. The "Files to Delete" section below will summarize the *types* of problematic scripts identified, many of which may have already been addressed by the user.

### 1. Files to Delete

#### a. Most Likely to Delete (High Confidence)
    *   `src/pages/api/debug/test-scene-planner-direct.ts` (and by extension, the `src/pages/api/debug/` and `src/pages/api/` directories if this is the only content)
        *   **Reason:** Unused debug script, not part of tRPC API structure, violates "tRPC Exclusively" rule.
    *   `src/layouts/HeroDefault.tsx` (and by extension, the `src/layouts/` directory if this is the only content)
        *   **Reason:** Not used by App Router layout system.
    *   `src/components/ImageUploadArea.tsx`
        *   **Reason:** No identified usages, primary consumer missing, superseded by new minimal image upload UX.
    *   **From `src/scripts/` (Types of files, likely already handled by user):**
        *   Broken shell scripts (e.g., `run-fix.sh`, `run-component-fix.sh`, `bazaar-tools.sh`, `test/test-component-fix.sh`) due to missing targets or fundamental flaws.
        *   Shell scripts with hardcoded credentials (e.g., `run-component-fix.sh`).
        *   TypeScript/JavaScript files that were targets of broken shell scripts and are confirmed missing (e.g., `fix-components-db.ts`, `diagnostics/direct-component-list.js`).
        *   Helper scripts for `bazaar-tools.sh` that are missing from expected locations (e.g., `component-tools/component-helper.sh`).
        *   Missing sub-command scripts for `npm run analyze` and `npm run fix` (e.g., `analyze-r2.js`, `fix-component-syntax.js`).

#### b. Medium Certainty to Delete
    *   **`src/client/components/test-harness/` directory and its contents**
        *   **Reason:** Appears to be a collection of specialized testing and debugging UI components, likely not part of the production application. Includes `EvaluationDashboard.tsx` which seems superseded by CLI evaluation tools.
    *   **Standalone/Orphaned scripts in `src/scripts/commands/components/analyze/` and `src/scripts/commands/components/fix/`**
        *   **Reason:** Files not loaded by `npm run analyze/fix` entry points. Examples: `analyze-and-fix-components.js`, many files in `fix/` like `fix-build-system.ts`. (User may be addressing these).
    *   **Partially broken shell scripts in `src/scripts/` (if not fixed/actively used):**
        *   E.g., `run-analyze.sh`, `run-component-fixes.sh`. (User may be addressing these).

#### c. Maybe Delete (Require Confirmation)
    *   **One-off database migration scripts (from `src/scripts/` and `src/scripts/commands/db/migrate/`)**
        *   Examples: `add-a2a-columns.js`, `add-adb-recovery-columns.ts` (currently open by user), `20240516-add-component-metadata.js`.
        *   **Reason:** If successfully run on all environments, they might be archivable/removable.
    *   **`src/client/components/a2a/` and `src/client/hooks/a2a/`**
        *   **Reason:** A2A related UI components. If A2A interactions are primarily backend or handled by other UI, these might be for debug/old experiments.
    *   **`src/client/components/custom-component/` (SSE related) and `src/client/hooks/sse/`**
        *   **Reason:** SSE monitoring UI. If this is for debugging and not a user-facing feature, it could be removed.
    *   **Potentially unused helper libraries in `src/scripts/lib/`:**
        *   `components/component-manager.js`, `lib/db-direct.ts`, `lib/db/db-utils.js`.
        *   **Reason:** Need to trace imports to confirm they are not used by any remaining/essential scripts. (User cleanup in `src/scripts` might resolve this).

### 2. Files/Folders to Keep (General Categories)
    *   **Core Application Logic:**
        *   `src/app/` (Next.js App Router: pages, layouts, API handlers like `src/app/api/trpc/[trpc]/route.ts`)
        *   `src/components/` (Reusable UI components used in the main application, excluding those identified for deletion like `ImageUploadArea.tsx`)
        *   `src/lib/` (Core libraries, utilities, services used by the application)
        *   `src/server/` (Backend logic, tRPC routers, database schemas, services)
        *   `src/remotion/` (Core Remotion compositions and components)
        *   `src/config/` (Application configuration files)
        *   `src/hooks/` (Custom React hooks used in the main application)
        *   `src/stores/` (State management stores)
        *   `src/styles/`, `src/index.css` (Global styles)
        *   `src/types/` (TypeScript type definitions)
        *   `src/env.js`, `src/instrumentation.ts`
        *   `package.json`, `next.config.js`, `tsconfig.json` (Root configuration files)
    *   **Active and Maintained Scripts in `src/scripts/` (Post-User Cleanup):**
        *   Entry points defined in `src/scripts/package.json` (`bin/fix-components.js`, `bin/analyze-components.js`, `bin/migrate-db.js`) and their direct, functional dependencies in `lib/` and `commands/`.
        *   Any other scripts the user deems essential after their cleanup (e.g., potentially `src/scripts/commands/components/component-verify/verify-pipeline.ts` if it's an active tool).

### 3. Files/Folders to Move or Restructure
    *   **Diagnostic Tools from `src/scripts/lib/db/`**
        *   Files like `explore-db.js`, `list-projects.js`, `analyze-component.js`, and the `run-analysis.sh` wrapper.
        *   **Current Location:** `src/scripts/lib/db/`
        *   **Suggested New Location:** `src/scripts/db-tools/` (as per their own `README.md`).
        *   **Action:** If these tools are valuable, move them, update `run-analysis.sh` paths, and fix any issues. If not valuable, they become deletion candidates.
    *   **`src/scripts/explore-db.ts`**
        *   **Current Location:** `src/scripts/explore-db.ts` (potentially compiled and run by `src/scripts/run-analyze.sh`).
        *   **Consideration:** If `src/scripts/lib/db/explore-db.js` (or its moved version in `db-tools/`) is the primary version, this `.ts` version might be redundant or could be the source for the `.js` version. Consolidate if possible.

### 4. Folders to Delete

#### a. High Confidence
    *   **`src/pages/api/`**
        *   **Reason:** Contains only the unused `debug/test-scene-planner-direct.ts`. Core API is tRPC in `src/app/api/`.
    *   **`src/layouts/`**
        *   **Reason:** Contains only unused `HeroDefault.tsx`. App Router handles layouts in `src/app/`.
    *   **`src/client/components/test-harness/`**
        *   **Reason:** Debugging/testing UI, not part of production app.

#### b. Medium Confidence / Depends on File Deletion Decisions
    *   **`src/client/` (Entire Directory)**
        *   **Reason:** If `test-harness/`, `a2a/` components, and `custom-component/` (SSE) components are all deemed deletable, this parent directory might become empty or contain only a few scattered files.
    *   **Subdirectories in `src/scripts/` that become empty or only contain broken/orphaned scripts after user cleanup.**
        *   Examples: `component-tools/`, `migration-tools/`, `diagnostics/` (if their helper scripts are missing and no other essential files remain).


## Broad Directory Analysis (User Request)

The user requested a broader look at several directories suspected of containing unused code. Initial findings are below.

### `src/__mocks__/` Directory
*   **Contents:** `env.js` (file), `~` (directory).
    *   `env.js`: Provides mock environment variables. A `grep_search` for its direct import path in `*.test.ts(x)` and `*.spec.ts(x)` files yielded no results. This suggests it might be unused if not picked up by a more generic Jest mock configuration (e.g., for `~/env`).
    *   `~`: Contains `server/lib/openai/client.ts`. This `client.ts` is a Jest mock for an OpenAI API client and does **not** import or use `src/__mocks__/env.js`.
*   **Recommendation (Preliminary):** `env.js` is a strong candidate for deletion, as no direct imports have been found, and the primary mock file in its vicinity (`client.ts`) does not use it. Final check would be for generic Jest configurations that might implicitly load it, but this is less likely.

### `src/hooks/` Directory
*   **Contents & Status:**
    *   `__tests__` (directory):
        *   `useRemoteComponent.test.tsx`: **KEEP.** This file contains tests for `useRemoteComponent.tsx`, which is an actively used hook.
    *   `useDebounce.ts`: **KEEP.** Actively used in `src/app/stock/StockVisualizer.tsx`.
    *   `useImageAnalysis.ts`: **KEEP.** Actively used in `src/app/projects/[id]/edit/panels/ScenePlanningHistoryPanel.tsx`.
    *   `useLocalStorage.ts`: **KEEP.** Actively used in `src/app/projects/[id]/edit/Sidebar.tsx` and `src/app/projects/[id]/edit/panels/CustomComponentsPanel.tsx`.
    *   `useRemoteComponent.tsx`: **KEEP.** Actively used in Remotion components (e.g., `src/remotion/components/CustomScene.tsx`, `src/remotion/components/scenes/CustomScene.tsx`) and has associated tests.
    *   `useTimelineDragAndDrop.tsx`: **CANDIDATE FOR DELETION.** No imports found in the codebase. Appears unused.
    *   `useTimelineEventHandlers.tsx`: **CANDIDATE FOR DELETION.** No imports found in the codebase. Appears unused.
    *   `useTimelinePositioning.tsx`: **CANDIDATE FOR DELETION.** No imports found in the codebase. Appears unused.
    *   `useTimelineState.tsx`: **CANDIDATE FOR DELETION.** No imports found in the codebase. Appears unused.
    *   `useTimelineValidation.ts`: **KEEP.** Functions from this hook (`validateDuration`, `validateStart`, `validateRow`, `validateOverlap`) are actively used in `src/components/client/Timeline/TimelineContext.tsx`.
    *   `useTimelineZoom.tsx`: **KEEP.** Provides zoom functionality used in `src/components/client/Timeline/TimelineGrid.tsx` and `src/components/client/Timeline/Timeline.tsx` (consumed via `TimelineContext`).
    *   `useVideoPlayer.tsx`: **KEEP.** Actively used in `src/components/client/PlayerShell.tsx` to manage Remotion Player state.
    *   `useVoiceToText.ts`: **KEEP.** Actively used in `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`.
*   **Recommendation (Final for `src/hooks/`):** The analysis of `src/hooks/` and `src/hooks/__tests__/` is complete. 
    *   **KEEP:** `useDebounce.ts`, `useImageAnalysis.ts`, `useLocalStorage.ts`, `useRemoteComponent.tsx`, `useTimelineValidation.ts`, `useTimelineZoom.tsx`, `useVideoPlayer.tsx`, `useVoiceToText.ts`, and `__tests__/useRemoteComponent.test.tsx`.
    *   **CANDIDATES FOR DELETION:** `useTimelineDragAndDrop.tsx`, `useTimelineEventHandlers.tsx`, `useTimelinePositioning.tsx`, `useTimelineState.tsx` (as no active imports were found for these four).

### `src/queues/` Directory
*   **Contents:** `publish.ts`.
    *   `publish.ts`: Defines `publishQueue` and exports `addPublishJob`. A review of the current `src/server/api/routers/generation.ts` shows no import or usage of `addPublishJob` or `publishQueue`. The only previous hit was in a stashed (old) version of `generation.ts`.
*   **Recommendation (Confirmed):** `src/queues/publish.ts` and the entire `src/queues/` directory (if `publish.ts` is its only content) are **strong candidates for deletion** as the queue appears unused in the active codebase.
*   **Contents & Analysis:**
    *   `run-evals.ts`: A `commander`-based CLI tool for an "AI Evaluation System." Imports `evaluationRunner` from `../src/lib/evals/runner` and `brainOrchestrator` from `../src/server/services/brain/orchestrator`. Appears to be a developer/testing utility.
    *   `stress-test.js` (1 byte): **CANDIDATE FOR DELETION (Confirmed).**
    *   `switch-models.cjs`: A Node.js CLI script to modify `ACTIVE_MODEL_PACK` in `src/config/models.config.ts`. A developer utility. Project-wide search (excluding `memory-bank` and the `scripts` dir itself) found no invocations or mentions in other scripts or documentation.
    *   `test-data-lifecycle.js`: A Node.js script to test `dataLifecycleService` from `../src/lib/services/dataLifecycle.service.ts`. A test script for a specific service. Project-wide search (excluding `memory-bank` and the `scripts` dir itself) found mentions only in past sprint notes, not in active code or current project documentation.
*   **Recommendation (Final for root `scripts/`):**
    *   **KEEP:** `run-evals.ts` (actively used via npm script `evals`).
    *   **CANDIDATES FOR DELETION:** 
        *   `switch-models.cjs` (highly likely orphaned based on project-wide search).
        *   `test-data-lifecycle.js` (highly likely orphaned based on project-wide search).
        *   `stress-test.js` (already confirmed as 1-byte file, safe to delete).



*   **`src/scripts/README.md` Insights:**
    *   **Purpose:** Contains development and maintenance scripts for the application.
    *   **Structure:** Organizes scripts into `bin/` (entry points), `lib/` (shared utils), `commands/` (individual command implementations, further categorized), `test/`, `debug/`, and `config/`.
    *   **Usage:** Confirms this directory operates as a distinct Node.js environment (`cd src/scripts && npm install`).
    *   **Key Scripts (Examples from README):** `npm run fix`, `npm run analyze`, `npm run migrate`. These are likely important, maintained scripts defined in `package.json`.
    *   **Implication:** The `README` provides a good map. Scripts not fitting this structure or not referenced by `package.json` scripts might be older or less maintained.

*   **`src/scripts/package.json` Insights:**
    *   **Name:** `bazaar-vid-scripts` (confirms it's a sub-project).
    *   **Type:** `module` (ESM).
    *   **Defined `scripts`:**
        *   `fix`: `node bin/fix-components.js`
        *   `analyze`: `node bin/analyze-components.js`
        *   `migrate`: `node bin/migrate-db.js`
        *   `test`: Placeholder, no actual tests defined here.
    *   **Dependencies:** `commander`, `typescript`, `@types/node`, `zod` (typical for CLI tools).
    *   **Key Implication:** Only three core scripts are exposed via `npm run`. All other scripts in the `src/scripts` directory are either helper modules for these three, intended for direct execution (e.g., `node path/to/script.js` or `./script.sh`), or potentially orphaned/deprecated.

*   **Refined Plan for `src/scripts`:**
    1.  **Analyze entry point scripts:** Examine `bin/fix-components.js`, `bin/analyze-components.js`, and `bin/migrate-db.js` to see what other modules they import from within `src/scripts`. This will identify actively used helper scripts in `lib/` and `commands/`.
    2.  **Investigate shell scripts (`.sh`):** Review their purpose and current relevance in workflows.
    3.  **Identify standalone/orphaned scripts:** Scripts not imported by entry points and not essential shell scripts are strong candidates for deprecation.
    4.  **Look for obvious cruft:** Duplicates (JS vs. TS), scripts with indicative names (e.g., "emergency", "old"), or very small/empty files.

*   **`src/scripts/bin` Directory Contents:**
    *   `analyze-components.js` (Entry point for `npm run analyze`)
    *   `fix-components.js` (Entry point for `npm run fix`)
    *   `migrate-db.js` (Entry point for `npm run migrate`)
    *   `migrate-script.js` (Not directly in `package.json` scripts; needs investigation)

*   **Analysis of Entry Points:**
    *   **`bin/analyze-components.js` (for `npm run analyze`):**
        *   Uses `commander` for CLI arguments.
        *   Dynamically loads sub-commands from `src/scripts/commands/components/analyze/`.
        *   Specifically imports:
            *   `analyze-errors.js`
            *   `analyze-syntax.js`
            *   `analyze-r2.js`
        *   **Implication:** These three files in `commands/components/analyze/` are active dependencies.

    *   **`bin/fix-components.js` (for `npm run fix`):**
        *   Uses `commander` for CLI arguments.
        *   Dynamically loads sub-commands from `src/scripts/commands/components/fix/`.
        *   Specifically imports:
            *   `fix-component-syntax.js`
            *   `fix-component-missing-code.js`
            *   `fix-component-stuck.js`
        *   **Implication:** These three files in `commands/components/fix/` are active dependencies.

    *   **`bin/migrate-db.js` (for `npm run migrate`):**
        *   Uses `commander` for CLI arguments.
        *   Dynamically reads all `.js` and `.ts` files from `src/scripts/commands/db/migrate/`.
        *   For each file, it creates a sub-command (e.g., `npm run migrate <migration_filename>`) that executes the `run()` function exported by that migration file.
        *   **Implication:** All `.js` and `.ts` files within `src/scripts/commands/db/migrate/` are considered active and runnable. This directory might contain many historical, run-once migration scripts.

    *   **`bin/migrate-script.js` (Standalone utility):**
        *   This script is not part of the `npm run fix/analyze/migrate` workflows.
        *   It's a developer utility designed to refactor other scripts within `src/scripts` (e.g., move them, convert to ESM, add path comments).
        *   It imports `../lib/logger.js`, indicating `logger.js` is an active helper.
        *   **Recommendation:** Likely fine to keep as a developer tool. Its presence suggests an ongoing or past effort to standardize scripts.

*   **Analysis of `commands` Subdirectories:**

    *   **`src/scripts/commands/components/analyze/`**
        *   **Expected by `bin/analyze-components.js`:** `analyze-errors.js`, `analyze-syntax.js`, `analyze-r2.js`.
        *   **Actual Contents:** `analyze-and-fix-components.js`, `analyze-components.ts`, `analyze-errors.js`, `diagnose-component.ts`.
        *   **Findings:**
            *   `analyze-errors.js`: Directly used.
            *   `analyze-r2.js`: Expected but **MISSING**. The 'r2' command in `npm run analyze r2` is broken.
            *   The `bin` script looks for `analyze-syntax.js` but it's not present. `analyze-components.ts` or `diagnose-component.ts` might be intended replacements, but the `bin` script won't automatically pick up `.ts` files or different names. The 'syntax' command is likely broken or misconfigured.
            *   `analyze-and-fix-components.js`: Not directly loaded by `bin/analyze-components.js`. Candidate for review (standalone or old).

    *   **`src/scripts/commands/components/fix/`**
        *   **Expected by `bin/fix-components.js`:** `fix-component-syntax.js`, `fix-component-missing-code.js`, `fix-component-stuck.js`.
        *   **Actual Contents:** A large number of files (35+).
        *   **Findings:**
            *   `fix-component-missing-code.js`: Directly used.
            *   `fix-component-stuck.js`: Directly used. (A `fix-stuck-component.ts` also exists).
            *   The `bin` script looks for `fix-component-syntax.js` but it's not present. `fix-component-syntax.ts` exists but won't be picked up automatically. The 'syntax' command in `npm run fix syntax` is likely broken or misconfigured.
            *   `fix-component-missing-code.cjs`: Likely an older CommonJS version.
            *   **MAJORITY OF FILES (30+):** Most files in this directory (e.g., `fix-build-system.ts`, `fix-component-by-id.ts`, `fix-component-generation.js`, `fix-tetris-*.js`, `repair-components.js`) are **NOT** dynamically loaded by `npm run fix`. These are strong candidates for review and potential deprecation, being either standalone, helpers for unlisted scripts, or very old.

    *   **`src/scripts/commands/db/migrate/`**
        *   **Expected by `bin/migrate-db.js`:** All `.js` and `.ts` files are made available.
        *   **Actual Contents:** `20240516-add-component-metadata.js`, `add-component-recovery-columns.js`, `migrate-neon.js`.
        *   **Findings:** All listed files are technically active. However, they are strong candidates for being historical, run-once scripts that could potentially be archived or removed after confirming they've been applied everywhere necessary.
            *   `20240516-add-component-metadata.js`: Dated filename implies run-once.
            *   `add-component-recovery-columns.js`: Sounds like a one-time schema change.

*   **`src/scripts/lib` Directory Contents & README Insights:**
    *   `README.md`: Documents core utilities:
        *   **`db/utils.js`**: Provides `getDbClient()`, `getDb()` (Drizzle ORM instance), `query()`, `transaction()`. This is a key active utility.
        *   **`env.js`**: Provides `getEnv()`, `requireEnv()`, `getBoolEnv()`, `getNumberEnv()`. Active utility.
        *   **`logger.js`**: Provides `createLogger()`, default `logger`, `createProgressBar()`. Confirmed active utility.
    *   `components/` (Subdirectory): Not mentioned in `lib/README.md`. Contents need inspection.
    *   `db/` (Subdirectory): Should contain `utils.js` as per README. Other contents need inspection.
    *   `db-direct.ts`: Not mentioned in `lib/README.md`. Might be older, newer, or specialized.
    *   **Next Step:** List contents of `lib/components/` and `lib/db/` subdirectories. Then proceed to investigate shell scripts and other remaining files in `src/scripts`.

    *   **`src/scripts/lib/components/` Contents:**
        *   `component-manager.js`: Single file, not in main `lib/README.md`. Likely a helper for component-related scripts. Usage needs to be traced via imports.

    *   **`src/scripts/lib/db/` Contents & README Insights:**
        *   `README.md` (within `lib/db/`): Describes these files as a suite of **standalone diagnostic tools** for database (Postgres/Neon) and R2 storage analysis, intended for direct `node` execution.
            *   **Path Discrepancy:** README refers to scripts under `src/scripts/db-tools/`, but they are currently in `src/scripts/lib/db/`. This suggests a move or outdated documentation.
            *   **Documented Tools (vs. actual files in `lib/db/`):**
                *   Matches: `explore-db.js`, `list-projects.js`, `get-project-components.js`, `list-all-components.js`, `analyze-component.js`, `analyze-errors.js`, `check-r2-component.js`.
                *   Documented but MISSING from `lib/db/`: `analyze-by-project.js`, `list-r2-objects.js`, `compare-db-r2.js`.
            *   **Output:** Tools often output to an `analysis/` directory.
            *   **Credentials:** README warns of potentially hardcoded credentials.
        *   `utils.js`: Core DB utility (confirmed by main `lib/README.md`).
        *   `db-utils.js`: Not in `lib/db/README.md`'s tool list; likely a helper for these diagnostic scripts or an alternative to `utils.js`.
        *   Other `.js` files listed above (e.g., `analyze-component.js`): Confirmed as standalone diagnostic tools.
        *   `run-analysis.sh` (located in `lib/db/`):
            *   This is a shell script wrapper that provides a CLI for the diagnostic `.js` tools (e.g., `explore-db.js`, `analyze-component.js`).
            *   **Crucially, it expects the Node.js tools to be in `src/scripts/db-tools/`, not `src/scripts/lib/db/`.** This strongly indicates the `.js` files in `lib/db/` (and `run-analysis.sh` itself) are misplaced.
            *   It creates an `analysis/` directory for output.
            *   It does *not* reference the missing scripts (`analyze-by-project.js`, etc.) noted in the `lib/db/README.md`.
        *   **Implications for `lib/db/`:**
            *   The `.js` files (excluding `utils.js` and possibly `db-utils.js`) are standalone diagnostic tools, likely misplaced from a `db-tools` directory.
            *   `run-analysis.sh` is also likely misplaced.
            *   The value of these tools depends on current diagnostic needs.

    *   **Revised Next Steps for `src/scripts` directory:**
        1.  **Search for a `db-tools` directory**: **NOT FOUND** in `src/scripts`.
        2.  **Search for missing documented scripts** (`analyze-by-project.js`, `list-r2-objects.js`, `compare-db-r2.js`): **NOT FOUND** in `src/scripts`.
        3.  **Check for an `analysis/` directory** (project root): **NOT FOUND**.
        *   **Conclusion on `db-tools`:** The `db-tools/` directory, as referenced in `lib/db/README.md` and `lib/db/run-analysis.sh`, does not exist. The diagnostic `.js` scripts and `run-analysis.sh` currently in `src/scripts/lib/db/` are orphaned from their intended structure. The `run-analysis.sh` script would fail if run from its current location due to incorrect paths to its target Node.js scripts. The three missing diagnostic scripts appear to be genuinely gone.

        4.  Categorize and analyze remaining shell scripts in `src/scripts` (root and subdirectories not yet fully covered).
        5.  Review any remaining uncategorized files/directories in `src/scripts`.
        6.  Trace usage of `lib/components/component-manager.js`, `lib/db-direct.ts`, and `lib/db/db-utils.js` to determine if they are actively used.

*   **Shell Script Analysis (`.sh` files in `src/scripts`):**
    *   **`src/scripts/run-analyze.sh`:**
        *   This script compiles two TypeScript files directly using `npx tsc` and then runs the JavaScript output from a `dist` directory:
            *   `src/scripts/explore-db.ts` => `dist/src/scripts/explore-db.js`
            *   `src/scripts/analyze-components.ts` => `dist/src/scripts/analyze-components.js`
        *   **Pathing & Execution Details:**
            *   It attempts to compile `src/scripts/explore-db.ts`. **This file was FOUND** at `src/scripts/explore-db.ts`. This implies a potential duplication or different versioning compared to `src/scripts/lib/db/explore-db.js` (part of the misplaced diagnostic suite).
            *   It attempts to compile `src/scripts/analyze-components.ts`. **This file was NOT FOUND** at `src/scripts/analyze-components.ts`. The script would fail here. (A file `analyze-components.ts` exists in `src/scripts/commands/components/analyze/`).
            *   A `dist/` directory in `src/scripts/` was **NOT FOUND**, as expected if the script hasn't run or is cleaned up.
        *   **Implications & Status:** This script is **partially broken** due to the incorrect path for `analyze-components.ts`. It represents an alternative execution path for analysis, separate from `npm run analyze` (which uses `bin/analyze-components.js`). It highlights a TypeScript compilation step not defined in `src/scripts/package.json`'s npm scripts. The presence of `src/scripts/explore-db.ts` suggests some tools might exist in `.ts` form directly in `src/scripts` for this type of workflow.
        *   A comment about embedded database credentials raises security concerns.

    *   **`src/scripts/run-fix.sh`:**
        *   Similar to `run-analyze.sh`, this script compiles a TypeScript file and runs the output:
            *   `src/scripts/fix-components-db.ts` => `dist/src/scripts/fix-components-db.js`
        *   It mentions a `fixed-components/` directory for output/details.
        *   **Pathing & Execution Details:**
            *   It attempts to compile `src/scripts/fix-components-db.ts`. **This file was NOT FOUND** at `src/scripts/fix-components-db.ts`. The script would fail here.
            *   It mentions a `fixed-components/` directory for output. **This directory WAS FOUND** at the project root (`<project_root>/fixed-components/`).
        *   **Implications & Status:** This script is **currently broken** due to the missing `fix-components-db.ts` file. However, the existence of the `fixed-components/` directory suggests it was functional in the past. It represents a TypeScript-based workflow for fixing components, distinct from `npm run fix`.
        *   **Associated `fixed-components/` directory:**
            *   Located at `<project_root>/fixed-components/`.
            *   Contains one file: `8d478778-d937-4677-af65-f613da8aee6b-fixed.js`.
            *   This indicates a past successful run of a fix process on a component, outputting this file.

    *   **`src/scripts/run-component-fix.sh` (singular fix):**
        *   **Hardcoded Credentials:** This script EXPORTS multiple sensitive environment variables including database URLs and R2 access keys. **Major security concern.**
        *   **Compilation & Execution:**
            *   Attempts to compile `src/scripts/fix-components-db.ts` using `npx tsc -p tsconfig.node.json src/scripts/fix-components-db.ts`.
            *   Then tries to run `node dist/src/scripts/fix-components-db.js`.
        *   **Status:** Also **broken** as `src/scripts/fix-components-db.ts` is missing. Additionally, the specified `tsconfig.node.json` was **NOT FOUND** in `src/scripts/` or project root, which could cause `tsc` to fail or use an unintended configuration.
        *   **Comparison to `run-fix.sh`**: Both target the same missing `.ts` file. This script explicitly sets credentials and attempts to use a specific (missing) `tsconfig.node.json`.

    *   **`src/scripts/run-component-fixes.sh` (plural fixes):**
        *   **Purpose:** Orchestrates two specific component fix scripts.
        *   **Environment Variables:** Attempts to load from `.env.local` (safer).
        *   **Execution:** Uses `npx tsx` to directly run TypeScript files (no separate `tsc` compilation to `dist`):
            *   `src/scripts/fix-missing-outputUrl.ts`
            *   `src/scripts/fix-remotion-component-assignment.ts`
        *   **Implications & Status:** This script represents a more modern and targeted approach to running specific fixes. It is **partially broken** because `src/scripts/fix-missing-outputUrl.ts` was **NOT FOUND**. However, `src/scripts/fix-remotion-component-assignment.ts` **WAS FOUND**, so the second step could potentially run.

    *   **`src/scripts/run-fix-component.sh`:**
        *   **Purpose:** A wrapper to run `src/scripts/fix-component.js` for a specific component ID.
        *   **Argument Handling:** Expects a `<componentId>` as a command-line argument.
        *   **Execution:** Directly runs `node src/scripts/fix-component.js <componentId>` (no TypeScript compilation).
        *   **Output Indication:** Mentions the `fixed-components/` directory.
        *   **Implications & Status:** Provides a direct way to invoke a JavaScript-based fix for a single component. Its functionality depends on `src/scripts/fix-component.js`. However, a search for `fix-component.js` in `src/scripts/` found `force-fix-component.js` instead. This suggests `run-fix-component.sh` might be broken or pointing to a renamed/missing file.

    *   **`src/scripts/run-fix-custom-components.sh`:**
        *   **Purpose:** A wrapper to run `src/scripts/fix-custom-components.ts` with CLI options and proper environment variable loading.
        *   **Arguments & Options:** Supports `[project-id]` and options like `--verbose`, `--check`, `--component=id`.
        *   **Environment Variables:** Robustly loads from `.env.local` or `.env`; checks for `DATABASE_URL`, `R2_PUBLIC_URL`.
        *   **Execution:** Uses `npx tsx src/scripts/fix-custom-components.ts "$@"` to directly run the TypeScript file with all arguments.
        *   **Execution**: Self-executing.
    *   **Status**: Appears to be a one-off schema modification script. Idempotent due to `IF NOT EXISTS`.

*   **`add-a2a-columns.js`**: 
    *   **Purpose**: Adds columns (`a2aId`, `a2aStatus`) to the `bazaar-vid_animation_design_brief` table.
    *   **Technology**: Uses Neon serverless driver directly for raw SQL, loads `.env`.
    *   **Functionality**: Executes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `COMMENT ON COLUMN`.
    *   **Execution**: Self-executing, uses `process.exit()`.
    *   **Status**: One-off schema modification. Idempotent for column creation. Missing `// src/scripts/add-a2a-columns.js` path comment.

*   **`add-adb-recovery-columns.ts`**: 
    *   **Purpose**: Adds recovery columns (`originalTsxCode`, `lastFixAttempt`, `fixIssues`) and comments to the `bazaar-vid_animation_design_brief` table.
    *   **Technology**: Uses Neon serverless driver directly for raw SQL, loads `.env`.
    *   **Functionality**: Executes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `COMMENT ON COLUMN`.
    *   **Execution**: Self-executing, uses `process.exit()`.
    *   **Status**: One-off schema modification. Idempotent for column creation. Missing `// src/scripts/add-adb-recovery-columns.ts` path comment.

    *   **`src/scripts/bazaar-components-helper.sh`:**
        *   **Purpose:** A comprehensive, interactive, menu-driven CLI tool for managing and fixing custom components.
        *   **Features:** Offers options to create test components, fix individual components, fix all components in a project, show component status (with direct DB query via embedded `tsx`), and run all fixes in batch mode (`--all <project_id>`).
        *   **Execution:** Uses `npx tsx` to run various target TypeScript scripts:
            *   `create-test-component.ts`
            *   `fix-component-syntax.ts`
            *   `fix-missing-outputUrl.ts` (previously **NOT FOUND**)
            *   `fix-inconsistent-components.ts`
            *   `fix-remotion-component-assignment.ts` (previously **FOUND**)
        *   **Implications & Status:** This is a major utility script. Its status based on target script availability:
            *   `create-test-component.ts`: **FOUND**. (Option 1 potentially works).
            *   `fix-component-syntax.ts`: **NOT FOUND**. (Option 2 broken).
            *   `fix-missing-outputUrl.ts`: (Previously **NOT FOUND**).
            *   `fix-inconsistent-components.ts`: **NOT FOUND**.
            *   `fix-remotion-component-assignment.ts`: (Previously **FOUND**).
            *   Overall, the script is **significantly impaired** as options 2, 3, and 5 rely on missing `.ts` files.

    *   **`src/scripts/bazaar-tools.sh`:**
        *   **Purpose:** A high-level, menu-driven dispatcher for different tool categories: Component, Database, Migration, Diagnostics.
        *   **Execution:** Delegates to other helper scripts based on menu choice or CLI flags (e.g., `--component`).
            *   Component Tools => `src/scripts/component-tools/component-helper.sh`
            *   Database Tools => `src/scripts/db-tools/run-analysis.sh`
            *   Migration Tools => `src/scripts/migration-tools/migration-helper.sh`
            *   Diagnostics => `src/scripts/diagnostics/diagnostics-helper.sh`
        *   **Implications & Status:** This script acts as a central CLI menu. 
            *   The "Database Tools" option is **broken** because `src/scripts/db-tools/run-analysis.sh` does not exist at this path (the `db-tools` dir is missing, and `run-analysis.sh` is misplaced in `lib/db/` and is itself problematic).
            *   The helper scripts it attempts to call for other categories were **NOT FOUND** at their expected paths:
                *   `src/scripts/component-tools/component-helper.sh` (for Component Tools)
                *   `src/scripts/migration-tools/migration-helper.sh` (for Migration Tools)
                *   `src/scripts/diagnostics/diagnostics-helper.sh` (for Diagnostics)
            *   Therefore, `bazaar-tools.sh` is **almost entirely non-functional**.
            *   A separate check for `src/scripts/commands/components/component-tools/component-helper.sh` (a path from an earlier scan) also yielded no results, confirming no such helper script exists in common locations.

    *   **`src/scripts/test/test-component-fix.sh`:**
        *   **Purpose:** A test script for the component fix tRPC procedures, requiring a `<component_id>`.
        *   **Workflow:**
            1.  Calls `src/scripts/diagnostics/direct-component-list.js` to get component info.
            2.  Uses `curl` to call tRPC endpoint `customComponent.applySyntaxFix`.
            3.  Asks for user confirmation.
            4.  If confirmed, uses `curl` to call tRPC endpoint `customComponent.confirmSyntaxFix`.
            5.  Calls `src/scripts/diagnostics/direct-component-list.js` again for post-fix status.
        *   **Dependencies:** Relies on `src/scripts/diagnostics/direct-component-list.js` and a running application with active tRPC endpoints.
        *   **Implications & Status:** A developer test script, not a general utility. The required `src/scripts/diagnostics/direct-component-list.js` was **NOT FOUND**. Therefore, this test script is **currently broken**.

    *   **Identified Shell Scripts (Full List):**
        1.  `src/scripts/bazaar-components-helper.sh`
        2.  `src/scripts/bazaar-tools.sh`
        3.  `src/scripts/commands/components/component-tools/component-helper.sh`
        4.  `src/scripts/diagnostics/diagnostics-helper.sh`
        5.  `src/scripts/lib/db/run-analysis.sh` (Analyzed - misplaced diagnostic tool runner)
        6.  `src/scripts/migration-tools/migration-helper.sh`
        7.  `src/scripts/run-analyze.sh`
        8.  `src/scripts/run-component-fix.sh`
        12. `src/scripts/run-fix.sh`
        13. `src/scripts/test/test-component-fix.sh`
    *  ### Summary of Shell Script Analysis

Most shell scripts are wrappers for TypeScript or JavaScript files. Many are broken due to missing target scripts or incorrect paths. Some are highly specialized (e.g., test scripts). The `bazaar-tools.sh` script, intended as a central dispatcher, is largely non-functional due to missing helper scripts in expected subdirectories like `component-tools/`, `db-tools/`, `migration-tools/`, and `diagnostics/`.

## Other Files and Directories in `src/scripts`

Beyond the shell scripts, the `src/scripts` directory contains various other files and subdirectories. This section will cover them.

### Standard Configuration/Documentation Files

*   **`README.md`**: Provides information about the scripts directory.
*   **`package.json`**: Potentially for dependencies or scripts specific to this directory.
*   **`tsconfig.json`**: TypeScript configuration for the scripts.

These are standard files and their presence is expected.

### Key Subdirectories (for later detailed review)

*   **`commands/`**: A large directory with many sub-scripts. The checkpoint specifically mentioned reviewing `commands/components/analyze/` and `commands/components/fix/`.
*   **`lib/`**: Contains shared library code. The checkpoint highlighted `lib/components/component-manager.js`, `lib/db-direct.ts`, and `lib/db/db-utils.js` for investigation.

### Other Subdirectories

Based on `ls` output, the following subdirectories also exist. Their names are generally indicative of their purpose. Some, like `diagnostics/` and `migration-tools/`, were expected by `bazaar-tools.sh` to contain helper scripts that were not found.

*   `a2a-test/`
*   `bin/`
*   `config/`
*   `debug/`
*   `diagnostics/`
*   `evaluation/`
*   `log-agent/`
*   `log-tools/`
*   `migration-tools/`
*   `test/` (contains `test-component-fix.sh`, already analyzed)
*   `test-components/`

### Standalone JavaScript and TypeScript Files at `src/scripts` Root

A significant number of `.js`, `.mjs`, and `.ts` files reside directly in `src/scripts`. These will be analyzed individually or in groups based on apparent function. This includes various scripts for database column additions, debugging, diagnostics, migrations, component manipulation, and testing.

### Summary of Shell Script Analysis

Most shell scripts are wrappers for TypeScript or JavaScript files. Many are broken due to missing target scripts or incorrect paths. Some are highly specialized (e.g., test scripts). The `bazaar-tools.sh` script, intended as a central dispatcher, is largely non-functional due to missing helper scripts in expected subdirectories like `component-tools/`, `db-tools/`, `migration-tools/`, and `diagnostics/`.

## Other Files and Directories in `src/scripts`

Beyond the shell scripts, the `src/scripts` directory contains various other files and subdirectories. This section will cover them.

### Standard Configuration/Documentation Files

*   **`README.md`**: Provides information about the scripts directory.
    *   **`src/scripts/README.md` Analysis:**
        *   **Purpose Documented**: States the directory is for development and maintenance scripts.
        *   **Structure Documented**:
            *   `bin/`: Executable entry points.
            *   `lib/`: Shared utilities (`db/`, `components/`, `build/`).
            *   `commands/`: Individual command implementations (e.g., `components/fix/`, `db/migrate/`).
            *   `test/`, `debug/`, `config/`.
        *   **Usage Instructions**:
            *   Mentions `cd src/scripts && npm install`, implying a local `package.json`.
            *   Shows `npm run fix`, `npm run analyze`, `npm run migrate`, indicating these are defined in `src/scripts/package.json`.
        *   **Discrepancies Noted**:
            *   The documented structure (scripts neatly in `commands/` or `bin/`) contrasts with the many standalone `.js`/`.ts` files found at the `src/scripts` root.
            *   Some documented subdirectories (e.g., `lib/build/`, specific `commands/db/` paths) need verification against actual `list_dir` findings as we go deeper.
        *   **Overall**: The `README.md` provides a good intended structure, but the current state of `src/scripts` root suggests divergence or work-in-progress.
*   **`package.json`**: Potentially for dependencies or scripts specific to this directory.
*   **`tsconfig.json`**: TypeScript configuration for the scripts.

These are standard files and their presence is expected.

### Key Subdirectories (for later detailed review)

*   **`commands/`**: A large directory with many sub-scripts. The checkpoint specifically mentioned reviewing `commands/components/analyze/` and `commands/components/fix/`.
*   **`lib/`**: Contains shared library code. The checkpoint highlighted `lib/components/component-manager.js`, `lib/db-direct.ts`, and `lib/db/db-utils.js` for investigation.

### Other Subdirectories

Based on `list_dir` output, the following subdirectories also exist. Their names are generally indicative of their purpose. Some, like `diagnostics/` and `migration-tools/`, were expected by `bazaar-tools.sh` to contain helper scripts that were not found.

*   `a2a-test/`
*   `bin/`
*   `config/`
*   `debug/`
*   `diagnostics/`
*   `evaluation/`
*   `log-agent/`
*   `log-tools/`
*   `migration-tools/`
*   `test/` (contains `test-component-fix.sh`, already analyzed)
*   `test-components/`

### Standalone JavaScript and TypeScript Files at `src/scripts` Root

A significant number of `.js`, `.mjs`, and `.ts` files reside directly in `src/scripts`. These will be analyzed individually or in groups based on apparent function. This includes various scripts for database column additions, debugging, diagnostics, migrations, component manipulation, and testing.
