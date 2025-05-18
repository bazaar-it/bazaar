#!/bin/bash
# Apply environment fixes
source .env.scene-fix
export APPLY_SCENE_PLANNER_PATCH=true

# Start the system with fixes applied
./scripts/startup-with-a2a.sh
