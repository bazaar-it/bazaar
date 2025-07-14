# Credit-Based Pricing Strategy

## Overview
Instead of monthly subscriptions, users purchase credits that they can use at their own pace. This pay-as-you-go model is more flexible and user-friendly.

## Credit System Design

### Pricing Structure
**Minimum Purchase**: $15
**Bulk Discounts**:
- $15 → 1,500 credits (base rate)
- $50 → 5,500 credits (10% bonus)
- $100 → 12,000 credits (20% bonus)
- $250 → 32,500 credits (30% bonus)

### Credit Usage Rates

#### Video Export Credits
Based on resolution and duration:
```
720p:  10 credits per 10 seconds
1080p: 20 credits per 10 seconds
4K:    50 credits per 10 seconds

Examples:
- 30-second 1080p video = 60 credits
- 60-second 1080p video = 120 credits
- 60-second 4K video = 300 credits
```

#### AI Generation Credits
```
Simple generation: 5 credits
Complex generation: 10 credits
Image-based generation: 15 credits
```

### Cost Analysis & Margins

#### Our Costs (Approximate)
```
OpenAI GPT-4o-mini:
- ~$0.002 per generation

AWS Lambda Rendering:
- 720p 30s: ~$0.08
- 1080p 30s: ~$0.15
- 4K 30s: ~$0.40

Total cost for 1080p 30s video:
- AI Generation: $0.002
- Rendering: $0.15
- Storage/Bandwidth: ~$0.05
- Total: ~$0.20
```

#### Pricing with Margin
```
User pays: 60 credits = $0.60 (at base rate)
Our cost: ~$0.20
Margin: 66% (~3x markup)
```

## Implementation Architecture

### Database Schema
```sql
-- Simplified schema for credits
user_credits (
  id
  userId (FK to users)
  balance (current credit balance)
  lifetimeCredits (total purchased)
  updatedAt
)

credit_transactions (
  id
  userId (FK to users)
  type (purchase, usage, refund, bonus)
  amount (positive for additions, negative for usage)
  description
  metadata (JSON - what it was used for)
  stripePaymentIntentId (for purchases)
  createdAt
)

credit_packages (
  id
  name
  credits
  price (in cents)
  bonusPercentage
  active
  popular (boolean for UI)
)
```

### Stripe Integration (Simplified)

#### One-Time Payments Only
```typescript
// No subscriptions, just payment intents
const createCreditPurchase = async (userId: string, packageId: string) => {
  const package = await getCreditPackage(packageId);
  const user = await getUser(userId);
  
  // Create or retrieve Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId }
    });
    customerId = customer.id;
    await updateUser(userId, { stripeCustomerId: customerId });
  }
  
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: package.price,
    currency: 'usd',
    customer: customerId,
    metadata: {
      userId,
      packageId,
      credits: package.credits
    }
  });
  
  return paymentIntent;
};
```

#### Webhook Handler (Simple)
```typescript
// Only need to handle successful payments
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await addCreditsToUser(
        paymentIntent.metadata.userId,
        parseInt(paymentIntent.metadata.credits),
        paymentIntent.id
      );
      break;
  }
}
```

