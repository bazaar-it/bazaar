# Image Embed vs Recreate Fix - Sprint 116

## Problem
The brain orchestrator was defaulting to "embed" mode for UI screenshots when it should have been choosing "recreate" mode. This caused the system to display screenshots as-is instead of rebuilding them as interactive components.

## Root Causes Identified

1. **Default behavior**: Vague prompts like "animate this" defaulted to "embed" instead of "recreate"
2. **MediaMetadata not used**: The MediaMetadataService wasn't passing hints to the brain decision
3. **Media validation too aggressive**: Valid R2 URLs were being marked as "hallucinated"
4. **Timing issue**: Metadata analysis is async, so tags aren't ready immediately after upload

## Changes Made

### 1. Brain Orchestrator Prompt (`brain-orchestrator.ts`)
- Changed default for vague prompts from "embed" to "recreate"
- Added UI/screenshot detection criteria
- Added keywords that trigger each mode:
  - **Recreate**: "recreate", "copy", "exactly", "replicate", "build", "make"
  - **Embed**: "inspired by", "based on", "similar to", "embed", "display", "show"
- Added metadata hint recognition (`kind:ui`, `layout:dashboard`, `hint:recreate`)

### 2. Intent Analyzer (`intentAnalyzer.ts`)
- Added extensive logging to track metadata flow
- Enhanced to pass image metadata hints to the brain
- Checks for relevant tags (`kind:`, `layout:`, `hint:`) in asset metadata

### 3. Media Validation Fix (`mediaContext.service.ts`)
- Fixed issue where R2 URLs were marked as "hallucinated"
- Added URL normalization for %20 encoding issues
- Allow all R2 URLs to pass validation

### 4. MediaMetadataService (`media-metadata.service.ts`)
- Added extensive logging throughout the analysis pipeline
- Logs AI response, detected tags, and recommendations

### 5. Upload Route (`upload/route.ts`)
- Added logging for metadata analysis start/completion
- Shows when tags are ready for use

## How It Works Now

1. **User uploads UI screenshot**
2. **MediaMetadataService analyzes** (async):
   - Detects `kind:ui`, `layout:dashboard`, etc.
   - Adds `hint:recreate` for UI content
3. **User says "animate this"**
4. **Brain sees**:
   - Vague prompt → defaults to recreate (new)
   - Image metadata hints (if ready)
   - UI detection rules
5. **Decision**: `imageAction: "recreate"`
6. **Result**: UI is rebuilt as components, not embedded

## Testing & Validation

Run the following to see the new logging:
```bash
npm run dev
# Upload a UI screenshot
# Say "animate this"
# Watch console for metadata flow
```

Key logs to watch for:
- `🔍 [MediaMetadata]` - Analysis pipeline
- `🔍 [INTENT]` - Metadata hints being passed
- `📸 [MEDIA VALIDATION]` - URL validation

## Known Limitations

1. **Timing**: If user immediately says "animate this" after upload, metadata tags might not be ready
2. **Async analysis**: MediaMetadata runs in background to not block upload
3. **First-time images**: No historical data for better predictions

## Future Improvements

1. Consider synchronous metadata for critical paths
2. Add quick visual analysis in brain if no tags
3. Cache common UI patterns for faster detection
4. Build historical data for better predictions