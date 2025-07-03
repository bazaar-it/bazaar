# Feature 008: Accept Payments

**Feature ID**: 008  
**Priority**: HIGH (Core Business Feature)  
**Complexity**: MEDIUM  
**Created**: January 2, 2025  
**Status**: Not Started  
**Effort Estimate**: 3-4 days  

## Overview

Implement monetization capabilities for Bazaar-Vid through Stripe integration, enabling the platform to transition from free beta to a sustainable business model with subscription tiers and usage-based pricing.

## Current State

- Platform is currently in free beta with no payment processing
- No user limits or usage quotas implemented
- No billing infrastructure or payment provider integration
- All features accessible to all users without restrictions

## Problem Statement / User Need

As the platform matures and scales:
- **Business Need**: Generate revenue to sustain operations and development
- **User Need**: Clear pricing tiers with predictable costs
- **Scale Need**: Usage limits to prevent abuse and manage infrastructure costs
- **Growth Need**: Premium features to incentivize upgrades

## Proposed Solution

### Subscription Tiers

```typescript
interface SubscriptionTier {
  id: 'free' | 'starter' | 'pro' | 'enterprise';
  name: string;
  price: number; // cents per month
  limits: {
    videosPerMonth: number;
    exportsPerMonth: number;
    storageGB: number;
    maxVideoDuration: number; // seconds
    prioritySupport: boolean;
    customBranding: boolean;
  };
}
```

**Recommended Tiers**:
1. **Free**: 5 videos/month, 10 exports, 1GB storage, 30s max
2. **Starter ($9/mo)**: 50 videos, 100 exports, 10GB, 60s max
3. **Pro ($29/mo)**: Unlimited videos, 500 exports, 50GB, 180s max, priority support
4. **Enterprise (Custom)**: Custom limits, dedicated support, SLA

### Payment Flow

1. User hits limit → Show upgrade modal
2. Select plan → Stripe Checkout redirect
3. Payment success → Update user subscription
4. Webhook handling for subscription events
5. Grace period for failed payments

## Technical Implementation

### 1. Database Schema Updates

```sql
-- Subscription tiers table
CREATE TABLE subscription_tiers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  limits JSONB NOT NULL,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  tier_id VARCHAR(50) REFERENCES subscription_tiers(id),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50), -- active, canceled, past_due
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  metric_type VARCHAR(50), -- videos_created, exports_made
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP,
  period_end TIMESTAMP
);
```

### 2. Stripe Integration

```typescript
// src/server/services/payment/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const paymentService = {
  createCheckoutSession: async (userId: string, tierID: string) => {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [{
        price: getPriceIdForTier(tierId),
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/payment/success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: { userId, tierId }
    });
    return session;
  },
  
  handleWebhook: async (event: Stripe.Event) => {
    switch (event.type) {
      case 'checkout.session.completed':
        await activateSubscription(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
      // ... other events
    }
  }
};
```

### 3. Usage Enforcement

```typescript
// src/server/services/usage/limiter.ts
export const usageLimiter = {
  checkVideoCreation: async (userId: string) => {
    const subscription = await getUserSubscription(userId);
    const usage = await getCurrentPeriodUsage(userId, 'videos_created');
    
    if (usage.count >= subscription.limits.videosPerMonth) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Monthly video limit reached. Please upgrade your plan.'
      });
    }
  },
  
  incrementUsage: async (userId: string, metric: string) => {
    await db.update(usageMetrics)
      .set({ count: sql`count + 1` })
      .where(and(
        eq(usageMetrics.userId, userId),
        eq(usageMetrics.metricType, metric),
        gte(usageMetrics.periodStart, startOfMonth)
      ));
  }
};
```

### 4. UI Components

```typescript
// src/components/billing/UpgradeModal.tsx
export function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier, 
  limitType 
}: UpgradeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Upgrade Your Plan</h2>
      <p>You've reached your {limitType} limit for this month.</p>
      <PricingTable 
        highlight={getRecommendedTier(limitType)}
        onSelect={handleUpgrade}
      />
    </Modal>
  );
}

// src/components/billing/UsageIndicator.tsx
export function UsageIndicator({ userId }: { userId: string }) {
  const { data: usage } = api.billing.getUsage.useQuery();
  
  return (
    <div className="flex gap-4">
      <UsageBar 
        label="Videos" 
        current={usage.videosCreated} 
        max={usage.limits.videosPerMonth} 
      />
      <UsageBar 
        label="Exports" 
        current={usage.exportsUsed} 
        max={usage.limits.exportsPerMonth} 
      />
    </div>
  );
}
```

### 5. Billing Dashboard

```typescript
// src/app/account/billing/page.tsx
export default function BillingPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1>Billing & Subscription</h1>
      
      <CurrentPlan />
      <UsageOverview />
      <PaymentHistory />
      <UpdatePaymentMethod />
      <CancelSubscription />
    </div>
  );
}
```

### 6. API Routes

```typescript
// src/server/api/routers/billing.ts
export const billingRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .input(z.object({ tierId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await paymentService.createCheckoutSession(
        ctx.session.user.id,
        input.tierId
      );
      return { url: session.url };
    }),
    
  getUsage: protectedProcedure
    .query(async ({ ctx }) => {
      return await usageService.getUserMetrics(ctx.session.user.id);
    }),
    
  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await paymentService.cancelSubscription(ctx.session.user.id);
    })
});
```

## Success Metrics

1. **Conversion Rate**: % of users who hit limits that upgrade
2. **MRR Growth**: Monthly recurring revenue trajectory
3. **Churn Rate**: % of users canceling subscriptions
4. **Usage Patterns**: Average usage per tier
5. **Payment Success Rate**: Successful vs failed payments

## Implementation Checklist

- [ ] Set up Stripe account and API keys
- [ ] Create database schema for subscriptions
- [ ] Implement Stripe webhook handling
- [ ] Build usage tracking system
- [ ] Create pricing page UI
- [ ] Add upgrade modals at limit points
- [ ] Build billing dashboard
- [ ] Implement usage indicators in UI
- [ ] Add subscription management endpoints
- [ ] Test payment flows end-to-end
- [ ] Add monitoring and alerts
- [ ] Create admin tools for subscription management

## Future Enhancements

1. **Usage-Based Pricing**: Pay per export beyond limits
2. **Team Plans**: Multiple users per subscription
3. **Annual Discounts**: 20% off for yearly payments
4. **Referral Program**: Credits for bringing new users
5. **Custom Enterprise**: Negotiated contracts
6. **Add-On Features**: One-time purchases for specific features
7. **Regional Pricing**: Adjusted prices by geography
8. **Student Discounts**: Verified education pricing