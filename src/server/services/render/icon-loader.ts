/**
 * Icon loader for build-time SVG inlining
 * Uses Iconify's official utilities to properly handle icons
 */
import type { IconifyJSON } from '@iconify/types';
import { getIconData, iconToSVG, replaceIDs } from '@iconify/utils';
import { uploadFile, getPublicUrl, fileExists } from '../../../../packages/r2';

// Lazy load icon sets to avoid loading unused sets
const iconSetLoaders: Record<string, () => Promise<IconifyJSON>> = {
  // Primary icon sets
  mdi: () => import('@iconify-json/mdi/icons.json').then(m => m.default || m),
  'material-symbols': () => import('@iconify-json/material-symbols/icons.json').then(m => m.default || m),
  lucide: () => import('@iconify-json/lucide/icons.json').then(m => m.default || m),
  carbon: () => import('@iconify-json/carbon/icons.json').then(m => m.default || m),
  tabler: () => import('@iconify-json/tabler/icons.json').then(m => m.default || m),
  
  // Additional icon sets found in codebase
  'simple-icons': () => import('@iconify-json/simple-icons/icons.json').then(m => m.default || m),
  heroicons: () => import('@iconify-json/heroicons/icons.json').then(m => m.default || m),
  healthicons: () => import('@iconify-json/healthicons/icons.json').then(m => m.default || m),
  bi: () => import('@iconify-json/bi/icons.json').then(m => m.default || m),
  codicon: () => import('@iconify-json/codicon/icons.json').then(m => m.default || m),
  devicon: () => import('@iconify-json/devicon/icons.json').then(m => m.default || m),
  'fa6-brands': () => import('@iconify-json/fa6-brands/icons.json').then(m => m.default || m),
  'fa6-solid': () => import('@iconify-json/fa6-solid/icons.json').then(m => m.default || m),
  logos: () => import('@iconify-json/logos/icons.json').then(m => m.default || m),
  octicon: () => import('@iconify-json/octicon/icons.json').then(m => m.default || m),
  'akar-icons': () => import('@iconify-json/akar-icons/icons.json').then(m => m.default || m),
  ic: () => import('@iconify-json/ic/icons.json').then(m => m.default || m),
};

// Cache loaded icon sets to avoid reloading
const loadedSets: Record<string, Promise<IconifyJSON>> = {};

// Cache for fetched SVGs from API (expires after 1 hour)
const svgCache: Map<string, { svg: { attributes: Record<string, string>, body: string }, timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Simple in-module telemetry counters (can be read by callers)
export const iconMetrics = {
  apiRequests: 0,
  apiSuccess: 0,
  apiFailures: 0,
  apiCachedHits: 0,
  localHits: 0,
  fallbacks: 0,
  rateLimited: 0,
  retries: 0,
  r2Reads: 0,
  r2ReadHits: 0,
  r2Writes: 0,
};

// Minimal rate limiter for Iconify API to avoid bursts from Lambda builds
const RATE_LIMIT_MAX = 60; // max requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute window
let apiRequestTimestamps: number[] = [];

function underApiRateLimit(): boolean {
  const now = Date.now();
  // Drop old timestamps
  apiRequestTimestamps = apiRequestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (apiRequestTimestamps.length >= RATE_LIMIT_MAX) {
    iconMetrics.rateLimited += 1;
    return false;
  }
  apiRequestTimestamps.push(now);
  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function iconR2Key(prefix: string, name: string) {
  return `icons/${prefix}/${name}.svg`;
}

async function readIconFromR2(prefix: string, name: string): Promise<{ attributes: Record<string, string>, body: string } | null> {
  try {
    iconMetrics.r2Reads += 1;
    const key = iconR2Key(prefix, name);
    const url = getPublicUrl(key);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const svgText = await res.text();
    iconMetrics.r2ReadHits += 1;
    // Parse minimal attributes/body from stored SVG
    const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
    const widthMatch = svgText.match(/width="([^"]+)"/);
    const heightMatch = svgText.match(/height="([^"]+)"/);
    const fillMatch = svgText.match(/fill="([^"]+)"/);
    const bodyMatch = svgText.match(/<svg[^>]*>(.*)<\/svg>/s);
    if (!bodyMatch) return null;
    return {
      attributes: {
        viewBox: viewBoxMatch?.[1] || '0 0 24 24',
        width: widthMatch?.[1] || '1em',
        height: heightMatch?.[1] || '1em',
        fill: fillMatch?.[1] || 'currentColor',
      },
      body: bodyMatch[1] || '',
    };
  } catch (_e) {
    return null;
  }
}

