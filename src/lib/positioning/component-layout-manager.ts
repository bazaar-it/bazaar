/**
 * Dynamic Component Layout Manager
 * 
 * Intelligently positions components in a scene with:
 * - Adaptive layouts based on component count and canvas format
 * - Smart padding and overflow prevention
 * - Automatic resizing to ensure components fit
 * - Responsive wrapping for many components
 * - Priority-based positioning
 */

export interface ComponentMetadata {
  id: string;
  type: string; // 'brand-button', 'brand-login-modal', etc.
  functionName: string;
  priority: number; // Higher priority gets better positions (1-10)
  baseSize: { width: string; height: string }; // Base size without scaling
  canvasFormat: 'portrait' | 'square' | 'landscape';
  category: 'ui' | 'chart' | 'text' | 'media'; // Component category for grouping
}

export interface LayoutResult {
  position: { x: number; y: number }; // Percentage positions
  scale: number; // Component scaling factor
  zIndex: number;
  size: { width: string; height: string }; // Final calculated size
}

export interface LayoutConfig {
  canvasFormat: 'portrait' | 'square' | 'landscape';
  safeArea: {
    top: number;    // Percentage padding from top
    bottom: number; // Percentage padding from bottom
    left: number;   // Percentage padding from left
    right: number;  // Percentage padding from right
  };
  minComponentSize: number; // Minimum scale factor (0.1 - 1.0)
  maxComponentsPerRow: number; // Maximum components in a single row
  groupSpacing: number; // Spacing between component groups
  componentSpacing: number; // Spacing between individual components
}

export class ComponentLayoutManager {
  private config: LayoutConfig;
  
  constructor(canvasFormat: 'portrait' | 'square' | 'landscape' = 'landscape') {
    this.config = this.getDefaultConfig(canvasFormat);
  }

  private getDefaultConfig(format: 'portrait' | 'square' | 'landscape'): LayoutConfig {
    const configs = {
      portrait: {
        canvasFormat: format,
        safeArea: { top: 8, bottom: 8, left: 5, right: 5 },
        minComponentSize: 0.3,
        maxComponentsPerRow: 2,
        groupSpacing: 8,
        componentSpacing: 5
      },
      square: {
        canvasFormat: format,
        safeArea: { top: 6, bottom: 6, left: 6, right: 6 },
        minComponentSize: 0.4,
        maxComponentsPerRow: 3,
        groupSpacing: 6,
        componentSpacing: 4
      },
      landscape: {
        canvasFormat: format,
        safeArea: { top: 8, bottom: 8, left: 8, right: 8 },
        minComponentSize: 0.5,
        maxComponentsPerRow: 4,
        groupSpacing: 5,
        componentSpacing: 3
      }
    };

    return configs[format] as LayoutConfig;
  }

  public updateCanvasFormat(format: 'portrait' | 'square' | 'landscape') {
    this.config = this.getDefaultConfig(format);
  }

  /**
   * Main layout calculation method
   * Intelligently positions all components with overflow prevention
   */
  public calculateLayout(components: ComponentMetadata[]): Map<string, LayoutResult> {
    if (components.length === 0) {
      return new Map();
    }

    // Special case: Single component should be perfectly centered
    if (components.length === 1) {
      const component = components[0]!;
      const componentScale = 1.2 * this.getComponentSizeMultiplier(component.type);
      
      console.log(`[LayoutManager] Single component centering for ${component.id}`);
      
      const positions = new Map<string, LayoutResult>();
      positions.set(component.id, {
        position: { x: 50, y: 50 }, // Perfect center
        scale: Math.max(componentScale, this.config.minComponentSize),
        zIndex: 11,
        size: this.calculateComponentSize(component.baseSize, componentScale)
      });
      
      return positions;
    }
    
    // Multi-component layout: Use complex positioning
    const groupedComponents = this.groupAndSortComponents(components);
    
    // Calculate available space
    const availableSpace = this.calculateAvailableSpace();
    
    // Determine layout strategy based on component count
    const strategy = this.selectLayoutStrategy(components.length);
    
    // Calculate positions using the selected strategy
    const positions = this.calculatePositionsForStrategy(
      strategy, 
      groupedComponents, 
      availableSpace
    );

    return positions;
  }

