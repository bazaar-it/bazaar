// src/scripts/find-project.js
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function findProjects() {
  console.log('Finding projects in database...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Query for projects
    const result = await client.query(`
      SELECT id, title, "userId" 
      FROM "bazaar-vid_project" 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);

    console.log('Projects found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\nProject IDs (use one of these for testing):');
      result.rows.forEach(project => {
        console.log(`- ID: ${project.id}, Title: ${project.title}`);
      });
    } else {
      console.log('No projects found in database. You need to create a project first.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

findProjects().catch(console.error);
