import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, templateUsages } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { ResponseBuilder } from "~/lib/api/response-helpers";

/**
 * Generate a unique 8-character ID like the code generator
 */
function generateUniqueId(): string {
  // Use timestamp + random for uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return (timestamp + random).substring(0, 8);
}

/**
 * Make all components in template code unique by appending a suffix
 */
function makeTemplateComponentsUnique(templateCode: string, uniqueId: string): string {
  // Track what component names we've found to avoid duplicates
  const processedComponents = new Set<string>();
  
  // Replace all component function declarations (both arrow functions and regular functions)
  let uniqueCode = templateCode;
  
  // Pattern 1: const ComponentName: React.FC<...> = (...) => {
  uniqueCode = uniqueCode.replace(
    /const\s+([A-Z][a-zA-Z]*)\s*:\s*React\.FC[^=]*=\s*\(/g,
    (match, componentName) => {
      if (!processedComponents.has(componentName)) {
        processedComponents.add(componentName);
        return match.replace(componentName, `${componentName}_${uniqueId}`);
      }
      return match;
    }
  );
  
  // Pattern 2: function ComponentName(...) {
  uniqueCode = uniqueCode.replace(
    /function\s+([A-Z][a-zA-Z]*)\s*\(/g,
    (match, componentName) => {
      if (!processedComponents.has(componentName)) {
        processedComponents.add(componentName);
        return match.replace(componentName, `${componentName}_${uniqueId}`);
      }
      return match;
    }
  );
  
  // Pattern 3: export default function ComponentName(...) {
  uniqueCode = uniqueCode.replace(
    /export\s+default\s+function\s+([A-Z][a-zA-Z]*)\s*\(/g,
    (match, componentName) => {
      if (!processedComponents.has(componentName)) {
        processedComponents.add(componentName);
        return match.replace(componentName, `${componentName}_${uniqueId}`);
      }
      return match;
    }
  );
  
  // Now replace all usages of these components with their unique names
  processedComponents.forEach(componentName => {
    // Replace JSX usage: <ComponentName ... >
    const jsxPattern = new RegExp(`<${componentName}(\\s|>|/)`, 'g');
    uniqueCode = uniqueCode.replace(jsxPattern, `<${componentName}_${uniqueId}$1`);
    
    // Replace closing tags: </ComponentName>
    const closingTagPattern = new RegExp(`</${componentName}>`, 'g');
    uniqueCode = uniqueCode.replace(closingTagPattern, `</${componentName}_${uniqueId}>`);
  });
  
  return uniqueCode;
}

/**
 * ADD TEMPLATE - Add a pre-made template as a new scene
 */
export const addTemplate = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    templateId: z.string(),
    templateName: z.string(),
    templateCode: z.string(),
    templateDuration: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    const response = new ResponseBuilder();
    const { projectId, templateId, templateName, templateDuration } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Adding template`, { projectId, templateId, templateName });

    try {
      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found or access denied",
        };
      }

      // 2. Get current scene count for order
      const existingScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
      });

      const sceneOrder = existingScenes.length;

      // 3. Generate unique ID like the code generator  
      const uniqueId = generateUniqueId();
      const sceneName = `${templateName}_${uniqueId}`;

      // 4. Rename main function like code generator + simple helper component handling
      const { templateCode } = input;
      
      // Step 1: Rename the main export function with UUID (like code generator)
      let uniqueTemplateCode = templateCode.replace(
        /export default function (\w+)\(/,
        `export default function $1_${uniqueId}(`
      );

      // Step 2: Check if this template ID has been used before in this project
      const existingSameTemplateScenes = existingScenes.filter(scene => 
        scene.name.includes(templateName)
      );
      
      // If there are existing scenes with the same template, add simple suffix to helpers
      if (existingSameTemplateScenes.length > 0) {
        const instanceNumber = existingSameTemplateScenes.length + 1;
        
        // Add simple numeric suffix to helper components to avoid conflicts
        // This only affects components when the same template is used multiple times
        uniqueTemplateCode = uniqueTemplateCode.replace(
          /const\s+([A-Z][a-zA-Z]*)\s*:\s*React\.FC/g,
          `const $1_${instanceNumber}: React.FC`
        ).replace(
          /const\s+([A-Z][a-zA-Z]*)\s*=\s*\(/g,
          `const $1_${instanceNumber} = (`
        );
        
        // Update JSX usage of these components
        const componentNames = [...uniqueTemplateCode.matchAll(/const\s+([A-Z][a-zA-Z]*)_\d+\s*[=:]/g)]
          .map(match => match[1]);
        
        componentNames.forEach(componentName => {
          const jsxPattern = new RegExp(`<${componentName}(\\s|>|/)`, 'g');
          uniqueTemplateCode = uniqueTemplateCode.replace(jsxPattern, `<${componentName}_${instanceNumber}$1`);
          
          const closingTagPattern = new RegExp(`</${componentName}>`, 'g');
          uniqueTemplateCode = uniqueTemplateCode.replace(closingTagPattern, `</${componentName}_${instanceNumber}>`);
        });
        
        console.log(`[${response.getRequestId()}] Applied conflict resolution for template instance ${instanceNumber}`);
      }

      // 5. Save template as a new scene
      console.log(`[${response.getRequestId()}] Saving template to database`, {
        name: sceneName,
        order: sceneOrder,
        duration: templateDuration,
        uniqueId,
      });

      const [newScene] = await db.insert(scenes).values({
        projectId,
        name: sceneName,
        tsxCode: uniqueTemplateCode,
        duration: templateDuration,
        order: sceneOrder,
        props: {},
        layoutJson: null,
      }).returning();

      if (!newScene) {
        return {
          success: false,
          message: "Failed to save template to database",
        };
      }

      console.log(`[${response.getRequestId()}] Template saved successfully`, {
        sceneId: newScene.id,
        name: newScene.name,
        uniqueId,
      });

      // 6. Clear welcome flag if this is the first scene
      if (project.isWelcome && existingScenes.length === 0) {
        await db.update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
      }

      // 7. Track template usage for analytics
      await db.insert(templateUsages).values({
        templateId,
        userId,
        projectId,
        sceneId: newScene.id,
      });

      // 8. Add chat message for context
      await messageService.createMessage({
        projectId,
        content: `Added ${templateName} template to scene ${sceneOrder + 1}`,
        role: "assistant",
      });

      return {
        success: true,
        message: "",
        scene: newScene as any, // Cast to avoid props type issue
      };

    } catch (error) {
      console.error(`[${response.getRequestId()}] Template addition error:`, error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add template',
      };
    }
  });