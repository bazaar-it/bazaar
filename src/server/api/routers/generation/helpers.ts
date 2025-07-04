import { db } from "~/server/db";
import { scenes, sceneIterations, projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { addTool } from "~/tools/add/add";
import { editTool } from "~/tools/edit/edit";
import { deleteTool } from "~/tools/delete/delete";
import { trimTool } from "~/tools/trim/trim";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import type { AddToolInput, EditToolInput, DeleteToolInput, TrimToolInput } from "~/tools/helpers/types";
import type { SceneEntity } from "~/generated/entities";

// Helper function for tool execution and database save
export async function executeToolFromDecision(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  messageId?: string
): Promise<{ success: boolean; scene?: SceneEntity }> {
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

      // Debug logging for video URLs
      console.log('📝 [HELPERS] Building ADD tool input:', {
        hasImageUrls: !!decision.toolContext.imageUrls?.length,
        hasVideoUrls: !!decision.toolContext.videoUrls?.length,
        videoUrls: decision.toolContext.videoUrls,
      });

      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneNumber: storyboard.length + 1,
        storyboardSoFar: storyboard,
        imageUrls: decision.toolContext.imageUrls,
        videoUrls: decision.toolContext.videoUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
        // Pass previous scene for style continuity (but not for first scene)
        previousSceneContext: storyboard.length > 0 ? {
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
        sceneId: decision.toolContext.targetSceneId,
        tsxCode: sceneToEdit.tsxCode, // ✓ Fixed: Using correct field name
        currentDuration: sceneToEdit.duration,
        imageUrls: decision.toolContext.imageUrls,
        videoUrls: decision.toolContext.videoUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
        errorDetails: decision.toolContext.errorDetails,
        referenceScenes: editReferenceScenes,
        formatContext: projectFormat,
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

    default:
      throw new Error(`Unknown tool: ${decision.toolName}`);
  }
}