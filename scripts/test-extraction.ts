/**
 * Test script for the enhanced extraction and brand analysis system
 */

import * as playwrightCore from 'playwright-core';
import { BrandAnalyzerV2 } from '../src/server/services/brand/BrandAnalyzerV2';
import { uploadScreenshotToR2 } from '../src/lib/utils/r2-upload';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testExtraction(url: string) {
  console.log(`\n🚀 Testing extraction for: ${url}\n`);
  console.log('=' + '='.repeat(79));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Web Extraction with Playwright
    console.log('\n📸 STAGE 1: WEB EXTRACTION');
    console.log('-'.repeat(80));
    const extractionStart = Date.now();
    
    console.log('🌐 Launching browser...');
    const browser = await playwrightCore.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    
    const page = await context.newPage();
    
    try {
      console.log(`🔗 Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      console.log('✅ Page loaded successfully');
      
      await page.waitForTimeout(3000);
      
      // Hide popups
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
      console.log('📋 Extracting metadata...');
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
      console.log('  Title:', metadata.title);
      console.log('  Description:', metadata.description?.substring(0, 100) + '...');
      
      // Extract HTML
      console.log('📄 Extracting HTML content...');
      const htmlContent = await page.content();
      const cleanedHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      console.log('  HTML length:', htmlContent.length, 'characters');
      console.log('  Cleaned HTML length:', cleanedHtml.length, 'characters');
      
      // Capture screenshots
      console.log('📷 Capturing screenshots...');
      const screenshots: any[] = [];
      
      // Full page screenshot
      console.log('  Taking full page screenshot...');
      const fullScreenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
      
      // Convert to base64 for testing
      const fullScreenshotUrl = `data:image/png;base64,${fullScreenshot.toString('base64').substring(0, 100)}...`;
      console.log('  Full screenshot captured (', fullScreenshot.length, 'bytes)');
      
      screenshots.push({
        id: 'full_001',
        type: 'full',
        url: fullScreenshotUrl,
        dimensions: { width: 1920, height: await page.evaluate(() => document.body.scrollHeight) },
      });
      
      // Hero screenshot
      console.log('  Taking hero/viewport screenshot...');
      const heroScreenshot = await page.screenshot({
        fullPage: false,
        type: 'png',
      });
      
      const heroScreenshotUrl = `data:image/png;base64,${heroScreenshot.toString('base64').substring(0, 100)}...`;
      console.log('  Hero screenshot captured (', heroScreenshot.length, 'bytes)');
      
      screenshots.push({
        id: 'hero_001',
        type: 'viewport',
        url: heroScreenshotUrl,
        dimensions: { width: 1920, height: 1080 },
      });
      
      // Extract styles
      console.log('🎨 Extracting styles and colors...');
      const styles = await page.evaluate(() => {
        const colors = new Set<string>();
        const elements = document.querySelectorAll('*');
        
        elements.forEach((el) => {
          const computed = window.getComputedStyle(el);
          const bg = computed.backgroundColor;
          const color = computed.color;
          
          if (bg && bg !== 'rgba(0, 0, 0, 0)') colors.add(bg);
          if (color) colors.add(color);
        });
        
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
          palette: Array.from(colors).slice(0, 10),
          fonts: Array.from(fonts).slice(0, 5).map(f => ({ family: f })),
        };
      });
      
      console.log('  Colors found:', styles.palette.length);
      console.log('  First 3 colors:', styles.palette.slice(0, 3));
      console.log('  Fonts found:', styles.fonts.length);
      console.log('  Primary font:', styles.fonts[0]?.family);
      
      const extractionTime = Date.now() - extractionStart;
      console.log(`\n✅ Extraction completed in ${extractionTime}ms\n`);
      
      // Step 2: Brand Analysis with BrandAnalyzerV2
      console.log('🧠 STAGE 2: COMPREHENSIVE BRAND ANALYSIS');
      console.log('-'.repeat(80));
      const analysisStart = Date.now();
      
      const brandAnalyzer = new BrandAnalyzerV2();
      console.log('🤖 Initializing BrandAnalyzerV2...');
      console.log('📊 Sending data to LLM for analysis...');
      
      const brandJson = await brandAnalyzer.analyze({
        url,
        html: {
          raw: htmlContent,
          cleaned: cleanedHtml,
          rendered: cleanedHtml,
        },
        screenshots: screenshots.map(s => ({
          ...s,
          // For testing, use full base64 URLs
          url: `data:image/png;base64,${Buffer.from('test').toString('base64')}`, // Placeholder for testing
        })),
        styles,
        metadata,
      });
      
      const analysisTime = Date.now() - analysisStart;
      console.log(`\n✅ Brand analysis completed in ${analysisTime}ms\n`);
      
      // Display results
      console.log('📊 BRANDOJECT V2 RESULTS');
      console.log('=' + '='.repeat(79));
      console.log('\n🏢 BRAND IDENTITY:');
      console.log('  Name:', brandJson.brand?.name);
      console.log('  Tagline:', brandJson.brand?.tagline);
      console.log('  Mission:', brandJson.brand?.mission || 'Not found');
      console.log('  Voice:', brandJson.brand?.voice?.join(', '));
      console.log('  Archetype:', brandJson.brand?.archetype);
      
      console.log('\n🎨 DESIGN SYSTEM:');
      console.log('  Primary Color:', brandJson.design?.colors?.primary?.hex);
      console.log('  Secondary Color:', brandJson.design?.colors?.secondary?.hex);
      console.log('  Accent Color:', brandJson.design?.colors?.accent?.hex);
      console.log('  Heading Font:', brandJson.design?.typography?.headings?.family);
      console.log('  Body Font:', brandJson.design?.typography?.body?.family);
      
      console.log('\n📦 PRODUCT:');
      console.log('  Value Prop:', brandJson.product?.value_proposition?.headline);
      console.log('  Problem:', brandJson.product?.problem?.substring(0, 100));
      console.log('  Solution:', brandJson.product?.solution?.substring(0, 100));
      console.log('  Features:', brandJson.product?.features?.length || 0, 'found');
      if (brandJson.product?.features?.length) {
        brandJson.product.features.slice(0, 3).forEach((f: any) => {
          console.log(`    - ${f.title}: ${f.description?.substring(0, 60)}...`);
        });
      }
      
      console.log('\n👥 SOCIAL PROOF:');
      console.log('  Testimonials:', brandJson.socialProof?.testimonials?.length || 0);
      console.log('  Customer Logos:', brandJson.socialProof?.customerLogos?.length || 0);
      console.log('  Stats:', brandJson.socialProof?.stats?.length || 0);
      if (brandJson.socialProof?.stats?.length) {
        brandJson.socialProof.stats.slice(0, 3).forEach((s: any) => {
          console.log(`    - ${s.value}: ${s.label}`);
        });
      }
      
      console.log('\n📑 SECTIONS:');
      console.log('  Total sections identified:', brandJson.sections?.length || 0);
      brandJson.sections?.forEach((s: any) => {
        console.log(`    - ${s.name} (${s.type})`);
      });
      
      console.log('\n📈 CONFIDENCE:');
      console.log('  Overall:', (brandJson.confidence?.overall * 100).toFixed(0) + '%');
      console.log('  Structure:', (brandJson.confidence?.breakdown?.structure * 100).toFixed(0) + '%');
      console.log('  Content:', (brandJson.confidence?.breakdown?.content * 100).toFixed(0) + '%');
      console.log('  Visual:', (brandJson.confidence?.breakdown?.visual * 100).toFixed(0) + '%');
      console.log('  Brand:', (brandJson.confidence?.breakdown?.brand * 100).toFixed(0) + '%');
      console.log('  Product:', (brandJson.confidence?.breakdown?.product * 100).toFixed(0) + '%');
      
      const totalTime = Date.now() - startTime;
      console.log('\n' + '='.repeat(80));
      console.log(`🎉 TOTAL PROCESSING TIME: ${totalTime}ms`);
      console.log(`   - Extraction: ${extractionTime}ms`);
      console.log(`   - Analysis: ${analysisTime}ms`);
      console.log('=' + '='.repeat(79) + '\n');
      
      // Save full JSON to file for inspection
      const fs = await import('fs');
      const outputPath = path.resolve(process.cwd(), 'scripts', 'test-extraction-output.json');
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(brandJson, null, 2),
        'utf-8'
      );
      console.log(`💾 Full BrandJSON saved to: ${outputPath}\n`);
      
      await browser.close();
      
    } catch (error) {
      await browser.close();
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

// Test with different URLs
const testUrls = process.argv.slice(2);

if (testUrls.length === 0) {
  console.log('\n📋 Usage: npm run test:extraction <url1> [url2] [url3]...');
  console.log('Example: npm run test:extraction https://remotion.dev https://stripe.com\n');
  
  // Default test URL
  console.log('Running with default test URL: https://remotion.dev');
  testExtraction('https://remotion.dev').catch(console.error);
} else {
  // Test each URL sequentially
  (async () => {
    for (const url of testUrls) {
      await testExtraction(url);
    }
  })().catch(console.error);
}