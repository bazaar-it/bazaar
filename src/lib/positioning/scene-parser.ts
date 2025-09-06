/**
 * Scene Code Parser and Updater
 * 
 * Handles parsing existing components from scene code and updating their positions
 * when the layout changes.
 */

import type { ComponentMetadata, LayoutResult } from './component-layout-manager';

export interface ParsedComponent {
  functionName: string;
  type: string;
  fullCode: string;
  currentPosition: { x: number; y: number } | null;
  currentScale: number | null;
}

export class SceneParser {
  /**
   * Parse all brand components from existing scene code
   */
  public static parseComponentsFromScene(sceneCode: string): ComponentMetadata[] {
    const components: ComponentMetadata[] = [];
    
    // Regex to find all brand component functions
    const componentRegex = /function\s+(Brand\w+_\d+)\(\)/g;
    const matches = [...sceneCode.matchAll(componentRegex)];
    
    for (const match of matches) {
      const functionName = match[1];
      const componentType = this.extractComponentType(functionName);
      
      if (componentType) {
        // Extract current position and scale if available
        const { position, scale } = this.extractCurrentPositioning(sceneCode, functionName);
        
        components.push({
          id: functionName,
          type: componentType,
          functionName,
          priority: this.getComponentPriority(componentType),
          baseSize: this.getBaseComponentSize(componentType, 'landscape'), // Default, will be updated
          canvasFormat: 'landscape', // Default, will be updated
          category: this.getComponentCategory(componentType)
        });
      }
    }
    
    return components;
  }

