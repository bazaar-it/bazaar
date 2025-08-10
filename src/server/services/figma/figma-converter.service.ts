/**
 * Figma to Remotion Converter Service
 * Converts Figma designs to Remotion code
 */

import type { FigmaNode, DesignTokens, ConversionOptions } from '~/lib/types/figma.types';

export class FigmaConverterService {
  /**
   * Convert Figma node to Remotion component code
   */
  convertToRemotionCode(
    node: FigmaNode,
    options: ConversionOptions = {}
  ): string {
    const { format = 'landscape' } = options;
    
    // Extract design tokens
    const tokens = this.extractDesignTokens(node);
    
    // Generate component structure
    const componentCode = this.generateComponent(node, tokens, format);
    
    return componentCode;
  }

  /**
   * Extract design tokens from node
   */
  private extractDesignTokens(node: FigmaNode): DesignTokens {
    const tokens: DesignTokens = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
    };

    // Extract colors from fills
    if (node.fills) {
      node.fills.forEach((fill, index) => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b, a } = fill.color;
          const hex = this.rgbToHex(r, g, b);
          tokens.colors[`fill-${index}`] = hex;
        }
      });
    }

    // Extract typography (for text nodes)
    if (node.type === 'TEXT' && 'style' in node) {
      const textNode = node as any;
      if (textNode.style) {
        tokens.typography.default = {
          fontFamily: textNode.style.fontFamily || 'Inter',
          fontSize: textNode.style.fontSize || 16,
          fontWeight: textNode.style.fontWeight || 400,
          lineHeightPx: textNode.style.lineHeightPx,
        };
      }
    }

    return tokens;
  }

  /**
   * Generate Remotion component code
   */
  private generateComponent(
    node: FigmaNode,
    tokens: DesignTokens,
    format: string
  ): string {
    const dimensions = this.getFormatDimensions(format);
    
    return `import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const FigmaComponent = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animation values
  const opacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 20,
  });
  
  const scale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '${tokens.colors['fill-0'] || '#ffffff'}',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: \`scale(\${scale})\`,
        }}
      >
        ${this.generateNodeElements(node, tokens)}
      </div>
    </AbsoluteFill>
  );
};`;
  }

  /**
   * Generate JSX for node elements
   */
  private generateNodeElements(node: FigmaNode, tokens: DesignTokens): string {
    // Simplified conversion for MVP
    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
        return this.generateContainer(node, tokens);
      
      case 'RECTANGLE':
        return this.generateRectangle(node, tokens);
      
      case 'TEXT':
        return this.generateText(node, tokens);
      
      case 'VECTOR':
      case 'ELLIPSE':
      case 'BOOLEAN_OPERATION':
        // For complex shapes, we'd export as image
        return this.generateImage(node);
      
      default:
        return `<div>/* ${node.type} - ${node.name} */</div>`;
    }
  }

  /**
   * Generate container element
   */
  private generateContainer(node: FigmaNode, tokens: DesignTokens): string {
    const style = this.nodeToStyle(node);
    const children = node.children
      ? node.children.map(child => this.generateNodeElements(child, tokens)).join('\n        ')
      : '';

    return `<div
          style={{
            ${style}
          }}
        >
          ${children}
        </div>`;
  }

  /**
   * Generate rectangle element
   */
  private generateRectangle(node: FigmaNode, tokens: DesignTokens): string {
    const style = this.nodeToStyle(node);
    
    return `<div
          style={{
            ${style}
          }}
        />`;
  }

  /**
   * Generate text element
   */
  private generateText(node: FigmaNode, tokens: DesignTokens): string {
    const textNode = node as any;
    const text = textNode.characters || node.name;
    const typography = tokens.typography.default || {};
    
    return `<p
          style={{
            fontFamily: '${typography.fontFamily || 'Inter'}',
            fontSize: ${typography.fontSize || 16},
            fontWeight: ${typography.fontWeight || 400},
            ${this.nodeToStyle(node)}
          }}
        >
          ${text}
        </p>`;
  }

  /**
   * Generate image placeholder
   */
  private generateImage(node: FigmaNode): string {
    return `<div
          style={{
            width: ${node.absoluteBoundingBox?.width || 100},
            height: ${node.absoluteBoundingBox?.height || 100},
            backgroundColor: '#e5e5e5',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#999', fontSize: 12 }}>
            ${node.name}
          </span>
        </div>`;
  }

  /**
   * Convert node properties to CSS style
   */
  private nodeToStyle(node: FigmaNode): string {
    const styles: string[] = [];
    
    // Position (if absolute)
    if (node.absoluteBoundingBox) {
      const { x, y, width, height } = node.absoluteBoundingBox;
      styles.push(`position: 'absolute'`);
      styles.push(`left: ${x}`);
      styles.push(`top: ${y}`);
      styles.push(`width: ${width}`);
      styles.push(`height: ${height}`);
    }
    
    // Background color
    if (node.fills && node.fills[0]?.type === 'SOLID') {
      const color = node.fills[0].color;
      if (color) {
        const hex = this.rgbToHex(color.r, color.g, color.b);
        styles.push(`backgroundColor: '${hex}'`);
      }
    }
    
    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
      styles.push(`opacity: ${node.opacity}`);
    }
    
    // Border radius (simplified)
    if ('cornerRadius' in node) {
      styles.push(`borderRadius: ${(node as any).cornerRadius}`);
    }
    
    return styles.join(',\n            ');
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Get dimensions for video format
   */
  private getFormatDimensions(format: string): { width: number; height: number } {
    switch (format) {
      case 'portrait':
        return { width: 1080, height: 1920 };
      case 'square':
        return { width: 1080, height: 1080 };
      default:
        return { width: 1920, height: 1080 };
    }
  }
}