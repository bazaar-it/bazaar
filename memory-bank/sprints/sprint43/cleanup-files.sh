#!/bin/bash

# Sprint 43: File Structure Cleanup Script
# This script removes duplicate and orphaned files identified during architecture refactoring

echo "Sprint 43: Bazaar-Vid File Structure Cleanup"
echo "============================================"
echo ""

# Function to safely remove files/directories
safe_remove() {
    local path=$1
    if [ -e "$path" ]; then
        echo "✅ Removing: $path"
        rm -rf "$path"
    else
        echo "⚠️  Already removed or doesn't exist: $path"
    fi
}

# Navigate to project root
cd "$(dirname "$0")/../../.." || exit

echo "Phase 1: Remove Duplicate Brain Implementations"
echo "----------------------------------------------"

# Remove duplicate brain in app folder
safe_remove "src/app/projects/[id]/generate/agents"

# Remove duplicate brain services
safe_remove "src/server/services/brain"

echo ""
echo "Phase 2: Remove Legacy Service Locations"
echo "---------------------------------------"

# Remove legacy API services
safe_remove "src/server/api/services"

# Remove old MCP folder
safe_remove "src/server/services/mcp"

echo ""
echo "Phase 3: Clean Up Scripts Structure"
echo "-----------------------------------"

# Move scripts from src to root if they exist
if [ -d "src/scripts" ]; then
    echo "Moving scripts from src/scripts to scripts/"
    
    # Create scripts directory if it doesn't exist
    mkdir -p scripts
    
    # Move useful scripts
    if [ -f "src/scripts/analyze-dependencies.ts" ]; then
        mv src/scripts/analyze-dependencies.ts scripts/
    fi
    
    if [ -f "src/scripts/analyze-deps.cjs" ]; then
        mv src/scripts/analyze-deps.cjs scripts/
    fi
    
    if [ -f "src/scripts/cleanup-orphaned-files.js" ]; then
        mv src/scripts/cleanup-orphaned-files.js scripts/
    fi
    
    if [ -f "src/scripts/find-orphaned-files.cjs" ]; then
        mv src/scripts/find-orphaned-files.cjs scripts/
    fi
    
    # Copy migration tools if they have their own package.json
    if [ -f "src/scripts/package.json" ]; then
        echo "Keeping src/scripts/migration-tools as they have their own package.json"
        mv src/scripts scripts/migration-tools
    else
        # Remove src/scripts entirely
        safe_remove "src/scripts"
    fi
fi

echo ""
echo "Phase 4: Remove Old Scene Service Implementations"
echo "------------------------------------------------"
echo "NOTE: These will be removed after verifying new tools work"

# Document old services to be removed later
echo "⚠️  To remove after verification:"
echo "   - src/server/services/scene/add/"
echo "   - src/server/services/scene/edit/"
echo "   - src/server/services/scene/delete/"

echo ""
echo "Phase 5: Clean Up Orphaned Configuration"
echo "----------------------------------------"

# Remove backup files
find . -name "*.backup" -type f -delete
echo "✅ Removed all .backup files"

# Remove old brain config if it exists outside main location
safe_remove "src/config/brain"

echo ""
echo "Phase 6: Additional Cleanup from Sprint 42 Analysis"
echo "--------------------------------------------------"

# Based on the orphaned files analysis from sprint 42
safe_remove "src/server/api/routers/generation.old.ts"
safe_remove "src/server/api/routers/generation.simplified.ts"
safe_remove "src/server/api/root.ts.backup"

echo ""
echo "Summary"
echo "-------"
echo "✅ Removed duplicate brain implementations"
echo "✅ Removed legacy service locations"
echo "✅ Cleaned up scripts structure"
echo "✅ Removed backup files"
echo "⚠️  Old scene services marked for removal after verification"

echo ""
echo "Next Steps:"
echo "1. Verify the application still builds and runs"
echo "2. Run tests to ensure nothing critical was removed"
echo "3. After verification, remove old scene services"
echo "4. Commit these changes"

# Count remaining files
echo ""
echo "File Count Statistics:"
echo "----------------------"
find src -type f -name "*.ts" -o -name "*.tsx" | wc -l | xargs echo "TypeScript files remaining:"
find src -type d | wc -l | xargs echo "Directories remaining:"