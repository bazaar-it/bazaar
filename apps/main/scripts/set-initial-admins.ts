// src/scripts/set-initial-admins.ts

import { db } from "@bazaar/database";
import { users } from "@bazaar/database/schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAILS = [
  "jack@josventures.ie",
  "markushogne@gmail.com"
];

async function setInitialAdmins() {
  console.log("Setting initial admin users...");

  try {
    for (const email of ADMIN_EMAILS) {
      const result = await db
        .update(users)
        .set({ isAdmin: true })
        .where(eq(users.email, email))
        .returning({ 
          id: users.id, 
          email: users.email, 
          isAdmin: users.isAdmin 
        });

      if (result.length > 0) {
        console.log(`✅ Set admin access for: ${email}`);
      } else {
        console.log(`⚠️  User not found: ${email} (they need to sign up first)`);
      }
    }

    console.log("✅ Initial admin setup completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting initial admins:", error);
    process.exit(1);
  }
}

// Run the script
setInitialAdmins().catch(console.error);
