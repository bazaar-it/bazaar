import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";
// Don't import actual templates in server code - they contain Remotion components
// import { templateRegistry } from "~/templates/registry";

export interface SelectedTemplate {
  templateId: string;
  templateName: string;
  templateCode: string;
  originalDuration: number;
  narrativeBeat: string;
  customizationHints: {
    replaceText?: Record<string, string>;
    replaceColors?: Record<string, string>;
    replaceImages?: Record<string, string>;
  };
}

export class TemplateSelector {
  private useIntelligentSelection = true; // Feature flag for smart selection
  
  // Map emotional beats to template categories
  private beatToTemplateMap = {
    problem: {
      minimal: ['DarkBGGradientText', 'FadeIn', 'DarkForestBG'],
      dynamic: ['GlitchText', 'MorphingText', 'DrawOn'],
      bold: ['ParticleExplosion', 'GlitchText', 'WaveAnimation'],
    },
    discovery: {
      minimal: ['LogoTemplate', 'FadeIn', 'ScaleIn'],
      dynamic: ['ScaleIn', 'WipeIn', 'SlideIn'],
      bold: ['ParticleExplosion', 'FloatingParticles', 'PulsingCircles'],
    },
    transformation: {
      minimal: ['CarouselText', 'FastText', 'TypingTemplate'],
      dynamic: ['FloatingElements', 'HighlightSweep', 'AppJiggle'],
      bold: ['FloatingParticles', 'AppJiggle', 'DualScreenApp'],
    },
    triumph: {
      minimal: ['GrowthGraph', 'Today1Percent', 'FastText'],
      dynamic: ['TeslaStockGraph', 'GrowthGraph', 'WordFlip'],
      bold: ['TeslaStockGraph', 'ParticleExplosion', 'FloatingElements'],
    },
    invitation: {
      minimal: ['TypingTemplate', 'FadeIn', 'LogoTemplate'],
      dynamic: ['PulsingCircles', 'WordFlip', 'WipeIn'],
      bold: ['PulsingCircles', 'ParticleExplosion', 'FloatingParticles'],
    },
  };
  
  async selectTemplatesForJourney(
    narrativeScenes: HeroJourneyScene[],
    style: 'minimal' | 'dynamic' | 'bold' = 'dynamic',
    brandData?: any // Pass brand data for intelligent selection
  ): Promise<SelectedTemplate[]> {
    const selectedTemplates: SelectedTemplate[] = [];
    const usedTemplates = new Set<string>(); // Track used templates to avoid repetition
    
    for (const scene of narrativeScenes) {
      const template = await this.selectTemplateForBeat(scene, style, brandData, usedTemplates);
      selectedTemplates.push(template);
      usedTemplates.add(template.templateId);
    }
    
    return selectedTemplates;
  }
  
