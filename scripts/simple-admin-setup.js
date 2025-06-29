// Simple admin setup script
// Usage: node scripts/simple-admin-setup.js [DATABASE_URL]

const postgres = require('postgres');

async function setAdminUsers() {
  // Get database URL from command line or environment
  const dbUrl = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!dbUrl) {
    console.error('❌ Please provide DATABASE_URL as argument or environment variable');
    console.log('Usage: node scripts/simple-admin-setup.js "your-database-url"');
    process.exit(1);
  }

  const sql = postgres(dbUrl);
  
  try {
    console.log('🔍 Setting admin privileges...');
    
    // Update admin status for specific emails
    const result = await sql`
      UPDATE "bazaar-vid_user" 
      SET "isAdmin" = true 
      WHERE email IN ('jack@josventures.ie', 'markushogne@gmail.com')
      RETURNING id, email, name, "isAdmin"
    `;
    
    if (result.length > 0) {
      console.log('✅ Successfully updated admin privileges:');
      result.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'}) - Admin: ${user.isAdmin}`);
      });
    } else {
      console.log('⚠️  No users found with the specified emails');
      
      // Show all users for reference
      const allUsers = await sql`
        SELECT id, email, name, "isAdmin" 
        FROM "bazaar-vid_user" 
        ORDER BY "createdAt" DESC
      `;
      
      console.log('\n📋 All users in database:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'}) - Admin: ${user.isAdmin}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await sql.end();
  }
}

setAdminUsers(); 