#!/bin/bash

# Sprint 43: Reorganize File Structure Script
# This script moves files to their correct locations according to the ideal structure

echo "Sprint 43: Bazaar-Vid Structure Reorganization"
echo "=============================================="
echo ""

# Function to safely move files
safe_move() {
    local source=$1
    local dest=$2
    if [ -e "$source" ]; then
        # Create destination directory if it doesn't exist
        mkdir -p "$(dirname "$dest")"
        echo "✅ Moving: $source → $dest"
        mv "$source" "$dest"
    else
        echo "⚠️  Source doesn't exist: $source"
    fi
}

# Navigate to src directory
cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src || exit

echo "Phase 1: Create Clean Directory Structure"
echo "----------------------------------------"

# Create the ideal structure
mkdir -p api
mkdir -p services
mkdir -p components/{chat,video,shared}
mkdir -p lib/types
mkdir -p remotion/templates
mkdir -p db
mkdir -p stores
mkdir -p hooks

echo ""
echo "Phase 2: Move API Routes"
echo "------------------------"

# Move tRPC routers from server/api/routers to api/
safe_move "server/api/routers/generation.universal.ts" "api/generation.ts"
safe_move "server/api/routers/project.ts" "api/project.ts"
safe_move "server/api/routers/chat.ts" "api/chat.ts"
safe_move "server/api/routers/scenes.ts" "api/scenes.ts"
safe_move "server/api/routers/render.ts" "api/render.ts"
safe_move "server/api/routers/share.ts" "api/share.ts"
safe_move "server/api/routers/admin.ts" "api/admin.ts"
safe_move "server/api/routers/voice.ts" "api/voice.ts"
safe_move "server/api/routers/feedback.ts" "api/feedback.ts"
safe_move "server/api/routers/emailSubscriber.ts" "api/emailSubscriber.ts"
safe_move "server/api/root.ts" "api/root.ts"
safe_move "server/api/trpc.ts" "api/trpc.ts"

echo ""
echo "Phase 3: Consolidate Services"
echo "-----------------------------"

# Move AI services
safe_move "server/services/ai/aiClient.service.ts" "services/ai.service.ts"

# Move data services
safe_move "server/services/data/projectMemory.service.ts" "services/memory.service.ts"

# Move storage service (if exists)
safe_move "server/lib/r2.ts" "services/storage.service.ts"

# Database
safe_move "server/db/index.ts" "db/index.ts"
safe_move "server/db/schema.ts" "db/schema.ts"

echo ""
echo "Phase 4: Consolidate Client Components"
echo "--------------------------------------"

# Move client components to main components directory
if [ -d "client/components" ]; then
    for file in client/components/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            safe_move "$file" "components/shared/$filename"
        fi
    done
fi

# Move Timeline components
if [ -d "components/client/Timeline" ]; then
    mkdir -p components/video/timeline
    for file in components/client/Timeline/*; do
        if [ -f "$file" ]; then
            safe_move "$file" "components/video/timeline/$(basename "$file")"
        fi
    done
fi

echo ""
echo "Phase 5: Consolidate Utils"
echo "--------------------------"

# Move all utils to lib/utils
safe_move "utils/retryWithBackoff.ts" "lib/utils/retryWithBackoff.ts"
safe_move "utils/finnhubDataFormatter.ts" "lib/utils/finnhubDataFormatter.ts"
safe_move "server/utils/tsxPreprocessor.ts" "lib/utils/tsxPreprocessor.ts"

echo ""
echo "Phase 6: Move Templates"
echo "----------------------"

# Move templates to remotion if they're Remotion components
for file in templates/*.tsx; do
    if [ -f "$file" ]; then
        safe_move "$file" "remotion/templates/$(basename "$file")"
    fi
done
safe_move "templates/templateUtils.ts" "remotion/templates/utils.ts"

echo ""
echo "Phase 7: Consolidate Configuration"
echo "----------------------------------"

# Move brain config to main config
safe_move "brain/config/models.config.ts" "config/models.ts"
# Note: prompts.config.ts is already in the right place

echo ""
echo "Phase 8: Clean Up Empty Directories"
echo "-----------------------------------"

# Remove empty directories
find . -type d -empty -delete

echo ""
echo "Phase 9: Update Root Imports"
echo "----------------------------"

# Create new server/api/index.ts that exports from new location
cat > server/api/root.ts << 'EOF'
// Re-export from new location for backward compatibility
export { appRouter, createCaller } from "~/api/root";
export type { AppRouter } from "~/api/root";
EOF

echo "✅ Created compatibility export at server/api/root.ts"

echo ""
echo "Summary"
echo "-------"
echo "✅ Moved API routes to /api/"
echo "✅ Consolidated services to /services/"
echo "✅ Unified components structure"
echo "✅ Consolidated utils to /lib/utils/"
echo "✅ Moved templates to /remotion/templates/"
echo "✅ Reorganized configuration"
echo ""
echo "Next Steps:"
echo "1. Update all imports to use new paths"
echo "2. Test that the application builds"
echo "3. Delete old empty directories"
echo "4. Remove orphaned files identified earlier"

# Count files after reorganization
echo ""
echo "File Count After Reorganization:"
echo "-------------------------------"
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l | xargs echo "TypeScript files:"
find . -type d | wc -l | xargs echo "Directories:"