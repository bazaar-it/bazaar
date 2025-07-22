# Stripe Integration: Critical DOs and DON'Ts

## The "Split Brain" Problem Explained

The split brain problem occurs when your application and Stripe have different views of a customer's subscription state. This happens because:
- Stripe has 258+ different webhook event types
- Events can arrive out of order
- Network failures can cause missed webhooks
- Race conditions during checkout

## ✅ Critical DOs

### 1. Create Customer Before Checkout
```typescript
// DO: Create customer immediately after user signup
const createStripeCustomer = async (user) => {
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { 
      userId: user.id  // CRITICAL: Always add user ID to metadata
    }
  });
  
  // Store in your database
  await db.users.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id }
  });
  
  return customer;
};
```

### 2. Implement Single Sync Function
```typescript
// DO: Create one function that syncs all Stripe data
const syncStripeDataToDatabase = async (customerId: string) => {
  // Fetch latest subscription from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'active'
  });
  
  const subscription = subscriptions.data[0];
  
  // Update your database with single source of truth
  if (subscription) {
    await db.subscriptions.upsert({
      where: { stripeCustomerId: customerId },
      create: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId: subscription.items.data[0].price.id
      },
      update: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId: subscription.items.data[0].price.id
      }
    });
  } else {
    // Handle no active subscription
    await db.subscriptions.delete({
      where: { stripeCustomerId: customerId }
    });
  }
};
```

### 3. Webhook Handler Pattern
```typescript
// DO: Handle only specific events you care about
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed'
] as const;

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // DO: Always verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      sig,
      webhookSecret
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  // DO: Only process known events
  if (!WEBHOOK_EVENTS.includes(event.type as any)) {
    return new Response('Event type not handled', { status: 200 });
  }
  
  // DO: Always sync after important events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await syncStripeDataToDatabase(session.customer);
      break;
      
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await syncStripeDataToDatabase(subscription.customer);
      break;
  }
  
  return new Response('Webhook processed', { status: 200 });
}
```

### 4. Checkout Session Creation
```typescript
// DO: Pre-create customer and pass to checkout
const createCheckoutSession = async (userId: string, priceId: string) => {
  const user = await db.users.findUnique({
    where: { id: userId }
  });
  
  if (!user.stripeCustomerId) {
    throw new Error('Customer must be created first');
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: user.stripeCustomerId,  // DO: Always use existing customer
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/api/stripe/sync?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    subscription_data: {
      metadata: {
        userId: userId  // DO: Add metadata here too
      }
    }
  });
  
  return session;
};
```

### 5. Enable Key Stripe Settings
- ✅ Enable "Limit customers to one subscription" in Stripe Dashboard
- ✅ Use dedicated success URLs that trigger sync
- ✅ Set up proper webhook endpoints for each environment

## ❌ Critical DON'Ts

### 1. Don't Create Customer During Checkout
```typescript
// DON'T: Create customer in checkout session
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,  // ❌ This creates a new customer
  // ...
});
```

### 2. Don't Trust Webhooks as Single Source
```typescript
// DON'T: Update state only from webhooks
webhook.on('subscription.updated', (event) => {
  // ❌ Don't just update from webhook data
  updateSubscriptionFromWebhook(event.data);
});

// DO: Use webhooks to trigger sync
webhook.on('subscription.updated', (event) => {
  // ✅ Fetch fresh data from Stripe
  await syncStripeDataToDatabase(event.data.customer);
});
```

### 3. Don't Handle All Event Types
```typescript
// DON'T: Try to handle everything
switch (event.type) {
  case 'account.updated':
  case 'account.application.authorized':
  case 'account.application.deauthorized':
  // ... 250+ more cases ❌
}
```

### 4. Don't Allow Multiple Subscriptions
```typescript
// DON'T: Let users create multiple subscriptions
const checkoutSession = await stripe.checkout.sessions.create({
  // Missing subscription limits ❌
  mode: 'subscription',
  // ...
});
```

### 5. Don't Use Cash App Pay
```typescript
// DON'T: Include Cash App Pay
payment_method_types: ['card', 'cashapp']  // ❌ High fraud rate
```

## Implementation Checklist

### Initial Setup
- [ ] Create Stripe customer on user signup
- [ ] Store stripeCustomerId in users table
- [ ] Add userId to customer metadata

### Checkout Flow
- [ ] Always use pre-existing customer ID
- [ ] Set success URL that triggers sync
- [ ] Enable "one subscription" limit

### Webhook Setup
- [ ] Verify signatures on all webhooks
- [ ] Handle only necessary event types
- [ ] Use webhooks to trigger sync, not as truth

### Data Management
- [ ] Implement single syncStripeDataToDatabase function
- [ ] Call sync after checkout completion
- [ ] Call sync on all subscription changes
- [ ] Store subscription data in your database

### Security
- [ ] Use environment-specific webhook secrets
- [ ] Validate all customer IDs match expected users
- [ ] Log all webhook events for debugging

## Common Pitfalls to Avoid

1. **Race Condition at Checkout**
   - Problem: User clicks checkout multiple times
   - Solution: Limit to one subscription + disable button after click

2. **Missed Webhooks**
   - Problem: Network failure causes missed events
   - Solution: Sync function fetches fresh data from Stripe

3. **Out-of-Order Events**
   - Problem: subscription.updated arrives before subscription.created
   - Solution: Sync function doesn't rely on event order

4. **Stale Data**
   - Problem: Cached subscription data is outdated
   - Solution: Always fetch fresh from Stripe in sync function

5. **Customer Duplication**
   - Problem: Multiple Stripe customers for one user
   - Solution: Create customer immediately after signup

## Testing Strategy

1. **Test Checkout Flow**
   - Verify customer already exists
   - Confirm subscription limits work
   - Check success URL triggers sync

2. **Test Webhook Handling**
   - Use Stripe CLI to send test events
   - Verify signature validation
   - Confirm sync is triggered

3. **Test Edge Cases**
   - User with no subscription
   - Cancelled subscription
   - Failed payments
   - Multiple checkout attempts

## Summary

The key insight from t3dotgg is: **Don't trust distributed state**. Instead:
1. Create a single source of truth (your database)
2. Use one sync function to update it
3. Trigger sync from multiple points (checkout, webhooks)
4. Never rely on webhooks alone for state

This approach eliminates the "split brain" problem and creates a robust, maintainable payment system.