  /**
   * Extract component type from function name
   * e.g., "BrandLoginModal_0" -> "brand-login-modal"
   */
  private static extractComponentType(functionName: string): string | null {
    const typeMap = {
      'BrandLoginModal': 'brand-login-modal',
      'BrandBarChart': 'brand-bar-chart',
      'BrandButton': 'brand-button',
      'BrandCard': 'brand-card',
      'BrandText': 'brand-text',
      'BrandIcon': 'brand-icon'
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (functionName.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Extract current positioning from component code
   */
  private static extractCurrentPositioning(sceneCode: string, functionName: string): {
    position: { x: number; y: number } | null;
    scale: number | null;
  } {
    // Look for the component's positioning in the scene
    const componentUsageRegex = new RegExp(`<${functionName}[^>]*/>`, 'g');
    const usageMatch = sceneCode.match(componentUsageRegex);
    
    if (!usageMatch) {
      return { position: null, scale: null };
    }

    // Look for the component's style or positioning props
    const functionCodeRegex = new RegExp(`function\\s+${functionName}\\(\\)[\\s\\S]*?return \\([\\s\\S]*?\\);[\\s\\S]*?}`, 'm');
    const functionMatch = sceneCode.match(functionCodeRegex);
    
    if (!functionMatch) {
      return { position: null, scale: null };
    }

    const functionCode = functionMatch[0];
    
    // Extract position from left/top styles
    const leftMatch = functionCode.match(/left:\s*['"`]([^'"`]+)['"`]/);
    const topMatch = functionCode.match(/top:\s*['"`]([^'"`]+)['"`]/);
    const scaleMatch = functionCode.match(/scale\([^)]*([0-9.]+)[^)]*\)/);

    let position = null;
    if (leftMatch && topMatch) {
      const x = parseFloat(leftMatch[1]);
      const y = parseFloat(topMatch[1]);
      if (!isNaN(x) && !isNaN(y)) {
        position = { x, y };
      }
    }

    let scale = null;
    if (scaleMatch) {
      const scaleValue = parseFloat(scaleMatch[1]);
      if (!isNaN(scaleValue)) {
        scale = scaleValue;
      }
    }

    return { position, scale };
  }

  /**
   * Update all component positions in scene code
   */
  public static updateComponentPositions(
    sceneCode: string,
    newLayout: Map<string, LayoutResult>
  ): string {
    let updatedCode = sceneCode;

    // Update each component's positioning
    for (const [componentId, layout] of newLayout.entries()) {
      updatedCode = this.updateSingleComponentPosition(updatedCode, componentId, layout);
    }

    return updatedCode;
  }

  /**
   * Update a single component's position in the scene code
   */
  private static updateSingleComponentPosition(
    sceneCode: string,
    componentId: string,
    layout: LayoutResult
  ): string {
    // Find the component function
    const functionRegex = new RegExp(`(function\\s+${componentId}\\(\\)[\\s\\S]*?return \\([\\s\\S]*?)\\);([\\s\\S]*?})`, 'm');
    const match = sceneCode.match(functionRegex);

    if (!match) {
      console.warn(`Could not find component function: ${componentId}`);
      return sceneCode;
    }

    const beforeReturn = match[1];
    const afterReturn = match[2];

    // Update the positioning properties in the component's style
    let updatedFunction = beforeReturn;

    // Update left position
    if (updatedFunction.includes('left:')) {
      updatedFunction = updatedFunction.replace(
        /left:\s*['"`][^'"`]+['"`]/g,
        `left: '${layout.position.x}%'`
      );
    }

    // Update top position
    if (updatedFunction.includes('top:')) {
      updatedFunction = updatedFunction.replace(
        /top:\s*['"`][^'"`]+['"`]/g,
        `top: '${layout.position.y}%'`
      );
    }

    // Update transform scale
    if (updatedFunction.includes('scale(')) {
      updatedFunction = updatedFunction.replace(
        /scale\([^)]*\)/g,
        `scale(\${componentScale} * ${layout.scale})`
      );
    } else if (updatedFunction.includes('transform:')) {
      // Add scale to existing transform
      updatedFunction = updatedFunction.replace(
        /transform:\s*`([^`]*)`/g,
        `transform: \`$1 scale(\${componentScale} * ${layout.scale})\``
      );
    }

    // Update width and height ONLY for the main container (first occurrence)
    if (layout.size.width && updatedFunction.includes('width:')) {
      let widthUpdated = false;
      updatedFunction = updatedFunction.replace(
        /width:\s*['"`][^'"`]+['"`]/,
        (match) => {
          if (!widthUpdated) {
            widthUpdated = true;
            return `width: '${layout.size.width}'`;
          }
          return match; // Don't replace subsequent width values (child elements)
        }
      );
    }

    if (layout.size.height && updatedFunction.includes('height:')) {
      let heightUpdated = false;
      updatedFunction = updatedFunction.replace(
        /height:\s*['"`][^'"`]+['"`]/,
        (match) => {
          if (!heightUpdated) {
            heightUpdated = true;
            return `height: '${layout.size.height}'`;
          }
          return match; // Don't replace subsequent height values (child elements)
        }
      );
    }

    // Update z-index
    if (updatedFunction.includes('zIndex:')) {
      updatedFunction = updatedFunction.replace(
        /zIndex:\s*\d+/g,
        `zIndex: ${layout.zIndex}`
      );
    }

    // Reconstruct the function
    const updatedFunctionCode = updatedFunction + ');' + afterReturn;

    // Replace in the full scene code
    return sceneCode.replace(match[0], updatedFunctionCode);
  }

  /**
   * Add a new component to scene code with calculated positioning
   */
  public static addComponentToScene(
    existingCode: string,
    componentFunction: string,
    componentFunctionName: string,
    layout: LayoutResult
  ): string {
    // Remove export default and Remotion imports from component function
    let cleanComponentFunction = componentFunction
      .replace(/export default function/, 'function')
      .replace(/const \{ [^}]+ \} = window\.Remotion;\s*\n/, '');

    // Update the component function with calculated positioning
    cleanComponentFunction = this.injectPositioningIntoComponent(
      cleanComponentFunction,
      componentFunctionName,
      layout
    );

    // Find where to insert the component function
    const sceneMatch = existingCode.match(/(export default function \w+.*?\{)/s);
    if (!sceneMatch || sceneMatch.index === undefined || !sceneMatch[1]) {
      throw new Error('Could not find main scene function');
    }

    const beforeScene = existingCode.substring(0, sceneMatch.index);
    const sceneStart = sceneMatch[1];
    const afterSceneStart = existingCode.substring(sceneMatch.index + sceneStart.length);

    // Find the return statement to add component usage
    const returnMatch = afterSceneStart.match(/(return \(\s*<[^>]+>)/s);
    if (returnMatch && returnMatch.index !== undefined && returnMatch[1]) {
      const beforeReturn = afterSceneStart.substring(0, returnMatch.index + returnMatch[1].length);
      const afterReturn = afterSceneStart.substring(returnMatch.index + returnMatch[1].length);

      return `${beforeScene}

${cleanComponentFunction}

${sceneStart}${beforeReturn}
      <${componentFunctionName} />
      ${afterReturn}`;
    }

    return existingCode; // Fallback if we can't parse
  }

  /**
   * Inject calculated positioning into a component function
   */
  private static injectPositioningIntoComponent(
    componentCode: string,
    componentName: string,
    layout: LayoutResult
  ): string {
    // This method updates the component code to use the calculated positioning
    let updatedCode = componentCode;

    // Simply replace the componentScale default value with smart positioning value
    console.log('[SmartPositioning] Updating componentScale from 1 to:', layout.scale);
    updatedCode = updatedCode.replace(
      /const componentScale = 1;/g,
      `const componentScale = ${layout.scale};`
    );

    // Update position values - find the main container only (first occurrence)
    console.log('[SmartPositioning] Updating position to:', layout.position);
    
    // Update only the FIRST left and top values (main container positioning)
    let leftUpdated = false;
    updatedCode = updatedCode.replace(
      /left:\s*['"`][^'"`]+['"`]/,
      (match) => {
        if (!leftUpdated) {
          leftUpdated = true;
          return `left: '${layout.position.x}%'`;
        }
        return match; // Don't replace subsequent occurrences
      }
    );

    let topUpdated = false;
    updatedCode = updatedCode.replace(
      /top:\s*['"`][^'"`]+['"`]/,
      (match) => {
        if (!topUpdated) {
          topUpdated = true;
          return `top: '${layout.position.y}%'`;
        }
        return match; // Don't replace subsequent occurrences
      }
    );

    // Update scale - handle complex template literals more carefully
    if (updatedCode.includes('scale(')) {
      // First, find the main transform property and replace only the scale part
      updatedCode = updatedCode.replace(
        /transform:\s*`([^`]*)`/g,
        (match, transform) => {
          // Replace any scale() within the transform template literal
          const updatedTransform = transform.replace(
            /scale\([^)]*\)/g,
            `scale(${layout.scale})`
          );
          return `transform: \`${updatedTransform}\``;
        }
      );
      
      // Handle simpler scale() calls outside template literals
      updatedCode = updatedCode.replace(
        /scale\([^)]*\)(?![^`]*`)/g,
        `scale(${layout.scale})`
      );
      
      // Clean up any malformed syntax
      updatedCode = updatedCode.replace(
        /scale\([^)]*\)\)+/g,
        `scale(${layout.scale})`
      );
    }

    // Update z-index
    updatedCode = updatedCode.replace(
      /zIndex:\s*\d+/g,
      `zIndex: ${layout.zIndex}`
    );

    return updatedCode;
  }

