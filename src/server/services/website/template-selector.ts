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
    
    // Try brand-aware selection first
    if (this.useBrandAwareSelection && brandData) {
      const brandAwareTemplate = await this.selectBrandAwareTemplate(scene, style, brandData, usedTemplates);
      if (brandAwareTemplate) {
        return this.loadTemplate(brandAwareTemplate, scene);
      }
    }
    
    // Try intelligent selection if brand-aware didn't work
    if (this.useIntelligentSelection) {
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
    
    return this.loadTemplate(templateName, scene);
  }
  
  private async loadTemplate(templateName: string, scene: HeroJourneyScene): Promise<SelectedTemplate> {
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
  
  private async selectBrandAwareTemplate(
    scene: HeroJourneyScene,
    style: 'minimal' | 'dynamic' | 'bold',
    brandData: any,
    usedTemplates?: Set<string>
  ): Promise<string | null> {
    try {
      // Extract brand context
      const brandContext = {
        archetype: brandData?.brand?.identity?.archetype || null,
        industry: this.inferIndustry(brandData),
        audience: this.extractFirstAudience(brandData),
        hasMetrics: brandData?.socialProof?.stats?.length > 0,
        primaryColor: brandData?.brand?.visual?.colors?.primary,
        emotionalBeat: scene.emotionalBeat
      };
      
      // Get all templates that match the emotional beat
      const candidates = Object.values(templateMetadata).filter(template => {
        // Must have enhanced metadata
        if (!template.emotionalBeats) return false;
        
        // Must match emotional beat
        if (!template.emotionalBeats.includes(scene.emotionalBeat)) return false;
        
        // Must not be already used
        if (usedTemplates?.has(template.id)) return false;
        
        // Must match style preference
        if (style === 'minimal' && template.visualComplexity && template.visualComplexity > 2) return false;
        if (style === 'bold' && template.visualComplexity && template.visualComplexity < 3) return false;
        
        return true;
      });
      
      if (candidates.length === 0) return null;
      
      // Score each candidate based on brand fit
      const scored = candidates.map(template => ({
        id: template.id,
        score: this.scoreTemplateFit(template, brandContext),
        template
      }));
      
      // Sort by score and pick from top 3 for variety
      const sorted = scored.sort((a, b) => b.score - a.score);
      const topChoices = sorted.slice(0, 3);
      
      if (topChoices.length > 0) {
        const selected = topChoices[Math.floor(Math.random() * topChoices.length)];
        
        console.log(`🎯 [BRAND-AWARE] Selected: ${selected.id} for "${scene.emotionalBeat}"`);
        console.log(`   Score: ${selected.score}/100`);
        console.log(`   Industry match: ${brandContext.industry} → ${selected.template.industries?.join(', ')}`); 
        console.log(`   Archetype match: ${brandContext.archetype} → ${selected.template.brandArchetypes?.join(', ')}`);
        
        return selected.id;
      }
    } catch (error) {
      console.error('[BRAND-AWARE] Selection error:', error);
    }
    
    return null;
  }
  
  private scoreTemplateFit(template: TemplateMetadata, brandContext: any): number {
    let score = 0;
    
    // Industry match (0-30 points)
    if (template.industries && brandContext.industry) {
      if (template.industries.includes(brandContext.industry)) {
        score += 30;
      } else if (template.industries.includes('general')) {
        score += 10;
      }
    }
    
    // Brand archetype match (0-25 points)
    if (template.brandArchetypes && brandContext.archetype) {
      if (template.brandArchetypes.includes(brandContext.archetype)) {
        score += 25;
      }
    }
    
    // Target audience match (0-20 points)
    if (template.targetAudiences && brandContext.audience) {
      if (template.targetAudiences.includes(brandContext.audience)) {
        score += 20;
      } else if (template.targetAudiences.includes('general')) {
        score += 8;
      }
    }
    
    // Data compatibility (0-15 points)
    if (brandContext.hasMetrics && template.dataFriendly) {
      score += 15;
    }
    
    // Visual style bonus (0-10 points)
    // Prefer templates marked as adaptable for color compatibility
    if (template.colorCompatibility === 'adaptable') {
      score += 10;
    } else if (brandContext.primaryColor) {
      // Check if template color scheme matches brand
      const isDarkBrand = this.isColorDark(brandContext.primaryColor);
      if ((isDarkBrand && template.colorCompatibility === 'dark') ||
          (!isDarkBrand && template.colorCompatibility === 'light')) {
        score += 5;
      }
    }
    
    return score;
  }
  
  private inferIndustry(brandData: any): string {
    // Try to infer industry from brand data
    const productCategory = brandData?.product?.positioning?.category?.toLowerCase() || '';
    const headline = brandData?.headline?.toLowerCase() || '';
    const features = brandData?.features || [];
    
    // Check for specific industry keywords
    if (productCategory.includes('financ') || headline.includes('payment') || headline.includes('expense')) {
      return 'fintech';
    }
    if (productCategory.includes('develop') || headline.includes('code') || headline.includes('api')) {
      return 'developer-tools';
    }
    if (productCategory.includes('health') || headline.includes('medical')) {
      return 'healthcare';
    }
    if (productCategory.includes('educat') || headline.includes('learn')) {
      return 'education';
    }
    if (productCategory.includes('commerce') || headline.includes('shop') || headline.includes('buy')) {
      return 'ecommerce';
    }
    if (features.some((f: any) => f.title?.toLowerCase().includes('analytic') || f.title?.toLowerCase().includes('dashboard'))) {
      return 'saas';
    }
    
    return 'general';
  }
  
  private extractFirstAudience(brandData: any): string {
    const audiences = brandData?.product?.targetAudience || [];
    if (audiences.length === 0) return 'general';
    
    const firstAudience = audiences[0].toLowerCase();
    
    // Map to our audience roles
    if (firstAudience.includes('cfo') || firstAudience.includes('executive')) return 'executive';
    if (firstAudience.includes('developer') || firstAudience.includes('engineer')) return 'developer';
    if (firstAudience.includes('designer')) return 'designer';
    if (firstAudience.includes('market')) return 'marketer';
    if (firstAudience.includes('founder') || firstAudience.includes('entrepreneur')) return 'founder';
    if (firstAudience.includes('student')) return 'student';
    if (firstAudience.includes('investor')) return 'investor';
    
    return 'general';
  }
  
  private isColorDark(hexColor: string): boolean {
    // Simple luminance check
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
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