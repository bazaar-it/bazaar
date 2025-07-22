/**
 * Real Integration Test for Stripe Webhook Handler
 * 
 * This test works with the actual implementation at:
 * /src/app/api/webhooks/stripe/route.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { POST } from '~/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '~/server/db';
import { userCredits, creditTransactions, users } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

// Mock dependencies
jest.mock('~/lib/stripe');
jest.mock('~/server/db');
jest.mock('~/env', () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    STRIPE_SECRET_KEY: 'sk_test_123'
  }
}));

describe('Stripe Webhook Handler - Real Integration', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: jest.fn()
    }
  };

  const mockDb = {
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Stripe mock
    (Stripe as any).mockImplementation(() => mockStripe);
    
    // Setup database mock with chaining
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined)
      })
    });
    
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ userId: 'user_123' }])
      })
    });
    
    (db as any).insert = mockDb.insert;
    (db as any).update = mockDb.update;
  });

  describe('Webhook Signature Validation', () => {
    it('should reject requests without stripe signature', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('No signature');
    });

    it('should reject requests with invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'stripe-signature': 'invalid_sig'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Webhook signature verification failed');
    });
  });

  describe('Checkout Session Completed', () => {
    it('should add credits to user on successful payment', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              userId: 'user_123',
              promptCount: '100'
            },
            customer_details: {
              email: 'test@example.com'
            },
            amount_total: 1000,
            currency: 'usd',
            line_items: {
              data: [{
                description: 'Starter Pack - 100 prompts'
              }]
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'valid_sig'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');

      // Verify database operations
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      
      // First call: insert user credits record
      expect(mockDb.insert).toHaveBeenNthCalledWith(1, userCredits);
      
      // Second call: insert transaction record
      expect(mockDb.insert).toHaveBeenNthCalledWith(2, creditTransactions);
      
      // Verify update was called to add credits
      expect(mockDb.update).toHaveBeenCalledWith(userCredits);
    });

    it('should handle database errors gracefully', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              userId: 'user_123',
              promptCount: '100'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      
      // Make database operation fail
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'valid_sig'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Failed to process payment');
    });

    it('should handle missing metadata gracefully', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {} // Missing userId and promptCount
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'valid_sig'
        }
      });

      const response = await POST(request);
      
      // Should return 500 because userId is undefined
      expect(response.status).toBe(500);
    });
  });

  describe('Other Webhook Events', () => {
    it('should acknowledge but not process other event types', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'valid_sig'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
      
      // Should not interact with database
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('Credit Calculation', () => {
    it('should correctly parse and add prompt counts', async () => {
      const testCases = [
        { promptCount: '50', expected: 50 },
        { promptCount: '100', expected: 100 },
        { promptCount: '1000', expected: 1000 }
      ];

      for (const { promptCount, expected } of testCases) {
        jest.clearAllMocks();
        
        const mockEvent = {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: `cs_test_${promptCount}`,
              metadata: {
                userId: 'user_123',
                promptCount
              }
            }
          }
        };

        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

        const request = new NextRequest('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          body: JSON.stringify(mockEvent),
          headers: {
            'stripe-signature': 'valid_sig'
          }
        });

        await POST(request);
        
        // Verify the SQL update includes the correct prompt count
        const updateCall = mockDb.update.mock.calls[0];
        const setCall = mockDb.update().set.mock.calls[0];
        
        // Check that the SQL template includes the expected number
        expect(setCall[0].purchasedCredits.sql).toContain(expected);
        expect(setCall[0].lifetimeCredits.sql).toContain(expected);
      }
    });
  });
});

/**
 * To run this test:
 * npm test src/tests/critical/stripe-webhook-real.test.ts
 * 
 * For full integration testing with real Stripe events:
 * 1. Use Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * 2. Trigger test events: stripe trigger checkout.session.completed
 * 3. Check database for actual updates
 */