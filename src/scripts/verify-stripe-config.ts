/**
 * Verify Stripe configuration
 */

console.log("🔍 Stripe Configuration Check\n");

// Check if using test or live keys
const secretKey = process.env.STRIPE_SECRET_KEY || "";
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

console.log("🔑 API Keys:");
console.log(`- Secret Key: ${secretKey.substring(0, 14)}...`);
console.log(`  Mode: ${secretKey.includes("_test_") ? "TEST MODE ⚠️" : "LIVE MODE ✅"}`);

console.log(`\n- Publishable Key: ${publishableKey.substring(0, 14)}...`);
console.log(`  Mode: ${publishableKey.includes("_test_") ? "TEST MODE ⚠️" : "LIVE MODE ✅"}`);

console.log(`\n- Webhook Secret: ${webhookSecret.substring(0, 10)}...`);
console.log(`  Configured: ${webhookSecret ? "YES ✅" : "NO ❌"}`);

if (secretKey.includes("_test_") && publishableKey.includes("_test_")) {
  console.log("\n⚠️  WARNING: You are using TEST keys!");
  console.log("Test purchases will NOT appear in production database.");
  console.log("Test webhooks will NOT update real user credits.");
  console.log("\nFor production, you need:");
  console.log("1. Live API keys from Stripe Dashboard");
  console.log("2. Production webhook endpoint configured");
  console.log("3. Different webhook secret for live mode");
} else if (secretKey.includes("_live_") && publishableKey.includes("_live_")) {
  console.log("\n✅ Using LIVE keys - ready for production!");
} else {
  console.log("\n❌ MISMATCH: Secret and publishable keys are in different modes!");
}

console.log("\n📝 Next Steps:");
console.log("1. Go to https://dashboard.stripe.com");
console.log("2. Switch to the correct mode (Test/Live)");
console.log("3. Get the appropriate keys");
console.log("4. Configure webhooks for your environment");
console.log("5. Update environment variables");

process.exit(0);