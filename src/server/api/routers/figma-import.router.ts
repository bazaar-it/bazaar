/**
 * Figma Import Router
 * Handles fetching and converting Figma components for animation
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { FigmaDiscoveryService } from '~/server/services/figma/figma-discovery.service';
import { db } from '~/server/db';
import { figmaConnections } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const figmaImportRouter = createTRPCRouter({
  /**
   * Fetch Figma component data for animation
   */
  fetchComponentData: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
        nodeId: z.string(),
        componentName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('🎨 [FIGMA IMPORT] Fetching component data:', input);
      
      // Get user's Figma token
      const connection = await db.query.figmaConnections.findFirst({
        where: eq(figmaConnections.userId, ctx.session.user.id),
      });
      
      const accessToken = connection?.accessToken || process.env.FIGMA_PAT;
      
      if (!accessToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No Figma access token available',
        });
      }
      
      try {
        const discoveryService = new FigmaDiscoveryService(accessToken);
        
        // Fetch the actual node data from Figma
        const nodeData = await discoveryService.getNode(input.fileKey, input.nodeId);
        
        if (!nodeData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Figma component not found',
          });
        }
        
        // Extract design information for LLM
        const designData = extractDesignData(nodeData);
        
        console.log('🎨 [FIGMA IMPORT] Extracted design data:', {
          type: designData.type,
          hasChildren: designData.children.length > 0,
          colors: designData.colors.length,
          texts: designData.texts.length,
        });
        
        return {
          success: true,
          componentName: input.componentName || nodeData.name || 'Figma Component',
          designData,
          rawNode: nodeData, // Include raw data for converter
        };
      } catch (error) {
        console.error('🎨 [FIGMA IMPORT] Failed to fetch component:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch Figma component data',
        });
      }
    }),
});

/**
 * Extract enhanced design information from Figma node
 */
function extractDesignData(node: any): any {
  const data = {
    type: node.type,
    name: node.name,
    bounds: node.absoluteBoundingBox || node.absoluteRenderBounds,
    backgroundColor: extractBackgroundColor(node),
    colors: extractColors(node),
    texts: extractTexts(node),
    children: [],
    layout: extractLayout(node),
    effects: extractEffects(node),
    
    // NEW: Enhanced CSS extraction
    styles: extractDetailedStyles(node),
    
    // NEW: Component hierarchy
    hierarchy: buildComponentHierarchy(node),
    
    // NEW: Animation potential analysis
    animationPotential: analyzeAnimationPotential(node),
  };
  
  // Enhanced child extraction with full properties
  if (node.children && Array.isArray(node.children)) {
    data.children = node.children.map((child: any) => ({
      type: child.type,
      name: child.name,
      bounds: child.absoluteBoundingBox,
      visible: child.visible !== false,
      opacity: child.opacity || 1,
      fills: child.fills,
      strokes: child.strokes,
      effects: child.effects,
      characters: child.type === 'TEXT' ? child.characters : undefined,
      style: child.type === 'TEXT' ? child.style : undefined,
      
      // NEW: Preserve layout constraints
      constraints: child.constraints,
      layoutAlign: child.layoutAlign,
      layoutGrow: child.layoutGrow,
    }));
  }
  
  return data;
}

