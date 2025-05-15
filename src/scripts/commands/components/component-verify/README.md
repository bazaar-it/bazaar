# Component Pipeline Verification Tool

This tool verifies the entire Bazaar-Vid custom component pipeline, from creation to rendering in the UI.

## Purpose

The verification tool tests each step of the component pipeline:

1. **Component Generation** - Creates a "canary" test component
2. **Database Storage** - Inserts the component into the database
3. **Compilation & R2 Upload** - Compiles and uploads to R2 storage
4. **API Access** - Tests the API endpoint for component retrieval
5. **UI Rendering** - Validates the component can be properly rendered

The goal is to ensure end-to-end functionality, with the focus on successful rendering in the UI.

## Usage

### Prerequisites

1. Make sure you have the necessary R2 credentials in your environment variables:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_ENDPOINT` (defaults to the Bazaar-Vid endpoint)
   - `R2_BUCKET_NAME` (defaults to 'bazaar-vid-components')
   - `R2_PUBLIC_URL` (defaults to the Bazaar-Vid public URL)

2. Install dependencies:
   ```bash
   cd src/scripts/component-verify
   npm install
   ```

### Running the Verification

```bash
cd src/scripts/component-verify
npm run verify
```

The script will:
1. Generate a canary component
2. Store it in the database
3. Upload it to R2
4. Generate a test HTML file for manual render testing
5. Log detailed results at each step

## Implementation Plan

To fix the component pipeline, the following changes need to be implemented:

### Phase 1: R2 Storage Fixes

1. **Update `buildCustomComponent.ts`**:
   - Add verification of R2 uploads before updating database status
   - Improve error handling to properly catch and log R2 upload failures
   - Fix status logic to consistently use 'complete' for successful builds

2. **Create a Migration Script**:
   - Identify all components with 'success' status that don't exist in R2
   - Re-compile these components and upload them to R2 with proper verification
   - Update database entries with correct 'complete' status and valid outputUrl

### Phase 2: Component Template Fixes

1. **Update `componentTemplate.ts`**:
   - Ensure window.__REMOTION_COMPONENT is always assigned directly in the template
   - Improve error handling for component registration
   - Add debugging information to help diagnose rendering issues

2. **Modify Component Generation**:
   - Update the LLM prompt to align with the new template structure
   - Ensure component structure follows Remotion best practices

### Phase 3: Loading & Rendering Fixes

1. **Improve `useRemoteComponent.tsx`**:
   - Add better error detection for component loading failures
   - Implement retry mechanism for script loading
   - Add detailed logging of component loading process
   - Improve error reporting to the UI

2. **Update `PreviewPanel.tsx`**:
   - Implement selective script cleanup (`cleanupComponentScripts`) for removed components, individual component refreshes, and now also for the main "Refresh Preview" button's `handleRefresh` function.
   - Add option to force refresh specific components (using selective cleanup).
   - Add more visual feedback during component loading (e.g., debug panel with component statuses).

### Phase 4: Verification & Testing

1. **Add UI Verification Component**:
   - Create a debug panel that shows component loading status
   - Add ability to inspect component properties and errors
   - Create visual indicators for component load success/failure

2. **Expand Verification Tests**:
   - Add automated tests for each step of the pipeline
   - Create stress tests with multiple components
   - Add error injection to verify error handling works correctly

## Success Criteria

The verification tool and implementation plan will be considered successful when:

1. All steps of the component pipeline work reliably
2. Components with status "complete" in the database:
   - Exist in R2 storage
   - Can be fetched via the API
   - Successfully render in the UI
3. Errors are properly caught, logged, and displayed to users
4. The pipeline can handle a variety of component types and edge cases

## Implementation Tracking

As fixes are implemented, we will track their status in the verification tool:

- [ ] R2 Storage Verification
- [ ] Database Status Consistency
- [ ] Component Template Updates
- [ ] Script Loading Improvements
- [✅] PreviewPanel Cleanup Fix (Selective cleanup now consistently used for all refresh scenarios, including the main refresh button - see Phase 3)
- [ ] UI Error Reporting
- [ ] Comprehensive Testing 