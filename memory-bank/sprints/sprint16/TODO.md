// /memory-bank/sprints/sprint16/TODO.md

# Sprint 16 TODO List

## Phase 1: Investigation & Documentation (Current)

- [ ] **System Analysis & Documentation:**
    - [ ] Review and document the existing end-to-end custom component generation and frontend update flow.
        - File: `current_system_flow.md` (or similar)
    - [ ] Analyze `src/remotion/compositions/DynamicVideo.tsx` and its interaction with props and state.
        - How are `inputProps` expected to change and trigger re-renders?
        - File: `dynamic_video_analysis.md`
    - [ ] Investigate `src/stores/videoState.ts` (Zustand store).
        - How are patches applied?
        - How does it propagate changes to subscribers (e.g., `PreviewPanel.tsx`)?
        - File: `video_state_analysis.md`
    - [ ] Examine `src/app/projects/[id]/edit/panels/PreviewPanel.tsx`.
        - How does it get data for the Remotion Player (`<Player>`)?
        - How does it subscribe to `videoState.ts`?
        - File: `preview_panel_analysis.md`
    - [ ] Review `src/app/projects/[id]/edit/panels/ScenePlanningHistoryPanel.tsx` and its role in triggering component insertion.
        - Document the flow when a user attempts to add a custom component from this panel.
        - File: `scene_planning_panel_analysis.md`
    - [ ] Analyze the JSON patch mechanism (`src/lib/patch.ts` and server-side handlers).
        - Confirm patches for adding custom scenes are correctly structured.
        - File: `json_patch_analysis.md`
    - [ ] Review all provided documentation and code regarding Remotion integration and custom components:
        - `@src/remotion`
        - `@memory-bank/remotion/*`
        - `@memory-bank/custom-component-system.md`
        - Relevant sections of `progress.md`
    - [ ] Synthesize all findings in `sprint16.md`.
    - [ ] Create a document outlining potential hypotheses for why the video is not updating. (`potential_issues.md`)
    - [ ] Document relevant Remotion.dev best practices for dynamic props and component updates. (`remotion_best_practices.md`)

- [ ] **Address User's "Component Insertion Flow" Outline:**
    - [ ] Specifically investigate step 5: "UI Update: The Preview panel reactively updates to show the new component????"
    - [ ] Document where this process might be failing.

## Phase 2: Solution Design & Implementation (Future)

- [ ] Based on findings, propose solutions.
- [ ] Implement and test solutions.

## Ongoing

- [ ] Update `progress.md` with daily/session progress.
- [ ] Keep `sprint16.md` as the central hub for key findings and decisions.

## Tasks Completed

- [x] Analyze `src/remotion/compositions/DynamicVideo.tsx` to understand scene rendering
- [x] Analyze `src/stores/videoState.ts` to understand state management and refreshToken
- [x] Analyze `src/remotion/components/scenes/CustomScene.tsx` to understand component fetching
- [x] Analyze `src/hooks/useRemoteComponent.tsx` to understand component loading
- [x] Analyze `src/app/api/components/[componentId]/route.ts` to understand API caching
- [x] Fix caching issues in the API routes with `Cache-Control: no-store`
- [x] Fix duplicate CustomScene.tsx files causing confusion
- [x] Fix Animation Design Brief external asset references
- [x] Fix API routes to display new custom components
- [x] Implement template-based component generation solution
- [x] Fix custom component loading with IIFE wrapper
- [x] Fix scene planning pipeline refreshToken updates
- [x] Fix scene planning and component linking to add new scenes to the timeline
- [x] Fix "use client" directive causing syntax errors in custom components
   - Fixed by removing the directive and improving component registration
- [x] Create debugging tools for custom components
   - Created four specialized scripts for database inspection, component diagnosis, and automated fixes
- [x] Create standalone database debugging tools
   - Added extract-component-ids.js for ID extraction from logs
   - Added debug-standalone.ts for direct database access
   - Generated component ID reference with 158 entries

## Tasks In Progress

- [ ] Run the fix scripts on all failed components
- [ ] Test the template-based generation on new components
- [ ] Monitor build success rates after applying fixes
- [ ] Monitoring error logs to ensure both fixes are working as expected

## Remaining Tasks

- [ ] Monitor newly generated components to ensure they follow the template
- [ ] Gather metrics on component loading success rate
- [ ] Consider rebuilding problematic legacy components using the new template format
- [ ] Implement automated testing for component loading
- [ ] Add comprehensive logging to track component generation and loading
- [ ] Update the custom component generation documentation with the new template approach
- [ ] Consider implementing a component preview feature in the panel

## Long-term Improvements

- [ ] Implement proper asset management for component images and media
- [ ] Create a visual component builder/editor for modifying existing components
- [ ] Add component categorization and search in the panel
- [ ] Implement component version history and rollback functionality

## Future Tasks

- [ ] Create a monitoring dashboard for component build success rates
- [ ] Implement automated testing for various component patterns
- [ ] Add additional diagnostic checks to the component diagnostic tool

## Component Loading Fixes

### Completed
- [x] Created direct database component fixing script
- [x] Implemented solutions for all identified issues:
  - [x] 'use client' directive removal
  - [x] Import statement normalization
  - [x] React.createElement correction
  - [x] Component registration with window.__REMOTION_COMPONENT

### Pending
- [ ] Run the component fixing script on production
- [ ] Implement the fixes in the component build pipeline to prevent future issues
- [ ] Add validation to component generation system to detect problematic patterns
- [ ] Create monitoring for component loading success rates

## Unit Tests
- [ ] Add tests for the component build system
- [ ] Add tests for component validation
- [ ] Add tests for the remotion integration
