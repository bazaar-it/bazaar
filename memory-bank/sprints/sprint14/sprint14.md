// /memory-bank/sprints/sprint14/sprint14.md
# Sprint 14: GallerySwipe Ad MVP - End-to-End Pipeline Completion

## Sprint Overview

Sprint 14 focuses on achieving a fully functional end-to-end pipeline for the "GallerySwipe" ad MVP use case. This involves making strategic improvements to testing infrastructure, completing key UI elements, and ensuring the entire pipeline from user prompt to final video works reliably.

A key goal is enabling users to prompt for an ad video like: "Hi, I'm building an app for users to connect their photo library - an Apple app that uses AI to browse through all their images and make it easy for them to delete images to clean up storage. Swipe right to keep, swipe left to delete. Given the amount of right swipes and left swipes, I have an algorithm to know which images to batch delete and which to keep. The app is called 'GallerySwipe', launching tomorrow. Please make a 25-second video I can use as an ad." -. 

## Success Criteria

For the GallerySwipe ad MVP to be considered successful, the system must:

1. **Execute Complete Pipeline:** User provides a prompt → System generates scenes → Each scene gets an ADB → Components are generated → Playable video results
2. **Provide Sufficient UI Control:** Users can regenerate problematic scenes and briefs
3. **Demonstrate Stability:** Implement error handling that prevents catastrophic failures
4. **Deliver Visibility:** Users can see what's happening at each step of the process

## Tickets

### 14.1: Fix Core Testing Infrastructure (First Priority)

**Description:**  
Resolve the Jest/ESM configuration issues that are currently blocking proper testing of the Animation Design Brief system. This is critical for ensuring the reliability of our core animation generation pipeline.

**Tasks:**
- [x] Initial diagnosis of the Jest ESM issues (documented in `/memory-bank/testing/jest_esm_troubleshooting.md`)
- [ ] Fix the path alias issue in `animationDesigner.service.test.ts` with the missing OpenAI client module
- [ ] Update Jest configuration to properly handle ESM dependencies (`zod`, `openai`, etc.)
- [ ] Modify the test scripts in `package.json` to use appropriate Node flags for ESM support
- [ ] Create a comprehensive test helper library for mocking problematic ESM dependencies
- [ ] Document the final testing solution for future reference

**Technical Notes:**
- The current ESM issues stem from Jest's handling of ES module syntax in node_modules, particularly with `zod` and related dependencies
- We may need to use more aggressive mocking strategies to bypass the ESM import issues temporarily
- Consider exploring alternative testing frameworks if Jest ESM issues persist (e.g., Vitest)

**Acceptance Criteria:**
- `npm test` successfully runs Jest tests without ESM-related errors
- `animationDesigner.service.test.ts` passes with proper mocking of dependencies
- Test configuration is documented for future development

---

### 14.2: Complete Animation Design Brief Generation & Testing (High Priority)

**Description:**  
Finalize and rigorously test the Animation Design Brief generation and validation system. This is the critical intermediary layer that translates scene planning into detailed component specifications.

**Tasks:**
- [ ] Create comprehensive test cases for ADB generation covering various scenarios:
  - Standard scene descriptions
  - Edge cases (empty descriptions, very short/long durations)
  - Error cases (invalid parameters, network failures)
- [ ] Ensure proper integration between ADB and component generator
- [ ] Verify database persistence and retrieval of ADBs works correctly
- [ ] Optimize ADB structure for better component generation
- [ ] Add robust error handling and fallback mechanisms

**Technical Notes:**
- Focus on the core `generateAnimationDesignBrief` function in `animationDesigner.service.ts`
- Pay special attention to validating the ADB structure against the schema
- Ensure consistency in ADB format to avoid downstream component generation issues

**Acceptance Criteria:**
- All test cases for ADB generation pass
- Error handling correctly manages failed ADB generation attempts
- Component generator successfully uses ADB data to create better components

---

### 14.3: Implement Scene Planning Panel UI for ADBs (Medium-High Priority)

**Description:**  
Complete the UI modifications to `ScenePlanningHistoryPanel.tsx` to show Animation Design Briefs and provide controls for generating/regenerating them. This gives crucial visibility to the entire generation pipeline.

**Tasks:**
- [ ] Update `ScenePlanningHistoryPanel.tsx` to add collapsible sections for ADBs
- [ ] Display animation design briefs associated with each scene
- [ ] Show brief status (pending/complete/error) with appropriate visual indicators
- [ ] Add "Generate Animation Brief" button for scenes without briefs
- [ ] Add "Regenerate Animation Brief" button for scenes with existing briefs
- [ ] Implement JSON formatting for better readability of brief content
- [ ] Add polling for real-time status updates

