/**
 * Scene Generator with Visual Context
 * 
 * This leverages your existing add/edit tools that are "insanely good"
 * at recreating from images, but now with precise context.
 */

import type { 
  UIRebuildSpec, 
  AssetsPack, 
  SceneCodePlan,
  Screenshot,
  ScreenshotSection,
  UILayer
} from './UIRebuildSpec';
import { EnhancedSectionClassifier } from './EnhancedSectionClassifier';

export class SceneGeneratorWithVisualContext {
  
  /**
   * Generate scene using your existing add tool with focused context
   */
  async generateSceneFromSection(
    section: ScreenshotSection,
    rebuildSpec: UIRebuildSpec,
    assetsPack: AssetsPack,
    storyContext: {
      scene: any; // From HeroJourneyV2
      brandColors: string[];
      brandFonts: string[];
    }
  ): Promise<string> {
    
    console.log(`🎬 Generating scene for ${section.type} section`);
    
    // This is the key insight - your add tool works great with images!
    // We just give it better context now
    
    const enhancedPrompt = this.buildEnhancedPrompt(
      section,
      rebuildSpec,
      assetsPack,
      storyContext
    );
    
    // Call your existing add tool with:
    // 1. The cropped section image (focused, not overwhelming)
    // 2. The enhanced prompt with exact positions
    // 3. The assets pack for exact icons/images
    
    const sceneCode = await this.callAddTool({
      image: section.screenshotId, // Cropped section, not full page!
      prompt: enhancedPrompt,
      duration: section.suggestedDurationMs,
      rebuildSpec, // Pass the blueprint
      assetsPack   // Pass the exact assets
    });
    
    return sceneCode;
  }
  
  /**
   * Build enhanced prompt with visual context
   */
  private buildEnhancedPrompt(
    section: ScreenshotSection,
    spec: UIRebuildSpec,
    assets: AssetsPack,
    context: any
  ): string {
    
    return `
    Create motion graphics for this ${section.type} section.
    
    CRITICAL: Use the EXACT layout from the image.
    
    UI ELEMENTS TO ANIMATE:
    ${spec.layers.map(layer => {
      if (layer.kind === 'text') {
        return `- Text at (${layer.box.x}, ${layer.box.y}): "${layer.text}"`;
      }
      if (layer.kind === 'button') {
        return `- Button at (${layer.box.x}, ${layer.box.y}): "${layer.label}"`;
      }
      if (layer.kind === 'card') {
        return `- Card at (${layer.box.x}, ${layer.box.y}), ${layer.box.w}x${layer.box.h}px`;
      }
      return `- ${layer.kind} at (${layer.box.x}, ${layer.box.y})`;
    }).join('\n')}
    
    EXACT POSITIONS (CSS px @ 1920 width):
    ${JSON.stringify(spec.layers.map(l => ({ id: l.id, box: l.box })), null, 2)}
    
    ANIMATIONS TO APPLY:
    ${this.getAnimationInstructions(section.type, context.scene)}
    
    USE THESE EXACT COLORS:
    ${context.brandColors.join(', ')}
    
    USE THESE EXACT FONTS:
    ${context.brandFonts.join(', ')}
    
    AVAILABLE ASSETS:
    - SVG Icons: ${Object.keys(assets.svgs).join(', ')}
    - Images: ${Object.keys(assets.images).join(', ')}
    
    IMPORTANT:
    - Use absolute positioning with the exact coordinates provided
    - Do not change any text content
    - Reference assets by their IDs
    - Total duration: ${section.suggestedDurationMs}ms
    `;
  }
  
  /**
   * Animation instructions based on section type
   */
  private getAnimationInstructions(
    sectionType: string,
    scene: any
  ): string {
    
    const animations: Record<string, string> = {
      hero: `
        1. Fade in headline (0-500ms)
        2. Slide up subheadline (200-700ms)
        3. Scale in CTA button (500-1000ms)
        4. Subtle parallax on background
      `,
      timeline: `
        1. Reveal title with clip animation (0-500ms)
        2. Draw timeline line left to right (300-800ms)
        3. Stagger cards from left to right (500-1500ms)
        4. Fade in card content (800-2000ms)
        5. Pulse progress dots (1500-2000ms)
      `,
      features: `
        1. Title slides in from left (0-400ms)
        2. Feature cards stagger up (300-1200ms)
        3. Icons pop in with scale (600-1500ms)
        4. Stats count up (1000-2000ms)
      `,
      testimonials: `
        1. Quote fades in (0-500ms)
        2. Author slides up (400-900ms)
        3. Rating stars appear one by one (700-1200ms)
      `,
      cta: `
        1. Headline types in (0-800ms)
        2. Button scales in (600-1100ms)
        3. Button pulse animation (1100-2000ms)
      `
    };
    
    return animations[sectionType] || animations.hero || '';
  }
  
