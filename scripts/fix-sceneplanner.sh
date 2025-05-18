#!/bin/bash
# scripts/fix-sceneplanner.sh
# A script to apply the ScenePlannerAgent fix and restart the system

echo "🔧 ScenePlannerAgent Fix Script"
echo "This script will apply the patch to fix the ScenePlannerAgent issue"

# Kill any running processes
echo "📴 Shutting down any running processes..."
pkill -f "node.*next" || true
pkill -f "log-agent" || true
sleep 2

# Create an updated environment file
echo "📝 Creating updated environment configuration..."
cat > .env.scene-fix << EOL
# Fixed configuration for ScenePlannerAgent
# Created $(date)

# Make sure to enable all background workers
DISABLE_BACKGROUND_WORKERS=false
ENABLE_CODE_GEN_WORKER=true
ENABLE_BUILD_WORKER=true
ENABLE_TASK_PROCESSOR=true

# Message bus must be enabled 
USE_MESSAGE_BUS=true

# Use a smaller model for OpenAI to avoid quota issues
DEFAULT_ADB_MODEL=gpt-3.5-turbo
EOL

echo "✅ Configuration created successfully"

# Create a custom startup script
cat > scripts/startup-with-fixes.sh << EOL
#!/bin/bash
# Apply environment fixes
source .env.scene-fix
export APPLY_SCENE_PLANNER_PATCH=true

# Start the system with fixes applied
./scripts/startup-with-a2a.sh
EOL

chmod +x scripts/startup-with-fixes.sh

echo "✅ Custom startup script created"

# Create a patch application script
cat > src/server/services/a2a/taskProcessorPatch.ts << EOL
// src/server/services/a2a/taskProcessorPatch.ts
import './taskProcessor.service';

// Check if we should apply the patch
if (process.env.APPLY_SCENE_PLANNER_PATCH === 'true') {
  console.log('🧪 Applying ScenePlannerAgent fixes!');
  
  // Import and execute the patch
  import('./applyPatches').then(patch => {
    console.log('✅ ScenePlannerAgent patch applied successfully!');
  }).catch(err => {
    console.error('❌ Error applying ScenePlannerAgent patch:', err);
  });
} else {
  console.log('🚫 ScenePlannerAgent patch not applied (APPLY_SCENE_PLANNER_PATCH is not true)');
}
EOL

echo "✅ Patch application script created"

echo ""
echo "🚀 All done! To start the system with the fixes, run:"
echo "    ./scripts/startup-with-fixes.sh"
echo ""
echo "This will enable the ScenePlannerAgent by patching the module system mismatch."
