/**
 * Hero's Journey V2 - Motion Graphics Story Arc Generator
 * 
 * Takes comprehensive brand extraction (BrandJSONV2) and creates
 * an engaging narrative video with specific scenes, visuals, and UI elements.
 * 
 * Key difference from V1: Uses the actual extracted content from websites
 * rather than imagining generic content.
 */

import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import type { BrandJSONV2 } from "~/server/services/brand/BrandAnalyzerV2";

export interface HeroJourneyScene {
  id: string;
  title: string;
  duration: number; // in frames (30fps)
  narrative: string; // What happens in this scene
  
  // Visual Elements
  visuals: {
    background: string; // Color or gradient from brand
    elements: string[]; // Specific UI elements to show
    animations: string[]; // Animation types to apply
    transitions: string; // How to transition to next scene
  };
  
  // Text Content
  text: {
    headline?: string; // Main text to display
    subheadline?: string; // Supporting text
    bodyText?: string[]; // Additional text elements
    cta?: string; // Call to action if applicable
  };
  
  // UI Components (from extraction)
  uiElements: {
    buttons?: any[]; // Actual button styles from site
    cards?: any[]; // Card components from site
    icons?: string[]; // Icons to include
    stats?: any[]; // Stats/metrics to display
  };
  
  // Brand Application
  styling: {
    colors: {
      primary: string;
      secondary: string;
      accent?: string;
    };
    typography: {
      font: string;
      weight: string;
    };
  };
  
  // Template Selection
  template: {
    name: string; // Which template to use
    variant?: string; // Template variant if applicable
    capabilities: string[]; // Required capabilities
  };
  
  emotionalBeat: 'problem' | 'tension' | 'discovery' | 'transformation' | 'triumph' | 'invitation';
}

export interface StoryArc {
  title: string;
  totalDuration: number;
  narrativeStructure: string;
  scenes: HeroJourneyScene[];
  brandContext: {
    name: string;
    tagline: string;
    mainProblem: string;
    mainSolution: string;
    keyFeatures: string[];
  };
}

export class HeroJourneyV2 {
  
