import { stripe } from "~/lib/stripe";

/**
 * Test script to verify Stripe webhook processing
 * This simulates what Stripe sends to our webhook endpoint
 */
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
          userId: "b0f9c12d-a3e5-4169-aa66-ee860e6977aa", // Lysaker's ID
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test";
  const payload = JSON.stringify(testPayload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

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
        console.log("- Prompts added:", jsonResponse.promptsAdded);
        console.log("- New balance:", jsonResponse.newBalance);
      } catch {
        console.log("\n✅ Webhook returned OK");
      }
    } else {
      console.error("\n❌ Webhook failed!");
    }

  } catch (error) {
    console.error("\n💥 Request failed:", error);
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