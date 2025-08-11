# YouTube Recreation Testing Scenarios

## Test Matrix

### Scenario 1: Simple Text Animation
**Input**: "recreate first 3 seconds https://youtube.com/watch?v=[text-only-video]"
**Expected**: 
- Text appears and fades as in video
- Correct colors and fonts
- Timing within 0.5s accuracy
**Current Status**: ✅ Working (70% accuracy)

### Scenario 2: Multi-Scene Video
**Input**: "recreate first 8 seconds https://youtube.com/watch?v=[multi-scene]"
**Expected**:
- Distinct scenes created
- Smooth transitions
- All scenes included
**Current Status**: ⚠️ Partial (scenes merge together)

### Scenario 3: Logo Animation
**Input**: "recreate first 5 seconds https://youtube.com/watch?v=[logo-animation]"
**Expected**:
- Logo shape recreated
- Animation style matched
- Colors accurate
**Current Status**: ⚠️ Partial (shapes simplified)

### Scenario 4: Gradient Backgrounds
**Input**: "recreate first 4 seconds https://youtube.com/watch?v=[gradient-bg]"
**Expected**:
- Gradient direction correct
- Colors match
- Smooth transitions
**Current Status**: ✅ Working

### Scenario 5: Time Range Selection
**Input**: "recreate 5-10 seconds https://youtube.com/watch?v=[any-video]"
**Expected**:
- Only analyzes specified range
- Ignores content before/after
**Current Status**: ✅ Working

## Edge Cases

### 1. No Time Specification
**Input**: "recreate https://youtube.com/watch?v=abc123"
**Expected**: Ask for time specification
**Result**: ✅ Correctly asks for duration

### 2. Excessive Duration
**Input**: "recreate first 60 seconds https://youtube.com/watch?v=abc123"
**Expected**: Cap at 10 seconds with warning
**Result**: ✅ Caps at 10 seconds

### 3. Private/Blocked Video
**Input**: "recreate first 5 seconds [private-video-url]"
**Expected**: Graceful error message
**Result**: ✅ "Cannot access video" message

### 4. Live Stream URL
**Input**: "recreate first 5 seconds [live-stream-url]"
**Expected**: Explain limitation
**Result**: ⚠️ Sometimes works, inconsistent

### 5. Non-English Content
**Input**: "recreate first 5 seconds [japanese-text-video]"
**Expected**: Recreate with placeholder text
**Result**: ⚠️ Mixed results

## Performance Benchmarks

| Video Type | Analysis Time | Generation Time | Total |
|------------|--------------|-----------------|-------|
| Simple Text | 15s | 20s | 35s |
| Complex Animation | 18s | 28s | 46s |
| Multiple Scenes | 20s | 32s | 52s |
| Minimal Motion | 12s | 18s | 30s |

## Regression Tests

Run these after any changes:

### Test 1: Basic Functionality
```bash
# Should generate a simple text animation
Input: "recreate first 3 seconds https://www.youtube.com/watch?v=dQw4w9WgXcQ"
Expected: Code with text "Never Gonna Give You Up"
```

### Test 2: Color Accuracy
```bash
# Should detect and use correct colors
Input: "recreate first 2 seconds [video with red background]"
Expected: backgroundColor: "#FF0000" or similar
```

### Test 3: Animation Types
```bash
# Should handle different animations
Input: "recreate first 5 seconds [video with various animations]"
Expected: Contains interpolate, opacity, transform
```

### Test 4: Error Handling
```bash
# Should handle errors gracefully
Input: "recreate first 5 seconds invalid-url"
Expected: "Please provide a valid YouTube URL"
```

## Quality Metrics

### Visual Fidelity Score (1-10)
- Text Content Accuracy: 8/10
- Color Matching: 6/10
- Timing Precision: 7/10
- Animation Smoothness: 7/10
- Overall Recreation: 6.5/10

### Technical Metrics
- Compilation Success Rate: 95%
- API Call Success Rate: 90%
- Average Processing Time: 38s
- Memory Usage: < 500MB

## Known Failing Tests

### ❌ Complex Particle Effects
**Why**: Remotion doesn't have built-in particle system
**Workaround**: Simplify to basic shapes

### ❌ 3D Rotations
**Why**: Requires Three.js integration
**Workaround**: Use 2D transforms

### ❌ Video/Photo Content
**Why**: System only handles graphics
**Workaround**: Skip or use placeholders

### ❌ Morphing Shapes
**Why**: Complex SVG path animations
**Workaround**: Fade between shapes

## Test Data

### Good Test Videos
```javascript
const testVideos = [
  {
    url: "https://www.youtube.com/watch?v=wPnohSQBNlk",
    description: "Simple motion graphics",
    duration: 5,
    expectedElements: ["text", "shapes", "colors"]
  },
  {
    url: "https://www.youtube.com/watch?v=abc123",
    description: "Logo animation",
    duration: 3,
    expectedElements: ["logo", "fade", "scale"]
  }
];
```

### Test Prompts
```javascript
const testPrompts = [
  "recreate first 5 seconds",
  "recreate 0-3 seconds",
  "make the first 10 seconds",
  "animate like the first 7 seconds of"
];
```

## Automated Test Script

```typescript
// Run with: npm run test:youtube

import { YouTubeRecreationTest } from './youtube-test';

const runTests = async () => {
  const tester = new YouTubeRecreationTest();
  
  // Test 1: Basic functionality
  await tester.testBasicRecreation();
  
  // Test 2: Time parsing
  await tester.testTimeParsing();
  
  // Test 3: Error handling
  await tester.testErrorCases();
  
  // Test 4: Performance
  await tester.testPerformance();
  
  // Generate report
  tester.generateReport();
};

runTests();
```

## Manual QA Checklist

### Before Testing
- [ ] Clear browser cache
- [ ] Check API keys are set
- [ ] Verify dev server running
- [ ] Open browser console

### During Testing
- [ ] Note exact input prompt
- [ ] Screenshot any errors
- [ ] Save generated code
- [ ] Record processing time

### After Testing
- [ ] Compare output to original
- [ ] Check for compilation errors
- [ ] Verify animations work
- [ ] Document any issues

## Bug Report Template

```markdown
### Bug: [Brief description]

**Input**: [Exact prompt used]
**Expected**: [What should happen]
**Actual**: [What actually happened]

**Video URL**: [YouTube link]
**Time Range**: [e.g., 0-5 seconds]

**Console Errors**: 
```
[Paste any errors]
```

**Generated Code**:
```javascript
[Paste code if relevant]
```

**Screenshot**: [Attach if applicable]

**Severity**: Critical / High / Medium / Low
**Reproducible**: Always / Sometimes / Once
```

---

*Updated for Sprint 90 - Natural Language Processing approach*