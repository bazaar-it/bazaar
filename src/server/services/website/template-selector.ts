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
    
    // Pick the first available template (you could randomize this)
    const templateName = templateOptions[0];
    
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