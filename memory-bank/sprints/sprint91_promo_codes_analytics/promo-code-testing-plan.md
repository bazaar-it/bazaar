# Promo Code Testing & Deployment Plan

## Current Status

Migration `0007_illegal_liz_osborn.sql` contains:
- `bazaar-vid_promo_codes` table
- `bazaar-vid_promo_code_usage` table  
- `bazaar-vid_paywall_analytics` table
- `bazaar-vid_paywall_events` table
- `bazaar-vid_api_usage_metric` table

**Status**: Migration created but NOT pushed to dev or production databases

## Testing Plan

### Phase 1: Development Database Setup

```bash
# 1. Backup current dev database
pg_dump $DATABASE_URL > backup_dev_$(date +%Y%m%d).sql

# 2. Apply migration to dev
npm run db:migrate

# 3. Verify tables created
psql $DATABASE_URL -c "\dt bazaar-vid_promo*"
```

### Phase 2: Functionality Testing

#### A. Promo Code Creation
```typescript
// Test creating different promo code types
const testCodes = [
  {
    code: "LAUNCH50",
    discount_type: "percentage",
    discount_value: 50,
    max_uses: 100
  },
  {
    code: "FRIEND10",
    discount_type: "fixed",
    discount_value: 1000, // $10 in cents
    max_uses: null // unlimited
  },
  {
    code: "VIP100",
    discount_type: "percentage", 
    discount_value: 100, // free
    max_uses: 10,
    valid_until: new Date('2025-12-31')
  }
];
```

#### B. Usage Tracking
- Apply promo code during checkout
- Verify discount calculation
- Check usage count increments
- Validate unique constraint (one use per user)
- Test expired codes rejection
- Test max uses enforcement

#### C. Analytics Integration
```typescript
// Track promo code performance
interface PromoAnalytics {
  totalUsage: number;
  totalDiscountGiven: number;
  conversionRate: number;
  averageOrderValue: number;
  topCodes: PromoCodeStats[];
}
```

### Phase 3: Admin Interface Testing

#### Features to Test:
1. **Create Promo Code Form**
   - Validation for code format
   - Date picker for validity period
   - Package selection
   - Preview discount calculation

2. **Promo Code List View**
   - Search by code
   - Filter by status (active/expired/exhausted)
   - Sort by usage/created date
   - Quick enable/disable

3. **Analytics Dashboard**
   - Usage trends graph
   - Revenue impact
   - User acquisition metrics
   - Code performance comparison

### Phase 4: User Flow Testing

```typescript
// Complete checkout flow with promo code
async function testPromoCheckout() {
  // 1. User enters promo code
  const validation = await validatePromoCode("LAUNCH50", userId);
  
  // 2. Show discount preview
  const discount = calculateDiscount(validation, packagePrice);
  
  // 3. Apply to order
  const order = await createOrder({
    userId,
    packageId,
    promoCodeId: validation.codeId,
    discountAmount: discount,
    finalPrice: packagePrice - discount
  });
  
  // 4. Record usage
  await recordPromoUsage(validation.codeId, userId, order.id);
  
  // 5. Update analytics
  await updatePaywallAnalytics({
    promo_used: true,
    discount_amount: discount
  });
}
```

### Phase 5: Edge Cases

1. **Concurrent Usage**: Multiple users applying same code simultaneously
2. **Race Conditions**: Max uses reached during checkout
3. **Timezone Issues**: Validity dates across timezones
4. **Refund Handling**: Promo code usage after refund
5. **Code Conflicts**: Similar codes (SAVE10 vs SAVE100)

## Migration Commands

### Development
```bash
# Generate migration (if changes needed)
npm run db:generate

# Apply to dev database
npm run db:migrate

# Verify migration
npm run db:studio
```

### Production Deployment
```bash
# 1. Backup production
pg_dump $PRODUCTION_DATABASE_URL > backup_prod_$(date +%Y%m%d).sql

# 2. Test on staging (clone of prod)
DATABASE_URL=$STAGING_URL npm run db:migrate

# 3. Verify staging
# Run full test suite

# 4. Apply to production (during maintenance window)
DATABASE_URL=$PRODUCTION_DATABASE_URL npm run db:migrate

# 5. Verify production
# Quick smoke tests
```

## API Endpoints Required

### Admin Endpoints
```typescript
// Admin router additions
router.post('/admin/promo-codes', createPromoCode);
router.get('/admin/promo-codes', listPromoCodes);
router.patch('/admin/promo-codes/:id', updatePromoCode);
router.delete('/admin/promo-codes/:id', deletePromoCode);
router.get('/admin/promo-codes/:id/usage', getPromoUsage);
router.get('/admin/promo-analytics', getPromoAnalytics);
```

### User Endpoints
```typescript
// Payment router additions  
router.post('/validate-promo', validatePromoCode);
router.post('/apply-promo', applyPromoToOrder);
```

## Tracking & Analytics

### Key Metrics to Track

1. **Acquisition Metrics**
   - New users from promo codes
   - Conversion rate by code
   - Time to first purchase

2. **Revenue Metrics**
   - Total discount given
   - Net revenue after discounts
   - LTV of promo users vs organic

3. **Usage Patterns**
   - Most popular codes
   - Average discount per user
   - Repeat purchase rate

### Dashboard Queries
```sql
-- Daily promo code performance
SELECT 
  pc.code,
  COUNT(DISTINCT pcu.user_id) as unique_users,
  SUM(pcu.discount_applied_cents) / 100.0 as total_discount,
  pc.uses_count,
  pc.max_uses
FROM "bazaar-vid_promo_codes" pc
LEFT JOIN "bazaar-vid_promo_code_usage" pcu ON pc.id = pcu.promo_code_id
WHERE pcu.used_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY pc.id
ORDER BY unique_users DESC;

-- User acquisition through promos
SELECT 
  DATE(u.created_at) as signup_date,
  COUNT(DISTINCT CASE WHEN pcu.id IS NOT NULL THEN u.id END) as promo_users,
  COUNT(DISTINCT CASE WHEN pcu.id IS NULL THEN u.id END) as organic_users
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_promo_code_usage" pcu ON u.id = pcu.user_id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(u.created_at)
ORDER BY signup_date DESC;
```

## Security Considerations

1. **Rate Limiting**: Prevent promo code guessing
2. **Validation**: Server-side validation only
3. **Audit Trail**: Log all promo operations
4. **Permissions**: Admin-only code creation
5. **Encryption**: Sensitive discount rules

## Next Steps

1. ✅ Review migration file
2. ⏳ Apply to development database
3. ⏳ Implement API endpoints
4. ⏳ Create admin UI
5. ⏳ Write integration tests
6. ⏳ Load testing
7. ⏳ Deploy to staging
8. ⏳ Production deployment

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration failure | Low | High | Backup, test on staging |
| Code abuse | Medium | Medium | Rate limits, one-per-user |
| Calculation errors | Low | High | Extensive testing |
| Performance impact | Low | Low | Indexed properly |