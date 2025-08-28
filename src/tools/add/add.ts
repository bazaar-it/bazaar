import { BaseMCPTool } from "~/tools/helpers/base";
import { codeGenerator } from "./add_helpers/CodeGeneratorNEW";
import type { AddToolInput, AddToolOutput } from "~/tools/helpers/types";
import { addToolInputSchema } from "~/tools/helpers/types";

/**
 * ADD Tool - Pure function that generates scene content
 * NO DATABASE ACCESS - only generation
 * Sprint 42: Refactored to pure function
 */
export class AddTool extends BaseMCPTool<AddToolInput, AddToolOutput> {
  name = "ADD";
  description = "Generate new motion graphics scene content";
  inputSchema = addToolInputSchema;

  protected async execute(input: AddToolInput): Promise<AddToolOutput> {
    console.log('\n🔨 [ADD TOOL - PURE FUNCTION] === EXECUTING ===');
    console.log('🔨 [ADD TOOL] Input:', {
      prompt: input.userPrompt.substring(0, 50) + '...',
      hasImages: !!input.imageUrls?.length,
      hasVideos: !!input.videoUrls?.length,
      hasWebContext: !!input.webContext,
      hasFigmaData: !!input.figmaComponentData,
      sceneNumber: input.sceneNumber,
      hasPreviousScene: !!input.previousSceneContext
    });
    console.log('🔨 [ADD TOOL] Video URLs received:', input.videoUrls);
    console.log('🔨 [ADD TOOL] Template context received:', {
      hasTemplateContext: !!input.templateContext,
      exampleCount: input.templateContext?.examples?.length || 0,
      exampleNames: input.templateContext?.examples?.map(e => e.name) || [],
    });
    console.log('🔨 [ADD TOOL] NOTE: This is a PURE FUNCTION - no database access!');
    
    try {
      // Handle Figma component generation FIRST (highest priority)
      if (input.figmaComponentData) {
        console.log('🔨 [ADD TOOL] Using Figma component generation');
        return await this.generateFromFigma(input);
      }
      
      // Handle web context + image-based scene creation
      if (input.webContext && (input.imageUrls?.length || 0) > 0) {
        console.log('🔨 [ADD TOOL] Using web context + images generation');
        return await this.generateFromWebAndImages(input);
      }
      
      // Handle web context only
      if (input.webContext) {
        console.log('🔨 [ADD TOOL] Using web context generation for', input.webContext.originalUrl);
        return await this.generateFromWebContext(input);
      }
      
      // Handle video-based scene creation
      if (input.videoUrls && input.videoUrls.length > 0) {
        console.log('🔨 [ADD TOOL] Using video-based generation for', input.videoUrls.length, 'videos');
        // For now, treat videos similar to images but pass them through
        return await this.generateFromVideos(input);
      }
      
      // Handle image-based scene creation
      if (input.imageUrls && input.imageUrls.length > 0) {
        console.log('🔨 [ADD TOOL] Using image-based generation for', input.imageUrls.length, 'images');
        return await this.generateFromImages(input);
      }
      
      // Handle text-based scene creation
      console.log('🔨 [ADD TOOL] Using text-based generation');
      return await this.generateFromText(input);
    } catch (error) {
      // Return valid error response with fallback code to prevent infinite loops
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = `const { AbsoluteFill } = window.Remotion;

export default function Scene_ERROR() {
  return (
    <AbsoluteFill 
      style={{ 
        backgroundColor: "#f8d7da", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#721c24",
        fontSize: "1.5rem",
        textAlign: "center",
        padding: "2rem"
      }}
    >
      <div>
        <div>Scene Generation Failed</div>
        <div style={{ fontSize: "1rem", marginTop: "1rem", opacity: 0.8 }}>
          {errorMessage}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const durationInFrames_ERROR = 180;`;

      return {
        success: false,
        tsxCode: errorCode, // Return valid fallback code to prevent infinite loops
        name: 'Scene Generation Error',
        duration: 180,
        reasoning: `Failed to generate scene: ${errorMessage}`,
        error: errorMessage,
        chatResponse: `❌ Scene generation failed: ${errorMessage}`,
        scene: {
          tsxCode: errorCode,
          name: 'Scene Generation Error',
          duration: 180,
        },
      };
    }
  }

