# Daily Free Credits System

## Overview
Give all users daily free credits to encourage regular usage and reduce friction. Users can purchase additional credits when they need more.

## Free Daily Credits

### Daily Allowance
- **Free users**: 150 credits/day
- **Resets**: Every 24 hours at midnight UTC (or user's timezone)
- **No accumulation**: Use it or lose it (prevents hoarding)

### What 150 Credits Gets You
- 15 simple AI prompts (10 credits each)
- OR 7-8 complex AI generations (20 credits each)
- OR 2-3 short videos (30s at 1080p = 60 credits each)
- OR 1 longer video (60s at 1080p = 120 credits)

## Simplified Credit Costs

### AI Generation
```
Simple prompt (text only): 10 credits
Complex prompt (with editing): 20 credits
Image-based generation: 30 credits
```

### Video Export
```
Per 10 seconds of video:
- 720p:  10 credits
- 1080p: 20 credits  
- 4K:    50 credits

Examples:
- 30s at 1080p = 60 credits
- 60s at 1080p = 120 credits
- 30s at 4K = 150 credits
```

## Implementation Strategy

### Database Updates
```sql
-- Add to user_credits table
daily_free_credits INT DEFAULT 150,
daily_credits_reset_at TIMESTAMP,
daily_credits_used INT DEFAULT 0,

-- Track daily vs purchased credits separately
CREATE TABLE credit_balances (
  userId VARCHAR(255) PRIMARY KEY,
  daily_credits INT DEFAULT 150,
  purchased_credits INT DEFAULT 0,
  daily_reset_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Credit Usage Logic
```typescript
// Always use daily credits first
async function useCredits(userId: string, amount: number) {
  const balance = await getBalance(userId);
  
  // Check if daily reset needed
  if (shouldResetDaily(balance.daily_reset_at)) {
    await resetDailyCredits(userId);
    balance.daily_credits = 150;
  }
  
  // Use daily credits first
  let remainingToDeduct = amount;
  if (balance.daily_credits > 0) {
    const dailyDeduction = Math.min(balance.daily_credits, remainingToDeduct);
    balance.daily_credits -= dailyDeduction;
    remainingToDeduct -= dailyDeduction;
  }
  
  // Then use purchased credits
  if (remainingToDeduct > 0) {
    if (balance.purchased_credits < remainingToDeduct) {
      throw new Error('Insufficient credits');
    }
    balance.purchased_credits -= remainingToDeduct;
  }
  
  await updateBalance(userId, balance);
}
```

## Stripe Customer Strategy

### When to Create Stripe Customers
- **NOT on signup** - Only when they make first purchase
- **Lazy creation** - Create customer during first checkout
- **Store relationship** - Save stripeCustomerId after creation

### Benefits
- Reduces Stripe customer count (only paying users)
- Simplifies onboarding (no Stripe dependency)
- Better metrics (can track conversion rate)

## User Experience

### Credit Display
```tsx
<div className="flex items-center gap-4">
  <div>
    <span className="text-sm text-gray-500">Daily</span>
    <span className="font-medium">{dailyCredits}/150</span>
  </div>
  {purchasedCredits > 0 && (
    <div>
      <span className="text-sm text-gray-500">Purchased</span>
      <span className="font-medium">{purchasedCredits}</span>
    </div>
  )}
  <Button size="sm" variant="outline" onClick={openPurchase}>
    Buy Credits
  </Button>
</div>
```

### Clear Pricing Communication
```
Before each action, show cost:
"Generate scene: 10 credits"
"Export 30s video (1080p): 60 credits"
"You have 150 daily + 500 purchased credits"
```

## Purchase Options (Simplified)

### Credit Packages
```
Popular: $20 → 2,000 credits
Best Value: $50 → 6,000 credits (20% bonus)
Pro Pack: $100 → 15,000 credits (50% bonus)
```

### Use Cases
- Casual user: Daily credits are enough
- Regular creator: Buys $20 pack monthly
- Power user: Buys $100 pack for bulk discount

## Analytics to Track

```typescript
interface CreditMetrics {
  dailyActiveUsers: number;
  averageDailyCreditsUsed: number;
  percentageUsingAllDaily: number;
  conversionToPaid: number;
  averagePurchaseSize: number;
  creditsPerVideo: number;
  creditsPerGeneration: number;
}
```

## Migration Path

### Phase 1: Daily Credits Only
1. Launch with 150 daily credits for everyone
2. Track usage patterns
3. No purchase option yet

### Phase 2: Add Purchases
1. After 2-4 weeks, add purchase option
2. Users who hit limits can buy more
3. Track conversion rate

### Phase 3: Optimize
1. Adjust daily amount based on usage
2. Test different package sizes
3. Add special promotions

## FAQ for Users

**Q: Do daily credits roll over?**
A: No, daily credits reset every 24 hours. Use them or lose them!

**Q: What happens if I run out?**
A: You can wait for tomorrow's credits or purchase a credit pack.

**Q: How much does everything cost?**
A: Simple generation = 10 credits, 30s video = 60 credits

**Q: When do daily credits reset?**
A: Every day at midnight (your local time)

## Implementation Checklist

1. [ ] Add daily credit fields to database
2. [ ] Create credit reset cron job
3. [ ] Update CreditService with daily logic
4. [ ] Show daily vs purchased credits in UI
5. [ ] Add cost preview to all actions
6. [ ] Create simple pricing page
7. [ ] Track usage analytics
8. [ ] Only create Stripe customer on first purchase