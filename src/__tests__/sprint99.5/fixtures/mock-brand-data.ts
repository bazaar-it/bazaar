/**
 * Mock BrandJSON data for Sprint 99.5 testing
 * Based on ExtractedBrandDataV4 interface
 */

export interface MockBrandData {
  brand: {
    identity: {
      name: string;
      tagline?: string;
    };
  };
  sections: Array<{
    type: string;
    content: {
      headline?: string;
      description?: string;
      cta?: string;
    };
    evidence: {
      screenshotIds: string[];
      domPath: string;
      confidence: number;
    };
    visualElements: {
      photos: Array<{
        url: string;
        message: string;
        purpose: string;
      }>;
      uiComponents: Array<{
        type: string;
        category: string;
        rebuildSpec: {
          layout: string;
          components: string[];
          styling: Record<string, any>;
        };
      }>;
    };
  }>;
  design: {
    colors: Array<{
      hex: string;
      usage: string;
      prominence: number;
    }>;
    typography: Array<{
      family: string;
      usage: string;
      weights: string[];
    }>;
  };
  confidence: {
    overall: number;
    extraction: number;
    classification: number;
  };
}

export const MOCK_STRIPE_BRAND: MockBrandData = {
  brand: {
    identity: {
      name: 'Stripe',
      tagline: 'Financial infrastructure for the internet'
    }
  },
  sections: [
    {
      type: 'hero',
      content: {
        headline: 'Financial infrastructure for the internet',
        description: 'Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.',
        cta: 'Start now'
      },
      evidence: {
        screenshotIds: ['hero-screenshot-1'],
        domPath: 'main > section:first-child',
        confidence: 0.95
      },
      visualElements: {
        photos: [
          {
            url: '/hero-team-photo.jpg',
            message: 'Diverse team collaborating on payments technology',
            purpose: 'hero'
          }
        ],
        uiComponents: [
          {
            type: 'dashboard',
            category: 'payments',
            rebuildSpec: {
              layout: '3-column grid with sidebar',
              components: ['payment-cards', 'transaction-chart', 'revenue-metrics'],
              styling: {
                borderRadius: '8px',
                shadows: ['0 4px 12px rgba(0,0,0,0.1)'],
                spacing: '24px'
              }
            }
          }
        ]
      }
    },
    {
      type: 'features',
      content: {
        headline: 'A complete commerce toolkit',
        description: 'From checkout to global sales tax compliance, companies around the world use Stripe to simplify their online and offline payments.',
      },
      evidence: {
        screenshotIds: ['features-screenshot-1'],
        domPath: 'main > section:nth-child(2)',
        confidence: 0.88
      },
      visualElements: {
        photos: [],
        uiComponents: [
          {
            type: 'feature-grid',
            category: 'ui',
            rebuildSpec: {
              layout: '2x3 grid with cards',
              components: ['feature-icons', 'feature-titles', 'feature-descriptions'],
              styling: {
                borderRadius: '12px',
                spacing: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }
            }
          }
        ]
      }
    }
  ],
  design: {
    colors: [
      { hex: '#635BFF', usage: 'primary', prominence: 1.0 },
      { hex: '#0066FF', usage: 'accent', prominence: 0.8 },
      { hex: '#00D924', usage: 'success', prominence: 0.6 },
      { hex: '#FFFFFF', usage: 'background', prominence: 0.9 },
      { hex: '#1A1A1A', usage: 'text', prominence: 0.9 }
    ],
    typography: [
      { family: 'Inter', usage: 'headers', weights: ['400', '500', '600'] },
      { family: 'Inter', usage: 'body', weights: ['400', '500'] }
    ]
  },
  confidence: {
    overall: 0.91,
    extraction: 0.93,
    classification: 0.89
  }
};

