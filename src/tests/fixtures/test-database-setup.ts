/**
 * Test Database Setup and Fixtures
 * 
 * Creates a consistent test environment with:
 * - Test admin user
 * - Test project
 * - Test API keys
 * - Database cleanup
 */

import { db } from '~/server/db';
import { users, projects, accounts, sessions, apiKeys } from '~/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export interface TestContext {
  userId: string;
  projectId: string;
  apiKey: string;
  sessionToken: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a complete test context with user, project, and API keys
 * Automatically cleans up after tests
 */
export async function createTestContext(): Promise<TestContext> {
  // Generate test IDs
  const testUserId = `test-user-${uuidv4()}`;
  const testProjectId = `test-project-${uuidv4()}`;
  const testApiKey = `test-api-key-${uuidv4()}`;
  const testSessionToken = `test-session-${uuidv4()}`;
  
  // Create test admin user
  await db.insert(users).values({
    id: testUserId,
    email: `test-${Date.now()}@bazaar.test`,
    name: 'Test Admin User',
    isAdmin: true,
    credits: 1000,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create test account (for NextAuth compatibility)
  await db.insert(accounts).values({
    id: `test-account-${uuidv4()}`,
    userId: testUserId,
    type: 'oauth',
    provider: 'test',
    providerAccountId: testUserId,
    access_token: 'test-access-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'Bearer',
    scope: 'test',
    id_token: 'test-id-token',
    session_state: 'test-session-state'
  });

  // Create test session
  await db.insert(sessions).values({
    id: `test-session-${uuidv4()}`,
    sessionToken: testSessionToken,
    userId: testUserId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  });

  // Create test project
  await db.insert(projects).values({
    id: testProjectId,
    name: 'Test Project for Template Selection',
    userId: testUserId,
    status: 'active',
    credits: 100,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create API key
  await db.insert(apiKeys).values({
    id: `test-apikey-${uuidv4()}`,
    key: testApiKey,
    name: 'Test API Key',
    userId: testUserId,
    createdAt: new Date(),
    lastUsedAt: new Date()
  });

  // Cleanup function to remove all test data
  const cleanup = async () => {
    try {
      // Delete in reverse order of creation to respect foreign keys
      await db.delete(apiKeys).where(eq(apiKeys.userId, testUserId));
      await db.delete(projects).where(eq(projects.userId, testUserId));
      await db.delete(sessions).where(eq(sessions.userId, testUserId));
      await db.delete(accounts).where(eq(accounts.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  };

  return {
    userId: testUserId,
    projectId: testProjectId,
    apiKey: testApiKey,
    sessionToken: testSessionToken,
    cleanup
  };
}

/**
 * Creates a minimal test context (just IDs, no database)
 * For unit tests that don't need real database
 */
export function createMockTestContext(): TestContext {
  return {
    userId: 'mock-user-123',
    projectId: 'mock-project-456',
    apiKey: 'mock-api-key-789',
    sessionToken: 'mock-session-abc',
    cleanup: async () => {}
  };
}

/**
 * Test data for different website personas
 */
export const testWebsites = {
  fintech: {
    url: 'https://ramp.com',
    expectedArchetype: 'professional',
    expectedIndustry: 'fintech',
    brandData: {
      page: {
        url: 'https://ramp.com',
        title: 'Ramp - Corporate Cards & Expense Management',
        description: 'Control spend, save time, and automate finance'
      },
      brand: {
        colors: {
          primary: '#FF6B00',
          secondary: '#1A1A1A',
          accents: ['#FF8533', '#FFB380'],
          neutrals: ['#FFFFFF', '#F7F7F7', '#333333'],
          gradients: []
        },
        typography: {
          fonts: [{
            family: 'Inter',
            weights: [400, 500, 600, 700]
          }],
          scale: {
            h1: '3rem',
            h2: '2rem',
            h3: '1.5rem',
            body: '1rem'
          }
        },
        buttons: {
          radius: '0.375rem',
          padding: '0.75rem 1.5rem'
        },
        voice: {
          taglines: ['Control spend, save time'],
          tone: 'professional'
        }
      },
      product: {
        value_prop: {
          headline: 'Control spend, save time, and automate finance',
          subhead: 'The only finance automation platform designed for modern businesses'
        },
        problem: 'Manual expense management wastes time and money',
        solution: 'Automated finance operations platform',
        features: [
          { title: 'Corporate Cards', desc: 'Virtual and physical cards with built-in controls' },
          { title: 'Expense Management', desc: 'Automated receipt matching and reporting' },
          { title: 'Bill Pay', desc: 'Streamlined AP with approval workflows' }
        ]
      },
      social_proof: {
        stats: {
          users: '25,000+',
          rating: '4.8'
        }
      },
      ctas: [
        { label: 'Get Started', type: 'primary', placement: 'hero' }
      ]
    }
  },
  
  design: {
    url: 'https://figma.com',
    expectedArchetype: 'innovator',
    expectedIndustry: 'design',
    brandData: {
      page: {
        url: 'https://figma.com',
        title: 'Figma - The Collaborative Interface Design Tool',
        description: 'Design, prototype, and collaborate in real-time'
      },
      brand: {
        colors: {
          primary: '#F24E1E',
          secondary: '#0ACF83',
          accents: ['#A259FF', '#FFC700', '#1ABCFE'],
          neutrals: ['#FFFFFF', '#F5F5F5', '#333333'],
          gradients: [{
            type: 'linear',
            angle: 135,
            stops: ['#F24E1E', '#A259FF']
          }]
        },
        typography: {
          fonts: [{
            family: 'Inter',
            weights: [400, 500, 600, 700]
          }],
          scale: {
            h1: '4rem',
            h2: '2.5rem',
            h3: '1.75rem',
            body: '1rem'
          }
        },
        buttons: {
          radius: '0.5rem',
          padding: '0.75rem 1.5rem'
        },
        voice: {
          taglines: ['Nothing great is made alone'],
          tone: 'creative'
        }
      },
      product: {
        value_prop: {
          headline: 'Nothing great is made alone',
          subhead: 'Design and build products as a team'
        },
        problem: 'Design tools create silos between designers and developers',
        solution: 'Collaborative design platform for entire teams',
        features: [
          { title: 'Real-time Collaboration', desc: 'Work together like Google Docs' },
          { title: 'Design Systems', desc: 'Shared libraries and components' },
          { title: 'Developer Handoff', desc: 'Inspect designs and export code' }
        ]
      },
      social_proof: {
        stats: {
          users: '4M+',
          rating: '4.7'
        }
      },
      ctas: [
        { label: 'Get Started for Free', type: 'primary', placement: 'hero' }
      ]
    }
  },

  developer: {
    url: 'https://stripe.com',
    expectedArchetype: 'sophisticate',
    expectedIndustry: 'developer-tools',
    brandData: {
      page: {
        url: 'https://stripe.com',
        title: 'Stripe - Payment Infrastructure for the Internet',
        description: 'Millions of businesses use Stripe to accept payments'
      },
      brand: {
        colors: {
          primary: '#635BFF',
          secondary: '#00D4FF',
          accents: ['#7A73FF', '#0A2540'],
          neutrals: ['#FFFFFF', '#F6F9FC', '#425466'],
          gradients: [{
            type: 'linear',
            angle: 180,
            stops: ['#635BFF', '#00D4FF']
          }]
        },
        typography: {
          fonts: [{
            family: 'SF Pro Display',
            weights: [400, 500, 600, 700]
          }],
          scale: {
            h1: '3.5rem',
            h2: '2.25rem',
            h3: '1.5rem',
            body: '1rem'
          }
        },
        buttons: {
          radius: '0.25rem',
          padding: '0.625rem 1.25rem'
        },
        voice: {
          taglines: ['Payment infrastructure for the internet'],
          tone: 'technical'
        }
      },
      product: {
        value_prop: {
          headline: 'Payment infrastructure for the internet',
          subhead: 'Millions of businesses use Stripe'
        },
        problem: 'Building payment systems is complex and risky',
        solution: 'Complete payment platform with simple APIs',
        features: [
          { title: 'Global Payments', desc: '135+ currencies and payment methods' },
          { title: 'Developer First', desc: 'Best-in-class APIs and documentation' },
          { title: 'Revenue Optimization', desc: 'Machine learning for fraud prevention' }
        ]
      },
      social_proof: {
        stats: {
          users: 'Millions',
          rating: '4.9'
        }
      },
      ctas: [
        { label: 'Start Now', type: 'primary', placement: 'hero' },
        { label: 'Contact Sales', type: 'secondary', placement: 'hero' }
      ]
    }
  }
};