# YouTube Recreation System - Developer Guide

## Quick Test Guide

### Test Videos That Work Well
```bash
# Simple text animations
https://www.youtube.com/watch?v=dQw4w9WgXcQ  # Text with music
https://www.youtube.com/watch?v=wPnohSQBNlk  # Motion graphics

# Test command format:
"recreate first 5 seconds https://www.youtube.com/watch?v=VIDEO_ID"
```

### Videos To Avoid
- Live action footage
- Complex 3D animations
- Photo montages
- Videos with real people

## How to Add New Features

### 1. Improving Visual Detection

#### Problem: Gemini misses certain elements
**Solution**: Update the description prompt

```typescript
// src/config/prompts/active/youtube-description.ts
export const YOUTUBE_DESCRIPTION_PROMPT = `
  // Add specific instructions for what to look for
  Also pay attention to:
  - Icons or symbols (describe their shape)
  - Subtle animations (breathing, pulsing)
  - Background patterns or textures
`;
```

### 2. Adding New Animation Types

#### Problem: Can't handle rotation/scale animations
**Solution**: Update the code generator prompt

```typescript
// src/config/prompts/active/description-to-code.ts

// Add to animation helpers section:
const rotate = (startFrame, endFrame, degrees) =>
  interpolate(frame, [startFrame, endFrame], [0, degrees]);

const scale = (startFrame, endFrame, startScale, endScale) =>
  interpolate(frame, [startFrame, endFrame], [startScale, endScale]);

// Add to interpretation rules:
"spins" → rotate animation
"grows larger" → scale animation
"shrinks" → scale down
```

### 3. Handling Multiple Scenes

#### Problem: Everything appears in one scene
**Solution**: Detect scene breaks in descriptions

```typescript
// In description-to-code.ts
// Look for phrases that indicate scene changes:
- "then" 
- "next"
- "after that"
- "scene changes to"

// Create Sequence components for each scene:
<Sequence from={0} durationInFrames={90}>
  {/* Scene 1 */}
</Sequence>
<Sequence from={90} durationInFrames={60}>
  {/* Scene 2 */}
</Sequence>
```

## Debugging Common Issues

### Issue 1: "Gemini returns empty analysis"

**Check these:**
```typescript
// 1. Verify API key is set
console.log('API Key exists:', !!env.GOOGLE_GEMINI_API_KEY);

// 2. Check if video is accessible
// Some videos are region-locked or private

// 3. Try with a simpler prompt
const testPrompt = "What do you see in this video?";
```

### Issue 2: "Generated code won't compile"

**Debug steps:**
```typescript
// 1. Check for syntax errors in generated code
try {
  new Function(generatedCode);
} catch (error) {
  console.error('Syntax error:', error);
}

// 2. Common issues:
// - Missing interpolate imports
// - Undefined color variables
// - Frame values outside range

// 3. Add validation to generator:
if (frame < 0 || frame > totalDuration) {
  console.warn('Frame out of range');
}
```

### Issue 3: "Timing is completely wrong"

**Fix approach:**
```typescript
// In youtube-analyzer.ts
// Log the exact description
console.log('Description mentions:', {
  hasSeconds: description.includes('second'),
  hasQuickly: description.includes('quickly'),
  hasSlowly: description.includes('slowly')
});

// Adjust interpretation in description-to-code.ts
const timingMap = {
  'quickly': 15,       // 0.5 seconds
  'slowly': 60,        // 2 seconds
  'brief': 10,         // 0.33 seconds
  'lingers': 90        // 3 seconds
};
```

## Testing Your Changes

### Unit Test Template
```typescript
// src/tests/youtube-recreation.test.ts
import { YouTubeAnalyzerTool } from '~/brain/tools/youtube-analyzer';

describe('YouTube Recreation', () => {
  test('parses time correctly', () => {
    const input = "recreate first 5 seconds of video";
    const duration = extractDuration(input);
    expect(duration).toBe(5);
  });
  
  test('generates valid Remotion code', () => {
    const description = "Text fades in";
    const code = generateFromDescription(description);
    expect(code).toContain('interpolate');
    expect(code).toContain('opacity');
  });
});
```

