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
