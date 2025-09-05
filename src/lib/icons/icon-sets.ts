/**
 * Icon set definitions and availability
 * Tracks which icon sets are locally available vs API-only
 */

export type IconAvailability = 'local' | 'api' | 'unknown';

export interface IconSetInfo {
  name: string;
  availability: IconAvailability;
  iconCount?: number;
  description?: string;
}

// Icon sets with local packages installed
export const LOCAL_ICON_SETS = [
  'mdi',
  'material-symbols',
  'lucide',
  'carbon',
  'tabler',
  'simple-icons',
  'heroicons',
  'healthicons',
  'bi',
  'codicon',
  'devicon',
  'fa6-brands',
  'fa6-solid',
  'logos',
  'octicon',
  'akar-icons',
  'ic',
] as const;

// Popular icon sets available via API but not installed locally
export const API_ONLY_ICON_SETS = [
  'ph', // Phosphor Icons
  'ri', // Remix Icon
  'fe', // Feather Icons
  'ant-design',
  'bx', // BoxIcons
  'eva',
  'fluent',
  'foundation',
  'gg',
  'gridicons',
  'ion',
  'jam',
  'line-md', // Material Line Icons
  'majesticons',
  'mi', // Material Icons
  'oi', // Open Iconic
  'pepicons',
  'pixelarticons',
  'radix-icons',
  'solar',
  'system-uicons',
  'teenyicons',
  'typcn', // Typicons
  'uil', // Unicons
  'vaadin',
  'vs', // Visual Studio Code Icons
  'zmdi', // Material Design Iconic Font
] as const;

/**
 * Check if an icon set is locally available
 */
export function isLocalIconSet(prefix: string): boolean {
  return LOCAL_ICON_SETS.includes(prefix as any);
}

/**
 * Get availability status for an icon set
 */
export function getIconSetAvailability(prefix: string): IconAvailability {
  if (isLocalIconSet(prefix)) {
    return 'local';
  }
  
  // Check if it's a known API-only set
  if (API_ONLY_ICON_SETS.includes(prefix as any)) {
    return 'api';
  }
  
  // Unknown sets will be fetched from API
  return 'api';
}

/**
 * Get display badge for icon set
 */
export function getIconSetBadge(availability: IconAvailability): {
  label: string;
  color: string;
  tooltip: string;
} {
  switch (availability) {
    case 'local':
      return {
        label: '✓ Fast',
        color: 'text-green-600 bg-green-50',
        tooltip: 'Locally cached - instant loading',
      };
    
    case 'api':
      return {
        label: '☁ API',
        color: 'text-blue-600 bg-blue-50',
        tooltip: 'Fetched from API - may have slight delay',
      };
    
    case 'unknown':
    default:
      return {
        label: '? Unknown',
        color: 'text-gray-600 bg-gray-50',
        tooltip: 'Availability unknown - will try API',
      };
  }
}

/**
 * Get warning message for non-local icon sets
 */
export function getIconSetWarning(prefix: string): string | null {
  const availability = getIconSetAvailability(prefix);
  
  if (availability === 'local') {
    return null;
  }
  
  if (availability === 'api') {
    return `Icons from "${prefix}" will be fetched from the API. This may cause a slight delay during export.`;
  }
  
  return `Icons from "${prefix}" are not recognized and may render as placeholders if unavailable.`;
}