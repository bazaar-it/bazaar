# Sprint 91: Promo Codes & Paywall Analytics

## Sprint Overview
- **Goal**: Implement promo code system and detailed paywall analytics
- **Status**: In Progress
- **Started**: 2025-08-01

## Objectives
1. Track user interactions with paywall (views, clicks, purchases)
2. Create promo code system for discounts and marketing campaigns
3. Build admin dashboard for analytics and promo code management
4. Enable data-driven decisions on pricing and conversions

## Key Deliverables
- ✅ Database schema for promo codes and analytics
- ✅ Event tracking in PurchaseModal
- ✅ Promo code validation and redemption
- ✅ Admin pages for management
- 🔧 Stripe webhook integration
- 🔧 Analytics aggregation system

## Files Modified
- `/src/server/db/schema.ts` - Added new tables
- `/src/components/purchase/PurchaseModal.tsx` - Added tracking and promo input
- `/src/server/api/routers/payment.ts` - New endpoints
- `/src/server/api/routers/admin.ts` - Admin endpoints
- `/src/app/admin/promo-codes/page.tsx` - Promo management UI
- `/src/app/admin/paywall-analytics/page.tsx` - Analytics dashboard
- `/src/components/AdminSidebar.tsx` - Navigation updates

## Technical Details
See `promo-codes-and-analytics.md` for full implementation details.