### Credit Management Service
```typescript
class CreditService {
  // Check if user has enough credits
  async checkCredits(userId: string, required: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= required;
  }
  
  // Deduct credits for usage
  async useCredits(userId: string, amount: number, description: string, metadata?: any) {
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient credits');
    }
    
    await db.transaction(async (tx) => {
      // Add transaction record
      await tx.insert(creditTransactions).values({
        userId,
        type: 'usage',
        amount: -amount,
        description,
        metadata
      });
      
      // Update balance
      await tx.update(userCredits)
        .set({ 
          balance: sql`balance - ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(userCredits.userId, userId));
    });
  }
  
  // Add credits (after purchase)
  async addCredits(userId: string, amount: number, paymentIntentId: string) {
    await db.transaction(async (tx) => {
      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        type: 'purchase',
        amount: amount,
        description: `Purchased ${amount} credits`,
        stripePaymentIntentId: paymentIntentId
      });
      
      // Update balance
      await tx.insert(userCredits)
        .values({
          userId,
          balance: amount,
          lifetimeCredits: amount
        })
        .onConflictDoUpdate({
          target: userCredits.userId,
          set: {
            balance: sql`user_credits.balance + ${amount}`,
            lifetimeCredits: sql`user_credits.lifetime_credits + ${amount}`,
            updatedAt: new Date()
          }
        });
    });
  }
}
```

### Usage Calculation
```typescript
// Calculate credits needed for video export
const calculateExportCredits = (duration: number, resolution: string): number => {
  const ratesPerTenSeconds = {
    '720p': 10,
    '1080p': 20,
    '4k': 50
  };
  
  const rate = ratesPerTenSeconds[resolution] || 20;
  const chunks = Math.ceil(duration / 10);
  return chunks * rate;
};

// Pre-check before expensive operations
const preCheckCredits = async (userId: string, scenes: Scene[]) => {
  const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);
  const creditsNeeded = calculateExportCredits(totalDuration, '1080p');
  
  const hasCredits = await creditService.checkCredits(userId, creditsNeeded);
  if (!hasCredits) {
    const balance = await creditService.getBalance(userId);
    throw new Error(`Insufficient credits. Need ${creditsNeeded}, have ${balance}`);
  }
  
  return creditsNeeded;
};
```

## User Experience

### Free Credits for New Users
```typescript
// Give new users some free credits to try
const onUserSignup = async (userId: string) => {
  await creditService.addCredits(
    userId, 
    100,  // Free credits
    'welcome-bonus'
  );
};
```

### Credit Display Component
```tsx
const CreditBalance = () => {
  const { balance, isLoading } = useCredits();
  
  return (
    <div className="flex items-center gap-2">
      <Coins className="w-4 h-4" />
      <span>{balance || 0} credits</span>
      {balance < 100 && (
        <Button size="sm" variant="outline" onClick={openPurchaseModal}>
          Top up
        </Button>
      )}
    </div>
  );
};
```

### Purchase Flow
1. User clicks "Top up" or runs out of credits
2. Show credit packages with bulk discounts
3. Stripe Checkout for one-time payment
4. Credits added immediately on success
5. Show success notification with new balance

## Advantages of Credit System

### For Users
1. **No recurring charges** - Pay only when needed
2. **Better budgeting** - Know exactly what you're spending
3. **No waste** - Credits don't expire (or very long expiry)
4. **Bulk discounts** - Save money by buying more

### For Us
1. **Simpler implementation** - No subscription management
2. **Better cash flow** - Money upfront
3. **Reduced churn** - No monthly cancellations
4. **Easier pricing changes** - Adjust credit costs anytime

## Migration Strategy (From Current System)

Since we haven't launched payments yet:
1. Implement credit system from the start
2. Give beta users bonus credits
3. Track usage from day one
4. Adjust pricing based on real usage data

## Analytics to Track

```typescript
// Key metrics
interface CreditAnalytics {
  averagePurchaseSize: number;
  creditsPerVideo: number;
  topUpFrequency: number;
  creditUtilization: number;  // % of purchased credits used
  costPerUser: number;
  revenuePerUser: number;
  margin: number;
}
```

## Future Enhancements

1. **Referral Credits**: Give credits for referring friends
2. **Bulk Export Discounts**: Reduce credit cost for batch exports
3. **Credit Expiry**: Optional, maybe 1-2 year expiry
4. **Team Accounts**: Shared credit pools
5. **Credit Gifting**: Send credits to other users

## Summary

Credit-based pricing is perfect for Bazaar-Vid because:
- Users have variable usage patterns
- No subscription fatigue
- Clear value proposition
- Simple implementation
- Better for international users (no recurring payments)
- Aligns costs with usage

The key is to price credits so we maintain healthy margins while providing clear value to users.