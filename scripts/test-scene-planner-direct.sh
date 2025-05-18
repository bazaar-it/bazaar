#!/bin/bash
# scripts/test-scene-planner-direct.sh
# Direct test script for ScenePlannerAgent with no authentication

echo "🧪 Direct ScenePlannerAgent Test"
echo "------------------------------"

# Check if the application is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "⚠️ The application doesn't appear to be running."
  echo "Please start the application with ./scripts/startup-with-a2a.sh first."
  exit 1
fi

# Execute the test request to trigger scene planning via the direct endpoint
echo "📤 Sending direct test request to ScenePlannerAgent..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/debug/test-scene-planner-direct \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a short intro video for a tech company called Bazaar that specializes in innovative video generation technology","testMode":true}')

# Check if request was successful
if [[ $RESPONSE == *"success"* ]]; then
  echo "✅ Request successfully sent directly to ScenePlannerAgent"
  
  # Extract the taskId for monitoring
  TASK_ID=$(echo $RESPONSE | grep -o '"taskId":"[^"]*"' | cut -d '"' -f 4)
  MESSAGE_ID=$(echo $RESPONSE | grep -o '"messageId":"[^"]*"' | cut -d '"' -f 4)
  
  echo "TaskID: $TASK_ID"
  echo "MessageID: $MESSAGE_ID"
  
  echo -e "\n📋 Next steps:"
  echo "1. Check the logs at http://localhost:3002 for agent communication"
  echo "2. Filter logs for your task ID: $TASK_ID"
  echo "3. Look for 'CREATE_SCENE_PLAN_REQUEST' messages being processed"
  echo "4. Look for scene plan generation activities from ScenePlannerAgent"
else
  echo "❌ Failed to send request to ScenePlannerAgent"
  echo "Response: $RESPONSE"
fi