### Integration Test Flow
```bash
# 1. Pick a simple test video (3-5 seconds of basic animation)
# 2. Run the full pipeline
# 3. Check each step:

# Step 1: Gemini analysis
curl -X POST http://localhost:3000/api/test-gemini \
  -d '{"url": "youtube.com/watch?v=TEST"}'

# Step 2: Code generation
curl -X POST http://localhost:3000/api/test-generation \
  -d '{"description": "Test description"}'

# Step 3: Compilation
npm run test:compile
```

## Performance Optimization

### Current Bottlenecks
```typescript
// Measure each step:
const start = Date.now();

// Gemini API: ~15-20 seconds
const analysis = await analyzeVideo();
console.log('Gemini took:', Date.now() - start);

// Claude API: ~20-30 seconds  
const code = await generateCode();
console.log('Claude took:', Date.now() - start);
```

### Optimization Ideas

#### 1. Cache Common Videos
```typescript
// Add to youtube-analyzer.ts
const cache = new Map();

const cacheKey = `${videoId}_${startTime}_${duration}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

// After analysis:
cache.set(cacheKey, analysis);
```

#### 2. Pre-compile Common Patterns
```typescript
// Create a library of common animations
const commonPatterns = {
  'fadeIn': `opacity: interpolate(frame, [0, 15], [0, 1])`,
  'slideLeft': `transform: translateX(${interpolate(frame, [0, 20], [100, 0])}px)`,
  'zoomIn': `transform: scale(${interpolate(frame, [0, 30], [0.5, 1])})`
};
```

#### 3. Parallel Processing
```typescript
// If video has multiple segments, analyze in parallel
const segments = [0-5, 5-10, 10-15];
const analyses = await Promise.all(
  segments.map(seg => analyzeSegment(seg))
);
```

## Advanced Features (Future)

### 1. Scene Detection
```typescript
// Detect scene cuts automatically
const detectSceneCuts = (description: string) => {
  const cuts = [];
  const lines = description.split('.');
  
  lines.forEach((line, i) => {
    if (line.includes('changes to') || 
        line.includes('cuts to') ||
        line.includes('new scene')) {
      cuts.push(i);
    }
  });
  
  return cuts;
};
```

### 2. Style Matching
```typescript
// Extract and apply consistent styles
const extractStyle = (description: string) => {
  return {
    fontFamily: description.includes('serif') ? 'Georgia' : 'Inter',
    colorScheme: detectColors(description),
    animationSpeed: description.includes('fast') ? 'quick' : 'normal'
  };
};
```

### 3. Audio Sync (Experimental)
```typescript
// Sync animations to beat
const syncToBeat = (bpm: number) => {
  const beatInterval = 60 / bpm * 30; // frames per beat
  return {
    fadeIn: beatInterval,
    slideIn: beatInterval * 2,
    pulse: beatInterval / 2
  };
};
```

## Environment Setup

### Required API Keys
```env
# Google Gemini (for video analysis)
GOOGLE_GEMINI_API_KEY=AIza...

# Anthropic Claude (for code generation)  
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Local Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Enable debug logging
export DEBUG=youtube:*
```

### Production Deployment
```bash
# Set production keys
vercel env add GOOGLE_GEMINI_API_KEY
vercel env add ANTHROPIC_API_KEY

# Deploy
vercel --prod
```

## Monitoring & Analytics

### Track Success Rate
```typescript
// Add to youtube-analyzer.ts
const analytics = {
  totalRequests: 0,
  successfulAnalyses: 0,
  failedAnalyses: 0,
  averageProcessingTime: 0
};

// Log metrics
if (success) {
  analytics.successfulAnalyses++;
  console.log('Success rate:', 
    (analytics.successfulAnalyses / analytics.totalRequests) * 100
  );
}
```

### User Feedback Collection
```typescript
// After generation completes
const collectFeedback = async (rating: number, comments: string) => {
  await db.insert(feedback).values({
    videoUrl,
    rating,
    comments,
    generatedCode,
    timestamp: new Date()
  });
};
```

## Troubleshooting Checklist

- [ ] API keys are set correctly
- [ ] Video is publicly accessible
- [ ] Time specification is clear (e.g., "first 5 seconds")
- [ ] Video contains motion graphics (not live action)
- [ ] Duration is under 10 seconds
- [ ] No special characters in prompt
- [ ] Browser console checked for errors
- [ ] Network tab shows API calls completing
- [ ] Generated code is logged to console
- [ ] Preview panel shows compilation errors

---

*For urgent issues, check Sprint 90 documentation or contact the team lead.*