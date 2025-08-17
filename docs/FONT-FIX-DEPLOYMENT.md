# Font Rendering Fix - Deployment Guide

## Problem Solved
Users (like Ravi) were experiencing font inconsistencies between preview and exported videos. The preview showed correct fonts (Inter, Roboto, etc.) but exported videos fell back to generic sans-serif.

## Root Cause
- **Preview**: Browser has access to web fonts via CSS or system fonts
- **Lambda Render**: Headless Chrome doesn't have these fonts installed
- **User Code**: Specifies `fontFamily: "Inter, sans-serif"` which renders differently

## Solution Implemented

### 1. FontLoader Component (`/src/remotion/FontLoader.tsx`)
- Loads 15 common Google Fonts via CSS
- Works in both browser and Lambda environments
- Uses Remotion's `delayRender` to ensure fonts load before rendering

### 2. MainComposition Update (`/src/remotion/MainComposition.tsx`)
- Wraps video composition with FontLoader
- Ensures fonts are loaded during Lambda render

### 3. Preview Panel Update (`/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`)
- Adds font loading to preview for consistency
- Same fonts loaded in both preview and export

## Fonts Supported
- Inter (most popular)
- Roboto
- Poppins
- Montserrat
- Open Sans
- Lato
- Playfair Display
- Raleway
- Ubuntu
- Oswald
- Bebas Neue
- Roboto Condensed
- Source Sans Pro
- Nunito
- Work Sans

## Deployment Steps

### 1. Test Locally
```bash
# Test the preview
npm run dev
# Navigate to any project and verify fonts load in console

# Test local render (optional)
npx remotion render src/remotion/MainComposition.tsx MainComposition test.mp4
```

### 2. Build and Deploy Lambda Site
```bash
# Build the Remotion bundle
npx remotion bundle src/remotion/MainComposition.tsx

# Deploy to Lambda (creates new site URL)
npx remotion lambda sites create --site-name "bazaar-vid-fonts-fixed"

# Note the new site URL that's returned
```

### 3. Update Environment Variable
Update the `.env` or `.env.production` file:
```env
REMOTION_SERVE_URL=https://remotionlambda-useast1-xxxxx.s3.us-east-1.amazonaws.com/sites/bazaar-vid-fonts-fixed/index.html
```

### 4. Verify Lambda Function
```bash
# Check that Lambda function exists
npx remotion lambda functions ls

# If not, deploy it
npx remotion lambda functions deploy
```

### 5. Test Export
1. Create a test project with text using Inter font
2. Export the video
3. Download and verify fonts render correctly

## Verification Checklist
- [ ] Console shows "[Bazaar] Google Fonts loaded for consistent rendering" in preview
- [ ] Console shows "[FontLoader] Loading Google Fonts: 15 font families" during export
- [ ] Exported videos show correct fonts (not generic sans-serif)
- [ ] No rendering delays or timeouts

## Rollback Plan
If issues occur:
1. Revert to previous REMOTION_SERVE_URL
2. Remove FontLoader from MainComposition
3. Redeploy previous Lambda site

## Performance Impact
- Adds ~100-200ms to initial render time (fonts loading)
- Cached after first load
- No impact on video quality or file size

## Future Improvements
1. Add more fonts based on user requests
2. Create font picker UI for users
3. Cache fonts in Lambda layer for faster loads
4. Add custom font upload support