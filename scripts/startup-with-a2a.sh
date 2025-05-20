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

# Set logging mode for A2A development to show detailed agent logs in console
export LOGGING_MODE=a2a

# export OPENAI_API_KEY=${OPENAI_API_KEY:-} # Rely on .env.local
# export DEFAULT_ADB_MODEL=${DEFAULT_ADB_MODEL:-o4-mini} # Rely on .env.local

# Enable Message Bus architecture
export USE_MESSAGE_BUS=true

# Set environment variables for stable development experience
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"

# Verify that critical environment variables are available (this check might now fail if not in shell env)
# It's more important that the Node processes find them via .env.local
# if [ -n "$OPENAI_API_KEY" ]; then
#   echo "OPENAI_API_KEY is set (starts with $(echo $OPENAI_API_KEY | cut -c1-5)...)"
# else
#   echo "WARNING: OPENAI_API_KEY is not set by script, relying on .env.local for Node processes"
# fi

# if [ -n "$DEFAULT_ADB_MODEL" ]; then
#   echo "DEFAULT_ADB_MODEL=$DEFAULT_ADB_MODEL (from script variable)"
# else
#   echo "WARNING: DEFAULT_ADB_MODEL is not set by script, relying on .env.local for Node processes"
# fi

echo "Environment variables set - Message Bus ENABLED"

# --- Log Agent Start ---
echo "Attempting to start Log Agent and capture its output..."
LOG_AGENT_ERROR_LOG="/tmp/log_agent_error.log"
rm -f $LOG_AGENT_ERROR_LOG

# Extract the OpenAI API key from .env.local if it exists
if [ -f .env.local ]; then
  export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d '=' -f2)
  export MAX_TOKENS=$(grep MAX_TOKENS .env.local | cut -d '=' -f2)
  echo "✓ Passed OpenAI API key from .env.local to Log Agent environment"
  if [ -n "$MAX_TOKENS" ]; then
    echo "✓ Using MAX_TOKENS=$MAX_TOKENS for Log Agent"
  else
    export MAX_TOKENS=8000
    echo "✓ Using default MAX_TOKENS=8000 for Log Agent"
  fi
else
  echo "⚠️ No .env.local file found. OpenAI integration may not work."
fi

(cd src/scripts/log-agent && exec tsx --tsconfig tsconfig.json server.ts 2> $LOG_AGENT_ERROR_LOG) &
LOG_AGENT_PID=$!
echo "Log Agent potentially started with PID $LOG_AGENT_PID. Waiting 5 seconds..."
sleep 5
if ps -p $LOG_AGENT_PID > /dev/null; then
  echo "✅ Log Agent (PID $LOG_AGENT_PID) appears to be running."
else
  echo "❌ Log Agent (PID $LOG_AGENT_PID) is NOT running or exited quickly."
  if [ -f $LOG_AGENT_ERROR_LOG ]; then
    echo "--- Log Agent Errors (from $LOG_AGENT_ERROR_LOG) ---"
    cat $LOG_AGENT_ERROR_LOG
    echo "-------------------------------------------------"
  else
    echo "No error log found for Log Agent."
  fi
fi
# --- Log Agent End ---

# --- TaskProcessor Start ---
echo "Starting TaskProcessor in background... (will use .env.local)"
npm run dev:task-processor &
TASK_PROCESSOR_PID=$!

# --- Next.js Start ---
echo "Starting Next.js dev server (foreground)... (will use .env.local)"
npm run dev:no-restart # Removed &
NEXT_PID=$! 

# Function to cleanup on exit
cleanup() {
  echo "Shutting down processes..."
  if [ -n "$LOG_AGENT_PID" ]; then echo "Stopping Log Agent (PID $LOG_AGENT_PID)..."; kill $LOG_AGENT_PID 2>/dev/null; fi
  if [ -n "$TASK_PROCESSOR_PID" ]; then echo "Stopping Task Processor (PID $TASK_PROCESSOR_PID)..."; kill $TASK_PROCESSOR_PID 2>/dev/null; fi
  # For foreground Next.js, SIGINT from Ctrl+C should handle it, but kill if PID exists
  if [ -n "$NEXT_PID" ] && ps -p $NEXT_PID > /dev/null; then echo "Stopping Next.js (PID $NEXT_PID)..."; kill $NEXT_PID 2>/dev/null; fi
  sleep 1
  echo "Ensuring ports are free..."
  lsof -t -i:3000 | xargs kill -9 2>/dev/null || true
  lsof -t -i:3002 | xargs kill -9 2>/dev/null || true
  wait
  echo "All processes terminated. Exiting."
  rm -f $LOG_AGENT_ERROR_LOG
  exit 0
}

trap cleanup SIGINT SIGTERM

# Since Next.js is in foreground, script will wait here until it's stopped (e.g., Ctrl+C)
# If Next.js crashes, the script will also proceed to cleanup.
wait $NEXT_PID 2>/dev/null # Wait for Next.js explicitly
cleanup # Call cleanup when Next.js finishes or is interrupted
