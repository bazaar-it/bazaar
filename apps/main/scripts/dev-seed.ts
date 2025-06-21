/**
 * Development Seed Script
 * 
 * Run with: npx tsx src/scripts/dev-seed.ts
 * 
 * Ensures a test user exists and creates a test project with default scenes for development.
 * 
 * This script is idempotent: running it multiple times will not create duplicate users.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("CHECKING ENV VAR:", process.env.DATABASE_URL); // Keep this for checking

import { db } from "@bazaar/database";
// Import BOTH projects and users schemas
import { projects, users } from "@bazaar/database/schema";
import { DEFAULT_PROJECT_PROPS } from "~/lib/types/video/remotion-constants";

// Default test user ID - This ID will be created if it doesn't exist
const TEST_USER_ID = "user_2XQLfuJvWKZKnpOfkW2I5dZxVZYE";
const TEST_USER_EMAIL = "dev@example.com"; // Dummy email for test user

// Create a custom test project based on the default props
const testProject = {
  ...DEFAULT_PROJECT_PROPS,
  meta: {
    ...DEFAULT_PROJECT_PROPS.meta,
    title: "Test Video"
  },
  // Customize any other properties for the test project if needed
};

async function main() {
  console.log("🌱 Seeding development database...");

  try {
    // STEP 1: Ensure the test user exists
    console.log(`Ensuring test user (${TEST_USER_ID}) exists...`);
    await db
      .insert(users)
      .values({
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: "Test User",
        // emailVerified can be omitted if it has a default in schema
      })
      .onConflictDoNothing(); // Prevents error if user already exists

    console.log("Test user check complete.");

    // STEP 2: Create a test project FOR that user
    console.log(`Creating test project for user ${TEST_USER_ID}...`);
    const result = await db
      .insert(projects)
      .values({
        // id: uuid(), // Drizzle handles defaultRandom UUID now
        title: "Test Project",
        userId: TEST_USER_ID,
        props: testProject,
      })
      .returning();

    if (result && result.length > 0) {
      const project = result[0];
      console.log("✅ Created test project:", project?.id);
      console.log(`Dashboard URL: http://localhost:3000/dashboard?id=${project?.id}`);
      console.log(`Editor URL: http://localhost:3000/projects/${project?.id}/edit`);
    } else {
      console.log("⚠️ Project was created but no data was returned (check returning() clause or DB logs)");
    }

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error; // Re-throw after logging
  } finally {
    // It's often better *not* to exit here in scripts using pooled connections
    // The connection might close automatically. If not, add explicit closing if needed.
    // console.log("Closing DB connection (if applicable)...");
    // await client.end(); // If you had access to the raw 'client' from db.ts setup
  }

  console.log("✅ Seeding script finished.");
  // process.exit(0); // Exit here might be okay if needed
}

main().catch((error) => {
  console.error("❌ Unexpected error running main:", error);
  process.exit(1);
});