// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "~/lib/stripe";
import { env } from "~/env";
import { db } from "~/server/db";
import { userCredits, creditTransactions } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    console.log(`🔔 Stripe webhook called at ${new Date().toISOString()}`);
    
    if (!sig) {
      console.error("❌ No Stripe signature found in headers");
      return new NextResponse('No signature', { status: 400 });
    }

    // Check if webhook secret is configured
    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured!");
      // Don't return 500 to avoid Stripe disabling the webhook
      return new NextResponse('Webhook not configured', { status: 200 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      console.error("Signature received:", sig?.substring(0, 20) + "...");
      console.error("Using webhook secret:", env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + "...");
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    console.log(`✅ Stripe webhook verified: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log("💳 Processing payment completion:", {
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      amount: session.amount_total,
    });

    // Extract metadata
    if (!session.metadata?.userId || !session.metadata?.promptCount) {
      console.error("❌ Missing metadata in session:", session.metadata);
      return new NextResponse('Missing metadata', { status: 400 });
    }
    
    const { userId, promptCount } = session.metadata;
    const prompts = parseInt(promptCount);
    
    if (isNaN(prompts) || prompts <= 0) {
      console.error("❌ Invalid prompt count:", promptCount);
      return new NextResponse('Invalid prompt count', { status: 400 });
    }

    console.log(`📦 Processing purchase for user ${userId}: ${prompts} prompts`);

    try {
      // First, ensure user has a credits record
      await db.insert(userCredits).values({
        userId,
        dailyCredits: 5, // 5 daily credits
        purchasedCredits: 20, // 20 signup bonus (acts like purchased)
        lifetimeCredits: 20, // Track lifetime total
        dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      }).onConflictDoNothing();

      // Add prompts to user's purchased credits
      await db.update(userCredits)
        .set({
          purchasedCredits: sql`purchased_credits + ${prompts}`,
          lifetimeCredits: sql`lifetime_credits + ${prompts}`,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // Get the current balance for the transaction log
      const [currentCredits] = await db.select({
        purchasedCredits: userCredits.purchasedCredits
      })
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      // Log the transaction
      await db.insert(creditTransactions).values({
        userId,
        type: 'purchase',
        amount: prompts,
        balance: currentCredits?.purchasedCredits || prompts, // Balance after transaction
        description: `Purchased ${prompts} prompts`,
        stripePaymentIntentId: session.payment_intent as string,
        metadata: {
          stripeSessionId: session.id,
          packageName: session.line_items?.data?.[0]?.description,
          amount: session.amount_total,
          currency: session.currency,
        },
      });

      console.log(`✅ Successfully added ${prompts} prompts to user ${userId}`);
      
      // Verify the update worked
      const [verification] = await db.select({
        purchasedCredits: userCredits.purchasedCredits,
        lifetimeCredits: userCredits.lifetimeCredits
      })
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);
        
      console.log(`🔍 Verification - User ${userId} now has:`, {
        purchasedCredits: verification?.purchasedCredits,
        lifetimeCredits: verification?.lifetimeCredits
      });
      
      return new NextResponse(JSON.stringify({
        success: true,
        userId,
        promptsAdded: prompts,
        newBalance: verification?.purchasedCredits
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error("❌ Failed to process payment:", error);
      console.error("Error details:", {
        userId,
        prompts,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return new NextResponse('Failed to process payment', { status: 500 });
    }
  }

    return new NextResponse('OK', { status: 200 });
    
  } catch (globalError) {
    // Global error handler to prevent 500 errors
    console.error("❌ CRITICAL: Webhook handler crashed:", globalError);
    console.error("Error type:", globalError instanceof Error ? globalError.constructor.name : typeof globalError);
    console.error("Error message:", globalError instanceof Error ? globalError.message : String(globalError));
    console.error("Stack trace:", globalError instanceof Error ? globalError.stack : 'No stack trace');
    
    // Return 200 to prevent Stripe from disabling the webhook
    // But log the error so we can fix it
    return new NextResponse(JSON.stringify({
      error: 'Internal error - logged for investigation',
      timestamp: new Date().toISOString()
    }), { 
      status: 200, // Return 200 to keep webhook active
      headers: { 'Content-Type': 'application/json' }
    });
  }
}