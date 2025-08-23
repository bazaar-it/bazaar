import type { ExtractedBrandDataV4 } from "~/tools/webAnalysis/WebAnalysisAgentV4";
import type { FormattedBrandStyle } from "./brand-formatter";
import type { SelectedTemplate } from "./template-selector";
import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";

export interface CustomizedScene {
  name: string;
  code: string;
  duration: number;
}

export interface CustomizationOptions {
  templates: SelectedTemplate[];
  brandStyle: FormattedBrandStyle;
  websiteData: ExtractedBrandDataV4; // Use V4 data structure
  narrativeScenes: HeroJourneyScene[];
}

export class TemplateCustomizer {
  async customizeTemplates(options: CustomizationOptions): Promise<CustomizedScene[]> {
    const { templates, brandStyle, websiteData, narrativeScenes } = options;
    const customizedScenes: CustomizedScene[] = [];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const narrativeScene = narrativeScenes[i];
      
      if (!template || !narrativeScene) {
        continue;
      }
      
      const customizedCode = this.customizeTemplateCode(
        template.templateCode,
        brandStyle,
        websiteData,
        narrativeScene,
        template
      );
      
      customizedScenes.push({
        name: `${narrativeScene.title}_${i}`,
        code: customizedCode,
        duration: narrativeScene.duration,
      });
    }
    
