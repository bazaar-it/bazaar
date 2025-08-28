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

/**
 * Build inline SVG from icon name
 * @param iconName - Icon name in format "prefix:name" (e.g., "mdi:heart")
 * @returns Object with SVG attributes and body HTML, or null if not found
 */
export async function buildInlineSVG(iconName: string): Promise<{ attributes: Record<string, string>, body: string } | null> {
  const [prefix, name] = iconName.split(':');
  
  if (!prefix || !name) {
    console.warn(`[Icon Loader] Invalid icon name: ${iconName}`);
    return null;
  }

  // Load the icon set if not already loading
  if (!loadedSets[prefix]) {
    const loader = iconSetLoaders[prefix];
    if (!loader) {
      console.warn(`[Icon Loader] Unknown icon set: ${prefix}`);
      return null;
    }
    loadedSets[prefix] = loader();
  }

  try {
    const iconSet = await loadedSets[prefix];
    const iconData = getIconData(iconSet, name);
    
    if (!iconData) {
      console.warn(`[Icon Loader] Icon not found: ${iconName}`);
      return null;
    }

    // Convert icon data to SVG
    const svg = iconToSVG(iconData, { width: '1em', height: '1em' });
    
    // Make IDs unique to prevent conflicts when multiple instances are rendered
    const safeBody = replaceIDs(svg.body, `${prefix}-${name}-${Date.now()}-`);
    
    return { attributes: svg.attributes, body: safeBody };
  } catch (error) {
    console.error(`[Icon Loader] Error loading ${iconName}:`, error);
    return null;
  }
}

/**
 * Preload multiple icons for dynamic usage
 * @param iconNames - Array of icon names to preload
 * @returns Map of icon names to their SVG data (only includes successfully loaded icons)
 */
export async function preloadIcons(iconNames: string[]): Promise<Map<string, { attributes: Record<string, string>, body: string }>> {
  const iconMap = new Map();
  const missing: string[] = [];
  
  // Load all icons in parallel for better performance
  const results = await Promise.all(
    iconNames.map(async (name) => {
      const svg = await buildInlineSVG(name);
      return { name, svg };
    })
  );
  
  // Build the map - only add successfully loaded icons
  for (const { name, svg } of results) {
    if (svg) {
      iconMap.set(name, svg);
    } else {
      missing.push(name);
    }
  }
  
  console.log(`[Icon Loader] Successfully loaded ${iconMap.size} of ${iconNames.length} icons`);
  if (missing.length > 0) {
    console.warn(`[Icon Loader] Missing icons: ${missing.join(', ')}`);
  }
  
  return iconMap;
}