#!/bin/bash

# Move source code directories
mv src apps/main/
mv public apps/main/
mv scripts apps/main/
mv __mocks__ apps/main/

# Move config files
mv next.config.js apps/main/
mv remotion.config.ts apps/main/
mv tsconfig.json apps/main/
mv tailwind.config.ts apps/main/
mv postcss.config.mjs apps/main/
mv jest.config.mjs apps/main/
mv jest.setup.js apps/main/
mv drizzle.config.ts apps/main/
mv eslint.config.js apps/main/
mv prettier.config.js apps/main/
mv next-env.d.ts apps/main/ 2>/dev/null || true
mv instrumentation.ts apps/main/ 2>/dev/null || true
mv service-hierarchy-analysis.md apps/main/ 2>/dev/null || true

# Move package.json (we'll modify it after)
cp package.json.backup apps/main/package.json

# Move env files
cp .env.example apps/main/
cp .env.local apps/main/ 2>/dev/null || true

# Update root package.json
mv package.json.root package.json

echo "Files moved to apps/main/"