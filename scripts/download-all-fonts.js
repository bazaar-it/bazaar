#!/usr/bin/env node

/**
 * Script to download all 100 motion graphics fonts
 * Prioritizes variable fonts where available to reduce file count
 * Run: node scripts/download-all-fonts.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import font list
import { MOTION_GRAPHICS_FONTS } from '../src/remotion/fonts/motion-graphics-fonts.js';

// Google Fonts API URL
const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'fonts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convert weight to filename part
 */
function weightToFilename(weight) {
  const names = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
  };
  return names[weight] || weight;
}

/**
 * Convert font family name to filename
 */
function familyToFilename(family) {
  return family.replace(/\s+/g, '');
}

/**
 * Download a single font file
 */
async function downloadFont(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`  ✅ ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed: ${path.basename(outputPath)} - ${error.message}`);
    return false;
  }
}

/**
 * Get variable font URL from Google Fonts
 */
async function getVariableFontUrl(family, weights) {
  // For variable fonts, request with range syntax
  const weightRange = `${Math.min(...weights.map(Number))}..${Math.max(...weights.map(Number))}`;
  const params = new URLSearchParams({
    family: `${family}:wght@${weightRange}`,
    display: 'swap',
  });
  
  const url = `${GOOGLE_FONTS_API}?${params}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const css = await response.text();
    
    // Look for variable font URL (contains weight range in comment)
    const variableRegex = /\/\*.*wght@(\d+)\.\.(\d+).*\*\/[^}]*url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/;
    const match = css.match(variableRegex);
    
    if (match) {
      return match[3];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get static font URL from Google Fonts
 */
async function getStaticFontUrl(family, weight) {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    display: 'swap',
  });
  
  const url = `${GOOGLE_FONTS_API}?${params}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const css = await response.text();
    const woff2Regex = /url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/;
    const match = css.match(woff2Regex);
    
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Process a single font family
 */
async function processFont(font) {
  const { family, weights, variable } = font;
  console.log(`\n📦 ${family} (${weights.length} weights${variable ? ', variable' : ''})`);
  
  let downloaded = 0;
  let failed = 0;
  
  // Try variable font first if supported
  if (variable && weights.length > 1) {
    const varUrl = await getVariableFontUrl(family, weights);
    
    if (varUrl) {
      const filename = `${familyToFilename(family)}-Variable.woff2`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      
      if (await downloadFont(varUrl, outputPath)) {
        downloaded++;
        return { downloaded, failed }; // Variable font covers all weights
      }
    }
    
    console.log('  ⚠️ Variable font not available, downloading static weights...');
  }
  
  // Download individual weights
  for (const weight of weights) {
    const fontUrl = await getStaticFontUrl(family, weight);
    
    if (fontUrl) {
      const filename = `${familyToFilename(family)}-${weightToFilename(weight)}.woff2`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      
      if (await downloadFont(fontUrl, outputPath)) {
        downloaded++;
      } else {
        failed++;
      }
    } else {
      console.error(`  ❌ No URL for weight ${weight}`);
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return { downloaded, failed };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting font download for 100 motion graphics fonts...\n');
  console.log('Categories:');
  for (const [category, fonts] of Object.entries(MOTION_GRAPHICS_FONTS)) {
    console.log(`  • ${category}: ${fonts.length} fonts`);
  }
  
  let totalDownloaded = 0;
  let totalFailed = 0;
  let totalFamilies = 0;
  
  // Process each category
  for (const [category, fonts] of Object.entries(MOTION_GRAPHICS_FONTS)) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📁 ${category.toUpperCase()} (${fonts.length} fonts)`);
    console.log('='.repeat(50));
    
    for (const font of fonts) {
      const result = await processFont(font);
      totalDownloaded += result.downloaded;
      totalFailed += result.failed;
      totalFamilies++;
      
      // Progress indicator
      process.stdout.write(`Progress: ${totalFamilies}/100 families\r`);
    }
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Downloaded: ${totalDownloaded} font files`);
  console.log(`❌ Failed: ${totalFailed} files`);
  console.log(`📦 Total families: ${totalFamilies}`);
  console.log('='.repeat(50));
  
  if (totalDownloaded > 0) {
    console.log(`\n📁 Fonts saved to: ${OUTPUT_DIR}`);
    
    // Count actual files
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.woff2'));
    console.log(`📊 Total WOFF2 files: ${files.length}`);
    
    // Calculate total size
    let totalSize = 0;
    for (const file of files) {
      const stats = fs.statSync(path.join(OUTPUT_DIR, file));
      totalSize += stats.size;
    }
    console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Run: node scripts/upload-fonts-to-r2.js');
    console.log('2. Deploy new Lambda site');
    console.log('3. Test font rendering in exports');
  }
}

// Run the script
main().catch(console.error);