#!/usr/bin/env bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create log directories outside project
mkdir -p /tmp/bazaar-logs
mkdir -p /tmp/a2a-logs
mkdir -p /tmp/error-logs
mkdir -p /tmp/combined-logs

echo "Created log directories outside project to prevent HMR triggers"

# Set environment variables
export NODE_ENV=development
export LOG_DIR=/tmp/bazaar-logs
export A2A_LOG_DIR=/tmp/a2a-logs
export ERROR_LOG_DIR=/tmp/error-logs
export COMBINED_LOG_DIR=/tmp/combined-logs
export TASK_PROCESSOR_STARTUP_DELAY=10000
export TASK_PROCESSOR_HEARTBEAT_INTERVAL=5000

# Enable Message Bus architecture
export USE_MESSAGE_BUS=true

# Set Node.js options
export NODE_OPTIONS="--max-old-space-size=4096 --no-warnings"

echo "Environment variables set for TaskProcessor"
echo "Message Bus is ENABLED"

# Load .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "Loading environment variables from .env.local"
  # Source the file to load variables into current shell
  set -a
  source "$PROJECT_ROOT/.env.local"
  set +a
else
  echo "WARNING: .env.local not found, using system environment variables"
fi

echo "Starting TaskProcessor..."

# Change to project root
cd "$PROJECT_ROOT"

# Use the patched npm script to run the task processor
npm run dev:task-processor-patched