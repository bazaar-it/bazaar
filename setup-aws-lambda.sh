#!/bin/bash

echo "🚀 Bazaar-Vid AWS Lambda Setup Script"
echo "===================================="
echo ""
echo "This script will help you set up AWS Lambda for video export."
echo ""

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ Success!"
    else
        echo "❌ Failed. Please check the error above."
        exit 1
    fi
}

# Step 1: Configure AWS credentials
echo "📋 Step 1: Configure AWS Credentials"
echo "------------------------------------"
echo "You'll need your AWS Access Key ID and Secret Access Key."
echo "Get these from AWS Console > Your Name > Security credentials > Access keys"
echo ""
read -p "Press Enter when you have your credentials ready..."
aws configure

# Step 2: Test credentials
echo ""
echo "🔐 Testing AWS credentials..."
aws sts get-caller-identity
check_status

# Step 3: Set region
echo ""
echo "🌍 Step 3: Choose AWS Region"
echo "----------------------------"
echo "Available regions for Remotion Lambda:"
echo "1. us-east-1 (Virginia) - Recommended for best performance"
echo "2. us-west-2 (Oregon)"
echo "3. eu-west-1 (Ireland)"
echo "4. eu-central-1 (Frankfurt)"
echo "5. eu-north-1 (Stockholm) - Your current region"
echo ""
read -p "Enter region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}
export AWS_REGION

echo "Using region: $AWS_REGION"

# Step 4: Deploy Lambda function
echo ""
echo "🚀 Step 4: Deploy Remotion Lambda Function"
echo "-----------------------------------------"
echo "This will create a Lambda function for rendering videos."
echo ""
npx remotion lambda functions deploy --memory=3008 --timeout=300 --disk=10240
check_status

# Get function name from output
echo ""
read -p "Enter the Lambda function name from above (e.g., remotion-render-2025-01-27-abcdef): " FUNCTION_NAME

# Step 5: Create S3 bucket
echo ""
echo "🪣 Step 5: Create S3 Bucket for Renders"
echo "---------------------------------------"
npx remotion lambda buckets create
check_status

# Get bucket name from output
echo ""
read -p "Enter the S3 bucket name from above (e.g., remotionlambda-useast1-abcdef123456): " BUCKET_NAME

# Step 6: Create webhook secret
echo ""
echo "🔒 Step 6: Generate Webhook Secret"
echo "---------------------------------"
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Generated webhook secret: $WEBHOOK_SECRET"

# Step 7: Update .env.local
echo ""
echo "📝 Step 7: Update Environment Variables"
echo "--------------------------------------"
echo ""
echo "Add these to your .env.local file:"
echo ""
echo "# Lambda Configuration"
echo "RENDER_MODE=lambda"
echo "AWS_REGION=$AWS_REGION"
echo "REMOTION_FUNCTION_NAME=$FUNCTION_NAME"
echo "REMOTION_BUCKET_NAME=$BUCKET_NAME"
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo "# Lambda Performance Settings"
echo "LAMBDA_MEMORY_MB=3008"
echo "LAMBDA_DISK_SIZE_MB=10240"
echo ""
echo "# Optional: User quotas"
echo "USER_DAILY_EXPORT_LIMIT=10"
echo "MAX_RENDER_DURATION_MINUTES=30"
echo ""

# Step 8: Test render
echo "🧪 Step 8: Test Render (Optional)"
echo "---------------------------------"
read -p "Would you like to test a render now? (y/n): " TEST_RENDER
if [ "$TEST_RENDER" = "y" ]; then
    echo "Testing render..."
    npx remotion lambda render MainComposition --props='{"scenes":[]}'
fi

echo ""
echo "✅ AWS Lambda setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy the environment variables above to your .env.local"
echo "2. Restart your Next.js development server"
echo "3. Click the Export button in your app to test!"
echo ""
echo "For more help, see: /memory-bank/sprints/sprint63_export/lambda-setup-guide.md"