/**
 * Icon loader for build-time SVG inlining
 * Uses Iconify's official utilities to properly handle icons
 */
import type { IconifyJSON } from '@iconify/types';
import { getIconData, iconToSVG, replaceIDs } from '@iconify/utils';

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

/**
 * Fetch icon from Iconify API as fallback
 * Supports ALL 200,000+ icons without local packages
 */
async function fetchIconFromAPI(iconName: string): Promise<{ attributes: Record<string, string>, body: string } | null> {
  // Check cache first
  const cached = svgCache.get(iconName);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Icon Loader] Using cached SVG for ${iconName}`);
    return cached.svg;
  }
  
  const [prefix, name] = iconName.split(':');
  
  try {
    console.log(`[Icon Loader] Fetching ${iconName} from API...`);
    const response = await fetch(`https://api.iconify.design/${prefix}/${name}.svg`);
    
    if (!response.ok) {
      console.warn(`[Icon Loader] API returned ${response.status} for ${iconName}`);
      return null;
    }

    const svgText = await response.text();
    
    // Parse SVG to extract attributes and body
    const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
    const bodyMatch = svgText.match(/<svg[^>]*>(.*)<\/svg>/s);
    
    if (!bodyMatch) {
      console.warn(`[Icon Loader] Invalid SVG from API for ${iconName}`);
      return null;
    }

    const result = {
      attributes: {
        viewBox: viewBoxMatch?.[1] || '0 0 24 24',
        width: '1em',
        height: '1em',
        fill: 'currentColor'
      },
      body: bodyMatch[1] || ''
    };
    
    // Cache the result
    svgCache.set(iconName, { svg: result, timestamp: Date.now() });
    console.log(`[Icon Loader] Cached SVG for ${iconName}`);
    
    return result;
  } catch (error) {
    console.error(`[Icon Loader] API fetch failed for ${iconName}:`, error);
    return null;
  }
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
        return { attributes: svg.attributes, body: safeBody };
      }
    } catch (error) {
      console.warn(`[Icon Loader] Local package failed for ${iconName}:`, error);
    }
  }

  // Try API as fallback
  const apiIcon = await fetchIconFromAPI(iconName);
  if (apiIcon) {
    return apiIcon;
  }

  // Last resort: return fallback (never returns null)
  return getFallbackIcon(iconName);
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