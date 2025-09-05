# Audio Context Strategy for Chrome Autoplay Policy

## Problem
Chrome's autoplay policy prevents creating AudioContext without user interaction, causing console warnings:
```
The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.
```

## Solution: Lazy AudioContext with User Gesture

### Implementation
Created `~/lib/utils/audioContext.ts` that:
1. **Waits for user gesture** - Detects first click, touch, or keypress
2. **Creates context lazily** - Only when needed and after interaction
3. **Manages singleton** - One context instance across the app
4. **Handles resume** - Automatically resumes suspended contexts

### Usage Pattern
```typescript
// ❌ Old way (causes warnings)
const audioContext = new AudioContext();

// ✅ New way (compliant)
import { getAudioContext, enableAudioWithGesture } from '~/lib/utils/audioContext';

// In click handlers
const handleClick = () => {
  const ctx = enableAudioWithGesture(); // Force enable with gesture
  // Use ctx for audio processing
};

// In other contexts
const ctx = getAudioContext(); // Returns null if no gesture yet
if (ctx) {
  // Safe to use audio context
}
```

## Applied Changes

### 1. Timeline Waveform Generation
**File**: `TimelinePanel.tsx`
- Uses lazy AudioContext for waveform visualization
- Gracefully fails with empty waveform if no user gesture
- No more console warnings on page load

### 2. Voice Input
**File**: `VoiceInput.tsx` 
- Enables AudioContext when user clicks microphone
- Ensures audio permissions work with gesture-based context
- Both VoiceInput variants updated

### Benefits
- ✅ **No console warnings** - Complies with Chrome policy
- ✅ **Better UX** - Audio features work when user expects them
- ✅ **Graceful degradation** - Falls back cleanly without gesture
- ✅ **Performance** - No unnecessary audio contexts created

### Browser Support
- Chrome/Edge: Full support for autoplay policy
- Firefox: Similar policies supported
- Safari: Compatible with webkit audio context
- Fallback: Works with older browsers

## Future Considerations

### Additional Audio Features
When adding new audio functionality:
1. Always use the audioContext manager
2. Handle the null case gracefully
3. Enable context in user interaction handlers

### Testing
- Test in private/incognito mode (stricter policies)
- Verify no console warnings on fresh page load
- Confirm audio works after user interaction

## Migration Pattern
```typescript
// Before
const audioCtx = new AudioContext();

// After
import { getAudioContext, enableAudioWithGesture } from '~/lib/utils/audioContext';
const audioCtx = getAudioContext();
if (!audioCtx) {
  console.warn('Audio requires user interaction');
  return;
}
```