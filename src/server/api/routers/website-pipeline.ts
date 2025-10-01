import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { brandRepository, projectBrandUsage, projects, scenes } from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { EnhancedWebAnalyzer } from "~/tools/webAnalysis/WebAnalysisEnhanced";
import { HeroJourneyGenerator } from "~/tools/narrative/herosJourney";
import { TemplateSelector } from "~/server/services/website/template-selector-v2";
import { TemplateCustomizer } from "~/server/services/website/template-customizer";
import { BrandFormatter } from "~/server/services/website/brand-formatter";
import { saveBrandProfile } from "~/server/services/website/save-brand-profile";

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
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });

        if (!project || project.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Project not found or access denied",
          });
        }

        const analyzer = new EnhancedWebAnalyzer();
        const websiteData = await analyzer.analyzeWebsite(url, projectId, userId);

        const brandRecord = await saveBrandProfile({
          projectId,
          websiteUrl: url,
          extractedData: websiteData,
          userId,
        });

        return {
          success: true,
          brandRepositoryId: brandRecord.id,
          data: {
            title: websiteData.title,
            description: websiteData.description,
            colors: brandRecord.colors,
            typography: brandRecord.typography,
            logo: brandRecord.logos,
            screenshots: brandRecord.screenshots,
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
  // Get brand profile for a project
  getBrandProfile: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project || project.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Project not found or access denied",
        });
      }

      const result = await ctx.db
        .select({
          brand: brandRepository,
          usage: projectBrandUsage,
        })
        .from(projectBrandUsage)
        .innerJoin(
          brandRepository,
          eq(projectBrandUsage.brandRepositoryId, brandRepository.id),
        )
        .where(eq(projectBrandUsage.projectId, projectId))
        .orderBy(desc(projectBrandUsage.usedAt))
        .limit(1);

      return result[0]?.brand ?? null;
    }),
});
