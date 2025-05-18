// src/server/services/a2a/applyPatches.ts
// This file applies patches to fix the ScenePlannerAgent initialization

import { taskProcessor } from './taskProcessor.service';
import { initializeAgentsPatched } from './initializeAgentsPatched';

// Apply the patch to the TaskProcessor
console.log('🔄 Applying ScenePlannerAgent patch...');

// Use the patched initializeAgents function
// We're accessing a private method of the task processor, which is not ideal but necessary for the fix
(taskProcessor as any).initializeAgents = initializeAgentsPatched;

console.log('✅ ScenePlannerAgent patch applied!');
console.log('🔄 Reinitializing agents with patched implementation...');

// Re-initialize the agents using the patched function
(taskProcessor as any).initialized = false;
taskProcessor.init();

console.log('✅ Agents reinitialized with patched implementation');
console.log('🔍 You can now use the ScenePlannerAgent');

export default {
  message: 'ScenePlannerAgent patch applied successfully'
};
