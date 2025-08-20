# Font System Documentation

## Overview
The Bazaar-Vid font system uses CSS @import to load fonts from Google Fonts CDN. This approach works seamlessly in both local development and AWS Lambda rendering without any JavaScript font loading complications.

## How It Works

### 1. Font Definition
All fonts are defined in `fonts.css` using CSS @import statements:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
```

### 2. Font Loading
- MainCompositionSimple.tsx imports `fonts.css`
- Remotion automatically waits for CSS fonts to load before rendering
- No JavaScript `loadFont()` calls that could trigger `cancelRender()` errors

### 3. Rendering Environments
- **Local Preview**: Chrome loads fonts from Google Fonts CDN
- **Lambda Export**: Chrome in Lambda loads fonts from Google Fonts CDN
- **Browser Support**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## File Structure
```
src/remotion/fonts/
├── fonts.css           # 100+ Google Fonts via @import
├── README.md          # This documentation
└── _archive/          # Legacy font loading code (deprecated)
```

## Adding New Fonts

To add a new font:
1. Go to [Google Fonts](https://fonts.google.com)
2. Select your font and weights
3. Copy the @import URL
4. Add it to `fonts.css`

Example:
```css
@import url('https://fonts.googleapis.com/css2?family=NewFont:wght@400;700&display=swap');
```

## Using Fonts in Components

Simply reference the font family in your styles:
```jsx
<div style={{ fontFamily: 'Inter, sans-serif' }}>
  Your text here
</div>
```

## Why This Approach?

### Benefits
- ✅ No `cancelRender()` errors in Lambda
- ✅ Works identically in local and production
- ✅ Supports unlimited Google Fonts
- ✅ Simple and maintainable
- ✅ Browser handles caching automatically

### Previous Issues (Now Solved)
- ❌ JavaScript `loadFont()` would call `cancelRender()` on network errors
- ❌ Lambda couldn't fetch fonts due to VPC restrictions
- ❌ Complex font catalog management
- ❌ Different behavior between local and Lambda

## Performance

- Google Fonts CDN is highly optimized with global edge servers
- Browsers cache fonts automatically
- WOFF2 format provides excellent compression
- Only requested fonts are downloaded (not the entire catalog)

## Troubleshooting

### Font not showing?
1. Check if the font is included in `fonts.css`
2. Verify the font name matches exactly (case-sensitive)
3. Check browser console for any CSS errors

### Lambda render issues?
- CSS fonts should work automatically
- If issues persist, check Lambda logs for network errors
- Ensure Lambda has internet access (not in restricted VPC)

## Migration from Old System

The old system used:
- JavaScript `loadFont()` from `@remotion/fonts`
- Local font files in `public/fonts/`
- Complex catalog management
- Multiple loader implementations

All of this has been replaced with a single `fonts.css` file that works everywhere.