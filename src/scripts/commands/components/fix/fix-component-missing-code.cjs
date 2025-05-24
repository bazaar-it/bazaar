// @ts-nocheck
// src/scripts/commands/components/fix/fix-component-missing-code.cjs
const { db } = require('../../dist/server/db');
const { customComponentJobs } = require('../../dist/server/db/schema');
const { eq, and, isNull, or } = require('drizzle-orm');

/**
 * Fix components that are marked as ready/complete but missing the outputUrl or tsxCode
 * which indicates there's a bug in the component generation workflow
 */
async function fixComponentMissingCode() {
  try {
    console.log('Searching for components with issues...');
    
    // Find components with "ready" or "complete" status but missing outputUrl
    const readyWithoutOutput = await db.query.customComponentJobs.findMany({
      where: and(
        or(
          eq(customComponentJobs.status, 'ready'),
          eq(customComponentJobs.status, 'complete')
        ),
        isNull(customComponentJobs.outputUrl)
      )
    });
    
    console.log(`Found ${readyWithoutOutput.length} components with ready/complete status but missing outputUrl`);
    
    // Find components with missing tsxCode (regardless of status)
    const missingCodeComponents = await db.query.customComponentJobs.findMany({
      where: isNull(customComponentJobs.tsxCode)
    });
    
    console.log(`Found ${missingCodeComponents.length} components with missing tsxCode`);
    
    // Fix components with ready/complete status but missing outputUrl
    if (readyWithoutOutput.length > 0) {
      console.log('\nFixing components with ready/complete status but missing outputUrl:');
      
      for (const component of readyWithoutOutput) {
        console.log(`\n- Component: ${component.id} (${component.effect})`);
        console.log(`  Status: ${component.status}`);
        console.log(`  Error message: ${component.errorMessage || 'None'}`);
        
        // Update to error status so it can be rebuilt
        const result = await db.update(customComponentJobs)
          .set({ 
            status: 'error',
            errorMessage: `Component was marked as ${component.status} but had no output URL`,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id))
          .returning();
        
        console.log(`  Updated status to 'error' so it can be rebuilt`);
      }
    }
    
    // Fix components with missing TSX code
    if (missingCodeComponents.length > 0) {
      console.log('\nFixing components with missing tsxCode:');
      
      for (const component of missingCodeComponents) {
        console.log(`\n- Component: ${component.id} (${component.effect})`);
        console.log(`  Status: ${component.status}`);
        
        // Create a fallback component
        const componentName = component.effect || 'FallbackComponent';
        const fallbackCode = `// FALLBACK COMPONENT - Generated after code was missing
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

/**
 * ${componentName} - Fallback version
 * This component was created as a fallback after the original code was missing.
 */
const ${componentName} = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '80%' }}>
        <h1 style={{ color: '#ff4040' }}>Component Code Missing</h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          The code for this component was missing in the database.
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          Component ID: ${component.id}
          Effect Name: ${componentName}
          Status: ${component.status}
        </pre>
        <p style={{ marginTop: '2rem', opacity: 0.7 + (Math.sin(frame / 10) * 0.3) }}>
          Please try regenerating this component.
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Make sure to properly export the component
export default ${componentName};
window.__REMOTION_COMPONENT = ${componentName};
`;

        // Update the component with the fallback code and error status
        await db.update(customComponentJobs)
          .set({ 
            status: 'failed',
            errorMessage: 'TSX code was missing from the database',
            tsxCode: fallbackCode,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id));
        
        console.log(`  Created fallback component and updated status to 'failed'`);
      }
    }
    
    console.log('\nFix completed!');
    console.log('You can now rebuild the components using the Fix button in the UI.');
    
  } catch (error) {
    console.error('Error fixing components:', error);
  }
}

// Run the function
fixComponentMissingCode()
  .catch(console.error)
  .finally(() => {
    console.log('\nScript execution completed.');
    // Allow the DB connection to close naturally
  });