  private async selectTemplateForBeat(
    scene: HeroJourneyScene,
    style: 'minimal' | 'dynamic' | 'bold',
    brandData?: any,
    usedTemplates?: Set<string>
  ): Promise<SelectedTemplate> {
    let templateName: string;
    
    // Try intelligent selection first if enabled
    if (this.useIntelligentSelection && brandData) {
      try {
        // Build a context-aware prompt for template selection
        const selectionPrompt = `${scene.narrative} ${scene.emotionalBeat} ${style} style`;
        
        // Import and use the template matcher
        const { templateMatcher } = await import('~/services/ai/templateMatching.service');
        const matches = await templateMatcher.findBestTemplates(selectionPrompt, 5);
        
        // Filter out already used templates for variety
        const availableMatches = matches.filter(m => !usedTemplates?.has(m.templateId));
        
        if (availableMatches.length > 0) {
          // Pick from top 2 matches randomly for some variety
          const topMatches = availableMatches.slice(0, 2);
          const selected = topMatches[Math.floor(Math.random() * topMatches.length)];
          templateName = selected.templateId;
          
          console.log(`🧠 [TEMPLATE SELECTOR] AI Selected: ${templateName} for "${scene.emotionalBeat}" (score: ${selected.score})`);
          console.log(`   Reasoning: ${selected.reasoning}`);
        } else {
          // Fall back to random selection from mapping
          const templateOptions = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || 
                                 this.beatToTemplateMap.discovery[style];
          
          // Filter out used templates
          const availableOptions = templateOptions.filter((t: string) => !usedTemplates?.has(t));
          const options = availableOptions.length > 0 ? availableOptions : templateOptions;
          
          const randomIndex = Math.floor(Math.random() * options.length);
          templateName = options[randomIndex];
          console.log(`🎲 [TEMPLATE SELECTOR] Random fallback: ${templateName}`);
        }
      } catch (error) {
        console.error('Failed to use intelligent selection:', error);
        // Fall back to random selection
        const templateOptions = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || 
                               this.beatToTemplateMap.discovery[style];
        const randomIndex = Math.floor(Math.random() * templateOptions.length);
        templateName = templateOptions[randomIndex];
      }
    } else {
      // Use random selection from mapping
      const templateOptions = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || 
                             this.beatToTemplateMap.discovery[style];
      
      // Filter out used templates for variety
      const availableOptions = templateOptions.filter((t: string) => !usedTemplates?.has(t));
      const options = availableOptions.length > 0 ? availableOptions : templateOptions;
      
      const randomIndex = Math.floor(Math.random() * options.length);
      templateName = options[randomIndex];
      
      console.log(`🎲 [TEMPLATE SELECTOR] Beat: ${scene.emotionalBeat}, Style: ${style}, Selected: ${templateName} (from ${options.length} options)`);
    }
    
    // For server-side, we'll use the template loader service to get actual code
    // This avoids importing Remotion components in server code
    const { TemplateLoaderService } = await import('~/services/ai/templateLoader.service');
    const loader = new TemplateLoaderService();
    
    // Load the actual template code
    const templateCode = await loader.loadTemplateCode(templateName);
    
    if (!templateCode) {
      // Fallback to a basic template
      console.warn(`Template ${templateName} not found, using fallback`);
      return this.getFallbackTemplate(scene);
    }
    
    // Get duration from the template code (look for durationInFrames)
    const durationMatch = templateCode.match(/durationInFrames[^=]*=\s*(\d+)/);
    const originalDuration = durationMatch ? parseInt(durationMatch[1]) : 150;
    
    return {
      templateId: templateName,
      templateName: templateName,
      templateCode,
      originalDuration,
      narrativeBeat: scene.emotionalBeat,
      customizationHints: {
        replaceText: this.getTextReplacements(scene),
        replaceColors: {}, // Will be filled by customizer
        replaceImages: {}, // Will be filled by customizer
      },
    };
  }
  
  private getTextReplacements(scene: HeroJourneyScene): Record<string, string> {
    const replacements: Record<string, string> = {};
    
    // Map generic text to specific content
    if (scene.narrative) {
      replacements['Your Title Here'] = scene.title;
      replacements['Your text here'] = scene.narrative;
      replacements['Lorem ipsum'] = scene.narrative;
    }
    
    // Add visual elements as text if needed
    scene.visualElements.forEach((element, index) => {
      replacements[`Feature ${index + 1}`] = element;
    });
    
    return replacements;
  }
  
  private getFallbackTemplate(scene: HeroJourneyScene): SelectedTemplate {
    // Basic fallback template
    const fallbackCode = this.generateTemplateCode('FadeIn', scene);
    
    return {
      templateId: 'FadeIn',
      templateName: 'Fade In',
      templateCode: fallbackCode,
      originalDuration: scene.duration,
      narrativeBeat: scene.emotionalBeat,
      customizationHints: {
        replaceText: {
          'Your text here': scene.narrative,
        },
      },
    };
  }
  
  private generateTemplateCode(templateName: string, scene: HeroJourneyScene): string {
    // Generate a basic template code structure
    return `
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const ${templateName}: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 60,
        fontWeight: 700,
        color: '#fff',
        opacity,
        textAlign: 'center',
        padding: 40,
      }}>
        ${scene.narrative}
      </div>
    </AbsoluteFill>
  );
};`;
  }
}