**Technical Notes:**
- Reference the detailed requirements in `13.3.md`
- Integrate with the Animation Router API endpoints (`listDesignBriefs`, `generateDesignBrief`, etc.)
- Ensure consistent styling with the rest of the application
- Focus on the core functionality first, with enhanced UI improvements as stretch goals

**Acceptance Criteria:**
- ADBs are displayed in the Scene Planning Panel
- Users can generate and regenerate briefs directly from the panel
- Brief status is clearly visible and updates in real-time
- Brief content is displayed in a readable format

---

### 14.4: Implement Scene Regeneration & Duration Feedback (Medium Priority)

**Description:**  
Complete key UI enhancements from Sprint 9 that are essential for managing the video creation process. These features are critical for when the initial scene planning or component generation doesn't meet expectations.

**Tasks:**
- [ ] Implement scene regeneration button in the timeline UI
- [ ] Add visual feedback for actual vs. planned component duration
- [ ] Implement visual progress indicators in the timeline for scene generation
- [ ] Ensure repositioning of subsequent scenes works correctly when durations change
- [ ] Add keyboard shortcuts for common regeneration actions

**Technical Notes:**
- Reference the "Medium Priority" items in the Sprint 9 `TODO.md`
- These UI elements should integrate with the existing `videoState` store and patch system
- Ensure the UI clearly indicates when actual durations differ from planned durations
- The scene regeneration should preserve other scenes and only replace the targeted scene

**Acceptance Criteria:**
- Scene regeneration button is present and functional
- Timeline shows visual indicators for duration discrepancies
- Progress indicators show generation status clearly
- Scene repositioning works correctly when durations change

---

### 14.5: Create End-to-End Testing Plan (Medium Priority)

**Description:**  
Develop and execute a comprehensive testing plan for the entire video generation pipeline, from user prompt through to final video. This ensures all components work together correctly.

**Tasks:**
- [ ] Document the complete pipeline flow with all integration points
- [ ] Create test scenarios covering the full GallerySwipe ad use case
- [ ] Test various prompt types and complexities
- [ ] Verify scene planning creates appropriate scene sequences
- [ ] Validate ADB generation produces useful briefs for all scene types
- [ ] Check component generation creates functional components from briefs
- [ ] Test error handling at each pipeline stage
- [ ] Document results in `memory-bank/testing/manual_testing_results.md`

**Technical Notes:**
- Focus on integration points between services
- Pay special attention to error propagation through the pipeline
- Test both happy path and error scenarios
- Include timing verification for scene durations

**Acceptance Criteria:**
- Complete documentation of test scenarios and results
- Successful end-to-end generation from prompt to video
- All error handling mechanisms function as expected
- Timing and duration handling works correctly

---

### 14.6: Enhance Error Handling & Resilience (Lower Priority)

**Description:**  
Improve the system's ability to recover from failures at various stages of the pipeline. This ensures the application remains functional even when individual components encounter problems.

**Tasks:**
- [ ] Enhance error recovery for failed ADB generation
- [ ] Implement graceful fallbacks for component generation issues
- [ ] Add better user feedback for process status throughout the pipeline
- [ ] Implement retry mechanisms where appropriate
- [ ] Add detailed error logging for debugging

**Technical Notes:**
- Focus on creating a "degraded but functional" experience rather than complete failure
- Consider implementing progressive enhancement where possible
- Ensure errors are meaningful and actionable for users
- Log detailed technical information for developers

**Acceptance Criteria:**
- System gracefully handles failures at any pipeline stage
- Users receive clear feedback when errors occur
- Recovery mechanisms successfully mitigate common failure scenarios
- Detailed logs are available for debugging

## Prioritization and Dependencies

1. **14.1 (Testing Infrastructure)** - This is the foundation needed for verifying all other work; however, we can proceed with implementation while resolving test issues.
2. **14.2 (ADB Generation)** - The Animation Design Brief system is a critical internal component that affects downstream component quality.
3. **14.3 (ADB UI)** - This provides essential visibility into the ADB generation process.
4. **14.4 (Scene Regeneration)** - These UI elements give users control to fix problematic scenes.
5. **14.5 (End-to-End Testing)** - This validates the entire pipeline works together.
6. **14.6 (Error Handling)** - Enhanced resilience improves the overall user experience.

## Timeframe
This sprint targets completion in two weeks, with a focus on achieving a functional MVP that demonstrates the complete pipeline from user prompt to final video.
