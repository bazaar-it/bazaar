# Apple Pay Integration Guide for Bazaar-Vid

## Overview
This guide details the implementation of Apple Pay for our credit-based payment system, allowing users to purchase credits seamlessly using Apple Pay on supported devices.

## Why Apple Pay for Credit Purchases?

### Benefits
1. **Frictionless Checkout**: One-touch payments reduce cart abandonment
2. **Security**: Biometric authentication and tokenized payments
3. **Trust**: Users trust Apple Pay with their payment information
4. **Mobile Optimization**: Perfect for mobile users (40%+ of our traffic)
5. **Higher Conversion**: Apple Pay users convert 2-3x better than traditional checkout

### Perfect for Credits Model
- One-time purchases align with Apple Pay's strength
- No subscription complexity
- Instant gratification for credit top-ups
- Works great with bulk purchase incentives

## Technical Architecture

### Prerequisites
1. **Stripe Account**: Apple Pay is integrated through Stripe
2. **Domain Verification**: Verify your domain with Apple
3. **HTTPS Required**: Apple Pay only works on secure connections
4. **Apple Developer Account**: For domain verification

### Integration Flow
```
User clicks "Buy Credits" → Show Apple Pay button → 
Apple Pay sheet → Stripe processes → Credits added instantly
```

## Implementation Steps

### 1. Domain Verification Setup

#### Step 1: Generate Domain Association File
```bash
# Stripe will provide this file after initiating domain verification
# Download apple-developer-merchantid-domain-association file
```

#### Step 2: Host Verification File
```typescript
// app/.well-known/apple-developer-merchantid-domain-association/route.ts
export async function GET() {
  return new Response(
    `<paste domain association file content here>`,
    {
      headers: {
        'Content-Type': 'text/plain',
      },
    }
  );
}
```

#### Step 3: Verify in Stripe Dashboard
1. Go to Stripe Dashboard → Settings → Payment Methods → Apple Pay
2. Add your domain (e.g., bazaarvid.com)
3. Click "Verify" - Stripe will check for the association file
4. Verification should complete within minutes

### 2. Frontend Implementation

#### Apple Pay Detection
```typescript
// hooks/use-apple-pay.ts
import { loadStripe } from '@stripe/stripe-js';

export const useApplePay = () => {
  const [canMakePayment, setCanMakePayment] = useState(false);
  
  useEffect(() => {
    const checkApplePay = async () => {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
      if (!stripe) return;
      
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Bazaar-Vid Credits',
          amount: 1500, // $15.00 minimum
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      
      const canMake = await pr.canMakePayment();
      setCanMakePayment(!!canMake?.applePay);
    };
    
    checkApplePay();
  }, []);
  
  return { canMakePayment };
};
```

#### Credit Package Selection Component
```tsx
// components/payment/CreditPackageSelector.tsx
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings?: string;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 1500, price: 1500 },
  { id: 'popular', name: 'Popular', credits: 5500, price: 5000, savings: '10%', popular: true },
  { id: 'pro', name: 'Pro', credits: 12000, price: 10000, savings: '20%' },
  { id: 'enterprise', name: 'Enterprise', credits: 32500, price: 25000, savings: '30%' },
];

export const CreditPackageSelector = ({ onSelect }: { onSelect: (pkg: CreditPackage) => void }) => {
  const [selected, setSelected] = useState<string>('popular');
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CREDIT_PACKAGES.map((pkg) => (
        <button
          key={pkg.id}
          onClick={() => {
            setSelected(pkg.id);
            onSelect(pkg);
          }}
          className={cn(
            "relative p-4 rounded-lg border-2 transition-all",
            selected === pkg.id 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          {pkg.popular && (
            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Most Popular
            </span>
          )}
          <div className="text-2xl font-bold">{pkg.credits.toLocaleString()}</div>
          <div className="text-sm text-gray-600">credits</div>
          <div className="mt-2 text-lg font-semibold">${(pkg.price / 100).toFixed(2)}</div>
          {pkg.savings && (
            <div className="text-sm text-green-600">Save {pkg.savings}</div>
          )}
        </button>
      ))}
    </div>
  );
};
```

#### Apple Pay Button Component
```tsx
// components/payment/ApplePayButton.tsx
import { PaymentRequest } from '@stripe/stripe-js';

interface ApplePayButtonProps {
  amount: number;
  credits: number;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: Error) => void;
}

export const ApplePayButton = ({ amount, credits, onSuccess, onError }: ApplePayButtonProps) => {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  
  useEffect(() => {
    const initializePaymentRequest = async () => {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
      if (!stripe) return;
      
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: `${credits.toLocaleString()} Bazaar-Vid Credits`,
          amount: amount,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      
      // Check if Apple Pay is available
      const canMakePayment = await pr.canMakePayment();
      if (!canMakePayment?.applePay) return;
      
      // Handle successful payment
      pr.on('paymentmethod', async (ev) => {
        onSuccess(ev.paymentMethod.id);
        ev.complete('success');
      });
      
      setPaymentRequest(pr);
    };
    
    initializePaymentRequest();
  }, [amount, credits]);
  
  if (!paymentRequest) return null;
  
  return (
    <div 
      onClick={() => paymentRequest.show()}
      className="apple-pay-button apple-pay-button-black"
      style={{ '--apple-pay-button-height': '48px' } as any}
    />
  );
};
```

