#!/usr/bin/env node

/**
 * Script to download missing Google Fonts that AI is requesting but aren't in our catalog
 * Run with: node scripts/download-missing-fonts.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonts that AI is requesting but we don't have
const MISSING_FONTS = {
  // Sans-serif
  'Open Sans': { weights: ['300', '400', '500', '600', '700'] },
  'Nunito': { weights: ['300', '400', '600', '700'] },
  'Quicksand': { weights: ['300', '400', '500', '600', '700'] },
  'Comfortaa': { weights: ['300', '400', '700'] },
  'Noto Sans JP': { weights: ['400', '700'] },
  
  // Serif
  'Crimson Text': { weights: ['400', '700'] },
  'Lora': { weights: ['400', '700'] },
  'Libre Baskerville': { weights: ['400', '700'] },
  'Cormorant Garamond': { weights: ['300', '400', '700'] },
  
  // Script
  'Great Vibes': { weights: ['400'] },
  'Satisfy': { weights: ['400'] },
  'Kaushan Script': { weights: ['400'] },
  'Allura': { weights: ['400'] },
  'Lobster Two': { weights: ['400', '700'] },
  
  // Display
  'Oswald': { weights: ['300', '400', '500', '600', '700'] },
  'Anton': { weights: ['400'] },
  'Righteous': { weights: ['400'] },
  'Fredoka One': { weights: ['400'] },
  'Bangers': { weights: ['400'] },
  'Abril Fatface': { weights: ['400'] },
  'Orbitron': { weights: ['400', '500', '600', '700', '800', '900'] },
  
  // Monospace
  'Space Mono': { weights: ['400', '700'] },
  'Source Code Pro': { weights: ['400', '500', '700'] },
  'Roboto Mono': { weights: ['400', '500', '700'] },
  'Ubuntu Mono': { weights: ['400', '700'] },
  
  // Also add missing Inter weights
  'Inter': { weights: ['100', '200'] } // Adding Thin and ExtraLight
};

// Google Fonts API (using CSS API to get WOFF2 URLs)
async function getFontUrl(family, weight) {
  return new Promise((resolve, reject) => {
    const familyParam = family.replace(/ /g, '+');
    // For variable fonts, we need to request the full range
    const isVariableFont = ['Inter', 'Open Sans', 'Nunito', 'Quicksand', 'Comfortaa', 
                           'Noto Sans JP', 'Lora', 'Cormorant Garamond', 'Oswald', 
                           'Orbitron', 'Source Code Pro', 'Roboto Mono'].includes(family);
    
    let url;
    if (isVariableFont) {
      // Request variable font with full weight range
      url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@100..900&display=swap`;
    } else {
      // Request specific weight for non-variable fonts
      url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`;
    }
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // For variable fonts, extract the variable font URL
        // For static fonts, extract the specific weight URL
        let woff2Match;
        
        if (isVariableFont) {
          // Look for variable font URL (contains wght in the URL)
          woff2Match = data.match(/url\(([^)]+wght[^)]+\.woff2)\)/);
          if (!woff2Match) {
            // Fallback to any woff2 URL
            woff2Match = data.match(/url\(([^)]+\.woff2)\)/);
          }
        } else {
          // Look for specific weight (check for the weight in CSS comment or unicode-range)
          const lines = data.split('\n');
          let foundWeight = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check if this is the right weight block
            if (line.includes(`font-weight: ${weight}`) || 
                (weight === '400' && line.includes('font-weight: normal'))) {
              foundWeight = true;
            }
            if (foundWeight && line.includes('url(')) {
              const match = line.match(/url\(([^)]+\.woff2)\)/);
              if (match) {
                woff2Match = match;
                break;
              }
            }
          }
          
          // Fallback: just get first woff2 URL
          if (!woff2Match) {
            woff2Match = data.match(/url\(([^)]+\.woff2)\)/);
          }
        }
        
        if (woff2Match) {
          resolve(woff2Match[1]);
        } else {
          reject(new Error(`No WOFF2 found for ${family} ${weight}`));
        }
      });
    }).on('error', reject);
  });
}

// Download file
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Convert font name to filename
function toFilename(family, weight) {
  const cleanFamily = family.replace(/ /g, '');
  const weightNames = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black'
  };
  const weightName = weightNames[weight] || 'Regular';
  return `${cleanFamily}-${weightName}.woff2`;
}

// Main function
async function downloadMissingFonts() {
  const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
  
  console.log('🔍 Checking fonts directory:', fontsDir);
  
  if (!fs.existsSync(fontsDir)) {
    console.error('❌ Fonts directory does not exist!');
    process.exit(1);
  }
  
  console.log('\n📥 Starting font downloads...\n');
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const [family, config] of Object.entries(MISSING_FONTS)) {
    console.log(`\n📦 Processing ${family}...`);
    
    for (const weight of config.weights) {
      const filename = toFilename(family, weight);
      const filepath = path.join(fontsDir, filename);
      
      // Skip if already exists
      if (fs.existsSync(filepath)) {
        console.log(`  ⏭️  ${filename} already exists, skipping`);
        skipped++;
        continue;
      }
      
      try {
        console.log(`  ⬇️  Downloading ${family} ${weight}...`);
        const fontUrl = await getFontUrl(family, weight);
        
        // For variable fonts, save with the weight-specific filename
        // but download the variable font file
        const isVariableFont = ['Inter', 'Open Sans', 'Nunito', 'Quicksand', 'Comfortaa', 
                               'Noto Sans JP', 'Lora', 'Cormorant Garamond', 'Oswald', 
                               'Orbitron', 'Source Code Pro', 'Roboto Mono'].includes(family);
        
        if (isVariableFont) {
          // For variable fonts, we download once and create symlinks or copies
          const variableFilePath = path.join(fontsDir, `${family.replace(/ /g, '')}-Variable.woff2`);
          
          // Download variable font if not already downloaded
          if (!fs.existsSync(variableFilePath)) {
            await downloadFile(fontUrl, variableFilePath);
            console.log(`  ✅ Downloaded ${family} variable font`);
          }
          
          // Copy to weight-specific filename
          if (!fs.existsSync(filepath)) {
            fs.copyFileSync(variableFilePath, filepath);
            console.log(`  ✅ Created ${filename} from variable font`);
            downloaded++;
          } else {
            console.log(`  ⏭️  ${filename} already exists`);
            skipped++;
          }
        } else {
          // Regular static font download
          await downloadFile(fontUrl, filepath);
          console.log(`  ✅ Downloaded ${filename}`);
          downloaded++;
        }
      } catch (error) {
        console.error(`  ❌ Failed to download ${family} ${weight}:`, error.message);
        failed++;
      }
      
      // Small delay to be nice to Google's servers
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n📊 Download Summary:');
  console.log(`  ✅ Downloaded: ${downloaded} fonts`);
  console.log(`  ⏭️  Skipped: ${skipped} fonts (already existed)`);
  console.log(`  ❌ Failed: ${failed} fonts`);
  
  if (downloaded > 0) {
    console.log('\n📝 Now you need to update src/remotion/fonts/catalog.ts with the new fonts!');
    console.log('   Run: node scripts/update-font-catalog.js');
  }
}

// Run the script
downloadMissingFonts().catch(console.error);