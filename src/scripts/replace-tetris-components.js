// src/scripts/replace-tetris-components.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

// Clean component code for AnimateVariousTetrominoScene without any semicolons after JSX tags
const ANIMATE_TETROMINO_CODE = `// src/remotion/components/scenes/AnimateVariousTetrominoScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const AnimateVariousTetrominoScene = () => {
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
        transform: 'translate(-50%, -50%)'
      }}>
        <h1 style={{
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          TETRIS
        </h1>
        
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
              (row === 8 && col >= 4 && col <= 5) ||
              (row === 9 && col >= 4 && col <= 5) ||
              // L-piece
              (row === 3 && col === 3) ||
              (row === 4 && col === 3) ||
              (row === 5 && col === 3) ||
              (row === 5 && col === 4) ||
              // Z-piece
              (row === 12 && col === 5) ||
              (row === 12 && col === 6) ||
              (row === 13 && col === 4) ||
              (row === 13 && col === 5) ||
              // T-piece
              (row === 10 && col === 2) ||
              (row === 11 && col === 1) ||
              (row === 11 && col === 2) ||
              (row === 11 && col === 3) ||
              // Background filled pieces
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

export default AnimateVariousTetrominoScene;

// Ensure Remotion can find the component
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = AnimateVariousTetrominoScene;
}`;

// Clean component code for OnceARowScene without any semicolons after JSX tags
const ONCE_A_ROW_CODE = `// src/remotion/components/scenes/OnceARowScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const OnceARowScene = () => {
  const frame = useCurrentFrame();
  
  // Create a simple row clear animation
  const opacity = interpolate(
    frame,
    [0, 30, 50, 60],
    [0, 1, 1, 0]
  );
  
  // Calculate the flash effect for row clear
  const flashIntensity = interpolate(
    frame % 30,
    [0, 15, 30],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
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
        transform: 'translate(-50%, -50%)'
      }}>
        <h2 style={{
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          ROW CLEAR!
        </h2>
        
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
            
            // The row that's being cleared
            const isRowBeingCleared = row === 10;
            
            // Set up the blocks
            const isBlock = (
              // Blocks in other rows
              (!isRowBeingCleared && row > 8) ||
              (row === 5 && col >= 2 && col <= 5) ||
              (row === 7 && col >= 1 && col <= 3) ||
              (row === 7 && col >= 6 && col <= 8)
            );
            
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isRowBeingCleared
                  ? 'rgba(255, 255, 255, ' + flashIntensity + ')'
                  : isBlock
                    ? ['#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#f0a000', '#0000f0'][Math.floor(i/5) % 7]
                    : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: isRowBeingCleared 
                  ? '0 0 ' + (10 * flashIntensity) + 'px ' + (5 * flashIntensity) + 'px rgba(255,255,255,' + (flashIntensity * 0.8) + ')'
                  : 'none'
              }} />
            );
          })}
        </div>
        
        <div style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '20px',
          fontSize: flashIntensity > 0.5 ? '24px' : '20px',
          fontWeight: 'bold',
          textShadow: '0 0 ' + (5 * flashIntensity) + 'px rgba(255,255,255,' + flashIntensity + ')'
        }}>
          +100 POINTS
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default OnceARowScene;

// Ensure Remotion can find the component
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = OnceARowScene;
}`;

async function main() {
  try {
    console.log('Replacing Tetris components with clean code (no syntax errors)...');
    
    // Create direct SQL updates with complete component code replacement
    const sql = `
-- Completely replace the component code for both Tetris components
-- Using direct SQL update with clean code that has NO semicolons after JSX tags

-- For AnimateVariousTetrominoScene component (completely replace code)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = $1,
    "status" = 'building',
    "updatedAt" = NOW()
WHERE id = '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3'
RETURNING id, status;

-- For OnceARowScene component (completely replace code)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = $2,
    "status" = 'building',
    "updatedAt" = NOW()
WHERE id = '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a'
RETURNING id, status;
    `;
    
    // Execute SQL with proper parameter binding for large strings
    const dbUrl = process.env.DATABASE_URL;
    
    // Create a command that escapes the code properly for PSQL
    const command = `
    psql "${dbUrl}" <<EOF
\\set animate_code '${ANIMATE_TETROMINO_CODE.replace(/'/g, "''")}'
\\set row_code '${ONCE_A_ROW_CODE.replace(/'/g, "''")}'

UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = :'animate_code',
    "status" = 'building',
    "updatedAt" = NOW()
WHERE id = '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3';

UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = :'row_code',
    "status" = 'building',
    "updatedAt" = NOW()
WHERE id = '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a';

SELECT id, effect AS component_name, status, 
       LENGTH("tsxCode") as code_length,
       substring("tsxCode" from 1 for 50) as code_preview
FROM "bazaar-vid_custom_component_job"
WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a');
EOF
    `;
    
    // Save command to a shell script for debugging
    await fs.writeFile('execute-tetris-fix.sh', command, {mode: 0o755});
    console.log('Created shell script: execute-tetris-fix.sh');
    
    // Execute the shell script
    console.log('Executing SQL to replace component code...');
    const { stdout, stderr } = await execAsync('bash execute-tetris-fix.sh');
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.error(`SQL errors: ${stderr}`);
    }
    
    console.log('Results of component code replacement:');
    console.log(stdout);
    
    console.log('\nComponents are now replaced with clean code:');
    console.log('1. Completely rewrote both component codes');
    console.log('2. Ensured NO semicolons after JSX tags');
    console.log('3. Set components to "building" status');
    console.log('\nMonitor logs to verify successful builds');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

main();
