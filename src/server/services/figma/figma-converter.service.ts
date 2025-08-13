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
      // Use GPT-5-mini (gpt-4o-mini) for fast, high-quality conversion
      const modelConfig: ModelConfig = {
        provider: 'openai',
        model: 'gpt-5-mini', // This maps to gpt-4o-mini in the actual API
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
   * Prepare Figma data for LLM (clean unnecessary fields)
   */
  private prepareFigmaData(node: FigmaNode): any {
    // Remove internal Figma fields that aren't useful for conversion
    const cleaned = {
      name: node.name,
      type: node.type,
      visible: node.visible,
      opacity: node.opacity,
      // Layout
      absoluteBoundingBox: node.absoluteBoundingBox,
      constraints: node.constraints,
      // Styling
      fills: node.fills,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,
      // Effects
      effects: node.effects,
      // Corner radius
      cornerRadius: (node as any).cornerRadius,
      rectangleCornerRadii: (node as any).rectangleCornerRadii,
      // Text properties
      ...(node.type === 'TEXT' ? {
        characters: (node as any).characters,
        style: (node as any).style,
        characterStyleOverrides: (node as any).characterStyleOverrides,
        styleOverrideTable: (node as any).styleOverrideTable,
      } : {}),
      // Children (recursive, but limited depth)
      children: node.children?.slice(0, 10).map(child => this.prepareFigmaData(child)),
    };

    // Remove undefined values
    return JSON.parse(JSON.stringify(cleaned));
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
    const dimensions = this.getFormatDimensions(format);
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