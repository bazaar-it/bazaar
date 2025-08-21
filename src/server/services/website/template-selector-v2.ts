import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";
import { getTemplateMetadata, TEMPLATE_METADATA } from "./template-metadata";
import { TemplateLoaderService } from "~/server/services/ai/templateLoader.service";

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
  // Map emotional beats to template IDs (using actual template registry IDs)
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
    style: 'minimal' | 'dynamic' | 'bold' = 'dynamic'
  ): Promise<SelectedTemplate[]> {
    const selectedTemplates: SelectedTemplate[] = [];
    
    for (const scene of narrativeScenes) {
      const template = await this.selectTemplateForBeat(scene, style);
      selectedTemplates.push(template);
    }
    
    return selectedTemplates;
  }
  
  private async selectTemplateForBeat(
    scene: HeroJourneyScene,
    style: 'minimal' | 'dynamic' | 'bold'
  ): Promise<SelectedTemplate> {
    // Get template options for this emotional beat
    const templateOptions = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || 
                           this.beatToTemplateMap.discovery[style];
    
    const loader = new TemplateLoaderService();
    
    // Try each template option until we find one that exists
    for (const templateId of templateOptions) {
      const templateMeta = getTemplateMetadata(templateId);
      
      if (templateMeta) {
        console.log(`🎨 Selected template ${templateId} for ${scene.emotionalBeat} beat`);
        
        // Load the actual template code
        const templateCode = await loader.loadTemplateCode(templateId);
        
        if (templateCode) {
          return {
            templateId: templateMeta.id,
            templateName: templateMeta.name,
            templateCode,
            originalDuration: templateMeta.duration,
            narrativeBeat: scene.emotionalBeat,
            customizationHints: {
              replaceText: this.getTextReplacements(scene),
              replaceColors: {}, // Will be filled by customizer
              replaceImages: {}, // Will be filled by customizer
            },
          };
        }
      }
    }
    
    // If no template found, use fallback
    console.warn(`No template found for ${scene.emotionalBeat}, using fallback`);
    return this.getFallbackTemplate(scene);
  }
  
  private getTextReplacements(scene: HeroJourneyScene): Record<string, string> {
    const replacements: Record<string, string> = {};
    
    // Map generic text to specific content based on the template patterns
    replacements['Your Title Here'] = scene.title;
    replacements['Your text here'] = scene.narrative;
    replacements['Lorem ipsum'] = scene.narrative;
    replacements['Welcome to'] = scene.title;
    replacements['Get Started'] = 'Learn More';
    replacements['Placeholder Text'] = scene.narrative;
    
    // Add visual elements as feature text
    scene.visualElements.forEach((element, index) => {
      replacements[`Feature ${index + 1}`] = element;
      replacements[`Benefit ${index + 1}`] = element;
      replacements[`Item ${index + 1}`] = element;
    });
    
    return replacements;
  }
  
  private async getFallbackTemplate(scene: HeroJourneyScene): Promise<SelectedTemplate> {
    // Use FadeIn as fallback - it's simple and always works
    const fadeInMeta = getTemplateMetadata('FadeIn');
    const loader = new TemplateLoaderService();
    
    if (fadeInMeta) {
      const templateCode = await loader.loadTemplateCode('FadeIn');
      if (templateCode) {
        return {
          templateId: fadeInMeta.id,
          templateName: fadeInMeta.name,
          templateCode,
          originalDuration: scene.duration,
          narrativeBeat: scene.emotionalBeat,
          customizationHints: {
            replaceText: {
              'Your text here': scene.narrative,
            },
          },
        };
      }
    }
    
    // Ultimate fallback - generate basic code
    const fallbackCode = `
const { AbsoluteFill, interpolate, useCurrentFrame } = window.Remotion;
const React = window.React;

const FallbackTemplate = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return React.createElement(AbsoluteFill, {
    style: {
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  },
    React.createElement('div', {
      style: {
        fontSize: 48,
        fontWeight: 700,
        color: '#ffffff',
        opacity,
        textAlign: 'center',
        padding: 40,
        maxWidth: '80%',
      }
    }, '${scene.narrative}')
  );
};

return FallbackTemplate;`;
    
    return {
      templateId: 'fallback',
      templateName: 'Fallback Template',
      templateCode: fallbackCode,
      originalDuration: scene.duration,
      narrativeBeat: scene.emotionalBeat,
      customizationHints: {
        replaceText: {},
      },
    };
  }
}