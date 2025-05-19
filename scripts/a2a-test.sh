#!/bin/bash
# scripts/a2a-test.sh
# Script to start the server in A2A test mode and run the verification script

# Set environment variables for A2A testing
export NODE_ENV=development

# A2A specific configuration
export A2A_DEBUG=true
export A2A_LOG_LEVEL=debug
export A2A_TEST_MODE=true
export WORKER_POLLING_INTERVAL=10000
export TASK_PROCESSOR_POLLING_INTERVAL=10000
export DISABLE_BACKGROUND_WORKERS=false
export USE_MESSAGE_BUS=true

# API endpoint configuration
export PORT=${PORT:-3000}
export API_HOST=${API_HOST:-localhost}
export NEXTAUTH_URL="http://localhost:${PORT}"

# Ensure tmp logs directory exists - using tmp to avoid HMR issues
mkdir -p tmp/a2a-test-logs

echo "--------------------------------"
echo "A2A Testing Environment"
echo "--------------------------------"
echo "Setting up A2A testing environment..."

# Load environment variables from .env.local
if [ -f .env.local ]; then
  echo "Loading environment from .env.local"
  source <(grep -v '^#' .env.local | sed -E 's/(.*)=(.*)/export \1="\2"/')
fi

# Start server in one terminal (with less verbose output)
echo "Starting server in A2A testing mode..."
echo "This will run in the background. Check tmp/a2a-test-logs/a2a-server.log for output."
npm run dev > tmp/a2a-test-logs/a2a-server.log 2>&1 &
SERVER_PID=$!

echo "Waiting for server to start (30 seconds)..."
for i in {1..30}; do
  echo -n "."
  sleep 1
done
echo ""

# Run the verification script after server starts
echo "Running A2A verification script..."
echo "Check tmp/a2a-test-logs/a2a-test-*.log for detailed results"

# Run the verification script with ESM support
node --experimental-vm-modules src/scripts/verify-a2a-routing.js

echo "--------------------------------"
echo "Would you like to:"
echo "1) Keep server running"
echo "2) Stop server and exit"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "2" ]; then
  echo "Stopping server (PID: $SERVER_PID)..."
  kill $SERVER_PID
  echo "Server stopped."
fi

echo "A2A testing completed."