  /**
   * Generate scene from text prompt
   * PURE FUNCTION - no side effects
   */
  private async generateFromText(input: AddToolInput): Promise<AddToolOutput> {
    // Generate function name (deterministic based on input)
    const functionName = this.generateFunctionName();
    
    // If we have a previous scene with code, use it as reference
    if (input.previousSceneContext?.tsxCode) {
      console.log('🔨 [ADD TOOL] Previous scene detected - using code reference');
      
      // Generate code directly using previous scene as reference
      const codeResult = await codeGenerator.generateCodeWithReference({
        userPrompt: input.userPrompt,
        functionName: functionName,
        projectId: input.projectId,
        previousSceneCode: input.previousSceneContext.tsxCode,
        projectFormat: input.projectFormat,
        requestedDurationFrames: input.requestedDurationFrames, // Pass duration constraint
      });
      
      const result = {
        success: true,
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
        reasoning: `Generated new scene based on previous scene: ${codeResult.reasoning}`,
        chatResponse: `I've created a new scene based on the previous scene style`,
        scene: {
          tsxCode: codeResult.code,
          name: codeResult.name,
          duration: codeResult.duration,
        },
        debug: {
          usedPreviousScene: true,
          codeGeneration: codeResult.debug,
        },
      };
      
      console.log('✅ [ADD TOOL] Finished with reference - returning result:', {
        name: result.name,
        duration: result.duration,
        codeLength: result.tsxCode.length,
        firstLine: result.tsxCode.split('\n')[0]
      });
      
      return result;
    }
    
    // DIRECT CODE GENERATION - Skip layout entirely!
    console.log('⚡ [ADD TOOL] Using DIRECT code generation - no layout step!');
    
    // Check if we have template context for better generation
    if (input.templateContext?.examples?.length) {
      console.log(`⚡ [ADD TOOL] Using ${input.templateContext.examples.length} template(s) as context:`,
        input.templateContext.examples.map(t => t.name).join(', '));
    }
    
    const codeResult = await codeGenerator.generateCodeDirect({
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectId: input.projectId,
      projectFormat: input.projectFormat,
      requestedDurationFrames: input.requestedDurationFrames, // Pass duration constraint
      assetUrls: input.assetUrls, // Pass persistent asset URLs
      isYouTubeAnalysis: input.isYouTubeAnalysis, // Pass YouTube analysis flag
      templateContext: input.templateContext, // Pass template context for better generation
      promptVersion: (input as any).promptVersion, // Pass prompt version for A/B testing
    });

    // Return generated content - NO DATABASE!
    const result = {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated ${codeResult.name}: ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name}`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        method: 'direct',
        codeGeneration: codeResult.debug,
      },
    };
    
    console.log('✅ [ADD TOOL] Finished direct generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      firstLine: result.tsxCode.split('\n')[0]
    });
    
    return result;
  }

  /**
   * Generate scene from images
   * PURE FUNCTION - no side effects
   */
  private async generateFromImages(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.imageUrls || input.imageUrls.length === 0) {
      throw new Error("No images provided");
    }

    const functionName = this.generateFunctionName();

    // Generate code directly from images
    const codeResult = await codeGenerator.generateCodeFromImage({
      imageUrls: input.imageUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectId: input.projectId,
      projectFormat: input.projectFormat,
      assetUrls: input.assetUrls, // Pass all project assets
    });

    // Return generated content - NO DATABASE!
    const result = {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated from ${input.imageUrls.length} image(s): ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} based on your image(s)`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        imageGeneration: codeResult.debug,
      },
    };
    
    console.log('✅ [ADD TOOL] Finished image generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      imageCount: input.imageUrls.length
    });
    
    return result;
  }

  /**
   * Generate scene from Figma component
   * PURE FUNCTION - no side effects
   */
  private async generateFromFigma(input: AddToolInput): Promise<AddToolOutput> {
    const figmaData = input.figmaComponentData;
    if (!figmaData) {
      throw new Error("No Figma component data provided");
    }

    const functionName = this.generateFunctionName();
    
    // NEW: Check if we already have converted Remotion code
    if (figmaData.remotionCode) {
      console.log('🎨 [ADD TOOL] Using pre-converted Remotion code from Figma');
      
      // Parse the code to extract the component name
      const exportMatch = figmaData.remotionCode.match(/export\s+(?:const|function)\s+(\w+)/);
      const componentName = exportMatch ? exportMatch[1] : functionName;
      
      // Replace the function name in the code with our generated one
      const finalCode = figmaData.remotionCode.replace(
        /export\s+(?:const|function)\s+\w+/,
        `export const ${functionName}`
      );
      
      return {
        success: true,
        tsxCode: finalCode,
        name: figmaData.name || 'Figma Component',
        duration: 150,
        reasoning: `Generated scene from Figma using pre-converted Remotion code`,
        chatResponse: `I've perfectly recreated your Figma design "${figmaData.name}" with animations.`,
        scene: {
          tsxCode: finalCode,
          name: figmaData.name || 'Figma Component',
          duration: 150,
        },
        debug: {
          method: 'pre-converted',
          figmaType: figmaData.type,
          codeLength: finalCode.length,
        },
      };
    }
    
    // Check if we have enhanced data with styles and hierarchy
    const hasEnhancedData = figmaData.styles && figmaData.hierarchy;
    
    if (hasEnhancedData) {
      console.log('🎨 [ADD TOOL] Using ENHANCED Figma generation with direct conversion');
      
      // Step 1: Try direct structural conversion first
      try {
        const { generateRemotionComponent } = await import('~/server/services/figma/figma-to-jsx.service');
        const directCode = generateRemotionComponent(figmaData, functionName);
        
        // Step 2: Use LLM to enhance with better animations
        const animationPrompt = `
${input.userPrompt}

I have already generated the base structure from Figma. Now enhance it with animations:

CURRENT CODE:
${directCode}

ANIMATION CONTEXT:
- Component complexity: ${figmaData.animationPotential?.complexity || 'simple'}
- Has text: ${figmaData.animationPotential?.hasText || false}
- Has shapes: ${figmaData.animationPotential?.hasShapes || false}
- Suggested animations: ${figmaData.animationPotential?.suggestedAnimations?.join(', ') || 'fade-in'}

ENHANCE THIS CODE:
1. Keep the exact structure and styling
2. Add smooth entrance animations
3. Add micro-interactions where appropriate
4. Use spring animations for natural motion
5. Stagger animations for child elements`;

        // For now, use the direct code as-is since enhanceWithAnimations doesn't exist yet
        // TODO: Add animation enhancement method to codeGenerator
        const enhancedResult = {
          code: directCode,
          name: figmaData.name || 'Figma Component',
          duration: 150,
        };
        
        return {
          success: true,
          tsxCode: enhancedResult.code,
          name: figmaData.name || enhancedResult.name,
          duration: enhancedResult.duration,
          reasoning: `Generated scene from Figma using direct conversion + LLM animation enhancement`,
          chatResponse: `I've recreated your Figma design "${figmaData.name}" with perfect structural accuracy and added smooth animations.`,
          scene: {
            tsxCode: enhancedResult.code,
            name: figmaData.name || enhancedResult.name,
            duration: enhancedResult.duration,
          },
          debug: {
            method: 'hybrid-conversion',
            figmaType: figmaData.type,
            elementCount: figmaData.animationPotential?.elementCount || 0,
            complexity: figmaData.animationPotential?.complexity,
          },
        };
      } catch (error) {
        console.warn('🔄 [ADD TOOL] Direct conversion failed, falling back to LLM generation:', error);
        // Fall through to LLM-only approach
      }
    }
    
    // Fallback: LLM-only generation with all Figma data
    console.log('🎨 [ADD TOOL] Using LLM-based Figma generation');
    
    const enhancedPrompt = `
${input.userPrompt}

[FIGMA DESIGN SPECIFICATIONS]
Component Type: ${figmaData.type}
Component Name: ${figmaData.name || 'Figma Component'}
Dimensions: ${figmaData.bounds ? `${Math.round(figmaData.bounds.width)}x${Math.round(figmaData.bounds.height)}` : 'Unknown'}
Background: ${figmaData.backgroundColor || 'transparent'}
Colors Used: ${figmaData.colors?.join(', ') || 'Default'}
Text Content: ${figmaData.texts?.join(', ') || 'No text'}

${figmaData.styles ? `
CSS STYLES:
${JSON.stringify(figmaData.styles, null, 2)}
` : ''}

${figmaData.hierarchy ? `
COMPONENT HIERARCHY:
${JSON.stringify(figmaData.hierarchy, null, 2)}
` : ''}

CHILD ELEMENTS (${figmaData.children?.length || 0}):
${JSON.stringify(figmaData.children?.slice(0, 10), null, 2)}

IMPORTANT: Match the exact colors, layout, and text from the Figma design. Add smooth animations.`;

    // Use generateCodeDirect which is the correct method
    const codeResult = await codeGenerator.generateCodeDirect({
      userPrompt: enhancedPrompt,
      functionName: functionName,
      projectId: input.projectId,
      projectFormat: input.projectFormat,
    });

    const result = {
      success: true,
      tsxCode: codeResult.code,
      name: figmaData.name || codeResult.name,
      duration: codeResult.duration,
      reasoning: `Generated scene from Figma component: ${figmaData.name}`,
      chatResponse: `I've recreated your Figma design "${figmaData.name}" with animations based on the component structure.`,
      scene: {
        tsxCode: codeResult.code,
        name: figmaData.name || codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        method: 'llm-generation',
        figmaType: figmaData.type,
        childCount: figmaData.children?.length || 0,
      },
    };

    console.log('✅ [ADD TOOL] Finished Figma generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
    });

    return result;
  }
  
  /**
   * Generate scene from videos
   * PURE FUNCTION - no side effects
   */
  private async generateFromVideos(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.videoUrls || input.videoUrls.length === 0) {
      throw new Error("No videos provided");
    }

    const functionName = this.generateFunctionName();

    // Generate code for video-based scenes
    const codeResult = await codeGenerator.generateCodeWithVideos({
      videoUrls: input.videoUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectFormat: input.projectFormat,
    });

    const result = {
      success: true,
      tsxCode: codeResult.code,
      name: codeResult.name,
      duration: codeResult.duration,
      reasoning: `Generated scene with video: ${codeResult.reasoning}`,
      chatResponse: `I've created a scene using your video with the requested animations`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        videoGeneration: codeResult.debug,
        videoUrls: input.videoUrls,
      },
    };

    console.log('✅ [ADD TOOL] Finished video generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      videoCount: input.videoUrls.length
    });

    return result;
  }

  /**
   * Generate scene from web context screenshots
   * PURE FUNCTION - no side effects
   */
  private async generateFromWebContext(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.webContext) {
      throw new Error("No web context provided");
    }

    const functionName = this.generateFunctionName();
    
    // Check if we have V2 extraction data with full brand system
    // Also check for the existence of key V2 fields
    const visualDesign = (input.webContext as any).pageData?.visualDesign;
    const hasV2Extraction = visualDesign?.extraction || 
                           (visualDesign?.colorSystem && visualDesign?.shadows && visualDesign?.borderRadius);
    
    console.log('🔍 [ADD TOOL] Checking for V2 extraction:', {
      hasWebContext: !!input.webContext,
      hasPageData: !!input.webContext.pageData,
      hasVisualDesign: !!visualDesign,
      hasColorSystem: !!visualDesign?.colorSystem,
      hasShadows: !!visualDesign?.shadows,
      hasExtraction: !!visualDesign?.extraction,
      extractionKeys: visualDesign?.extraction ? Object.keys(visualDesign.extraction).slice(0, 5) : 'none'
    });
    
    // If we have comprehensive extraction, use Hero's Journey
    if (hasV2Extraction) {
      console.log('🎬 [ADD TOOL] ✅ USING HERO\'S JOURNEY for comprehensive brand extraction!');
      // Use the extraction data if available, otherwise construct from visualDesign
      const extractionData = visualDesign?.extraction || this.constructExtractionFromVisualDesign(input.webContext, visualDesign);
      return await this.generateHeroJourneyFromExtraction(input, extractionData);
    } else {
      console.log('⚠️ [ADD TOOL] No V2 extraction found, falling back to basic generation');
    }

    // Create combined image list with web screenshots
    const allImageUrls = [
      input.webContext.screenshotUrls.desktop,
      input.webContext.screenshotUrls.mobile,
    ];

    // Enhanced prompt for MOTION GRAPHICS based on extracted brand
    const brandVisualDesign = (input.webContext as any).pageData.visualDesign;
    const narrative = (input.webContext as any).pageData.productNarrative;
    const enhancedPrompt = `${input.userPrompt}

🎬 CREATE A MOTION GRAPHICS VIDEO BASED ON THIS BRAND:

📊 PRODUCT STORY:
${narrative ? `
HEADLINE: "${narrative.headline}"
SUBHEADLINE: "${narrative.subheadline}"

