# Stripe Integration Testing Guide

## Current State

We have created unit tests that mock all dependencies. To make these TRUE integration tests, we need:

## 1. Test Database Setup

### Option A: Docker Compose (Recommended)
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bazaar_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

### Option B: Use Neon Branch
```bash
# Create a test branch in Neon
neon branches create test-branch --project-id YOUR_PROJECT_ID
```

### Setup Test Environment
```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5433/bazaar_test
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_TEST_SECRET
```

## 2. Real Stripe Test Mode Integration

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login
```

### Test Webhook Locally
```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed \
  --add metadata.userId=test_user_123 \
  --add metadata.promptCount=100
```

## 3. Integration Test Setup

### Create Test Helpers
```typescript
// src/tests/helpers/stripe.ts
import { stripe } from '~/lib/stripe';

export async function createTestCheckoutSession(userId: string, promptCount: number) {
  return await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Test Prompts',
          description: `${promptCount} prompts`
        },
        unit_amount: 1000, // $10.00
      },
      quantity: 1
    }],
    metadata: {
      userId,
      promptCount: promptCount.toString()
    },
    success_url: 'http://localhost:3000/success',
    cancel_url: 'http://localhost:3000/cancel'
  });
}
```

### Database Test Utilities
```typescript
// src/tests/helpers/database.ts
import { db } from '~/server/db';
import { users, userCredits, creditTransactions } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export async function createTestUser(id: string) {
  await db.insert(users).values({
    id,
    email: `${id}@test.com`,
    name: 'Test User'
  });
}

export async function cleanupTestData(userId: string) {
  await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId));
  await db.delete(userCredits).where(eq(userCredits.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function getUserCredits(userId: string) {
  const credits = await db.select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);
  return credits[0];
}
```

## 4. Real Integration Test Example

```typescript
// src/tests/integration/stripe-e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestUser, cleanupTestData, getUserCredits } from '../helpers/database';
import { POST } from '~/app/api/webhooks/stripe/route';
import { stripe } from '~/lib/stripe';

describe('Stripe E2E Integration', () => {
  const TEST_USER_ID = 'test_user_e2e_' + Date.now();
  
  beforeAll(async () => {
    await createTestUser(TEST_USER_ID);
  });
  
  afterAll(async () => {
    await cleanupTestData(TEST_USER_ID);
  });
  
  it('should process real checkout.session.completed event', async () => {
    // Create real Stripe event
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Prompts' },
          unit_amount: 1000,
        },
        quantity: 1
      }],
      metadata: {
        userId: TEST_USER_ID,
        promptCount: '50'
      },
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel'
    });
    
    // Simulate webhook
    const event = {
      type: 'checkout.session.completed',
      data: { object: session }
    };
    
    // Call webhook handler
    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: {
        'stripe-signature': 'test_sig' // Would need real signature
      }
    });
    
    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify database state
    const credits = await getUserCredits(TEST_USER_ID);
    expect(credits.purchasedCredits).toBe(50);
    expect(credits.lifetimeCredits).toBe(50);
  });
});
```

## 5. CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run migrations
        run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:test@postgres:5432/test
          
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@postgres:5432/test
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
```

## 6. Missing Pieces Summary

### What we have:
✅ Webhook handler implementation
✅ Database schema
✅ Unit tests with mocks

### What we need:
1. **Test database setup** (Docker or Neon branch)
2. **Test data seeders** 
3. **Stripe test mode configuration**
4. **Integration test runners**
5. **CI/CD pipeline**
6. **Webhook signature verification in tests**

### Next Steps:
1. Set up Docker compose for test database
2. Create npm scripts for test database migrations
3. Write database helper functions
4. Convert mock tests to real integration tests
5. Add to CI/CD pipeline

## 7. Testing Checklist

Before going to production, ensure:
- [ ] All webhook events are handled
- [ ] Idempotency is implemented (no duplicate charges)
- [ ] Error states are handled gracefully
- [ ] Webhook signatures are validated
- [ ] Database transactions are atomic
- [ ] User credits are updated correctly
- [ ] Transaction history is logged
- [ ] Edge cases are covered (NaN, missing data, etc.)
- [ ] Performance under load is acceptable
- [ ] Monitoring and alerts are set up