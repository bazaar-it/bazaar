# Feature 012: Duplicate Scene

**Feature ID**: 012  
**Priority**: MEDIUM  
**Complexity**: LOW  
**Created**: 2025-01-02  

## Overview
Add the ability to duplicate existing scenes within a project, allowing users to quickly create variations of successful scenes without starting from scratch. This simple but powerful feature significantly speeds up the video creation workflow.

## Current State
- **Limitation**: Users can only create new scenes or edit existing ones
- **Workaround**: Users manually copy code from one scene to create similar ones
- **Pain Point**: Re-creating similar scenes is time-consuming and error-prone
- **User Flow**: New scene → Copy/paste code → Modify

## Problem Statement / User Need

### User Problems:
1. **Repetitive Work**: Creating multiple similar scenes requires starting from scratch
   - Product showcases with consistent styling
   - Multi-slide presentations with same layout
   - Series of tips/facts with identical formatting

2. **Consistency Challenge**: Maintaining visual consistency across scenes is difficult
   - Manual copying leads to mistakes
   - Style drift when recreating similar content
   - Time wasted on repetitive setup

3. **Workflow Friction**: Current process breaks creative flow
   - Switch to code view to copy
   - Create new scene
   - Paste and modify
   - Risk losing work if mistakes made

### Use Cases:
- **Product Demos**: Duplicate product scene, change only the product
- **Listicles**: "5 Tips" videos with consistent scene structure  
- **Testimonials**: Same layout, different quotes and avatars
- **Before/After**: Duplicate scene and modify for comparison

## Proposed Solution

### Technical Implementation:

1. **UI Addition - Duplicate Button**:
   ```tsx
   // components/video/SceneCard.tsx
   <DropdownMenu>
     <DropdownMenuItem onClick={handleEdit}>
       <Edit2 className="w-4 h-4 mr-2" />
       Edit
     </DropdownMenuItem>
     <DropdownMenuItem onClick={handleDuplicate}>
       <Copy className="w-4 h-4 mr-2" />
       Duplicate
     </DropdownMenuItem>
     <DropdownMenuItem onClick={handleDelete} className="text-red-600">
       <Trash2 className="w-4 h-4 mr-2" />
       Delete
     </DropdownMenuItem>
   </DropdownMenu>
   ```

2. **State Management Update**:
   ```typescript
   // stores/videoState.ts
   duplicateScene: (projectId: string, sceneId: string) => {
     const scene = get().projects[projectId]?.scenes[sceneId];
     if (!scene) return;
     
     const newSceneId = `scene_${Date.now()}`;
     const newScene = {
       ...scene,
       id: newSceneId,
       title: `${scene.title} (Copy)`,
       createdAt: new Date(),
       updatedAt: new Date(),
     };
     
     // Insert after original scene
     const sceneOrder = get().projects[projectId].sceneOrder;
     const originalIndex = sceneOrder.indexOf(sceneId);
     const newOrder = [
       ...sceneOrder.slice(0, originalIndex + 1),
       newSceneId,
       ...sceneOrder.slice(originalIndex + 1)
     ];
     
     set((state) => ({
       projects: {
         ...state.projects,
         [projectId]: {
           ...state.projects[projectId],
           scenes: {
             ...state.projects[projectId].scenes,
             [newSceneId]: newScene
           },
           sceneOrder: newOrder
         }
       }
     }));
     
     return newSceneId;
   }
   ```

