#!/usr/bin/env node

/**
 * Script to update the font catalog with newly downloaded fonts
 * Run with: node scripts/update-font-catalog.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete catalog including existing and new fonts
const COMPLETE_CATALOG = {
  // Existing fonts (keep these)
  'Inter': {
    '100': 'Inter-Thin.woff2',        // NEW
    '200': 'Inter-ExtraLight.woff2',  // NEW
    '300': 'Inter-Light.woff2',
    '400': 'Inter-Regular.woff2',
    '500': 'Inter-Medium.woff2',
    '600': 'Inter-SemiBold.woff2',
    '700': 'Inter-Bold.woff2',
    '800': 'Inter-ExtraBold.woff2',
    '900': 'Inter-Black.woff2',
  },
  'DM Sans': {
    '400': 'DMSans-Regular.woff2',
    '500': 'DMSans-Medium.woff2',
    '700': 'DMSans-Bold.woff2',
  },
  'Roboto': {
    '400': 'Roboto-Regular.woff2',
    '700': 'Roboto-Bold.woff2',
  },
  'Poppins': {
    '400': 'Poppins-Regular.woff2',
    '500': 'Poppins-Medium.woff2',
    '700': 'Poppins-Bold.woff2',
  },
  'Montserrat': {
    '400': 'Montserrat-Regular.woff2',
    '500': 'Montserrat-Medium.woff2',
    '700': 'Montserrat-Bold.woff2',
  },
  'Playfair Display': {
    '400': 'PlayfairDisplay-Regular.woff2',
    '700': 'PlayfairDisplay-Bold.woff2',
  },
  'Merriweather': {
    '400': 'Merriweather-Regular.woff2',
    '700': 'Merriweather-Bold.woff2',
  },
  'Lobster': {
    '400': 'Lobster-Regular.woff2',
  },
  'Dancing Script': {
    '400': 'DancingScript-Regular.woff2',
    '700': 'DancingScript-Bold.woff2',
  },
  'Pacifico': {
    '400': 'Pacifico-Regular.woff2',
  },
  'Fira Code': {
    '400': 'FiraCode-Regular.woff2',
    '700': 'FiraCode-Bold.woff2',
  },
  'JetBrains Mono': {
    '400': 'JetBrainsMono-Regular.woff2',
    '700': 'JetBrainsMono-Bold.woff2',
  },
  'Raleway': {
    '200': 'Raleway-ExtraLight.woff2',
    '400': 'Raleway-Regular.woff2',
    '700': 'Raleway-Bold.woff2',
  },
  'Ubuntu': {
    '400': 'Ubuntu-Regular.woff2',
    '700': 'Ubuntu-Bold.woff2',
  },
  'Bebas Neue': {
    '400': 'BebasNeue-Regular.woff2',
  },
  'Plus Jakarta Sans': {
    '200': 'PlusJakartaSans-ExtraLight.woff2',
    '400': 'PlusJakartaSans-Regular.woff2',
    '500': 'PlusJakartaSans-Medium.woff2',
    '700': 'PlusJakartaSans-Bold.woff2',
  },
  
  // NEW FONTS - Sans-serif
  'Open Sans': {
    '300': 'OpenSans-Light.woff2',
    '400': 'OpenSans-Regular.woff2',
    '500': 'OpenSans-Medium.woff2',
    '600': 'OpenSans-SemiBold.woff2',
    '700': 'OpenSans-Bold.woff2',
  },
  'Nunito': {
    '300': 'Nunito-Light.woff2',
    '400': 'Nunito-Regular.woff2',
    '600': 'Nunito-SemiBold.woff2',
    '700': 'Nunito-Bold.woff2',
  },
  'Quicksand': {
    '300': 'Quicksand-Light.woff2',
    '400': 'Quicksand-Regular.woff2',
    '500': 'Quicksand-Medium.woff2',
    '600': 'Quicksand-SemiBold.woff2',
    '700': 'Quicksand-Bold.woff2',
  },
  'Comfortaa': {
    '300': 'Comfortaa-Light.woff2',
    '400': 'Comfortaa-Regular.woff2',
    '700': 'Comfortaa-Bold.woff2',
  },
  'Noto Sans JP': {
    '400': 'NotoSansJP-Regular.woff2',
    '700': 'NotoSansJP-Bold.woff2',
  },
  
  // NEW FONTS - Serif
  'Crimson Text': {
    '400': 'CrimsonText-Regular.woff2',
    '700': 'CrimsonText-Bold.woff2',
  },
  'Lora': {
    '400': 'Lora-Regular.woff2',
    '700': 'Lora-Bold.woff2',
  },
  'Libre Baskerville': {
    '400': 'LibreBaskerville-Regular.woff2',
    '700': 'LibreBaskerville-Bold.woff2',
  },
  'Cormorant Garamond': {
    '300': 'CormorantGaramond-Light.woff2',
    '400': 'CormorantGaramond-Regular.woff2',
    '700': 'CormorantGaramond-Bold.woff2',
  },
  
  // NEW FONTS - Script
  'Great Vibes': {
    '400': 'GreatVibes-Regular.woff2',
  },
  'Satisfy': {
    '400': 'Satisfy-Regular.woff2',
  },
  'Kaushan Script': {
    '400': 'KaushanScript-Regular.woff2',
  },
  'Allura': {
    '400': 'Allura-Regular.woff2',
  },
  'Lobster Two': {
    '400': 'LobsterTwo-Regular.woff2',
    '700': 'LobsterTwo-Bold.woff2',
  },
  
  // NEW FONTS - Display
  'Oswald': {
    '300': 'Oswald-Light.woff2',
    '400': 'Oswald-Regular.woff2',
    '500': 'Oswald-Medium.woff2',
    '600': 'Oswald-SemiBold.woff2',
    '700': 'Oswald-Bold.woff2',
  },
  'Anton': {
    '400': 'Anton-Regular.woff2',
  },
  'Righteous': {
    '400': 'Righteous-Regular.woff2',
  },
  'Fredoka One': {
    '400': 'FredokaOne-Regular.woff2',
  },
  'Bangers': {
    '400': 'Bangers-Regular.woff2',
  },
  'Abril Fatface': {
    '400': 'AbrilFatface-Regular.woff2',
  },
  'Orbitron': {
    '400': 'Orbitron-Regular.woff2',
    '500': 'Orbitron-Medium.woff2',
    '600': 'Orbitron-SemiBold.woff2',
    '700': 'Orbitron-Bold.woff2',
    '800': 'Orbitron-ExtraBold.woff2',
    '900': 'Orbitron-Black.woff2',
  },
  
  // NEW FONTS - Monospace
  'Space Mono': {
    '400': 'SpaceMono-Regular.woff2',
    '700': 'SpaceMono-Bold.woff2',
  },
  'Source Code Pro': {
    '400': 'SourceCodePro-Regular.woff2',
    '500': 'SourceCodePro-Medium.woff2',
    '700': 'SourceCodePro-Bold.woff2',
  },
  'Roboto Mono': {
    '400': 'RobotoMono-Regular.woff2',
    '500': 'RobotoMono-Medium.woff2',
    '700': 'RobotoMono-Bold.woff2',
  },
  'Ubuntu Mono': {
    '400': 'UbuntuMono-Regular.woff2',
    '700': 'UbuntuMono-Bold.woff2',
  },
};

// Generate the TypeScript catalog file
function generateCatalog() {
  const catalogPath = path.join(__dirname, '..', 'src', 'remotion', 'fonts', 'catalog.ts');
  
  let content = `// src/remotion/fonts/catalog.ts
// Auto-generated by scripts/update-font-catalog.js
// Catalog of supported fonts. Files must exist under public/fonts.

export type FontWeights = Record<string, string>; // weight -> filename
export type FontCatalog = Record<string, FontWeights>; // family -> weights

export const FONT_CATALOG: FontCatalog = ${JSON.stringify(COMPLETE_CATALOG, null, 2)
    .replace(/"([^"]+)":/g, "'$1':")  // Use single quotes for keys
    .replace(/"/g, "'")};              // Use single quotes for values
`;
  
  // Backup existing catalog
  if (fs.existsSync(catalogPath)) {
    const backupPath = catalogPath + '.backup';
    fs.copyFileSync(catalogPath, backupPath);
    console.log(`📋 Backed up existing catalog to ${backupPath}`);
  }
  
  // Write new catalog
  fs.writeFileSync(catalogPath, content);
  console.log(`✅ Updated font catalog at ${catalogPath}`);
  
  // Count fonts
  const totalFonts = Object.keys(COMPLETE_CATALOG).length;
  const totalWeights = Object.values(COMPLETE_CATALOG).reduce((sum, weights) => 
    sum + Object.keys(weights).length, 0
  );
  
  console.log(`\n📊 Catalog Summary:`);
  console.log(`   Total font families: ${totalFonts}`);
  console.log(`   Total font files: ${totalWeights}`);
  
  // Check which files exist
  const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
  let existing = 0;
  let missing = [];
  
  for (const [family, weights] of Object.entries(COMPLETE_CATALOG)) {
    for (const [weight, filename] of Object.entries(weights)) {
      const filepath = path.join(fontsDir, filename);
      if (fs.existsSync(filepath)) {
        existing++;
      } else {
        missing.push(`${family} ${weight}: ${filename}`);
      }
    }
  }
  
  console.log(`\n📁 Font Files:`);
  console.log(`   ✅ Existing: ${existing} files`);
  console.log(`   ❌ Missing: ${missing.length} files`);
  
  if (missing.length > 0) {
    console.log(`\n⚠️  Missing font files:`);
    missing.forEach(m => console.log(`     - ${m}`));
    console.log(`\n   Run: node scripts/download-missing-fonts.js`);
  }
}

// Run the script
generateCatalog();