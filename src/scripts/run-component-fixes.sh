#!/bin/bash
# src/scripts/run-component-fixes.sh
# Runs both component fix scripts to ensure all components are properly working

echo "===== Starting Component Fix Script ====="
echo ""

# Load environment variables
echo "Loading environment variables..."
if [[ -f .env.local ]]; then
  source .env.local
else
  echo "ERROR: .env.local file not found!"
  exit 1
fi

echo ""
echo "Step 1: Fix Missing Output URLs"
echo "=============================="
echo ""
npx tsx src/scripts/fix-missing-outputUrl.ts

echo ""
echo "Step 2: Fix Missing Remotion Component Assignments"
echo "================================================="
echo ""
npx tsx src/scripts/fix-remotion-component-assignment.ts

echo ""
echo "===== Component Fix Script Complete =====" 