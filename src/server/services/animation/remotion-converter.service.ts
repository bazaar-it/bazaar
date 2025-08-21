/**
 * Remotion Converter Service
 * Converts parsed GitHub components to Remotion animation code
 */

import type { ParsedComponent } from '../github/component-parser.service';
import { AnimationStrategy } from './strategies/base.strategy';

export interface RemotionConversionOptions {
  animationType: string;
  duration?: number;
  fps?: number;
  format?: 'landscape' | 'portrait' | 'square';
  preserveStyles?: boolean;
  preserveContent?: boolean;
}

export interface ConvertedComponent {
  code: string;
  metadata: {
    componentName: string;
    framework: string;
    animationType: string;
    duration: number;
    hasStyles: boolean;
    hasContent: boolean;
  };
}

export class RemotionConverter {
  private component: ParsedComponent;
  private options: RemotionConversionOptions;
  
  constructor(component: ParsedComponent, options: RemotionConversionOptions) {
    this.component = component;
    this.options = {
      duration: 60,
      fps: 30,
      format: 'landscape',
      preserveStyles: true,
      preserveContent: true,
      ...options,
    };
  }
  
  /**
   * Convert component to Remotion code
   */
  convert(strategy: AnimationStrategy): ConvertedComponent {
    const imports = this.generateImports();
    const componentCode = this.generateComponent(strategy);
    const helpers = this.generateHelpers();
    
    const code = `${imports}\n\n${componentCode}\n\n${helpers}`;
    
    return {
      code,
      metadata: {
        componentName: this.component.name,
        framework: this.component.framework,
        animationType: this.options.animationType,
        duration: this.options.duration || 60,
        hasStyles: !!this.component.styles.inline || !!this.component.styles.classes,
        hasContent: this.component.content.text.length > 0,
      },
    };
  }
  
  /**
   * Generate Remotion imports
   */
  private generateImports(): string {
    const imports = [
      'AbsoluteFill',
      'useCurrentFrame',
      'interpolate',
      'spring',
    ];
    
    // Add additional imports based on animation needs
    if (this.hasSequences()) {
      imports.push('Sequence');
    }
    
    if (this.hasAudio()) {
      imports.push('Audio', 'useVideoConfig');
    }
    
    return `
import React from 'react';
import {
  ${imports.join(',\n  ')}
} from 'remotion';
    `.trim();
  }
  
  /**
   * Generate the main component
   */
  private generateComponent(strategy: AnimationStrategy): string {
    const { name, jsx, styles, content } = this.component;
    const componentName = `Animated${name || 'Component'}`;
    
    // Apply animation strategy
    const animations = strategy.generate(this.component);
    
    return `
export default function ${componentName}() {
  const frame = useCurrentFrame();
  
  ${this.generateAnimationVariables(animations)}
  
  ${this.generateStyles(styles, animations)}
  
  return (
    <AbsoluteFill style={containerStyle}>
      ${this.generateJSX(jsx, animations)}
    </AbsoluteFill>
  );
}
    `.trim();
  }
  
  /**
   * Generate animation variables
   */
  private generateAnimationVariables(animations: any[]): string {
    return animations.map(anim => {
      switch (anim.type) {
        case 'spring':
          return `
  const ${anim.name} = spring({
    frame,
    fps: ${this.options.fps},
    from: ${JSON.stringify(anim.from)},
    to: ${JSON.stringify(anim.to)},
    durationInFrames: ${anim.duration || 30},
    config: {
      damping: ${anim.damping || 100},
      stiffness: ${anim.stiffness || 100},
      mass: ${anim.mass || 1},
    },
  });`;
  
        case 'interpolate':
          return `
  const ${anim.name} = interpolate(
    frame,
    [${anim.inputRange.join(', ')}],
    [${anim.outputRange.join(', ')}],
    {
      extrapolateLeft: '${anim.extrapolateLeft || 'clamp'}',
      extrapolateRight: '${anim.extrapolateRight || 'clamp'}',
    }
  );`;
  
        case 'sequence':
          return `
  const ${anim.name} = frame >= ${anim.from} && frame < ${anim.to} ? 1 : 0;`;
  
        default:
          return '';
      }
    }).join('\n');
  }
  
