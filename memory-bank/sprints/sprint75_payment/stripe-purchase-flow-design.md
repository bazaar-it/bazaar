# Stripe Purchase Flow Design

## Overview
Simple prompt purchase system using Stripe Checkout with instant delivery after payment.

## User Journey

```
Profile Dropdown → Buy More Button → Package Selection → Stripe Checkout → Success Page → Prompts Added
```

### Step-by-Step Flow

1. **User clicks "Buy More" in profile dropdown**
2. **Package selection modal/page opens** 
3. **User selects package and clicks "Buy Now"**
4. **Redirected to Stripe Checkout**
5. **Payment processed by Stripe**
6. **Webhook delivers prompts instantly**
7. **User redirected back with success message**

## Technical Architecture

### 1. Database Setup (Already Exists!)

```typescript
// creditPackages table (schema.ts lines 881-900)
{
  id: string,
  name: "Starter Pack",
  promptCount: 50,
  price: 500, // $5.00 in cents
  stripeProductId: "prod_...",
  stripePriceId: "price_...",
  isActive: true
}

// userCredits table (schema.ts lines 845-857)  
{
  userId: string,
  purchasedCredits: 0, // This gets incremented
  dailyCredits: 20,    // Unchanged
  // ... other fields
}
```

### 2. API Routes Needed

#### A. Package Selection API
```typescript
// /api/trpc/payment.getPackages
export const paymentRouter = createTRPCRouter({
  getPackages: publicProcedure
    .query(async () => {
      return db.select().from(creditPackages).where(eq(creditPackages.isActive, true));
    }),
});
```

#### B. Checkout Creation API
```typescript
// /api/trpc/payment.createCheckout
createCheckout: protectedProcedure
  .input(z.object({ packageId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const pkg = await getPackage(input.packageId);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price: pkg.stripePriceId,
        quantity: 1,
      }],
      metadata: {
        userId: ctx.session.user.id,
        packageId: input.packageId,
        promptCount: pkg.promptCount.toString(),
      },
      success_url: `${process.env.NEXTAUTH_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/purchase/cancelled`,
    });
    
    return { checkoutUrl: session.url };
  }),
```

#### C. Webhook Handler
```typescript
// /api/webhooks/stripe
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract metadata
    const { userId, promptCount } = session.metadata;
    
    // Add prompts to user's account
    await db.update(userCredits)
      .set({
        purchasedCredits: sql`purchased_credits + ${parseInt(promptCount)}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));
    
    // Log transaction
    await db.insert(creditTransactions).values({
      userId,
      type: 'purchase',
      amount: parseInt(promptCount),
      stripeSessionId: session.id,
      description: `Purchased ${promptCount} prompts`,
    });
  }

  return new Response('OK', { status: 200 });
}
```

### 3. UI Components

#### A. Purchase Modal/Page
```typescript
// /src/components/purchase/PurchaseModal.tsx
export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const { data: packages } = trpc.payment.getPackages.useQuery();
  const createCheckout = trpc.payment.createCheckout.useMutation();

  const handlePurchase = async (packageId: string) => {
    const { checkoutUrl } = await createCheckout.mutateAsync({ packageId });
    window.location.href = checkoutUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy More Prompts</DialogTitle>
          <DialogDescription>
            Choose a package to get more prompts for your projects
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4">
          {packages?.map((pkg) => (
            <div key={pkg.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pkg.promptCount} prompts
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    ${(pkg.price / 100).toFixed(2)}
                  </div>
                  <Button 
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={createCheckout.isPending}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### B. Success Page  
```typescript
// /src/app/purchase/success/page.tsx
export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  return (
    <div className="container mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold text-green-600 mb-4">
        🎉 Purchase Successful!
      </h1>
      <p className="text-lg mb-4">
        Your prompts have been added to your account.
      </p>
      <Button asChild>
        <Link href="/projects">Continue Creating</Link>
      </Button>
    </div>
  );
}
```

### 4. Stripe Setup Steps

#### A. Create Products in Stripe Dashboard
```bash
# Or via API
stripe products create --name="Starter Pack" --description="50 prompts for $5"
stripe prices create --product=prod_xxx --unit-amount=500 --currency=usd
```

#### B. Webhook Configuration
```
Endpoint URL: https://yourdomain.com/api/webhooks/stripe
Events: checkout.session.completed
```

#### C. Environment Variables
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Package Pricing Strategy

### Recommended Packages
```typescript
const packages = [
  {
    name: "Starter Pack",
    promptCount: 50,
    price: 500, // $5.00
    description: "Perfect for trying out premium features",
    popular: false
  },
  {
    name: "Popular Pack", 
    promptCount: 100,
    price: 1000, // $10.00
    description: "Most popular choice",
    popular: true // Add "Popular" badge
  },
  {
    name: "Power Pack",
    promptCount: 250, 
    price: 2000, // $20.00 (20% discount)
    description: "Best value for heavy users",
    popular: false
  },
  {
    name: "Pro Bundle",
    promptCount: 500,
    price: 3500, // $35.00 (30% discount) 
    description: "Maximum savings",
    popular: false
  }
];
```

### Value Messaging
- **Per-prompt cost decreases with larger packages**
- **"Never expire" - prompts roll over indefinitely**
- **"Instant delivery" - available immediately after payment**

## Implementation Timeline

### Day 1: Basic Structure
1. Create payment router with getPackages endpoint
2. Set up Stripe products and prices  
3. Create basic purchase modal UI

### Day 2: Checkout Flow
1. Implement createCheckout mutation
2. Connect purchase modal to Stripe checkout
3. Create success/cancel pages

### Day 3: Webhook & Delivery
1. Build webhook handler for payment completion
2. Test prompt delivery to user accounts
3. Add transaction logging

### Day 4: Polish & Testing
1. Add loading states and error handling
2. Test entire flow end-to-end
3. Set up production webhook

## Security Considerations

### Webhook Verification
- ✅ Verify webhook signature from Stripe
- ✅ Use webhook secret from environment
- ✅ Log all webhook events for debugging

### Idempotency
- ✅ Check if session already processed
- ✅ Prevent duplicate prompt grants
- ✅ Use database transactions

### User Validation
- ✅ Verify user exists before granting prompts
- ✅ Authenticate all purchase endpoints
- ✅ Log all transactions with user IDs

## Testing Strategy

### Test Scenarios
1. **Successful purchase flow**
2. **Payment failure handling**
3. **Webhook delivery verification**
4. **User already has prompts**
5. **Invalid package selection**

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
```

## Monitoring & Analytics

### Key Metrics to Track
1. **Conversion rate** (dropdown click → purchase)
2. **Package popularity** (which packages sell most)
3. **Revenue per user**
4. **Failed payment rate**
5. **Webhook delivery success rate**

### Error Monitoring
- Failed webhook deliveries
- Stripe API errors
- Database transaction failures
- User experience issues

This design provides a complete, production-ready Stripe integration that's simple to implement and scale.