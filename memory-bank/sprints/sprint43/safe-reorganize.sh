#!/bin/bash

# Sprint 43: Safe Structure Reorganization
# This script carefully reorganizes the structure while maintaining functionality

echo "Sprint 43: Safe Bazaar-Vid Reorganization"
echo "========================================="
echo ""

# Navigate to project root
cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid || exit

echo "Phase 1: Delete Confirmed Orphans & Duplicates"
echo "----------------------------------------------"

# Delete unused shared/modules
rm -rf src/shared/modules
echo "✅ Removed unused shared/modules"

# Delete unused video state experiments
rm -f src/stores/videoState-hybrid.ts
rm -f src/stores/videoState-simple.ts
rm -f src/stores/videoState.normalized.ts
echo "✅ Removed experimental video states"

# Delete templates (confirmed unused)
rm -rf src/templates
echo "✅ Removed unused templates directory"

# Delete old scene services (replaced by tools)
rm -rf src/server/services/scene
echo "✅ Removed old scene services"

# Delete duplicate utils
rm -rf src/utils
echo "✅ Removed src/utils (consolidated to lib/utils)"

echo ""
echo "Phase 2: Consolidate Components"
echo "-------------------------------"

# Move client/components to components/shared
if [ -d "src/client/components" ]; then
    mkdir -p src/components/shared
    mv src/client/components/* src/components/shared/ 2>/dev/null || true
    rmdir src/client/components 2>/dev/null || true
    rmdir src/client 2>/dev/null || true
    echo "✅ Moved client/components to components/shared"
fi

echo ""
echo "Phase 3: Clean Up Server Services"
echo "---------------------------------"

# Remove empty or nearly empty service files
rm -f src/server/services/ai/index.ts
rm -f src/server/services/data/index.ts
rm -f src/server/services/generation/index.ts
echo "✅ Removed empty index files"

# Remove old generation services
rm -f src/server/services/generation/sceneBuilder.service.updated.ts
rm -f src/server/services/generation/sceneAnalyzer.service.ts
rm -rf src/server/services/generation/componentGenerator
echo "✅ Removed old generation services"

# Remove unused services
rm -f src/server/services/data/versionHistory.service.ts
echo "✅ Removed unused version history service"

echo ""
echo "Phase 4: Remove Orphaned Test Files"
echo "-----------------------------------"

# Remove tests for deleted code
find src -name "__tests__" -type d -empty -delete
echo "✅ Removed empty test directories"

echo ""
echo "Phase 5: Clean Configuration"
echo "----------------------------"

# Remove duplicate brain config (keeping main config)
rm -rf src/brain/config
echo "✅ Removed duplicate brain config"

echo ""
echo "Phase 6: Final Cleanup"
echo "---------------------"

# Remove other confirmed orphans
rm -f src/instrumentation.ts
rm -rf src/__mocks__
rm -f src/config/feedbackFeatures.ts
rm -f src/server/constants/chat.ts
rm -f src/server/constants/runtime-dependencies.ts
rm -f src/server/utils/tsxPreprocessor.ts
rm -f src/lib/simpleLogger.ts
rm -f src/lib/metrics.ts
rm -f src/lib/unregister-service-worker.ts
rm -f src/remotion/index.ts
rm -f src/remotion/components/CustomScene.tsx
rm -f src/remotion/compositions/TestCustomScene.tsx
rm -f src/tools/helpers/index.ts

echo "✅ Removed miscellaneous orphaned files"

# Clean empty directories
find src -type d -empty -delete

echo ""
echo "Summary"
echo "-------"
echo "✅ Deleted confirmed orphaned files"
echo "✅ Removed experimental implementations"
echo "✅ Consolidated duplicate directories"
echo "✅ Cleaned empty directories"

# Count files after cleanup
echo ""
echo "File Count After Safe Cleanup:"
echo "-----------------------------"
cd src
find . -type f | wc -l | xargs echo "Total files:"
find . -type d | wc -l | xargs echo "Total directories:"
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l | xargs echo "TypeScript files:"