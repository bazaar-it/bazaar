#!/bin/bash
# scripts/test-scene-planner.sh
# Test script specifically for the ScenePlannerAgent

echo "🧪 ScenePlannerAgent Test Script"
echo "------------------------------"

# Check if the application is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "⚠️ The application doesn't appear to be running."
  echo "Please start the application with ./scripts/startup-with-a2a.sh first."
  exit 1
fi

# Execute the test request to trigger scene planning
echo "📤 Sending test request to ScenePlannerAgent..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/debug/test-scene-planner \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a short intro video for a tech company called Bazaar that specializes in innovative video generation technology","testMode":true}')

# Check if request was successful
if [[ $RESPONSE == *"success"* ]]; then
  echo "✅ Request successfully sent to ScenePlannerAgent"
  echo "Response: $RESPONSE"
  
  echo -e "\n📋 Next steps:"
  echo "1. Check the logs at http://localhost:3002 for agent communication"
  echo "2. Look for 'CREATE_SCENE_PLAN_REQUEST' messages from CoordinatorAgent"
  echo "3. Look for scene plan generation activities from ScenePlannerAgent"
  echo -e "\n💡 If no messages are reaching ScenePlannerAgent, check:"
  echo "- Whether message bus is enabled (USE_MESSAGE_BUS=true)"
  echo "- Whether CoordinatorAgent is forwarding messages correctly"
  echo "- Whether any errors appear in the logs during message processing"
else
  echo "❌ Failed to send test request"
  echo "Response: $RESPONSE"
  echo -e "\n💡 This could indicate the API route is not working or the application isn't running properly."
fi

echo -e "\nLogs are available at: http://localhost:3002"
echo "You can also check files in: $A2A_LOG_DIR"
