#!/bin/bash

# Create log directories outside project
mkdir -p /tmp/bazaar-logs
mkdir -p /tmp/a2a-logs
mkdir -p /tmp/error-logs
mkdir -p /tmp/combined-logs

echo "Created log directories outside project to prevent HMR triggers"

# Set environment variables for HMR stability
export NEXT_MANUAL_SIG_HANDLE=true
export LOG_DIR=/tmp/bazaar-logs
export A2A_LOG_DIR=/tmp/a2a-logs
export ERROR_LOG_DIR=/tmp/error-logs
export COMBINED_LOG_DIR=/tmp/combined-logs
export TASK_PROCESSOR_STARTUP_DELAY=10000
export TASK_PROCESSOR_HEARTBEAT_INTERVAL=5000

# The OpenAI API key and DEFAULT_ADB_MODEL will be loaded from .env.local
# Make sure the values in .env.local are correct

# Enable Message Bus architecture
export USE_MESSAGE_BUS=true

# Set environment variables for stable development experience
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"

# Verify that critical environment variables are available
if [ -n "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY is set (starts with $(echo $OPENAI_API_KEY | cut -c1-5)...)"
else
  echo "WARNING: OPENAI_API_KEY is not set, agent LLM functionality may be limited"
fi

if [ -n "$DEFAULT_ADB_MODEL" ]; then
  echo "DEFAULT_ADB_MODEL=$DEFAULT_ADB_MODEL"
else
  echo "WARNING: DEFAULT_ADB_MODEL is not set, using default value"
fi

echo "Environment variables set - Message Bus ENABLED"
echo "Starting Next.js with polling-based HMR stability"

# Export these variables to make sure they're available to child processes
echo "LOG_DIR=$LOG_DIR"
echo "A2A_LOG_DIR=$A2A_LOG_DIR"
echo "USE_MESSAGE_BUS=$USE_MESSAGE_BUS"

echo "Starting TaskProcessor in background..."
npm run dev:task-processor-patched &
TASK_PROCESSOR_PID=$!

# Start Next.js dev server with environment variables for stability
echo "Starting Next.js dev server..."
npm run dev:no-restart &
NEXT_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Shutting down processes..."
  kill $TASK_PROCESSOR_PID 2>/dev/null
  kill $NEXT_PID 2>/dev/null
  wait
  echo "All processes terminated. Exiting."
  exit 0
}

# Set trap for signals
trap cleanup SIGINT SIGTERM

# Wait for either process to finish
wait $NEXT_PID $TASK_PROCESSOR_PID
cleanup
