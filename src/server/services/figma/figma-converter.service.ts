/**
 * Figma to Remotion Converter Service
 * Uses LLM to intelligently convert Figma designs to animated Remotion components
 */

import type { FigmaNode, ConversionOptions } from '~/lib/types/figma.types';
import { FIGMA_TO_REMOTION_PROMPT } from '~/config/prompts/active/figma-to-remotion';
import { AIClientService } from '~/server/services/ai/aiClient.service';
import type { ModelConfig } from '~/config/models.config';

export class FigmaConverterService {
  /**
   * Convert Figma node to Remotion component code using LLM
   */
  async convertToRemotionCode(
    node: FigmaNode,
    options: ConversionOptions = {}
  ): Promise<string> {
    const { format = 'landscape' } = options;
    
    // Prepare the Figma data for LLM
    const figmaData = this.prepareFigmaData(node);
    
    // Create context about the component
    const context = this.analyzeComponentType(node);
    
    // Build the complete prompt
    const prompt = `${FIGMA_TO_REMOTION_PROMPT}

Component Context:
- Name: ${node.name}
- Type: ${context.componentType}
- Suggested Animation: ${context.animationSuggestion}
- Video Format: ${format} (${this.getFormatDimensions(format).width}x${this.getFormatDimensions(format).height})

Figma Component Data:
\`\`\`json
${JSON.stringify(figmaData, null, 2)}
\`\`\`

Create a Remotion component named "${this.sanitizeComponentName(node.name)}" that beautifully recreates and animates this design.`;

    try {
      // Use GPT-4o-mini for fast, high-quality conversion
      const modelConfig: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4000
      };
      
      // Call LLM to generate the code
      const response = await AIClientService.generateResponse(
        modelConfig,
        [
          {
            role: 'system',
            content: 'You are an expert at creating beautiful, animated Remotion components from Figma designs. Return only the component code, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      );

      // Extract code from response
      const code = this.extractCodeFromResponse(response.content);
      
      // Validate and clean the code
      return this.validateAndCleanCode(code, node.name);
      
    } catch (error) {
      console.error('Failed to convert Figma to Remotion:', error);
      // Fallback to basic conversion
      return this.generateFallbackComponent(node, format);
    }
  }

  /**
   * Prepare Figma data for LLM (extract detailed design properties)
   */
  private prepareFigmaData(node: FigmaNode): any {
    const cleaned = {
      name: node.name,
      type: node.type,
      visible: node.visible,
      opacity: node.opacity,
      
      // Layout & Positioning
      absoluteBoundingBox: node.absoluteBoundingBox,
      constraints: node.constraints,
      size: node.size,
      
      // Visual Properties
      fills: this.extractFills(node.fills),
      strokes: this.extractStrokes(node.strokes, node.strokeWeight),
      effects: this.extractEffects(node.effects),
      
      // Border Radius
      cornerRadius: (node as any).cornerRadius,
      rectangleCornerRadii: (node as any).rectangleCornerRadii,
      
      // Layout Mode (Auto Layout)
      ...(node.type === 'FRAME' ? {
        layoutMode: (node as any).layoutMode,
        paddingLeft: (node as any).paddingLeft,
        paddingRight: (node as any).paddingRight,
        paddingTop: (node as any).paddingTop,
        paddingBottom: (node as any).paddingBottom,
        itemSpacing: (node as any).itemSpacing,
        primaryAxisAlignItems: (node as any).primaryAxisAlignItems,
        counterAxisAlignItems: (node as any).counterAxisAlignItems,
      } : {}),
      
      // Text Properties (detailed)
      ...(node.type === 'TEXT' ? {
        characters: (node as any).characters,
        style: this.extractTextStyle((node as any).style),
        textAlignHorizontal: (node as any).style?.textAlignHorizontal,
        textAlignVertical: (node as any).style?.textAlignVertical,
      } : {}),
      
      // Component Properties
      ...(node.type === 'COMPONENT' || node.type === 'INSTANCE' ? {
        componentId: node.componentId,
        componentProperties: (node as any).componentProperties,
      } : {}),
      
      // Children (recursive with smart limits)
      children: this.extractChildren(node.children, 0),
    };

    // Remove undefined values and return
    return JSON.parse(JSON.stringify(cleaned));
  }

  /**
   * Extract fill information with color conversion
   */
  private extractFills(fills?: any[]): any[] {
    if (!fills) return [];
    
    return fills.map(fill => ({
      type: fill.type,
      visible: fill.visible,
      opacity: fill.opacity,
      // Convert Figma color (0-1) to CSS color (0-255)
      color: fill.color ? this.figmaColorToCSS(fill.color) : undefined,
      // Gradient information
      gradientStops: fill.gradientStops?.map((stop: any) => ({
        position: stop.position,
        color: this.figmaColorToCSS(stop.color),
      })),
      // Image information
      scaleMode: fill.scaleMode,
    }));
  }

  /**
   * Extract stroke information
   */
  private extractStrokes(strokes?: any[], strokeWeight?: number): any {
    if (!strokes || strokes.length === 0) return null;
    
    const stroke = strokes[0]; // Use first stroke
    return {
      color: stroke.color ? this.figmaColorToCSS(stroke.color) : undefined,
      weight: strokeWeight || 1,
      opacity: stroke.opacity,
    };
  }

  /**
   * Extract shadow/blur effects
   */
  private extractEffects(effects?: any[]): any[] {
    if (!effects) return [];
    
    return effects
      .filter(effect => effect.visible !== false)
      .map(effect => ({
        type: effect.type,
        color: effect.color ? this.figmaColorToCSS(effect.color) : undefined,
        offset: effect.offset,
        radius: effect.radius,
        spread: effect.spread,
      }));
  }

  /**
   * Extract text styling information
   */
  private extractTextStyle(style?: any): any {
    if (!style) return null;
    
    return {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeightPx: style.lineHeightPx,
      lineHeightPercent: style.lineHeightPercent,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
    };
  }

  /**
   * Extract children with depth limiting
   */
  private extractChildren(children?: FigmaNode[], depth: number = 0): any[] {
    if (!children || depth > 2) return []; // Limit recursion depth
    
    return children
      .slice(0, 8) // Limit number of children
      .map(child => {
        const childData = this.prepareFigmaData(child);
        // Add depth info for better processing
        childData._depth = depth + 1;
        return childData;
      });
  }

  /**
   * Convert Figma color (0-1 range) to CSS color string
   */
  private figmaColorToCSS(figmaColor: any): string {
    const r = Math.round(figmaColor.r * 255);
    const g = Math.round(figmaColor.g * 255);
    const b = Math.round(figmaColor.b * 255);
    const a = figmaColor.a !== undefined ? figmaColor.a : 1;
    
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else {
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  /**
   * Analyze component type for better animation suggestions
   */
  private analyzeComponentType(node: FigmaNode): { 
    componentType: string; 
    animationSuggestion: string;
  } {
    const name = node.name.toLowerCase();
    const hasText = this.hasTextChildren(node);
    const hasRoundedCorners = (node as any).cornerRadius > 0;
    const childCount = node.children?.length || 0;

    // Button detection
    if ((name.includes('button') || name.includes('btn') || name.includes('cta')) ||
        (hasRoundedCorners && hasText && childCount <= 3)) {
      return {
        componentType: 'button',
        animationSuggestion: 'scale on hover, bounce entrance, optional pulse'
      };
    }

    // Card detection
    if (name.includes('card') || (childCount > 3 && hasText)) {
      return {
        componentType: 'card',
        animationSuggestion: 'slide up with fade, or 3D flip on hover'
      };
    }

    // Header/Title detection
    if (name.includes('header') || name.includes('title') || name.includes('heading')) {
      return {
        componentType: 'header',
        animationSuggestion: 'slide in from top, or letter-by-letter reveal'
      };
    }

    // List detection
    if (name.includes('list') || name.includes('menu')) {
      return {
        componentType: 'list',
        animationSuggestion: 'stagger children animations with fade'
      };
    }

    // Image detection
    if (node.type === 'RECTANGLE' && node.fills?.some(f => f.type === 'IMAGE')) {
      return {
        componentType: 'image',
        animationSuggestion: 'ken burns effect or parallax'
      };
    }

    // Default
    return {
      componentType: 'container',
      animationSuggestion: 'fade in with subtle scale'
    };
  }

  /**
   * Check if node has text children
   */
  private hasTextChildren(node: FigmaNode): boolean {
    if (node.type === 'TEXT') return true;
    return node.children?.some(child => this.hasTextChildren(child)) || false;
  }

  /**
   * Extract code from LLM response
   */
  private extractCodeFromResponse(response: string): string {
    // Try to extract code between ```tsx or ```jsx or ``` markers
    const codeMatch = response.match(/```(?:tsx?|jsx?)?\n?([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }
    
    // If no code blocks, assume entire response is code
    return response.trim();
  }

  /**
   * Validate and clean the generated code
   */
  private validateAndCleanCode(code: string, componentName: string): string {
    // Ensure it has required imports
    if (!code.includes('from \'remotion\'')) {
      code = `import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';\n\n${code}`;
    }

    // Ensure it exports a component
    if (!code.includes('export')) {
      const safeName = this.sanitizeComponentName(componentName);
      code = code.replace(
        /const\s+(\w+)\s*=\s*\(/,
        `export const ${safeName} = (`
      );
    }

    return code;
  }

  /**
   * Sanitize component name for valid JS
   */
  private sanitizeComponentName(name: string): string {
    // Remove special characters and spaces, convert to PascalCase
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') || 'FigmaComponent';
  }

  /**
   * Generate fallback component if LLM fails
   */
  private generateFallbackComponent(node: FigmaNode, format: string): string {
    const name = this.sanitizeComponentName(node.name);
    
    return `import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const ${name} = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
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
    from: 0.9,
    to: 1,
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: \`scale(\${scale})\`,
          padding: 40,
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>${node.name}</h2>
        <p style={{ color: '#666' }}>Figma component imported successfully</p>
        <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          Type: ${node.type}
        </p>
      </div>
    </AbsoluteFill>
  );
};`;
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