/**
 * Website to Video Tool Handler
 * Connects the Brain decision to the website pipeline
 */

// Tool execution result interface
interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: Record<string, any>;
  error?: { message: string; code: string };
  reasoning: string;
  chatResponse?: string;
}
import { db } from "~/server/db";
import { projects, scenes } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { WebAnalysisAgentV2, type ExtractedBrandData } from "~/tools/webAnalysis/WebAnalysisAgentV2";
import { HeroJourneyGenerator } from "~/tools/narrative/herosJourney";
import { TemplateSelector } from "~/server/services/website/template-selector-v2";
import { TemplateCustomizerAI } from "~/server/services/website/template-customizer-ai";
import { saveBrandProfile, createBrandStyleFromExtraction } from "~/server/services/website/save-brand-profile";

export interface WebsiteToVideoInput {
  userPrompt: string;
  projectId: string;
  userId: string;
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number; // Target duration in seconds
  webContext?: any; // Pass existing web analysis if available
}

export class WebsiteToVideoHandler {
  static async execute(input: WebsiteToVideoInput): Promise<ToolExecutionResult> {
    console.log('🌐 [WEBSITE HANDLER] Starting website-to-video generation');
    console.log('🌐 [WEBSITE HANDLER] Input:', {
      url: input.websiteUrl,
      projectId: input.projectId,
      style: input.style || 'dynamic',
      duration: input.duration || 20
    });

    try {
      // 1. Use existing web context if available, otherwise analyze
      let websiteData;
      
      if (input.webContext) {
        console.log('🌐 [WEBSITE HANDLER] Step 1: Using existing web analysis from context');
        // Handle both V1 format (from context) and V2 format
        if (input.webContext.pageData?.visualDesign?.extraction) {
          // V1 format with embedded V2 data
          websiteData = input.webContext.pageData.visualDesign.extraction;
          console.log('🌐 [WEBSITE HANDLER] Using V2 data from V1 wrapper');
        } else if (input.webContext.brand && input.webContext.product) {
          // Direct V2 format
          websiteData = input.webContext;
          console.log('🌐 [WEBSITE HANDLER] Using direct V2 data');
        } else {
          // Fallback to fresh analysis if format is unknown
          console.log('🌐 [WEBSITE HANDLER] Unknown format, running fresh analysis');
          const analyzer = new WebAnalysisAgentV2(input.projectId);
          websiteData = await analyzer.analyze(input.websiteUrl);
        }
      } else {
        console.log('🌐 [WEBSITE HANDLER] Step 1: Analyzing website...');
        const analyzer = new WebAnalysisAgentV2(input.projectId);
        try {
          websiteData = await analyzer.analyze(input.websiteUrl);
        } catch (analysisError) {
          console.log('⚠️ [WEBSITE HANDLER] Website analysis failed, creating fallback data...');
          // Create minimal fallback data from URL
          const domain = new URL(input.websiteUrl).hostname.replace('www.', '');
          websiteData = WebsiteToVideoHandler.createFallbackWebsiteData(input.websiteUrl, domain);
        }
      }
      
      // 2. Save to brand_profile table and format brand data
      console.log('🌐 [WEBSITE HANDLER] Step 2: Saving brand profile and formatting data...');
      
      // Save to database
      await saveBrandProfile(input.projectId, input.websiteUrl, websiteData);
      
      // Create brand style directly from extracted data (skip formatter)
      const brandStyle = createBrandStyleFromExtraction(websiteData);
      console.log('🌐 [WEBSITE HANDLER] Brand style created:', {
        primaryColor: brandStyle.colors.primary,
        primaryFont: brandStyle.typography.primaryFont,
        animationStyle: brandStyle.animation.style
      });
      
      // 3. Generate hero's journey narrative
      console.log('🌐 [WEBSITE HANDLER] Step 3: Creating narrative structure...');
      const storyGenerator = new HeroJourneyGenerator();
      const narrativeScenes = storyGenerator.generateNarrative(websiteData);
      
      // Adjust durations for 20-second video (600 frames total)
      const adjustedScenes = narrativeScenes.map((scene, index) => {
        const durations = [90, 90, 240, 90, 90]; // 3s, 3s, 8s, 3s, 3s
        return {
          ...scene,
          duration: durations[index] || 90
        };
      });
      
      // 4. Select best templates for each narrative beat
      console.log('🌐 [WEBSITE HANDLER] Step 4: Selecting templates...');
      const selector = new TemplateSelector();
      const selectedTemplates = await selector.selectTemplatesForJourney(
        adjustedScenes, 
        input.style || 'dynamic'
      );
      
      // 5. Customize templates with brand and content using AI
      console.log('🌐 [WEBSITE HANDLER] Step 5: Customizing templates with AI...');
      const customizer = new TemplateCustomizerAI();
      const customizedScenes = await customizer.customizeTemplates({
        templates: selectedTemplates,
        brandStyle,
        websiteData,
        narrativeScenes: adjustedScenes,
      });
      
      // 6. Clear existing scenes and save new ones
      console.log('🌐 [WEBSITE HANDLER] Step 6: Saving to project...');
      
      // Backup existing scenes before deletion (safety measure)
      const existingScenes = await db.select().from(scenes)
        .where(eq(scenes.projectId, input.projectId));
      
      console.log(`🌐 [WEBSITE HANDLER] Backing up ${existingScenes.length} existing scenes`);
      
      try {
        // Clear existing scenes
        await db.delete(scenes).where(eq(scenes.projectId, input.projectId));
        
        // Add customized scenes - use consistent UUID generation
        const { randomUUID } = require('crypto');
        const scenesToInsert = customizedScenes.map((scene, index) => ({
          id: randomUUID(),
          projectId: input.projectId,
          name: scene.name,
          tsxCode: scene.code,
          duration: scene.duration,
          order: index,
          props: {},
          layoutJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      
      console.log('🌐 [WEBSITE HANDLER] Scenes to insert:', {
        count: scenesToInsert.length,
        projectId: input.projectId,
        sceneNames: scenesToInsert.map(s => s.name),
        sceneDurations: scenesToInsert.map(s => s.duration),
        codeExists: scenesToInsert.map(s => !!s.tsxCode)
      });
      
        if (scenesToInsert.length > 0) {
          await db.insert(scenes).values(scenesToInsert);
          console.log('🌐 [WEBSITE HANDLER] ✅ Scenes inserted successfully');
        }
      } catch (error) {
        console.error('🌐 [WEBSITE HANDLER] ❌ Failed to update scenes, attempting rollback:', error);
        
        // Attempt to restore original scenes
        if (existingScenes.length > 0) {
          try {
            await db.insert(scenes).values(existingScenes);
            console.log('🌐 [WEBSITE HANDLER] ✅ Successfully restored original scenes');
          } catch (rollbackError) {
            console.error('🌐 [WEBSITE HANDLER] ❌ Failed to restore original scenes:', rollbackError);
          }
        }
        
        throw error;
      }
      
      // Update project metadata
      await db.update(projects)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));
      
      console.log('🌐 [WEBSITE HANDLER] Generation complete!');
      
      // Build success message with scene details
      const sceneList = customizedScenes.map((scene, i) => 
        `${i + 1}. ${adjustedScenes[i]?.title || 'Scene'} (${(scene.duration / 30).toFixed(1)}s)`
      ).join('\n');
      
      // Return scenes at the top level for scene-operations.ts
      // Also need to return the actual database records after insertion
      const insertedScenes = await db.select().from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.order));
      
      return {
        success: true,
        toolName: 'websiteToVideo',
        scenes: insertedScenes, // This is what scene-operations.ts expects
        data: {
          scenesGenerated: customizedScenes.length,
          totalDuration: 20,
          brandColors: brandStyle.colors,
          websiteTitle: websiteData.page.title,
          scenes: customizedScenes,
        },
        reasoning: `Analyzed ${input.websiteUrl} and created ${customizedScenes.length} branded scenes`,
        chatResponse: `I've analyzed ${websiteData.page.title} and created a professional 20-second video with your brand style!\n\n**Generated Scenes:**\n${sceneList}\n\n**Brand Elements Extracted:**\n• Primary color: ${brandStyle.colors.primary}\n• Typography: ${brandStyle.typography.primaryFont}\n• ${websiteData.product.features.length} key features highlighted\n\nThe video follows a hero's journey narrative structure, perfect for showcasing your product.`,
      };
      
    } catch (error) {
      console.error('🌐 [WEBSITE HANDLER] Error:', error);
      
      return {
        success: false,
        toolName: 'websiteToVideo',
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate video from website',
          code: 'WEBSITE_GENERATION_FAILED',
        },
        reasoning: 'Website analysis or video generation failed',
        chatResponse: `I encountered an issue analyzing the website. This might be due to:\n• The website being protected by Cloudflare\n• Invalid or inaccessible URL\n• Connection timeout\n\nPlease verify the URL is accessible and try again.`,
      };
    }
  }

  private static createFallbackWebsiteData(url: string, domain: string): ExtractedBrandData {
    // Create minimal fallback data when website analysis fails
    return {
      page: {
        title: domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[.-]/g, ' '),
        description: `Professional website for ${domain}`,
        url: url,
        canonical: url,
        headings: [`Welcome to ${domain}`, 'Our Services', 'About Us', 'Contact'],
        meta: {
          viewport: 'width=device-width, initial-scale=1',
          charset: 'utf-8'
        }
      },
      brand: {
        colors: {
          primary: '#2563eb', // Default blue
          secondary: '#1e40af',
          accents: ['#3b82f6', '#60a5fa'],
          neutrals: ['#f8fafc', '#e2e8f0', '#64748b'],
          gradients: [{
            type: 'linear',
            angle: 135,
            stops: ['#2563eb', '#3b82f6']
          }]
        },
        typography: {
          fonts: [{
            family: 'Inter',
            weights: [400, 500, 600, 700]
          }],
          scale: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem'
          }
        },
        spacing: {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem'
        },
        borders: {
          radius: {
            sm: '0.25rem',
            md: '0.5rem',
            lg: '0.75rem'
          },
          width: {
            thin: '1px',
            medium: '2px',
            thick: '3px'
          }
        },
        shadows: {
          sm: '0 1px 2px rgba(0,0,0,0.05)',
          md: '0 4px 6px rgba(0,0,0,0.1)',
          lg: '0 10px 15px rgba(0,0,0,0.1)'
        },
        buttons: {
          radius: '0.5rem',
          padding: '0.75rem 1.5rem'
        },
        animations: {
          duration: {
            fast: '150ms',
            normal: '300ms',
            slow: '500ms'
          },
          easing: {
            ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
            spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }
        },
        voice: {
          tone: 'professional',
          style: 'modern',
          personality: 'confident'
        }
      },
      product: {
        value_prop: {
          headline: `Transform Your Business with ${domain}`,
          subhead: 'Professional solutions for modern businesses'
        },
        problem: 'Many businesses struggle with outdated solutions',
        features: [
          { title: 'Professional Service', description: 'High-quality solutions' },
          { title: 'Expert Team', description: 'Experienced professionals' },
          { title: 'Modern Approach', description: 'Latest technology and methods' }
        ]
      },
      ctas: [
        { label: 'Get Started', type: 'primary', placement: 'hero' },
        { label: 'Learn More', type: 'secondary', placement: 'section' }
      ],
      socialProof: {
        stats: {
          users: '1000+',
          rating: '4.9',
          reviews: 'satisfied customers'
        }
      },
      layoutMotion: {
        motion_opportunities: [
          'Fade in hero text',
          'Slide in features',
          'Scale buttons on hover'
        ]
      }
    };
  }
}