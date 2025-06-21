#!/bin/bash

echo "Starting Bazaar-Vid Development Environment..."
echo "============================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "Starting main app on http://localhost:3000..."
echo "Starting admin app on http://localhost:3001..."
echo ""
echo "Press Ctrl+C to stop both apps"
echo ""

# Start both apps using turbo
npm run dev