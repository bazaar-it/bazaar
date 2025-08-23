import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";
import { getTemplateMetadata, TEMPLATE_METADATA } from "./template-metadata";
import { TemplateLoaderService } from "~/server/services/ai/templateLoader.service";
import type { SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import { toolsLogger } from '~/lib/utils/logger';

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

interface BrandContext {
  archetype: 'innovator' | 'protector' | 'sophisticate' | 'everyman' | 'professional';
  industry: 'fintech' | 'design' | 'developer-tools' | 'ecommerce' | 'saas' | 'other';
  colorScheme: 'light' | 'dark' | 'colorful' | 'monochrome';
  hasDataFocus: boolean;
  isAppProduct: boolean;
  voiceTone: string;
}

export class TemplateSelector {
  // Map emotional beats to template IDs (using actual template registry IDs)
  private beatToTemplateMap = {
    problem: {
      minimal: ['DarkBGGradientText', 'FadeIn', 'DarkForestBG'],
      dynamic: ['GlitchText', 'MorphingText', 'DrawOn'],
      bold: ['ParticleExplosion', 'GlitchText', 'WaveAnimation'],
    },
    tension: {
      minimal: ['DarkBGGradientText', 'MorphingText', 'DrawOn'],
      dynamic: ['GlitchText', 'WaveAnimation', 'MorphingText'],
      bold: ['ParticleExplosion', 'WaveAnimation', 'GlitchText'],
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
    brandData?: SimplifiedBrandData
  ): Promise<SelectedTemplate[]> {
    const selectedTemplates: SelectedTemplate[] = [];
    
    // Analyze brand context for intelligent selection
    const brandContext = brandData ? this.analyzeBrandContext(brandData) : null;
    
    toolsLogger.debug('🎨 [TEMPLATE SELECTOR] Brand context', { brandContext });
    
    for (const scene of narrativeScenes) {
      const template = await this.selectTemplateForBeat(scene, style, brandContext);
      selectedTemplates.push(template);
    }
    
    return selectedTemplates;
  }
  
  private async selectTemplateForBeat(
    scene: HeroJourneyScene,
    style: 'minimal' | 'dynamic' | 'bold',
    brandContext?: BrandContext | null
  ): Promise<SelectedTemplate> {
    // Get template options for this emotional beat
    let templateOptions = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || 
                         this.beatToTemplateMap.discovery[style];
    
    // Apply brand-aware filtering if we have brand context
    if (brandContext) {
      templateOptions = this.applyBrandFiltering(templateOptions, brandContext, scene);
      toolsLogger.debug(`🎨 [TEMPLATE SELECTOR] Filtered templates for ${scene.emotionalBeat} (${brandContext.archetype})`, { templateOptions });
    }
    
    const loader = new TemplateLoaderService();
    
    // Try each template option until we find one that exists
    for (const templateId of templateOptions) {
      const templateMeta = getTemplateMetadata(templateId);
      
      if (templateMeta) {
        toolsLogger.debug(`🎨 Selected template ${templateId} for ${scene.emotionalBeat} beat`);
        
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
  
  // Brand intelligence methods
  private analyzeBrandContext(brandData: SimplifiedBrandData): BrandContext {
    return {
      archetype: this.inferArchetype(brandData),
      industry: this.classifyIndustry(brandData),
      colorScheme: this.analyzeColorScheme(brandData),
      hasDataFocus: this.detectDataFocus(brandData),
      isAppProduct: this.detectAppProduct(brandData),
      voiceTone: brandData.brand?.voice?.tone || 'professional'
    };
  }
  
  private inferArchetype(brandData: SimplifiedBrandData): BrandContext['archetype'] {
    const headline = brandData.product?.value_prop?.headline?.toLowerCase() || '';
    const features = brandData.product?.features || [];
    const ctas = brandData.ctas || [];
    
    // Innovation indicators
    if (headline.includes('future') || headline.includes('next-gen') || headline.includes('ai') ||
        features.some(f => f.title?.toLowerCase().includes('ai'))) {
      return 'innovator';
    }
    
    // Security/reliability indicators  
    if (headline.includes('secure') || headline.includes('trusted') || headline.includes('reliable') ||
        features.some(f => f.title?.toLowerCase().includes('security'))) {
      return 'protector';
    }
    
    // Premium/quality indicators
    if (headline.includes('premium') || headline.includes('professional') || headline.includes('enterprise')) {
      return 'sophisticate';
    }
    
    // Community/accessibility indicators
    if (headline.includes('everyone') || headline.includes('simple') || headline.includes('easy') ||
        ctas.some(c => c.label?.toLowerCase().includes('join'))) {
      return 'everyman';
    }
    
    return 'professional';
  }
  
  private classifyIndustry(brandData: SimplifiedBrandData): BrandContext['industry'] {
    const content = [
      brandData.product?.value_prop?.headline,
      brandData.product?.value_prop?.subhead,
      brandData.product?.features?.map(f => f.title).join(' ')
    ].join(' ').toLowerCase();
    
    if (content.includes('payment') || content.includes('finance') || 
        content.includes('expense') || content.includes('banking') || content.includes('money')) {
      return 'fintech';
    }
    
    if (content.includes('design') || content.includes('creative') || 
        content.includes('visual') || content.includes('brand')) {
      return 'design';
    }
    
    if (content.includes('developer') || content.includes('api') || 
        content.includes('code') || content.includes('integration')) {
      return 'developer-tools';
    }
    
    if (content.includes('ecommerce') || content.includes('store') || 
        content.includes('product') || content.includes('retail')) {
      return 'ecommerce';
    }
    
    return 'saas';
  }
  
  private analyzeColorScheme(brandData: SimplifiedBrandData): BrandContext['colorScheme'] {
    const primaryColor = brandData.brand?.colors?.primary;
    if (!primaryColor) return 'monochrome';
    
    // Simple brightness detection for light/dark
    if (primaryColor.includes('#')) {
      const hex = primaryColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      return brightness > 128 ? 'light' : 'dark';
    }
    
    return 'colorful';
  }
  
  private detectDataFocus(brandData: SimplifiedBrandData): boolean {
    const hasStats = brandData.social_proof && Object.keys(brandData.social_proof).length > 0;
    const hasMetrics = brandData.product?.features?.some(f => 
      f.title?.toLowerCase().includes('analytic') || 
      f.title?.toLowerCase().includes('metric') ||
      f.title?.toLowerCase().includes('data')
    );
    
    return hasStats || hasMetrics || false;
  }
  
  private detectAppProduct(brandData: SimplifiedBrandData): boolean {
    const content = [
      brandData.product?.value_prop?.headline,
      brandData.product?.features?.map(f => f.title).join(' ')
    ].join(' ').toLowerCase();
    
    return content.includes('app') || content.includes('mobile') || content.includes('ios') || content.includes('android');
  }
  
  private applyBrandFiltering(
    templateOptions: string[], 
    brandContext: BrandContext, 
    scene: HeroJourneyScene
  ): string[] {
    let filteredTemplates = [...templateOptions];
    
    // Archetype-based filtering
    const archetypePreferences = {
      'innovator': {
        prefer: ['Particle', 'Glitch', 'Floating', 'Morphing'],
        avoid: ['Basic', 'Simple', 'Plain']
      },
      'protector': {
        prefer: ['Fade', 'Scale', 'Logo', 'Fast'],
        avoid: ['Glitch', 'Particle', 'Chaos']
      },
      'sophisticate': {
        prefer: ['Gradient', 'Highlight', 'Wipe', 'Professional'],
        avoid: ['Jiggle', 'Playful', 'Cartoon']
      },
      'everyman': {
        prefer: ['Carousel', 'Slide', 'Typing', 'Simple'],
        avoid: ['Complex', 'Technical', 'Advanced']
      },
      'professional': {
        prefer: ['Fast', 'Scale', 'Fade', 'Growth'],
        avoid: ['Extreme', 'Playful', 'Whimsical']
      }
    };
    
    const preferences = archetypePreferences[brandContext.archetype];
    
    // Prioritize templates that match archetype preferences
    const preferred = filteredTemplates.filter(template => 
      preferences.prefer.some(pref => template.includes(pref))
    );
    
    const nonPreferred = filteredTemplates.filter(template => 
      !preferences.prefer.some(pref => template.includes(pref)) &&
      !preferences.avoid.some(avoid => template.includes(avoid))
    );
    
    // Industry-specific filtering
    if (brandContext.industry === 'fintech' && brandContext.hasDataFocus) {
      // Prioritize data visualization templates for fintech
      const dataTemplates = filteredTemplates.filter(template => 
        template.includes('Graph') || template.includes('Chart') || template.includes('Data')
      );
      if (dataTemplates.length > 0 && scene.emotionalBeat === 'triumph') {
        return dataTemplates;
      }
    }
    
    if (brandContext.isAppProduct) {
      // Prioritize app-focused templates
      const appTemplates = filteredTemplates.filter(template => 
        template.includes('App') || template.includes('Mobile')
      );
      if (appTemplates.length > 0) {
        return [...appTemplates, ...preferred, ...nonPreferred];
      }
    }
    
    // Return reordered templates: preferred first, then non-preferred
    const result = [...preferred, ...nonPreferred];
    return result.length > 0 ? result : templateOptions; // Fallback to original if filtering removes all
  }
}