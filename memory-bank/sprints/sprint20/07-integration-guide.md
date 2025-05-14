//memory-bank/sprints/sprint20/07-integration-guide.md

# Component Recovery System Integration Guide

This guide provides detailed instructions for integrating the Component Recovery System into the existing component generation pipeline, ensuring failed components can be fixed and reused in scenes.

## Overview

The Component Recovery System provides a comprehensive solution to fix common errors in LLM-generated components, including:

- Variable redeclarations
- Unclosed JSX tags 
- Missing export statements
- Unescaped HTML
- Other syntax errors

## Integration Steps

### 1. Database Schema Updates

First, apply the schema updates to add the new columns needed for component recovery:

```bash
# Run the SQL commands from the schema update file
psql YOUR_DB_CONNECTION_STRING -f db/migrations/component-recovery-schema.sql
```

Alternatively, execute these SQL statements directly:

```sql
ALTER TABLE "custom_component_jobs"
ADD COLUMN IF NOT EXISTS "originalTsxCode" TEXT,
ADD COLUMN IF NOT EXISTS "lastFixAttempt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "fixIssues" TEXT;

-- Add index on status for efficient querying
CREATE INDEX IF NOT EXISTS custom_component_jobs_status_idx ON "custom_component_jobs" (status);
```

### 2. Update Component Status Enum

Update the component status schema in `~/lib/schemas/customComponentJobs.schema.ts`:

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

### 3. Integrate TSX Preprocessor

The TSX Preprocessor has already been implemented at `~/server/utils/tsxPreprocessor.ts`. Make sure this file is working correctly by running the included test script:

```bash
cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid
npx tsx src/scripts/component-fix/testRecovery.ts
```

### 4. Enhance Component Generation Error Handling

Modify the component generation worker to identify fixable errors. Open `/src/server/workers/generateComponentCode.ts` and update the error handling section:

```typescript
try {
  // Existing component generation code...
} catch (error) {
  await handleComponentGenerationError(
    jobId, 
    error instanceof Error ? error : new Error(String(error)), 
    tsxCode
  );
  return false;
}
```

Add the `handleComponentGenerationError` function from `generateComponentCode.enhancement.ts`.

### 5. Add Custom Component Fix Router

Register the new custom component fix router in your main tRPC router:

```typescript
// In ~/server/api/root.ts
import { customComponentsFixRouter } from "~/server/api/routers/customComponentsRouter.fix";

export const appRouter = createTRPCRouter({
  // Existing routers...
  customComponent: customComponentRouter,
  // Add the fix router to the customComponent router
});
```

Alternatively, integrate the methods directly into your existing custom components router.

### 6. Update Custom Components Panel

Add the Fixable Components Panel to your Custom Components Panel:

```tsx
// In ~/app/projects/[projectId]/components/CustomComponentsPanel.tsx
import { FixableComponentsPanel } from './FixableComponentsPanel';

// Inside your component render function:
return (
  <>
    <FixableComponentsPanel projectId={projectId} />
    
    {/* Existing panel content */}
  </>
);
```

### 7. Run Tests

Verify your integration with the included test scripts:

```bash
# Run the component fix test
npx tsx src/scripts/component-fix/testRecovery.ts

# Test API integration (create this script if needed)
npx tsx src/scripts/component-fix/testApi.ts
```

## Troubleshooting

### Common Issues

1. **Database Migration Errors**
   - Check if your database user has ALTER TABLE privileges
   - Ensure the custom_component_jobs table exists
   
2. **TSX Preprocessor Not Finding Errors**
   - Check that `isErrorFixableByPreprocessor` has the correct error patterns
   - Add more error recognition patterns if needed
   
3. **Components Not Appearing in UI**
   - Verify the component status is correctly set to 'fixable'
   - Check the tRPC endpoint is correctly returning fixable components

### Logs to Check

Check these logs for potential issues:

```bash
# Check application logs for component fix attempts
grep "fix" logs/combined-*.log

# Check for errors during component fixes
grep "error.*fix" logs/combined-*.log
```

## Verification

After integration, verify the system is working correctly:

1. Create an intentionally broken component:
   - Add a variable redeclaration
   - Leave a JSX tag unclosed
   
2. Observe the component marked as "fixable" in the UI

3. Click "Try to Fix" and confirm:
   - The component status changes to "fixing" then either "complete" or "fixable"
   - The error message updates appropriately
   - If fixed, the component appears in the regular component list

## Future Enhancements

Consider these future improvements:

1. More sophisticated error detection and fixes
2. Batch fixing of multiple components
3. User feedback on fix quality
4. Integration with an LLM to handle more complex fixes

## Support

If you encounter any issues, check the application logs or contact the development team.