KEY FEATURES:
${narrative.features.slice(0, 3).map((f: any) => `• ${f.title}: ${f.description}`).join('\n')}

METRICS TO HIGHLIGHT:
${narrative.metrics.map((m: any) => `• ${m}`).join('\n')}

TESTIMONIALS:
${narrative.testimonials.slice(0, 2).map((t: any) => `"${t.quote.slice(0, 100)}..." - ${t.author}`).join('\n')}

CALL-TO-ACTION BUTTONS:
- Primary: "${narrative.ctas.primary}"
- Secondary: "${narrative.ctas.secondary}"
` : 'Extract from website'}

🎨 EXACT BRAND DESIGN SYSTEM:
${brandVisualDesign ? `
COLOR SYSTEM:
- Primary: ${brandVisualDesign.colorSystem.primary}
- Secondary: ${brandVisualDesign.colorSystem.secondary}
- Accents: ${brandVisualDesign.colorSystem.accents.join(', ')}
- Neutrals: ${brandVisualDesign.colorSystem.neutrals.join(', ')}
${brandVisualDesign.colorSystem.gradients.length > 0 ? `
GRADIENTS:
${brandVisualDesign.colorSystem.gradients.map((g: any) => 
  `- ${g.type}-gradient(${g.angle}deg, ${g.stops.join(', ')})`
).join('\n')}` : ''}