#### Complete Purchase Modal
```tsx
// components/payment/PurchaseCreditsModal.tsx
export const PurchaseCreditsModal = ({ isOpen, onClose }: ModalProps) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage>(CREDIT_PACKAGES[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { canMakePayment } = useApplePay();
  const { mutate: createPaymentIntent } = api.payment.createPaymentIntent.useMutation();
  
  const handleApplePaySuccess = async (paymentMethodId: string) => {
    setIsProcessing(true);
    try {
      const result = await createPaymentIntent({
        packageId: selectedPackage.id,
        paymentMethodId,
      });
      
      if (result.success) {
        toast.success(`Successfully added ${selectedPackage.credits} credits!`);
        onClose();
        // Refresh user credits
        await utils.user.getCredits.invalidate();
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRegularCheckout = async () => {
    // Fallback to Stripe Checkout for non-Apple Pay users
    const { url } = await createCheckoutSession({ packageId: selectedPackage.id });
    window.location.href = url;
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Purchase Credits</h2>
        
        <CreditPackageSelector onSelect={setSelectedPackage} />
        
        <div className="mt-6 space-y-3">
          {canMakePayment ? (
            <>
              <ApplePayButton
                amount={selectedPackage.price}
                credits={selectedPackage.credits}
                onSuccess={handleApplePaySuccess}
                onError={(error) => toast.error(error.message)}
              />
              <div className="text-center text-sm text-gray-500">or</div>
            </>
          ) : null}
          
          <button
            onClick={handleRegularCheckout}
            disabled={isProcessing}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Pay with Card
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>• Credits never expire</p>
          <p>• Use for video exports and AI generation</p>
          <p>• Instant delivery after payment</p>
        </div>
      </div>
    </Modal>
  );
};
```

### 3. Backend Implementation

#### Payment Intent Creation
```typescript
// server/api/routers/payment.ts
export const paymentRouter = createTRPCRouter({
  createPaymentIntent: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      paymentMethodId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const package = CREDIT_PACKAGES.find(p => p.id === input.packageId);
      if (!package) throw new Error('Invalid package');
      
      // Get or create Stripe customer
      let customerId = ctx.session.user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email!,
          metadata: { userId: ctx.session.user.id },
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await ctx.db.update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, ctx.session.user.id));
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: package.price,
        currency: 'usd',
        customer: customerId,
        payment_method: input.paymentMethodId,
        confirm: true,
        metadata: {
          userId: ctx.session.user.id,
          packageId: package.id,
          credits: package.credits.toString(),
        },
      });
      
      // If payment succeeded, add credits immediately
      if (paymentIntent.status === 'succeeded') {
        await creditService.addCredits(
          ctx.session.user.id,
          package.credits,
          paymentIntent.id
        );
        
        return { success: true, credits: package.credits };
      }
      
      throw new Error('Payment failed');
    }),
});
```

#### Webhook Handler (Backup)
```typescript
// app/api/stripe/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook Error', { status: 400 });
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Skip if already processed (Apple Pay is instant)
      const existing = await db.query.creditTransactions.findFirst({
        where: eq(creditTransactions.stripePaymentIntentId, paymentIntent.id),
      });
      
      if (!existing) {
        await creditService.addCredits(
          paymentIntent.metadata.userId,
          parseInt(paymentIntent.metadata.credits),
          paymentIntent.id
        );
      }
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

### 4. Styling Apple Pay Button

```css
/* app/globals.css */
.apple-pay-button {
  -webkit-appearance: -apple-pay-button;
  -apple-pay-button-type: buy;
  -apple-pay-button-style: black;
  display: block;
  width: 100%;
  height: var(--apple-pay-button-height, 48px);
  cursor: pointer;
  border-radius: 8px;
}

.apple-pay-button:hover {
  filter: brightness(0.9);
}

/* Alternative styled button if native styling fails */
.apple-pay-button-styled {
  background: #000;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.apple-pay-button-styled:hover {
  background: #333;
}
```

### 5. Testing Apple Pay

#### Development Testing
1. **Use Stripe Test Mode**: Always test with Stripe test keys
2. **Test Cards**: Apple Pay in test mode accepts any card
3. **Safari Required**: Apple Pay only works in Safari on macOS/iOS
4. **Device Testing**: Test on real devices for best results

#### Test Scenarios
```typescript
// Test different amounts and packages
const TEST_SCENARIOS = [
  { credits: 1500, amount: 1500 },    // Minimum purchase
  { credits: 5500, amount: 5000 },    // Popular package
  { credits: 12000, amount: 10000 },  // Pro package
  { credits: 32500, amount: 25000 },  // Max package
];
```

#### Debug Logging
```typescript
// Add debug logging in development
if (process.env.NODE_ENV === 'development') {
  paymentRequest.on('cancel', () => {
    console.log('Apple Pay cancelled');
  });
  
  paymentRequest.on('shippingaddresschange', (ev) => {
    console.log('Shipping address changed:', ev);
    ev.updateWith({ status: 'success' });
  });
}
```

### 6. Error Handling

```typescript
// Comprehensive error handling
const handlePaymentError = (error: any) => {
  if (error.code === 'payment_intent_authentication_failure') {
    toast.error('Authentication failed. Please try again.');
  } else if (error.code === 'payment_intent_payment_attempt_failed') {
    toast.error('Payment failed. Please check your payment method.');
  } else if (error.type === 'card_error') {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred. Please try again.');
    console.error('Payment error:', error);
  }
};
```

### 7. Analytics Integration

```typescript
// Track Apple Pay usage
const trackApplePayEvent = (event: string, data?: any) => {
  // PostHog/Analytics tracking
  posthog.capture(event, {
    payment_method: 'apple_pay',
    ...data,
  });
};

