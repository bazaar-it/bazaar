// src/scripts/fix-component-urls.js
// Script to fix custom components missing outputUrl values and link them to the current user

const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { customComponentJobs, projects } = require('../server/db/schema');
const { eq, and, or, isNull } = require('drizzle-orm');
require('dotenv').config({ path: '.env.local' });

// Configure database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
  try {
    console.log('🔍 Examining custom component database...');
    
    // 1. Find all complete components missing outputUrl
    const missingUrlComponents = await db
      .select()
      .from(customComponentJobs)
      .where(and(
        eq(customComponentJobs.status, 'complete'),
        or(
          isNull(customComponentJobs.outputUrl),
          eq(customComponentJobs.outputUrl, '')
        )
      ));
    
    console.log(`📊 Found ${missingUrlComponents.length} 'complete' components missing outputUrl`);
    
    if (missingUrlComponents.length > 0) {
      console.log('\n🔧 Fixing missing outputUrl values...');
      
      // 2. Update each component with a constructed API URL
      for (const component of missingUrlComponents) {
        // Create API URL fallback (how the frontend retrieves components)
        const apiUrl = `/api/components/${component.id}`;
        
        console.log(`  • ${component.effect} (${component.id.substring(0, 8)}...): Setting outputUrl to API proxy URL`);
        
        await db
          .update(customComponentJobs)
          .set({ 
            outputUrl: apiUrl,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id));
      }
      
      console.log('\n✅ Successfully updated all missing outputUrl values');
    }
    
    // 3. Print summary of all components by status
    const statusCounts = await db
      .select({
        status: customComponentJobs.status,
        count: db.fn.count()
      })
      .from(customComponentJobs)
      .groupBy(customComponentJobs.status);
    
    console.log('\n📋 Component Status Summary:');
    statusCounts.forEach(({ status, count }) => {
      console.log(`  • ${status}: ${count} components`);
    });
    
    // 4. Find recently created components 
    const recentComponents = await db
      .select({
        id: customComponentJobs.id,
        effect: customComponentJobs.effect,
        status: customComponentJobs.status,
        outputUrl: customComponentJobs.outputUrl,
        createdAt: customComponentJobs.createdAt
      })
      .from(customComponentJobs)
      .orderBy(db.sql`${customComponentJobs.createdAt} DESC`)
      .limit(5);
    
    console.log('\n🆕 5 Most Recent Components:');
    recentComponents.forEach((comp, i) => {
      console.log(`  ${i+1}. ${comp.effect} (${comp.id.substring(0, 8)}...)`);
      console.log(`     Status: ${comp.status}`);
      console.log(`     Has outputUrl: ${!!comp.outputUrl}`);
      console.log(`     Created: ${comp.createdAt}`);
    });
    
    console.log('\n✨ Component fix complete! The components should now appear in the UI and be usable in videos.');
    console.log('🔍 If components still do not appear, check browser console logs for API errors.');
  } catch (error) {
    console.error('❌ Error fixing components:', error);
  }
}

main().catch(console.error);
