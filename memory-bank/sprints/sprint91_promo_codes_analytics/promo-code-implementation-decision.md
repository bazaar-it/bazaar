# Promo Code Implementation Decision Guide

## Current State
We've built a custom promo code system that:
- Stores codes in our database
- Validates in our backend
- Calculates discounts manually
- Passes final price to Stripe

## The Decision: Custom vs Stripe Coupons vs Hybrid

### Option 1: Keep Current Custom System ✅
**Best for: Maximum flexibility and control**

#### Pros:
- ✅ **Full flexibility** - Any discount logic possible
- ✅ **Complex promotions** - "Buy 2 get 1", conditional discounts
- ✅ **Free credits** - Add bonus without changing price
- ✅ **User-specific** - Different discounts per user segment
- ✅ **Already built** - No additional work needed
- ✅ **No vendor lock-in** - Easy to switch payment providers

#### Cons:
- ❌ Basic checkout display (just shows final price)
- ❌ No automatic Stripe analytics
- ❌ More code to maintain
- ❌ Customer doesn't see savings breakdown

#### Example Use Cases:
```typescript
// Early bird discount
if (user.createdAt < '2024-01-01') {
  discount = 30; // Extra 30% for early users
}

// Referral rewards
if (user.referralCount > 5) {
  bonusCredits = 50; // Free credits for referrers
}

// Competition prizes
if (promo.code === 'HACKATHON2024') {
  return { freeCredits: 1000, price: 0 }; // Completely free
}
```

### Option 2: Full Stripe Coupons Migration 🔄
**Best for: Professional checkout experience**

#### Pros:
- ✅ **Professional checkout** - Shows discount breakdown
- ✅ **Trust factor** - Customers see "You saved €X"
- ✅ **Stripe analytics** - Built-in coupon performance tracking
- ✅ **Less code** - Stripe handles validation, limits, expiry
- ✅ **Invoice integration** - Discounts appear on receipts

#### Cons:
- ❌ **Limited flexibility** - Only percentage or fixed amount
- ❌ **No free credits** - Can't add bonus without changing price
- ❌ **API complexity** - Multiple API calls required
- ❌ **Stripe lock-in** - Harder to switch providers
- ❌ **No user-specific logic** - Same discount for everyone

#### Stripe Coupon Types:
```javascript
// Percentage discount
stripe.coupons.create({
  percent_off: 50,
  duration: 'once'
});

// Fixed amount discount
stripe.coupons.create({
  amount_off: 1000, // €10 off
  currency: 'eur',
  duration: 'once'
});

// Limited uses
stripe.promotionCodes.create({
  coupon: coupon.id,
  code: 'SUMMER50',
  max_redemptions: 100
});
```

### Option 3: Hybrid Approach (Recommended) 🎯
**Best for: Balance of features and flexibility**

#### How It Works:
1. Keep your database as source of truth
2. Sync simple discounts to Stripe for better UX
3. Handle complex cases with custom logic

#### Implementation:
```typescript
// For simple percentage/fixed discounts
if (promo.discountType in ['percentage', 'fixed_amount']) {
  // Create Stripe coupon for checkout UX
  const stripeCoupon = await createStripeCoupon(promo);
  // Apply via Stripe for professional display
}

// For complex cases
if (promo.discountType === 'free_credits') {
  // Handle in webhook after payment
  // Add bonus credits to user account
}
```

#### Benefits:
- ✅ Professional checkout for standard discounts
- ✅ Flexibility for complex promotions
- ✅ Single source of truth (your database)
- ✅ Gradual migration possible
- ✅ Best of both worlds

## Recommended Implementation Plan

### Phase 1: Keep Current System (Now)
- ✅ Already working
- ✅ Start collecting analytics
- ✅ Test with real users
- ✅ Gather feedback on checkout experience

### Phase 2: Add Stripe Sync (Later)
```sql
-- Add Stripe fields to existing table
ALTER TABLE bazaar-vid_promo_codes 
ADD COLUMN stripe_coupon_id VARCHAR(255),
ADD COLUMN stripe_promo_code_id VARCHAR(255);
```

### Phase 3: Hybrid Logic
```typescript
// In createCheckout endpoint
if (promo?.stripeCouponId) {
  // Use Stripe's discount system
  session.discounts = [{ promotion_code: promo.stripePromoCodeId }];
} else {
  // Fall back to manual calculation
  finalPrice = calculateDiscount(pkg.price, promo);
}
```

## Decision Framework

### Choose Custom System If:
- [ ] You need user-specific discounts
- [ ] You want free credit bonuses
- [ ] You have complex promotion rules
- [ ] You value flexibility over polish
- [ ] You might switch payment providers

### Choose Stripe Coupons If:
- [ ] You only need basic percentage/amount discounts
- [ ] Professional checkout UX is critical
- [ ] You want automatic analytics
- [ ] You're committed to Stripe long-term
- [ ] You prefer less custom code

### Choose Hybrid If:
- [ ] You want professional UX for simple cases
- [ ] You need flexibility for complex promotions
- [ ] You're willing to maintain both systems
- [ ] You want to test what works best

## Cost Comparison
| Approach | Additional Cost | Complexity | Flexibility | UX Quality |
|----------|----------------|------------|-------------|------------|
| Custom | €0 | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Stripe | €0 | Low | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Hybrid | €0 | High | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Final Recommendation

**Start with current custom system** because:
1. It's already built and working
2. Gives you maximum flexibility for marketing experiments
3. You can always add Stripe integration later
4. No immediate downsides besides checkout UX

**Consider Stripe integration when:**
- Users complain about not seeing discounts clearly
- You want better analytics on coupon usage
- You're doing mostly simple percentage discounts
- Professional appearance becomes critical

The beauty is you can evolve from custom → hybrid → full Stripe as your needs change!