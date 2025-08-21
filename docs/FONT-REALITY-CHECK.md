# Font Rendering Reality Check

## The Problem
Lambda's headless Chrome **cannot load external fonts** (Google Fonts, etc.) during rendering. This is a fundamental limitation of the serverless environment.

## What Works vs What Doesn't

### ✅ Works in Preview (Browser)
- Google Fonts via CSS links
- Web fonts via @import
- Any external font service
- All 100+ fonts we tried to support

### ❌ Doesn't Work in Lambda Export
- Google Fonts
- External font services
- Any font not pre-installed in the system

### ✅ What ACTUALLY Works in Lambda
Only system fonts that are pre-installed in Lambda's environment:
- `sans-serif` (default)
- `serif`
- `monospace`
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

## The Hard Truth
**We cannot have custom fonts in Lambda exports without one of these solutions:**

### Option 1: Accept the Limitation
- Use only system fonts
- Design around this constraint
- Be honest with users about the limitation

### Option 2: Base64 Embed Fonts (Complex)
- Convert font files to base64
- Embed directly in CSS
- Huge file sizes
- Limited to a few fonts max

### Option 3: Custom Lambda Layer (Advanced)
- Create Lambda layer with fonts pre-installed
- Requires AWS expertise
- Additional deployment complexity
- Cost implications

### Option 4: Different Rendering Service
- Use a different rendering service that supports fonts
- Potentially higher costs
- More complex setup

## Recommended Solution
**For now: Use system fonts only**

Update AI prompts to only use:
```css
fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
```

This gives reasonable variety:
- Different weights (100-900)
- Italic variants
- Consistent across all platforms

## User Communication
Be transparent:
"Due to technical limitations in cloud rendering, custom fonts are only available in preview. Exported videos use system fonts."