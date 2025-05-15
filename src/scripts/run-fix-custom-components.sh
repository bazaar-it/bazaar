#!/bin/bash
# run-fix-custom-components.sh
#
# Script to run fix-custom-components.ts with proper environment variables
# 
# Usage:
#   ./src/scripts/run-fix-custom-components.sh [project-id] [options]
#
# Options:
#   --verbose       Show detailed logs
#   --check         Only check for issues, don't fix
#   --component=id  Fix a specific component by ID

# Set -e to exit immediately if any command fails
set -e

echo "Loading environment variables..."

# More reliable method to load environment variables that works with different bash versions
load_env() {
  env_file=$1
  if [ -f "$env_file" ]; then
    echo "Using $env_file for environment variables"
    
    # Read the file line by line
    while IFS= read -r line || [ -n "$line" ]; do
      # Skip comments and empty lines
      if [[ $line =~ ^[^#] && -n $line ]]; then
        # Export the variable
        export "$line"
      fi
    done < "$env_file"
    return 0
  fi
  return 1
}

# Try to load from .env.local first, then fall back to .env
if ! load_env ".env.local"; then
  if ! load_env ".env"; then
    echo "Error: No .env or .env.local file found"
    exit 1
  fi
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

if [ -z "$R2_PUBLIC_URL" ]; then
  echo "Error: R2_PUBLIC_URL environment variable is not set"
  exit 1
fi

echo "Running component fixer script with environment variables..."
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "R2_PUBLIC_URL: ${R2_PUBLIC_URL:0:30}..."

# Run the tsx script with all arguments passed to this shell script
npx tsx src/scripts/fix-custom-components.ts "$@"

echo "Script execution completed!" 