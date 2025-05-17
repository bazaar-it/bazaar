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

echo "Set environment variables for HMR stability"
echo "Starting Next.js with polling-based HMR stability"

# Set environment variables for stable development experience
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"

# Export these variables to make sure they're available to child processes
echo "LOG_DIR=$LOG_DIR"
echo "A2A_LOG_DIR=$A2A_LOG_DIR"

# Start Next.js dev server with environment variables for stability
npm run dev:no-restart