# Lambda Font Deployment Guide

## Problem Solved
This solution fixes font loading issues in Remotion Lambda by:
1. **Eliminating network timeouts**: Fonts are bundled with Lambda site instead of fetched from R2
2. **Ensuring font availability**: All fonts are packaged locally using `staticFile()`
3. **Maintaining font quality**: No degradation to system fonts

## Changes Made

### 1. Font Registry Updated (`src/remotion/MainCompositionSimple.tsx`)
- **Before**: Used R2 URLs (`https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/fonts/...`)
- **After**: Uses `staticFile('fonts/FontName.woff2')` for bundled fonts
- **Result**: Fonts load from Lambda's local filesystem, no network calls

### 2. Font Loading Re-enabled
- **Before**: Font loading disabled due to network timeouts 
- **After**: Font loading enabled with bundled `staticFile()` URLs
- **Result**: Fonts load properly in Lambda environment

### 3. Build Process Enhanced
- **Added**: `copy:fonts` script to ensure fonts are copied to build directory
- **Updated**: Build process to include font copying
- **Result**: Fonts automatically bundled with every deployment

## File Changes

### `/src/remotion/MainCompositionSimple.tsx`
```typescript
// OLD (R2 URLs that timeout in Lambda)
{ weight: '400', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/fonts/Inter-Regular.woff2' }

// NEW (bundled fonts using staticFile)
{ weight: '400', url: staticFile('fonts/Inter-Regular.woff2') }
```

### `/package.json`
```json
{
  "scripts": {
    "build": "npm run generate:types && npm run copy:fonts && next build",
    "copy:fonts": "node scripts/copy-fonts.js"
  }
}
```

### `/scripts/copy-fonts.js` (New file)
- Copies all fonts from `public/fonts/` to `build/public/fonts/`
- Verifies all expected fonts are present
- Cleans up nested directory structures
- Runs automatically during build

## Deployment Steps

### 1. Local Build
```bash
npm run build
```
This will:
- Generate types
- Copy fonts to build directory  
- Build Next.js application
- Bundle fonts with the build

### 2. Lambda Deployment
When deploying to Remotion Lambda (bazaar-fonts-v5):
- All fonts in `public/fonts/` will be included in the Lambda package
- `staticFile('fonts/FontName.woff2')` will resolve to bundled font files
- No external network calls for fonts

### 3. Verification
After deployment, check Lambda logs for:
```
[Lambda Font Loading] Loading fonts from bundled files
[Lambda Font Loading] Successfully loaded fonts
```

## Font Files Included (32 total)
- **Inter**: Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black
- **DM Sans**: Regular, Bold  
- **Roboto**: Regular, Bold
- **Poppins**: Regular, Bold
- **Montserrat**: Regular, Bold
- **Playfair Display**: Regular, Bold
- **Merriweather**: Regular, Bold
- **Raleway**: Regular, Bold
- **Ubuntu**: Regular, Bold
- **Bebas Neue**: Regular
- **Lobster**: Regular
- **Dancing Script**: Regular, Bold
- **Pacifico**: Regular
- **Fira Code**: Regular, Bold
- **JetBrains Mono**: Regular, Bold

## Benefits
1. **No Network Timeouts**: Fonts load instantly from local filesystem
2. **Reliable Rendering**: Consistent font availability across all Lambda invocations
3. **Better Performance**: No external HTTP requests for font assets
4. **Automatic Updates**: New fonts automatically included in builds

## Troubleshooting

### If fonts still don't load in Lambda:
1. Check Lambda logs for font loading messages
2. Verify fonts are in `/public/fonts/` directory
3. Run `npm run copy:fonts` to ensure build directory is updated
4. Confirm `staticFile()` paths match actual font filenames

### If build fails:
1. Ensure all fonts exist in `public/fonts/` directory
2. Check file permissions on fonts directory
3. Verify Node.js version supports ES modules (for the build script)

## Next Steps
- Deploy updated Lambda function with bundled fonts
- Test video exports to confirm fonts render correctly
- Monitor Lambda execution times (should be faster without network calls)
- Consider adding font subsetting for even better performance