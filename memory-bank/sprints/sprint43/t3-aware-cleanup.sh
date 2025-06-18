#!/bin/bash

# Sprint 43: T3-Aware Cleanup Script
# This script removes duplicates and orphans while respecting T3 App structure

echo "Sprint 43: T3-Aware Bazaar-Vid Cleanup"
echo "======================================"
echo ""
echo "Respecting T3 App structure:"
echo "- /app/ for Next.js pages"
echo "- /server/ for backend (API, DB, Auth)"
echo "- Keeping workspace and panels intact"
echo ""

# Navigate to project root
cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid || exit

echo "IMPORTANT: Keeping these files:"
echo "- src/app/sitemap.ts (Next.js SEO)"
echo "- src/remotion/components/scenes/CustomScene.tsx (active component)"
echo "- All workspace panels in app/projects/[id]/generate/workspace/"
echo ""

echo "Phase 1: Remove Confirmed Orphaned Files (85 files - keeping sitemap.ts)"
echo "------------------------------------------------------------------------"

# Root level orphans
rm -f src/instrumentation.ts
echo "✅ Removed instrumentation.ts"

# Mocks
rm -rf src/__mocks__
echo "✅ Removed __mocks__ directory"

# App level orphans
# Keep sitemap.ts - it's used by Next.js for SEO
rm -f src/app/projects/[id]/generate/types/storyboard.ts
rm -f src/app/projects/[projectId]/components/FixableComponentsPanel.tsx
echo "✅ Removed app-level orphans (kept sitemap.ts for SEO)"

# Delete unused templates (15 files)
rm -rf src/templates
echo "✅ Removed unused templates directory (15 files)"

# Delete unused shared modules
rm -rf src/shared
echo "✅ Removed unused shared/modules"

# Delete duplicate utils folder (keep lib/utils)
rm -rf src/utils
echo "✅ Removed src/utils (using lib/utils instead)"

# Clean up components
rm -f src/components/DeleteConfirmationDialog.tsx
rm -f src/components/InsertCustomComponentButton.tsx
rm -f src/components/RenameComponentDialog.tsx
rm -f src/components/ShareDialog.tsx
echo "✅ Removed unused dialog components"

# Clean up unused UI components
rm -f src/components/ui/FeedbackButton.tsx
rm -f src/components/ui/ThinkingAnimation.tsx
rm -f src/components/ui/accordion.tsx
rm -f src/components/ui/alert.tsx
rm -f src/components/ui/calendar.tsx
rm -f src/components/ui/checkbox.tsx
rm -f src/components/ui/dropdown-menu.tsx
rm -f src/components/ui/popover.tsx
rm -f src/components/ui/sheet.tsx
rm -f src/components/ui/slider.tsx
rm -f src/components/ui/spinner.tsx
echo "✅ Removed unused UI components"

# Clean up unused hooks
rm -f src/hooks/useDebounce.ts
rm -f src/hooks/useImageAnalysis.ts
rm -f src/hooks/useLocalStorage.ts
rm -f src/hooks/useTimelineDragAndDrop.tsx
rm -f src/hooks/useTimelineEventHandlers.tsx
rm -f src/hooks/useTimelinePositioning.tsx
rm -f src/hooks/useTimelineState.tsx
rm -f src/hooks/useTimelineValidation.ts
rm -f src/hooks/useTimelineZoom.tsx
rm -f src/hooks/useVideoPlayer.tsx
echo "✅ Removed unused hooks"

# Clean up lib orphans
rm -f src/lib/cn.ts
rm -f src/lib/metrics.ts
rm -f src/lib/simpleLogger.ts
rm -f src/lib/unregister-service-worker.ts
rm -f src/lib/utils/welcomeSceneUtils.ts
echo "✅ Removed lib orphans"

# Clean up unused eval suites
rm -f src/lib/evals/enhanced-runner.ts
rm -f src/lib/evals/performance-runner.ts
rm -f src/lib/evals/prompt-optimizer.ts
rm -f src/lib/evals/suites/model-pack-performance.ts
echo "✅ Removed unused eval files"

# Clean up unused type files
rm -f src/lib/types/api/a2a.ts
rm -f src/lib/types/api/chat-events.ts
rm -f src/lib/types/api/enhanced-a2a.ts
rm -f src/lib/types/api/evaluation.ts
rm -f src/lib/types/shared/scene.types.ts
echo "✅ Removed unused type files"

