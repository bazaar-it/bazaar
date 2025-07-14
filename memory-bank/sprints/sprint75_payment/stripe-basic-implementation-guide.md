# Stripe Basic Implementation Guide - Credit Purchase System

## Overview
This guide provides a step-by-step implementation plan for integrating Stripe's credit-based payment system into Bazaar-Vid. The system allows users to purchase credits via one-time payments, which they can use for video exports and AI generation.

## Table of Contents
1. [Database Schema](#1-database-schema)
2. [Stripe Customer Creation Flow](#2-stripe-customer-creation-flow)
3. [Payment Intent Creation](#3-payment-intent-creation)
4. [Webhook Handling](#4-webhook-handling)
5. [UI Components](#5-ui-components)
6. [Step-by-Step Implementation Plan](#6-step-by-step-implementation-plan)

## 1. Database Schema

### New Tables Required

```sql
-- Store user credit balances
CREATE TABLE "bazaar-vid_user_credits" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"(id),
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Track all credit transactions
CREATE TABLE "bazaar-vid_credit_transactions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"(id),
  type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  amount INTEGER NOT NULL, -- positive for credits added, negative for usage
  description TEXT NOT NULL,
  metadata JSONB,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Define credit packages
CREATE TABLE "bazaar-vid_credit_packages" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL,
  price INTEGER NOT NULL, -- in cents
  bonus_percentage INTEGER DEFAULT 0,
  stripe_price_id TEXT UNIQUE,
  active BOOLEAN DEFAULT true,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Track video exports for rate limiting
CREATE TABLE "bazaar-vid_export_records" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"(id),
  project_id UUID NOT NULL REFERENCES "bazaar-vid_project"(id),
  credits_used INTEGER NOT NULL,
  resolution VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_credit_transactions_user_id ON "bazaar-vid_credit_transactions"(user_id);
CREATE INDEX idx_credit_transactions_created_at ON "bazaar-vid_credit_transactions"(created_at);
CREATE INDEX idx_export_records_user_id ON "bazaar-vid_export_records"(user_id);
CREATE INDEX idx_export_records_created_at ON "bazaar-vid_export_records"(created_at);
```

### Drizzle Schema Updates

Add to `/src/server/db/schema.ts`:

```typescript
// Credit system tables
export const userCredits = createTable("user_credits", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id).unique(),
  balance: d.integer().notNull().default(0),
  lifetimeCredits: d.integer().notNull().default(0),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
}));

export const creditTransactions = createTable("credit_transactions", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
  type: d.varchar({ length: 50 }).notNull().$type<'purchase' | 'usage' | 'refund' | 'bonus'>(),
  amount: d.integer().notNull(),
  description: d.text().notNull(),
  metadata: d.jsonb().$type<Record<string, any>>(),
  stripePaymentIntentId: d.text(),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}), (t) => [
  index("credit_transactions_user_id_idx").on(t.userId),
  index("credit_transactions_created_at_idx").on(t.createdAt),
]);

export const creditPackages = createTable("credit_packages", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  name: d.varchar({ length: 255 }).notNull(),
  credits: d.integer().notNull(),
  price: d.integer().notNull(), // in cents
  bonusPercentage: d.integer().default(0),
  stripePriceId: d.text().unique(),
  active: d.boolean().default(true),
  popular: d.boolean().default(false),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}));

export const exportRecords = createTable("export_records", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
  projectId: d.uuid().notNull().references(() => projects.id),
  creditsUsed: d.integer().notNull(),
  resolution: d.varchar({ length: 50 }).notNull(),
  duration: d.integer().notNull(), // seconds
  status: d.varchar({ length: 50 }).notNull().$type<'pending' | 'completed' | 'failed'>(),
  metadata: d.jsonb().$type<Record<string, any>>(),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}), (t) => [
  index("export_records_user_id_idx").on(t.userId),
  index("export_records_created_at_idx").on(t.createdAt),
]);

// Relations
export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, { fields: [userCredits.userId], references: [users.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
}));
```

## 2. Stripe Customer Creation Flow

### Environment Variables

Add to `.env.local`:
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Customer Creation Service

Create `/src/server/services/stripe/customer.service.ts`:

```typescript
import Stripe from 'stripe';
import { db } from '~/server/db';
import { users } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export class StripeCustomerService {
  /**
   * Create or retrieve Stripe customer for a user
   */
  async ensureCustomer(userId: string): Promise<string> {
    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return existing customer ID if available
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });

    // Update user with Stripe customer ID
    await db.update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, userId));

    return customer.id;
  }

  /**
   * Sync customer data from Stripe
   */
  async syncCustomerData(customerId: string): Promise<void> {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      throw new Error('Customer has been deleted');
    }

    const userId = customer.metadata.userId;
    if (!userId) {
      throw new Error('Customer missing userId metadata');
    }

    // Update user email if changed in Stripe
    if (customer.email) {
      await db.update(users)
        .set({ email: customer.email })
        .where(eq(users.id, userId));
    }
  }
}

export const stripeCustomerService = new StripeCustomerService();
```

### Auto-create Customer on Signup

Update auth configuration to create Stripe customer:

```typescript
// In your auth configuration or user creation flow
import { stripeCustomerService } from '~/server/services/stripe/customer.service';
import { creditService } from '~/server/services/credit.service';

// After user signup
export async function onUserSignup(userId: string) {
  try {
    // Create Stripe customer
    await stripeCustomerService.ensureCustomer(userId);
    
    // Give welcome bonus credits
    await creditService.addCredits(userId, 100, 'welcome-bonus', {
      description: 'Welcome bonus - 100 free credits',
    });
  } catch (error) {
    console.error('Error in user signup flow:', error);
    // Don't throw - allow signup to continue
  }
}
```

## 3. Payment Intent Creation

### Credit Service

Create `/src/server/services/credit.service.ts`:

```typescript
import { db } from '~/server/db';
import { userCredits, creditTransactions } from '~/server/db/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export class CreditService {
  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const result = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, userId),
    });

    return result?.balance ?? 0;
  }

  /**
   * Check if user has enough credits
   */
  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Add credits to user account (purchase, bonus, refund)
   */
  async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    metadata: {
      stripePaymentIntentId?: string;
      description?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        type,
        amount,
        description: metadata.description ?? `${type} - ${amount} credits`,
        metadata,
        stripePaymentIntentId: metadata.stripePaymentIntentId,
      });

      // Update or create user credits
      await tx.insert(userCredits)
        .values({
          userId,
          balance: amount,
          lifetimeCredits: type === 'purchase' ? amount : 0,
        })
        .onConflictDoUpdate({
          target: userCredits.userId,
          set: {
            balance: sql`${userCredits.balance} + ${amount}`,
            lifetimeCredits: type === 'purchase' 
              ? sql`${userCredits.lifetimeCredits} + ${amount}`
              : undefined,
            updatedAt: new Date(),
          },
        });
    });
  }

  /**
   * Use credits for a service
   */
  async useCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const balance = await this.getBalance(userId);
    
    if (balance < amount) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${balance}`);
    }

    await db.transaction(async (tx) => {
      // Record usage transaction
      await tx.insert(creditTransactions).values({
        userId,
        type: 'usage',
        amount: -amount, // Negative for usage
        description,
        metadata,
      });

      // Update balance
      await tx.update(userCredits)
        .set({
          balance: sql`${userCredits.balance} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));
    });
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, limit = 50) {
    return await db.query.creditTransactions.findMany({
      where: eq(creditTransactions.userId, userId),
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
      limit,
    });
  }

  /**
   * Calculate credits needed for video export
   */
  calculateExportCredits(durationSeconds: number, resolution: '720p' | '1080p' | '4k'): number {
    const ratesPerTenSeconds = {
      '720p': 10,
      '1080p': 20,
      '4k': 50,
    };

    const rate = ratesPerTenSeconds[resolution];
    const chunks = Math.ceil(durationSeconds / 10);
    return chunks * rate;
  }
}

export const creditService = new CreditService();
```

### Payment Service

Create `/src/server/services/stripe/payment.service.ts`:

```typescript
import Stripe from 'stripe';
import { stripeCustomerService } from './customer.service';
import { db } from '~/server/db';
import { creditPackages } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export class StripePaymentService {
  /**
   * Create a payment intent for credit purchase
   */
  async createPaymentIntent(
    userId: string,
    packageId: string
  ): Promise<Stripe.PaymentIntent> {
    // Get credit package
    const creditPackage = await db.query.creditPackages.findFirst({
      where: eq(creditPackages.id, packageId),
    });

    if (!creditPackage || !creditPackage.active) {
      throw new Error('Invalid credit package');
    }

    // Ensure customer exists
    const customerId = await stripeCustomerService.ensureCustomer(userId);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.price,
      currency: 'usd',
      customer: customerId,
      metadata: {
        userId,
        packageId,
        credits: creditPackage.credits.toString(),
        packageName: creditPackage.name,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  }

  /**
   * Create a checkout session for credit purchase
   */
  async createCheckoutSession(
    userId: string,
    packageId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    // Get credit package
    const creditPackage = await db.query.creditPackages.findFirst({
      where: eq(creditPackages.id, packageId),
    });

    if (!creditPackage || !creditPackage.active) {
      throw new Error('Invalid credit package');
    }

    // Ensure customer exists
    const customerId = await stripeCustomerService.ensureCustomer(userId);

    // Create or use existing price
    let priceId = creditPackage.stripePriceId;
    
    if (!priceId) {
      // Create price on the fly if not exists
      const price = await stripe.prices.create({
        unit_amount: creditPackage.price,
        currency: 'usd',
        product_data: {
          name: creditPackage.name,
          description: `${creditPackage.credits} credits`,
        },
      });
      priceId = price.id;
      
      // Update package with price ID
      await db.update(creditPackages)
        .set({ stripePriceId: priceId })
        .where(eq(creditPackages.id, packageId));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        packageId,
        credits: creditPackage.credits.toString(),
      },
    });

    return session;
  }
}

export const stripePaymentService = new StripePaymentService();
```

## 4. Webhook Handling

### Webhook Handler

Create `/src/app/api/stripe/webhook/route.ts`:

```typescript
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creditService } from '~/server/services/credit.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { userId, credits, packageName } = paymentIntent.metadata;
  
  if (!userId || !credits) {
    console.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  // Add credits to user account
  await creditService.addCredits(
    userId,
    parseInt(credits),
    'purchase',
    {
      stripePaymentIntentId: paymentIntent.id,
      description: `Purchased ${packageName || credits + ' credits'}`,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    }
  );

  console.log(`Added ${credits} credits to user ${userId}`);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { userId, credits } = session.metadata || {};
  
  if (!userId || !credits) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Get payment intent to check if already processed
  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );
    
    // Check if already processed
    const existing = await creditService.getTransactionHistory(userId, 1);
    if (existing.some(t => t.stripePaymentIntentId === paymentIntent.id)) {
      console.log('Payment already processed:', paymentIntent.id);
      return;
    }
  }

  // Add credits
  await creditService.addCredits(
    userId,
    parseInt(credits),
    'purchase',
    {
      stripePaymentIntentId: session.payment_intent as string,
      description: `Purchased ${credits} credits`,
      sessionId: session.id,
    }
  );
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { userId } = paymentIntent.metadata;
  
  console.error(`Payment failed for user ${userId}:`, paymentIntent.last_payment_error);
  
  // Could send email notification here
}
```

### Webhook Configuration

1. **Local Development** (using Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret and add to .env.local
```

2. **Production Setup**:
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/stripe/webhook`
- Select events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `checkout.session.completed`
- Copy signing secret to production env vars

## 5. UI Components

### Credit Display Component

Create `/src/components/credits/CreditBalance.tsx`:

```tsx
'use client';

import { Coins, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { api } from '~/utils/api';
import { useState } from 'react';
import { CreditPurchaseModal } from './CreditPurchaseModal';

export function CreditBalance() {
  const [showPurchase, setShowPurchase] = useState(false);
  const { data: balance, isLoading } = api.credits.getBalance.useQuery();

  const lowBalance = (balance ?? 0) < 100;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {isLoading ? '...' : (balance ?? 0).toLocaleString()}
          </span>
          <span className="text-muted-foreground">credits</span>
        </div>
        
        <Button
          size="sm"
          variant={lowBalance ? 'default' : 'outline'}
          onClick={() => setShowPurchase(true)}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Top up
        </Button>
      </div>

      <CreditPurchaseModal
        open={showPurchase}
        onClose={() => setShowPurchase(false)}
      />
    </>
  );
}
```

### Credit Purchase Modal

Create `/src/components/credits/CreditPurchaseModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Loader2, Zap, TrendingUp } from 'lucide-react';
import { api } from '~/utils/api';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '~/lib/utils';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonusPercentage: number;
  popular?: boolean;
}

const packages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 1500,
    price: 1500, // $15
    bonusPercentage: 0,
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 5500,
    price: 5000, // $50
    bonusPercentage: 10,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 12000,
    price: 10000, // $100
    bonusPercentage: 20,
  },
  {
    id: 'business',
    name: 'Business',
    credits: 32500,
    price: 25000, // $250
    bonusPercentage: 30,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreditPurchaseModal({ open, onClose }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<string>('popular');
  const [isProcessing, setIsProcessing] = useState(false);

  const createCheckout = api.stripe.createCheckoutSession.useMutation({
    onSuccess: async (session) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        alert('Payment failed. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Checkout creation error:', error);
      alert('Failed to create checkout session. Please try again.');
      setIsProcessing(false);
    },
  });

  const handlePurchase = async () => {
    setIsProcessing(true);
    await createCheckout.mutateAsync({ packageId: selectedPackage });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Purchase Credits</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Selection */}
          <div className="grid grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={cn(
                  'relative cursor-pointer border-2 p-4 transition-all hover:border-primary',
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted'
                )}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 right-4" variant="default">
                    Most Popular
                  </Badge>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${(pkg.price / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground text-sm">USD</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Zap className="h-3 w-3" />
                      <span className="font-medium">
                        {pkg.credits.toLocaleString()} credits
                      </span>
                    </div>
                    
                    {pkg.bonusPercentage > 0 && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>{pkg.bonusPercentage}% bonus credits</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    ${((pkg.price / 100) / pkg.credits * 1000).toFixed(1)} per 1,000 credits
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* What You Can Do */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">What can you create?</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>• 30s video (1080p): 60 credits</div>
              <div>• 60s video (1080p): 120 credits</div>
              <div>• AI generation: 5-15 credits</div>
              <div>• 4K export: 2.5x more credits</div>
            </div>
          </div>

          {/* Purchase Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Purchase ${packages.find(p => p.id === selectedPackage)?.credits.toLocaleString()} Credits`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Credit Check Before Export

Create `/src/components/export/ExportButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { api } from '~/utils/api';
import { useVideoState } from '~/stores/videoState';
import { CreditPurchaseModal } from '~/components/credits/CreditPurchaseModal';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

interface Props {
  projectId: string;
}

export function ExportButton({ projectId }: Props) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(0);
  
  const scenes = useVideoState((state) => state.projects[projectId]?.scenes ?? []);
  const { data: balance } = api.credits.getBalance.useQuery();

  const checkCredits = api.credits.checkExportCredits.useMutation();
  const exportVideo = api.export.create.useMutation();

  const handleExportClick = async () => {
    // Calculate total duration
    const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);
    
    // Check credits needed
    const result = await checkCredits.mutateAsync({
      duration: totalDuration,
      resolution: '1080p',
    });

    if (!result.hasEnough) {
      setCreditsNeeded(result.required);
      setShowPurchase(true);
      return;
    }

    setCreditsNeeded(result.required);
    setShowConfirm(true);
  };

  const handleConfirmExport = async () => {
    setShowConfirm(false);
    
    try {
      await exportVideo.mutateAsync({
        projectId,
        resolution: '1080p',
      });
      
      // Handle success - show download when ready
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <>
      <Button
        onClick={handleExportClick}
        disabled={scenes.length === 0 || checkCredits.isPending}
        className="gap-2"
      >
        {checkCredits.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export Video
      </Button>

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        open={showPurchase}
        onClose={() => setShowPurchase(false)}
      />

      {/* Export Confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Video Export</AlertDialogTitle>
            <AlertDialogDescription>
              This export will use {creditsNeeded} credits.
              You currently have {balance ?? 0} credits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExport}>
              Export for {creditsNeeded} credits
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

## 6. Step-by-Step Implementation Plan

### Phase 1: Foundation (Days 1-2)
1. **Database Setup**
   - [ ] Create migration for new tables
   - [ ] Add Drizzle schema definitions
   - [ ] Run migrations on development database
   - [ ] Generate TypeScript types

2. **Environment Configuration**
   - [ ] Create Stripe account (test mode)
   - [ ] Add environment variables
   - [ ] Configure webhook endpoint in Stripe dashboard

3. **Basic Services**
   - [ ] Implement CreditService
   - [ ] Implement StripeCustomerService
   - [ ] Add customer creation to signup flow

### Phase 2: Payment Flow (Days 3-4)
1. **Payment Processing**
   - [ ] Implement StripePaymentService
   - [ ] Create payment intent endpoint
   - [ ] Create checkout session endpoint
   - [ ] Set up webhook handler

2. **Credit Packages**
   - [ ] Seed database with credit packages
   - [ ] Create admin interface for package management
   - [ ] Test payment flow end-to-end

### Phase 3: UI Integration (Days 5-6)
1. **Credit Display**
   - [ ] Add CreditBalance component to header
   - [ ] Create credit history page
   - [ ] Add low balance warnings

2. **Purchase Flow**
   - [ ] Implement CreditPurchaseModal
   - [ ] Add package selection UI
   - [ ] Handle success/error states
   - [ ] Add loading states

### Phase 4: Export Integration (Days 7-8)
1. **Export Checks**
   - [ ] Add credit check before export
   - [ ] Calculate credits based on duration/resolution
   - [ ] Show confirmation dialog
   - [ ] Deduct credits after successful export

2. **Error Handling**
   - [ ] Handle insufficient credits
   - [ ] Handle payment failures
   - [ ] Add retry logic for webhooks
   - [ ] Log all transactions

### Phase 5: Testing & Polish (Days 9-10)
1. **Testing**
   - [ ] Test all payment flows
   - [ ] Test webhook reliability
   - [ ] Test error scenarios
   - [ ] Load test credit deduction

2. **Polish**
   - [ ] Add analytics tracking
   - [ ] Create email receipts
   - [ ] Add credit expiry (optional)
   - [ ] Documentation

### Phase 6: Apple Pay Ready (Future)
The implementation above is already Apple Pay ready:
- Stripe Checkout automatically shows Apple Pay when available
- Payment Intents support Apple Pay via `automatic_payment_methods`
- No additional code needed - just domain verification

## Security Considerations

1. **Webhook Security**
   - Always verify webhook signatures
   - Use idempotency to prevent duplicate processing
   - Log all webhook events

2. **Credit Security**
   - Use database transactions for all credit operations
   - Never trust client-side credit calculations
   - Rate limit API endpoints

3. **Payment Security**
   - Never store credit card details
   - Use Stripe's PCI-compliant infrastructure
   - Implement proper error handling

## Monitoring & Analytics

### Key Metrics to Track
```typescript
interface CreditAnalytics {
  // Revenue metrics
  totalRevenue: number;
  averagePurchaseValue: number;
  purchaseFrequency: number;
  
  // Usage metrics
  averageCreditsPerExport: number;
  exportSuccessRate: number;
  creditUtilization: number;
  
  // User metrics
  freeToPayConversion: number;
  churnRate: number;
  lifetimeValue: number;
}
```

### Implement tracking for:
- Purchase events
- Credit usage patterns
- Export success/failure rates
- User retention based on credit balance

## Next Steps

1. Review and approve implementation plan
2. Set up Stripe test account
3. Create development branch
4. Begin Phase 1 implementation
5. Schedule daily progress reviews

This foundation provides a solid, scalable credit system that can easily support Apple Pay and other payment methods in the future.