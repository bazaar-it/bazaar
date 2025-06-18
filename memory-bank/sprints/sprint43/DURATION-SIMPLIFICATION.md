# Duration Handling Simplification

## What Went Wrong
We added a complex scanner that runs AFTER generation, creating:
- False positives (detecting 750px coordinates as 750 frames)
- Conflicts with already-calculated durations
- Hacky workarounds to fix the scanner

## The Original Simple Approach

### ADD Scene
- `CodeGeneratorNEW` already uses `analyzeDuration()` to extract duration from generated code
- This happens during generation, not after
- Trust this duration!

### EDIT Scene  
- The AI should return `newDurationFrames` when animations extend beyond current duration
- The prompt wasn't asking for this - now fixed

### TRIM Scene
- Pure function, no AI needed

## Changes Made

1. **Removed scanner from ADD** - Trust the tool's duration calculation
2. **Removed scanner from EDIT** - Let AI handle it
3. **Updated EDIT prompt** - Now instructs AI to calculate duration when needed

## Result
- No more false positives from coordinates
- Simpler, cleaner code
- Duration handled at the right layer (during generation, not after)