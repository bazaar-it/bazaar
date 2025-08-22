// Configure Iconify to use local icon packs instead of CDN
import { addCollection } from '@iconify/react';

// Import icon collections - these are now loaded from node_modules
import lucideIcons from '@iconify-json/lucide/icons.json';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import heroIcons from '@iconify-json/heroicons/icons.json';
import carbonIcons from '@iconify-json/carbon/icons.json';
import tablerIcons from '@iconify-json/tabler/icons.json';

// Initialize offline icon collections
export function initializeOfflineIcons() {
  try {
    // Add collections to Iconify
    addCollection(lucideIcons);
    addCollection(simpleIcons);
    addCollection(heroIcons);
    addCollection(carbonIcons);
    addCollection(tablerIcons);
    
    console.log('[Iconify] Offline icon packs loaded:', {
      lucide: Object.keys(lucideIcons.icons || {}).length,
      'simple-icons': Object.keys(simpleIcons.icons || {}).length,
      heroicons: Object.keys(heroIcons.icons || {}).length,
      carbon: Object.keys(carbonIcons.icons || {}).length,
      tabler: Object.keys(tablerIcons.icons || {}).length,
    });
  } catch (error) {
    console.error('[Iconify] Failed to load offline icons:', error);
  }
}

// Get available offline collections
export function getOfflineCollections() {
  return [
    { name: 'Lucide', prefix: 'lucide', count: '1,000+' },
    { name: 'Simple Icons', prefix: 'simple-icons', count: '2,400+' },
    { name: 'Heroicons', prefix: 'heroicons', count: '300+' },
    { name: 'Carbon', prefix: 'carbon', count: '2,000+' },
    { name: 'Tabler', prefix: 'tabler', count: '3,200+' },
  ];
}