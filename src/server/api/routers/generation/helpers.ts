import { db } from "~/server/db";
import { scenes, sceneIterations, projects, messages } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { randomUUID } from "crypto";
import { addTool } from "~/tools/add/add";
import { editTool } from "~/tools/edit/edit";
import { deleteTool } from "~/tools/delete/delete";
import { trimTool } from "~/tools/trim/trim";
import { typographyTool } from "~/tools/typography/typography";
import { imageRecreatorTool } from "~/tools/image-recreator/image-recreator";
import { scenePlannerTool } from "~/tools/scene-planner/scene-planner";
import { AddAudioTool } from "~/tools/addAudio/addAudio";
import { SceneOrderBuffer } from "./scene-buffer";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import type { AddToolInput, EditToolInput, DeleteToolInput, TrimToolInput, TypographyToolInput, ImageRecreatorToolInput, ScenePlannerToolInput, ScenePlan } from "~/tools/helpers/types";
import type { AddAudioInput } from "~/tools/addAudio/addAudio";
import type { SceneEntity } from "~/generated/entities";
import { formatSceneOperationMessage } from "~/lib/utils/scene-message-formatter";

// Helper function for tool execution and database save
export async function executeToolFromDecision(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  messageId?: string,
  onSceneComplete?: (scene: SceneEntity) => void  // NEW: Callback for real-time delivery
): Promise<{ success: boolean; scene?: SceneEntity; scenes?: SceneEntity[]; partialFailures?: string[]; additionalMessageIds?: string[] }> {
  const startTime = Date.now(); // Track generation time
  
  // Get project format for AI context
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { props: true }
  });
  
  const projectFormat = {
    format: project?.props?.meta?.format || 'landscape',
    width: project?.props?.meta?.width || 1920,
    height: project?.props?.meta?.height || 1080
  };
  
  if (!decision.toolName || !decision.toolContext) {
    throw new Error("Invalid decision - missing tool name or context");
  }

  let toolInput: AddToolInput | EditToolInput | DeleteToolInput | TrimToolInput;

  // Prepare tool input based on tool type
  switch (decision.toolName) {
    case 'addScene':
      // Get reference scenes if specified by Brain for cross-scene style matching
      let referenceScenes: any[] = [];
      if (decision.toolContext?.referencedSceneIds?.length && decision.toolContext.referencedSceneIds.length > 0) {
        // Safety: Only include scenes that exist in storyboard
        referenceScenes = storyboard.filter(s => 
          decision.toolContext!.referencedSceneIds!.includes(s.id)
        );
        
        console.log(`📝 [ROUTER] Including ${referenceScenes.length} reference scenes for ADD operation`);
      }

      // Debug logging for media URLs and template context
      console.log('📝 [HELPERS] Building ADD tool input:', {
        hasImageUrls: !!decision.toolContext.imageUrls?.length,
        hasVideoUrls: !!decision.toolContext.videoUrls?.length,
        hasAudioUrls: !!decision.toolContext.audioUrls?.length,
        videoUrls: decision.toolContext.videoUrls,
        audioUrls: decision.toolContext.audioUrls,
        hasTemplateContext: !!decision.toolContext.templateContext,
        templateCount: decision.toolContext.templateContext?.examples?.length || 0,
      });
      
      // DEBUG: Log the full template context to verify it's there
      if (decision.toolContext.templateContext) {
        console.log('📝 [HELPERS] Template context details:', {
          exampleCount: decision.toolContext.templateContext.examples?.length,
          exampleNames: decision.toolContext.templateContext.examples?.map(e => e.name),
          firstExampleHasCode: !!decision.toolContext.templateContext.examples?.[0]?.code,
        });
      }

      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        requestedDurationFrames: decision.toolContext.requestedDurationFrames, // ADD THIS
        sceneNumber: storyboard.length + 1,
        storyboardSoFar: storyboard,
        imageUrls: decision.toolContext.imageUrls,
        videoUrls: decision.toolContext.videoUrls,
        audioUrls: decision.toolContext.audioUrls,
        assetUrls: decision.toolContext.assetUrls, // Pass persistent asset URLs
        isYouTubeAnalysis: decision.toolContext.isYouTubeAnalysis, // Pass YouTube analysis flag
        // Pass previous scene for style continuity (but not for first scene, GitHub, or Figma components)
        // GitHub and Figma components should have clean styling without previous scene influence
        previousSceneContext: (storyboard.length > 0 && !decision.toolContext.useGitHub && !decision.toolContext.figmaComponentData) ? {
          tsxCode: storyboard[storyboard.length - 1].tsxCode,
          style: undefined
        } : undefined,
        // NEW: Pass reference scenes for cross-scene style matching
        referenceScenes: referenceScenes.length > 0 ? referenceScenes.map(s => ({
          id: s.id,
          name: s.name,
          tsxCode: s.tsxCode
        })) : undefined,
        // NEW: Pass web context for brand-matching
        webContext: decision.toolContext.webContext,
        // Pass project format for AI context
        projectFormat: projectFormat,
        // FIGMA: Pass Figma component data if available
        figmaComponentData: decision.toolContext.figmaComponentData,
        // TEMPLATE CONTEXT: Pass template examples for better first-scene generation
        templateContext: decision.toolContext.templateContext,
      } as AddToolInput;
      
      const addResult = await addTool.run(toolInput);
      console.log('📥 [ROUTER] Received from ADD tool:', {
        success: addResult.success,
        hasData: !!addResult.data,
        dataKeys: addResult.data ? Object.keys(addResult.data) : [],
        name: addResult.data?.name,
        codeLength: addResult.data?.tsxCode?.length,
      });
      
      if (!addResult.success || !addResult.data) {
        throw new Error(addResult.error?.message || 'Add operation failed');
      }
      
      // Trust the duration from the ADD tool - it already analyzes the code
      let addFinalDuration = addResult.data.duration || 150;
      
      // Save to database
      console.log('💾 [ROUTER] Saving to database:', {
        projectId,
        name: addResult.data.name,
        order: storyboard.length,
        duration: addFinalDuration,
      });
      
      const [newScene] = await db.insert(scenes).values({
        projectId,
        name: addResult.data.name,
        tsxCode: addResult.data.tsxCode,
        duration: addFinalDuration || 150,
        order: storyboard.length,
        props: addResult.data.props || {},
        layoutJson: addResult.data.layoutJson || null,
      }).returning();
      
      if (!newScene) {
        throw new Error('Failed to save scene to database');
      }
      
      console.log('✅ [ROUTER] Scene saved to database:', {
        id: newScene.id,
        name: newScene.name,
        duration: newScene.duration,
        order: newScene.order,
      });
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record
        await db.insert(sceneIterations).values({
          sceneId: newScene.id,
          projectId,
          operationType: 'create',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeAfter: newScene.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: newScene.id,
          operationType: 'create',
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: newScene as any  // Cast to any to avoid props type issue
      };

    case 'editScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for edit operation");
      }
      
      const sceneToEdit = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToEdit) {
        throw new Error("Scene not found for editing");
      }
      
      // Handle referenced scenes for style/color matching in edits
      let editReferenceScenes = undefined;
      if (decision.toolContext.referencedSceneIds && decision.toolContext.referencedSceneIds.length > 0) {
        editReferenceScenes = decision.toolContext.referencedSceneIds
          .map(refId => storyboard.find(s => s.id === refId))
          .filter(Boolean)
          .map(scene => ({
            id: scene.id,
            name: scene.name,
            tsxCode: scene.tsxCode
          }));
        
        if (editReferenceScenes.length > 0) {
          console.log('🔗 [HELPERS] Using reference scenes for edit:', {
            targetScene: sceneToEdit.name,
            referenceScenes: editReferenceScenes.map(r => r.name)
          });
        }
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        requestedDurationFrames: decision.toolContext.requestedDurationFrames, // ADD THIS
        sceneId: decision.toolContext.targetSceneId,
        tsxCode: sceneToEdit.tsxCode, // ✓ Fixed: Using correct field name
        currentDuration: sceneToEdit.duration,
        imageUrls: decision.toolContext.imageUrls,
        videoUrls: decision.toolContext.videoUrls,
        audioUrls: decision.toolContext.audioUrls,
        errorDetails: decision.toolContext.errorDetails,
        referenceScenes: editReferenceScenes,
        formatContext: projectFormat,
        modelOverride: decision.toolContext.modelOverride, // Pass model override if provided
      } as EditToolInput;
      
      const editResult = await editTool.run(toolInput as EditToolInput);
      console.log('📥 [ROUTER] Received from EDIT tool:', {
        success: editResult.success,
        hasData: !!editResult.data,
        dataKeys: editResult.data ? Object.keys(editResult.data) : [],
        error: editResult.error,
      });
      
      if (!editResult.success || !editResult.data || !editResult.data.tsxCode) {
        const errorMessage = typeof editResult.error === 'string' 
          ? editResult.error 
          : editResult.error?.message || 'Edit operation failed - no code returned';
        throw new Error(errorMessage);
      }
      
      // Use duration from edit result if provided, otherwise keep existing
      let editFinalDuration = editResult.data.duration;
      
      // Update database
      console.log('💾 [ROUTER] Updating scene in database:', {
        sceneId: decision.toolContext.targetSceneId,
        codeChanged: editResult.data.tsxCode !== sceneToEdit.tsxCode,
        durationChanged: editFinalDuration && editFinalDuration !== sceneToEdit.duration,
      });
      
      const [updatedScene] = await db.update(scenes)
        .set({
          tsxCode: editResult.data.tsxCode,
          duration: editFinalDuration || sceneToEdit.duration,
          props: editResult.data.props || sceneToEdit.props,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, decision.toolContext.targetSceneId))
        .returning();
      
      if (!updatedScene) {
        throw new Error('Failed to update scene in database');
      }
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record
        await db.insert(sceneIterations).values({
          sceneId: decision.toolContext.targetSceneId,
          projectId,
          operationType: 'edit',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeBefore: sceneToEdit.tsxCode,
          codeAfter: editResult.data.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: decision.toolContext.targetSceneId,
          operationType: 'edit',
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: updatedScene as any  // Cast to any to avoid props type issue
      };

    case 'trimScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for trim operation");
      }
      
      const sceneToTrim = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToTrim) {
        throw new Error("Scene not found for trimming");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneId: decision.toolContext.targetSceneId,
        currentDuration: sceneToTrim.duration,
        newDuration: decision.toolContext.targetDuration, // Use brain-calculated duration
      } as TrimToolInput;
      
      const trimResult = await trimTool.run(toolInput as TrimToolInput);
      console.log('📥 [ROUTER] Received from TRIM tool:', {
        success: trimResult.success,
        hasData: !!trimResult.data,
        newDuration: trimResult.data?.duration,
        trimmedFrames: trimResult.data?.trimmedFrames,
      });
      
      if (!trimResult.success || !trimResult.data || !trimResult.data.duration) {
        throw new Error(trimResult.error?.message || 'Trim operation failed');
      }
      
      // Update only the duration in database
      console.log('💾 [ROUTER] Updating scene duration in database:', {
        sceneId: decision.toolContext.targetSceneId,
        oldDuration: sceneToTrim.duration,
        newDuration: trimResult.data.duration,
      });
      
      const [trimmedScene] = await db.update(scenes)
        .set({
          duration: trimResult.data.duration,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, decision.toolContext.targetSceneId))
        .returning();
      
      if (!trimmedScene) {
        throw new Error('Failed to update scene duration in database');
      }
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record for trim
        await db.insert(sceneIterations).values({
          sceneId: decision.toolContext.targetSceneId,
          projectId,
          operationType: 'edit', // Keep as 'edit' for DB compatibility
          editComplexity: 'duration', // Mark this as a duration-only change
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeBefore: sceneToTrim.tsxCode,
          codeAfter: sceneToTrim.tsxCode, // Code doesn't change, only duration
          generationTimeMs,
          modelUsed: null,
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record for trim:', {
          sceneId: decision.toolContext.targetSceneId,
          operationType: 'trim',
          oldDuration: sceneToTrim.duration,
          newDuration: trimResult.data.duration,
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: trimmedScene as any
      };

    case 'deleteScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for delete operation");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        sceneId: decision.toolContext.targetSceneId,
      } as DeleteToolInput;
      
      // For delete, get the scene first for the response
      const sceneToDelete = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToDelete) {
        throw new Error("Scene not found for deletion");
      }
      
      const deleteResult = await deleteTool.run(toolInput as DeleteToolInput);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Delete operation failed');
      }
      
      // Track this iteration BEFORE deleting (to avoid foreign key constraint)
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record BEFORE deletion
        await db.insert(sceneIterations).values({
          sceneId: decision.toolContext.targetSceneId,
          projectId,
          operationType: 'delete',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeBefore: sceneToDelete.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: decision.toolContext.targetSceneId,
          operationType: 'delete',
          generationTimeMs,
        });
      }
      
      // Delete from database AFTER tracking the iteration
      await db.delete(scenes).where(eq(scenes.id, decision.toolContext.targetSceneId));
      
      return {
        success: true,
        scene: sceneToDelete as any // Cast to any to avoid props type issue
      };

    case 'typographyScene':
      console.log('🎨 [HELPERS] Using TYPOGRAPHY tool');
      
      // Build typography input with proper type checking
      const typographyInput: TypographyToolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        projectFormat: projectFormat,
        // Pass previous scene for style continuity (but not for first scene, GitHub, or Figma components)
        // GitHub and Figma components should have clean styling without previous scene influence
        previousSceneContext: (storyboard.length > 0 && !decision.toolContext.useGitHub && !decision.toolContext.figmaComponentData) ? {
          tsxCode: storyboard[storyboard.length - 1].tsxCode,
          style: undefined
        } : undefined,
      };
      
      try {
        const typographyResult = await typographyTool.run(typographyInput);
        
        if (!typographyResult.success || !typographyResult.data) {
          console.warn('🔄 [HELPERS] Typography tool failed, falling back to code-generator');
          throw new Error(typographyResult.error?.message || 'Typography generation failed');
        }
        
        // Save to database (same pattern as addScene)
        const [typographyScene] = await db.insert(scenes).values({
          projectId,
          name: typographyResult.data.name,
          tsxCode: typographyResult.data.tsxCode,
          duration: typographyResult.data.duration || 150,
          order: storyboard.length,
          props: {},
        }).returning();
        
        return { success: true, scene: typographyScene as any };
        
      } catch (error) {
        console.warn('🔄 [HELPERS] Typography tool failed, falling back to code-generator:', error);
        
        // Fall back to code-generator for text-based requests
        const fallbackInput: AddToolInput = {
          userPrompt: decision.toolContext.userPrompt,
          projectId,
          userId,
          sceneNumber: storyboard.length + 1,
          storyboardSoFar: storyboard,
          projectFormat,
        };
        
        const fallbackResult = await addTool.run(fallbackInput);
        
        if (!fallbackResult.success || !fallbackResult.data) {
          throw new Error(fallbackResult.error?.message || 'Both typography and fallback generation failed');
        }
        
        // Save to database with fallback result
        const [fallbackScene] = await db.insert(scenes).values({
          projectId,
          name: fallbackResult.data.name,
          tsxCode: fallbackResult.data.tsxCode,
          duration: fallbackResult.data.duration || 150,
          order: storyboard.length,
          props: {},
        }).returning();
        
        return { success: true, scene: fallbackScene as any };
      }

    case 'imageRecreatorScene':
      console.log('🖼️ [HELPERS] Using IMAGE RECREATOR tool');
      
      // Build image recreator input with proper type checking
      const imageRecreatorInput: ImageRecreatorToolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        imageUrls: decision.toolContext.imageUrls || [], // Ensure it's always an array
        projectFormat: projectFormat,
        recreationType: 'full' // Default recreation type
      };
      
      try {
        const imageResult = await imageRecreatorTool.run(imageRecreatorInput);
        
        if (!imageResult.success) {
          // 🚨 CRITICAL FIX: Don't fallback if image recreator explicitly failed validation
          // This indicates the generated code has syntax errors or missing patterns
          // Falling back to addTool would likely generate the same invalid code
          console.error('🚨 [HELPERS] Image recreator tool failed validation - returning error to prevent app crash');
          console.error('🚨 [HELPERS] Error details:', imageResult.error);
          
          // Return the error directly instead of trying a fallback that might also fail
          const errorMessage = typeof imageResult.error === 'string' 
            ? imageResult.error 
            : imageResult.error?.message || 'Image recreation validation failed - code would crash the app';
          throw new Error(errorMessage);
        }
        
        if (!imageResult.data) {
          console.warn('🔄 [HELPERS] Image recreator succeeded but returned no data, falling back to code-generator');
          throw new Error('Image recreation succeeded but returned no data');
        }
        
        // Save to database (same pattern as addScene)
        const [imageScene] = await db.insert(scenes).values({
          projectId,
          name: imageResult.data.name,
          tsxCode: imageResult.data.tsxCode,
          duration: imageResult.data.duration || 150,
          order: storyboard.length,
          props: {},
        }).returning();
        
        if (!imageScene) {
          throw new Error('Failed to save image recreation scene to database');
        }
        
        console.log('✅ [HELPERS] Image recreation successful:', imageScene.name);
        return { success: true, scene: imageScene as any };
        
      } catch (error) {
        // 🚨 CRITICAL FIX: Only use fallback for unexpected errors, not validation failures
        if (error instanceof Error && error.message.includes('validation failed')) {
          // Don't fallback for validation failures - rethrow to prevent app crashes
          console.error('🚨 [HELPERS] Validation failure detected - not using fallback to prevent crashes');
          throw error;
        }
        
        console.warn('🔄 [HELPERS] Image recreator tool had unexpected error, falling back to code-generator:', error);
        
        // Fall back to code-generator with images (only for unexpected errors)
        const fallbackInput: AddToolInput = {
          userPrompt: decision.toolContext.userPrompt,
          projectId,
          userId,
          sceneNumber: storyboard.length + 1,
          storyboardSoFar: storyboard,
          imageUrls: decision.toolContext.imageUrls,
          projectFormat,
          // FIGMA: Pass Figma component data to fallback
          figmaComponentData: decision.toolContext.figmaComponentData,
        };
        
        const fallbackResult = await addTool.run(fallbackInput);
        
        if (!fallbackResult.success || !fallbackResult.data) {
          throw new Error(fallbackResult.error?.message || 'Both image recreation and fallback generation failed');
        }
        
        // Save to database with fallback result
        const [fallbackScene] = await db.insert(scenes).values({
          projectId,
          name: fallbackResult.data.name,
          tsxCode: fallbackResult.data.tsxCode,
          duration: fallbackResult.data.duration || 150,
          order: storyboard.length,
          props: {},
        }).returning();
        
        if (!fallbackScene) {
          throw new Error('Failed to save fallback scene to database');
        }
        
        console.log('✅ [HELPERS] Fallback to addTool successful:', fallbackScene.name);
        return { success: true, scene: fallbackScene as any };
      }
      // [SCENEPLANNER DISABLED] - All scenePlanner logic commented out
      // console.log(`📋 [HELPERS] Created plan with ${plannerResult.data.scenePlans.length} scenes`);
      // ... (scenePlanner case logic removed for simplicity)
      
      // Fallback: redirect to addScene for multi-scene requests
      console.log('⚠️ [HELPERS] scenePlanner disabled - falling back to addScene');
      throw new Error('scenePlanner is temporarily disabled. Please create scenes one at a time using addScene.');

    case 'addAudio':
      console.log('🎵 [HELPERS] Processing addAudio tool');
      
      // Create the addAudio tool
      const addAudioTool = new AddAudioTool();
      
      const audioInput: AddAudioInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        audioUrls: decision.toolContext.audioUrls || [],
        targetSceneId: decision.toolContext.targetSceneId,
      };
      
      const audioResult = await addAudioTool.run(audioInput);
      
      if (!audioResult.success) {
        throw new Error(audioResult.error?.message || 'Add audio operation failed');
      }
      
      // Audio was added successfully - create chat response message
      if (audioResult.chatResponse && messageId) {
        await messageService.saveMessage({
          id: randomUUID(),
          projectId,
          message: audioResult.chatResponse,
          role: 'assistant',
          parentMessageId: messageId,
          userId,
          timestamp: new Date(),
        });
      }
      
      return {
        success: true,
        // No scene to return for audio addition
      };

    default:
      throw new Error(`Unknown tool: ${decision.toolName}`);
  }
}

