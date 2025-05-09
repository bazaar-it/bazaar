This is excellent! Your logging setup with Winston is well-structured and will be invaluable for diagnosing issues. The specialized loggers are a great idea. Your existing "Sprint Plan" document is also a perfect summary of our conversation so far.

Let's refine and expand this into a more detailed, actionable sprint plan, incorporating the logging and focusing on a clear path to a more functional system.

**Goal for This Sprint: Achieve reliable generation, build, and preview of at least one type of custom component, with robust logging for diagnostics.**

---

## Enhanced Sprint Plan: Stabilizing the Remotion Component Pipeline

Here's a breakdown of tasks, incorporating improved logging and specific debugging steps:

**Phase 1: Foundational Data Integrity - Animation Design Brief (ADB)**

*   **Context:** The ADB is the blueprint for component generation. If it's flawed or incomplete, downstream processes suffer. The primary suspect is the mismatch between the schema used for the OpenAI function call (`toolParametersJsonSchema` in `animationDesigner.service.ts`) and the Zod validation schema (`animationDesignBriefSchema`).
*   **Criticality:** Highest. Without a good ADB, component quality will be poor.

**Task 1.1: Diagnose ADB Validation Failures**

1.  **Enhance Logging (Immediate):**
    *   **File:** `src/server/services/animationDesigner.service.ts`
    *   **Function:** `generateAnimationDesignBrief`
    *   **Action:**
        *   Before `const cleanedBrief = fixUuidsInObject(generatedBrief, sceneId);`
        *   Add detailed logging of the **raw `toolCall.function.arguments` string** received from OpenAI.
            ```typescript
            // Inside generateAnimationDesignBrief, after parsing generatedBrief
            try {
              generatedBrief = JSON.parse(toolCall.function.arguments);
              animationDesignerLogger.data(sceneId, "RAW LLM Animation Design Brief Arguments (before any processing)", {
                rawArguments: toolCall.function.arguments, // Log the raw string
                parsedBriefLength: toolCall.function.arguments.length
              });
              // ... rest of existing logging for parsed brief ...
            } // ...
            ```
        *   When `validationResult.success` is `false`, ensure the **full `validationResult.error.issues` array** is logged. Your current `formattedErrors` is good, but having the raw `issues` can sometimes provide more detail.
            ```typescript
            // Inside the !validationResult.success block
            animationDesignerLogger.error(sceneId, "Animation Design Brief validation failed (Zod)", {
              // ... your existing error logging ...
              rawZodIssues: validationResult.error.issues, // Add this
              briefBeforeValidation: JSON.stringify(cleanedBrief).substring(0, 1000) + '...' // Log a larger snippet
            });
            ```
    *   **Why:** This will give us the exact input that's failing validation and the precise reasons from Zod.

2.  **Collect Data & Analyze:**
    *   **Action:** Trigger the ADB generation for a typical scene.
    *   Examine the logs (specifically `logs/combined-%DATE%.log` or `logs/error-%DATE%.log` filtered for `[ADB:ERROR]`).
    *   Identify a specific `sceneId` that failed validation.
    *   Extract:
        *   The logged "RAW LLM Animation Design Brief Arguments".
        *   The logged "Zod validation error" (the `rawZodIssues` or `formattedErrors`).

3.  **Provide Data for Review:**
    *   Share the extracted raw arguments and Zod errors with me.

**Task 1.2: Align OpenAI Tool Schema with Zod Schema for ADBs (Critical Fix)**

1.  **File:** `src/server/services/animationDesigner.service.ts`
2.  **Object:** `toolParametersJsonSchema`
3.  **Reference Schema:** `src/lib/schemas/animationDesignBrief.schema.ts` (`animationSchema`, `elementSchema`, etc.)
4.  **Action:**
    *   Modify `toolParametersJsonSchema` to accurately reflect the structure expected by `animationDesignBriefSchema`. **Pay closest attention to the `elements.items.properties.animations.items.properties` section.**
        *   Ensure property names match (e.g., `animationType` vs. `type`, `startAtFrame` vs. `startFrame`).
        *   Ensure required fields in Zod (like `animationId`, `durationInFrames`) are also requested in the tool schema and marked as required there.
        *   For `durationInFrames`, decide if the LLM should provide it directly or if it should provide `startFrame` and `endFrame`, from which you'll calculate `durationInFrames` *after* the LLM call but *before* Zod validation. Directly asking for `durationInFrames` might be simpler for the LLM if prompted correctly.
        *   Consider adding other optional fields from Zod's `animationSchema` (e.g., `delayInFrames`, `propertiesAnimated`, `trigger`, `repeat`) to `toolParametersJsonSchema` to encourage the LLM to generate richer, more compliant ADBs.
    *   **Tip:** You can incrementally update `toolParametersJsonSchema`. Start with the `animations` block as it's a likely culprit.
