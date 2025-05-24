// @ts-nocheck
// src/scripts/commands/components/fix/fix-stuck-components.js
const { db } = require("../server/db");
const { customComponentJobs } = require("../server/db/schema");
const { eq } = require("drizzle-orm");

// Usage example: node src/scripts/fix-stuck-components.js 69ecccb5-862c-43a7-b5a5-ddd7cf7776f3 46a6e2c8-8e1f-408a-b4a8-a131ec82e48a
// Or run without IDs to fix all "generating_code" components

async function main() {
  const componentIds = process.argv.slice(2);
  
  if (componentIds.length === 0) {
    console.log("No component IDs provided, looking for all stuck components in 'generating_code' status...");
    const stuckComponents = await db
      .select({
        id: customComponentJobs.id,
        effect: customComponentJobs.effect,
        status: customComponentJobs.status,
      })
      .from(customComponentJobs)
      .where(eq(customComponentJobs.status, "generating_code"));
    
    if (stuckComponents.length === 0) {
      console.log("No stuck components found.");
      return;
    }
    
    console.log(`Found ${stuckComponents.length} stuck components: ${stuckComponents.map(c => c.id).join(', ')}`);
    
    for (const component of stuckComponents) {
      await fixComponent(component.id);
    }
  } else {
    // Fix specific components
    for (const id of componentIds) {
      await fixComponent(id);
    }
  }
}

async function fixComponent(componentId) {
  console.log(`Fixing component: ${componentId}`);
  
  // Get component from database
  const component = await db
    .select()
    .from(customComponentJobs)
    .where(eq(customComponentJobs.id, componentId))
    .limit(1);
    
  if (component.length === 0) {
    console.log(`❌ Component with ID ${componentId} not found in database.`);
    return;
  }
  
  const { effect: componentName, metadata, status } = component[0];
  
  console.log(`Component name: ${componentName}`);
  console.log(`Current status: ${status}`);
  
  // Create fallback component code
  const fallbackCode = generateFallbackComponent(componentName, metadata);
  console.log(`Generated fallback code (${fallbackCode.length} bytes)`);
  
  // Update the component in the database
  try {
    await db
      .update(customComponentJobs)
      .set({ 
        tsxCode: fallbackCode, 
        status: "building",
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentId));
      
    console.log(`✅ Successfully updated component ${componentId} to 'building' status with fallback code.`);
  } catch (error) {
    console.error(`❌ Failed to update component ${componentId}:`, error);
  }
}

function generateFallbackComponent(componentName, metadata) {
  // Extract dimensions and duration from metadata if available
  const width = metadata?.width || 1920;
  const height = metadata?.height || 1080;
  const durationInFrames = metadata?.durationInFrames || 300;
  const fps = metadata?.fps || 30;
  
  // Create a generic component that will successfully build
  return `// src/remotion/components/scenes/${componentName}.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const ${componentName} = () => {
  const frame = useCurrentFrame();
  
  // Animation values
  const opacity = interpolate(
    frame,
    [0, 30, ${durationInFrames - 30}, ${durationInFrames}],
    [0, 1, 1, 0]
  );
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'sans-serif',
      opacity
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#fff',
        maxWidth: '80%'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          {componentName}
        </h1>
        <div style={{
          fontSize: '1.5rem',
          marginBottom: '2rem',
          opacity: 0.8
        }}>
          Frame: {frame} / {durationInFrames}
        </div>
        <div style={{
          width: '60%',
          height: '20px',
          backgroundColor: '#333',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: \`\${(frame / durationInFrames) * 100}%\`,
            height: '100%',
            backgroundColor: '#4CAF50',
            transition: 'width 0.1s linear'
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ${componentName};

// Ensure Remotion can find the component when loaded in the browser
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = ${componentName};
}`;
}

main().catch(console.error);