// Multi-scene execution function with proper null checks
async function executeMultiSceneFromPlanner(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  messageId?: string,
  onSceneComplete?: (scene: SceneEntity) => void
): Promise<{ success: boolean; scenes: SceneEntity[]; partialFailures?: string[] }> {
  console.log('🎬 [HELPERS] Executing multi-scene generation from planner');
  
  // Validate decision has toolContext
  if (!decision.toolContext) {
    throw new Error('Decision missing toolContext for multi-scene execution');
  }
  
  // Build scene planner input
  const scenePlannerInput: ScenePlannerToolInput = {
    userPrompt: decision.toolContext.userPrompt,
    projectId,
    userId,
    storyboardSoFar: storyboard,
    imageUrls: decision.toolContext.imageUrls,
    chatHistory: []
  };
  
  // Get project format
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { props: true }
  });
  
  const projectFormat = {
    format: project?.props?.meta?.format || 'landscape',
    width: project?.props?.meta?.width || 1920,
    height: project?.props?.meta?.height || 1080
  };
  
  // Step 1: Run scene planner
  const plannerInput = {
    userPrompt: decision.toolContext.userPrompt,
    projectId,
    userId,
    storyboardSoFar: storyboard,
    imageUrls: decision.toolContext.imageUrls,
    chatHistory: [], // TODO: Add chat history if available
  } as ScenePlannerToolInput;
  
  const plannerResult = await scenePlannerTool.run(plannerInput);
  
  if (!plannerResult.success || !plannerResult.data) {
    throw new Error(plannerResult.error?.message || 'Scene planning failed');
  }
  
  console.log(`🎬 [MULTI-SCENE] Planned ${plannerResult.data.scenePlans.length} scenes, executing in parallel`);
  
  // Step 2: Set up ordered delivery buffer
  const startingOrder = storyboard.length;
  const orderBuffer = new SceneOrderBuffer(startingOrder, (scene: SceneEntity) => {
    if (onSceneComplete) {
      onSceneComplete(scene);
    }
  });
  
  // Step 3: Execute scenes in parallel with ordered delivery
  const scenePromises = plannerResult.data.scenePlans.map(async (plan, index) => {
    const sceneOrder = startingOrder + index;
    
    try {
      console.log(`🎬 [MULTI-SCENE] Starting scene ${sceneOrder}: ${plan.toolType} - "${plan.prompt.substring(0, 50)}..."`);
      
      // Execute individual scene
      const result = await executeIndividualScene(plan, projectId, userId, projectFormat, sceneOrder, storyboard);
      
      if (result.success && result.scene) {
        console.log(`✅ [MULTI-SCENE] Scene ${sceneOrder} completed: ${result.scene.name}`);
        
        // Add to buffer for ordered delivery
        orderBuffer.addCompletedScene(result.scene, sceneOrder);
        
        return { success: true, scene: result.scene, sceneOrder };
      } else {
        console.error(`❌ [MULTI-SCENE] Scene ${sceneOrder} failed: ${result.error}`);
        return { success: false, error: result.error, sceneOrder };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [MULTI-SCENE] Scene ${sceneOrder} threw error: ${errorMessage}`);
      return { success: false, error: errorMessage, sceneOrder };
    }
  });
  
  // Step 4: Wait for all scenes and handle partial failures
  const sceneResults = await Promise.all(scenePromises);
  
  // Check if there are any scenes still in the buffer (shouldn't happen, but safety check)
  if (orderBuffer.getPendingCount() > 0) {
    console.warn(`🚨 [MULTI-SCENE] ${orderBuffer.getPendingCount()} scenes still in buffer after completion`);
  }
  
  // Separate successful and failed scenes
  const successfulScenes = sceneResults.filter(r => r.success && r.scene).map(r => r.scene!);
  const failedScenes = sceneResults.filter(r => !r.success);
  
  console.log(`🎬 [MULTI-SCENE] Completed: ${successfulScenes.length} successful, ${failedScenes.length} failed`);
  
  // Log failed scenes for debugging
  if (failedScenes.length > 0) {
    console.error('🚨 [MULTI-SCENE] Failed scenes:', failedScenes.map(f => `Scene ${f.sceneOrder}: ${f.error}`));
  }
  
  // Return partial success if we have any successful scenes
  if (successfulScenes.length > 0) {
    return {
      success: true,
      scenes: successfulScenes,
      partialFailures: failedScenes.map(f => `Scene ${f.sceneOrder}: ${f.error}`)
    };
  } else {
    // All scenes failed
    throw new Error(`All ${plannerResult.data.scenePlans.length} scenes failed to generate`);
  }
}

async function executeIndividualScene(
  plan: ScenePlan,
  projectId: string,
  userId: string,
  projectFormat: any,
  sceneOrder: number,
  storyboard: any[]
): Promise<{ success: boolean; scene?: SceneEntity; error?: string }> {
  
  try {
    let toolResult;
    
    // Execute appropriate tool with fallback
    switch (plan.toolType) {
      case 'typography':
        try {
          toolResult = await typographyTool.run({
            userPrompt: plan.prompt,
            projectId,
            userId,
            projectFormat,
          });
          
          if (!toolResult.success || !toolResult.data) {
            throw new Error(toolResult.error?.message || 'Typography tool failed');
          }
        } catch (error) {
          console.warn(`🔄 [MULTI-SCENE] Typography tool failed for scene ${sceneOrder}, falling back to code-generator:`, error);
          
          // Fall back to code-generator
          toolResult = await addTool.run({
            userPrompt: plan.prompt,
            projectId,
            userId,
            sceneNumber: sceneOrder + 1,
            storyboardSoFar: storyboard,
            projectFormat,
          });
        }
        break;
        
      case 'recreate':
        try {
          toolResult = await imageRecreatorTool.run({
            userPrompt: plan.prompt,
            imageUrls: plan.context.imageUrls || [],
            projectId,
            userId,
            projectFormat,
            recreationType: 'full',
          });
          
          if (!toolResult.success || !toolResult.data) {
            throw new Error(toolResult.error?.message || 'Image recreation tool failed');
          }
        } catch (error) {
          console.warn(`🔄 [MULTI-SCENE] Image recreation tool failed for scene ${sceneOrder}, falling back to code-generator:`, error);
          
          // Fall back to code-generator with images
          toolResult = await addTool.run({
            userPrompt: plan.prompt,
            projectId,
            userId,
            sceneNumber: sceneOrder + 1,
            storyboardSoFar: storyboard,
            imageUrls: plan.context.imageUrls,
            projectFormat,
          });
        }
        break;
        
      case 'code-generator':
      default:
        toolResult = await addTool.run({
          userPrompt: plan.prompt,
          projectId,
          userId,
          sceneNumber: sceneOrder + 1,
          storyboardSoFar: storyboard,
          projectFormat,
        });
        break;
    }
    
    if (!toolResult.success || !toolResult.data) {
      return { success: false, error: toolResult.error?.message || 'Tool execution failed' };
    }
    
    // Save to database with correct order
    const [newScene] = await db.insert(scenes).values({
      projectId,
      name: toolResult.data.name,
      tsxCode: toolResult.data.tsxCode,
      duration: toolResult.data.duration || 150,
      order: sceneOrder,
      props: {},
    }).returning();
    
    return { success: true, scene: newScene as any };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during scene execution' 
    };
  }
}