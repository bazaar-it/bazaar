# Canvas Overflow Issue Analysis

## Problem Description
AI-generated content is rendering outside the video canvas boundaries, as shown in the screenshot where Product Hunt UI elements extend beyond the intended video area.

## Root Cause Analysis

### 1. Hardcoded Video Dimensions
- PreviewPanelG.tsx hardcodes video dimensions to 1280x720 (lines 634-635)
- This creates a fixed canvas size regardless of content

### 2. AI Prompt Instructions Are Too Vague
Current prompts say:
```
- VIEWPORT: Design content to fit any canvas size - use useVideoConfig() for dimensions
- Use relative/percentage positioning and responsive sizing based on width/height
- Avoid absolute positions that assume specific canvas dimensions
```

But they don't enforce strict boundaries or overflow prevention.

### 3. Missing Canvas Boundary Enforcement
- No explicit instruction to contain ALL content within canvas bounds
- No mention of overflow: 'hidden' on container elements
- No guidance on safe zones or margins

## Immediate Fix: Enhanced AI Prompts

### Update code-generator.ts
Add these CRITICAL rules:
```typescript
🚨 CANVAS BOUNDARY RULES:
1. ALL content MUST be contained within the video canvas
2. Always start with AbsoluteFill that has overflow: 'hidden'
3. Use the canvas dimensions from useVideoConfig() to constrain content:
   const { width, height } = useVideoConfig();
4. NEVER position elements outside 0 to width (horizontal) or 0 to height (vertical)
5. Add safety margins: Keep critical content at least 5% away from edges
6. For absolutely positioned elements, ensure:
   - left/right values never exceed canvas width
   - top/bottom values never exceed canvas height
7. Use maxWidth: '100%' and maxHeight: '100%' on large elements
8. Test your layout mentally: "Would this fit in a 1280x720 box?"
```

### Update code-editor.ts
Add similar rules for edits:
```typescript
🖼️ CANVAS SAFETY RULES:
1. When positioning elements, respect canvas boundaries
2. Use overflow: 'hidden' on containers to prevent content spillover
3. Calculate positions relative to width/height from useVideoConfig()
4. Safe positioning formula:
   - Horizontal: Math.min(Math.max(0, position), width - elementWidth)
   - Vertical: Math.min(Math.max(0, position), height - elementHeight)
```

## Long-term Solution: Dynamic Canvas Support

As documented in Sprint 48, we need:
1. Dynamic video dimensions based on project format
2. Format-aware AI generation
3. Proper preview scaling

## Example of Proper Canvas-Constrained Code

```typescript
export default function ProductHuntScene() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  
  // Safety margins (5% from edges)
  const safeZone = {
    left: width * 0.05,
    right: width * 0.95,
    top: height * 0.05,
    bottom: height * 0.95
  };
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#fff',
      overflow: 'hidden' // CRITICAL: Prevents content overflow
    }}>
      {/* Main content container with safe margins */}
      <div style={{
        position: 'absolute',
        left: safeZone.left,
        top: safeZone.top,
        width: safeZone.right - safeZone.left,
        height: safeZone.bottom - safeZone.top,
        overflow: 'hidden' // Double protection
      }}>
        {/* Content goes here, constrained within safe zone */}
      </div>
    </AbsoluteFill>
  );
}
```

## Testing the Fix

1. Update both prompts with strict canvas boundary rules
2. Regenerate the Product Hunt scene
3. Verify all content stays within the black video area
4. Test with different types of content (text, images, animations)

## Prevention Strategy

1. **Immediate**: Update AI prompts with explicit boundary rules
2. **Short-term**: Add visual guides in preview showing canvas boundaries
3. **Long-term**: Implement dynamic canvas sizing per Sprint 48 plan
4. **Validation**: Add a linting step that checks for overflow issues