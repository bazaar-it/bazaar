# Export Troubleshooting Guide

## Common Issues and Solutions

### 1. "Invalid Scene" or Placeholder Content in Export

**Symptoms**: 
- Export works but video shows placeholder content
- "Invalid Scene: Scene 1 - This scene could not be compiled"

**Root Causes**:
1. TypeScript/JSX not compiled for Lambda
2. `window.Remotion` references in code
3. Missing scene preprocessing

**Solution**:
- Implement server-side preprocessing (see export-lambda-implementation.md)
- Use MainCompositionSimple.tsx for Lambda
- Ensure `jsCode` field is populated with compiled JavaScript

### 2. "Access Denied" on S3 URLs

**Symptoms**:
- Export completes but download link shows AccessDenied
- URL format: `https://bucketname.s3.region.amazonaws.com/...`

**Solution**:
- Parse the public S3 URL from CLI output
- Look for: `+ S3 https://s3.us-east-1.amazonaws.com/...`
- Use this URL format instead of bucket-specific URLs

### 3. Duration Mismatch Errors

**Symptoms**:
- "durationInFrames was 300, but frame range 0-434 is not inbetween"

**Solution**:
- Use `calculateMetadata` in MainComposition
- Calculate total duration from all scenes:
```typescript
calculateMetadata={({ props }) => {
  const totalDuration = (props.scenes || []).reduce(
    (sum: number, scene: any) => sum + (scene.duration || 150),
    0
  );
  return { durationInFrames: totalDuration || 300 };
}}
```

### 4. Webpack Bundling Errors

**Symptoms**:
- "Module not found: @remotion/compositor-win32-x64-msvc"

**Solution**:
Add to next.config.js:
```javascript
webpack: (config) => {
  config.externals = [
    ({ request }, callback) => {
      if (request?.includes('@remotion/compositor-')) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ];
  return config;
}
```

### 5. Scene Code Not Found

**Symptoms**:
- Logs show "No code found for scene"
- `hasJsCode: false` in DynamicScene logs

**Check**:
1. Scene structure - is code in `scene.tsxCode` or `scene.data.code`?
2. Preprocessing - is `preprocessSceneForLambda` being called?
3. Data passing - verify scenes are passed through `prepareRenderConfig`

## Debugging Steps

### 1. Check Preprocessing Logs
Look for server logs:
```
[Preprocess] Checking scene: { id: '...', hasTsxCode: true }
[Preprocess] Scene ... transformed for Lambda
[Preprocess] Original code starts with: const { AbsoluteFill...
[Preprocess] Transformed code starts with: const Component = function...
```

### 2. Check Lambda Logs
In CloudWatch or CLI output:
```
[DynamicScene] Scene 0: {
  hasJsCode: true,
  hasTsxCode: true,
  name: 'Scene',
  codePreview: 'const Component = function...'
}
```

### 3. Test Locally
```bash
# Test with a simple scene
npx remotion lambda render MainComposition \
  --props='{"scenes":[{"id":"test","tsxCode":"...","duration":150}]}'
```

### 4. Verify Site Deployment
```bash
# Redeploy if needed
npx remotion lambda sites create src/remotion/index.tsx --site-name="bazaar-vid"
```

## Performance Tips

1. **Pre-compile on server**: Don't compile in Lambda
2. **Minimize bundle size**: Remove unused dependencies
3. **Use appropriate memory**: 3GB for 1080p is sufficient
4. **Cache site deployments**: Don't redeploy unnecessarily

## Cost Optimization

- Single scene (5s): ~$0.001
- Multi-scene (30s): ~$0.004
- Complex animations may cost more due to rendering time

## When to Contact Support

If you see:
- Consistent Lambda timeouts
- AWS permission errors
- Remotion license issues
- Unexpected high costs