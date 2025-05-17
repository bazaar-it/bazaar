#!/bin/bash

# Create log directories
mkdir -p /tmp/bazaar-logs
mkdir -p /tmp/a2a-logs
mkdir -p /tmp/error-logs
mkdir -p /tmp/combined-logs

echo "Created log directories outside project to prevent HMR triggers"

# Set environment variables
export LOG_DIR=/tmp/bazaar-logs
export A2A_LOG_DIR=/tmp/a2a-logs
export ERROR_LOG_DIR=/tmp/error-logs
export COMBINED_LOG_DIR=/tmp/combined-logs
export TASK_PROCESSOR_STARTUP_DELAY=10000
export TASK_PROCESSOR_HEARTBEAT_INTERVAL=5000

echo "Set environment variables for TaskProcessor"
echo "Starting standalone TaskProcessor..."

# Run the TaskProcessor script
npm run dev:task-processor 