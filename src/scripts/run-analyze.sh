#!/bin/bash
# src/scripts/run-analyze.sh

# Export environment variables (not needed with our new utility)
# Database credentials are now embedded in the scripts directly

# Create directory for node_modules if it doesn't exist
mkdir -p node_modules

# Compile and run the database explorer
echo "Compiling TypeScript..."
npx tsc src/scripts/explore-db.ts --outDir dist

echo "Running database explorer..."
node dist/src/scripts/explore-db.js

# Compile and run the component analyzer
echo "Compiling component analyzer..."
npx tsc src/scripts/analyze-components.ts --outDir dist

echo "Running component analyzer..."
node dist/src/scripts/analyze-components.js

echo "Analysis complete! Check the analysis/ directory for detailed reports." 