# Hybrid Stripe Coupons Migration

## Phase 1: Keep Current System + Add Stripe Coupons
Keep your existing promo code system but sync with Stripe for better checkout UX.

### 1. Update Schema
```sql
ALTER TABLE bazaar-vid_promo_codes 
ADD COLUMN stripe_coupon_id VARCHAR(255),
ADD COLUMN stripe_promo_code_id VARCHAR(255);
```

### 2. Update Create Promo Code
```typescript
// admin.ts - createPromoCode
const [newCode] = await db.insert(promoCodes).values({...});

// Create Stripe coupon based on type
let stripeCoupon;
if (input.discountType === 'percentage') {
  stripeCoupon = await stripe.coupons.create({
    percent_off: input.discountValue,
    duration: 'once',
    metadata: { promoCodeId: newCode.id }
  });
} else if (input.discountType === 'fixed_amount') {
  stripeCoupon = await stripe.coupons.create({
    amount_off: input.discountValue, // already in cents
    currency: 'eur',
    duration: 'once',
    metadata: { promoCodeId: newCode.id }
  });
}

// Create promotion code (what user types)
if (stripeCoupon) {
  const stripePromo = await stripe.promotionCodes.create({
    coupon: stripeCoupon.id,
    code: input.code,
    max_redemptions: input.maxUses || undefined,
    expires_at: input.validUntil ? Math.floor(input.validUntil.getTime() / 1000) : undefined,
  });

  // Update our record with Stripe IDs
  await db.update(promoCodes)
    .set({ 
      stripeCouponId: stripeCoupon.id,
      stripePromoCodeId: stripePromo.id 
    })
    .where(eq(promoCodes.id, newCode.id));
}
```

### 3. Update Checkout
```typescript
// payment.ts - createCheckout
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'eur',
      product_data: {
        name: pkg.name,
        description: `${pkg.credits} prompts for your video projects`,
      },
      unit_amount: pkg.price, // FULL PRICE - let Stripe handle discount
    },
    quantity: 1,
  }],
  discounts: promoCode?.stripePromoCodeId ? [{
    promotion_code: promoCode.stripePromoCodeId, // Apply Stripe discount
  }] : undefined,
  metadata: {
    userId: ctx.session.user.id,
    packageId: input.packageId,
    promptCount: pkg.credits.toString(),
    promoCodeId: promoCode?.id || '',
  },
  success_url: `${process.env.NEXTAUTH_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXTAUTH_URL}/purchase/cancelled`,
});
```

### 4. Handle Free Credits (Special Case)
Free credits don't reduce price, so keep your current logic:
```typescript
if (promo.discountType === 'free_credits') {
  // Don't create Stripe coupon
  // Handle in webhook when payment completes
  // Add bonus credits to user's account
}
```

## Benefits of Hybrid Approach:
1. ✅ Keep your database as source of truth
2. ✅ Get Stripe's checkout UX benefits
3. ✅ Support custom logic (free credits)
4. ✅ Gradual migration, no breaking changes

## Customer Experience:
- Types "SUMMER50" in your modal
- Your system validates it
- Stripe checkout shows:
  ```
  Video Credits Package    €25.00
  Promo: SUMMER50         -€12.50
  ─────────────────────────────────
  Total                    €12.50
  ```