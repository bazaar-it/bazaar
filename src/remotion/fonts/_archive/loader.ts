// src/remotion/fonts/loader.ts
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT_CATALOG} from './catalog';

const loaded = new Set<string>();
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // Exponential backoff

export async function ensureFontLoaded(family: string, weight: string = '400') {
  const canonical = canonicalizeFamily(family);
  
  // CRITICAL FIX: Drop fonts not in catalog entirely
  if (!FONT_CATALOG[canonical]) {
    console.warn(`[Font Loader] ⚠️ Font "${family}" NOT in catalog - skipping (will use CSS fallback)`);
    return; // Don't even try to load
  }
  
  const key = `${canonical}:${weight}`;
  if (loaded.has(key)) {
    console.log(`[Font Loader] Font already loaded: ${family} weight ${weight}`);
    return;
  }
  
  const fam = FONT_CATALOG[canonical];
  let file = fam?.[weight];
  let actualWeight = weight;
  
  // Special handling for Bebas Neue - it only has weight 400
  if (canonical === 'Bebas Neue' && !file) {
    console.log(`[Font Loader] Bebas Neue weight ${weight} not available, forcing to 400`);
    file = fam?.['400'];
    actualWeight = '400';
  }
  
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
      actualWeight = nearest;
      console.log(`[Font Loader] Weight ${weight} not available for ${family}, using nearest: ${nearest}`);
    }
  }
  
  // If still no file, use Inter as ultimate fallback
  if (!file) {
    console.log(`[Font Loader] No valid weight found for ${family}, falling back to Inter`);
    const inter = FONT_CATALOG['Inter'];
    file = inter?.['400'];
    family = 'Inter';
    actualWeight = '400';
  }
  
  if (!file) {
    console.error(`[Font Loader] CRITICAL: Could not find any font file, even Inter fallback`);
    return;
  }
  
  const fontUrl = staticFile(`fonts/${file}`);
  console.log(`[Font Loader] Will attempt to load: ${canonical} weight ${actualWeight}`);
  console.log(`[Font Loader] Full URL: ${fontUrl}`);
  
  // Retry logic with exponential backoff
  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[Font Loader] Attempt ${attempt + 1}/${MAX_RETRIES} for ${canonical} weight ${actualWeight}`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Font load timeout after 5 seconds')), 5000);
      });
      
      // Race between font loading and timeout
      await Promise.race([
        loadFont({family: canonical, weight: actualWeight, url: fontUrl}),
        timeoutPromise
      ]);
      
      loaded.add(key);
      console.log(`[Font Loader] ✅ Successfully loaded: ${canonical} weight ${actualWeight}`);
      return; // Success!
      
    } catch (error: any) {
      lastError = error;
      console.warn(`[Font Loader] Attempt ${attempt + 1} failed for ${canonical} weight ${actualWeight}:`, error?.message || error);
      
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`[Font Loader] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - log but NEVER crash
  console.error(`[Font Loader] ❌ FAILED after ${MAX_RETRIES} attempts: ${canonical} weight ${actualWeight}`);
  console.error(`[Font Loader] Last error:`, lastError);
  console.warn(`[Font Loader] 🔄 Continuing with CSS fallback for ${canonical}`);
  loaded.add(key); // Mark as "handled" to avoid re-attempts
}

export async function ensureFonts(fonts: Array<{family: string; weight?: string}>) {
  console.log(`[Font Loader] Ensuring ${fonts.length} fonts...`);
  
  // Pre-filter: only attempt to load fonts that exist in catalog
  const validFonts = fonts.filter(f => {
    const canonical = canonicalizeFamily(f.family);
    if (!FONT_CATALOG[canonical]) {
      console.warn(`[Font Loader] Dropping ${f.family} - not in catalog`);
      return false;
    }
    return true;
  });
  
  console.log(`[Font Loader] After filtering: ${validFonts.length} valid fonts to load`);
  
  // Load in parallel with Promise.allSettled for resilience
  const results = await Promise.allSettled(
    validFonts.map(f => ensureFontLoaded(f.family, f.weight ?? '400'))
  );
  
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`[Font Loader] ${failed.length}/${validFonts.length} fonts failed to load, but continuing...`);
  } else if (validFonts.length > 0) {
    console.log(`[Font Loader] ✅ All ${validFonts.length} fonts loaded successfully`);
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
    ['Space Mono', ['SpaceMono', 'Space-Mono']],
    ['Ubuntu Mono', ['UbuntuMono', 'Ubuntu-Mono']],
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