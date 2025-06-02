// Emergency database diagnostic script
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkDatabase() {
  console.log('🔍 Emergency Database Diagnostic...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Check user table
    const userCount = await db.execute('SELECT COUNT(*) as count FROM "bazaar-vid_user"');
    console.log(`👤 Users in database: ${userCount.rows[0].count}`);
    
    if (userCount.rows[0].count > 0) {
      const users = await db.execute('SELECT id, email, name FROM "bazaar-vid_user" LIMIT 10');
      console.log('📝 Sample users:', users.rows);
    }
    
    // Check project table
    const projectCount = await db.execute('SELECT COUNT(*) as count FROM "bazaar-vid_project"');
    console.log(`📁 Projects in database: ${projectCount.rows[0].count}`);
    
    if (projectCount.rows[0].count > 0) {
      const projects = await db.execute('SELECT id, name, "userId" FROM "bazaar-vid_project" LIMIT 10');
      console.log('📝 Sample projects:', projects.rows);
    }
    
    // Check for the specific user ID from the error
    const problematicUserId = '92256ac9-495a-4ba2-aecc-fa4ce6756baa';
    const userExists = await db.execute(`SELECT * FROM "bazaar-vid_user" WHERE id = '${problematicUserId}'`);
    console.log(`🔍 User ${problematicUserId} exists:`, userExists.rows.length > 0);
    
    // Check NextAuth sessions/accounts
    const accountCount = await db.execute('SELECT COUNT(*) as count FROM "bazaar-vid_account"');
    console.log(`🔑 Accounts in database: ${accountCount.rows[0].count}`);
    
    const sessionCount = await db.execute('SELECT COUNT(*) as count FROM "bazaar-vid_session"');
    console.log(`🎫 Sessions in database: ${sessionCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase().catch(console.error); 