async function writeIconToR2(prefix: string, name: string, svg: { attributes: Record<string, string>, body: string }) {
  try {
    const key = iconR2Key(prefix, name);
    // Skip if already exists (idempotent)
    if (await fileExists(key)) return;
    const attrs = svg.attributes;
    const svgText = `<svg viewBox="${attrs.viewBox || '0 0 24 24'}" width="${attrs.width || '1em'}" height="${attrs.height || '1em'}" fill="${attrs.fill || 'currentColor'}" xmlns="http://www.w3.org/2000/svg">${svg.body}</svg>`;
    await uploadFile(key, svgText, {
      contentType: 'image/svg+xml',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { source: 'icon-loader' },
    });
    iconMetrics.r2Writes += 1;
  } catch (_e) {
    // Best-effort; ignore write errors
  }
}

/**
 * Fetch icon from Iconify API as fallback
 * Supports ALL 200,000+ icons without local packages
 */
async function fetchIconFromAPI(iconName: string): Promise<{ attributes: Record<string, string>, body: string } | null> {
  // Check cache first
  const cached = svgCache.get(iconName);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Icon Loader] Using cached SVG for ${iconName}`);
    iconMetrics.apiCachedHits += 1;
    return cached.svg;
  }
  
  const [prefix, name] = iconName.split(':');
  
  // Respect a modest rate limit; if exceeded, skip API and fallback
  if (!underApiRateLimit()) {
    console.warn(`[Icon Loader] Rate limited: skipping API for ${iconName}`);
    return null;
  }

  const url = `https://api.iconify.design/${prefix}/${name}.svg`;
  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    iconMetrics.apiRequests += 1;
    try {
      console.log(`[Icon Loader] Fetching ${iconName} from API (attempt ${attempt})...`);
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        // 4xx should not be retried except 429
        if (response.status === 404) {
          console.warn(`[Icon Loader] API 404 for ${iconName}`);
          iconMetrics.apiFailures += 1;
          return null;
        }
        if (response.status === 429) {
          console.warn(`[Icon Loader] API 429 (rate limited) for ${iconName}`);
          iconMetrics.rateLimited += 1;
          // brief backoff
          iconMetrics.retries += 1;
          await sleep(300 * attempt);
          continue;
        }
        console.warn(`[Icon Loader] API ${response.status} for ${iconName}`);
        // Retry on 5xx
        if (response.status >= 500) {
          iconMetrics.retries += 1;
          await sleep(200 * attempt);
          continue;
        }
        iconMetrics.apiFailures += 1;
        return null;
      }

      const svgText = await response.text();
      const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
      const bodyMatch = svgText.match(/<svg[^>]*>(.*)<\/svg>/s);
      if (!bodyMatch) {
        console.warn(`[Icon Loader] Invalid SVG from API for ${iconName}`);
        iconMetrics.apiFailures += 1;
        return null;
      }
      const result = {
        attributes: {
          viewBox: viewBoxMatch?.[1] || '0 0 24 24',
          width: '1em',
          height: '1em',
          fill: 'currentColor',
        },
        body: bodyMatch[1] || '',
      };
      svgCache.set(iconName, { svg: result, timestamp: Date.now() });
      console.log(`[Icon Loader] Cached SVG for ${iconName}`);
      iconMetrics.apiSuccess += 1;
      return result;
    } catch (error) {
      console.error(`[Icon Loader] API fetch error for ${iconName} (attempt ${attempt}):`, error);
      if (attempt < maxAttempts) {
        iconMetrics.retries += 1;
        await sleep(200 * attempt);
        continue;
      }
      iconMetrics.apiFailures += 1;
      return null;
    }
  }
  return null;
}

