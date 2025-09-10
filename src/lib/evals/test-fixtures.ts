// Test fixtures for evaluation suites
// These are real R2 URLs that can be accessed by AI services

export const TEST_IMAGES = {
  // Embed images - these should appear in generated code when mode='embed'
  hero: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/1.jpg',
    description: 'Hero section background image',
    expectedUse: 'embed',
    metadata: {
      type: 'hero',
      tags: ['background', 'hero', 'banner']
    }
  },
  
  logo: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/jupitrr_logo.jpeg',
    description: 'Jupitrr company logo',
    expectedUse: 'embed',
    metadata: {
      type: 'logo',
      tags: ['logo', 'brand', 'jupitrr']
    }
  },
  
  contentImage: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/3.jpg',
    description: 'Content section image',
    expectedUse: 'embed',
    metadata: {
      type: 'content',
      tags: ['content', 'feature', 'section']
    }
  },
  
  // Recreate images - these should NOT appear in code when mode='recreate'
  uiAnimation: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/codeanimation.jpg',
    description: 'Code animation UI to recreate',
    expectedUse: 'recreate',
    metadata: {
      type: 'ui',
      tags: ['animation', 'code', 'ui', 'interface']
    }
  },
  
  stockGraph: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/stockgraph.jpg',
    description: 'Stock graph visualization to recreate',
    expectedUse: 'recreate',
    metadata: {
      type: 'graph',
      tags: ['graph', 'chart', 'data', 'visualization', 'stocks']
    }
  },
  
  promptBox: {
    url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/Promptbox.jpg',
    description: 'UI prompt box design to recreate',
    expectedUse: 'recreate',
    metadata: {
      type: 'ui',
      tags: ['prompt', 'input', 'ui', 'form', 'interface']
    }
  }
};

// Helper to get URLs by expected use
export function getTestImagesByUse(use: 'embed' | 'recreate') {
  return Object.entries(TEST_IMAGES)
    .filter(([_, img]) => img.expectedUse === use)
    .map(([key, img]) => ({ key, ...img }));
}

// Get all test image URLs as array
export function getAllTestImageUrls(): string[] {
  return Object.values(TEST_IMAGES).map(img => img.url);
}

// Forbidden URLs that should never appear in generated code
export const FORBIDDEN_URLS = [
  'example.com',
  'placeholder.com',
  'unsplash.com',
  'IMAGE_URL',
  '/api/placeholder',
  'example.org',
  '{imageUrl'
];

// Validation helpers for eval assertions
export function validateEmbedMode(code: string, imageUrls: string[]): {
  valid: boolean;
  foundUrls: string[];
  missingUrls: string[];
} {
  const foundUrls = imageUrls.filter(url => code.includes(url));
  const missingUrls = imageUrls.filter(url => !code.includes(url));
  
  return {
    valid: foundUrls.length > 0, // At least one URL should be embedded
    foundUrls,
    missingUrls
  };
}

export function validateRecreateMode(code: string, imageUrls: string[]): {
  valid: boolean;
  foundUrls: string[];
} {
  const foundUrls = imageUrls.filter(url => code.includes(url));
  
  return {
    valid: foundUrls.length === 0, // No URLs should be in the code
    foundUrls
  };
}

export function validateNoForbiddenUrls(code: string): {
  valid: boolean;
  foundForbidden: string[];
} {
  const foundForbidden = FORBIDDEN_URLS.filter(url => code.includes(url));
  
  return {
    valid: foundForbidden.length === 0,
    foundForbidden
  };
}

// Check if Remotion Img component is properly imported when images are used
export function validateRemotionImports(code: string, hasImages: boolean): boolean {
  if (!hasImages) return true;
  
  // Check for Img import
  const hasImgImport = code.includes('Img') && 
    (code.includes('window.Remotion') || code.includes('from "@remotion/core"'));
  
  // Check if Img is actually used
  const usesImg = code.includes('<Img');
  
  return !usesImg || hasImgImport;
}