#!/usr/bin/env node

/**
 * Script to download WOFF2 font files from Google Fonts
 * Run: node scripts/download-fonts.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Core fonts to download
const FONTS = [
  // Sans-serif
  { family: 'Inter', weights: ['400', '500', '700'] },
  { family: 'Roboto', weights: ['400', '700'] },
  { family: 'DM Sans', weights: ['400', '700'] },
  { family: 'Poppins', weights: ['400', '700'] },
  { family: 'Montserrat', weights: ['400', '700'] },
  { family: 'Raleway', weights: ['400', '700'] },
  { family: 'Ubuntu', weights: ['400', '700'] },
  
  // Serif
  { family: 'Playfair Display', weights: ['400', '700'] },
  { family: 'Merriweather', weights: ['400', '700'] },
  
  // Display
  { family: 'Bebas Neue', weights: ['400'] },
  
  // Script
  { family: 'Lobster', weights: ['400'] },
  { family: 'Dancing Script', weights: ['400', '700'] },
  { family: 'Pacifico', weights: ['400'] },
  
  // Monospace
  { family: 'Fira Code', weights: ['400', '700'] },
  { family: 'JetBrains Mono', weights: ['400', '700'] },
];

// Google Fonts API URL
const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'fonts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convert weight number to name
 */
function weightToName(weight) {
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
  return names[weight] || 'Regular';
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
    console.log(`✅ Downloaded: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${path.basename(outputPath)}: ${error.message}`);
    return false;
  }
}

/**
 * Get font URL from Google Fonts CSS
 */
async function getFontUrl(family, weight) {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    display: 'swap',
  });
  
  const url = `${GOOGLE_FONTS_API}?${params}`;
  
  try {
    // Request with a user agent that supports WOFF2
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const css = await response.text();
    
    // Extract WOFF2 URL from CSS
    const woff2Regex = /url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/;
    const match = css.match(woff2Regex);
    
    if (!match) {
      throw new Error('No WOFF2 URL found in CSS');
    }
    
    return match[1];
  } catch (error) {
    console.error(`❌ Failed to get font URL for ${family} ${weight}: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting font download...\n');
  
  let totalDownloaded = 0;
  let totalFailed = 0;
  
  for (const font of FONTS) {
    console.log(`\n📦 Processing ${font.family}...`);
    
    for (const weight of font.weights) {
      const fontUrl = await getFontUrl(font.family, weight);
      
      if (fontUrl) {
        const filename = `${familyToFilename(font.family)}-${weightToName(weight)}.woff2`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        const success = await downloadFont(fontUrl, outputPath);
        if (success) {
          totalDownloaded++;
        } else {
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Downloaded: ${totalDownloaded} fonts`);
  console.log(`❌ Failed: ${totalFailed} fonts`);
  console.log('='.repeat(50));
  
  if (totalDownloaded > 0) {
    console.log(`\n📁 Fonts saved to: ${OUTPUT_DIR}`);
    console.log('\n📋 Next steps:');
    console.log('1. Upload fonts to R2 with proper CORS headers');
    console.log('2. Update font registry URLs to point to R2');
    console.log('3. Deploy new Lambda site');
    console.log('4. Test font rendering in exports');
  }
}

// Run the script
main().catch(console.error);