    return customizedScenes;
  }
  
  private customizeTemplateCode(
    templateCode: string,
    brandStyle: FormattedBrandStyle,
    websiteData: ExtractedBrandDataV4,
    narrativeScene: HeroJourneyScene,
    template: SelectedTemplate
  ): string {
    let customizedCode = templateCode;
    
    // 1. Replace colors with brand colors
    customizedCode = this.replaceBrandColors(customizedCode, brandStyle);
    
    // 2. Replace fonts with brand fonts
    customizedCode = this.replaceBrandFonts(customizedCode, brandStyle);
    
    // 3. Replace placeholder text with actual content
    customizedCode = this.replaceContent(customizedCode, websiteData, narrativeScene, template);
    
    // 4. Adjust animations based on brand style
    customizedCode = this.adjustAnimations(customizedCode, brandStyle, narrativeScene.emotionalBeat);
    
    // 5. Add brand-specific styling
    customizedCode = this.addBrandStyling(customizedCode, brandStyle);
    
    return customizedCode;
  }
  
  private replaceBrandColors(code: string, brandStyle: FormattedBrandStyle): string {
    // Color replacement map
    const colorReplacements = [
      // Common color codes to replace
      { from: /#000000/gi, to: brandStyle.colors.dark },
      { from: /#000/gi, to: brandStyle.colors.dark },
      { from: /#ffffff/gi, to: brandStyle.colors.light },
      { from: /#fff/gi, to: brandStyle.colors.light },
      { from: /#007bff/gi, to: brandStyle.colors.primary },
      { from: /#0066ff/gi, to: brandStyle.colors.primary },
      { from: /#ff0000/gi, to: brandStyle.colors.accent },
      { from: /#00ff00/gi, to: brandStyle.colors.secondary },
      
      // Color names
      { from: /color:\s*['"]?black['"]?/gi, to: `color: '${brandStyle.colors.dark}'` },
      { from: /color:\s*['"]?white['"]?/gi, to: `color: '${brandStyle.colors.light}'` },
      { from: /backgroundColor:\s*['"]?black['"]?/gi, to: `backgroundColor: '${brandStyle.colors.dark}'` },
      { from: /backgroundColor:\s*['"]?white['"]?/gi, to: `backgroundColor: '${brandStyle.colors.light}'` },
      
      // Gradient replacements
      { from: /linear-gradient\([^)]*\)/gi, to: brandStyle.colors.gradient || `linear-gradient(135deg, ${brandStyle.colors.primary}, ${brandStyle.colors.secondary})` },
    ];
    
    let result = code;
    for (const replacement of colorReplacements) {
      result = result.replace(replacement.from, replacement.to);
    }
    
    return result;
  }
  
  private replaceBrandFonts(code: string, brandStyle: FormattedBrandStyle): string {
    // Font replacement patterns
    const fontReplacements = [
      // Common font families
      { from: /fontFamily:\s*['"]Inter['"]?/gi, to: `fontFamily: '${brandStyle.typography.primaryFont}'` },
      { from: /fontFamily:\s*['"]Helvetica['"]?/gi, to: `fontFamily: '${brandStyle.typography.primaryFont}'` },
      { from: /fontFamily:\s*['"]Arial['"]?/gi, to: `fontFamily: '${brandStyle.typography.primaryFont}'` },
      { from: /font-family:\s*['"]?sans-serif['"]?/gi, to: `fontFamily: '${brandStyle.typography.primaryFont}'` },
      
      // Font sizes
      { from: /fontSize:\s*72/gi, to: `fontSize: ${parseInt(brandStyle.typography.fontSize.hero)}` },
      { from: /fontSize:\s*60/gi, to: `fontSize: ${parseInt(brandStyle.typography.fontSize.hero)}` },
      { from: /fontSize:\s*48/gi, to: `fontSize: ${parseInt(brandStyle.typography.fontSize.heading)}` },
      { from: /fontSize:\s*24/gi, to: `fontSize: ${parseInt(brandStyle.typography.fontSize.body) * 1.5}` },
      { from: /fontSize:\s*16/gi, to: `fontSize: ${parseInt(brandStyle.typography.fontSize.body)}` },
    ];
    
    let result = code;
    for (const replacement of fontReplacements) {
      result = result.replace(replacement.from, replacement.to);
    }
    
    return result;
  }
  
  private replaceContent(
    code: string,
    websiteData: ExtractedBrandDataV4,
    narrativeScene: HeroJourneyScene,
    template: SelectedTemplate
  ): string {
    let result = code;
    
    // Replace placeholder texts - handle V2 data structure
    const contentReplacements = [
      { from: /Your Title Here/gi, to: narrativeScene.title },
      { from: /Your text here/gi, to: narrativeScene.narrative },
      { from: /Lorem ipsum.*/gi, to: narrativeScene.narrative },
      { from: /Welcome to our platform/gi, to: websiteData.product?.value_prop?.headline || websiteData.brand?.identity?.name || 'Welcome' },
      { from: /Get Started/gi, to: websiteData.content?.ctas?.[0]?.label || 'Get Started' },
      { from: /Learn More/gi, to: websiteData.content?.ctas?.[1]?.label || websiteData.content?.ctas?.[0]?.label || 'Learn More' },
    ];
    
    // Add visual elements as text
    narrativeScene.visualElements.forEach((element, index) => {
      contentReplacements.push({
        from: new RegExp(`Feature ${index + 1}`, 'gi'),
        to: element,
      });
    });
    
    // Add specific content based on emotional beat
    switch (narrativeScene.emotionalBeat) {
      case 'problem':
        result = result.replace(/The Old Way/gi, websiteData.product?.problem || 'The challenge');
        break;
      case 'discovery':
        result = result.replace(/Introducing/gi, `Introducing ${websiteData.brand?.identity?.name || 'Our Solution'}`);
        break;
      case 'transformation':
        // Add features
        (websiteData.product?.features || []).slice(0, 3).forEach((feature: any, index: number) => {
          result = result.replace(
            new RegExp(`Benefit ${index + 1}`, 'gi'),
            feature.title || feature.name
          );
        });
        break;
      case 'triumph':
        // Add social proof
        if (websiteData.socialProof?.stats?.length) {
          const userStat = websiteData.socialProof.stats.find((s: any) => s.label?.toLowerCase().includes('user'));
          if (userStat) {
            result = result.replace(/1000\+/gi, userStat.value);
          }
        }
        break;
      case 'invitation':
        result = result.replace(/Start Your Journey/gi, websiteData.content?.ctas?.[0]?.label || 'Get Started');
        break;
    }
    
    for (const replacement of contentReplacements) {
      result = result.replace(replacement.from, replacement.to);
    }
    
    return result;
  }
  
  private adjustAnimations(
    code: string,
    brandStyle: FormattedBrandStyle,
    emotionalBeat: string
  ): string {
    let result = code;
    
    // Adjust animation speeds based on style
    const speedMultiplier = {
      minimal: 1.5,  // Slower animations
      dynamic: 1.0,  // Normal speed
      bold: 0.7,     // Faster animations
    }[brandStyle.animation.style];
    
    // Adjust spring configs
    result = result.replace(
      /damping:\s*\d+/gi,
      `damping: ${brandStyle.animation.style === 'minimal' ? 20 : 10}`
    );
    result = result.replace(
      /stiffness:\s*\d+/gi,
      `stiffness: ${brandStyle.animation.style === 'bold' ? 200 : 100}`
    );
    
    // Adjust interpolation ranges based on emotional beat
    if (emotionalBeat === 'problem' && brandStyle.animation.style === 'minimal') {
      // Slower fade-ins for problem statement
      result = result.replace(/\[0,\s*30\]/g, '[0, 45]');
    } else if (emotionalBeat === 'invitation' && brandStyle.animation.style === 'bold') {
      // Quicker animations for CTA
      result = result.replace(/\[0,\s*30\]/g, '[0, 15]');
    }
    
    return result;
  }
  
  private addBrandStyling(code: string, brandStyle: FormattedBrandStyle): string {
    // Add border radius to elements
    const borderRadiusPattern = /borderRadius:\s*\d+/gi;
    const borderRadiusReplacement = `borderRadius: '${brandStyle.buttons.borderRadius}'`;
    
    // Add shadows based on style
    const shadowValue = brandStyle.animation.style === 'minimal' 
      ? '0 2px 4px rgba(0,0,0,0.1)'
      : brandStyle.animation.style === 'bold'
      ? '0 10px 30px rgba(0,0,0,0.3)'
      : '0 4px 12px rgba(0,0,0,0.15)';
    
    let result = code;
    result = result.replace(borderRadiusPattern, borderRadiusReplacement);
    
    // Add box shadow to containers
    result = result.replace(
      /style={{([^}]*)backgroundColor/g,
      `style={{$1boxShadow: '${shadowValue}', backgroundColor`
    );
    
    return result;
  }
}