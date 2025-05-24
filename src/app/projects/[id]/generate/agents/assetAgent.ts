import type { AssetAgent } from './interfaces';
import type { Asset, Storyboard } from '../types/storyboard';

/**
 * AssetAgent - Responsible for identifying assets needed for the video
 * 
 * Note: This agent now receives pre-identified assets from the orchestrator
 * which handles the tRPC calls to the server-side LLM services
 */
export class AIAssetAgent implements AssetAgent {
  /**
   * Identify assets needed for the storyboard
   * This method now returns fallback assets and expects the orchestrator
   * to provide the actual LLM-identified assets
   */
  async identifyAssets(storyboard: Storyboard): Promise<Asset[]> {
    // Return fallback assets - the orchestrator will replace these with LLM-identified ones
    return this.getFallbackAssets(storyboard);
  }
  
  /**
   * Get fallback assets if AI identification fails
   */
  private getFallbackAssets(storyboard: Storyboard): Asset[] {
    const assets: Asset[] = [];
    
    // Add some basic assets based on the scenes
    if (storyboard.scenes) {
      storyboard.scenes.forEach((scene, index) => {
        // Add a background asset for each scene
        assets.push({
          id: `background-${scene.id || index}`,
          type: 'image',
          metadata: {
            alt: `Background for ${scene.name}`,
            purpose: 'background',
            sceneId: scene.id || `scene-${index}`
          }
        });
      });
    }
    
    return assets;
  }
} 