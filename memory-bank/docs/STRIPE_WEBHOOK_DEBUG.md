# Stripe Webhook Debugging Guide

## Current Issues

1. **Production webhook failing with 500 errors** at `https://coco.bazaar.it/api/webhooks/stripe`
2. **Real payment was made and refunded** but credits weren't added
3. **10 failed webhook attempts** since July 15

## Likely Causes

### 1. Webhook Secret Mismatch
- **Development**: Using test webhook secret (`whsec_2XTUpZjdugrUbgkR1afTGoREJ7clVn0X`)
- **Production**: Needs a different webhook secret for live mode
- **Different secrets for test vs live webhooks!**

### 2. Database Connection
- Production might have different database connection issues
- Check if `DATABASE_URL` is properly set in Vercel

### 3. Environment Variables in Vercel
Verify these are set in Vercel dashboard:
- `STRIPE_SECRET_KEY` (should be `sk_live_...` not `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (from live webhook, not test)
- `DATABASE_URL` (production database)
- `DATABASE_URL_NON_POOLED` (if using Neon)

## How to Fix

### Step 1: Check Vercel Logs
1. Go to Vercel dashboard
2. Find your project
3. Go to Functions tab
4. Look for `/api/webhooks/stripe` logs
5. Check error messages around the time of failed webhooks

### Step 2: Configure Live Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch to LIVE mode** (top right)
3. Go to Developers → Webhooks
4. Add endpoint: `https://coco.bazaar.it/api/webhooks/stripe`
5. Select events: `checkout.session.completed`
6. Copy the signing secret (starts with `whsec_`)

### Step 3: Update Vercel Environment
1. In Vercel dashboard → Settings → Environment Variables
2. Update/Add:
   - `STRIPE_WEBHOOK_SECRET` = [live webhook secret from step 2]
   - `STRIPE_SECRET_KEY` = `sk_live_...` (if not already)
   - Ensure `DATABASE_URL` is correct

### Step 4: Test Webhook
1. In Stripe dashboard → Webhooks
2. Click on your endpoint
3. Send test webhook
4. Check Vercel logs for results

## Code Improvements Made

1. **Global error handler** - prevents 500 errors
2. **Better logging** - shows exactly what's failing
3. **Validation** - checks for missing metadata
4. **Graceful failures** - returns 200 to keep webhook active

## Testing Checklist

- [ ] Webhook secret is from LIVE mode (not test)
- [ ] Environment variables are set in Vercel
- [ ] Database connection works in production
- [ ] Logs show successful webhook processing
- [ ] Credits are added after purchase