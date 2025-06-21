#!/bin/bash

# Fix cn imports in UI components
echo "Fixing cn imports in UI components..."

cd "$(dirname "$0")/.."

# Replace all instances of ~/lib/cn with ../cn
find components -name "*.tsx" -type f -exec sed -i '' 's|from "~/lib/cn"|from "../cn"|g' {} \;

echo "cn imports fixed!"