  /**
   * Generate styles
   */
  private generateStyles(styles: any, animations: any[]): string {
    const containerStyle: any = {
      backgroundColor: '#000000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    };
    
    // Preserve original styles if requested
    if (this.options.preserveStyles && styles.inline) {
      Object.assign(containerStyle, styles.inline);
    }
    
    // Apply animated styles
    const animatedStyles = animations
      .filter(a => a.property)
      .map(a => `    ${a.property}: ${a.variable},`)
      .join('\n');
    
    return `
  const containerStyle = {
    backgroundColor: '${containerStyle.backgroundColor}',
    display: '${containerStyle.display}',
    justifyContent: '${containerStyle.justifyContent}',
    alignItems: '${containerStyle.alignItems}',
${animatedStyles}
  };
    `.trim();
  }
  
  /**
   * Generate JSX
   */
  private generateJSX(jsx: any, animations: any[]): string {
    if (!jsx && !this.component.content) {
      return this.generateFallbackJSX();
    }
    
    // If we have original JSX structure, try to preserve it
    if (jsx) {
      return this.transformJSX(jsx, animations);
    }
    
    // Otherwise, generate from content
    return this.generateFromContent();
  }
  
  /**
   * Transform original JSX with animations
   */
  private transformJSX(jsx: any, animations: any[]): string {
    // This would need actual JSX transformation logic
    // For now, generate a simplified version
    const { content } = this.component;
    
    if (content.text.length > 0) {
      return `
      <div style={elementStyle}>
        ${content.text.map((text, i) => `
        <p
          style={{
            opacity: interpolate(
              frame,
              [${i * 5}, ${i * 5 + 10}],
              [0, 1]
            ),
            transform: \`translateY(\${interpolate(
              frame,
              [${i * 5}, ${i * 5 + 10}],
              [20, 0]
            )}px)\`,
          }}
        >
          ${text}
        </p>`).join('')}
      </div>
      `.trim();
    }
    
    return this.generateFallbackJSX();
  }
  
  /**
   * Generate JSX from content
   */
  private generateFromContent(): string {
    const { content, styles } = this.component;
    const elements: string[] = [];
    
    // Add text content
    if (content.text.length > 0) {
      elements.push(
        content.text.map((text, i) => `
        <div
          key="text-${i}"
          style={{
            fontSize: 24,
            color: 'white',
            opacity: textOpacity,
            transform: \`translateY(\${textY}px)\`,
          }}
        >
          ${text}
        </div>`).join('')
      );
    }
    
    // Add images
    if (content.images.length > 0) {
      elements.push(
        content.images.map((img, i) => `
        <img
          key="img-${i}"
          src="${img.src}"
          alt="${img.alt || ''}"
          style={{
            maxWidth: '100%',
            opacity: imageOpacity,
            transform: \`scale(\${imageScale})\`,
          }}
        />`).join('')
      );
    }
    
    // Add links
    if (content.links.length > 0) {
      elements.push(
        content.links.map((link, i) => `
        <a
          key="link-${i}"
          href="${link.href}"
          style={{
            color: '#3B82F6',
            textDecoration: 'underline',
            opacity: linkOpacity,
          }}
        >
          ${link.text}
        </a>`).join('')
      );
    }
    
    // If we have Tailwind classes, generate a div with those classes
    if (styles.tailwind && styles.tailwind.length > 0) {
      return `
      <div className="${styles.tailwind.join(' ')}" style={elementStyle}>
        ${elements.join('\n')}
      </div>
      `.trim();
    }
    
    return `
      <div style={elementStyle}>
        ${elements.join('\n')}
      </div>
    `.trim();
  }
  
  /**
   * Generate fallback JSX
   */
  private generateFallbackJSX(): string {
    return `
      <div
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: 'white',
          opacity: interpolate(frame, [0, 20], [0, 1]),
          transform: \`scale(\${interpolate(frame, [0, 20], [0.8, 1])})\`,
        }}
      >
        ${this.component.name || 'Component'}
      </div>
    `.trim();
  }
  
  /**
   * Generate helper functions
   */
  private generateHelpers(): string {
    const helpers: string[] = [];
    
    // Add hex to RGBA converter if needed
    if (this.needsColorConverter()) {
      helpers.push(`
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
}`);
    }
    
    // Add stagger helper if needed
    if (this.needsStaggerHelper()) {
      helpers.push(`
function stagger(index, delay = 5) {
  return interpolate(
    frame,
    [index * delay, index * delay + 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
}`);
    }
    
    return helpers.join('\n');
  }
  
  // Helper methods
  private hasSequences(): boolean {
    return this.component.content.data.some(d => d.type === 'list');
  }
  
  private hasAudio(): boolean {
    return false; // Implement if needed
  }
  
  private needsColorConverter(): boolean {
    const styles = this.component.styles;
    return !!styles.inline && 
           Object.values(styles.inline).some((v: any) => 
             typeof v === 'string' && v.startsWith('#')
           );
  }
  
  private needsStaggerHelper(): boolean {
    return this.component.content.data.some(d => d.type === 'list');
  }
}