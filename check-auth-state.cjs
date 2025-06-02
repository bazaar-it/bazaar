const { neon } = require('@neondatabase/serverless');

async function checkData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }
  
  const sql = neon(connectionString);
  
  console.log('=== CHECKING DATABASE CONNECTION ===');
  console.log('Connection string (truncated):', connectionString.substring(0, 50) + '...');
  
  try {
    console.log('\n=== USER TABLE ===');
    const users = await sql`SELECT id, email, name, "isAdmin", "createdAt" FROM "bazaar-vid_user" LIMIT 10`;
    console.log('Users:', users);
    console.log('User count:', users.length);
    
    console.log('\n=== PROJECT TABLE ===');
    const projects = await sql`SELECT id, "userId", title, "isWelcome", "createdAt" FROM "bazaar-vid_project" LIMIT 10`;
    console.log('Projects:', projects);
    console.log('Project count:', projects.length);
    
    console.log('\n=== ACCOUNT TABLE ===');
    const accounts = await sql`SELECT "userId", provider, "providerAccountId" FROM "bazaar-vid_account" LIMIT 10`;
    console.log('Accounts:', accounts);
    console.log('Account count:', accounts.length);
    
    console.log('\n=== CHECKING FOR SPECIFIC USER ID ===');
    const specificUserId = '92256ac9-495a-4ba2-aecc-fa4ce6756baa';
    const specificUser = await sql`SELECT * FROM "bazaar-vid_user" WHERE id = ${specificUserId}`;
    console.log(`User ${specificUserId}:`, specificUser);
    
    console.log('\n=== TABLE EXISTENCE CHECK ===');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'bazaar-vid_%'
      ORDER BY table_name
    `;
    console.log('Bazaar-vid tables:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('Database error:', error);
  }
  
  process.exit(0);
}

checkData().catch(console.error); 