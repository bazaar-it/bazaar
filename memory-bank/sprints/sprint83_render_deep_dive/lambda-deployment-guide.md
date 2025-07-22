# Lambda Deployment Guide for Bazaar-Vid

## Overview
This guide provides step-by-step instructions for deploying and managing AWS Lambda functions for Bazaar-Vid's video rendering system.

## Prerequisites

### 1. AWS Account Setup
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Default output format: json
```

### 2. Remotion CLI
```bash
# Install Remotion CLI globally
npm install -g @remotion/cli

# Verify installation
npx remotion --version
```

## Initial Lambda Setup

### 1. Deploy Lambda Function
```bash
# Deploy Remotion Lambda function with optimal settings
npx remotion lambda functions deploy \
  --memory=3008 \
  --disk=10240 \
  --timeout=300 \
  --region=us-east-1

# Output example:
# Function name: remotion-render-4-0-320-mem3008mb-disk10240mb-300sec
# Region: us-east-1
# Memory: 3008MB
# Disk: 10240MB
# Timeout: 300 seconds
```

### 2. Create S3 Bucket
```bash
# Create bucket for rendered videos
npx remotion lambda buckets create \
  --region=us-east-1

# Output example:
# Bucket created: remotionlambda-useast1-yb1vzou9i7
```

### 3. Set Bucket Permissions
```bash
# CRITICAL: Enable public read access for video downloads
npm run setup:s3-public

# Or manually:
aws s3api put-bucket-policy \
  --bucket remotionlambda-useast1-yb1vzou9i7 \
  --policy file://s3-public-policy.json
```

## Site Deployment

### 1. Build and Deploy Site
```bash
# Deploy a new site version
npx remotion lambda sites create \
  --site-name="bazaar-vid-v3-prod-fix" \
  --region=us-east-1

# Output:
# Bundling site...
# Uploading to S3...
# Serve URL: https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod-fix/index.html
# Site name: bazaar-vid-v3-prod-fix
```

### 2. Update Site (Overwrite Existing)
```bash
# Redeploy to same site name
npx remotion lambda sites create \
  --site-name="bazaar-vid-v3-prod-fix" \
  --region=us-east-1

# This overwrites the existing site
```

### 3. List Deployed Sites
```bash
# View all deployed sites
npx remotion lambda sites ls \
  --region=us-east-1

# Output:
# Sites in bucket remotionlambda-useast1-yb1vzou9i7:
# - bazaar-vid-v3-prod (deployed: 2025-06-30)
# - bazaar-vid-v3-prod-fix (deployed: 2025-07-22)
```

## Environment Configuration

### 1. Required Environment Variables
```env
# Add to .env.local
RENDER_MODE=lambda
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
REMOTION_FUNCTION_NAME=remotion-render-4-0-320-mem3008mb-disk10240mb-300sec
REMOTION_BUCKET_NAME=remotionlambda-useast1-yb1vzou9i7
REMOTION_SERVE_URL=https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod-fix/index.html
```

### 2. Optional Performance Settings
```env
# Lambda configuration
LAMBDA_MEMORY_MB=3008      # More memory = more CPU
LAMBDA_DISK_SIZE_MB=10240  # For large videos
USER_DAILY_EXPORT_LIMIT=10 # Rate limiting
MAX_RENDER_DURATION_MINUTES=30
```

## Deployment Workflow

### 1. Development to Production Flow
```bash
# 1. Make changes to Remotion components
vim src/remotion/MainCompositionSimple.tsx

# 2. Test locally
npm run dev

# 3. Build and test the Remotion bundle
npx remotion preview src/remotion/index.tsx

# 4. Deploy new site version
npx remotion lambda sites create \
  --site-name="bazaar-vid-v3-$(date +%Y%m%d)" \
  --region=us-east-1

# 5. Update environment variable
# Edit .env.local: REMOTION_SERVE_URL=new-url

# 6. Restart application
npm run build && npm run start
```

### 2. Rollback Procedure
```bash
# 1. Find previous site URL
npx remotion lambda sites ls --region=us-east-1

# 2. Update .env.local with previous URL
REMOTION_SERVE_URL=https://previous-site-url

# 3. Restart application
npm run dev
```

## Monitoring and Debugging

### 1. View Lambda Logs
```bash
# Real-time logs
aws logs tail /aws/lambda/remotion-render-4-0-320-mem3008mb-disk10240mb-300sec --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/remotion-render-4-0-320-mem3008mb-disk10240mb-300sec \
  --filter-pattern "ERROR"
```

### 2. Check Lambda Metrics
```bash
# Function invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=remotion-render-4-0-320-mem3008mb-disk10240mb-300sec \
  --statistics Sum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300
```

### 3. S3 Bucket Analysis
```bash
# List recent renders
aws s3 ls s3://remotionlambda-useast1-yb1vzou9i7/renders/ \
  --recursive \
  --human-readable \
  --summarize

# Check bucket size
aws s3 ls s3://remotionlambda-useast1-yb1vzou9i7 \
  --recursive \
  --human-readable \
  --summarize | tail -2
```

## Troubleshooting

### Common Issues

#### 1. "Site not found" Error
```bash
# Verify site exists
npx remotion lambda sites ls --region=us-east-1

# Check REMOTION_SERVE_URL matches exactly
echo $REMOTION_SERVE_URL
```

#### 2. "Access Denied" on Download
```bash
# Fix S3 permissions
npm run setup:s3-public

# Verify public access
aws s3api get-bucket-policy \
  --bucket remotionlambda-useast1-yb1vzou9i7
```

#### 3. Lambda Timeout
```bash
# Increase timeout (max 900 seconds)
aws lambda update-function-configuration \
  --function-name remotion-render-4-0-320-mem3008mb-disk10240mb-300sec \
  --timeout 900
```

#### 4. Out of Memory
```bash
# Increase memory (max 10240MB)
aws lambda update-function-configuration \
  --function-name remotion-render-4-0-320-mem3008mb-disk10240mb-300sec \
  --memory-size 10240
```

## Cost Management

### 1. Monitor Usage
```bash
# Check this month's Lambda invocations
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --filter file://lambda-filter.json
```

### 2. Set Up Alerts
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-cost-alarm \
  --alarm-description "Alert when Lambda costs exceed $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

### 3. Clean Up Old Renders
```bash
# Delete renders older than 30 days
aws s3 rm s3://remotionlambda-useast1-yb1vzou9i7/renders/ \
  --recursive \
  --exclude "*" \
  --include "*.mp4" \
  --include "*.webm" \
  --include "*.gif" \
  --older-than 30
```

## Best Practices

### 1. Site Naming Convention
```
Format: bazaar-vid-{version}-{environment}-{date}
Examples:
- bazaar-vid-v3-prod-20250722
- bazaar-vid-v3-staging-fix1
- bazaar-vid-v4-dev-test
```

### 2. Pre-deployment Checklist
- [ ] Test all media types locally
- [ ] Verify no hardcoded URLs
- [ ] Check Lambda function exists
- [ ] Confirm S3 permissions
- [ ] Update documentation
- [ ] Tag Git commit

### 3. Post-deployment Verification
- [ ] Export test video (text only)
- [ ] Export test video (with images)
- [ ] Download works without auth
- [ ] Check CloudWatch for errors
- [ ] Monitor first 10 exports

## Emergency Contacts

- AWS Support: https://console.aws.amazon.com/support
- Remotion Discord: https://discord.gg/remotion
- Internal Slack: #bazaar-vid-ops

---

**Remember**: Always test in staging before production deployment!