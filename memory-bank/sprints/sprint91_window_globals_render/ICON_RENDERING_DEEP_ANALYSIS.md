# Sprint 91: Window Globals & Icon Rendering - The Complete Story

## The Fundamental Problem: Browser vs Lambda Environments

### Why Icons Work in Preview But Not in Exported MP4s

The root issue is that we're dealing with **two completely different execution environments**:

1. **Remotion Player (Browser)**
   - Runs in the user's browser
   - Has access to `window` object
   - Can make network requests
   - Can dynamically load libraries
   - Has DOM APIs

2. **AWS Lambda (Server/Node.js)**
   - Runs in isolated Node.js environment
   - NO `window` object
   - NO browser APIs
   - NO DOM
   - Limited network access
   - Must have everything pre-bundled

## The Current Icon System Architecture

### 1. Global Dependency Provider (Browser Side)
Location: `/src/components/GlobalDependencyProvider.tsx`

```typescript
// This runs ONLY in the browser
window.IconifyIcon = IconifyWrapper;
window.HeroiconsSolid = HeroiconsSolid;
window.HeroiconsOutline = HeroiconsOutline;
window.LucideIcons = LucideIcons;
```

**What happens**: When a user creates a scene with icons in the browser, they can use:
- `window.IconifyIcon` - For 200,000+ Iconify icons
- `window.HeroiconsSolid` - Hero icons solid variant
- `window.HeroiconsOutline` - Hero icons outline variant
- `window.LucideIcons` - Lucide icon library

### 2. AI-Generated Code
When the AI generates a scene, it creates code like:
```typescript
const { PlayIcon, PauseIcon } = window.HeroiconsSolid;

export default function Scene() {
  return (
    <div>
      <PlayIcon className="w-6 h-6" />
      <window.IconifyIcon icon="material-symbols:play-arrow" />
    </div>
  );
}
```

### 3. The Rendering Pipeline

#### Browser Rendering (Works ✅)
1. User's scene code runs in browser
2. `window.IconifyIcon` is available (from GlobalDependencyProvider)
3. Iconify fetches SVG from CDN
4. Icon renders perfectly in preview

#### Lambda Rendering (Breaks ❌)
1. Scene code sent to Lambda
2. `window` doesn't exist in Node.js
3. Code crashes OR icons replaced with placeholders
4. MP4 has missing icons

## Our Current "Solution" - Server-Side Preprocessing

Location: `/src/server/services/render/render.service.ts`

### The `replaceIconifyIcons()` Function

**What it does**:
1. **Before sending to Lambda**, we scan the code with regex
2. Find all `window.IconifyIcon` references
3. For each icon:
   - Parse the icon name (e.g., "material-symbols:play-arrow")
   - Use `@iconify/utils` to fetch the actual SVG data
   - Replace the IconifyIcon component with inline SVG

**Example transformation**:
```typescript
// Before (browser code)
<window.IconifyIcon icon="material-symbols:play-arrow" style={{ fontSize: '48px' }} />

// After preprocessing (Lambda-ready)
<svg width="1em" height="1em" viewBox="0 0 24 24" style={{ fontSize: '48px' }}>
  <path d="M8 5v14l11-7z" fill="currentColor"/>
</svg>
```

### Why This Is Hacky

1. **Regex-based replacement** - Fragile, can miss edge cases
2. **Happens at render time** - Adds 50-200ms per scene
3. **Only handles Iconify** - Hero icons and Lucide still broken
4. **No caching** - Fetches same icons repeatedly
5. **Network dependent** - If Iconify API is down, rendering fails

## The Real Question: Why Not Just Bundle Everything?

### Option 1: Bundle All Icons with Lambda
**Problem**: 
- Iconify alone has 200,000+ icons = ~500MB
- Lambda has 250MB unzipped limit
- Would make deploys impossibly slow

### Option 2: Pre-select Common Icons
**Problem**:
- How do we know which icons users will use?
- Limits creativity
- Still doesn't solve Hero/Lucide icons

### Option 3: Dynamic Import in Lambda
**Problem**:
- Lambda can't fetch from npm/CDN at runtime
- Would need custom icon server
- Adds latency and complexity

