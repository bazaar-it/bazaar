# Loop & Playback Speed Analysis Results

**Date**: 2025-08-28  
**Status**: COMPLETED  
**Sprint**: 101 - Render Fixes

## Issues Reported

1. **Scene loop selection not working** - "no way of selecting which scene to loop"
2. **Playback speed only affecting preview** - "playback speed only in the preview? when downloaded to mp4, the playback speed revert back?"

## Investigation Results

### Issue 1: Scene Loop Selection ✅ RESOLVED

**Status**: Working correctly in latest dev branch

**Evidence**: Screenshot shows functional scene selector dropdown with "Select Scene" option when loop state is set to 'scene'.

**Technical Details**:
- Component: `/src/components/ui/LoopToggle.tsx`
- Condition: `{loopState === 'scene' && scenes.length > 0}`
- Dropdown appears correctly when conditions met
- Scene selection functionality operational

### Issue 2: Playback Speed Export ✅ IDENTIFIED - NEEDS FIX

**Status**: Root cause identified - architectural limitation

**Problem**: Export system doesn't receive playback speed parameter

**Technical Analysis**:
- Playback speed only affects Remotion Player preview via `speed` prop
- Export API (`startRender`) accepts: `projectId`, `format`, `quality` only
- No `playbackSpeed` parameter passed to render pipeline
- Lambda renders use original timing, ignoring UI speed settings

**Code Evidence**:
```typescript
// ExportDropdown.tsx - Only passes format/quality
startRender.mutate({ 
  projectId,
  format: selectedFormat || format,
  quality: qualityMap[selectedQuality || quality],
  // ❌ Missing: playbackSpeed parameter
});

// render.ts API schema - No speed parameter
.input(z.object({
  projectId: z.string(),
  format: z.enum(['mp4', 'webm', 'gif']).default('mp4'),
  quality: z.enum(['low', 'medium', 'high']).default('high'),
  // ❌ Missing: playbackSpeed: z.number().optional()
}))
```

## Architecture Analysis

### Current Flow
```
User sets speed (0.25x - 4x) → UI state → Remotion Player preview only
Export button → API (no speed) → Lambda render → Original speed MP4
```

### Required Flow  
```
User sets speed → UI state → Export API (with speed) → Lambda render (with speed multiplier) → Speed-adjusted MP4
```

## Files Involved

### Loop System (Working)
- `/src/components/ui/LoopToggle.tsx` - Scene selector component
- `/src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx` - Loop state management

### Playback Speed System (Needs Fix)
- `/src/components/ui/PlaybackSpeedSlider.tsx` - UI component (working)
- `/src/components/export/ExportDropdown.tsx` - Export trigger (missing speed)
- `/src/server/api/routers/render.ts` - API endpoint (missing speed parameter)
- `/src/server/services/render/render.service.ts` - Render logic (needs speed support)

## Solution Required for Playback Speed

### Phase 1: API Extension
1. Add `playbackSpeed?: number` to render API schema
2. Modify ExportDropdown to pass current speed setting
3. Update render service to accept speed parameter

### Phase 2: Render Implementation  
1. Apply speed multiplier to frame calculations in Lambda
2. Adjust scene durations based on speed multiplier
3. Test with various speed settings (0.25x - 4x)

### Phase 3: Validation
1. Verify exported MP4 matches preview speed
2. Test edge cases (very slow/fast speeds)
3. Ensure frame accuracy maintained

## Priority Assessment

- **Scene Loop**: ✅ Working - No action needed
- **Playback Speed Export**: 🔴 High priority - User expectation mismatch
  - Users expect export to match preview speed
  - Currently misleading UX (speed preview doesn't affect export)
  - Requires backend architecture changes

## Recommendation

Implement playback speed export support as it's a fundamental user expectation that preview speed should match export speed. The current behavior is confusing and limits the utility of the speed control feature.