3. **API Router Addition**:
   ```typescript
   // server/api/routers/scenes.ts
   duplicateScene: protectedProcedure
     .input(z.object({
       projectId: z.string(),
       sceneId: z.string(),
     }))
     .mutation(async ({ ctx, input }) => {
       // Verify ownership
       const project = await ctx.db.query.projects.findFirst({
         where: and(
           eq(projects.id, input.projectId),
           eq(projects.userId, ctx.session.user.id)
         ),
         with: { scenes: true }
       });
       
       if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
       
       const originalScene = project.scenes.find(s => s.id === input.sceneId);
       if (!originalScene) throw new TRPCError({ code: 'NOT_FOUND' });
       
       // Create duplicate
       const newScene = await ctx.db.insert(scenes).values({
         projectId: input.projectId,
         title: `${originalScene.title} (Copy)`,
         code: originalScene.code,
         duration: originalScene.duration,
         thumbnailUrl: originalScene.thumbnailUrl,
       }).returning();
       
       // Update scene order
       await ctx.db.update(projects)
         .set({ 
           sceneOrder: [...project.sceneOrder, newScene[0].id],
           updatedAt: new Date()
         })
         .where(eq(projects.id, input.projectId));
       
       return newScene[0];
     }),
   ```

4. **Optimistic Updates**:
   ```typescript
   // hooks/use-duplicate-scene.ts
   export const useDuplicateScene = () => {
     const utils = api.useContext();
     
     return api.scenes.duplicateScene.useMutation({
       onMutate: async ({ projectId, sceneId }) => {
         // Cancel outgoing refetches
         await utils.projects.getById.cancel({ id: projectId });
         
         // Optimistic update
         const previousData = utils.projects.getById.getData({ id: projectId });
         const newSceneId = videoState.getState().duplicateScene(projectId, sceneId);
         
         return { previousData, newSceneId };
       },
       onError: (err, variables, context) => {
         // Rollback on error
         if (context?.previousData) {
           utils.projects.getById.setData(
             { id: variables.projectId }, 
             context.previousData
           );
         }
       },
       onSettled: (data, error, variables) => {
         // Sync with server state
         utils.projects.getById.invalidate({ id: variables.projectId });
       },
     });
   };
   ```

5. **Smart Naming**:
   ```typescript
   // utils/scene-naming.ts
   export const generateDuplicateName = (originalName: string, existingNames: string[]) => {
     // Handle already numbered copies
     const match = originalName.match(/^(.*?)\s*(?:\((\d+)\))?$/);
     const baseName = match?.[1] || originalName;
     const currentNumber = match?.[2] ? parseInt(match[2]) : 0;
     
     let newNumber = currentNumber + 1;
     let newName = currentNumber === 0 
       ? `${baseName} (Copy)` 
       : `${baseName} (${newNumber})`;
     
     // Ensure unique name
     while (existingNames.includes(newName)) {
       newNumber++;
       newName = `${baseName} (${newNumber})`;
     }
     
     return newName;
   };
   ```

### User Experience Flow:
1. User hovers over scene card
2. Clicks three-dot menu
3. Selects "Duplicate"
4. New scene appears immediately after original
5. Scene title shows " (Copy)" suffix
6. User can immediately edit the duplicate

## Success Metrics

### Technical Metrics:
- Duplication operation completes in <500ms
- Zero data loss during duplication
- Proper scene ordering maintained
- Undo/redo support for duplication

### User Metrics:
- 40% of projects use duplicate feature within first month
- 25% reduction in time to create multi-scene videos
- 15% increase in scenes per project
- 90% success rate (no errors during duplication)

### Workflow Improvements:
- Average time to create similar scene reduced by 80%
- User satisfaction score increased by 10%
- Support tickets about copying scenes eliminated
- Feature discovery rate >60% without tutorial

## Future Enhancements

1. **Bulk Duplication**:
   - Select multiple scenes to duplicate at once
   - Duplicate with smart spacing (e.g., every other position)
   - Pattern-based duplication (duplicate 3x, etc.)

2. **Smart Modifications**:
   - "Duplicate and modify" with AI assistance
   - Template extraction from duplicated scenes
   - Variable placeholders for bulk customization

3. **Cross-Project Duplication**:
   - Copy scenes between projects
   - Scene library for frequent reuse
   - Team scene sharing

4. **Advanced Options**:
   - Duplicate with/without animations
   - Duplicate structure only (no content)
   - Duplicate as template for future use
   - Version history for duplicates

5. **Duplication Intelligence**:
   - Auto-increment numbers in content
   - Smart color variations
   - Suggest modifications based on context
   - Batch find-and-replace in duplicates