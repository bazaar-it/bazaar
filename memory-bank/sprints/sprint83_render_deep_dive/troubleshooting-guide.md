# Comprehensive Troubleshooting Guide: Video Rendering

## Common Issues and Solutions

### 1. Export Button Not Working

#### Symptoms
- Export button disabled or unresponsive
- No modal appears when clicking export

#### Diagnosis
```bash
# Check environment variables
echo $RENDER_MODE
# Expected: lambda

echo $AWS_REGION
# Expected: us-east-1 (or your region)

echo $REMOTION_FUNCTION_NAME
# Expected: remotion-render-xxx
```

#### Solutions
1. **Missing Environment Variables**
   ```bash
   # Add to .env.local
   RENDER_MODE=lambda
   AWS_REGION=us-east-1
   REMOTION_FUNCTION_NAME=your-function-name
   REMOTION_BUCKET_NAME=your-bucket-name
   ```

2. **Frontend State Issue**
   ```typescript
   // Check if project has scenes
   console.log(scenes.length); // Should be > 0
   
   // Check if user is authenticated
   console.log(session?.user); // Should exist
   ```

### 2. Render Fails Immediately

#### Symptoms
- Error appears right after clicking export
- No progress shown

#### Common Errors

**"Daily export limit reached"**
- Cause: User exceeded 10 exports/day
- Solution: Wait until next day or upgrade plan

**"Project has no scenes"**
- Cause: Empty project
- Solution: Add at least one scene

**"Video too long"**
- Cause: Total duration > 30 minutes
- Solution: Reduce number of scenes

**"Lambda configuration incomplete"**
```typescript
// Check Lambda setup
aws lambda get-function --function-name $REMOTION_FUNCTION_NAME

// Should return function details
// If not, deploy Lambda:
npx remotion lambda functions deploy
```

### 3. Render Starts but Fails During Processing

#### Symptoms
- Progress bar starts but stops
- Error after some processing

#### Debug Steps

1. **Check Lambda Logs**
   ```bash
   # View recent logs
   aws logs tail /aws/lambda/$REMOTION_FUNCTION_NAME --follow
   
   # Search for errors
   aws logs filter-log-events \
     --log-group-name /aws/lambda/$REMOTION_FUNCTION_NAME \
     --filter-pattern "ERROR"
   ```

2. **Common Lambda Errors**

   **"Cannot find module '@remotion/lambda'"**
   - Cause: Lambda deployment incomplete
   - Solution: Redeploy Lambda function
   ```bash
   npx remotion lambda functions deploy
   ```

   **"Timeout: Task timed out after 900 seconds"**
   - Cause: Video too complex or long
   - Solution: Increase Lambda timeout or reduce complexity

   **"Runtime.ImportModuleError"**
   - Cause: Missing dependencies in Lambda
   - Solution: Check Lambda layer configuration

3. **Scene Compilation Errors**
   ```typescript
   // In browser console during development
   window.addEventListener('scene-compilation-error', (e) => {
     console.log('Scene error:', e.detail);
   });
   ```

### 4. Wrong Video Format/Dimensions

#### Symptoms
- Portrait video exported as landscape
- Square video has wrong aspect ratio
- Black bars or stretched content

#### Diagnosis
```typescript
// Check project metadata
console.log(project.props?.meta);
// Should show: { format: 'portrait', width: 1080, height: 1920 }

// Check render config
console.log(renderConfig);
// Should show: { renderWidth: 1080, renderHeight: 1920 }
```

#### Solutions

1. **Project Format Not Set**
   ```typescript
   // Ensure project has correct metadata
   await db.update(projects).set({
     props: {
       meta: {
         format: 'portrait', // or 'landscape', 'square'
         width: 1080,
         height: 1920
       }
     }
   }).where(eq(projects.id, projectId));
   ```

2. **Lambda Using Wrong Dimensions**
   - Check lambda-render.service.ts passes renderWidth/renderHeight
   - Verify MainCompositionSimple uses provided dimensions

### 5. Download Fails

#### Symptoms
- Export completes but download doesn't start
- "Access Denied" error when downloading

#### Solutions

1. **S3 Bucket Permissions**
   ```bash
   # Run setup script
   npm run setup:s3-public
   
   # Or manually set bucket policy
   aws s3api put-bucket-policy --bucket $REMOTION_BUCKET_NAME --policy '{
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicReadGetObject",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::bucket-name/*"
     }]
   }'
   ```

2. **CORS Configuration**
   ```json
   {
     "CORSRules": [{
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }]
   }
   ```

### 6. Slow Rendering Performance

#### Symptoms
- Rendering takes > 5 minutes for short videos
- Progress updates slowly

#### Optimization Steps

1. **Check Lambda Memory**
   ```bash
   # Get current configuration
   aws lambda get-function-configuration \
     --function-name $REMOTION_FUNCTION_NAME
   
   # Increase memory (also increases CPU)
   aws lambda update-function-configuration \
     --function-name $REMOTION_FUNCTION_NAME \
     --memory-size 3008
   ```

