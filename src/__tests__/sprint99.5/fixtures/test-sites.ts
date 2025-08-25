/**
 * Test website fixtures for Sprint 99.5 testing
 * Represents different types of websites for comprehensive testing
 */

export interface TestSite {
  name: string;
  url: string;
  category: 'fintech' | 'design' | 'devtools' | 'productivity' | 'commerce';
  expectedElements: {
    hero: boolean;
    features: boolean;
    testimonials: boolean;
    pricing: boolean;
    cta: boolean;
  };
  visualElements: {
    photos: number;
    uiComponents: number;
    charts: number;
    dashboards: number;
  };
  brandColors: string[];
  expectedFidelityScore: number; // 0-100
}

export const TEST_SITES: Record<string, TestSite> = {
  stripe: {
    name: 'Stripe',
    url: 'https://stripe.com',
    category: 'fintech',
    expectedElements: {
      hero: true,
      features: true,
      testimonials: true,
      pricing: false,
      cta: true
    },
    visualElements: {
      photos: 2,
      uiComponents: 5,
      charts: 3,
      dashboards: 2
    },
    brandColors: ['#635BFF', '#0066FF', '#00D924'],
    expectedFidelityScore: 90
  },
  
  figma: {
    name: 'Figma',
    url: 'https://figma.com',
    category: 'design',
    expectedElements: {
      hero: true,
      features: true,
      testimonials: false,
      pricing: true,
      cta: true
    },
    visualElements: {
      photos: 1,
      uiComponents: 8,
      charts: 0,
      dashboards: 3
    },
    brandColors: ['#F24E1E', '#FF7262', '#A259FF'],
    expectedFidelityScore: 88
  },
  
  linear: {
    name: 'Linear',
    url: 'https://linear.app',
    category: 'productivity',
    expectedElements: {
      hero: true,
      features: true,
      testimonials: true,
      pricing: false,
      cta: true
    },
    visualElements: {
      photos: 0,
      uiComponents: 6,
      charts: 1,
      dashboards: 4
    },
    brandColors: ['#5E6AD2', '#26C6F7', '#C026D3'],
    expectedFidelityScore: 92
  },
  
  vercel: {
    name: 'Vercel',
    url: 'https://vercel.com',
    category: 'devtools',
    expectedElements: {
      hero: true,
      features: true,
      testimonials: false,
      pricing: true,
      cta: true
    },
    visualElements: {
      photos: 1,
      uiComponents: 4,
      charts: 2,
      dashboards: 1
    },
    brandColors: ['#000000', '#0070F3', '#FF0080'],
    expectedFidelityScore: 85
  },

  shopify: {
    name: 'Shopify',
    url: 'https://shopify.com',
    category: 'commerce',
    expectedElements: {
      hero: true,
      features: true,
      testimonials: true,
      pricing: true,
      cta: true
    },
    visualElements: {
      photos: 4,
      uiComponents: 3,
      charts: 1,
      dashboards: 2
    },
    brandColors: ['#96BF48', '#5E8E3E', '#004C3F'],
    expectedFidelityScore: 83
  }
};

export const HIGH_UI_SITES = ['linear', 'figma', 'vercel'];
export const HIGH_PHOTO_SITES = ['shopify', 'stripe'];
export const COMPLEX_SITES = ['stripe', 'linear'];
export const SIMPLE_SITES = ['vercel'];

export function getSitesByCategory(category: TestSite['category']): TestSite[] {
  return Object.values(TEST_SITES).filter(site => site.category === category);
}

export function getSitesWithHighUIComponents(): TestSite[] {
  return Object.values(TEST_SITES).filter(site => site.visualElements.uiComponents >= 5);
}

export function getSitesWithPhotos(): TestSite[] {
  return Object.values(TEST_SITES).filter(site => site.visualElements.photos > 0);
}