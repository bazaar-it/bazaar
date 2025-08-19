#!/bin/bash

# Remotion Lambda Site Deployment Script with Font Support
# This script properly deploys the Lambda site with all fonts included

set -e

echo "🚀 Starting Remotion Lambda Site Deployment with Fonts"
echo "=================================================="

# Check if environment variables are set
if [ -z "$AWS_REGION" ]; then
    echo "❌ AWS_REGION not set. Please set it in your .env.local file"
    exit 1
fi

if [ -z "$REMOTION_BUCKET_NAME" ]; then
    echo "❌ REMOTION_BUCKET_NAME not set. Please set it in your .env.local file"
    exit 1
fi

# Step 1: Copy fonts to ensure they're in the right place
echo ""
echo "📋 Step 1: Copying fonts to public directory..."
node scripts/copy-fonts.js

# Step 2: Build the Remotion bundle
echo ""
echo "📋 Step 2: Building Remotion bundle..."
npx remotion bundle src/remotion/index.tsx --webpack-override remotion.config.ts

# The bundle command creates a 'build' directory with the bundled code
# We need to ensure fonts are in the right place in the build

# Step 3: Ensure fonts are in the build directory
echo ""
echo "📋 Step 3: Verifying fonts in build directory..."
if [ ! -d "build/public/fonts" ]; then
    echo "Creating build/public/fonts directory..."
    mkdir -p build/public/fonts
fi

# Copy all fonts from public/fonts to build/public/fonts
echo "Copying fonts to build directory..."
cp -r public/fonts/* build/public/fonts/

# Count fonts
FONT_COUNT=$(ls -1 build/public/fonts/*.woff2 2>/dev/null | wc -l)
echo "✅ Copied $FONT_COUNT font files to build directory"

# Step 4: Deploy the site to Lambda
echo ""
echo "📋 Step 4: Deploying site to Lambda..."
echo "Region: $AWS_REGION"
echo "Bucket: $REMOTION_BUCKET_NAME"
echo "Site name: bazaar-fonts-deployed"

# Deploy the site with a unique name to avoid caching issues
SITE_ID="bazaar-fonts-deployed-$(date +%s)"
echo "Site ID: $SITE_ID"

npx remotion lambda sites create \
    --region "$AWS_REGION" \
    --bucket-name "$REMOTION_BUCKET_NAME" \
    --site-name "$SITE_ID" \
    build/

# Get the serve URL
echo ""
echo "📋 Step 5: Getting serve URL..."
SERVE_URL=$(npx remotion lambda sites ls --region "$AWS_REGION" --quiet | grep "$SITE_ID" | awk '{print $2}')

if [ -z "$SERVE_URL" ]; then
    echo "❌ Failed to get serve URL. Trying alternative method..."
    # Alternative: construct the URL manually
    SERVE_URL="https://${REMOTION_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/sites/${SITE_ID}/index.html"
fi

echo "✅ Site deployed successfully!"
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "IMPORTANT: Update your .env.local file with:"
echo ""
echo "REMOTION_SERVE_URL=$SERVE_URL"
echo ""
echo "Then restart your development server for the changes to take effect."
echo ""
echo "To verify fonts are working:"
echo "1. Try exporting a video with custom fonts"
echo "2. Check Lambda logs for '[Lambda Font Loading]' messages"
echo "3. Download the exported video and verify fonts render correctly"