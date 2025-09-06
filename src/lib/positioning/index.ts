/**
 * Dynamic Component Positioning System
 * 
 * Main integration module that provides a simple API for:
 * - Adding components with smart positioning
 * - Recalculating all component positions
 * - Handling overflow and wrapping
 * - Responsive layout adaptation
 */

import { ComponentLayoutManager, type ComponentMetadata, type LayoutResult } from './component-layout-manager';
import { SceneParser } from './scene-parser';

export type { ComponentMetadata, LayoutResult };
export { ComponentLayoutManager, SceneParser };

/**
 * Main API for smart component positioning
 */
export class SmartPositioning {
  private layoutManager: ComponentLayoutManager;

  constructor(canvasFormat: 'portrait' | 'square' | 'landscape' = 'landscape') {
    this.layoutManager = new ComponentLayoutManager(canvasFormat);
  }

  /**
   * Add a new component to a scene with smart positioning
   * This recalculates ALL component positions to ensure optimal layout
   */
  public addComponentToScene(
    existingSceneCode: string,
    newComponentCode: string,
    componentType: string,
    componentName: string,
    canvasFormat: 'portrait' | 'square' | 'landscape'
  ): string {
    console.log('[SmartPositioning] addComponentToScene called for:', componentType, componentName);
    try {
      // Update canvas format if changed
      this.layoutManager.updateCanvasFormat(canvasFormat);

      // 1. Parse existing components from scene
      const existingComponents = SceneParser.parseComponentsFromScene(existingSceneCode);
      
      // 2. Check if component with same name already exists
      const existingComponent = existingComponents.find(comp => comp.functionName === componentName);
      if (existingComponent) {
        console.log('[SmartPositioning] Component', componentName, 'already exists, skipping addition');
        return existingSceneCode; // Return unchanged code
      }
      
      // 3. Create metadata for new component
      const newComponent: ComponentMetadata = {
        id: componentName,
        type: componentType,
        functionName: componentName,
        priority: ComponentLayoutManager.getComponentPriority(componentType),
        baseSize: ComponentLayoutManager.getBaseComponentSize(componentType, canvasFormat),
        canvasFormat,
        category: this.getComponentCategory(componentType)
      };

      // 4. Calculate layout for ALL components (existing + new)
      const allComponents = [...existingComponents, newComponent];
      const newLayout = this.layoutManager.calculateLayout(allComponents);

      // 5. Get layout for the new component
      const newComponentLayout = newLayout.get(componentName);
      if (!newComponentLayout) {
        throw new Error('Failed to calculate layout for new component');
      }
      
      console.log('[SmartPositioning] Calculated layout for', componentName, ':', newComponentLayout);

      // 6. Add new component to scene with positioning
      let updatedCode = SceneParser.addComponentToScene(
        existingSceneCode,
        newComponentCode,
        componentName,
        newComponentLayout
      );

      // 7. Update positions of ALL existing components
      if (existingComponents.length > 0) {
        updatedCode = SceneParser.updateComponentPositions(updatedCode, newLayout);
      }

      return updatedCode;

    } catch (error) {
      console.error('Smart positioning failed:', error);
      // Fallback to simple addition without smart positioning
      return this.fallbackAddComponent(existingSceneCode, newComponentCode, componentName);
    }
  }

  /**
   * Recalculate positions for all components in a scene
   * Useful when canvas format changes or manual repositioning is needed
   */
  public recalculateAllPositions(
    sceneCode: string,
    canvasFormat: 'portrait' | 'square' | 'landscape'
  ): string {
    try {
      // Update canvas format
      this.layoutManager.updateCanvasFormat(canvasFormat);

      // Parse existing components
      const components = SceneParser.parseComponentsFromScene(sceneCode);
      
      if (components.length === 0) {
        return sceneCode; // No components to reposition
      }

      // Update component metadata with new canvas format
      const updatedComponents = components.map(comp => ({
        ...comp,
        canvasFormat,
        baseSize: ComponentLayoutManager.getBaseComponentSize(comp.type, canvasFormat)
      }));

      // Calculate new layout
      const newLayout = this.layoutManager.calculateLayout(updatedComponents);

      // Update all component positions
      return SceneParser.updateComponentPositions(sceneCode, newLayout);

    } catch (error) {
      console.error('Position recalculation failed:', error);
      return sceneCode; // Return unchanged on error
    }
  }

  /**
   * Get optimal positions for a list of components without modifying scene code
   * Useful for preview or planning purposes
   */
  public calculateOptimalLayout(
    components: Array<{
      type: string;
      priority?: number;
    }>,
    canvasFormat: 'portrait' | 'square' | 'landscape'
  ): Map<string, LayoutResult> {
    this.layoutManager.updateCanvasFormat(canvasFormat);

    const componentMetadata: ComponentMetadata[] = components.map((comp, index) => ({
      id: `${comp.type}_${index}`,
      type: comp.type,
      functionName: `${this.capitalize(comp.type.replace(/-/g, ''))}Component_${index}`,
      priority: comp.priority || ComponentLayoutManager.getComponentPriority(comp.type),
      baseSize: ComponentLayoutManager.getBaseComponentSize(comp.type, canvasFormat),
      canvasFormat,
      category: this.getComponentCategory(comp.type)
    }));

    return this.layoutManager.calculateLayout(componentMetadata);
  }

