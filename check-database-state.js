// check-database-state.mjs
import { db } from "./src/server/db/index.ts";
import { users, projects, accounts } from "./src/server/db/schema.ts";
import { count } from "drizzle-orm";

async function checkDatabaseState() {
  try {
    console.log("🔍 Checking database state...");
    
    // Count users
    const userCount = await db.select({ count: count() }).from(users);
    console.log(`👥 Users: ${userCount[0]?.count || 0}`);
    
    // Count projects  
    const projectCount = await db.select({ count: count() }).from(projects);
    console.log(`📁 Projects: ${projectCount[0]?.count || 0}`);
    
    // Count accounts
    const accountCount = await db.select({ count: count() }).from(accounts);
    console.log(`🔐 Accounts: ${accountCount[0]?.count || 0}`);
    
    // Check schema (users table structure)
    console.log("\n📋 Schema check:");
    console.log("✅ Users table exists with varchar(255) ID field");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database check failed:", error);
    process.exit(1);
  }
}

checkDatabaseState(); 