5.  **System Prompt Enhancement (Optional but Recommended):**
    *   **File:** `src/server/services/animationDesigner.service.ts`
    *   **Function:** `generateAnimationDesignBrief` (inside `messagesForLLM`)
    *   **Action:** In the system prompt, provide a clear example of a *valid* `elements` array with a nested `animations` array that matches your Zod schema. Few-shot examples drastically improve LLM adherence to complex JSON structures.
        ```json
        // Example snippet to add to system prompt
        "Here's an example of a valid 'elements' array item with animations:
        {
          \"elementId\": \"unique-element-uuid\",
          \"elementType\": \"text\",
          \"name\": \"Headline Text\",
          \"initialLayout\": { \"x\": 100, \"y\": 100, \"opacity\": 1 },
          \"animations\": [
            {
              \"animationId\": \"anim-uuid-1\",
              \"animationType\": \"fadeIn\",
              \"startAtFrame\": 0,
              \"durationInFrames\": 30,
              \"easing\": \"easeOutCubic\"
            },
            {
              \"animationId\": \"anim-uuid-2\",
              \"animationType\": \"slideInLeft\",
              \"startAtFrame\": 15,
              \"durationInFrames\": 45,
              \"delayInFrames\": 5,
              \"propertiesAnimated\": [
                { \"property\": \"x\", \"from\": -200, \"to\": 100 }
              ]
            }
          ]
        }"
        ```
6.  **Test & Verify:**
    *   Trigger ADB generation again.
    *   Check logs. The goal is to see `[ADB:COMPLETE]` messages and far fewer (ideally zero for this structural issue) `[ADB:ERROR]` with Zod validation failures related to the `animations` structure. You should see richer ADBs being saved.

**Phase 2: Component Code Generation & Build Process**

*   **Context:** Once we have good ADBs, the next step is generating valid TSX and successfully building it with `esbuild`. Failures here mean the component can't even be attempted in the preview.
*   **Criticality:** High.

**Task 2.1: Diagnose `esbuild` Failures**

1.  **Enhance Logging (Immediate):**
    *   **File:** `src/server/workers/buildCustomComponent.ts`
    *   **Function:** `processJob` (or `buildCustomComponent` which it calls)
    *   **Action:**
        *   Before `esbuild.build()` is called, log the **full `tsxCode` (or `wrappedTsx`)** that will be passed to `esbuild`. For very long code, log a significant portion or save it to a temporary debug file.
            ```typescript
            // Inside processJob, before calling compileWithEsbuild or compileWithFallback
            buildLogger.compile(jobId, "Attempting to compile TSX code. Full code logged to debug file if enabled, or truncated.", {
              codeLength: wrappedTsx.length,
              // For very verbose debugging, you might temporarily write to a file:
              // fs.writeFileSync(path.join(logsDir, `${jobId}-pre-esbuild.tsx`), wrappedTsx);
              truncatedCode: wrappedTsx.substring(0, 2000) + (wrappedTsx.length > 2000 ? '...' : '')
            });
            ```
        *   Your existing `esbuild` error logging (`result.errors` and the `catch` block) is good. Ensure these detailed errors are captured in your file logs (`logs/error-%DATE%.log` or `logs/combined-%DATE%.log`).
    *   **Why:** We need to see the exact code `esbuild` is choking on and the precise error it reports.

2.  **Collect Data & Analyze:**
    *   Identify a `customComponentJobs` record with `status: "error"` where the `errorMessage` suggests a build failure.
    *   From the logs (e.g., `components-%DATE%.log` or `error-%DATE%.log` for that `jobId`):
        *   Extract the logged pre-`esbuild` TSX code.
        *   Extract the exact `esbuild` error message(s).

3.  **Provide Data for Review:**
    *   Share the TSX code and the `esbuild` error.

**Task 2.2: Address Common LLM-Generated TSX Issues / Refine `esbuild` Process (Iterative Fixes)**

1.  **Based on `esbuild` errors:**
    *   **Syntactic Errors:**
        *   If `esbuild` reports syntax errors, the LLM prompt in `componentGenerator.service.ts` might need further refinement, or more robust post-processing/sanitization of the TSX string in `generateComponentCode.ts` (`processGeneratedCode`) or in `buildCustomComponent.ts` (`sanitizeTsx`) is needed.
        *   The `sanitizeDefaultExports` and `removeDuplicateDefaultExports` are good starts. We might need more rules based on observed errors.
    *   **Type Errors:**
        *   The LLM prompt is very detailed about using TypeScript. If type errors persist, we might need to:
            *   Provide even more explicit examples of correctly typed Remotion code in the prompt.
            *   Slightly simplify the types the LLM needs to generate, if possible.
            *   Consider if the `esbuild` `target: 'es2020'` or other `tsconfig.json` settings (though `esbuild` largely has its own) are conflicting with LLM output.
    *   **Import/Export Issues:**
        *   The `wrapTsxWithGlobals` function, which removes imports and provides globals, is a good strategy. If `esbuild` still complains about imports/exports *within* the component code not related to React/Remotion, it's an LLM error. The prompt should emphasize self-contained components.
