// scripts/vendor-fonts.js
// Copy specific @fontsource files into public/fonts
const fs = require('fs');
const path = require('path');

const targets = [
  // DM Sans 500
  {
    pkg: '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2',
    out: 'DMSans-Medium.woff2',
  },
  // Poppins 500
  {
    pkg: '@fontsource/poppins/files/poppins-latin-500-normal.woff2',
    out: 'Poppins-Medium.woff2',
  },
  // Montserrat 500
  {
    pkg: '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2',
    out: 'Montserrat-Medium.woff2',
  },
  // Raleway 200
  {
    pkg: '@fontsource/raleway/files/raleway-latin-200-normal.woff2',
    out: 'Raleway-ExtraLight.woff2',
  },
  // Plus Jakarta Sans 200/400/500/700
  {
    pkg: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-200-normal.woff2',
    out: 'PlusJakartaSans-ExtraLight.woff2',
  },
  {
    pkg: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2',
    out: 'PlusJakartaSans-Regular.woff2',
  },
  {
    pkg: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2',
    out: 'PlusJakartaSans-Medium.woff2',
  },
  {
    pkg: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2',
    out: 'PlusJakartaSans-Bold.woff2',
  },
];

const destDir = path.resolve(process.cwd(), 'public', 'fonts');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, {recursive: true});

let copied = 0;
for (const t of targets) {
  try {
    const src = path.resolve(process.cwd(), 'node_modules', t.pkg);
    const dst = path.join(destDir, t.out);
    if (!fs.existsSync(src)) {
      console.warn('[vendor-fonts] Missing source:', src);
      continue;
    }
    fs.copyFileSync(src, dst);
    console.log('[vendor-fonts] Copied', t.out);
    copied++;
  } catch (e) {
    console.warn('[vendor-fonts] Failed to copy', t.out, e.message);
  }
}

console.log(`[vendor-fonts] Done. Copied ${copied}/${targets.length}. Output: ${destDir}`);