// Usage
trackApplePayEvent('apple_pay_shown');
trackApplePayEvent('apple_pay_clicked', { package: selectedPackage.id });
trackApplePayEvent('apple_pay_success', { credits: package.credits });
```

## Security Considerations

### 1. Domain Verification
- Must be completed before going live
- Re-verify if domain changes
- Keep association file accessible

### 2. Payment Processing
- Always verify payment on backend
- Use webhooks as backup
- Never trust client-side data

### 3. Rate Limiting
```typescript
// Prevent abuse
const rateLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000, // 1 second between requests
});

const createPaymentWithLimit = rateLimiter.wrap(createPaymentIntent);
```

## Best Practices

### 1. UI/UX Guidelines
- Show Apple Pay button prominently when available
- Provide clear fallback options
- Display credit amounts clearly
- Show savings on bulk purchases

### 2. Mobile Optimization
- Large touch targets (min 44px height)
- Clear visual feedback
- Smooth animations
- Fast loading times

### 3. Conversion Optimization
- Pre-select popular package
- Show "Most Popular" badge
- Display savings percentage
- Add urgency with limited-time bonuses

## Troubleshooting

### Common Issues

#### 1. Apple Pay Button Not Showing
```typescript
// Debug checklist
const debugApplePay = async () => {
  console.log('HTTPS:', window.location.protocol === 'https:');
  console.log('Safari:', /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  console.log('Domain verified:', await checkDomainVerification());
  console.log('Payment Request support:', 'PaymentRequest' in window);
};
```

#### 2. Domain Verification Failing
- Check file is accessible at `/.well-known/apple-developer-merchantid-domain-association`
- Ensure no redirects on the file
- File must be served as `text/plain`
- No authentication required on the file

#### 3. Payment Failing
- Check Stripe webhook logs
- Verify customer creation
- Check payment method compatibility
- Review Stripe radar rules

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Create Stripe products for credit packages
- [ ] Set up domain verification file
- [ ] Configure webhook endpoint
- [ ] Add Apple Pay to Stripe settings

### Phase 2: Frontend (Day 2-3)
- [ ] Implement Apple Pay detection
- [ ] Create package selection UI
- [ ] Add Apple Pay button component
- [ ] Implement purchase modal
- [ ] Add fallback to Stripe Checkout

### Phase 3: Backend (Day 4-5)
- [ ] Create payment intent endpoint
- [ ] Implement webhook handler
- [ ] Add credit management service
- [ ] Set up error handling
- [ ] Add analytics tracking

### Phase 4: Testing (Day 6-7)
- [ ] Test on real devices
- [ ] Verify all package amounts
- [ ] Test error scenarios
- [ ] Check webhook reliability
- [ ] Verify credit delivery

### Phase 5: Launch (Day 8)
- [ ] Enable in production Stripe
- [ ] Verify production domain
- [ ] Monitor first transactions
- [ ] Check analytics data
- [ ] Gather user feedback

## Monitoring & Analytics

### Key Metrics
```typescript
interface ApplePayMetrics {
  buttonImpressions: number;        // How often button shown
  buttonClicks: number;             // Click-through rate
  sheetCompletions: number;         // Completion rate
  successfulPayments: number;       // Success rate
  averagePackageValue: number;      // Revenue metrics
  conversionRate: number;           // Overall conversion
}
```

### Monitoring Setup
```typescript
// Real-time monitoring
const monitorApplePay = async () => {
  const metrics = await getApplePayMetrics();
  
  // Alert if conversion drops
  if (metrics.conversionRate < 0.5) {
    await sendAlert('Apple Pay conversion rate low', metrics);
  }
  
  // Track in dashboard
  await updateDashboard('apple_pay_metrics', metrics);
};
```

## Conclusion

Apple Pay integration provides a frictionless payment experience perfect for our credit-based model. The one-touch purchase flow reduces friction and increases conversions, especially on mobile devices where typing card details is cumbersome.

Key benefits:
- 2-3x higher conversion than traditional checkout
- Enhanced security with biometric authentication
- Instant credit delivery
- Better mobile experience
- Increased customer trust

With proper implementation and testing, Apple Pay will significantly improve the credit purchase experience and drive revenue growth.