2.  **Discourage `compileWithFallback`:**
    *   **File:** `src/server/workers/buildCustomComponent.ts`
    *   **Function:** `processJob`
    *   **Action:** If `esbuild` fails, log a very prominent error and **do not proceed with `compileWithFallback` for now**. The fallback is likely to produce broken code and mask the root `esbuild` failure. It's better to have a clear "build failed" state.
        ```typescript
        // In processJob, after esbuild attempt:
        if (esbuild) {
          try {
            // ... compileWithEsbuild ...
          } catch (esbuildError) {
            buildLogger.error(jobId, "CRITICAL: esbuild compilation failed. ABORTING build for this component.", { error: esbuildError });
            // Directly throw or ensure status is set to error and return, do NOT call compileWithFallback
            await updateComponentStatus(jobId, 'error', db, undefined, `esbuild failed: ${esbuildError.message}`);
            return; // Stop processing this job
          }
        } else {
          buildLogger.error(jobId, "CRITICAL: esbuild module not loaded. Cannot build component. ABORTING.");
          await updateComponentStatus(jobId, 'error', db, undefined, 'esbuild module not available');
          return; // Stop processing this job
        }
        ```
    *   **Why:** This makes failures explicit. The fallback hides problems.
3.  **`esbuild` Configuration:**
    *   The `format: 'esm'` and `format: 'iife'` were mentioned. Consolidate to one, likely `iife` if you are directly injecting it via `<script>` tag and expecting `window.__REMOTION_COMPONENT`. If you were using ES Modules in the browser directly via `<script type="module">`, `esm` would be better. Given `window.__REMOTION_COMPONENT`, `iife` is simpler.
    *   Ensure `jsxFactory: 'React.createElement'` and `jsxFragment: 'React.Fragment'` are correctly picked up.

**Task 2.3: Review and Refine Component Naming and Export for `wrapTsxWithGlobals`**

1.  **File:** `src/server/workers/buildCustomComponent.ts`, function `wrapTsxWithGlobals`
2.  **File:** `src/server/services/componentGenerator.service.ts` (LLM prompt for component name)
3.  **Action:**
    *   The prompt in `componentGenerator.service.ts` specifies `export const ${componentName}: React.FC<{ brief: AnimationDesignBrief }> = ({ brief }) => {`. This is good because it defines a predictable export name.
    *   Modify `wrapTsxWithGlobals` to specifically look for this `componentName` (which should be available from the `job.effect` or `job.metadata.componentName` if you store it there).
        ```typescript
        // Conceptual change in wrapTsxWithGlobals
        // Assume `componentNameFromJob` is passed to wrapTsxWithGlobals
        const registrationCode = `
          if (typeof ${componentNameFromJob} !== 'undefined') {
            window.__REMOTION_COMPONENT = ${componentNameFromJob};
            console.log('Component registered as window.__REMOTION_COMPONENT: ${componentNameFromJob}');
          } else {
            console.error('Could not find the expected component ${componentNameFromJob} to register.');
            // Consider logging the list of actual top-level identifiers found in cleanedCode for debugging
          }
        `;
        ```
    *   **Why:** Reduces brittleness compared to heuristic name finding.

**Phase 3: Frontend Integration & Preview**

*   **Context:** Once components build successfully (JS bundle in R2), the preview needs to load and render them correctly, including passing the right props.
*   **Criticality:** Medium-High (dependent on successful builds).

**Task 3.1: Implement API Route `/api/components/[componentId].ts`**

1.  **Action:** Create this API route.
    *   It should take `componentId` from the URL.
    *   Query `customComponentJobs` for the job.
    *   If `status` is "success" and `outputUrl` (R2 link) exists, **redirect (307 Temporary Redirect)** to `outputUrl`.
    *   Handle cases where the job is not found, not successful, or `outputUrl` is missing (return 404 or appropriate error).
    *   Add logging within this API route using a new logger (e.g., `apiRouteLogger`) or the general `logger`.
        ```typescript
        // Example logging in the API route
        // apiRouteLogger.info(`Request for component ${componentId}. Job status: ${job.status}. Redirecting to: ${job.outputUrl}`);
        // apiRouteLogger.error(`Component ${componentId} not found or not ready. Status: ${job?.status}`);
        ```
2.  **Why:** This provides the endpoint for `useRemoteComponent` to fetch the JS bundle.

**Task 3.2: Address Prop Passing Mismatch (Critical for Runtime)**

