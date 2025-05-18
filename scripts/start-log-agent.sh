#!/bin/bash

# Start Log Agent and Redis services

# Set environment variables
export LOG_AGENT_PORT=3002
export LOG_AGENT_REDIS_URL="redis://localhost:6379"
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
  echo "❌ Redis CLI not found. Please install Redis."
  exit 1
fi

# Check Redis connection
if ! redis-cli ping &> /dev/null; then
  echo "⚠️ Redis not running. Starting Redis..."
  
  # Try starting Redis in the background
  redis-server --daemonize yes
  
  # Check if Redis started successfully
  sleep 1
  if ! redis-cli ping &> /dev/null; then
    echo "❌ Failed to start Redis. Please start it manually."
    exit 1
  fi
  
  echo "✅ Redis started successfully."
else
  echo "✅ Redis already running."
fi

# Create log directories
mkdir -p logs/agent

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️ Warning: OPENAI_API_KEY not set. LLM analysis will be unavailable."
fi

# Start Log Agent
echo "🚀 Starting Log Agent on port $LOG_AGENT_PORT..."
npm run log:agent 