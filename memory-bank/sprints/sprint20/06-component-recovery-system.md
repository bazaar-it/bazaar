//memory-bank/sprints/sprint20/06-component-recovery-system.md

# Component Recovery System

## Overview

In addition to the TSX pre-processor and prompt enhancements, we've implemented a complete Component Recovery System that addresses the requirement to show failed but fixable components in the UI. This system allows users to view components that failed during generation, attempt to fix them automatically, and add the successful ones to their scenes.

## Key Features

1. **Fixable Component Detection**: 
   - Components that fail with specific fixable errors are automatically marked as "fixable"
   - The system analyzes error messages to determine if our pre-processor can likely fix them

2. **Component Recovery UI**:
   - Failed but fixable components appear in the Custom Components panel
   - Clear status indicators and error messages show why components failed
   - One-click "Try to Fix" button attempts automatic repair

3. **Automatic Fix Application**:
   - TSX pre-processor applies fixes to common syntax issues
   - Components are rebuilt and republished to R2 with the same ID
   - Fix history is tracked and displayed in the UI

4. **Integration with Existing Workflows**:
   - Fixed components appear in the regular component library
   - Complete preservation of component identity (IDs, project association)
   - Transparent recovery process with clear feedback

## Technical Implementation

### 1. Database Schema Updates

We've added new fields to the `custom_component_jobs` table to support component fixing:

```sql
ALTER TABLE "custom_component_jobs"
ADD COLUMN "originalTsxCode" TEXT,      -- Preserves the original code
ADD COLUMN "lastFixAttempt" TIMESTAMP,  -- Tracks when fixes were attempted
ADD COLUMN "fixIssues" TEXT;            -- Records issues that were fixed
```

### 2. New Component Status Types

We've enhanced the component status enum to include two new statuses:

```typescript
export const componentStatusSchema = z.enum([
  'pending',
  'generating',
  'failed', 
  'fixable',  // New status for components that failed but can be fixed
  'fixing',   // New status for when component is being fixed
  'complete'
]);
```

### 3. Error Analysis Function

A special function identifies fixable errors by analyzing error messages:

```typescript
export function isErrorFixableByPreprocessor(error: Error, tsxCode: string): boolean {
  const errorMsg = error.message || '';
  
  // Check for the types of errors our preprocessor can fix
  if (errorMsg.includes('Identifier') && errorMsg.includes('has already been declared')) {
    return true;
  }
  
  if (errorMsg.includes('Unexpected token')) {
    return true;
  }

  // Check for missing exports
  const hasComponentStructure = /(?:function|class|const)\\s+\\w+\\s*(?:=|\\(|\\{)/.test(tsxCode);
  if (errorMsg.includes('export') && hasComponentStructure) {
    return true;
  }
  
  return false;
}
```

### 4. Component Generation Pipeline Integration

The component generation worker now identifies fixable errors:

```typescript
async function handleComponentGenerationError(jobId, error, tsxCode) {
  // Default to failed status
  let status = 'failed';
  
  // If we have code, check if the error is fixable
  if (tsxCode) {
    const isFixable = isErrorFixableByPreprocessor(error, tsxCode);
    if (isFixable) {
      status = 'fixable';
      logger.info(`Error in component ${jobId} is fixable, marking as 'fixable'`);
    }
  }
  
  // Update the job status
  await db.update(customComponentJobs)
    .set({ 
      status,
      errorMessage: error.message,
      originalTsxCode: tsxCode,  // Store original for later fixing
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, jobId));
}
```

### 5. Component Fix API

New API endpoints provide the functionality for component fixing:

1. `getFixableByProjectId` - Gets all fixable components for a project
2. `tryToFix` - Attempts to fix a component using the pre-processor
3. `canBeFixed` - Analyzes if a failed component can be fixed

### 6. User Interface

A new UI component shows fixable components and allows users to attempt fixes:

```tsx
<FixableComponentsPanel projectId={projectId} />
```

This panel displays:
- Component names and error messages
- Fix history from previous attempts
- Button to trigger the fix process
- Real-time status updates

## Component Fix Workflow

1. Component generation fails with a syntax error
2. System identifies the error as fixable and marks the component as "fixable"
3. The component appears in the Custom Components panel with a "Try to Fix" button
4. User clicks the button to attempt fixing
5. The system:
   - Applies the pre-processor to fix syntax issues
   - Rebuilds the component and uploads to R2
   - Updates the database with the fix results
6. If successful, the component is marked "complete" and ready to use
7. If still failing, it remains "fixable" with updated error information

## Performance and Impact

This system dramatically improves the user experience by:

1. **Reducing frustration**: Users can recover from component failures instead of starting over
2. **Increasing success rate**: Components that would normally fail can be salvaged 
3. **Building confidence**: Users see the system actively helping resolve issues
4. **Improving transparency**: Users gain insight into why components fail and how they're fixed

## Integration Guide

To integrate this system with your existing codebase:

1. **Schema Updates**:
   - Run the SQL statements in `customComponentJobs.schema.updates.ts`

2. **Component Generation**:
   - Modify `generateComponentCode.ts` to use `handleComponentGenerationError`

3. **API Router**:
   - Add the fix endpoints to your tRPC router

4. **UI Integration**:
   - Add `<FixableComponentsPanel />` to your Custom Components panel

With these changes, your system will intelligently identify fixable components, allow users to fix them with a single click, and seamlessly integrate the repaired components into the normal workflow.
