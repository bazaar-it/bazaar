# Promo Codes & Paywall Analytics Implementation Plan

## Current State Analysis

### Credit System
- Users get 5 free prompts daily
- Can purchase credits in packages (€5, €25, €100)
- Credits stored in `userCredits` table (purchasedCredits field)
- Usage tracked in `userUsage` table

### Paywall Triggers
1. **ChatPanelG.tsx:641** - Opens purchase modal when rate limited
2. **PromptUsageDisplay.tsx:123** - Manual "Buy Credits" button
3. **PromptUsageDropdown.tsx:63** - Purchase button in dropdown

### Current Limitations
- No analytics on paywall interactions
- No promo code system
- Can't track who hits paywall vs who buys
- No discount capabilities for competitions/marketing

## Implementation Plan

### 1. Analytics Tracking System

#### Database Schema
```sql
-- Track all paywall interactions
CREATE TABLE paywall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL, -- 'viewed', 'clicked_package', 'initiated_checkout', 'completed_purchase'
  package_id UUID REFERENCES credit_package(id),
  metadata JSONB, -- Store additional context (e.g., which UI triggered it)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics aggregations (for performance)
CREATE TABLE paywall_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  unique_users_hit_paywall INTEGER DEFAULT 0,
  unique_users_clicked_package INTEGER DEFAULT 0,
  unique_users_initiated_checkout INTEGER DEFAULT 0,
  unique_users_completed_purchase INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);
```

#### Implementation Steps
1. Add event tracking to PurchaseModal component
2. Track when modal opens (paywall viewed)
3. Track package clicks
4. Track checkout initiation
5. Create analytics aggregation job

### 2. Promo Code System

#### Database Schema
```sql
-- Promo codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'free_credits'
  discount_value INTEGER NOT NULL, -- percentage (0-100), cents for fixed, or credit count
  max_uses INTEGER, -- NULL for unlimited
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  min_purchase_amount INTEGER, -- Minimum purchase in cents to use code
  applicable_packages UUID[], -- Array of package IDs, NULL for all
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track promo code usage
CREATE TABLE promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  order_id VARCHAR(255), -- Stripe payment intent ID
  discount_applied_cents INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id) -- One use per user
);
```

#### Promo Code Types
1. **Percentage Discount**: 50% off any package
2. **Fixed Amount**: €10 off purchases over €25
3. **Free Credits**: Get 100 free credits (no purchase needed)

#### Implementation Steps
1. Create database tables
2. Add promo code validation API endpoint
3. Modify Stripe checkout to apply discounts
4. Add promo code input to PurchaseModal
5. Create admin UI for code generation

### 3. Admin Dashboard Enhancements

#### New Pages/Features
1. **Paywall Analytics** (`/admin/analytics/paywall`)
   - Daily/weekly/monthly metrics
   - Conversion funnel visualization
   - User cohort analysis

2. **Promo Code Management** (`/admin/promo-codes`)
   - Generate new codes
   - View usage statistics
   - Deactivate codes
   - Export usage reports

#### Key Metrics to Display
- Unique users hitting paywall
- Conversion rate (viewed → purchased)
- Average time to purchase
- Most popular packages
- Promo code effectiveness

### 4. Implementation Priority

1. **Phase 1: Analytics (1-2 days)**
   - Add event tracking
   - Create database tables
   - Basic admin dashboard

2. **Phase 2: Basic Promo Codes (2-3 days)**
   - Database schema
   - Validation endpoint
   - Simple percentage discounts

3. **Phase 3: Advanced Features (2-3 days)**
   - Complex promo rules
   - Admin UI enhancements
   - Detailed analytics

## Technical Considerations

### Event Tracking
- Use tRPC mutations for event logging
- Batch events for performance
- Consider privacy/GDPR compliance

### Promo Code Security
- Rate limit code validation attempts
- Hash codes in database
- Audit trail for all usage

### Performance
- Index frequently queried fields
- Aggregate analytics hourly/daily
- Cache promo code validations

## Implementation Status

### ✅ Completed
1. **Database Schema** - Added 4 new tables:
   - `promoCodes` - Store promo code definitions
   - `promoCodeUsage` - Track who used which codes
   - `paywallEvents` - Log all paywall interactions
   - `paywallAnalytics` - Aggregated daily stats

2. **Event Tracking** - PurchaseModal now tracks:
   - Modal views (`viewed`)
   - Package clicks (`clicked_package`)
   - Checkout initiations (`initiated_checkout`)
   - Purchase completions (via Stripe webhook)

3. **Promo Code System**:
   - Validation endpoint with comprehensive checks
   - Support for percentage, fixed amount, and free credit discounts
   - Promo code input in PurchaseModal
   - Automatic application during checkout

4. **Admin Pages**:
   - `/admin/promo-codes` - Create and manage promo codes
   - `/admin/paywall-analytics` - View conversion funnel and metrics

5. **API Endpoints**:
   - `payment.trackPaywallEvent` - Log user interactions
   - `payment.validatePromoCode` - Check code validity
   - `admin.createPromoCode` - Generate new codes
   - `admin.getPaywallAnalytics` - Fetch conversion data

### 🔧 Still Needed
1. **Stripe Webhook Update** - Record promo code usage after successful payment
2. **Analytics Aggregation** - Cron job to update daily stats
3. **Testing** - Verify promo code flow end-to-end
4. **Migration** - Apply database changes when sync is complete

## Key Insights
- We can now track exactly where users drop off in the payment flow
- Promo codes support multiple discount types for flexibility
- Analytics show conversion rates at each step of the funnel
- Admin can create targeted campaigns with usage limits