  /**
   * Call your existing add tool
   */
  private async callAddTool(params: {
    image: string;
    prompt: string;
    duration: number;
    rebuildSpec: UIRebuildSpec;
    assetsPack: AssetsPack;
  }): Promise<string> {
    
    // This would call your actual add tool
    // Which we know works great with images!
    
    console.log('📸 Calling add tool with focused section image...');
    console.log('📍 Using rebuild spec with', params.rebuildSpec.layers.length, 'layers');
    console.log('🎨 Using assets pack with', Object.keys(params.assetsPack.svgs).length, 'SVGs');
    
    // Your existing add tool implementation
    // return await addTool.generate({...});
    
    // For now, return example Remotion code
    return this.generateExampleRemotionCode(params);
  }
  
  /**
   * Example Remotion code generation
   */
  private generateExampleRemotionCode(params: any): string {
    const { rebuildSpec } = params;
    
    return `
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const ${rebuildSpec.sectionId.replace(/-/g, '')}Scene: React.FC = () => {
  const frame = useCurrentFrame();
  
  ${rebuildSpec.layers.map((layer: UILayer, i: number) => `
  // ${layer.kind} animation
  const ${layer.id}Progress = spring({
    frame: frame - ${i * 10},
    fps: 30,
    config: { damping: 100 }
  });
  `).join('\n')}
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      ${rebuildSpec.layers.map((layer: UILayer) => {
        if (layer.kind === 'text') {
          return `
      <div
        style={{
          position: 'absolute',
          left: ${layer.box.x},
          top: ${layer.box.y},
          width: ${layer.box.w},
          height: ${layer.box.h},
          fontSize: ${layer.style.fontSize},
          fontFamily: '${layer.style.fontFamily}',
          fontWeight: ${layer.style.fontWeight},
          color: '${layer.style.color}',
          opacity: ${layer.id}Progress,
        }}
      >
        ${layer.text}
      </div>`;
        }
        if (layer.kind === 'card') {
          return `
      <div
        style={{
          position: 'absolute',
          left: ${layer.box.x},
          top: ${layer.box.y},
          width: ${layer.box.w},
          height: ${layer.box.h},
          backgroundColor: '${layer.bg}',
          borderRadius: ${layer.radius},
          boxShadow: '${layer.shadow}',
          transform: \`translateY(\${interpolate(
            ${layer.id}Progress,
            [0, 1],
            [50, 0]
          )}px)\`,
          opacity: ${layer.id}Progress,
        }}
      />`;
        }
        return '';
      }).join('\n')}
    </AbsoluteFill>
  );
};`;
  }
}

// Example integration flow
export async function generatePixelPerfectScenes(
  url: string,
  brandJSON: any,
  storyArc: any,
  captureFullPageScreenshot: (url: string) => Promise<{ screenshot: Screenshot; buffer: Buffer; domSnapshot?: any }>
) {
  // 1. Get full screenshot
  const { screenshot: fullScreenshot, buffer: fullScreenshotBuffer, domSnapshot } = await captureFullPageScreenshot(url);
  
  // 2. Two-pass segmentation
  const classifier = new EnhancedSectionClassifier();
  const sections = await classifier.classifyAndCropSections(
    fullScreenshot,
    fullScreenshotBuffer,
    domSnapshot // Optional DOM data
  );
  
  // 3. Extract rebuild specs for each section
  const rebuildSpecs = await Promise.all(
    sections.map(section => 
      classifier.deriveUIRebuildSpec(section, section.screenshotUrl)
    )
  );
  
  // 4. Extract assets
  const assetsPacks = await Promise.all(
    sections.map(section => 
      classifier.extractAssets(section)
    )
  );
  
  // 5. Map story arc scenes to sections
  const generator = new SceneGeneratorWithVisualContext();
  const scenes = await Promise.all(
    storyArc.scenes.map(async (scene: any, i: number) => {
      const section = sections[i]; // Or smart matching
      const spec = rebuildSpecs[i];
      const assets = assetsPacks[i];
      
      // Skip if section not found
      if (!section || !spec || !assets) {
        console.warn(`Missing data for scene ${i}, skipping`);
        return null;
      }
      
      return generator.generateSceneFromSection(
        section,
        spec,
        assets,
        {
          scene,
          brandColors: brandJSON.design.colors.palette,
          brandFonts: [brandJSON.design.typography.primary]
        }
      );
    })
  );
  
  return scenes.filter(scene => scene !== null) as string[];
}