  /**
   * Generate a complete story arc from brand extraction
   */
  async generateStoryArc(
    brandJSON: BrandJSONV2,
    options: {
      sceneCount?: number;
      totalDurationSeconds?: number;
      style?: 'dramatic' | 'energetic' | 'professional' | 'playful';
    } = {}
  ): Promise<StoryArc> {
    
    const { 
      sceneCount = 5, 
      totalDurationSeconds = 15,
      style = 'professional' 
    } = options;
    
    const totalFrames = totalDurationSeconds * 30; // 30fps
    
    // Extract all the rich content from the visual analysis
    const visualAnalysis = brandJSON.visualAnalysis || {};
    const textContent = visualAnalysis['TEXT_CONTENT'] || {};
    const brandIdentity = visualAnalysis['BRAND_IDENTITY'] || {};
    const features = visualAnalysis['FEATURES_BENEFITS'] || {};
    const uiComponents = visualAnalysis['UI_COMPONENTS'] || {};
    const visualDesign = visualAnalysis['VISUAL_DESIGN'] || {};
    const socialProof = visualAnalysis['SOCIAL_PROOF'] || {};
    const sections = visualAnalysis['SECTIONS_IDENTIFIED'] || [];
    
    // Select narrative structure based on brand
    const narrativeStructure = this.selectNarrativeStructure(brandJSON)!; // Always returns a structure
    
    // Build comprehensive prompt with ALL the extracted data
    const prompt = `
You are creating a ${sceneCount}-scene story arc for a ${totalDurationSeconds}-second motion graphics video.
This video should faithfully represent the actual website content - "film the website, don't imagine it."

NARRATIVE STRUCTURE: ${narrativeStructure.name}
STYLE: ${style}

====================
EXTRACTED WEBSITE DATA (USE THIS EXACT CONTENT)
====================

BRAND IDENTITY:
${JSON.stringify(brandIdentity, null, 2)}

TEXT CONTENT (USE THESE EXACT HEADLINES):
${JSON.stringify(textContent, null, 2)}

FEATURES & BENEFITS (SHOWCASE THESE):
${JSON.stringify(features, null, 2)}

UI COMPONENTS (REFERENCE THESE EXACT ELEMENTS):
${JSON.stringify(uiComponents, null, 2)}

VISUAL DESIGN (USE THESE EXACT COLORS/STYLES):
${JSON.stringify(visualDesign, null, 2)}

SOCIAL PROOF (INCLUDE THESE STATS):
${JSON.stringify(socialProof, null, 2)}

WEBSITE SECTIONS:
${JSON.stringify(sections, null, 2)}

====================
REQUIREMENTS
====================

Create ${sceneCount} scenes following the "${narrativeStructure.name}" structure.
Total duration: ${totalFrames} frames (${totalDurationSeconds} seconds at 30fps)

For EACH scene, provide:

1. "id": Unique scene identifier (e.g., "scene_1_problem")
2. "title": Scene title matching the narrative beat
3. "duration": Duration in frames (must total ${totalFrames})
4. "narrative": What happens in this scene (1-2 sentences)

5. "visuals": {
   "background": Use EXACT color from visual design (e.g., "#FF7F00" not "orange")
   "elements": List SPECIFIC UI elements from the extraction to show
   "animations": ["fadeIn", "slideUp", "scale", etc.]
   "transitions": "crossfade" | "wipe" | "morph" | "zoom"
}

6. "text": {
   "headline": Use EXACT text from extraction (don't make up new text)
   "subheadline": Use EXACT subheadline from extraction
   "bodyText": Array of exact text snippets from site
   "cta": Use EXACT button label from extraction
}

7. "uiElements": {
   "buttons": Include actual button data from extraction
   "cards": Include actual card content from extraction
   "icons": List specific icons mentioned in extraction
   "stats": Include exact stats from social proof
}

8. "styling": {
   "colors": Use EXACT hex codes from visual design
   "typography": Use EXACT font family from extraction
}

9. "template": {
   "name": Choose appropriate template for this content type
   "variant": Template variant if needed
   "capabilities": ["text", "animation", "particles", etc.]
}

10. "emotionalBeat": Match the narrative structure

CRITICAL RULES:
- USE ONLY CONTENT FROM THE EXTRACTION - don't imagine new content
- USE EXACT TEXT - don't rewrite headlines or CTAs
- USE EXACT COLORS - use the hex codes provided
- USE EXACT STATS - don't make up numbers
- REFERENCE REAL UI ELEMENTS - use what's actually on the site

The ${narrativeStructure.name} structure should have these beats:
${narrativeStructure.acts.map((act, i) => `Scene ${i + 1}: ${act}`).join('\n')}

Return a complete JSON object with all scenes.`;

    try {
      const modelConfig = getModel("codeGenerator");
      console.log('🎬 Generating story arc with model:', modelConfig.model);
      
      // Add explicit JSON instruction for Anthropic models
      const systemMessage = modelConfig.provider === 'anthropic' 
        ? "You are a motion graphics director creating story arcs from actual website content. Never make up content - only use what's provided in the extraction. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Start your response with { and end with }."
        : "You are a motion graphics director creating story arcs from actual website content. Never make up content - only use what's provided in the extraction. Always return valid JSON without markdown formatting.";
      
      const response = await AIClientService.generateResponse(
        modelConfig,
        [
          { 
            role: "system", 
            content: systemMessage
          },
          { role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY the JSON object, no markdown, no code blocks, no additional text." }
        ],
        undefined,
        modelConfig.provider === 'openai' ? { responseFormat: { type: "json_object" } } : undefined
      );

      console.log('📥 Raw response length:', response.content?.length);
      console.log('📥 Response starts with:', response.content?.substring(0, 50));

      // Clean the response - remove markdown code blocks if present
      let cleanedContent = response.content || '{}';
      
      // More aggressive cleaning for various markdown formats
      if (cleanedContent.includes('```')) {
        console.log('⚠️ Cleaning markdown blocks from response');
        // Match any code block with optional language specifier
        cleanedContent = cleanedContent.replace(/```(?:json)?\s*\n?/gi, '');
        cleanedContent = cleanedContent.replace(/```\s*/g, '');
      }
      
      // Remove any leading/trailing non-JSON content
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }
      
      // Trim whitespace
      cleanedContent = cleanedContent.trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleanedContent);
        console.log('✅ Successfully parsed JSON with', parsed.scenes?.length || 0, 'scenes');
      } catch (parseError) {
        console.error('❌ Failed to parse cleaned content:', cleanedContent.substring(0, 200));
        console.error('❌ Full cleaned content for debugging:', cleanedContent);
        throw new Error(`JSON parsing failed: ${parseError}`);
      }
      
