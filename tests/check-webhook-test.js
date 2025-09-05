const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking recent webhook activity...');

// Direct SQL query to check recent transactions
const query = `
SELECT 
  created_at,
  type,
  amount,
  description,
  stripe_payment_intent_id
FROM "bazaar-vid_credit_transaction" 
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC 
LIMIT 5;
`;

console.log('Query:', query);
console.log('\n📊 You can run this in Drizzle Studio or directly in Neon console');
console.log('Look for transactions from the last 10 minutes');