  private groupAndSortComponents(components: ComponentMetadata[]): ComponentMetadata[] {
    // Sort by priority (higher first), then by category for consistent grouping
    return components.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.category.localeCompare(b.category);
    });
  }

  private calculateAvailableSpace() {
    const { safeArea } = this.config;
    return {
      width: 100 - safeArea.left - safeArea.right,
      height: 100 - safeArea.top - safeArea.bottom,
      startX: safeArea.left,
      startY: safeArea.top
    };
  }

  private selectLayoutStrategy(componentCount: number): string {
    const strategies = {
      portrait: {
        1: 'center',
        2: 'vertical-stack',
        3: 'triangle-top',
        4: 'grid-2x2',
        5: 'vertical-flow',
        6: 'grid-2x3',
        7: 'vertical-flow',
        8: 'grid-2x4'
      },
      square: {
        1: 'center',
        2: 'horizontal-pair',
        3: 'triangle-center',
        4: 'grid-2x2',
        5: 'cross-pattern',
        6: 'grid-3x2',
        7: 'hexagon-flow',
        8: 'grid-3x3',
        9: 'grid-3x3'
      },
      landscape: {
        1: 'center-right',
        2: 'horizontal-pair',
        3: 'horizontal-trio',
        4: 'grid-2x2',
        5: 'pentagram',
        6: 'grid-3x2',
        7: 'horizontal-flow',
        8: 'grid-4x2',
        9: 'grid-3x3'
      }
    };

    const formatStrategies = strategies[this.config.canvasFormat];
    const maxDefined = Math.max(...Object.keys(formatStrategies).map(Number));
    
    if (componentCount <= maxDefined) {
      return formatStrategies[componentCount];
    }
    
    // For more components, use flow layout
    return componentCount > 12 ? 'responsive-grid' : 'adaptive-flow';
  }

  private calculatePositionsForStrategy(
    strategy: string,
    components: ComponentMetadata[],
    availableSpace: any
  ): Map<string, LayoutResult> {
    const positions = new Map<string, LayoutResult>();
    
    // Calculate global scale based on component count
    const globalScale = this.calculateGlobalScale(components.length);
    
    // Get base coordinates for the strategy
    const coordinates = this.getCoordinatesForStrategy(strategy, components.length);
    
    // Apply smart resizing if components would overflow
    const adjustedCoordinates = this.preventOverflow(coordinates, components, globalScale);
    
    // Assign positions to components
    components.forEach((component, index) => {
      const coord = adjustedCoordinates[index] || adjustedCoordinates[0];
      const componentScale = globalScale * this.getComponentSizeMultiplier(component.type);
      
      const finalX = availableSpace.startX + (coord.x * availableSpace.width / 100);
      const finalY = availableSpace.startY + (coord.y * availableSpace.height / 100);
      
      console.log(`[LayoutManager] Component ${component.id}:`, {
        strategy,
        coord,
        availableSpace,
        finalPosition: { x: finalX, y: finalY },
        componentScale
      });
      
      positions.set(component.id, {
        position: {
          x: finalX,
          y: finalY
        },
        scale: Math.max(componentScale, this.config.minComponentSize),
        zIndex: 10 + (components.length - index),
        size: this.calculateComponentSize(component.baseSize, componentScale)
      });
    });

    return positions;
  }

  private calculateGlobalScale(componentCount: number): number {
    // Progressive scaling - more components = smaller individual size
    if (componentCount === 1) return 1.0;
    if (componentCount === 2) return 0.9;
    if (componentCount === 3) return 0.8;
    if (componentCount === 4) return 0.75;
    if (componentCount === 5) return 0.7;
    if (componentCount === 6) return 0.65;
    if (componentCount <= 8) return 0.6;
    if (componentCount <= 10) return 0.5;
    if (componentCount <= 12) return 0.45;
    return Math.max(0.35, this.config.minComponentSize); // Never smaller than min
  }

  private getComponentSizeMultiplier(componentType: string): number {
    // Different component types have different size priorities
    const multipliers = {
      'brand-login-modal': 1.2,  // Larger, needs more space
      'brand-bar-chart': 1.0,    // Standard size
      'brand-button': 0.8,       // Smaller, more compact
      'brand-text': 0.7,         // Text can be smallest
      'brand-card': 1.1,         // Cards need decent space
      'brand-icon': 0.6          // Icons are smallest
    };

    return multipliers[componentType] || 1.0;
  }

  private preventOverflow(
    coordinates: Array<{x: number, y: number}>,
    components: ComponentMetadata[],
    globalScale: number
  ): Array<{x: number, y: number}> {
    // Check if any components would overflow and adjust if needed
    const { componentSpacing } = this.config;
    const adjustedCoords = [...coordinates];
    
    // Estimate component dimensions to check for overlaps
    for (let i = 0; i < adjustedCoords.length; i++) {
      const component = components[i];
      if (!component) continue;
      
      const estimatedSize = this.estimateComponentSize(component, globalScale);
      
      // Check boundaries and adjust if necessary
      if (adjustedCoords[i].x + estimatedSize.width > 95) {
        adjustedCoords[i].x = 95 - estimatedSize.width;
      }
      if (adjustedCoords[i].y + estimatedSize.height > 95) {
        adjustedCoords[i].y = 95 - estimatedSize.height;
      }
      
      // Ensure minimum spacing from edges
      adjustedCoords[i].x = Math.max(5, adjustedCoords[i].x);
      adjustedCoords[i].y = Math.max(5, adjustedCoords[i].y);
    }
    
    return adjustedCoords;
  }

  private estimateComponentSize(component: ComponentMetadata, scale: number) {
    // Rough size estimation for overflow checking
    const baseSizes = {
      'brand-login-modal': { width: 35, height: 50 },
      'brand-bar-chart': { width: 30, height: 25 },
      'brand-button': { width: 20, height: 8 },
      'brand-text': { width: 25, height: 6 },
      'brand-card': { width: 28, height: 20 }
    };

    const baseSize = baseSizes[component.type] || { width: 25, height: 20 };
    return {
      width: baseSize.width * scale,
      height: baseSize.height * scale
    };
  }

  private calculateComponentSize(baseSize: { width: string; height: string }, scale: number) {
    // Convert base size to scaled size
    const parseSize = (size: string) => {
      const value = parseFloat(size);
      const unit = size.replace(value.toString(), '');
      return { value, unit };
    };

    const width = parseSize(baseSize.width);
    const height = parseSize(baseSize.height);

    return {
      width: `${(width.value * scale).toFixed(1)}${width.unit}`,
      height: `${(height.value * scale).toFixed(1)}${height.unit}`
    };
  }

  private getCoordinatesForStrategy(strategy: string, count: number): Array<{x: number, y: number}> {
    const strategies = {
      // Single component
      'center': [{ x: 50, y: 50 }],
      'center-right': [{ x: 70, y: 50 }],

      // Two components
      'vertical-stack': [
        { x: 50, y: 30 }, { x: 50, y: 70 }
      ],
      'horizontal-pair': [
        { x: 30, y: 50 }, { x: 70, y: 50 }
      ],

      // Three components
      'triangle-top': [
        { x: 50, y: 25 }, { x: 30, y: 70 }, { x: 70, y: 70 }
      ],
      'triangle-center': [
        { x: 30, y: 35 }, { x: 70, y: 35 }, { x: 50, y: 70 }
      ],
      'horizontal-trio': [
        { x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }
      ],

      // Four components
      'grid-2x2': [
        { x: 30, y: 30 }, { x: 70, y: 30 },
        { x: 30, y: 70 }, { x: 70, y: 70 }
      ],

      // Five components
      'cross-pattern': [
        { x: 50, y: 20 }, { x: 20, y: 50 }, { x: 50, y: 50 },
        { x: 80, y: 50 }, { x: 50, y: 80 }
      ],
      'pentagram': [
        { x: 50, y: 15 }, { x: 20, y: 40 }, { x: 30, y: 75 },
        { x: 70, y: 75 }, { x: 80, y: 40 }
      ],
      'vertical-flow': [
        { x: 50, y: 15 }, { x: 25, y: 35 }, { x: 75, y: 35 },
        { x: 25, y: 65 }, { x: 75, y: 65 }
      ],

      // Six components
      'grid-2x3': [
        { x: 30, y: 20 }, { x: 70, y: 20 },
        { x: 30, y: 50 }, { x: 70, y: 50 },
        { x: 30, y: 80 }, { x: 70, y: 80 }
      ],
      'grid-3x2': [
        { x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 },
        { x: 25, y: 65 }, { x: 50, y: 65 }, { x: 75, y: 65 }
      ],
      'hexagon-flow': [
        { x: 30, y: 25 }, { x: 70, y: 25 }, { x: 85, y: 50 },
        { x: 70, y: 75 }, { x: 30, y: 75 }, { x: 15, y: 50 }
      ],

      // Many components - flow layouts
      'horizontal-flow': this.generateFlowLayout('horizontal', count),
      'vertical-flow': this.generateFlowLayout('vertical', count),
      'adaptive-flow': this.generateAdaptiveFlow(count),
      'responsive-grid': this.generateResponsiveGrid(count)
    };

    return strategies[strategy] || strategies['adaptive-flow'];
  }

  private generateFlowLayout(direction: 'horizontal' | 'vertical', count: number): Array<{x: number, y: number}> {
    const coords = [];
    const maxPerLine = direction === 'horizontal' ? this.config.maxComponentsPerRow : 2;
    
    for (let i = 0; i < count; i++) {
      if (direction === 'horizontal') {
        const row = Math.floor(i / maxPerLine);
        const col = i % maxPerLine;
        const rowCount = Math.ceil(count / maxPerLine);
        
        coords.push({
          x: 20 + (col * 60 / (maxPerLine - 1 || 1)),
          y: 20 + (row * 60 / (rowCount - 1 || 1))
        });
      } else {
        const col = Math.floor(i / maxPerLine);
        const row = i % maxPerLine;
        const colCount = Math.ceil(count / maxPerLine);
        
        coords.push({
          x: 20 + (col * 60 / (colCount - 1 || 1)),
          y: 20 + (row * 60 / (maxPerLine - 1 || 1))
        });
      }
    }
    
    return coords;
  }

  private generateAdaptiveFlow(count: number): Array<{x: number, y: number}> {
    // Smart adaptive layout that adjusts based on canvas format
    const coords = [];
    const { canvasFormat } = this.config;
    
    if (canvasFormat === 'landscape') {
      // Prefer horizontal arrangements
      const cols = Math.min(4, Math.ceil(Math.sqrt(count * 1.5)));
      const rows = Math.ceil(count / cols);
      
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        coords.push({
          x: 15 + (col * 70 / (cols - 1 || 1)),
          y: 20 + (row * 60 / (rows - 1 || 1))
        });
      }
    } else if (canvasFormat === 'portrait') {
      // Prefer vertical arrangements
      const rows = Math.min(4, Math.ceil(Math.sqrt(count * 1.5)));
      const cols = Math.ceil(count / rows);
      
      for (let i = 0; i < count; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        
        coords.push({
          x: 20 + (col * 60 / (cols - 1 || 1)),
          y: 15 + (row * 70 / (rows - 1 || 1))
        });
      }
    } else {
      // Square: balanced grid
      const side = Math.ceil(Math.sqrt(count));
      
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / side);
        const col = i % side;
        
        coords.push({
          x: 20 + (col * 60 / (side - 1 || 1)),
          y: 20 + (row * 60 / (side - 1 || 1))
        });
      }
    }
    
    return coords;
  }

  private generateResponsiveGrid(count: number): Array<{x: number, y: number}> {
    // Responsive grid that ensures no component is too small
    const maxCols = this.config.maxComponentsPerRow;
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    
    const coords = [];
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Add some randomness to avoid perfect grid monotony
      const offsetX = (Math.random() - 0.5) * 5;
      const offsetY = (Math.random() - 0.5) * 5;
      
      coords.push({
        x: Math.max(10, Math.min(90, 15 + (col * 70 / (cols - 1 || 1)) + offsetX)),
        y: Math.max(10, Math.min(90, 15 + (row * 70 / (rows - 1 || 1)) + offsetY))
      });
    }
    
    return coords;
  }

  /**
   * Get component priority based on type
   * Higher values get better positions
   */
  public static getComponentPriority(componentType: string): number {
    const priorities = {
      'brand-login-modal': 8,  // High priority - main interaction
      'brand-card': 7,         // High priority - content display
      'brand-bar-chart': 6,    // Medium-high - data visualization
      'brand-button': 5,       // Medium - call to action
      'brand-text': 4,         // Medium-low - supporting content
      'brand-icon': 3,         // Low - decorative
      'brand-badge': 2         // Lowest - auxiliary info
    };

    return priorities[componentType] || 4; // Default medium priority
  }

  /**
   * Get base component size based on type and canvas format
   */
  public static getBaseComponentSize(
    componentType: string, 
    canvasFormat: 'portrait' | 'square' | 'landscape'
  ): { width: string; height: string } {
    const sizes = {
      portrait: {
        'brand-login-modal': { width: '70vw', height: '60vh' },
        'brand-bar-chart': { width: '65vw', height: '30vh' },
        'brand-button': { width: '60vw', height: '12vh' },
        'brand-card': { width: '65vw', height: '25vh' },
        'brand-text': { width: '70vw', height: '8vh' }
      },
      square: {
        'brand-login-modal': { width: '65vw', height: '65vh' },
        'brand-bar-chart': { width: '60vw', height: '35vh' },
        'brand-button': { width: '50vw', height: '10vh' },
        'brand-card': { width: '55vw', height: '30vh' },
        'brand-text': { width: '60vw', height: '10vh' }
      },
      landscape: {
        'brand-login-modal': { width: '35vw', height: '50vh' },
        'brand-bar-chart': { width: '35vw', height: '25vh' },
        'brand-button': { width: '25vw', height: '8vh' },
        'brand-card': { width: '30vw', height: '20vh' },
        'brand-text': { width: '35vw', height: '6vh' }
      }
    };

    return sizes[canvasFormat]?.[componentType] || sizes[canvasFormat]?.['brand-card'] || { width: '30vw', height: '20vh' };
  }
}
