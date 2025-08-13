#!/bin/bash

# Fix Drizzle sync issues by pulling current state from database
echo "🔧 Fixing Drizzle sync issues..."

# Pull the current database state instead of pushing changes
echo "📥 Pulling current database schema..."
npx drizzle-kit introspect

echo "✅ Done! Drizzle should now be in sync with your database."
echo "You can now run 'npm run db:generate' without issues."