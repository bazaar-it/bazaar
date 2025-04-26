import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import type { InputProps } from "~/types/input-props";

// Use a fixed placeholder userId for development
// Replace with your own user ID or use this default
const PLACEHOLDER_USER_ID = 'dev-user-id';

// Define placeholder InputProps
const placeholderProps: InputProps = {
  meta: { 
    duration: 90, 
    title: 'Placeholder Video' 
  },
  scenes: []
};

// Insert one project linked to the placeholder user
async function seedDatabase() {
  try {
    const result = await db.insert(projects).values({
      userId: PLACEHOLDER_USER_ID,
      title: 'Untitled project #1',
      props: placeholderProps,
    }).returning();

    console.log('✅ Seeding successful!');
    console.log('Created project:', result[0]);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seeding function
seedDatabase(); 