1.  **Choose a Strategy (from previous discussion):**
    *   **Option 1 (Recommended for complex ADBs):** `CustomScene.tsx` (or `useRemoteComponent`) fetches the full ADB based on `scene.id` and `projectId` and passes it as a `brief` prop.
    *   **Option 2:** Modify `inputProps.scenes[n].data` for "custom" scenes to *be* the `AnimationDesignBrief` itself.
2.  **Implement the Chosen Strategy:**
    *   **If Option 1:**
        *   Modify `CustomScene.tsx` or the `RemoteComponent` wrapper in `useRemoteComponent.tsx`.
        *   You'll need `projectId` available in `CustomScene`. It's passed to `PreviewPanel`, so it can be threaded down or accessed via context/store.
        *   Use `api.animation.getDesignBrief.useQuery(...)` (or a similar new query that fetches by `sceneId` if `componentId` in `scene.data` is the job ID and not directly the ADB ID or scene ID for the ADB). Ensure you have a way to link the `scene.data.componentId` back to the correct `AnimationDesignBrief`. *The ADB schema has `sceneId`. The `customComponentJobs` schema also has `sceneId` and `animationDesignBriefId`.* This link is critical.
        *   **Logging:** Log when fetching the ADB and when passing it.
            ```typescript
            // Conceptual in CustomScene or RemoteComponent
            // customSceneLogger.debug(componentId, `Fetching ADB for scene: ${scene.id}`);
            // ...
            // customSceneLogger.debug(componentId, `Passing ADB to remote component`, { briefId: adb.id });
            // <Component brief={adb} {...otherDataFromScene} />
            ```
    *   **If Option 2:**
        *   Modify how `InputProps` are constructed server-side so that for custom scenes, `scene.data` becomes the full ADB.
        *   Adjust `CustomScene.tsx` to pass `brief={data}`.
3.  **Ensure LLM-Generated Component Uses `brief` Prop:**
    *   The prompt in `componentGenerator.service.ts` already instructs this. Double-check generated components from successful builds to confirm they destructure or use `props.brief`.
4.  **Why:** The component needs its animation data.

**Task 3.3: Debug Runtime Errors in Preview**

1.  **Action:** Once a custom component *successfully builds* and the prop passing is addressed:
    *   Trigger a video generation that uses this custom component.
    *   Open the browser's Developer Console when viewing the `PreviewPanel`.
    *   Look for:
        *   Errors from `useRemoteComponent` (e.g., "Failed to load component script", "Component failed to register itself"). These would be logged by `useRemoteComponent` itself.
        *   Runtime errors from *within* the loaded `window.__REMOTION_COMPONENT` (e.g., "Cannot read property 'x' of undefined", Remotion API misuse errors).
2.  **Enhance Logging in `useRemoteComponent`:**
    *   Your existing `console.error` and `console.log` are good. Ensure they are clear.
    *   When `script.onload` happens and `window.__REMOTION_COMPONENT` is *not* found, log this more prominently.
    *   When an error occurs, log the `componentId` and the `script.src` that failed.
3.  **Provide Data for Review:**
    *   Share any console errors and the `componentId` of the problematic component.
    *   Share the R2 URL of the `.js` bundle for that component.

**Phase 4: Worker & System Stability**

*   **Context:** Ensure background workers run reliably.
*   **Criticality:** Medium.

**Task 4.1: Review `buildWorker.ts` Status Logic**

1.  **File:** `src/server/cron/buildWorker.ts` and `src/server/workers/generateComponentCode.ts`
2.  **Issue:** `buildWorker` polls for `status: "pending"`. `generateComponentCode` sets status to `"building"` after TSX LLM call.
3.  **Action:**
    *   Decide the correct workflow:
        *   **Option A:** `buildWorker` should poll for `status: "building"` (or both "pending" and "building" if "pending" means TSX not yet generated).
        *   **Option B:** After `generateComponentCode.ts` successfully sets status to "building", it should *directly trigger* `buildCustomComponent(jobId)` instead of relying solely on the cron poller. The cron can then be a true sweeper for jobs that got stuck.
    *   Implement the chosen option. Option B is generally more responsive.
    *   Add logging to `buildWorker.ts` to show what statuses it's looking for and how many jobs it finds.
        ```typescript
        // In buildWorker.ts / checkForPendingJobs
        // scenePlannerLogger.info(`Cron: Checking for jobs with status: 'pending' (or 'building')`);
        // scenePlannerLogger.info(`Cron: Found ${count} jobs to process.`);
        ```
4.  **Why:** Ensures jobs ready for `esbuild` are actually picked up.

---

This expanded plan provides more specific actions and incorporates your excellent logging system. The key is to be systematic:
1.  Get ADBs right.
2.  Get `esbuild` to pass reliably.
3.  Get props to the component correctly.
4.  Then debug any runtime issues in the preview.