      const scenes = parsed.scenes || [];
      
      // Validate and enhance scenes
      const enhancedScenes = this.enhanceScenes(scenes, brandJSON);
      
      return {
        title: `${brandJSON.brand?.name || 'Brand'} Story`,
        totalDuration: totalFrames,
        narrativeStructure: narrativeStructure.name,
        scenes: enhancedScenes,
        brandContext: {
          name: brandJSON.brand?.name || brandIdentity['company_product_name'] || '',
          tagline: textContent['main_headline'] || brandIdentity['tagline_value_proposition'] || '',
          mainProblem: features['pain_points']?.[0] || 'Challenge',
          mainSolution: features['value_propositions']?.[0] || 'Solution',
          keyFeatures: features['features']?.map((f: any) => f.title) || []
        }
      };
      
    } catch (error) {
      console.error('❌ Story arc generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Select the best narrative structure based on brand analysis
   */
  private selectNarrativeStructure(brandJSON: BrandJSONV2) {
    const structures = [
      {
        name: "Problem-Solution Flow",
        acts: ["The Problem", "Why It Matters", "Our Solution", "See It Work", "Get Started"],
        bestFor: "tech products, SaaS, tools"
      },
      {
        name: "Feature Showcase",
        acts: ["Introduction", "Feature 1", "Feature 2", "Feature 3", "Call to Action"],
        bestFor: "feature-rich products"
      },
      {
        name: "Customer Journey",
        acts: ["Before", "Discovery", "Implementation", "Results", "Your Turn"],
        bestFor: "service-based, customer-focused"
      },
      {
        name: "Build Momentum",
        acts: ["Start Slow", "Gain Speed", "Accelerate", "Peak Energy", "Sustain"],
        bestFor: "energetic brands, startups"
      },
      {
        name: "Trust Building",
        acts: ["Credibility", "Expertise", "Social Proof", "Demonstration", "Partnership"],
        bestFor: "enterprise, B2B"
      }
    ];
    
    // Analyze brand to pick best structure
    const visualAnalysis = brandJSON.visualAnalysis || {};
    const features = visualAnalysis['FEATURES_BENEFITS']?.features || [];
    const brandPersonality = visualAnalysis['BRAND_IDENTITY']?.['brand_personality'] || '';
    
    let selected;
    
    if (features.length >= 3) {
      selected = structures.find(s => s.name === "Feature Showcase");
    } else if (brandPersonality.includes('professional') || brandPersonality.includes('enterprise')) {
      selected = structures.find(s => s.name === "Trust Building");
    } else if (brandPersonality.includes('innovative') || brandPersonality.includes('modern')) {
      selected = structures.find(s => s.name === "Build Momentum");
    } else {
      selected = structures.find(s => s.name === "Problem-Solution Flow");
    }
    
    return selected || structures[0];
  }
  
  /**
   * Enhance scenes with additional styling and validation
   */
  private enhanceScenes(scenes: any[], brandJSON: BrandJSONV2): HeroJourneyScene[] {
    const colors = brandJSON.design?.colors || {};
    const typography = brandJSON.design?.typography || {};
    
    // Extract font from visual analysis or typography object
    const primaryFont = brandJSON.visualAnalysis?.['VISUAL_DESIGN']?.typography?.font_family || 
                       (typeof typography === 'object' && 'primary' in typography ? typography.primary : null) ||
                       'Inter';
    
    return scenes.map((scene, index) => ({
      ...scene,
      id: scene.id || `scene_${index + 1}`,
      
      // Ensure proper styling fallbacks
      styling: {
        colors: {
          primary: scene.styling?.colors?.primary || colors.primary || '#000000',
          secondary: scene.styling?.colors?.secondary || colors.secondary || '#ffffff',
          accent: scene.styling?.colors?.accent || colors.accent
        },
        typography: {
          font: scene.styling?.typography?.font || primaryFont,
          weight: scene.styling?.typography?.weight || '400'
        }
      },
      
      // Ensure template is specified
      template: scene.template || this.selectTemplateForScene(scene),
      
      // Validate duration
      duration: Math.max(30, scene.duration || 90) // Minimum 1 second per scene
    }));
  }
  
  /**
   * Select appropriate template based on scene content
   */
  private selectTemplateForScene(scene: any) {
    // Analyze scene content to pick best template
    const hasStats = scene.uiElements?.stats?.length > 0;
    const hasFeatures = scene.text?.headline?.toLowerCase().includes('feature');
    const hasCTA = scene.text?.cta;
    const emotionalBeat = scene.emotionalBeat;
    
    if (hasStats) {
      return {
        name: 'stats-showcase',
        variant: 'animated-counters',
        capabilities: ['numbers', 'animations', 'charts']
      };
    }
    
    if (hasFeatures) {
      return {
        name: 'feature-cards',
        variant: 'grid-layout',
        capabilities: ['cards', 'icons', 'text']
      };
    }
    
    if (hasCTA) {
      return {
        name: 'cta-focus',
        variant: 'centered',
        capabilities: ['button', 'text', 'particles']
      };
    }
    
    if (emotionalBeat === 'problem') {
      return {
        name: 'problem-visualization',
        variant: 'dark-mood',
        capabilities: ['text', 'shapes', 'transitions']
      };
    }
    
    // Default
    return {
      name: 'text-focus',
      variant: 'minimal',
      capabilities: ['text', 'animations']
    };
  }
  
  /**
   * Generate edit instructions for each scene
   * This connects each scene to the actual edit tool
   */
  async generateEditInstructions(
    storyArc: StoryArc
  ): Promise<Array<{ scene: HeroJourneyScene; editPrompt: string }>> {
    
    return storyArc.scenes.map(scene => ({
      scene,
      editPrompt: this.buildEditPrompt(scene)
    }));
  }
  
  /**
   * Build edit prompt for a specific scene
   */
  private buildEditPrompt(scene: HeroJourneyScene): string {
    return `
Edit the current scene to match this specification:

SCENE: ${scene.title}
DURATION: ${scene.duration} frames
EMOTIONAL BEAT: ${scene.emotionalBeat}

VISUAL REQUIREMENTS:
- Background: ${scene.visuals.background}
- Elements to show: ${scene.visuals.elements.join(', ')}
- Animations: ${scene.visuals.animations.join(', ')}
- Transition: ${scene.visuals.transitions}

TEXT TO DISPLAY:
${scene.text.headline ? `Headline: "${scene.text.headline}"` : ''}
${scene.text.subheadline ? `Subheadline: "${scene.text.subheadline}"` : ''}
${scene.text.cta ? `CTA: "${scene.text.cta}"` : ''}

STYLING:
- Primary Color: ${scene.styling.colors.primary}
- Secondary Color: ${scene.styling.colors.secondary}
- Font: ${scene.styling.typography.font}

TEMPLATE: Use the "${scene.template.name}" template with ${scene.template.variant || 'default'} variant.

Make this scene feel ${scene.emotionalBeat === 'problem' ? 'tense and challenging' : 
                      scene.emotionalBeat === 'discovery' ? 'hopeful and exciting' :
                      scene.emotionalBeat === 'transformation' ? 'dynamic and powerful' :
                      scene.emotionalBeat === 'triumph' ? 'celebratory and successful' :
                      'inviting and actionable'}.
`;
  }
}

// Export singleton instance
export const heroJourneyV2 = new HeroJourneyV2();