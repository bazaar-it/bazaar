// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "~/lib/stripe";
import { env } from "~/env";
import { db } from "~/server/db";
import { userCredits, creditTransactions } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  if (!sig) {
    console.error("No Stripe signature found");
    return new NextResponse('No signature', { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse('Webhook signature verification failed', { status: 400 });
  }

  console.log(`🔔 Stripe webhook received: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log("💳 Processing payment completion:", {
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      amount: session.amount_total,
    });

    // Extract metadata
    const { userId, promptCount } = session.metadata!;
    const prompts = parseInt(promptCount);

    try {
      // First, ensure user has a credits record
      await db.insert(userCredits).values({
        userId,
        dailyCredits: 20, // Default daily credits
        purchasedCredits: 0,
        lifetimeCredits: 0,
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

      // Log the transaction
      await db.insert(creditTransactions).values({
        userId,
        type: 'purchase',
        amount: prompts,
        description: `Purchased ${prompts} prompts`,
        stripeSessionId: session.id,
        metadata: {
          packageName: session.line_items?.data?.[0]?.description,
          amount: session.amount_total,
          currency: session.currency,
        },
      });

      console.log(`✅ Successfully added ${prompts} prompts to user ${userId}`);
    } catch (error) {
      console.error("❌ Failed to process payment:", error);
      return new NextResponse('Failed to process payment', { status: 500 });
    }
  }

  return new NextResponse('OK', { status: 200 });
}