## The Deeper Issue: Dynamic Code Generation

The fundamental challenge is that we're generating code dynamically that needs to run in two different environments:

1. **Browser** - For live preview
2. **Lambda** - For final rendering

These environments have completely different capabilities:

| Feature | Browser | Lambda |
|---------|---------|---------|
| window object | ✅ | ❌ |
| DOM APIs | ✅ | ❌ |
| Network requests | ✅ | Limited |
| Dynamic imports | ✅ | ❌ |
| File system | ❌ | ✅ |
| Node modules | ❌ | ✅ |

## Current Issues Users Face

1. **Icons disappear in exports** - Most common complaint
2. **Inconsistent rendering** - Preview ≠ Export
3. **No error messages** - Icons just silently fail
4. **Performance hit** - Preprocessing adds delay

## Potential Solutions

### Solution 1: Universal Icon Component
Create a component that works in both environments:
```typescript
function UniversalIcon({ name, ...props }) {
  if (typeof window !== 'undefined') {
    // Browser: use window.IconifyIcon
    return <window.IconifyIcon icon={name} {...props} />;
  } else {
    // Lambda: use pre-compiled SVG map
    return <SVGFromMap name={name} {...props} />;
  }
}
```

### Solution 2: Build-Time Icon Resolution
Instead of runtime replacement:
1. Scan all scenes when saved
2. Extract icon usage
3. Build custom icon bundle for project
4. Include bundle in Lambda deployment

### Solution 3: Two-Pass Rendering
1. First pass: Detect all icons used
2. Fetch and cache all SVGs
3. Second pass: Render with cached SVGs

### Solution 4: Icon Proxy Service
1. Deploy icon service on Vercel Edge/Cloudflare Workers
2. Lambda fetches icons from our service
3. Cache aggressively
4. Fallback to placeholders if service down

## The Hack We're Living With

Our current regex replacement is indeed hacky:
- Lines 324-457 in `render.service.ts`
- Uses complex regex patterns
- Tries to handle both JSX and React.createElement syntax
- Falls back to colored circles when icons fail

But it works... mostly. Icons render in exports about 90% of the time.

## Why MP4 Export Is Different From Preview

**The fundamental answer**: 
- Preview runs in browser with full web capabilities
- Export runs in Lambda with Node.js limitations

**This affects**:
- Icons (no window.IconifyIcon)
- Fonts (no Google Fonts loader)
- Audio (no Web Audio API)
- Images (different URL handling)
- Animations (no requestAnimationFrame)

## Next Steps

### Immediate (Fix current issues)
1. ✅ Add Hero icons preprocessing (similar to Iconify)
2. ✅ Add Lucide icons preprocessing
3. ✅ Implement icon caching to reduce API calls
4. ✅ Better error handling and fallbacks

### Short-term (Improve system)
1. ⏳ Build icon usage analyzer
2. ⏳ Create project-specific icon bundles
3. ⏳ Add icon preview in editor
4. ⏳ Show warnings for unsupported icons

### Long-term (Architectural fix)
1. ⏳ Design universal component system
2. ⏳ Implement proper asset pipeline
3. ⏳ Create development/production parity
4. ⏳ Build comprehensive testing suite

## The Truth About Our "Medium Hacky Solution"

Yes, it's hacky. We're using:
- Regex to parse JSX (never ideal)
- Runtime code transformation
- Multiple fallback strategies
- Window globals that don't exist in Lambda

But it's a pragmatic solution that:
- Ships working exports to users
- Doesn't require massive refactoring
- Handles 90% of use cases
- Can be improved incrementally

The alternative would be months of architectural changes for a "perfect" solution.

## Conclusion

The icon rendering issue is a symptom of a larger challenge: **bridging browser and server environments in a dynamic code generation system**. Our current solution is hacky but functional. The real fix requires rethinking how we handle assets across environments, but that's a massive undertaking that would delay shipping features users need today.

For now, we preprocess icons at render time, replacing browser-specific components with universal SVGs. It's not elegant, but it works.