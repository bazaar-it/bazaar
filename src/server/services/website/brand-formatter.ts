import type { EnhancedWebAnalysis } from "~/tools/webAnalysis/WebAnalysisEnhanced";

export interface FormattedBrandStyle {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
    gradient?: string;
  };
  typography: {
    primaryFont: string;
    headingFont?: string;
    fontSize: {
      hero: string;
      heading: string;
      body: string;
      caption: string;
    };
    fontWeight: {
      bold: number;
      medium: number;
      regular: number;
    };
  };
  animation: {
    duration: number;
    easing: string;
    style: 'minimal' | 'dynamic' | 'bold';
  };
  buttons: {
    borderRadius: string;
    padding: string;
    primaryStyle: {
      background: string;
      color: string;
      hover?: string;
    };
  };
  spacing: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export class BrandFormatter {
  format(websiteData: EnhancedWebAnalysis): FormattedBrandStyle {
    const { brand } = websiteData;
    
    // Create gradient from primary colors
    const gradient = brand.colors.gradients?.[0] 
      ? `linear-gradient(${brand.colors.gradients[0].angle}deg, ${brand.colors.gradients[0].stops.join(', ')})`
      : `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`;
    
    // Extract font sizes from typography scale
    const fontSize = {
      hero: brand.typography.scale?.h1?.size || '72px',
      heading: brand.typography.scale?.h2?.size || '48px',
      body: brand.typography.scale?.body?.size || '16px',
      caption: brand.typography.scale?.caption?.size || '14px',
    };
    
    // Get primary font family
    const primaryFont = brand.typography.fonts?.[0]?.family || 'Inter';
    const headingFont = brand.typography.fonts?.[1]?.family || primaryFont;
    
    // Determine animation style based on brand characteristics
    const animationStyle = this.determineAnimationStyle(websiteData);
    
    return {
      colors: {
        primary: brand.colors.primary || '#000000',
        secondary: brand.colors.secondary || '#666666',
        accent: brand.colors.accents?.[0] || brand.colors.primary,
        dark: brand.colors.neutrals?.[1] || '#1a1a1a',
        light: brand.colors.neutrals?.[0] || '#ffffff',
        gradient,
      },
      typography: {
        primaryFont: this.sanitizeFontFamily(primaryFont),
        headingFont: this.sanitizeFontFamily(headingFont),
        fontSize,
        fontWeight: {
          bold: 700,
          medium: 500,
          regular: 400,
        },
      },
      animation: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        style: animationStyle,
      },
      buttons: {
        borderRadius: brand.borderRadius?.md || '8px',
        padding: brand.buttons?.primary?.padding || '12px 24px',
        primaryStyle: {
          background: brand.buttons?.primary?.backgroundColor || brand.colors.primary,
          color: brand.buttons?.primary?.color || '#ffffff',
          hover: brand.buttons?.primary?.hoverState?.backgroundColor,
        },
      },
      spacing: {
        sm: 8,
        md: 16,
        lg: 32,
        xl: 64,
      },
    };
  }
  
  private sanitizeFontFamily(font: string): string {
    // Remove quotes and fallback fonts
    const cleaned = font.replace(/["']/g, '').split(',')[0].trim();
    
    // Map common web fonts to available Google Fonts
    const fontMap: Record<string, string> = {
      'Helvetica Neue': 'Inter',
      'Helvetica': 'Inter',
      'Arial': 'Inter',
      'system-ui': 'Inter',
      '-apple-system': 'Inter',
      'BlinkMacSystemFont': 'Inter',
      'Segoe UI': 'Inter',
      'Georgia': 'Merriweather',
      'Times New Roman': 'Merriweather',
      'Courier New': 'Fira Code',
      'Courier': 'Fira Code',
      'monospace': 'Fira Code',
    };
    
    return fontMap[cleaned] || cleaned || 'Inter';
  }
  
  private determineAnimationStyle(websiteData: EnhancedWebAnalysis): 'minimal' | 'dynamic' | 'bold' {
    const { brand, layout } = websiteData;
    
    // Check for animation hints
    if (layout.motionHints?.hasAnimations) {
      const animTypes = layout.motionHints.animationTypes || [];
      if (animTypes.includes('parallax') || animTypes.includes('3d')) {
        return 'bold';
      }
      if (animTypes.length > 2) {
        return 'dynamic';
      }
    }
    
    // Check color palette vibrancy
    const hasVibrantColors = brand.colors.accents?.some(color => {
      // Check if color is bright/saturated
      return color.includes('ff') || color.includes('00ff') || color.includes('ff00');
    });
    
    if (hasVibrantColors) {
      return 'dynamic';
    }
    
    // Check typography style
    const hasLargeHeadings = brand.typography.scale?.h1?.size && 
      parseInt(brand.typography.scale.h1.size) > 60;
    
    if (hasLargeHeadings) {
      return 'bold';
    }
    
    // Default to minimal for professional/corporate sites
    return 'minimal';
  }
  
  // Helper to generate CSS variables for easy use in templates
  generateCSSVariables(brandStyle: FormattedBrandStyle): string {
    return `
      --color-primary: ${brandStyle.colors.primary};
      --color-secondary: ${brandStyle.colors.secondary};
      --color-accent: ${brandStyle.colors.accent};
      --color-dark: ${brandStyle.colors.dark};
      --color-light: ${brandStyle.colors.light};
      --font-primary: ${brandStyle.typography.primaryFont};
      --font-heading: ${brandStyle.typography.headingFont};
      --size-hero: ${brandStyle.typography.fontSize.hero};
      --size-heading: ${brandStyle.typography.fontSize.heading};
      --size-body: ${brandStyle.typography.fontSize.body};
      --radius: ${brandStyle.buttons.borderRadius};
    `;
  }
}