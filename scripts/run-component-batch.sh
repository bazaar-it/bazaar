#!/bin/bash
# This script runs the component batch test using the test-component.ts script

# Set NODE_ENV to development
export NODE_ENV=development

# Ensure the correct directory structure exists
mkdir -p tmp/built-components

# Run the test-component script with ts-node
echo "Running component batch test..."
npx ts-node --esm src/scripts/test-components/test-component.ts json/component-batch-test.json

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Component batch test completed successfully!"
  echo "Built components are available in:"
  ls -la tmp/built-components/
else
  echo "Component batch test failed!"
fi 