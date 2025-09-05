import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { projects, scenes, brandProfiles, brandProfileVersions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { EnhancedWebAnalyzer } from "~/tools/webAnalysis/WebAnalysisEnhanced";
import { HeroJourneyGenerator } from "~/tools/narrative/herosJourney";
import { TemplateSelector } from "~/server/services/website/template-selector-v2";
import { TemplateCustomizer } from "~/server/services/website/template-customizer";
import { BrandFormatter } from "~/server/services/website/brand-formatter";

const analyzeWebsiteSchema = z.object({
  url: z.string().url(),
  projectId: z.string(),
  options: z.object({
    duration: z.number().min(10).max(60).default(20),
    style: z.enum(['minimal', 'dynamic', 'bold']).default('dynamic'),
  }).optional(),
});

export const websitePipelineRouter = createTRPCRouter({
  generateFromWebsite: protectedProcedure
    .input(analyzeWebsiteSchema)
    .mutation(async ({ input, ctx }) => {
      const { url, projectId, options = {} } = input;
      const userId = ctx.session.user.id;
      
      console.log('🌐 [WEBSITE PIPELINE] Starting generation for:', url);
      
      try {
        // 1. Verify project ownership
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });
        
        if (!project || project.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Project not found or access denied",
          });
        }
        
        // 2. Analyze website and extract brand
        console.log('🌐 [WEBSITE PIPELINE] Step 1: Analyzing website...');
        const analyzer = new EnhancedWebAnalyzer();
        const websiteData = await analyzer.analyzeWebsite(url, projectId, userId);
        
        // 3. Format brand data for use in templates
        console.log('🌐 [WEBSITE PIPELINE] Step 2: Formatting brand data...');
        const formatter = new BrandFormatter();
        const brandStyle = formatter.format(websiteData);
        
        // 4. Generate hero's journey narrative (20 seconds)
        console.log('🌐 [WEBSITE PIPELINE] Step 3: Creating narrative structure...');
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
        
        // 5. Select best templates for each narrative beat
        console.log('🌐 [WEBSITE PIPELINE] Step 4: Selecting templates...');
        const selector = new TemplateSelector();
        const selectedTemplates = await selector.selectTemplatesForJourney(adjustedScenes, options.style);
        
        // 6. Customize templates with brand and content
        console.log('🌐 [WEBSITE PIPELINE] Step 5: Customizing templates...');
        const customizer = new TemplateCustomizer();
        const customizedScenes = await customizer.customizeTemplates({
          templates: selectedTemplates,
          brandStyle,
          websiteData,
          narrativeScenes: adjustedScenes,
        });
        
        // 7. Clear existing scenes and save new ones
        console.log('🌐 [WEBSITE PIPELINE] Step 6: Saving to project...');
        await db.transaction(async (tx) => {
          // Clear existing scenes
          await tx.delete(scenes).where(eq(scenes.projectId, projectId));
          
          // Add customized scenes
          const scenesToInsert = customizedScenes.map((scene, index) => ({
            id: `scene_${Date.now()}_${index}`,
            projectId,
            name: scene.name,
            tsxCode: scene.code,
            duration: scene.duration,
            order: index,
            props: {},
            layoutJson: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          
          await tx.insert(scenes).values(scenesToInsert);
          
          // Update project metadata
          await tx.update(projects)
            .set({
              metadata: {
                websiteUrl: url,
                brandStyle: brandStyle,
                generatedAt: new Date().toISOString(),
                narrativeType: 'hero-journey-20s',
              },
              isWelcome: false,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, projectId));
        });
        
        console.log('🌐 [WEBSITE PIPELINE] Generation complete!');
        
        return {
          success: true,
          message: `Created ${customizedScenes.length} scenes from ${url}`,
          data: {
            websiteTitle: websiteData.title,
            scenesGenerated: customizedScenes.length,
            totalDuration: 20,
            brandColors: brandStyle.colors,
          },
        };
        
      } catch (error) {
        console.error("🌐 [WEBSITE PIPELINE] Error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate video from website",
        });
      }
    }),
    
  previewWebsite: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      try {
        const analyzer = new EnhancedWebAnalyzer();
        // Quick preview without full analysis
        const response = await fetch(input.url);
        const html = await response.text();
        
        // Extract basic info
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
        const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
        
        return {
          title: titleMatch?.[1] || 'Untitled',
          description: descMatch?.[1] || '',
          ogImage: ogImageMatch?.[1] || '',
          url: input.url,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not fetch website preview",
        });
      }
    }),
    
  // Extract and save brand profile from website
  extractBrandProfile: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { url, projectId } = input;
      const userId = ctx.session.user.id;
      
      console.log('🎨 [BRAND EXTRACTION] Starting for:', url);
      
      try {
        // 1. Verify project ownership
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });
        
        if (!project || project.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Project not found or access denied",
          });
        }
        
        // 2. Check if brand profile already exists for this project
        const existingProfile = await db.query.brandProfiles.findFirst({
          where: eq(brandProfiles.projectId, projectId),
        });
        
        // 3. Analyze website and extract brand
        console.log('🎨 [BRAND EXTRACTION] Analyzing website...');
        const analyzer = new EnhancedWebAnalyzer();
        const websiteData = await analyzer.analyzeWebsite(url, projectId, userId);
        
        // 4. Prepare brand profile data
        const brandProfileData = {
          projectId,
          websiteUrl: url,
          brandData: {
            colors: websiteData.brand.colors,
            typography: websiteData.brand.typography,
            buttons: websiteData.brand.buttons,
            shadows: websiteData.brand.shadows,
            borderRadius: websiteData.brand.borderRadius,
            iconography: websiteData.brand.iconography,
            imageryStyle: websiteData.brand.imageryStyle,
            backgroundEffects: websiteData.brand.backgroundEffects,
            logo: websiteData.brand.logo,
          },
          colors: websiteData.brand.colors,
          typography: websiteData.brand.typography,
          logos: websiteData.brand.logo,
          copyVoice: websiteData.copy,
          productNarrative: websiteData.product,
          socialProof: websiteData.socialProof,
          screenshots: websiteData.media.screenshots || [],
          mediaAssets: websiteData.media.videos.concat(websiteData.media.animations) || [],
          extractionVersion: "1.0.0",
          extractionConfidence: websiteData.extractionMeta.confidence,
          lastAnalyzedAt: new Date(),
          updatedAt: new Date(),
        };
        
        // 5. Save or update brand profile
        let brandProfileId: string;
        
        if (existingProfile) {
          console.log('🎨 [BRAND EXTRACTION] Updating existing profile...');
          
          // Save current version before updating
          const currentVersion = await db.query.brandProfileVersions.findFirst({
            where: eq(brandProfileVersions.brandProfileId, existingProfile.id),
            orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
          });
          
          const nextVersionNumber = (currentVersion?.versionNumber || 0) + 1;
          
          await db.insert(brandProfileVersions).values({
            brandProfileId: existingProfile.id,
            versionNumber: nextVersionNumber,
            brandData: existingProfile.brandData,
            changedBy: userId,
            changeReason: `Re-analyzed website on ${new Date().toISOString()}`,
          });
          
          // Update the profile
          await db.update(brandProfiles)
            .set(brandProfileData)
            .where(eq(brandProfiles.id, existingProfile.id));
          
          brandProfileId = existingProfile.id;
        } else {
          console.log('🎨 [BRAND EXTRACTION] Creating new profile...');
          
          // Insert new profile
          const [newProfile] = await db.insert(brandProfiles)
            .values({
              ...brandProfileData,
              createdAt: new Date(),
            })
            .returning({ id: brandProfiles.id });
          
          brandProfileId = newProfile.id;
          
          // Create initial version
          await db.insert(brandProfileVersions).values({
            brandProfileId,
            versionNumber: 1,
            brandData: brandProfileData.brandData,
            changedBy: userId,
            changeReason: 'Initial extraction',
          });
        }
        
        console.log('🎨 [BRAND EXTRACTION] Complete! Profile ID:', brandProfileId);
        
        return {
          success: true,
          brandProfileId,
          data: {
            title: websiteData.title,
            description: websiteData.description,
            colors: websiteData.brand.colors,
            typography: websiteData.brand.typography,
            logo: websiteData.brand.logo,
            screenshots: brandProfileData.screenshots,
          },
        };
        
      } catch (error) {
        console.error("🎨 [BRAND EXTRACTION] Error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to extract brand profile",
        });
      }
    }),
    
  // Get brand profile for a project
  getBrandProfile: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;
      
      // Verify project ownership
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      
      if (!project || project.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Project not found or access denied",
        });
      }
      
      // Get brand profile
      const brandProfile = await db.query.brandProfiles.findFirst({
        where: eq(brandProfiles.projectId, projectId),
        with: {
          versions: {
            orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
            limit: 5,
          },
        },
      });
      
      return brandProfile;
    }),
});