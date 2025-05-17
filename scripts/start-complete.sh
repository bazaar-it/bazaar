#!/bin/bash

# Create log directories outside project
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
export NEXT_MANUAL_SIG_HANDLE=true
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable Message Bus architecture
export USE_MESSAGE_BUS=true

echo "Set environment variables for stability"
echo "Starting Next.js dev server AND standalone TaskProcessor..."

# Check if tsx is installed and install it if not available
if ! command -v tsx &> /dev/null; then
    echo "tsx command not found, installing it now..."
    npm install -g tsx
    if ! command -v tsx &> /dev/null; then
        echo "Failed to install tsx globally. Trying to use local tsx from node_modules..."
        if [ ! -f "./node_modules/.bin/tsx" ]; then
            echo "Local tsx not found either. Installing tsx locally..."
            npm install --save-dev tsx
        fi
        TSX_CMD="./node_modules/.bin/tsx"
    else
        TSX_CMD="tsx"
    fi
else
    TSX_CMD="tsx"
fi

echo "Using tsx command: $TSX_CMD"

# Create a special patched version of the TaskProcessor script with dynamic imports
mkdir -p /tmp
cat << 'EOF' > /tmp/run-task-processor-fixed.ts
// Import required modules for standalone operation
import process from 'node:process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createRequire } from 'module';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate the project root directory
const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');

// Set up module resolution for ~ alias
const require = createRequire(import.meta.url);

// Register a custom loader to resolve ~ imports
// This won't actually be used but ensures consistent paths
process.env.NODE_PATH = srcDir;

// Helper to convert ~ paths to relative paths
function resolveTildePath(importPath: string): string {
  if (importPath.startsWith('~/')) {
    return path.join(srcDir, importPath.substring(2));
  }
  return importPath;
}

// Load environment variables directly without dotenv
function loadEnvFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`Loading environment variables from ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not load ${filePath}:`, err);
  }
}

// Function to import environment variables
async function importEnv() {
  // First try .env.local
  loadEnvFile(path.join(projectRoot, '.env.local'));
  // Then try .env
  loadEnvFile(path.join(projectRoot, '.env'));
  
  console.log('Environment variables loaded');
  
  // Set critical log paths if not already set
  if (!process.env.LOG_DIR) process.env.LOG_DIR = '/tmp/bazaar-logs';
  if (!process.env.A2A_LOG_DIR) process.env.A2A_LOG_DIR = '/tmp/a2a-logs';
  if (!process.env.ERROR_LOG_DIR) process.env.ERROR_LOG_DIR = '/tmp/error-logs';
  if (!process.env.COMBINED_LOG_DIR) process.env.COMBINED_LOG_DIR = '/tmp/combined-logs';
}

// Dynamically import the TaskProcessor 
async function main() {
  // First import environment
  await importEnv();
  
  console.log(`Starting TaskProcessor with LOG_DIR=${process.env.LOG_DIR}`);
  
  try {
    // Import the logger first to correctly set up log directories
    const loggerModule = await import(path.join(srcDir, 'lib/logger.js'));
    const { a2aLogger, default: logger, initializeA2AFileTransport } = loggerModule;
    
    // Make logger available globally to support modules that import it
    (globalThis as any).logger = logger;
    (globalThis as any).a2aLogger = a2aLogger;
    
    // Patch the global import.meta object to handle ~ paths
    (globalThis as any).__projectRoot = projectRoot;
    (globalThis as any).__srcDir = srcDir;
    
    // Explicitly initialize A2A file transport
    initializeA2AFileTransport();
    
    console.log('A2A logger initialized, preparing to import TaskProcessor');
    
    // Skip importing animationDesigner.service which has the problematic import
    console.log('Setting up selective imports to avoid problematic modules');
    
    // Then import the TaskProcessor service directly
    const taskProcessorModule = await import(path.join(srcDir, 'server/services/a2a/taskProcessor.service.js'));
    const { TaskProcessor } = taskProcessorModule;
    
    if (!TaskProcessor) {
      throw new Error('Failed to import TaskProcessor class');
    }
    
    console.log('TaskProcessor class imported successfully, getting instance');
    
    // Get TaskProcessor instance and initialize polling
    const processor = TaskProcessor.getInstance();
    processor.initializePolling(true);
    
    console.log('TaskProcessor initialized and polling started');
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down TaskProcessor...');
      await processor.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down TaskProcessor...');
      await processor.shutdown();
      process.exit(0);
    });
    
    // Log a health check periodically
    setInterval(() => {
      processor.emitHealthCheck();
    }, 60000);
    
    console.log('TaskProcessor startup complete, ready to process tasks');
  } catch (err) {
    console.error('Fatal error in TaskProcessor script:', err);
    process.exit(1);
  }
}

// Start the main function
main().catch(err => {
  console.error('Fatal error in TaskProcessor script:', err);
  process.exit(1);
});
EOF

echo "Created temporary fixed TaskProcessor script at /tmp/run-task-processor-fixed.ts"

# Run Next.js with watchpack polling in the background
echo "Starting Next.js dev server with polling-based stability..."
WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true npx next dev &
NEXT_PID=$!

# Give Next.js a moment to start up
sleep 5

# Run the standalone task processor
echo "Starting standalone TaskProcessor..."

# Check if .env.local exists and modify the command accordingly
if [ -f ".env.local" ]; then
  echo "Using environment variables from .env.local for TaskProcessor"
  npx dotenv -e .env.local -- $TSX_CMD --require tsconfig-paths/register --no-warnings /tmp/run-task-processor-fixed.ts &
else
  echo "Warning: .env.local file not found. TaskProcessor may fail to start."
  $TSX_CMD --require tsconfig-paths/register --no-warnings /tmp/run-task-processor-fixed.ts &
fi
TASK_PROCESSOR_PID=$!

echo "Started Next.js (PID: $NEXT_PID) and TaskProcessor (PID: $TASK_PROCESSOR_PID)"
echo "Press Ctrl+C to stop both processes"

# Function to kill child processes when the script terminates
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