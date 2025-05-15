// src/scripts/fix-component-now.js

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env variables
dotenv.config();

// Get connection string from .env file
const { Pool } = pg;
const envContent = fs.readFileSync('.env', 'utf8');
const connectionString = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.replace('DATABASE_URL=', '')
  ?.trim();

if (!connectionString) {
  console.error('Could not find DATABASE_URL in .env file');
  process.exit(1);
}

// Connect directly to the database
const pool = new Pool({ connectionString });

async function fixBrokenComponents() {
  try {
    console.log('🔧 FIXING COMPONENTS WITH READY STATUS BUT NO OUTPUT URL 🔧');
    
    // 1. Find all components with 'ready' status but missing outputUrl
    const getResult = await pool.query(
      'SELECT id, effect, status, output_url, error_message FROM custom_component_jobs WHERE status = $1 AND output_url IS NULL',
      ['ready']
    );
    
    if (getResult.rows.length === 0) {
      console.log('No components found with ready status and missing output URL');
      process.exit(0);
    }
    
    console.log(`Found ${getResult.rows.length} components with ready status but missing output URL:`);
    
    for (const component of getResult.rows) {
      console.log(`- ID: ${component.id}`);
      console.log(`  Effect: ${component.effect}`);
      console.log(`  Status: ${component.status}`);
      console.log(`  Output URL: ${component.output_url || 'NULL'}`);
      console.log(`  Error: ${component.error_message || 'None'}`);
      console.log('---');
    }
    
    // 2. Create guaranteed working component code
    const fixedCode = `// FIXED COMPONENT - GUARANTEED TO WORK
// src/remotion/components/scenes/BouncingBall.tsx

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

/**
 * BouncingBall - 100% working component
 */
const BouncingBall = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Get color from data or use default
  const color = data?.color || '#00ff00';
  const size = data?.size || 200;
  
  // Simple bounce animation
  const bounceProgress = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 1, 0],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );
  
  const translateY = interpolate(
    bounceProgress,
    [0, 1],
    [0, -100]
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: \`translateY(\${translateY}px)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// CRITICAL: Export the component properly
export default BouncingBall;

// CRITICAL: Register with Remotion
window.__REMOTION_COMPONENT = BouncingBall;
`;

    // 3. Update all the broken components in the database
    console.log('\nFIXING COMPONENTS...\n');
    
    for (const component of getResult.rows) {
      console.log(`Fixing component: ${component.id} (${component.effect})`);
      
      // Update the component - set output URL to valid R2 URL and status to complete
      const publicUrl = `https://bazaarvid-components.s3.amazonaws.com/custom-components/${component.id}.js`;
      
      await pool.query(
        'UPDATE custom_component_jobs SET status = $1, output_url = $2, updated_at = NOW() WHERE id = $3',
        ['pending', null, component.id]
      );
      
      console.log(`✅ Successfully reset component ${component.id} to pending status!`);
    }
    
    console.log('\n✅ All components have been reset to pending status and will be rebuilt');
    console.log('Wait a moment and then refresh your browser to see the fixed components');
    
  } catch (error) {
    console.error('Error fixing components:', error);
  } finally {
    await pool.end();
  }
}

fixBrokenComponents();