function extractBackgroundColor(node: any): string {
  if (node.backgroundColor) {
    const { r, g, b, a = 1 } = node.backgroundColor;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }
  
  if (node.fills && Array.isArray(node.fills)) {
    const solidFill = node.fills.find((fill: any) => fill.type === 'SOLID' && fill.visible !== false);
    if (solidFill && solidFill.color) {
      const { r, g, b, a = 1 } = solidFill.color;
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${solidFill.opacity || a})`;
    }
  }
  
  return 'transparent';
}

function extractColors(node: any): string[] {
  const colors: string[] = [];
  
  // Extract from fills
  if (node.fills && Array.isArray(node.fills)) {
    node.fills.forEach((fill: any) => {
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b, a = 1 } = fill.color;
        colors.push(`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${fill.opacity || a})`);
      }
    });
  }
  
  // Extract from strokes
  if (node.strokes && Array.isArray(node.strokes)) {
    node.strokes.forEach((stroke: any) => {
      if (stroke.type === 'SOLID' && stroke.color) {
        const { r, g, b, a = 1 } = stroke.color;
        colors.push(`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${stroke.opacity || a})`);
      }
    });
  }
  
  // Recursively extract from children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      colors.push(...extractColors(child));
    });
  }
  
  return [...new Set(colors)]; // Remove duplicates
}

function extractTexts(node: any, texts: string[] = []): string[] {
  if (node.type === 'TEXT' && node.characters) {
    texts.push(node.characters);
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      extractTexts(child, texts);
    });
  }
  
  return texts;
}

function extractLayout(node: any): any {
  return {
    type: node.layoutMode || null,
    padding: node.paddingLeft ? {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0,
    } : null,
    spacing: node.itemSpacing || 0,
    alignment: {
      primary: node.primaryAxisAlignItems || null,
      counter: node.counterAxisAlignItems || null,
    },
  };
}

function extractEffects(node: any): any[] {
  if (!node.effects || !Array.isArray(node.effects)) {
    return [];
  }
  
  return node.effects.map((effect: any) => ({
    type: effect.type,
    visible: effect.visible !== false,
    radius: effect.radius,
    color: effect.color ? {
      r: Math.round((effect.color.r || 0) * 255),
      g: Math.round((effect.color.g || 0) * 255),
      b: Math.round((effect.color.b || 0) * 255),
      a: effect.color.a || 1,
    } : null,
    offset: effect.offset,
    spread: effect.spread,
  }));
}

/**
 * Extract detailed CSS-ready styles
 */
function extractDetailedStyles(node: any): Record<string, any> {
  const styles: Record<string, any> = {};
  
  // Position and dimensions
  if (node.absoluteBoundingBox) {
    styles.position = 'absolute';
    styles.left = node.absoluteBoundingBox.x;
    styles.top = node.absoluteBoundingBox.y;
    styles.width = node.absoluteBoundingBox.width;
    styles.height = node.absoluteBoundingBox.height;
  }
  
  // Rotation
  if (node.rotation) {
    styles.transform = `rotate(${node.rotation}deg)`;
  }
  
  // Border radius
  if (node.cornerRadius) {
    styles.borderRadius = node.cornerRadius;
  } else if (node.rectangleCornerRadii) {
    styles.borderRadius = node.rectangleCornerRadii.join('px ') + 'px';
  }
  
  // Blend mode
  if (node.blendMode && node.blendMode !== 'NORMAL') {
    styles.mixBlendMode = node.blendMode.toLowerCase().replace('_', '-');
  }
  
  // Constraints for responsive behavior
  if (node.constraints) {
    styles.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }
  
  return styles;
}

/**
 * Build component hierarchy tree
 */
function buildComponentHierarchy(node: any, depth: number = 0): any {
  const hierarchy: any = {
    id: node.id,
    type: node.type,
    name: node.name,
    depth,
  };
  
  if (node.children && node.children.length > 0) {
    hierarchy.children = node.children.map((child: any) => 
      buildComponentHierarchy(child, depth + 1)
    );
  }
  
  return hierarchy;
}

/**
 * Analyze animation potential
 */
function analyzeAnimationPotential(node: any): any {
  const potential = {
    hasText: false,
    hasShapes: false,
    hasImages: false,
    complexity: 'simple' as 'simple' | 'moderate' | 'complex',
    suggestedAnimations: [] as string[],
    elementCount: 0,
  };
  
  // Count elements recursively
  function countElements(n: any): number {
    let count = 1;
    if (n.children) {
      count += n.children.reduce((sum: number, child: any) => sum + countElements(child), 0);
    }
    return count;
  }
  
  potential.elementCount = countElements(node);
  
  // Analyze node types
  function analyzeTypes(n: any) {
    if (n.type === 'TEXT') {
      potential.hasText = true;
      potential.suggestedAnimations.push('text-reveal');
    }
    if (['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR'].includes(n.type)) {
      potential.hasShapes = true;
      potential.suggestedAnimations.push('shape-morph');
    }
    if (n.type === 'IMAGE') {
      potential.hasImages = true;
      potential.suggestedAnimations.push('image-fade');
    }
    
    if (n.children) {
      n.children.forEach(analyzeTypes);
    }
  }
  
  analyzeTypes(node);
  
  // Determine complexity
  if (potential.elementCount > 20) {
    potential.complexity = 'complex';
  } else if (potential.elementCount > 10) {
    potential.complexity = 'moderate';
  }
  
  // Add layout-based animations
  if (node.layoutMode === 'VERTICAL') {
    potential.suggestedAnimations.push('stagger-vertical');
  } else if (node.layoutMode === 'HORIZONTAL') {
    potential.suggestedAnimations.push('stagger-horizontal');
  }
  
  return potential;
}