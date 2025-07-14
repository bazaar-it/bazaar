# Sprint 75: Credit-Based Payment System TODO

## Phase 1: Database & Core Services

### Database Schema
- [ ] Create user_credits table (userId, balance, lifetimeCredits)
- [ ] Create credit_transactions table (log all credit changes)
- [ ] Create credit_packages table (define purchase options)
- [ ] Add stripeCustomerId to users table (nullable)
- [ ] Generate and test migrations

### Credit Service
- [ ] Create CreditService class
- [ ] Implement getBalance(userId) method
- [ ] Implement checkCredits(userId, amount) method
- [ ] Implement useCredits(userId, amount, description) method
- [ ] Implement addCredits(userId, amount, paymentIntentId) method
- [ ] Add transaction logging for all credit changes
- [ ] Add proper error handling for insufficient credits

### Credit Calculations
- [ ] Create calculateExportCredits(duration, resolution) function
- [ ] Create calculateAIGenerationCredits(complexity) function
- [ ] Add credit cost preview before operations
- [ ] Document credit costs in UI

## Phase 2: Stripe Integration

### Basic Setup
- [ ] Install stripe package
- [ ] Create Stripe service for payments
- [ ] Set up environment variables (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- [ ] Configure Stripe for one-time payments only

### Payment Flow
- [ ] Create /api/stripe/create-payment-intent endpoint
- [ ] Add authentication to payment endpoints
- [ ] Implement createCreditPurchase(userId, packageId) method
- [ ] Handle payment success webhook
- [ ] Add credits immediately after successful payment
- [ ] Create payment confirmation emails

### Security
- [ ] Implement webhook signature verification
- [ ] Add rate limiting to payment endpoints
- [ ] Validate all payment amounts server-side
- [ ] Log all payment attempts

## Phase 3: Frontend Implementation

### Credit Display
- [ ] Create CreditBalance component for header
- [ ] Add real-time balance updates after usage
- [ ] Show credit cost before operations
- [ ] Add low balance warnings (<100 credits)
- [ ] Create credit history page

### Purchase Flow
- [ ] Design credit package selection UI
- [ ] Create purchase modal with package options
- [ ] Implement Stripe Checkout integration
- [ ] Add loading states during purchase
- [ ] Handle purchase success/failure
- [ ] Show success notification with new balance

### Usage Integration
- [ ] Add credit check before video export
- [ ] Add credit check before AI generation
- [ ] Show "Insufficient credits" error gracefully
- [ ] Add "Top up" CTA when low on credits
- [ ] Implement credit deduction after successful operations

## Phase 4: User Experience

### Onboarding
- [ ] Give 100 free credits to new users
- [ ] Create welcome email explaining credits
- [ ] Add credit system explanation to docs
- [ ] Create FAQ about credits

### Analytics & Admin
- [ ] Create admin dashboard for credit analytics
- [ ] Track average credits per video
- [ ] Monitor credit purchase patterns
- [ ] Add manual credit adjustment tool
- [ ] Export credit usage reports

### Optimizations
- [ ] Cache credit balance in Redis/memory
- [ ] Batch credit deductions for performance
- [ ] Add credit expiry (optional, maybe 2 years)
- [ ] Implement referral credits system

## Quick Wins to Start

1. [ ] Define final credit packages and pricing
2. [ ] Create database migrations
3. [ ] Build CreditService with basic methods
4. [ ] Add credit balance to user context
5. [ ] Create simple credit display component

## Testing Checklist

- [ ] Test insufficient credit handling
- [ ] Test concurrent credit usage (race conditions)
- [ ] Test payment failure scenarios
- [ ] Test webhook reliability
- [ ] Test credit calculation accuracy
- [ ] Test bulk purchase discounts
- [ ] Load test credit checking at scale

## Documentation

- [ ] Document credit costs clearly
- [ ] Create pricing page content
- [ ] Write credit FAQ
- [ ] Add credit info to CLAUDE.md
- [ ] Create admin guide for credit management

## Future Enhancements (Post-Launch)

- [ ] Team credit pools
- [ ] Credit gifting between users
- [ ] Subscription option for heavy users
- [ ] Credit rewards for achievements
- [ ] Seasonal promotions/bonuses