# Stripe Native Coupons Integration

## Current vs Stripe-Native Approach

### Current Implementation (Simple)
- We calculate discounts ourselves
- Pass final price to Stripe
- Works but doesn't show discount breakdown in Stripe dashboard

### Stripe-Native Approach (Recommended)
- Create Stripe Coupons that match our promo codes
- Apply coupons during checkout
- Better tracking and reporting in Stripe

## Implementation Plan for Stripe Coupons

### 1. Sync Promo Codes to Stripe

```typescript
// When admin creates promo code:
const stripeCoupon = await stripe.coupons.create({
  id: promoCode.code, // "SUMMER50"
  percent_off: 50, // or amount_off for fixed discounts
  duration: 'once',
  max_redemptions: promoCode.maxUses,
  redeem_by: promoCode.validUntil,
  metadata: {
    promoCodeId: promoCode.id,
  }
});

// Store Stripe coupon ID in our database
await db.update(promoCodes)
  .set({ stripeCouponId: stripeCoupon.id })
  .where(eq(promoCodes.id, promoCode.id));
```

### 2. Apply During Checkout

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      unit_amount: pkg.price, // Full price
      product_data: { name: pkg.name },
    },
    quantity: 1,
  }],
  discounts: [{
    coupon: promoCode.stripeCouponId, // Apply Stripe coupon
  }],
  metadata: {
    userId: ctx.session.user.id,
    promoCodeId: promoCode.id,
  }
});
```

### 3. Benefits of Stripe-Native
- Automatic discount calculation
- Shows properly in Stripe dashboard
- Customer sees discount breakdown on checkout page
- Stripe handles validation (max uses, expiry)
- Better reporting and analytics

### 4. Migration Strategy
1. Add `stripeCouponId` field to promoCodes table
2. Update createPromoCode to create Stripe coupon
3. Update checkout to use Stripe discounts
4. Backfill existing promo codes if needed

## Example Customer Experience

With Stripe coupons, the checkout shows:
```
Subtotal:        €25.00
Discount (50%):  -€12.50
-------------------
Total:           €12.50
```

Instead of just showing €12.50 with no breakdown.