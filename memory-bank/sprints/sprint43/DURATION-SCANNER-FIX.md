# Duration Scanner Fix - Avoiding False Positives

## Problem
The scanner detected `750` from what was likely a coordinate position (e.g., `[720, 750]` for pixel coordinates) and thought it was a 750-frame animation (26 seconds!).

## Solution Applied

1. **Pre-clean the code** before scanning:
   - Remove style position values: `top: 750, left: 800`
   - Remove translate/position arrays: `translate: [0, 750]`
   - Remove pixel values: `750px`

2. **More specific patterns**:
   - Only look for frame-related variables (containing "frame" in name)
   - Cap at 600 frames (20 seconds) as sanity check

3. **Context-aware scanning**:
   - `interpolate(frame, [0, 150], ...)` → This is animation timing ✅
   - `translate: [0, 750]` → This is positioning ❌

## Result
- 4-second animations won't be mistaken for 26-second ones
- Coordinate values (750px positions) won't trigger false positives
- Still catches real animation durations correctly