#!/bin/bash

# Script to help generate TypeScript types from the main app
# This ensures the AppRouter type is available for the admin app

echo "Generating types from main app..."

# Change to main app directory
cd ../../apps/main

# Run TypeScript compiler to generate declaration files
npx tsc --declaration --emitDeclarationOnly --outDir ./dist/types src/server/api/root.ts

echo "Types generated successfully!"