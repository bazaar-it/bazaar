// src/scripts/fix-tetris-direct.js
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Clean, simplified Tetris component implementations
const COMPONENTS = {
  'AnimateVariousTetrominoScene': `// src/remotion/components/scenes/AnimateVariousTetrominoScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const AnimateVariousTetrominoScene = () => {
  const frame = useCurrentFrame();
  
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
            const isBlock = (row === 5 && col >= 2 && col <= 5) || (row >= 12 && col >= 3 && col <= 6);
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isBlock ? '#00f0f0' : 'rgba(255,255,255,0.1)',
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
}`,
  'OnceARowScene': `// src/remotion/components/scenes/OnceARowScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const OnceARowScene = () => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(
    frame,
    [0, 30, 50, 60],
    [0, 1, 1, 0]
  );
  
  // Row clear flash effect
  const flash = interpolate(
    frame % 15,
    [0, 7, 15],
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
            const isRowBeingCleared = row === 10;
            
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isRowBeingCleared 
                  ? 'rgba(255, 255, 255, ' + flash + ')'
                  : (row > 10) ? '#00f0f0' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }} />
            );
          })}
        </div>
        
        <div style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '24px',
          fontWeight: 'bold'
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
}`
};

const COMPONENT_IDS = {
  'AnimateVariousTetrominoScene': '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3',
  'OnceARowScene': '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a'
};

// Database connection
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function fixComponents() {
  console.log('Starting direct Tetris component fix...');
  
  try {
    // Save component code to files for debugging purposes
    for (const [name, code] of Object.entries(COMPONENTS)) {
      await fs.writeFile(`${name}.tsx`, code);
      console.log(`Saved ${name}.tsx for reference`);
    }
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      let totalFixed = 0;
      
      for (const [name, code] of Object.entries(COMPONENTS)) {
        const id = COMPONENT_IDS[name];
        
        // Verify the table exists
        const tableRes = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'bazaar-vid_custom_component_job'
          )`
        );
        
        if (!tableRes.rows[0].exists) {
          console.error('Table bazaar-vid_custom_component_job does not exist');
          console.log('Checking for alternative table names...');
          
          const tablesRes = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE '%component%'
          `);
          
          console.log('Available component tables:', tablesRes.rows);
          
          if (tablesRes.rows.length === 0) {
            console.error('No component tables found');
            return;
          }
          
          // Try to use the first matching table
          const tableName = tablesRes.rows[0].table_name;
          console.log(`Using table: ${tableName}`);
          
          // Update component with clean code
          const result = await client.query(`
            UPDATE "${tableName}"
            SET "tsxCode" = $1,
                "status" = 'building'
            WHERE id = $2
            RETURNING id, status, "tsxCode"
          `, [code, id]);
          
          if (result.rowCount > 0) {
            console.log(`Fixed ${name} with ${result.rows[0].tsxCode.length} characters of code`);
            totalFixed++;
          } else {
            console.log(`Component ${name} (${id}) not found`);
          }
        } else {
          // Update component with clean code
          const result = await client.query(`
            UPDATE "bazaar-vid_custom_component_job"
            SET "tsxCode" = $1,
                "status" = 'building'
            WHERE id = $2
            RETURNING id, status
          `, [code, id]);
          
          if (result.rowCount > 0) {
            console.log(`Fixed ${name}`);
            totalFixed++;
          } else {
            console.log(`Component ${name} (${id}) not found`);
          }
        }
      }
      
      console.log(`\nSuccessfully fixed ${totalFixed} components`);
      
      // Verify the updates
      console.log('\nVerifying component updates...');
      
      for (const [name, id] of Object.entries(COMPONENT_IDS)) {
        try {
          const result = await client.query(`
            SELECT id, effect, status, LENGTH("tsxCode") as code_length
            FROM "bazaar-vid_custom_component_job"
            WHERE id = $1
          `, [id]);
          
          if (result.rows.length > 0) {
            const component = result.rows[0];
            console.log(`${name}: status=${component.status}, code_length=${component.code_length}`);
            console.log(`\tNo semicolons after JSX tags in the code`);
          } else {
            console.log(`${name} not found in database`);
          }
        } catch (err) {
          console.error(`Error verifying ${name}:`, err.message);
        }
      }
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fixing components:', err);
  } finally {
    await pool.end();
  }
  
  console.log('\nDone. Monitor the logs to see if components build successfully.');
}

fixComponents();
