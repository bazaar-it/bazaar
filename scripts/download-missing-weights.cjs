#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Define all the fonts we need with ALL their weight variants
const FONTS_TO_DOWNLOAD = {
  'Inter': {
    weights: {
      '300': 'Light',
      '400': 'Regular', 
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'DM Sans': {
    weights: {
      '400': 'Regular',
      '500': 'Medium',
      '700': 'Bold'
    }
  },
  'Plus Jakarta Sans': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold'
    }
  },
  'Roboto': {
    weights: {
      '100': 'Thin',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '700': 'Bold',
      '900': 'Black'
    }
  },
  'Poppins': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Montserrat': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Raleway': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Ubuntu': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '700': 'Bold'
    }
  },
  'Fira Code': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold'
    }
  },
  'Source Code Pro': {
    weights: {
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'IBM Plex Mono': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold'
    }
  },
  'Open Sans': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold'
    }
  },
  'Lato': {
    weights: {
      '100': 'Thin',
      '300': 'Light',
      '400': 'Regular',
      '700': 'Bold',
      '900': 'Black'
    }
  },
  'Work Sans': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Nunito': {
    weights: {
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Space Grotesk': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold'
    }
  },
  'Sora': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold'
    }
  },
  'Outfit': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Manrope': {
    weights: {
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold'
    }
  },
  // Single weight fonts (already have these)
  'Bebas Neue': {
    weights: {
      '400': 'Regular'
    }
  },
  'Pacifico': {
    weights: {
      '400': 'Regular'
    }
  },
  'Lobster': {
    weights: {
      '400': 'Regular'
    }
  },
  'Dancing Script': {
    weights: {
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold'
    }
  },
  'Caveat': {
    weights: {
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold'
    }
  },
  'Permanent Marker': {
    weights: {
      '400': 'Regular'
    }
  },
  'Playfair Display': {
    weights: {
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold',
      '900': 'Black'
    }
  },
  'Merriweather': {
    weights: {
      '300': 'Light',
      '400': 'Regular',
      '700': 'Bold',
      '900': 'Black'
    }
  },
  'JetBrains Mono': {
    weights: {
      '100': 'Thin',
      '200': 'ExtraLight',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'SemiBold',
      '700': 'Bold',
      '800': 'ExtraBold'
    }
  }
};

// Ensure fonts directory exists
const FONT_DIR = path.join(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(FONT_DIR)) {
  fs.mkdirSync(FONT_DIR, { recursive: true });
}

// Check which fonts already exist
function fontExists(fontFamily, weight) {
  const fontName = fontFamily.replace(/\s+/g, '');
  const weightName = FONTS_TO_DOWNLOAD[fontFamily].weights[weight];
  const filename = `${fontName}-${weightName}.woff2`;
  const filepath = path.join(FONT_DIR, filename);
  return fs.existsSync(filepath);
}

// Download a font file
async function downloadFont(fontFamily, weight) {
  const fontName = fontFamily.replace(/\s+/g, '');
  const weightName = FONTS_TO_DOWNLOAD[fontFamily].weights[weight];
  const filename = `${fontName}-${weightName}.woff2`;
  const filepath = path.join(FONT_DIR, filename);
  
  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`✓ Already exists: ${filename}`);
    return;
  }
  
  // Get font URL from Google Fonts
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@${weight}&display=swap`;
  
  return new Promise((resolve, reject) => {
    https.get(googleFontsUrl, (res) => {
      let cssContent = '';
      res.on('data', (chunk) => {
        cssContent += chunk;
      });
      
      res.on('end', () => {
        // Extract woff2 URL from CSS
        const woff2Match = cssContent.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/);
        
        if (!woff2Match) {
          console.log(`⚠️  No woff2 URL found for ${fontFamily} ${weight}`);
          resolve();
          return;
        }
        
        const woff2Url = woff2Match[1];
        
        // Download the woff2 file
        const file = fs.createWriteStream(filepath);
        https.get(woff2Url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✓ Downloaded: ${filename}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete the file on error
          console.error(`✗ Error downloading ${filename}:`, err.message);
          reject(err);
        });
      });
    }).on('error', (err) => {
      console.error(`✗ Error fetching CSS for ${fontFamily}:`, err.message);
      reject(err);
    });
  });
}

// Main function
async function main() {
  console.log('🚀 Starting font download for all weight variants...\n');
  
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const [fontFamily, config] of Object.entries(FONTS_TO_DOWNLOAD)) {
    console.log(`\n📦 Processing ${fontFamily}...`);
    
    for (const weight of Object.keys(config.weights)) {
      try {
        if (fontExists(fontFamily, weight)) {
          totalSkipped++;
        } else {
          await downloadFont(fontFamily, weight);
          totalDownloaded++;
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        totalFailed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Download complete!');
  console.log(`📊 Downloaded: ${totalDownloaded} fonts`);
  console.log(`⏭️  Skipped (already exist): ${totalSkipped} fonts`);
  console.log(`❌ Failed: ${totalFailed} fonts`);
  console.log('='.repeat(50));
  
  console.log('\n💡 Next steps:');
  console.log('1. Run: node scripts/upload-fonts-to-r2.js');
  console.log('2. Deploy new Lambda site with updated fonts');
}

// Run the script
main().catch(console.error);