/**
 * Get fallback placeholder icon
 * Used when icon cannot be loaded from anywhere
 */
function getFallbackIcon(iconName: string): { attributes: Record<string, string>, body: string } {
  console.warn(`[Icon Loader] Using fallback for ${iconName}`);
  return {
    attributes: {
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'currentColor'
    },
    // Question mark circle as fallback
    body: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="14" fill="currentColor">?</text>`
  };
}

/**
 * Build inline SVG from icon name - with fallback chain
 * @param iconName - Icon name in format "prefix:name" (e.g., "mdi:heart")
 * @returns Object with SVG attributes and body HTML, NEVER null
 */
export async function buildInlineSVG(iconName: string): Promise<{ attributes: Record<string, string>, body: string }> {
  const [prefix, name] = iconName.split(':');
  
  if (!prefix || !name) {
    console.warn(`[Icon Loader] Invalid icon name: ${iconName}`);
    return getFallbackIcon(iconName);
  }

  // Try R2 persistent cache before any heavy work
  const r2Hit = await readIconFromR2(prefix, name);
  if (r2Hit) {
    // Populate memory cache too
    svgCache.set(iconName, { svg: r2Hit, timestamp: Date.now() });
    return r2Hit;
  }

  // Try local packages first
  if (!loadedSets[prefix]) {
    const loader = iconSetLoaders[prefix];
    if (loader) {
      loadedSets[prefix] = loader();
    }
  }

  // Try to load from local package
  if (loadedSets[prefix]) {
    try {
      const iconSet = await loadedSets[prefix];
      const iconData = getIconData(iconSet, name);
      
      if (iconData) {
        // Convert icon data to SVG
        const svg = iconToSVG(iconData, { width: '1em', height: '1em' });
        
        // Make IDs unique to prevent conflicts
        const safeBody = replaceIDs(svg.body, `${prefix}-${name}-${Date.now()}-`);
        
        console.log(`[Icon Loader] Loaded ${iconName} from local package`);
        iconMetrics.localHits += 1;
        const result = { attributes: svg.attributes, body: safeBody };
        // Write-through to R2 and memory cache
        await writeIconToR2(prefix, name, result);
        svgCache.set(iconName, { svg: result, timestamp: Date.now() });
        return result;
      }
    } catch (error) {
      console.warn(`[Icon Loader] Local package failed for ${iconName}:`, error);
    }
  }

  // Try API as fallback
  const apiIcon = await fetchIconFromAPI(iconName);
  if (apiIcon) {
    await writeIconToR2(prefix, name, apiIcon);
    return apiIcon;
  }

  // Last resort: return fallback (never returns null)
  const fallback = getFallbackIcon(iconName);
  // Do not write fallback to R2 to avoid polluting cache with temporary failures
  iconMetrics.fallbacks += 1;
  return fallback;
}

/**
 * Preload multiple icons for dynamic usage
 * @param iconNames - Array of icon names to preload
 * @returns Map of icon names to their SVG data (only includes successfully loaded icons)
 */
export async function preloadIcons(iconNames: string[]): Promise<Map<string, { attributes: Record<string, string>, body: string }>> {
  const iconMap = new Map();
  
  // Load all icons in parallel for better performance
  const results = await Promise.all(
    iconNames.map(async (name) => {
      const svg = await buildInlineSVG(name); // Never returns null now
      return { name, svg };
    })
  );
  
  // Build the map - all icons will have a value (fallback at minimum)
  for (const { name, svg } of results) {
    iconMap.set(name, svg);
  }
  
  console.log(`[Icon Loader] Loaded ${iconMap.size} icons (with fallbacks where needed)`);
  
  return iconMap;
}