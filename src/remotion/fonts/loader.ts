// src/remotion/fonts/loader.ts
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT_CATALOG} from './catalog';

const loaded = new Set<string>();

export async function ensureFontLoaded(family: string, weight: string = '400') {
  const canonical = canonicalizeFamily(family);
  const key = `${canonical}:${weight}`;
  if (loaded.has(key)) return;
  const fam = FONT_CATALOG[canonical];
  let file = fam?.[weight];
  // Fallback to nearest weight in family
  if (!file && fam) {
    const available = Object.keys(fam).sort((a, b) => Number(a) - Number(b));
    if (available.length > 0) {
      const target = Number(weight);
      let nearest = available[0];
      let best = Math.abs(Number(nearest) - target);
      for (const w of available) {
        const diff = Math.abs(Number(w) - target);
        if (diff < best) { best = diff; nearest = w; }
      }
      file = fam[nearest];
    }
  }
  // Fallback to Inter regular if family missing
  if (!file) {
    const inter = FONT_CATALOG['Inter'];
    file = inter?.['400'];
    family = 'Inter';
  }
  if (!file) return;
  const fontUrl = staticFile(`fonts/${file}`);
  console.log(`[Font Loader] Loading font: ${family} weight ${weight} from ${fontUrl}`);
  await loadFont({family: canonicalizeFamily(family), weight, url: fontUrl});
  loaded.add(key);
  console.log(`[Font Loader] Successfully loaded: ${family} weight ${weight}`);
}

export async function ensureFonts(fonts: Array<{family: string; weight?: string}>) {
  for (const f of fonts) {
    await ensureFontLoaded(f.family, f.weight ?? '400');
  }
}

// --- Alias normalization to prevent mismatches between scene CSS and catalog ---

// Build alias map: normalized keys (lowercase, no spaces/hyphens) to canonical family
const FAMILY_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/\s|-/g, '');
  const entries: Array<[string, string[]]> = [
    ['Inter', ['Inter']],
    ['DM Sans', ['DMSans', 'DM-Sans', 'DM_Sans']],
    ['Roboto', ['Roboto']],
    ['Poppins', ['Poppins']],
    ['Montserrat', ['Montserrat']],
    ['Playfair Display', ['PlayfairDisplay', 'Playfair-Display']],
    ['Merriweather', ['Merriweather']],
    ['Lobster', ['Lobster']],
    ['Dancing Script', ['DancingScript', 'Dancing-Script']],
    ['Pacifico', ['Pacifico']],
    ['Fira Code', ['FiraCode', 'Fira-Code']],
    ['JetBrains Mono', ['JetBrainsMono', 'JetBrains-Mono']],
    ['Raleway', ['Raleway']],
    ['Ubuntu', ['Ubuntu']],
    ['Bebas Neue', ['BebasNeue', 'Bebas-Neue']],
    ['Plus Jakarta Sans', ['PlusJakartaSans', 'Plus-Jakarta-Sans']],
  ];
  for (const [canonical, variants] of entries) {
    const all = new Set<string>([canonical, ...variants]);
    for (const v of all) {
      map[normalize(v)] = canonical;
    }
  }
  // Also include all catalog keys as canonical
  for (const fam of Object.keys(FONT_CATALOG)) {
    map[normalize(fam)] = fam;
  }
  return map;
})();

function canonicalizeFamily(family: string): string {
  const norm = family?.toString() ?? '';
  const key = norm.toLowerCase().replace(/\s|-/g, '');
  return FAMILY_ALIASES[key] || family;
}

// Preload all families (400/700 where available) – safest for now
export async function preloadAllCatalogFonts(): Promise<void> {
  const tasks: Array<Promise<void>> = [];
  for (const [family, weights] of Object.entries(FONT_CATALOG)) {
    const known = ['200','300','400','500','600','700','800','900'];
    for (const w of known) if (weights[w]) tasks.push(ensureFontLoaded(family, w));
  }
  await Promise.all(tasks);
}