2. **Analyze Scene Complexity**
   - Reduce number of animated elements
   - Simplify effects and transitions
   - Use lower quality for testing

3. **Check Lambda Metrics**
   ```bash
   # View performance metrics in CloudWatch
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --dimensions Name=FunctionName,Value=$REMOTION_FUNCTION_NAME \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-02T00:00:00Z \
     --period 3600 \
     --statistics Average
   ```

### 7. Icon-Related Errors

#### Symptoms
- "Cannot read property 'icon' of undefined"
- Missing icons in rendered video
- Placeholder circles instead of icons

#### Solutions

1. **Icon Not Found**
   ```typescript
   // Check if icon exists
   import { loadNodeIcon } from '@iconify/utils/lib/loader/node-loader';
   const icon = await loadNodeIcon('mdi', 'play-arrow');
   console.log(icon); // Should return SVG string
   ```

2. **Icon Processing Failed**
   - Check render.service.ts replaceIconifyIcons function
   - Verify icon name format: "collection:icon-name"
   - Use valid Iconify collections

### 8. Memory/State Issues

#### Symptoms
- Previous render status shows for new renders
- Progress doesn't update
- Duplicate render IDs

#### Solutions

1. **Clear Render State**
   ```typescript
   // In development console
   renderState.clear();
   
   // Or restart development server
   npm run dev
   ```

2. **Database Sync Issues**
   ```sql
   -- Check export tracking
   SELECT * FROM export_tracking 
   WHERE user_id = 'xxx' 
   ORDER BY created_at DESC;
   
   -- Clean up orphaned records
   DELETE FROM export_tracking 
   WHERE status = 'pending' 
   AND created_at < NOW() - INTERVAL '1 day';
   ```

## Advanced Debugging

### 1. Enable Debug Logging

```typescript
// Add to .env.local
DEBUG=remotion:*
REMOTION_LOG_LEVEL=verbose

// In your code
console.log('[Render Debug]', {
  scenes: scenes.map(s => ({
    id: s.id,
    codeLength: s.tsxCode?.length,
    hasJsCode: !!s.jsCode
  })),
  config: renderConfig,
  lambdaInput: inputProps
});
```

### 2. Test Scene Preprocessing Locally

```typescript
// Create test script: test-preprocess.ts
import { preprocessSceneForLambda } from './src/server/services/render/render.service';

const testScene = {
  id: 'test-1',
  tsxCode: `
    export default function TestScene() {
      return <AbsoluteFill>Test</AbsoluteFill>;
    }
  `
};

const result = await preprocessSceneForLambda(testScene);
console.log('Preprocessed:', result.jsCode);
```

### 3. Lambda Local Testing

```bash
# Test Lambda function locally
npx remotion lambda functions invoke \
  --function-name $REMOTION_FUNCTION_NAME \
  --payload '{"serveUrl": "...", "composition": "MainComposition", ...}'
```

### 4. Monitor AWS Resources

```bash
# Check Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=$REMOTION_FUNCTION_NAME \
  --statistics Sum \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 86400

# Check S3 usage
aws s3 ls s3://$REMOTION_BUCKET_NAME/renders/ --recursive --summarize
```

## Emergency Procedures

### 1. Lambda Function Broken
```bash
# Rollback to previous version
aws lambda update-function-code \
  --function-name $REMOTION_FUNCTION_NAME \
  --s3-bucket $REMOTION_BUCKET_NAME \
  --s3-key deployments/previous-version.zip
```

### 2. S3 Access Issues
```bash
# Temporarily allow all access (NOT for production)
aws s3api put-bucket-acl \
  --bucket $REMOTION_BUCKET_NAME \
  --acl public-read
```

### 3. Complete System Reset
```bash
# 1. Clear Lambda logs
aws logs delete-log-group \
  --log-group-name /aws/lambda/$REMOTION_FUNCTION_NAME

# 2. Redeploy Lambda
npx remotion lambda functions deploy

# 3. Redeploy site
npx remotion lambda sites create --site-name="bazaar-vid-v3-prod"

# 4. Clear database
# Run SQL to clear export_tracking table

# 5. Restart application
npm run build && npm run start
```

## Prevention Checklist

### Before Deployment
- [ ] Test export with all formats (MP4, WebM, GIF)
- [ ] Test all quality settings
- [ ] Test portrait, landscape, and square videos
- [ ] Verify S3 permissions
- [ ] Check Lambda timeout settings
- [ ] Monitor AWS costs

### Regular Maintenance
- [ ] Clean up old S3 renders (> 30 days)
- [ ] Review Lambda logs for errors
- [ ] Update Remotion dependencies
- [ ] Check AWS service limits
- [ ] Backup export tracking data

---

*Last Updated: 2025-07-22*
*For urgent issues, check CloudWatch logs and contact AWS support*