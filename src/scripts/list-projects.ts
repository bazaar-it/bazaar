/**
 * Lists all available projects in the database
 * 
 * Usage:
 * npx tsx src/scripts/list-projects.ts
 */

import { db } from '~/server/db';
import { projects } from '~/server/db/schema';
import { desc } from 'drizzle-orm';

async function listProjects() {
  try {
    const allProjects = await db.query.projects.findMany({
      orderBy: [desc(projects.createdAt)]
    });
    
    console.log('Available projects:');
    console.log('------------------');
    
    if (allProjects.length === 0) {
      console.log('No projects found in the database.');
      return;
    }
    
    allProjects.forEach(project => {
      console.log(`ID: ${project.id}`);
      console.log(`Title: ${project.title}`);
      console.log('------------------');
    });
  } catch (error) {
    console.error('Error listing projects:', error);
  }
}

listProjects(); 