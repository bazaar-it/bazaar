#!/bin/bash
# Run the fix-component.js script directly

echo "Component Fix Tool"
echo "-----------------"

# Check if component ID was provided
if [ -z "$1" ]; then
  echo "Error: No component ID provided"
  echo "Usage: ./src/scripts/run-fix-component.sh <componentId>"
  exit 1
fi

COMPONENT_ID=$1
echo "Fixing component with ID: $COMPONENT_ID"

# Run the JavaScript version directly (no TypeScript compilation needed)
node src/scripts/fix-component.js $COMPONENT_ID

echo "Fix process complete!"
echo "Check the fixed-components directory for the original and fixed code." 