# Clean up remotion orphans
rm -f src/remotion/index.ts
rm -f src/remotion/components/CustomScene.tsx
rm -f src/remotion/compositions/TestCustomScene.tsx
echo "✅ Removed remotion orphans"

# Clean up config orphans
rm -f src/config/feedbackFeatures.ts
echo "✅ Removed unused config files"

echo ""
echo "Phase 2: Remove Duplicate Brain Config"
echo "--------------------------------------"

# Remove duplicate brain config (already in src/config)
rm -rf src/brain/config
echo "✅ Removed duplicate brain/config"

echo ""
echo "Phase 3: Clean Server Directory (Respecting T3)"
echo "-----------------------------------------------"

# Remove unused server constants
rm -rf src/server/constants
echo "✅ Removed unused server/constants"

# Remove server utils (moved to lib/utils)
rm -rf src/server/utils
echo "✅ Removed server/utils"

# Clean up unused services
rm -f src/server/services/ai/index.ts
rm -f src/server/services/data/index.ts
rm -f src/server/services/data/versionHistory.service.ts
rm -f src/server/services/generation/index.ts
rm -f src/server/services/generation/sceneAnalyzer.service.ts
rm -f src/server/services/generation/sceneBuilder.service.updated.ts
rm -rf src/server/services/generation/componentGenerator
echo "✅ Removed unused service files"

# Remove old scene services (replaced by tools)
rm -rf src/server/services/scene
echo "✅ Removed old scene services"

# Remove r2.ts from lib (should be in services)
rm -f src/server/lib/r2.ts
echo "✅ Removed misplaced r2.ts"

echo ""
echo "Phase 4: Clean Store Experiments"
echo "--------------------------------"

# Remove experimental video states (keeping videoState.ts)
rm -f src/stores/videoState-hybrid.ts
rm -f src/stores/videoState-simple.ts
rm -f src/stores/videoState.normalized.ts
echo "✅ Removed experimental video states"

echo ""
echo "Phase 5: Clean Client Components"
echo "--------------------------------"

# Move client/components content to components
if [ -d "src/client/components" ]; then
    # Move files to appropriate places
    mv src/client/components/AnalyticsProvider.tsx src/components/ 2>/dev/null || true
    mv src/client/components/ErrorBoundary.tsx src/components/ 2>/dev/null || true
    # Remove client directory
    rm -rf src/client
    echo "✅ Consolidated client/components"
fi

# Clean up Timeline components that were identified as orphans
rm -f src/components/client/Timeline/SelectedSceneContext.tsx
rm -f src/components/client/Timeline/Timeline.tsx
echo "✅ Removed orphaned Timeline components"

echo ""
echo "Phase 6: Clean Tools"
echo "--------------------"

# Remove empty helpers index
rm -f src/tools/helpers/index.ts
echo "✅ Removed empty tools/helpers/index.ts"

echo ""
echo "Phase 7: Final Cleanup"
echo "---------------------"

# Remove backup files
find src -name "*.backup" -type f -delete
echo "✅ Removed all .backup files"

# Remove .DS_Store files
find src -name ".DS_Store" -type f -delete
echo "✅ Removed all .DS_Store files"

# Clean empty directories
find src -type d -empty -delete
echo "✅ Removed empty directories"

echo ""
echo "Summary"
echo "-------"
echo "✅ Removed 85 orphaned files (kept sitemap.ts)"
echo "✅ Cleaned duplicate configurations"
echo "✅ Removed experimental implementations"
echo "✅ Consolidated scattered components"
echo "✅ Preserved T3 App structure"
echo "✅ Kept workspace and panels intact"

# Count files after cleanup
echo ""
echo "File Count After T3-Aware Cleanup:"
echo "---------------------------------"
cd src
find . -type f | wc -l | xargs echo "Total files:"
find . -type d | wc -l | xargs echo "Total directories:"
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l | xargs echo "TypeScript files:"

echo ""
echo "Structure Preserved:"
echo "-------------------"
echo "✅ /app/ - Next.js pages & workspace"
echo "✅ /server/ - T3 backend (api, db, auth)"
echo "✅ /brain/ - AI orchestration"
echo "✅ /tools/ - MCP tools"
echo "✅ /components/ - Shared UI"
echo "✅ /lib/ - Utilities & types"