/**
 * AI-Powered Template Customizer
 * Uses the Edit tool to intelligently modify templates with brand data
 */

import type { SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import type { SelectedTemplate } from "./template-selector";
import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";
import { toolsLogger } from '~/lib/utils/logger';

export interface CustomizedScene {
  name: string;
  code: string;
  duration: number;
}

export interface TemplateCustomizationInput {
  templates: SelectedTemplate[];
  brandStyle: any; // Will be created from SimplifiedBrandData
  websiteData: SimplifiedBrandData;
  narrativeScenes: HeroJourneyScene[];
}

export class TemplateCustomizerAI {
  async customizeTemplates(input: TemplateCustomizationInput): Promise<CustomizedScene[]> {
    toolsLogger.info('🤖 [AI CUSTOMIZER] Customizing templates with brand data');
    
    const customizedScenes: CustomizedScene[] = [];
    
    for (let i = 0; i < input.templates.length; i++) {
      const template = input.templates[i];
      const narrativeScene = input.narrativeScenes[i];
      
      if (!template || !narrativeScene) {
        toolsLogger.warn(`🤖 [AI CUSTOMIZER] Missing template or narrative scene at index ${i}`);
        continue;
      }
      
      toolsLogger.debug(`🤖 [AI CUSTOMIZER] Customizing template: ${template.templateId}`);
      
      const customizedCode = await this.customizeWithAI(
        template.templateCode,
        input.brandStyle,
        input.websiteData,
        narrativeScene,
        template
      );
      
      customizedScenes.push({
        name: narrativeScene.title,
        code: customizedCode,
        duration: narrativeScene.duration
      });
    }
    
    return customizedScenes;
  }

  async customizeTemplatesStreaming(
    input: TemplateCustomizationInput,
    onSceneComplete?: (scene: CustomizedScene, index: number) => Promise<void>
  ): Promise<CustomizedScene[]> {
    toolsLogger.info('🤖 [AI CUSTOMIZER] Starting streaming customization');
    
    const customizedScenes: CustomizedScene[] = [];
    
    for (let i = 0; i < input.templates.length; i++) {
      const template = input.templates[i];
      const narrativeScene = input.narrativeScenes[i];
      
      if (!template || !narrativeScene) {
        toolsLogger.warn(`🤖 [AI CUSTOMIZER] Missing template or narrative scene at index ${i}`);
        continue;
      }
      
      toolsLogger.debug(`🤖 [AI CUSTOMIZER] Processing scene ${i + 1}/${input.templates.length}: ${narrativeScene.title}`);
      
      // Generate the scene (reuse existing AI logic)
      const customizedCode = await this.customizeWithAI(
        template.templateCode,
        input.brandStyle,
        input.websiteData,
        narrativeScene,
        template
      );
      
      const scene: CustomizedScene = {
        name: narrativeScene.title,
        code: customizedCode,
        duration: narrativeScene.duration
      };
      
      customizedScenes.push(scene);
      
      // ✨ NEW: Stream callback - save scene immediately
      if (onSceneComplete) {
        await onSceneComplete(scene, i);
      }
    }
    
    return customizedScenes;
  }
  
  private async customizeWithAI(
    templateCode: string,
    brandStyle: any,
    websiteData: SimplifiedBrandData,
    narrativeScene: HeroJourneyScene,
    template: SelectedTemplate
  ): Promise<string> {
    
    // Build comprehensive edit prompt with ALL brand data as JSON
    const brandDataJson = JSON.stringify({
      brand: websiteData.brand,
      product: websiteData.product,
      socialProof: websiteData.socialProof, // Note: correct property name
      ctas: websiteData.ctas,
      layoutMotion: websiteData.layoutMotion
    }, null, 2);
    
    const editPrompt = `Transform this template for ${websiteData.page.title} with the following requirements:

COMPLETE BRAND DATA JSON:
${brandDataJson}

BRAND STYLE:
- Company: ${websiteData.page.title}
- Primary Color: ${brandStyle.colors.primary}
- Secondary Color: ${brandStyle.colors.secondary}
- Accent Colors: ${brandStyle.colors.accent}, ${brandStyle.colors.light}
- Primary Font: ${brandStyle.typography.primaryFont}
- Secondary Font: ${brandStyle.typography.headingFont || brandStyle.typography.primaryFont}
- Animation Style: ${brandStyle.animation.style}
- Button Radius: ${websiteData.brand?.buttons?.radius || '8px'}
- Shadow Style: ${websiteData.brand?.shadows?.md || '0 4px 6px rgba(0,0,0,0.1)'}

NARRATIVE CONTEXT:
- Scene Title: ${narrativeScene.title}
- Narrative: ${narrativeScene.narrative}
- Emotional Beat: ${narrativeScene.emotionalBeat}
- Visual Elements: ${narrativeScene.visualElements.join(', ')}

PRODUCT INFO:
- Headline: ${websiteData.product?.value_prop?.headline || 'Welcome'}
- Subhead: ${websiteData.product?.value_prop?.subhead || ''}
- Problem: ${websiteData.product?.problem || ''}
- Features: ${websiteData.product?.features?.map((f: any) => f.title).join(', ') || ''}
- CTAs: ${websiteData.ctas?.map((c: any) => c.label).join(', ') || 'Get Started'}

SOCIAL PROOF:
- Users: ${websiteData.socialProof?.stats?.users || '1000+'}
- Rating: ${websiteData.socialProof?.stats?.rating || '5.0'}

CUSTOMIZATION REQUIREMENTS:
1. Replace ALL placeholder colors with brand colors
2. Replace ALL fonts with brand fonts
3. Update ALL text content to match the narrative and product info
4. Adjust animation timing/easing to match the brand's animation style (${brandStyle.animation.style})
5. For "${narrativeScene.emotionalBeat}" beat: ${this.getEmotionalBeatGuidance(narrativeScene.emotionalBeat)}
6. Ensure the scene duration is exactly ${narrativeScene.duration} frames
7. Add brand-specific visual elements where appropriate
8. DO NOT change the core structure or imports of the component
9. Keep all Remotion hooks and APIs intact
10. Ensure the component name remains the same

Return ONLY the modified code, no explanations.`;

    try {
      // Use the Edit tool instead of direct OpenAI call
      const { EditTool } = await import('~/tools/edit/edit');
      const editTool = new EditTool();
      const editInput: any = {
        tsxCode: templateCode,
        userPrompt: editPrompt,
        sceneId: template.templateId,
        projectId: 'template-customization'
      };
      
      toolsLogger.debug('🤖 [AI CUSTOMIZER] Using Edit tool with complete brand JSON');
      const result = await editTool.run(editInput);
      
      if (result.success && result.data?.tsxCode) {
        toolsLogger.debug('🤖 [AI CUSTOMIZER] Successfully customized with Edit tool');
        return result.data.tsxCode;
      } else {
        toolsLogger.error('🤖 [AI CUSTOMIZER] Edit tool failed', undefined, { error: result.error });
        // Fallback to basic replacement
        return this.basicCustomization(templateCode, brandStyle, websiteData, narrativeScene);
      }
      
    } catch (error: any) {
      toolsLogger.error('🤖 [AI CUSTOMIZER] Error using Edit tool', error);
      // Fallback to basic replacement if error occurs
      return this.basicCustomization(templateCode, brandStyle, websiteData, narrativeScene);
    }
  }
  
  private getEmotionalBeatGuidance(beat: string): string {
    const guidance: Record<string, string> = {
      'problem': 'Use darker tones, slower animations, create tension and unease',
      'tension': 'Build anticipation, use contrasting colors, accelerating pace',
      'discovery': 'Bright reveal, energetic entrance, hopeful colors',
      'transformation': 'Dynamic transitions, multiple elements, showcase features',
      'triumph': 'Celebratory animations, success metrics, social proof',
      'invitation': 'Clear CTA, inviting pulse effects, accessible design'
    };
    return guidance[beat] || 'Match the emotional tone of the scene';
  }
  
  private basicCustomization(
    code: string,
    brandStyle: any,
    websiteData: SimplifiedBrandData,
    narrativeScene: HeroJourneyScene
  ): string {
    // Fallback to basic string replacement if AI fails
    let result = code;
    
    // Replace colors
    result = result.replace(/#[0-9A-Fa-f]{6}/g, (match: string) => {
      if (match === '#000000' || match === '#1a1a1a') return brandStyle.colors.primary;
      if (match === '#ffffff' || match === '#f5f5f5') return brandStyle.colors.secondary;
      if (match === '#ff0000' || match === '#e74c3c') return brandStyle.colors.accent;
      if (match === '#00ff00' || match === '#2ecc71') return brandStyle.colors.light;
      return match;
    });
    
    // Replace fonts
    result = result.replace(/fontFamily:\s*['"]([^'"]+)['"]/g, 
      `fontFamily: '${brandStyle.typography.primaryFont}'`);
    
    // Replace text content
    const contentReplacements = [
      { from: /Your Title Here/gi, to: narrativeScene.title },
      { from: /Your text here/gi, to: narrativeScene.narrative },
      { from: /Welcome to our platform/gi, to: websiteData.product?.value_prop?.headline || 'Welcome' },
      { from: /Get Started/gi, to: websiteData.ctas?.[0]?.label || 'Get Started' },
    ];
    
    contentReplacements.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });
    
    return result;
  }
}