  // Helper methods
  private static getComponentPriority(componentType: string): number {
    const priorities = {
      'brand-login-modal': 8,
      'brand-bar-chart': 6,
      'brand-button': 5,
      'brand-card': 7,
      'brand-text': 4,
      'brand-icon': 3
    };
    return priorities[componentType] || 4;
  }

  private static getBaseComponentSize(componentType: string, canvasFormat: string): { width: string; height: string } {
    // Default sizes - these should match ComponentLayoutManager.getBaseComponentSize
    const sizes = {
      'brand-login-modal': { width: '35vw', height: '50vh' },
      'brand-bar-chart': { width: '35vw', height: '25vh' },
      'brand-button': { width: '25vw', height: '8vh' },
      'brand-card': { width: '30vw', height: '20vh' },
      'brand-text': { width: '35vw', height: '6vh' }
    };
    return sizes[componentType] || { width: '30vw', height: '20vh' };
  }

  private static getComponentCategory(componentType: string): 'ui' | 'chart' | 'text' | 'media' {
    const categories = {
      'brand-login-modal': 'ui',
      'brand-button': 'ui',
      'brand-card': 'ui',
      'brand-bar-chart': 'chart',
      'brand-text': 'text',
      'brand-icon': 'ui'
    };
    return categories[componentType] || 'ui';
  }
}
