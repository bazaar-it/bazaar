#!/bin/bash
# src/scripts/run-fix.sh

# Create directory for node_modules if it doesn't exist
mkdir -p node_modules

# Compile the component fixing script
echo "Compiling TypeScript..."
npx tsc src/scripts/fix-components-db.ts --outDir dist

echo "Running component fix script..."
node dist/src/scripts/fix-components-db.js

echo "Component fixing complete! Check the fixed-components/ directory for details on changes made." 