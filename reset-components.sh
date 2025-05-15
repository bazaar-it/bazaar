#!/bin/bash
# Run this after fixing the preprocessor and restarting the build worker

# Environment from .env.local
source .env.local

# Component IDs
TETRIS_COMPONENT_ID="69ecccb5-862c-43a7-b5a5-ddd7cf7776f3"
ROW_COMPONENT_ID="46a6e2c8-8e1f-408a-b4a8-a131ec82e48a"

# Update status to "building" to trigger rebuild
psql $DATABASE_URL <<SQL
UPDATE "bazaar-vid_custom_component_job"
SET "status" = 'building',
    "updatedAt" = NOW()
WHERE id IN ('$TETRIS_COMPONENT_ID', '$ROW_COMPONENT_ID');
SQL

echo "Components reset to 'building' status"
