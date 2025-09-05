# Testing Guide: Code Generator V3 (Taste-Focused)

## Quick Test in Anthropic Console

### 1. System Prompt
Use the same system prompt from code-generator.ts, but add this taste manifesto at the end:

```
TASTE PRINCIPLES:
- Premium motion graphics have generous spacing - never cramped
- Professional animations use intentional timing - never rushed  
- Great design breathes - elements have room to exist
- Sophisticated color use - purposeful, never random
- Typography matters - size, weight, spacing all deliberate
- Less is more - every element serves a purpose
```

### 2. Messages Array
Copy the 3 examples from code-generator-v3-taste.ts in this order:
1. UI Data Visualization (sets sophisticated tone)
2. Message Notification (demonstrates polish)  
3. Performance Bar Chart (shows cinematic drama)

### 3. Test Prompts to Try

**Test 1 - Finance/Professional:**
"Create a stock trading dashboard with live price updates"

**Test 2 - Social/Engagement:**  
"Show a like counter animating up with celebration effects"

**Test 3 - Data/Analytics:**
"Display KPI cards revealing quarterly growth metrics"

**Test 4 - UI Component:**
"Design a premium pricing card with features appearing"

## Expected Improvements

With 3 taste-focused examples vs 9 generic ones:

### Before (9 examples):
- Token dilution - too many patterns confuse the model
- Generic outputs - tries to average all examples
- Inconsistent quality - no clear taste standard

### After (3 taste examples):
- Clear design language established
- Premium feel in every generation
- Consistent spacing and timing
- Professional color choices
- Sophisticated animations

## Quick A/B Test

1. **Control**: Original system prompt only
2. **Test A**: 9 examples (code-generator-v2.ts)
3. **Test B**: 3 taste examples (code-generator-v3-taste.ts)

Generate same prompt with each and compare:
- Visual sophistication
- Animation smoothness
- Professional polish
- Design coherence

## Integration Code

```typescript
// In your test file:
import { buildCodeGeneratorV3Messages } from './code-generator-v3-taste';

// For Anthropic Console testing:
const messages = buildCodeGeneratorV3Messages(
  "Your test prompt here",
  true, // include examples
  { width: 1920, height: 1080, format: "16:9" }
);

// Messages will be in correct format for Console
```

## Results Checklist

Rate each generation on:
- [ ] Spacing (1-10): Generous vs cramped
- [ ] Timing (1-10): Intentional vs rushed
- [ ] Color (1-10): Sophisticated vs random
- [ ] Typography (1-10): Deliberate vs default
- [ ] Polish (1-10): Premium vs amateur
- [ ] Overall Taste (1-10): Would Apple ship this?

## Notes
- The 3-example approach prioritizes quality signals over quantity
- Each example was chosen to demonstrate a different aspect of taste
- The model learns "what excellent looks like" rather than "what average looks like"