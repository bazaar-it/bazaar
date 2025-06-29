// scripts/check-users.ts
import postgres from 'postgres';

// Simple connection without schema validation
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ No database connection string found');
  console.log('Please set DATABASE_URL or POSTGRES_URL environment variable');
  process.exit(1);
}

async function checkAndUpdateUsers() {
  const client = postgres(connectionString!);
  
  try {
    console.log('🔍 Checking users in database...');
    
    // First, let's see what users exist
    const result = await client`
      SELECT id, email, name, "isAdmin" 
      FROM "bazaar-vid_user" 
      ORDER BY "createdAt" DESC
    `;
    
    console.log(`📋 Found ${result.length} users:`);
    result.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name || 'No name'}) - Admin: ${user.isAdmin}`);
    });
    
    // Update the first user to be admin if none are admin
    const adminUsers = result.filter(user => user.isAdmin);
    
    if (adminUsers.length === 0 && result.length > 0) {
      const firstUser = result[0]!;
      console.log(`\n🔧 Making ${firstUser.email} an admin...`);
      
      await client`
        UPDATE "bazaar-vid_user" 
        SET "isAdmin" = true 
        WHERE email = ${firstUser.email}
      `;
      
      console.log(`✅ Successfully made ${firstUser.email} an admin!`);
    } else if (adminUsers.length > 0) {
      console.log(`\n✅ Admin users already exist: ${adminUsers.map(u => u.email).join(', ')}`);
    } else {
      console.log('\n❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkAndUpdateUsers(); 