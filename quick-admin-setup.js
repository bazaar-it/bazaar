// Quick Admin Setup Script
// Run with: node quick-admin-setup.js

import { neon } from '@neondatabase/serverless';

const ADMIN_EMAILS = [
  "jack@josventures.ie",
  "markushogne@gmail.com"
];

async function setAdminAccess() {
  console.log("🔧 Quick Admin Setup Starting...");
  
  // You need to set your DATABASE_URL here temporarily
  const DATABASE_URL = process.env.DATABASE_URL || 'your-database-url-here';
  
  if (DATABASE_URL === 'your-database-url-here') {
    console.log(`
❌ Database URL not set!

Please run this script with your database URL:
DATABASE_URL="your-neon-database-url" node quick-admin-setup.js

Or edit this file and replace 'your-database-url-here' with your actual Neon database URL.
    `);
    process.exit(1);
  }

  try {
    const sql = neon(DATABASE_URL);

    console.log("✅ Connected to database");

    for (const email of ADMIN_EMAILS) {
      try {
        const result = await sql`
          UPDATE "User" SET "isAdmin" = true 
          WHERE email = ${email} 
          RETURNING id, email, "isAdmin"
        `;

        if (result.length > 0) {
          console.log(`✅ Set admin access for: ${email}`);
        } else {
          console.log(`⚠️  User not found: ${email} (they need to sign up first)`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${email}:`, String(error));
      }
    }

    console.log("✅ Admin setup completed!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Database connection error:", String(error));
    console.log(`
💡 Make sure:
1. Your DATABASE_URL is correct
2. The database is accessible
3. You have the @neondatabase/serverless package installed

Install with: npm install @neondatabase/serverless
    `);
    process.exit(1);
  }
}

setAdminAccess().catch(console.error); 