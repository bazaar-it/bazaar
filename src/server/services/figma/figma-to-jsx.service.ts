/**
 * Figma to JSX Direct Converter
 * Converts Figma nodes directly to React/Remotion JSX with accurate structure preservation
 */

import type { FigmaNode } from '~/lib/types/figma.types';

export class FigmaToJSXConverter {
  /**
   * Convert Figma node to JSX string with Remotion components
   */
  static convertToRemotionJSX(node: any): {
    jsx: string;
    animationTargets: AnimationTarget[];
    styles: Record<string, any>;
  } {
    const animationTargets: AnimationTarget[] = [];
    const styles: Record<string, any> = {};
    
    // Build the component structure
    const jsx = this.nodeToJSX(node, animationTargets, styles, 0);
    
    return { jsx, animationTargets, styles };
  }

  /**
   * Recursively convert node to JSX
   */
  private static nodeToJSX(
    node: any,
    animationTargets: AnimationTarget[],
    styles: Record<string, any>,
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const className = `figma-${node.id?.replace(':', '-') || 'element'}`;
    
    // Extract CSS properties
    const cssProps = this.extractCSS(node);
    styles[className] = cssProps;
    
    // Identify animation opportunities
    if (this.isAnimatable(node)) {
      animationTargets.push({
        id: node.id,
        type: node.type,
        name: node.name,
        suggested: this.suggestAnimation(node)
      });
    }
    
    switch (node.type) {
      case 'FRAME':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.renderContainer(node, className, depth, animationTargets, styles);
      
      case 'TEXT':
        return this.renderText(node, className, depth);
      
      case 'RECTANGLE':
      case 'ELLIPSE':
        return this.renderShape(node, className, depth);
      
      case 'VECTOR':
        return this.renderVector(node, className, depth);
      
      case 'IMAGE':
        return this.renderImage(node, className, depth);
      
      default:
        return this.renderGeneric(node, className, depth, animationTargets, styles);
    }
  }

  /**
   * Extract CSS properties from Figma node
   */
  private static extractCSS(node: any): Record<string, any> {
    const css: Record<string, any> = {};
    
    // Position and size
    if (node.absoluteBoundingBox) {
      css.position = 'absolute';
      css.left = `${node.absoluteBoundingBox.x}px`;
      css.top = `${node.absoluteBoundingBox.y}px`;
      css.width = `${node.absoluteBoundingBox.width}px`;
      css.height = `${node.absoluteBoundingBox.height}px`;
    }
    
    // Background
    if (node.fills && Array.isArray(node.fills)) {
      const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
      if (solidFill) {
        const { r, g, b } = solidFill.color;
        const a = solidFill.opacity ?? 1;
        css.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
      
      const gradientFill = node.fills.find((f: any) => f.type === 'GRADIENT_LINEAR');
      if (gradientFill) {
        css.background = this.gradientToCSS(gradientFill);
      }
    }
    
    // Border
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.type === 'SOLID') {
        const { r, g, b } = stroke.color;
        css.border = `${node.strokeWeight || 1}px solid rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${stroke.opacity || 1})`;
      }
    }
    
    // Border radius
    if (node.cornerRadius) {
      css.borderRadius = `${node.cornerRadius}px`;
    }
    
