# CRITICAL: Icon Rendering Fix - Sprint 91

## THE PROBLEM IDENTIFIED

The AI is generating scenes with multiple icon libraries:
1. `window.IconifyIcon` - 200,000+ icons ✅ Currently handled
2. `window.HeroiconsSolid` - Hero icons solid ❌ NOT HANDLED
3. `window.HeroiconsOutline` - Hero icons outline ❌ NOT HANDLED  
4. `window.LucideIcons` - Lucide icons ❌ NOT HANDLED

Our `render.service.ts` ONLY preprocesses `window.IconifyIcon`, leaving all other icons as undefined in Lambda!

## IMMEDIATE FIX NEEDED

We need to update `preprocessSceneForLambda()` in `render.service.ts` to:

### 1. Replace Hero Icons References
```typescript
// Find patterns like:
const { PlayIcon, PauseIcon } = window.HeroiconsSolid;
// Or:
<window.HeroiconsSolid.PlayIcon className="w-6 h-6" />

// Replace with inline SVGs or placeholders
```

### 2. Replace Lucide Icons References
```typescript
// Find patterns like:
const { Play, Pause } = window.LucideIcons;
// Or:
<window.LucideIcons.Play size={24} />

// Replace with inline SVGs or placeholders
```

### 3. Handle Direct Usage
```typescript
// Direct component usage:
React.createElement(window.HeroiconsSolid.PlayIcon, { className: "w-6 h-6" })
```

## IMPLEMENTATION STRATEGY

### Option 1: Quick Placeholder Fix (Immediate)
Replace ALL unhandled icon references with colored circles:
- Fast to implement
- Gets exports working TODAY
- Icons missing but no crashes

### Option 2: Proper SVG Replacement (1-2 days)
1. Install Hero icons and Lucide on server
2. Map component names to SVG data
3. Replace with actual SVGs like we do for Iconify

### Option 3: Bundle Common Icons (Best long-term)
1. Analyze usage patterns
2. Pre-bundle top 100 most used icons
3. Include in Lambda deployment
4. Fall back to placeholders for rare icons

## RECOMMENDED IMMEDIATE ACTION

1. **TODAY**: Implement Option 1 - Replace all Hero/Lucide references with placeholders
2. **THIS WEEK**: Implement Option 2 - Proper SVG replacement
3. **NEXT SPRINT**: Consider Option 3 for performance

## CODE CHANGES NEEDED

In `/src/server/services/render/render.service.ts`:

1. Add function to handle Hero icons
2. Add function to handle Lucide icons
3. Call both in `preprocessSceneForLambda()`
4. Test with real scene exports

This will fix the "0 out of 20 icons rendered" problem immediately!