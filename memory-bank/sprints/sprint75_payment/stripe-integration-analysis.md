# Sprint 75: Credit-Based Payment System Analysis

## Overview
This document outlines the implementation plan for a credit-based payment system using Stripe for one-time payments. Users purchase credits that they can use at their own pace, with no recurring subscriptions.

## Current State Analysis

### User System
- Authentication: NextAuth.js with email/magic link
- User Model: Basic user table with email, name, created date
- No current payment/subscription tracking

### Missing Components
1. Subscription management system
2. Usage tracking for video exports
3. Payment processing infrastructure
4. Billing portal integration

## Proposed Architecture

### 1. Database Schema Updates
```sql
-- New tables needed
subscriptions (
  id
  userId (FK to users)
  stripeCustomerId
  stripeSubscriptionId
  status (active, canceled, past_due, etc)
  currentPeriodStart
  currentPeriodEnd
  cancelAtPeriodEnd
  createdAt
  updatedAt
)

usage_records (
  id
  userId (FK to users)
  type (video_export, ai_generation, etc)
  quantity
  metadata (format, duration, etc)
  createdAt
)

pricing_plans (
  id
  stripePriceId
  name
  description
  features (JSON)
  limits (JSON)
  active
)
```

### 2. Core Implementation Strategy

#### A. Stripe Customer Creation
- Create Stripe customer immediately after user signup
- Store mapping in our database
- Add user metadata to Stripe customer

#### B. Subscription Flow
1. User clicks "Upgrade" → Create checkout session
2. Redirect to Stripe Checkout with pre-filled customer
3. Success URL → Sync subscription data
4. Handle webhooks for ongoing updates

#### C. Usage Tracking
- Track video exports per billing period
- Track AI generation requests
- Enforce limits based on subscription tier

### 3. Pricing Tiers (Proposed)

#### Free Tier
- 5 video exports/month
- 720p max resolution
- Basic templates only
- Watermark on exports

#### Pro Tier ($19/month)
- 50 video exports/month
- 1080p resolution
- All templates + AI generation
- No watermark
- Priority support

#### Business Tier ($49/month)
- Unlimited exports
- 4K resolution
- Custom branding
- API access
- Team collaboration

### 4. Technical Implementation

#### A. API Routes Needed
```typescript
// Stripe customer management
/api/stripe/create-customer
/api/stripe/create-checkout-session
/api/stripe/create-portal-session

// Webhook handler
/api/stripe/webhook

// Usage tracking
/api/usage/check-limits
/api/usage/record-export
```

#### B. Key Services
```typescript
// StripeService
- createCustomer()
- createCheckoutSession()
- syncSubscriptionData()
- getSubscriptionStatus()

// UsageService  
- checkExportLimit()
- recordExport()
- getRemainingCredits()
- resetMonthlyUsage()
```

#### C. Middleware/Guards
```typescript
// Subscription guards
- requiresSubscription()
- checkUsageLimit()
- enforceRateLimit()
```

### 5. User Experience Flow

#### Upgrade Flow
1. User hits limit → Show upgrade modal
2. Display pricing tiers with features
3. Click "Upgrade" → Stripe Checkout
4. Return to app → Show success message
5. Immediately unlock features

#### Usage Display
- Show remaining exports in header
- Progress bar for usage
- Alert when approaching limit
- Clear upgrade CTA when at limit

### 6. Security Considerations

1. **Webhook Verification**
   - Verify Stripe signatures
   - Use environment-specific endpoints
   - Log all webhook events

2. **Customer Data Sync**
   - Single source of truth function
   - Handle race conditions
   - Fallback to Stripe API if cache miss

3. **Environment Separation**
   - Separate test/production Stripe accounts
   - Environment-specific webhook endpoints
   - Clear visual indicators in dev mode

### 7. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- Database schema updates
- Stripe service setup
- Basic customer creation
- Webhook handler

#### Phase 2: Checkout Flow (Week 2)
- Pricing page UI
- Checkout session creation
- Success/cancel handling
- Subscription syncing

#### Phase 3: Usage Tracking (Week 3)
- Export limits enforcement
- Usage UI components
- Billing portal integration
- Admin dashboard

#### Phase 4: Polish & Testing (Week 4)
- Error handling
- Edge cases
- Load testing
- Documentation

## Next Steps

1. Review and approve pricing structure
2. Create Stripe account and products
3. Design pricing page mockups
4. Begin Phase 1 implementation

## References
- [Stripe Docs](https://stripe.com/docs)
- [t3dotgg Recommendations](https://github.com/t3dotgg/stripe-recommendations)
- [Next.js Stripe Example](https://github.com/vercel/next.js/tree/canary/examples/with-stripe-typescript)