export const MOCK_LINEAR_BRAND: MockBrandData = {
  brand: {
    identity: {
      name: 'Linear',
      tagline: 'Built for modern software teams'
    }
  },
  sections: [
    {
      type: 'hero',
      content: {
        headline: 'Built for modern software teams',
        description: 'Linear helps streamline software projects, sprints, tasks, and bug tracking.',
        cta: 'Get started'
      },
      evidence: {
        screenshotIds: ['linear-hero-1'],
        domPath: 'main > section[data-section="hero"]',
        confidence: 0.94
      },
      visualElements: {
        photos: [],
        uiComponents: [
          {
            type: 'dashboard',
            category: 'project-management',
            rebuildSpec: {
              layout: 'kanban board with 4 columns',
              components: ['task-cards', 'progress-bars', 'status-indicators', 'assignee-avatars'],
              styling: {
                borderRadius: '6px',
                shadows: ['0 2px 8px rgba(0,0,0,0.08)'],
                spacing: '12px',
                background: '#FAFAFA'
              }
            }
          },
          {
            type: 'sidebar',
            category: 'navigation',
            rebuildSpec: {
              layout: 'vertical navigation with icons',
              components: ['nav-icons', 'project-list', 'team-selector'],
              styling: {
                width: '240px',
                background: '#F8F9FA',
                borderRight: '1px solid #E1E4E8'
              }
            }
          }
        ]
      }
    }
  ],
  design: {
    colors: [
      { hex: '#5E6AD2', usage: 'primary', prominence: 1.0 },
      { hex: '#26C6F7', usage: 'accent', prominence: 0.7 },
      { hex: '#C026D3', usage: 'highlight', prominence: 0.5 },
      { hex: '#FFFFFF', usage: 'background', prominence: 0.95 },
      { hex: '#0F1419', usage: 'text', prominence: 0.9 }
    ],
    typography: [
      { family: 'SF Pro Display', usage: 'headers', weights: ['400', '500', '600'] },
      { family: 'SF Pro Text', usage: 'body', weights: ['400', '500'] }
    ]
  },
  confidence: {
    overall: 0.93,
    extraction: 0.95,
    classification: 0.91
  }
};

export const MOCK_SHOPIFY_BRAND: MockBrandData = {
  brand: {
    identity: {
      name: 'Shopify',
      tagline: 'Commerce, reinvented'
    }
  },
  sections: [
    {
      type: 'hero',
      content: {
        headline: 'Start selling online today',
        description: 'Create an online store with everything you need to run your business.',
        cta: 'Start free trial'
      },
      evidence: {
        screenshotIds: ['shopify-hero-1'],
        domPath: '#hero-section',
        confidence: 0.87
      },
      visualElements: {
        photos: [
          {
            url: '/shopify-merchant-photo.jpg',
            message: 'Small business owner managing online store',
            purpose: 'hero'
          },
          {
            url: '/shopify-products.jpg',
            message: 'Curated product showcase for online store',
            purpose: 'product-gallery'
          }
        ],
        uiComponents: [
          {
            type: 'admin-panel',
            category: 'ecommerce',
            rebuildSpec: {
              layout: '2-column dashboard with metrics',
              components: ['sales-chart', 'order-list', 'inventory-status'],
              styling: {
                borderRadius: '8px',
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }
            }
          }
        ]
      }
    }
  ],
  design: {
    colors: [
      { hex: '#96BF48', usage: 'primary', prominence: 1.0 },
      { hex: '#5E8E3E', usage: 'secondary', prominence: 0.8 },
      { hex: '#004C3F', usage: 'dark', prominence: 0.6 },
      { hex: '#FFFFFF', usage: 'background', prominence: 0.95 }
    ],
    typography: [
      { family: 'Shopify Sans', usage: 'headers', weights: ['400', '500', '600'] },
      { family: 'Shopify Sans', usage: 'body', weights: ['400', '500'] }
    ]
  },
  confidence: {
    overall: 0.86,
    extraction: 0.88,
    classification: 0.84
  }
};

export const MOCK_BRANDS = {
  stripe: MOCK_STRIPE_BRAND,
  linear: MOCK_LINEAR_BRAND,
  shopify: MOCK_SHOPIFY_BRAND
};

export function getMockBrandWithUIComponents(): MockBrandData {
  return MOCK_LINEAR_BRAND;
}

export function getMockBrandWithPhotos(): MockBrandData {
  return MOCK_SHOPIFY_BRAND;
}

export function getMockBrandHighFidelity(): MockBrandData {
  return MOCK_LINEAR_BRAND;
}