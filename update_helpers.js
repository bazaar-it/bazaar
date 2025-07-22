const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/server/api/routers/generation/helpers.ts', 'utf8');

// Replace the return type in the function signature
const updatedContent = content
  // Update the return type to include additionalMessageIds
  .replace(
    'Promise<{ success: boolean; scene?: SceneEntity; scenes?: SceneEntity[]; partialFailures?: string[] }>',
    'Promise<{ success: boolean; scene?: SceneEntity; scenes?: SceneEntity[]; partialFailures?: string[]; additionalMessageIds?: string[] }>'
  )
  // Add tracking variable at the beginning of scenePlanner case
  .replace(
    'console.log(`📋 [HELPERS] Created plan with ${plannerResult.data.scenePlans.length} scenes`);',
    `console.log(\`📋 [HELPERS] Created plan with \${plannerResult.data.scenePlans.length} scenes\`);
      
      // ✅ TRACK CREATED MESSAGE IDs for VideoState sync
      const createdScenePlanMessageIds: string[] = [];`
  )
  // Replace the messageService.createMessage call to track the ID
  .replace(
    `           await messageService.createMessage({
             projectId,
             content,
             role: "assistant",
             status: "success",
             kind: "scene_plan"
           });`,
    `           // ✅ CREATE MESSAGE AND TRACK ID
           const scenePlanMessage = await messageService.createMessage({
             projectId,
             content,
             role: "assistant",
             status: "success",
             kind: "scene_plan"
           });
           
           // ✅ TRACK THE MESSAGE ID FOR CLIENT SYNC
           if (scenePlanMessage?.id) {
             createdScenePlanMessageIds.push(scenePlanMessage.id);
             console.log(\`📋 [HELPERS] Created scene plan message \${sceneNumber}: \${scenePlanMessage.id}\`);
           }`
  )
  // Update the return statement to include the additional message IDs
  .replace(
    `      return {
        success: true,
        scene: {
          id: 'scene-plan-placeholder',
          name: \`\${plannerResult.data.scenePlans.length} Scene Plan\`,
          tsxCode: '// Scene plan created - use individual buttons to generate scenes',
          duration: 90,
          order: storyboard.length,
          projectId,
          props: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          layoutJson: null
        } as any
      };`,
    `      return {
        success: true,
        scene: {
          id: 'scene-plan-placeholder',
          name: \`\${plannerResult.data.scenePlans.length} Scene Plan\`,
          tsxCode: '// Scene plan created - use individual buttons to generate scenes',
          duration: 90,
          order: storyboard.length,
          projectId,
          props: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          layoutJson: null
        } as any,
        // ✅ RETURN ADDITIONAL MESSAGE IDs FOR CLIENT SYNC
        additionalMessageIds: createdScenePlanMessageIds
      };`
  );

// Write the updated content
fs.writeFileSync('src/server/api/routers/generation/helpers.ts', updatedContent);
console.log('✅ Updated helpers.ts with scene plan message tracking');