  /**
   * Get layout statistics for debugging/analysis
   */
  public getLayoutStats(
    components: ComponentMetadata[],
    layout: Map<string, LayoutResult>
  ): {
    totalComponents: number;
    averageScale: number;
    minScale: number;
    maxScale: number;
    spacingEfficiency: number;
    overlapWarnings: string[];
  } {
    if (components.length === 0) {
      return {
        totalComponents: 0,
        averageScale: 1,
        minScale: 1,
        maxScale: 1,
        spacingEfficiency: 100,
        overlapWarnings: []
      };
    }

    const scales = Array.from(layout.values()).map(l => l.scale);
    const positions = Array.from(layout.values()).map(l => l.position);

    // Calculate overlap warnings
    const overlapWarnings: string[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i];
        const pos2 = positions[j];
        const distance = Math.sqrt(
          Math.pow((pos1?.x || 0) - (pos2?.x || 0), 2) + Math.pow((pos1?.y || 0) - (pos2?.y || 0), 2)
        );
        
        if (distance < 15) { // Threshold for potential overlap
          overlapWarnings.push(`Components ${i} and ${j} may overlap (distance: ${distance.toFixed(1)}%)`);
        }
      }
    }

    // Calculate spacing efficiency (how well-distributed components are)
    const centerX = 50, centerY = 50;
    const avgDistanceFromCenter = positions.reduce((sum, pos) => 
      sum + Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)), 0
    ) / positions.length;
    
    const spacingEfficiency = Math.max(0, 100 - (avgDistanceFromCenter - 20) * 2);

    return {
      totalComponents: components.length,
      averageScale: scales.reduce((a, b) => a + b, 0) / scales.length,
      minScale: Math.min(...scales),
      maxScale: Math.max(...scales),
      spacingEfficiency: Math.round(spacingEfficiency),
      overlapWarnings
    };
  }

  // Helper methods
  private getComponentCategory(componentType: string): 'ui' | 'chart' | 'text' | 'media' {
    const categories: Record<string, 'ui' | 'chart' | 'text' | 'media'> = {
      'brand-login-modal': 'ui',
      'brand-button': 'ui',
      'brand-card': 'ui',
      'brand-bar-chart': 'chart',
      'brand-text': 'text',
      'brand-icon': 'ui'
    };
    return categories[componentType] || 'ui';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private fallbackAddComponent(
    existingCode: string,
    componentCode: string,
    componentName: string
  ): string {
    // Simple fallback that just adds the component without smart positioning
    const cleanComponentFunction = componentCode
      .replace(/export default function/, 'function')
      .replace(/const \{ [^}]+ \} = window\.Remotion;\s*\n/, '');

    const sceneMatch = existingCode.match(/(export default function \w+.*?\{)/s);
    if (!sceneMatch || sceneMatch.index === undefined || !sceneMatch[1]) {
      return existingCode;
    }

    const beforeScene = existingCode.substring(0, sceneMatch.index);
    const sceneStart = sceneMatch[1];
    const afterSceneStart = existingCode.substring(sceneMatch.index + sceneStart.length);

    const returnMatch = afterSceneStart.match(/(return \(\s*<[^>]+>)/s);
    if (returnMatch && returnMatch.index !== undefined && returnMatch[1]) {
      const beforeReturn = afterSceneStart.substring(0, returnMatch.index + returnMatch[1].length);
      const afterReturn = afterSceneStart.substring(returnMatch.index + returnMatch[1].length);

      return `${beforeScene}

${cleanComponentFunction}

${sceneStart}${beforeReturn}
      <${componentName} />
      ${afterReturn}`;
    }

    return existingCode;
  }
}

/**
 * Convenience function for quick component addition
 */
export function addSmartComponent(
  sceneCode: string,
  componentCode: string,
  componentType: string,
  componentName: string,
  canvasFormat: 'portrait' | 'square' | 'landscape' = 'landscape'
): string {
  const smartPositioning = new SmartPositioning(canvasFormat);
  return smartPositioning.addComponentToScene(
    sceneCode,
    componentCode,
    componentType,
    componentName,
    canvasFormat
  );
}

/**
 * Convenience function for layout recalculation
 */
export function recalculateLayout(
  sceneCode: string,
  canvasFormat: 'portrait' | 'square' | 'landscape'
): string {
  const smartPositioning = new SmartPositioning(canvasFormat);
  return smartPositioning.recalculateAllPositions(sceneCode, canvasFormat);
}
