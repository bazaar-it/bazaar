// src/server/services/brain/orchestrator_functions/contextPreparer.ts
// Prepares minimal, tool-specific context

import type { ProjectContext } from './types';
import type {
  AnalyzedIntent,
  AddSceneContext,
  EditSceneContext,
  DeleteSceneContext,
  TimelineUpdate
} from '~/lib/types/api/brain-contracts';
import type { ToolName } from './toolSelector';
import { calculateTimelineUpdates } from '~/lib/utils/timeline';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

class ContextPreparer {
  async prepareToolContext(
    tool: ToolName,
    intent: AnalyzedIntent,
    context: ProjectContext,
    imageUrls?: string[]
  ): Promise<AddSceneContext | EditSceneContext | DeleteSceneContext> {
    switch (tool) {
      case 'addScene':
        return this.prepareAddSceneContext(intent, context, imageUrls);
        
      case 'editScene':
        return this.prepareEditSceneContext(intent, context, imageUrls);
        
      case 'deleteScene':
        return this.prepareDeleteSceneContext(intent, context);
        
      case 'analyzeImage':
        return this.prepareAnalyzeImageContext(imageUrls || []);
        
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }
  
  private async prepareAddSceneContext(
    intent: AnalyzedIntent,
    context: ProjectContext,
    imageUrls?: string[]
  ): Promise<AddSceneContext> {
    // Get previous scene for style consistency
    const lastScene = context.scenes[context.scenes.length - 1];
    
    let previousSceneStyle;
    if (lastScene) {
      // Load the actual scene to extract style
      const scene = await db.query.scenes.findFirst({
        where: eq(scenes.id, lastScene.id)
      });
      
      if (scene) {
        // Extract style information from the scene
        previousSceneStyle = {
          layout: scene.layoutJson || '',
          animations: this.extractAnimations(scene.tsxCode),
          colors: this.extractColors(scene.tsxCode),
          style: context.preferences.style || 'modern'
        };
      }
    }
    
    return {
      projectId: context.projectId,
      prompt: intent.specificChange || 'Create new scene',
      imageUrls,
      previousSceneStyle,
      order: context.scenes.length
    };
  }
  
  private async prepareEditSceneContext(
    intent: AnalyzedIntent,
    context: ProjectContext,
    imageUrls?: string[]
  ): Promise<EditSceneContext> {
    const sceneId = intent.targetSceneId || context.scenes[context.scenes.length - 1]?.id;
    
    if (!sceneId) {
      throw new Error('No scene to edit');
    }
    
    // Load the scene data
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId)
    });
    
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }
    
    // Calculate scene timeline position
    const sceneIndex = context.scenes.findIndex(s => s.id === sceneId);
    const start = context.scenes.slice(0, sceneIndex).reduce((sum, s) => sum + s.duration, 0);
    const end = start + scene.duration;
    
    return {
      sceneId,
      sceneData: {
        tsxCode: scene.tsxCode,
        name: scene.name,
        duration: scene.duration,
        start,
        end
      },
      editType: intent.editType || 'creative',
      prompt: intent.specificChange,
      imageUrls,
      newDuration: intent.durationFrames,
      projectStyle: {
        colors: this.extractColors(scene.tsxCode),
        animations: this.extractAnimations(scene.tsxCode)
      }
    };
  }
  
  private prepareDeleteSceneContext(
    intent: AnalyzedIntent,
    context: ProjectContext
  ): DeleteSceneContext {
    const sceneId = intent.targetSceneId || context.scenes[context.scenes.length - 1]?.id;
    
    if (!sceneId) {
      throw new Error('No scene to delete');
    }
    
    const scene = context.scenes.find(s => s.id === sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }
    
    // Calculate which scenes need timeline adjustment
    const sceneIndex = context.scenes.findIndex(s => s.id === sceneId);
    const deletedDuration = scene.duration;
    
    const affectedScenes = context.scenes
      .slice(sceneIndex + 1) // All scenes after the deleted one
      .map(s => {
        const currentStart = context.scenes
          .slice(0, context.scenes.findIndex(sc => sc.id === s.id))
          .reduce((sum, sc) => sum + sc.duration, 0);
        
        return {
          id: s.id,
          currentStart,
          newStart: currentStart - deletedDuration
        };
      });
    
    return {
      sceneId,
      sceneName: scene.name,
      affectedScenes
    };
  }
  
  // Helper methods for style extraction
  private extractColors(tsxCode: string): string[] {
    const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g;
    const matches = tsxCode.match(colorRegex) || [];
    return [...new Set(matches)]; // Unique colors
  }
  
  private extractAnimations(tsxCode: string): string[] {
    const animations = [];
    if (tsxCode.includes('interpolate')) animations.push('interpolate');
    if (tsxCode.includes('spring')) animations.push('spring');
    if (tsxCode.includes('fadeIn')) animations.push('fadeIn');
    if (tsxCode.includes('scale')) animations.push('scale');
    if (tsxCode.includes('rotate')) animations.push('rotate');
    return animations;
  }
  
  // Generate human-readable reasoning for the tool
  generateReasoning(tool: ToolName, intent: AnalyzedIntent, context: ProjectContext): string {
    switch (tool) {
      case 'addScene':
        if (context.scenes.length === 0) {
          return 'Creating the first scene for your video';
        }
        return `Adding scene ${context.scenes.length + 1} to your video`;
        
      case 'editScene':
        if (intent.editType === 'surgical' && intent.specificChange) {
          return intent.specificChange;
        }
        if (intent.editType === 'duration') {
          return `Changing scene duration to ${intent.durationSeconds} seconds`;
        }
        return `Applying ${intent.editType} changes to the scene`;
        
      case 'deleteScene':
        return `Removing scene from your video`;
        
      case 'analyzeImage':
        return 'Analyzing uploaded images for scene creation';
        
      default:
        return 'Processing your request';
    }
  }
}

// Export singleton instance
export const contextPreparer = new ContextPreparer();