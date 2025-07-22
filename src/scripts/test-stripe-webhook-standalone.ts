/**
 * Standalone Stripe webhook test script
 * This bypasses environment validation for quick testing
 */

import Stripe from 'stripe';

// Initialize Stripe with test key (you can replace this)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-09-30.acacia',
});

async function testStripeWebhook() {
  console.log("🧪 Testing Stripe webhook processing...\n");

  // Test data that mimics a real Stripe checkout.session.completed event
  const testPayload = {
    id: "evt_test_" + Date.now(),
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_" + Date.now(),
        object: "checkout.session",
        amount_total: 500, // $5.00
        currency: "usd",
        customer_details: {
          email: "test@example.com"
        },
        metadata: {
          userId: "6b2d610d-9a8d-433a-bd76-2ff924ce98c0",
          promptCount: "50"
        },
        payment_intent: "pi_test_" + Date.now(),
        line_items: {
          data: [{
            description: "Starter Pack - 50 prompts"
          }]
        }
      }
    }
  };

  // Create a test signature
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_dummy";
  const payload = JSON.stringify(testPayload);
  
  let signature: string;
  try {
    signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
  } catch (error) {
    console.log("⚠️ Using dummy signature (Stripe key not available)");
    signature = "t=1234567890,v1=dummy_signature";
  }

  console.log("📦 Test payload created:");
  console.log("- User ID:", testPayload.data.object.metadata.userId);
  console.log("- Prompts:", testPayload.data.object.metadata.promptCount);
  console.log("- Amount:", testPayload.data.object.amount_total / 100, testPayload.data.object.currency);

  // Make request to webhook endpoint
  const webhookUrl = process.env.NEXTAUTH_URL 
    ? `${process.env.NEXTAUTH_URL}/api/webhooks/stripe`
    : "http://localhost:3000/api/webhooks/stripe";
    
  console.log("\n🚀 Sending to webhook:", webhookUrl);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body: payload,
    });

    const responseText = await response.text();
    
    console.log("\n📨 Response:");
    console.log("- Status:", response.status, response.statusText);
    console.log("- Body:", responseText);

    if (response.ok) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log("\n✅ Webhook processed successfully!");
        if (jsonResponse.promptsAdded) {
          console.log("- Prompts added:", jsonResponse.promptsAdded);
          console.log("- New balance:", jsonResponse.newBalance);
        }
      } catch {
        console.log("\n✅ Webhook returned OK");
      }
    } else {
      console.error("\n❌ Webhook failed!");
      
      // Check for common errors
      if (response.status === 400 && responseText.includes("signature")) {
        console.log("\n💡 Tip: Make sure STRIPE_WEBHOOK_SECRET is set in your environment");
      }
      if (response.status === 500) {
        console.log("\n💡 Tip: Check your database connection and environment variables");
      }
    }

  } catch (error) {
    console.error("\n💥 Request failed:");
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error("❌ Connection refused - is your dev server running on localhost:3000?");
      } else {
        console.error("❌", error.message);
      }
    } else {
      console.error("❌", error);
    }
  }
}

// Run the test
testStripeWebhook()
  .then(() => {
    console.log("\n🎉 Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });