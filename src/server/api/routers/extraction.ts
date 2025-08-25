import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as playwrightCore from 'playwright-core';
import { uploadScreenshotToR2 } from '~/lib/utils/r2-upload';
import { BrandAnalyzerV2, type BrandJSONV2 } from '~/server/services/brand/BrandAnalyzerV2';
import { brandExtractions, storyArcs } from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { EnhancedSectionClassifier } from '~/tools/extraction/EnhancedSectionClassifier';
import { ProductionSceneGenerator } from '~/tools/extraction/ProductionSceneGenerator';
import type { Screenshot } from '~/tools/extraction/UIRebuildSpec';

// Enhanced extraction result type
interface ExtractionResult {
  url: string;
  timestamp: string;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  html: {
    raw?: string;
    cleaned?: string;
    rendered?: string;
  };
  screenshots: Array<{
    id: string;
    type: 'full' | 'viewport' | 'section' | 'element';
    url?: string;
    dimensions?: {
      width: number;
      height: number;
    };
  }>;
  styles: {
    palette: string[];
    fonts: Array<{
      family: string;
      weight?: number;
      size?: string;
    }>;
  };
  timeline?: Record<string, number>;
}

export const extractionRouter = createTRPCRouter({
  testExtraction: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        options: z.object({
          duration: z.number().min(10).max(30).default(15),
          focus: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const timeline: Record<string, number> = {};

      try {
        console.log(`[Extraction Lab] Starting extraction for: ${input.url}`);
        
        // Step 1: Enhanced Web Extraction with Playwright
        console.log('🚀 [Extraction Lab] Starting web extraction...');
        const extractionStart = Date.now();
        
        // Launch Playwright browser (now properly installed)
        console.log('🌐 [Extraction Lab] Launching browser...');
        const browser = await playwrightCore.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          deviceScaleFactor: 2, // 2x resolution for better quality
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        });
        
        const page = await context.newPage();
        
        try {
          // Navigate to the URL with more flexible wait strategy
          console.log(`🔗 [Extraction Lab] Navigating to ${input.url}...`);
          await page.goto(input.url, {
            waitUntil: 'domcontentloaded', // Changed from networkidle to avoid timeout
            timeout: 30000,
          });
          console.log('✅ [Extraction Lab] Page loaded successfully');
          
          // Wait for content to settle and scroll to load lazy content
          await page.waitForTimeout(3000);
          
          // Scroll to bottom to trigger lazy loading
          console.log('📜 [Extraction Lab] Scrolling to load all content...');
          await page.evaluate(() => {
            return new Promise<void>((resolve) => {
              let totalHeight = 0;
              let distance = 200; // Increased scroll distance
              let maxScrolls = 0;
              const maxScrollAttempts = 50; // Prevent infinite scrolling
              
              const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                maxScrolls++;
                
                // Check if we've reached the bottom or hit max attempts
                if(totalHeight >= scrollHeight || maxScrolls >= maxScrollAttempts){
                  clearInterval(timer);
                  // Scroll to top and then to bottom one more time to ensure everything loaded
                  window.scrollTo(0, 0);
                  setTimeout(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                    setTimeout(() => {
                      window.scrollTo(0, 0); // Back to top for screenshot
                      resolve();
                    }, 1000);
                  }, 1000);
                }
              }, 200); // Slower scrolling for better loading
            });
          });
          
          // Wait for any animations and dynamic content to settle
          await page.waitForTimeout(3000);
          
          // Force load any lazy images
          await page.evaluate(() => {
            const images = document.querySelectorAll('img[loading="lazy"], img[data-src]');
            images.forEach((img: any) => {
              if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
              }
              img.loading = 'eager';
            });
          });
          
          // Hide cookie banners and popups
          await page.addStyleTag({
            content: `
              [class*="cookie"], [id*="cookie"],
              [class*="consent"], [id*="consent"],
              [class*="gdpr"], [id*="gdpr"],
              [class*="popup"], [class*="modal"],
              [class*="overlay"]:not(body) {
                display: none !important;
              }
            `,
          });
          
          // Extract metadata
          const metadata = await page.evaluate(() => {
            const getMetaContent = (name: string) => {
              const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
              return meta?.getAttribute('content') || undefined;
            };
            
            return {
              title: document.title,
              description: getMetaContent('description'),
              ogImage: getMetaContent('og:image'),
              favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || undefined,
            };
          });
          
          // Extract HTML
          const htmlContent = await page.content();
          const cleanedHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          
          // Capture screenshots
          console.log('📸 [Extraction Lab] Capturing screenshots...');
          const screenshots: any[] = [];
          
          // Get the actual page dimensions before screenshot
          const pageHeight = await page.evaluate(() => document.body.scrollHeight);
          const pageWidth = await page.evaluate(() => document.body.scrollWidth);
          console.log(`📏 [Extraction Lab] Page dimensions: ${pageWidth}x${pageHeight}px`);
          
          // Full page screenshot
          console.log('📷 [Extraction Lab] Taking full page screenshot...');
          const fullScreenshot = await page.screenshot({
            fullPage: true,
            type: 'png',
          });
          
          // Upload to R2 if available, otherwise use base64
          let fullScreenshotUrl: string | undefined;
          try {
            console.log('☁️ [Extraction Lab] Uploading full screenshot to R2...');
            // For extraction lab, we don't have a projectId, so use a dummy one
            fullScreenshotUrl = await uploadScreenshotToR2(
              fullScreenshot,
              `${Date.now()}_full.png`,  // Removed 'extraction/' prefix
              'extraction-lab' // dummy projectId for testing
            );
            console.log('✅ [Extraction Lab] Full screenshot uploaded successfully');
          } catch (e) {
            console.log('⚠️ [Extraction Lab] R2 upload failed, using base64 fallback');
            // Fallback to base64 for local testing
            fullScreenshotUrl = `data:image/png;base64,${fullScreenshot.toString('base64')}`;
          }
          
          screenshots.push({
            id: 'full_001',
            type: 'full',
            url: fullScreenshotUrl,
            dimensions: { width: pageWidth, height: pageHeight },
          });
          
          // Hero section screenshot (viewport)
          console.log('🎯 [Extraction Lab] Taking hero/viewport screenshot...');
          const heroScreenshot = await page.screenshot({
            fullPage: false,
            type: 'png',
          });
          
          let heroScreenshotUrl: string | undefined;
          try {
            console.log('☁️ [Extraction Lab] Uploading hero screenshot to R2...');
            // For extraction lab, we don't have a projectId, so use a dummy one
            heroScreenshotUrl = await uploadScreenshotToR2(
              heroScreenshot,
              `${Date.now()}_hero.png`,  // Removed 'extraction/' prefix
              'extraction-lab' // dummy projectId for testing
            );
            console.log('✅ [Extraction Lab] Hero screenshot uploaded successfully');
          } catch (e) {
            console.log('⚠️ [Extraction Lab] R2 upload failed, using base64 fallback');
            heroScreenshotUrl = `data:image/png;base64,${heroScreenshot.toString('base64')}`;
          }
          
          screenshots.push({
            id: 'hero_001',
            type: 'viewport',
            url: heroScreenshotUrl,
            dimensions: { width: 1920, height: 1080 },
          });
          
          // Extract computed styles with better color categorization
          console.log('🎨 [Extraction Lab] Extracting styles and colors...');
          const styles = await page.evaluate(() => {
            // Track color frequency
            const colorFrequency = new Map<string, number>();
            const buttonColors = new Set<string>();
            const headingColors = new Set<string>();
            const backgroundColors = new Set<string>();
            
            const elements = document.querySelectorAll('*');
            
            elements.forEach((el) => {
              const computed = window.getComputedStyle(el);
              const bg = computed.backgroundColor;
              const color = computed.color;
              const tagName = el.tagName.toLowerCase();
              
              // Track background colors
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                const count = colorFrequency.get(bg) || 0;
                colorFrequency.set(bg, count + 1);
                
                // Track specific usage
                if (tagName === 'button' || el.classList.toString().includes('btn')) {
                  buttonColors.add(bg);
                }
                if (tagName === 'header' || tagName === 'nav' || tagName === 'footer') {
                  backgroundColors.add(bg);
                }
              }
              
              // Track text colors
              if (color) {
                const count = colorFrequency.get(color) || 0;
                colorFrequency.set(color, count + 1);
                
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                  headingColors.add(color);
                }
              }
            });
            
            // Sort colors by frequency
            const sortedColors = Array.from(colorFrequency.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([color]) => color);
            
            // Identify primary (most common button/CTA color)
            const primary = Array.from(buttonColors)[0] || sortedColors[0];
            
            // Identify secondary (most common non-primary color)
            const secondary = sortedColors.find(c => c !== primary) || sortedColors[1];
            
            // Identify accent (third most common or heading color)
            const accent = Array.from(headingColors)[0] || sortedColors[2];
            
            // Extract fonts
            const fonts = new Set<string>();
            elements.forEach((el) => {
              const computed = window.getComputedStyle(el);
              const fontFamily = computed.fontFamily;
              if (fontFamily) {
                const primaryFont = fontFamily.split(',')[0]?.replace(/["']/g, '').trim();
                if (primaryFont) fonts.add(primaryFont);
              }
            });
            
            return {
              palette: sortedColors.slice(0, 10),
              categorized: {
                primary,
                secondary,
                accent,
                buttonColors: Array.from(buttonColors),
                headingColors: Array.from(headingColors),
                backgroundColors: Array.from(backgroundColors)
              },
              fonts: Array.from(fonts).slice(0, 5).map(f => ({ family: f })),
            };
          });
          
          const extractionResult: ExtractionResult = {
            url: input.url,
            timestamp: new Date().toISOString(),
            metadata,
            html: {
              raw: htmlContent.substring(0, 10000), // Limit for display
              cleaned: cleanedHtml.substring(0, 10000),
              rendered: cleanedHtml.substring(0, 10000),
            },
            screenshots,
            styles,
          };
          
          timeline.extraction = Date.now() - extractionStart;

          // Step 2: Comprehensive Brand Analysis with BrandAnalyzerV2
          const analysisStart = Date.now();
          console.log('🧠 [Extraction Lab] Starting comprehensive brand analysis with BrandAnalyzerV2...');
          
          // Use the new BrandAnalyzerV2 for deep analysis
          const brandAnalyzer = new BrandAnalyzerV2();
          
          // Log what we're sending to the analyzer - NO TRUNCATION!
          console.log('📤 [Extraction Lab] Sending to BrandAnalyzer:');
          console.log('   Screenshots count:', screenshots.length);
          console.log('   Full screenshot URL:', screenshots[0]?.url);
          console.log('   Hero screenshot URL:', screenshots[1]?.url);
          console.log('   Has R2 URL:', screenshots[0]?.url?.includes('r2.dev'));
          console.log('   HTML length:', htmlContent.length);
          console.log('   Colors found:', styles.palette.length);
          console.log('   Fonts found:', styles.fonts.length);
          
          const brandJson = await brandAnalyzer.analyze({
            url: input.url,
            html: {
              raw: htmlContent,
              cleaned: cleanedHtml,
              rendered: cleanedHtml,
            },
            screenshots,
            styles,
            metadata,
          });
          
          console.log('✅ [Extraction Lab] Comprehensive brand analysis completed');
          console.log('📊 [Extraction Lab] BrandJSON Summary:', {
            brandName: brandJson.brand?.name,
            tagline: brandJson.brand?.tagline,
            featuresCount: brandJson.product?.features?.length || 0,
            sectionsCount: brandJson.sections?.length || 0,
            confidence: brandJson.confidence?.overall,
            testimonials: brandJson.socialProof?.testimonials?.length || 0,
            stats: brandJson.socialProof?.stats?.length || 0,
          });
          
          timeline.analysis = Date.now() - analysisStart;
          timeline.total = Date.now() - startTime;

          // Add timeline to extraction result
          extractionResult.timeline = timeline;

          console.log(`🎉 [Extraction Lab] Completed in ${timeline.total}ms`);
          console.log(`📊 [Extraction Lab] Timeline - Extraction: ${timeline.extraction}ms, Analysis: ${timeline.analysis}ms`);

          // Save to database if we have a successful extraction
          let savedExtraction = null;
          if (brandJson && ctx.session?.user?.id) {
            try {
              console.log('💾 [Extraction Lab] Saving to database...');
              
              const extractionId = `ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              
              const insertData = {
                url: input.url,
                projectId: null, // No project for extraction lab tests
                userId: ctx.session.user.id,
                extractionId: extractionId,
                extractionVersion: '2.0.0',
                extractionStatus: 'completed',
                brandName: brandJson.brand?.name || null,
                brandTagline: brandJson.brand?.tagline || null,
                primaryColor: typeof brandJson.design?.colors?.primary === 'string' 
                  ? brandJson.design.colors.primary 
                  : brandJson.design?.colors?.primary?.hex || null,
                secondaryColor: typeof brandJson.design?.colors?.secondary === 'string'
                  ? brandJson.design.colors.secondary
                  : brandJson.design?.colors?.secondary?.hex || null,
                visualAnalysis: brandJson.visualAnalysis || {},
                contentAnalysis: brandJson.contentAnalysis || {},
                synthesis: brandJson.synthesis || {},
                brandData: brandJson.brand || {},
                designData: brandJson.design || {},
                productData: brandJson.product || {},
                socialProofData: brandJson.socialProof || {},
                contentData: brandJson.content || {},
                sectionsData: brandJson.sections || [],
                screenshots: (extractionResult.screenshots || []).map(s => ({
                  id: s.id,
                  type: s.type as string,
                  url: s.url || '',
                  dimensions: s.dimensions,
                })),
                htmlContent: extractionResult.html?.raw?.substring(0, 100000) || null,
                stylesExtracted: extractionResult.styles || {},
                confidence: brandJson.confidence || { overall: 0.5 },
                processingTimeMs: timeline.total || 0,
                tokensUsed: brandJson.metadata?.tokensUsed || 0,
                analyzedAt: new Date(),
              };
              
              const dbResult = await ctx.db.insert(brandExtractions).values(insertData as any).returning();
              
              savedExtraction = dbResult[0];
              console.log('✅ [Extraction Lab] Saved to database with ID:', savedExtraction?.id);
            } catch (dbError) {
              console.error('❌ [Extraction Lab] Failed to save to database:', dbError);
              // Don't throw - we still want to return the extraction even if DB save fails
            }
          }

          // Generate Hero's Journey story arc automatically
          let storyArc = null;
          let savedStoryArcId = null;
          
          if (savedExtraction && brandJson) {
            try {
              console.log('🎬 [Extraction Lab] Generating Hero\'s Journey story arc...');
              
              // Import and use HeroJourneyV2
              const { heroJourneyV2 } = await import('~/tools/narrative/herosJourneyV2');
              
              // Generate the story arc with default options
              storyArc = await heroJourneyV2.generateStoryArc(brandJson, {
                sceneCount: 5,
                totalDurationSeconds: 15,
                style: 'professional'
              });
              
              console.log('✅ [Extraction Lab] Story arc generated:', {
                title: storyArc.title,
                narrativeStructure: storyArc.narrativeStructure,
                sceneCount: storyArc.scenes.length,
                totalDuration: `${storyArc.totalDuration / 30}s`
              });
              
              // Save story arc to database
              if (ctx.session?.user?.id) {
                const savedArcResult = await ctx.db.insert(storyArcs).values({
                  extractionId: savedExtraction.id,
                  projectId: null,
                  userId: ctx.session.user.id,
                  title: storyArc.title,
                  narrativeStructure: storyArc.narrativeStructure,
                  totalDurationFrames: storyArc.totalDuration,
                  totalDurationSeconds: (storyArc.totalDuration / 30).toString(),
                  style: 'professional',
                  brandContext: storyArc.brandContext,
                  scenes: storyArc.scenes,
                  generationModel: 'gpt-4.1-mini',
                  status: 'draft',
                }).returning();
                
                if (savedArcResult && savedArcResult[0]) {
                  savedStoryArcId = savedArcResult[0].id;
                  console.log('💾 [Extraction Lab] Story arc saved with ID:', savedArcResult[0].id);
                }
              }
            } catch (storyError) {
              console.error('❌ [Extraction Lab] Story arc generation failed:', storyError);
              // Don't throw - extraction was successful even if story arc fails
            }
          }

          return {
            success: true,
            extraction: extractionResult,
            brandJson: brandJson,
            timeline,
            savedExtractionId: savedExtraction?.id || null,
            storyArc,
            savedStoryArcId,
          };
        } finally {
          await browser.close();
        }
      } catch (error) {
        console.error("[Extraction Lab] Error:", error);
        throw new Error(
          error instanceof Error ? error.message : "Extraction failed"
        );
      }
    }),

  // Get saved extractions from database
  getExtractionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;
      const offset = input?.offset || 0;
      
      const extractions = await ctx.db
        .select({
          id: brandExtractions.id,
          url: brandExtractions.url,
          brandName: brandExtractions.brandName,
          brandTagline: brandExtractions.brandTagline,
          extractionStatus: brandExtractions.extractionStatus,
          processingTimeMs: brandExtractions.processingTimeMs,
          confidence: brandExtractions.confidence,
          createdAt: brandExtractions.createdAt,
          screenshots: brandExtractions.screenshots,
        })
        .from(brandExtractions)
        .where(eq(brandExtractions.userId, ctx.session.user.id))
        .orderBy(desc(brandExtractions.createdAt))
        .limit(limit)
        .offset(offset);
      
      const total = await ctx.db
        .select({ count: brandExtractions.id })
        .from(brandExtractions)
        .where(eq(brandExtractions.userId, ctx.session.user.id));
      
      return {
        extractions,
        total: total.length,
        hasMore: offset + limit < total.length,
      };
    }),
  
  // Get a single extraction by ID
  getExtraction: protectedProcedure
    .input(
      z.object({
        extractionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const extraction = await ctx.db
        .select()
        .from(brandExtractions)
        .where(
          eq(brandExtractions.id, input.extractionId)
        )
        .limit(1);
      
      if (!extraction[0]) {
        throw new Error("Extraction not found");
      }
      
      // Check if user owns this extraction
      if (extraction[0].userId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }
      
      return extraction[0];
    }),
  
  // Generate story arc from saved extraction
  generateStoryArcFromExtraction: protectedProcedure
    .input(
      z.object({
        extractionId: z.string().uuid(),
        options: z.object({
          sceneCount: z.number().min(3).max(7).default(5),
          totalDurationSeconds: z.number().min(10).max(30).default(15),
          style: z.enum(['dramatic', 'energetic', 'professional', 'playful']).default('professional'),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the extraction from database
        const [extraction] = await ctx.db
          .select()
          .from(brandExtractions)
          .where(eq(brandExtractions.id, input.extractionId))
          .limit(1);
        
        if (!extraction) {
          throw new Error("Extraction not found");
        }
        
        if (extraction.userId !== ctx.session.user.id) {
          throw new Error("Unauthorized");
        }
        
        console.log('[Story Arc] Generating from saved extraction:', input.extractionId);
        
        // Reconstruct the BrandJSONV2 from database
        const brandJSON: BrandJSONV2 = {
          id: extraction.extractionId,
          url: extraction.url,
          extractionId: extraction.extractionId,
          createdAt: extraction.createdAt.toISOString(),
          
          visualAnalysis: extraction.visualAnalysis as any,
          contentAnalysis: extraction.contentAnalysis as any,
          synthesis: extraction.synthesis as any,
          
          brand: extraction.brandData as any,
          design: extraction.designData as any,
          product: extraction.productData as any,
          socialProof: extraction.socialProofData as any,
          sections: extraction.sectionsData as any[],
          content: extraction.contentData as any,
          visuals: { photos: [], uiComponents: [], icons: [] },
          confidence: extraction.confidence as any,
          
          metadata: {
            analysisVersion: extraction.extractionVersion,
            timestamp: extraction.createdAt.toISOString(),
            processingTime: extraction.processingTimeMs || 0,
            tokensUsed: extraction.tokensUsed || 0,
          },
        };
        
        // Import and use HeroJourneyV2
        const { heroJourneyV2 } = await import('~/tools/narrative/herosJourneyV2');
        
        // Generate the story arc
        const storyArc = await heroJourneyV2.generateStoryArc(
          brandJSON,
          input.options || {}
        );
        
        // Save story arc to database
        const savedArcResult = await ctx.db.insert(storyArcs).values({
          extractionId: input.extractionId,
          projectId: null,
          userId: ctx.session.user.id,
          title: storyArc.title,
          narrativeStructure: storyArc.narrativeStructure,
          totalDurationFrames: storyArc.totalDuration,
          totalDurationSeconds: (storyArc.totalDuration / 30).toString(), // Convert frames to seconds
          style: input.options?.style || 'professional',
          brandContext: storyArc.brandContext,
          scenes: storyArc.scenes,
          generationModel: 'gpt-4.1-mini',
          status: 'draft',
        }).returning();
        
        const savedArc = savedArcResult[0];
        if (savedArc) {
          console.log('[Story Arc] Saved to database with ID:', savedArc.id);
        }
        
        return {
          success: true,
          storyArc,
          savedArcId: savedArc?.id || null,
        };
      } catch (error) {
        console.error("[Story Arc] Generation error:", error);
        throw new Error(
          error instanceof Error ? error.message : "Story arc generation failed"
        );
      }
    }),

  // Test pixel-perfect extraction with section segmentation
  testPixelPerfectExtraction: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        mode: z.enum(['analyze', 'generate']).default('analyze'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      console.log('🎯 [PIXEL-PERFECT] Starting pixel-perfect extraction for:', input.url);
      
      try {
        // Step 1: Capture full page screenshot with Playwright
        console.log('📸 [PIXEL-PERFECT] Step 1: Capturing full page screenshot...');
        const browser = await playwrightCore.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          deviceScaleFactor: 2,
        });
        
        const page = await context.newPage();
        
        try {
          await page.goto(input.url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          
          await page.waitForTimeout(3000);
          
          // Capture full screenshot
          const fullScreenshotBuffer = await page.screenshot({
            fullPage: true,
            type: 'png',
          });
          
          // Upload to R2
          const screenshotUrl = await uploadScreenshotToR2(
            fullScreenshotBuffer,
            `pixel-perfect/${Date.now()}_full.png`,
            'extraction-lab'
          );
          
          console.log('✅ [PIXEL-PERFECT] Full screenshot captured:', screenshotUrl);
          
          // Create Screenshot object for our system
          const fullScreenshot: Screenshot = {
            id: `full_${Date.now()}`,
            type: 'full',
            url: screenshotUrl,
            widthPx: 3840, // 1920 * 2 (DPR)
            heightPx: await page.evaluate(() => document.body.scrollHeight) * 2,
            viewportCss: { w: 1920, h: 1080 },
            dpr: 2,
            digest: require('crypto').createHash('sha256').update(fullScreenshotBuffer).digest('hex').substring(0, 8),
          };
          
          // Step 2: Run two-pass segmentation
          console.log('🔍 [PIXEL-PERFECT] Step 2: Running two-pass section segmentation...');
          const classifier = new EnhancedSectionClassifier();
          const sections = await classifier.classifyAndCropSections(
            fullScreenshot,
            fullScreenshotBuffer,
            undefined, // No DOM snapshot for now
            'pixel-perfect-test'
          );
          
          console.log(`📦 [PIXEL-PERFECT] Found ${sections.length} sections:`);
          sections.forEach((section, i) => {
            console.log(`  ${i + 1}. ${section.type} (${section.bbox.w}x${section.bbox.h}px)`);
            console.log(`     - ID: ${section.id}`);
            console.log(`     - Screenshot: ${section.screenshotUrl}`);
            console.log(`     - Duration: ${section.suggestedDurationMs}ms`);
            console.log(`     - Key elements: ${section.keyElements.join(', ')}`);
          });
          
          // Step 3: Extract UI rebuild specs for each section
          console.log('🏗️ [PIXEL-PERFECT] Step 3: Extracting UI rebuild specs...');
          const rebuildSpecs = await Promise.all(
            sections.map(async (section) => {
              const spec = await classifier.deriveUIRebuildSpec(section, section.screenshotUrl);
              console.log(`  ✓ ${section.type}: ${spec.layers.length} layers extracted`);
              return spec;
            })
          );
          
          // Step 4: Extract assets
          console.log('🎨 [PIXEL-PERFECT] Step 4: Extracting assets (SVGs, images)...');
          const assetsPacks = await Promise.all(
            sections.map(async (section) => {
              const assets = await classifier.extractAssets(section);
              console.log(`  ✓ ${section.type}: ${Object.keys(assets.svgs).length} SVGs, ${Object.keys(assets.images).length} images`);
              return assets;
            })
          );
          
          // Step 5: STOP HERE - Just prepare data for ADD tool
          let preparedScenes = null;
          if (input.mode === 'generate') {
            console.log('🎬 [PIXEL-PERFECT] Step 5: Preparing data for ADD tool (NOT generating)...');
            
            preparedScenes = sections.map((section, i) => {
              const spec = rebuildSpecs[i];
              const assets = assetsPacks[i];
              
              if (!spec || !assets) {
                console.warn(`  ⚠️ Missing data for ${section.type}, skipping`);
                return null;
              }
              
              console.log(`  ✓ ${section.type}: Ready with ${spec.layers.length} layers`);
              
              return {
                section,
                rebuildSpec: spec,
                assets,
                addToolInput: {
                  imageUrl: section.screenshotUrl,
                  prompt: `Create motion graphics from ${section.type} section with ${spec.layers.length} UI elements`,
                  uiSpec: spec,
                  assetsPack: assets
                }
              };
            }).filter(Boolean);
          }
          
          const totalTime = Date.now() - startTime;
          console.log(`🎉 [PIXEL-PERFECT] Completed in ${totalTime}ms`);
          
          return {
            success: true,
            mode: input.mode,
            url: input.url,
            screenshot: {
              url: screenshotUrl,
              dimensions: { w: fullScreenshot.widthPx, h: fullScreenshot.heightPx },
            },
            sections: sections.map((s, i) => ({
              ...s,
              rebuildSpec: rebuildSpecs[i],
              assets: assetsPacks[i],
            })),
            preparedScenes,
            timeline: {
              total: totalTime,
              screenshot: 0, // Would track individual steps
              segmentation: 0,
              extraction: 0,
              generation: 0,
            },
            logs: [
              `Found ${sections.length} sections`,
              `Extracted ${rebuildSpecs.reduce((sum, spec) => sum + (spec?.layers.length || 0), 0)} total UI layers`,
              `Mode: ${input.mode}`,
            ],
          };
        } finally {
          await browser.close();
        }
      } catch (error) {
        console.error('❌ [PIXEL-PERFECT] Error:', error);
        throw new Error(error instanceof Error ? error.message : 'Pixel-perfect extraction failed');
      }
    }),

  // Test hero's journey V2 with extraction
  testHeroJourneyV2: protectedProcedure
    .input(
      z.object({
        brandJSON: z.any(), // Accept the full brandJSON from extraction
        options: z.object({
          sceneCount: z.number().min(3).max(7).default(5),
          totalDurationSeconds: z.number().min(10).max(30).default(15),
          style: z.enum(['dramatic', 'energetic', 'professional', 'playful']).default('professional'),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[Hero Journey V2] Starting story arc generation...');
        
        // Import the hero journey V2
        const { heroJourneyV2 } = await import('~/tools/narrative/herosJourneyV2');
        
        // Generate the story arc
        const storyArc = await heroJourneyV2.generateStoryArc(
          input.brandJSON,
          input.options || {}
        );
        
        console.log('[Hero Journey V2] Story arc generated:', {
          title: storyArc.title,
          sceneCount: storyArc.scenes.length,
          totalDuration: storyArc.totalDuration,
          structure: storyArc.narrativeStructure
        });
        
        // Log first scene as example
        if (storyArc.scenes[0]) {
          console.log('[Hero Journey V2] First scene:', {
            title: storyArc.scenes[0].title,
            duration: storyArc.scenes[0].duration,
            headline: storyArc.scenes[0].text.headline,
            template: storyArc.scenes[0].template.name
          });
        }
        
        return {
          success: true,
          storyArc,
        };
      } catch (error) {
        console.error("[Hero Journey V2] Error:", error);
        throw new Error(
          error instanceof Error ? error.message : "Story arc generation failed"
        );
      }
    }),
});