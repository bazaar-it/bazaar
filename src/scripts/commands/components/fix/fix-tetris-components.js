// src/scripts/fix-tetris-components.js
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const exec = promisify(execCallback);

// Type definitions
/**
 * @typedef {Object} ComponentInfo
 * @property {string} id - The component ID
 * @property {string} name - The component name
 */

// Component IDs from the Tetris project
/** @type {string[]} */
const COMPONENT_IDS = [
  '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', // AnimateVariousTetrominoScene
  '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a'  // OnceARowScene
];

/**
 * Generate fallback code for a Tetris-themed component
 * @param {string} componentName - The name of the component
 * @returns {string} - The generated TSX code
 */
function generateFallbackCode(componentName) {
  return `// src/remotion/components/scenes/${componentName}.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const ${componentName} = () => {
  const frame = useCurrentFrame();
  
  // Create a simple Tetris-themed animation
  const opacity = interpolate(
    frame,
    [0, 30, 210, 240],
    [0, 1, 1, 0]
  );
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      fontFamily: 'monospace',
      opacity
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#fff',
          fontSize: '3rem',
          marginBottom: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '0.2em'
        }}>
          {componentName}
        </h1>
        
        {/* Tetris grid background */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 30px)',
          gridTemplateRows: 'repeat(15, 30px)',
          gap: '2px',
          margin: '0 auto'
        }}>
          {Array(150).fill(0).map((_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const isBlock = (
              // I-piece
              (row === 5 && col >= 2 && col <= 5) ||
              // Square piece
              (row >= 8 && row <= 9 && col >= 2 && col <= 3) ||
              // T piece
              (row === 12 && col >= 6 && col <= 8) ||
              (row === 13 && col === 7)
            );
            
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isBlock ? 
                  ['#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#f0a000', '#0000f0'][Math.floor(i/10) % 7] : 
                  'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }} />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ${componentName};

// Ensure Remotion can find the component
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = ${componentName};
}`;
}

/**
 * Create SQL statements to update the components
 * @param {string} componentId - The ID of the component to update
 * @param {string} componentName - The name of the component
 * @returns {string} - The SQL statement
 */
function createSql(componentId, componentName) {
  const escapedCode = generateFallbackCode(componentName)
    .replace(/'/g, "''") // Escape single quotes for SQL
    .replace(/\\/g, "\\\\"); // Escape backslashes
  
  return `
-- Update component ${componentId} (${componentName})
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = '${escapedCode}',
    "status" = 'building',
    "updatedAt" = NOW()
WHERE "id" = '${componentId}';
`;
}

/**
 * Fetch component names
 * @returns {Promise<Record<string, string>>} - Map of component IDs to names
 */
async function getComponentNames() {
  /** @type {Record<string, string>} */
  const componentNames = {};
  
  for (const id of COMPONENT_IDS) {
    componentNames[id] = id.includes('69ecc') ? 'AnimateVariousTetrominoScene' : 'OnceARowScene';
  }
  
  return componentNames;
}

/**
 * Main function to run the fix
 * @returns {Promise<void>}
 */
async function main() {
  try {
    const componentNames = await getComponentNames();
    
    // Create SQL file
    let sql = '-- Fix stuck Tetris components\n';
    
    for (const id of COMPONENT_IDS) {
      const componentName = componentNames[id] || id.includes('69ecc') ? 'AnimateVariousTetrominoScene' : 'OnceARowScene';
      sql += createSql(id, componentName);
    }
    
    // Write SQL to file
    await fs.writeFile('fix-components.sql', sql);
    console.log('Created SQL file: fix-components.sql');
    
    // Run the SQL using environment variable for database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable not found');
      process.exit(1);
    }
    
    console.log('Executing SQL to fix components...');
    try {
      const { stdout, stderr } = await exec(`psql "${dbUrl}" -f fix-components.sql`);
      
      if (stderr) {
        console.error(`SQL stderr: ${stderr}`);
      }
      
      console.log(`SQL executed successfully: ${stdout || ''}`);
      console.log('Components should now be in "building" status and will be picked up by the build worker.');
    } catch (/** @type {any} */ error) {
      console.error(`Error executing SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (/** @type {any} */ error) {
    console.error('Error fixing components:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
