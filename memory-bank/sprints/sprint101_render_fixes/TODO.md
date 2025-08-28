# Sprint 101 - Render Fixes TODO

## Critical Issues

### 🔴 Lambda Render Failure - React Error #130
**Status**: Identified - Needs Fix  
**Priority**: P0 - Blocks exports  

**Problem**: Videos with Iconify icons fail to export due to undefined `window.IconifyIcon` in Lambda runtime.

**Tasks**:
- [ ] Debug AST transformation in `replace-iconify-icons.ts`
- [ ] Fix icon replacement to handle `window.IconifyIcon` references
- [ ] Test with failing scene code from logs
- [ ] Add validation for complete icon replacement
- [ ] Verify `Icons inlined: true` after fix

**Files**:
- `/src/server/services/render/replace-iconify-icons.ts`
- `/src/server/services/render/icon-loader.ts`
- `/src/server/services/render/render.service.ts`

### 🟡 Playback Speed Export Support  
**Status**: Architecture identified - Needs implementation  
**Priority**: P1 - User expectation  

**Problem**: Export system doesn't respect playback speed settings from preview.

**Tasks**:
- [ ] Add `playbackSpeed` parameter to render API schema
- [ ] Modify ExportDropdown to pass current speed
- [ ] Update render service to apply speed multiplier
- [ ] Test speed accuracy in exports (0.25x - 4x range)
- [ ] Validate frame timing consistency

**Files**:
- `/src/server/api/routers/render.ts`
- `/src/components/export/ExportDropdown.tsx`
- `/src/server/services/render/render.service.ts`

## Completed ✅

### Scene Loop Selection
**Status**: Working correctly in latest dev branch  
**Evidence**: Screenshot confirms dropdown functionality  
**Action**: No changes needed

## Analysis Documents

- `LAMBDA_RENDER_ERROR_130.md` - Detailed technical analysis of React error
- `LOOP_PLAYBACK_ANALYSIS.md` - Complete investigation results

## Next Steps

1. **Fix Lambda renders first** - Critical for user exports
2. **Implement playback speed export** - Important UX improvement  
3. **Test both fixes together** - Ensure compatibility

## Success Criteria

- [ ] Users can export videos with icons successfully
- [ ] Exported videos match preview playback speed
- [ ] No regression in existing export functionality
- [ ] Error handling improved for render failures