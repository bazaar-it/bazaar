// src/scripts/list-projects.js
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function listProjects() {
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to database\n");
    
    // Get all projects
    const result = await client.query(
      'SELECT id, title, "userId", "createdAt" FROM "bazaar-vid_project" ORDER BY "createdAt" DESC LIMIT 10'
    );
    
    if (result.rows.length === 0) {
      console.log("No projects found");
      return;
    }
    
    console.log(`Found ${result.rows.length} projects:`);
    console.log("-".repeat(80));
    
    result.rows.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
      console.log("-".repeat(80));
    });
    
    console.log("\nTo create a test component for a project, run:");
    console.log("node src/scripts/create-and-test-component.js <project_id>");
    console.log("\nCopy one of the project IDs from above.");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

listProjects();
