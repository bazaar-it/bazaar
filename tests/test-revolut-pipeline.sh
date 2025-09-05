#!/bin/bash

echo "🚀 Testing Revolut brand extraction pipeline..."
echo ""

# Test the brand extraction endpoint
echo "📊 Sending request to extract Revolut brand..."
curl -X POST http://localhost:3000/api/test-brand-direct \
  -H "Content-Type: application/json" \
  -d '{"url": "https://revolut.com"}' \
  2>/dev/null | jq '.success, .elapsedTime' 2>/dev/null || echo "API test endpoint not available"

echo ""
echo "✅ Test complete! Check server logs for details."
echo ""
echo "To check database results, run:"
echo "npm run db:studio"
echo ""
echo "Or query directly:"
echo 'SELECT * FROM "bazaar-vid_brand_profile" WHERE website_url LIKE '\''%revolut%'\'';'