    // Effects (shadows, blur)
    if (node.effects && node.effects.length > 0) {
      const shadows = node.effects
        .filter((e: any) => e.type === 'DROP_SHADOW' && e.visible !== false)
        .map((e: any) => this.shadowToCSS(e));
      
      if (shadows.length > 0) {
        css.boxShadow = shadows.join(', ');
      }
      
      const blur = node.effects.find((e: any) => e.type === 'LAYER_BLUR');
      if (blur) {
        css.filter = `blur(${blur.radius}px)`;
      }
    }
    
    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
      css.opacity = node.opacity;
    }
    
    // Layout (auto-layout)
    if (node.layoutMode) {
      css.display = 'flex';
      css.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
      
      if (node.primaryAxisAlignItems) {
        css.alignItems = this.figmaAlignToCSS(node.primaryAxisAlignItems);
      }
      
      if (node.counterAxisAlignItems) {
        css.justifyContent = this.figmaAlignToCSS(node.counterAxisAlignItems);
      }
      
      if (node.itemSpacing) {
        css.gap = `${node.itemSpacing}px`;
      }
      
      if (node.paddingTop) css.paddingTop = `${node.paddingTop}px`;
      if (node.paddingRight) css.paddingRight = `${node.paddingRight}px`;
      if (node.paddingBottom) css.paddingBottom = `${node.paddingBottom}px`;
      if (node.paddingLeft) css.paddingLeft = `${node.paddingLeft}px`;
    }
    
    return css;
  }

  /**
   * Convert Figma alignment to CSS
   */
  private static figmaAlignToCSS(align: string): string {
    const alignMap: Record<string, string> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between',
      'SPACE_AROUND': 'space-around',
      'SPACE_EVENLY': 'space-evenly'
    };
    return alignMap[align] || 'flex-start';
  }

  /**
   * Convert gradient to CSS
   */
  private static gradientToCSS(gradient: any): string {
    // Simplified gradient conversion
    return 'linear-gradient(to right, #000, #fff)';
  }

  /**
   * Convert shadow to CSS
   */
  private static shadowToCSS(shadow: any): string {
    const { r, g, b, a } = shadow.color;
    const color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    return `${shadow.offset?.x || 0}px ${shadow.offset?.y || 0}px ${shadow.radius || 0}px ${color}`;
  }

  /**
   * Check if node is animatable
   */
  private static isAnimatable(node: any): boolean {
    return ['TEXT', 'RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT'].includes(node.type);
  }

  /**
   * Suggest animation based on node type
   */
  private static suggestAnimation(node: any): string {
    switch (node.type) {
      case 'TEXT':
        return 'fade-in-words';
      case 'RECTANGLE':
      case 'ELLIPSE':
        return 'scale-in';
      case 'FRAME':
        return 'slide-in';
      default:
        return 'fade-in';
    }
  }

  /**
   * Render container elements
   */
  private static renderContainer(
    node: any,
    className: string,
    depth: number,
    animationTargets: AnimationTarget[],
    styles: Record<string, any>
  ): string {
    const indent = '  '.repeat(depth);
    const childIndent = '  '.repeat(depth + 1);
    
    let jsx = `${indent}<div className="${className}" style={styles['${className}']}>\n`;
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        jsx += this.nodeToJSX(child, animationTargets, styles, depth + 1);
      }
    }
    
    jsx += `${indent}</div>\n`;
    return jsx;
  }

  /**
   * Render text elements
   */
  private static renderText(node: any, className: string, depth: number): string {
    const indent = '  '.repeat(depth);
    const text = node.characters || '';
    
    // Extract text styles
    const textStyle: any = {};
    if (node.style) {
      if (node.style.fontSize) textStyle.fontSize = `${node.style.fontSize}px`;
      if (node.style.fontFamily) textStyle.fontFamily = node.style.fontFamily;
      if (node.style.fontWeight) textStyle.fontWeight = node.style.fontWeight;
      if (node.style.letterSpacing) textStyle.letterSpacing = `${node.style.letterSpacing}px`;
      if (node.style.lineHeightPx) textStyle.lineHeight = `${node.style.lineHeightPx}px`;
      if (node.style.textAlignHorizontal) {
        textStyle.textAlign = node.style.textAlignHorizontal.toLowerCase();
      }
    }
    
    return `${indent}<span className="${className}" style={{...styles['${className}'], ...${JSON.stringify(textStyle)}}}>${text}</span>\n`;
  }

  /**
   * Render shape elements
   */
  private static renderShape(node: any, className: string, depth: number): string {
    const indent = '  '.repeat(depth);
    return `${indent}<div className="${className}" style={styles['${className}']} />\n`;
  }

  /**
   * Render vector elements
   */
  private static renderVector(node: any, className: string, depth: number): string {
    const indent = '  '.repeat(depth);
    // For now, render as div - could be enhanced to generate SVG
    return `${indent}<div className="${className}" style={styles['${className}']} />\n`;
  }

  /**
   * Render image elements
   */
  private static renderImage(node: any, className: string, depth: number): string {
    const indent = '  '.repeat(depth);
    // Note: Would need to download and store the image
    return `${indent}<Img src="placeholder.jpg" className="${className}" style={styles['${className}']} />\n`;
  }

  /**
   * Render generic elements
   */
  private static renderGeneric(
    node: any,
    className: string,
    depth: number,
    animationTargets: AnimationTarget[],
    styles: Record<string, any>
  ): string {
    return this.renderContainer(node, className, depth, animationTargets, styles);
  }
}

interface AnimationTarget {
  id: string;
  type: string;
  name: string;
  suggested: string;
}

/**
 * Generate complete Remotion component from Figma data
 */
export function generateRemotionComponent(figmaData: any, componentName: string = 'FigmaScene'): string {
  const converter = FigmaToJSXConverter;
  const { jsx, animationTargets, styles } = converter.convertToRemotionJSX(figmaData);
  
  // Generate unique ID
  const uniqueId = Math.random().toString(36).substring(2, 10);
  
  return `
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

// Styles extracted from Figma
const styles = ${JSON.stringify(styles, null, 2)};

export default function Scene_${uniqueId}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animation sequences for identified elements
  ${generateAnimationCode(animationTargets)}
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff' }}>
      ${jsx}
    </AbsoluteFill>
  );
}

export const durationInFrames_${uniqueId} = 150;
`;
}

/**
 * Generate animation code for targets
 */
function generateAnimationCode(targets: AnimationTarget[]): string {
  if (targets.length === 0) return '// No animations';
  
  return targets.map((target, i) => `
  // Animation for ${target.name}
  const anim${i} = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30
  });`).join('\n');
}