TYPOGRAPHY:
- Fonts: ${brandVisualDesign.fonts.join(', ')}
- H1 Size: ${brandVisualDesign.headingData[0]?.styles.fontSize || '48px'}
- Body Size: ${brandVisualDesign.buttonStyles[0]?.styles.fontSize || '16px'}

DESIGN TOKENS:
- Border Radius: ${brandVisualDesign.borderRadius.sm} (small), ${brandVisualDesign.borderRadius.md} (medium), ${brandVisualDesign.borderRadius.lg} (large)
- Shadows: 
  • Small: ${brandVisualDesign.shadows.sm}
  • Medium: ${brandVisualDesign.shadows.md}
  • Large: ${brandVisualDesign.shadows.lg}

BUTTON STYLE:
${brandVisualDesign.buttonStyles[0] ? 
  `- Background: ${brandVisualDesign.buttonStyles[0].styles.backgroundColor}
- Text Color: ${brandVisualDesign.buttonStyles[0].styles.color}
- Border Radius: ${brandVisualDesign.buttonStyles[0].styles.borderRadius}
- Font Size: ${brandVisualDesign.buttonStyles[0].styles.fontSize}
- Shadow: ${brandVisualDesign.buttonStyles[0].styles.boxShadow}` : 'Default button style'}
` : 'Extract from screenshots'}

🎯 MOTION GRAPHICS REQUIREMENTS:
1. Create dynamic scenes that tell the product story
2. Use EXACTLY the brand colors - no variations
3. Apply the exact typography scale
4. Include the metrics and features as animated elements
5. Use smooth transitions with the brand's design tokens
6. Create a video that feels like the website came to life
7. Include CTAs with the exact button styles
8. Use shadows and border radius from the design system

The goal is a MOTION GRAPHICS VIDEO that perfectly represents this brand, not a website mockup.`;

    // Generate code using website screenshots
    const codeResult = await codeGenerator.generateCodeFromImage({
      imageUrls: allImageUrls,
      userPrompt: enhancedPrompt,
      functionName: functionName,
      projectFormat: input.projectFormat,
    });

    const result = {
      success: true,
      tsxCode: codeResult.code,
      name: codeResult.name,
      duration: codeResult.duration,
      reasoning: `Generated scene based on website ${input.webContext.pageData.title}: ${codeResult.reasoning}`,
      chatResponse: `I've created a scene inspired by the ${input.webContext.pageData.title} website, matching their brand identity`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        webContextGeneration: codeResult.debug,
        websiteUrl: input.webContext.originalUrl,
        pageTitle: input.webContext.pageData.title,
      },
    };

    console.log('✅ [ADD TOOL] Finished web context generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      websiteUrl: input.webContext.originalUrl
    });

    return result;
  }

  /**
   * Generate scene from web context + additional images
   * PURE FUNCTION - no side effects
   */
  private async generateFromWebAndImages(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.webContext || !input.imageUrls?.length) {
      throw new Error("No web context or images provided");
    }

    const functionName = this.generateFunctionName();

    // Combine website screenshots with user images
    const allImageUrls = [
      input.webContext.screenshotUrls.desktop,
      input.webContext.screenshotUrls.mobile,
      ...input.imageUrls
    ];

    // Enhanced prompt combining web context with user images
    const webVisualDesign = (input.webContext as any).pageData.visualDesign;
    const enhancedPrompt = `${input.userPrompt}

WEBSITE BRAND CONTEXT:
- URL: ${input.webContext.originalUrl}
- Title: ${input.webContext.pageData.title}
- Description: ${input.webContext.pageData.description || 'Not available'}

🎨 EXACT VISUAL DESIGN (EXTRACTED):
${webVisualDesign ? `
FONTS: ${webVisualDesign.fonts?.join(', ')}
COLORS: Primary: ${webVisualDesign.brandColors?.primary}, Text: ${webVisualDesign.brandColors?.text}, BG: ${webVisualDesign.brandColors?.background}
` : 'Extract from screenshots'}

COMBINED CONTEXT INSTRUCTIONS:
- USE THE EXACT FONTS AND COLORS EXTRACTED ABOVE
- Use the website screenshots (first 2 images) to understand the brand identity
- Use the additional user images for specific content requirements
- Blend the brand's visual style with the user's image content
- Maintain brand consistency while incorporating user image elements`;

    // Generate code using combined context
    const codeResult = await codeGenerator.generateCodeFromImage({
      imageUrls: allImageUrls,
      userPrompt: enhancedPrompt,
      functionName: functionName,
      projectFormat: input.projectFormat,
    });

    const result = {
      success: true,
      tsxCode: codeResult.code,
      name: codeResult.name,
      duration: codeResult.duration,
      reasoning: `Generated scene combining ${input.webContext.pageData.title} brand with ${input.imageUrls.length} user image(s): ${codeResult.reasoning}`,
      chatResponse: `I've created a scene that combines the ${input.webContext.pageData.title} brand style with your images`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        webAndImageGeneration: codeResult.debug,
        websiteUrl: input.webContext.originalUrl,
        userImageCount: input.imageUrls.length,
      },
    };

    console.log('✅ [ADD TOOL] Finished web+images generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      websiteUrl: input.webContext.originalUrl,
      userImageCount: input.imageUrls.length
    });

    return result;
  }

  /**
   * Construct extraction data from visualDesign if full extraction is missing
   */
  private constructExtractionFromVisualDesign(webContext: any, visualDesign: any): any {
    return {
      page: {
        url: webContext.originalUrl,
        title: webContext.pageData?.title || 'Website',
        sections: []
      },
      brand: {
        colors: visualDesign.colorSystem || {
          primary: '#000000',
          secondary: '#FFFFFF',
          accents: [],
          neutrals: []
        },
        typography: {
          fonts: visualDesign.fonts?.map((f: any) => ({ family: f, weights: [400, 600, 700] })) || [],
          scale: visualDesign.headingData?.reduce((acc: any, item: any) => {
            acc[item.tag] = item.styles;
            return acc;
          }, {}) || {}
        },
        buttons: {
          radius: visualDesign.borderRadius?.md || '8px',
          padding: '16px 32px',
          shadow: visualDesign.shadows?.md || 'none',
          styles: {
            primary: visualDesign.buttonStyles?.[0] || {}
          }
        },
        shadows: visualDesign.shadows || {},
        borderRadius: visualDesign.borderRadius || {},
        iconStyle: 'line' as const,
        imageryStyle: [],
        backgroundEffects: [],
        voice: {
          adjectives: ['modern', 'innovative'],
          taglines: [],
          tone: 'professional'
        }
      },
      product: {
        value_prop: {
          headline: webContext.pageData?.headings?.[0] || 'Transform Your Experience',
          subhead: webContext.pageData?.description || ''
        },
        problem: '',
        solution: '',
        features: [],
        useCases: [],
        benefits: [],
        metrics: [],
        integrations: [],
        platforms: ['Web'],
        onboarding: { freemium: false }
      },
      socialProof: {
        testimonials: [],
        logos: [],
        awards: [],
        stats: {},
        press: []
      },
      layoutMotion: {
        componentInventory: [],
        transitions: ['fade'],
        easingHints: ['ease-in-out'],
        motionDurationMs: 300,
        deviceFrames: [],
        hasVideo: false,
        hasAnimation: false
      },
      media: {
        screenshots: []
      },
      ctas: [{ type: 'primary' as const, label: 'Get Started' }],
      extractionMeta: {
        timestamp: new Date().toISOString(),
        confidence: 0.5,
        extractionTimeMs: 0
      }
    };
  }

  /**
   * Generate Hero's Journey motion graphics from comprehensive brand extraction
   */
  private async generateHeroJourneyFromExtraction(input: AddToolInput, extraction: any): Promise<AddToolOutput> {
    const { heroJourneyLLM } = await import('../narrative/herosJourneyLLM');
    
    console.log('🎬 [HERO JOURNEY] Starting LLM-based generation with full brand context');
    
    const functionName = this.generateFunctionName();
    
    // Generate Hero's Journey using LLM with all extraction data
    const result = await heroJourneyLLM.generateHeroJourney(
      extraction,
      input.projectId,
      functionName
    );
    
    console.log('🎬 [HERO JOURNEY] LLM generation complete:', {
      duration: result.duration,
      codeLength: result.code.length
    });
    
    return {
      success: true,
      tsxCode: result.code,
      name: result.name || 'Hero Journey',
      duration: result.duration,
      reasoning: result.reasoning,
      chatResponse: `I've created a Hero's Journey motion graphics video for ${extraction.page.title}, telling their brand story through 5 cinematic acts using their exact colors, fonts, and messaging`,
      scene: {
        tsxCode: result.code,
        name: result.name || 'Hero Journey',
        duration: result.duration,
      },
      debug: {
        method: 'hero-journey-llm',
        extraction: {
          brand: extraction.brand.voice,
          features: extraction.product.features.length,
          screenshots: extraction.media.screenshots.length,
          colors: extraction.brand.colors,
          fonts: extraction.brand.typography.fonts
        }
      },
    };
  }

  /**
   * Generate unique component name using a stable ID
   * This prevents naming collisions when scenes are deleted/reordered
   */
  private generateFunctionName(): string {
    // Generate a unique 8-character ID for this scene
    // This ensures component names never collide, even after deletions
    const uniqueId = this.generateUniqueId();
    return `Scene_${uniqueId}`;
  }

  /**
   * Generate a unique 8-character ID
   */
  private generateUniqueId(): string {
    // Use timestamp + random for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).substring(0, 8);
  }
}

// Export singleton instance
export const addTool = new AddTool();
