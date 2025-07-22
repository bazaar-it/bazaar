# Simple Prompt Purchase System

## Overview
Keep current system simple and user-friendly:
- 20 free prompts daily (existing)
- Unlimited exports & projects 
- Buy additional prompts when needed
- Clear usage display in profile dropdown

## User Experience Design

### Profile Dropdown Display
```
┌─────────────────────────────────┐
│ My Account                      │
├─────────────────────────────────┤
│ Lysaker                         │
│ markushogne@gmail.com          │
│                                 │
│ 📝 Prompts: 18/20 free daily   │
│ 💎 +350 purchased              │ (if any)
│                                 │
│ 🛒 Buy More Prompts            │ (if < 5 daily left)
│                                 │
│ 🚪 Log out                      │
└─────────────────────────────────┘
```

### UI States
1. **Has daily prompts**: "18/20 free daily"
2. **Has purchased**: "18/20 free daily + 350 purchased" 
3. **Out of daily**: "0/20 free daily + 350 purchased"
4. **Completely out**: "0/20 free daily" + "Buy More" button
5. **Running low**: Show "Buy More" when < 5 daily left

## Database Schema (Already Exists!)

Current tables work perfectly:
```typescript
// userCredits table (lines 843-865 in schema.ts)
dailyCredits: 20,           // Free daily prompts  
purchasedCredits: 0,        // Purchased prompts
dailyResetAt: timestamp,    // Reset time

// creditPackages table (lines 881-900)
name: "Extra Prompts",
promptCount: 100,
price: 1000, // $10.00
stripeProductId: string
```

## Prompt Packages

### Simple Pricing
```
🎯 Starter Pack:   50 prompts  = $5
🔥 Popular:       100 prompts  = $10  (same $/prompt)
⚡ Power Pack:    250 prompts  = $20  (20% discount)
🚀 Pro Bundle:    500 prompts  = $35  (30% discount)
```

### Value Messaging
- "Never run out of ideas!"
- "50 prompts = ~2.5 days of heavy usage"
- "Prompts never expire"

## Implementation Plan

### Phase 1: UI Updates (Day 1)
1. ✅ Update profile dropdown component
2. ✅ Add prompt usage display 
3. ✅ Add "Buy More" button when needed
4. ✅ Connect to existing UsageService

### Phase 2: Purchase Flow (Day 2-3)
1. Create prompt package selection page
2. Integrate with Stripe Checkout
3. Handle webhook for prompt delivery
4. Update credit balance after purchase

### Phase 3: Polish (Day 4)
1. Add purchase confirmation
2. Email receipts
3. Usage analytics
4. Test edge cases

## Technical Changes Needed

### 1. Update UserCredits Logic
Change from "credits" to "prompts" terminology:
```typescript
// In UsageService
checkPromptUsage() {
  // Check dailyCredits + purchasedCredits >= 1
}

incrementPromptUsage() {
  // Deduct from dailyCredits first, then purchasedCredits
}
```

### 2. Profile Dropdown Component
```typescript
// Add to existing dropdown
const { data: promptUsage } = trpc.usage.getPromptUsage.useQuery();

<div className="px-4 py-2 border-b">
  <div className="text-sm text-gray-600">
    📝 Prompts: {promptUsage.used}/{promptUsage.dailyLimit} free daily
  </div>
  {promptUsage.purchased > 0 && (
    <div className="text-sm text-blue-600">
      💎 +{promptUsage.purchased} purchased
    </div>
  )}
  {promptUsage.total < 5 && (
    <Button size="sm" className="mt-2">
      🛒 Buy More Prompts
    </Button>
  )}
</div>
```

### 3. Stripe Integration
```typescript
// Update creditPackages to be promptPackages
const packages = [
  { name: "Starter Pack", prompts: 50, price: 500 },
  { name: "Popular", prompts: 100, price: 1000 },
  { name: "Power Pack", prompts: 250, price: 2000 },
  { name: "Pro Bundle", prompts: 500, price: 3500 }
];
```

## Benefits of This Approach

### User Benefits
- ✅ Clear, simple pricing
- ✅ No recurring subscriptions
- ✅ Prompts never expire
- ✅ Unlimited everything else

### Business Benefits  
- ✅ Leverages existing infrastructure
- ✅ Low complexity implementation
- ✅ Easy to test and iterate
- ✅ Clear conversion funnel

### Technical Benefits
- ✅ Reuses current usage tracking
- ✅ Minimal code changes needed  
- ✅ Database schema already exists
- ✅ Can launch in 4 days

## Success Metrics

Track these after launch:
- Daily active users hitting limit
- Conversion rate to first purchase
- Average purchase size
- Repeat purchase rate
- User retention after purchase

## Next Steps

1. Update profile dropdown UI
2. Create prompt purchase page  
3. Set up Stripe products
4. Test purchase flow
5. Launch to existing users

## Migration from Current System

Current: 20 daily prompts via `usageLimits`
New: 20 daily prompts via `userCredits.dailyCredits`

Migration script:
```sql
-- Set all users to have 20 daily prompts
UPDATE user_credits 
SET daily_credits = 20, 
    daily_reset_at = NOW() + INTERVAL '1 day'
WHERE daily_credits IS NULL;
```

This keeps everything exactly the same for users while enabling prompt purchases.