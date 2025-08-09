# Sprint 87: Simplified YouTube Analyzer - Brain-Integrated Approach

## The Realization
We don't need separate analyzers and handlers. The brain orchestrator is already designed to understand intent and handle conversations. Let's use it!

## Simplified Architecture

### What We Actually Need

1. **Enhanced Brain Prompt** - Teach the brain to:
   - Detect YouTube URLs
   - Understand time specifications
   - Ask for clarification when needed
   - Enforce 10-second limit

2. **Updated YouTube Tool** - Just add:
   - `startSec` and `endSec` parameters
   - 10-second cap in the schema

That's it. No new analyzers, no separate handlers.

## Implementation (Minimal Changes)

### 1. Update Brain Orchestrator Prompt
```typescript
// src/config/prompts/active/brain-orchestrator.ts

const BRAIN_ORCHESTRATOR_PROMPT = `
...existing prompt...

## YouTube Video Handling

When you detect a YouTube URL:

1. Check if the user specified a time range:
   - "first 5 seconds" → start: 0, end: 5
   - "26-30" → start: 26, end: 30  
   - "1:15 to 1:20" → start: 75, end: 80
   - No specification → ASK THE USER

2. If no time range specified:
   - Respond with: "I'll help you recreate that YouTube video! Which seconds would you like me to analyze? (max 10 seconds)"
   - Wait for their response
   - Parse the time range from their answer

3. Enforce 10-second maximum:
   - If user requests >10 seconds, silently cap at 10
   - Example: "20-35" becomes "20-30"

4. Look for modifications:
   - "change text to X"
   - "make it blue"
   - "use my logo"
   - Pass these as additionalInstructions

5. Then call the youtube_analyzer tool with:
   - youtubeUrl: the URL
   - startSec: start time in seconds
   - endSec: end time in seconds (max startSec + 10)
   - modifications: any modifications requested
`;
```

### 2. Simple YouTube Tool Update
```typescript
// src/brain/tools/youtube-analyzer.ts

export const youtubeAnalyzerSchema = z.object({
  youtubeUrl: z.string().url(),
  startSec: z.number().min(0).default(0),
  endSec: z.number().positive(),
  modifications: z.string().optional(),
}).transform(data => {
  // Enforce 10-second cap
  const duration = data.endSec - data.startSec;
  if (duration > 10) {
    console.log(`📏 Capping from ${duration}s to 10s`);
    data.endSec = data.startSec + 10;
  }
  return data;
});

export class YouTubeAnalyzerTool {
  async execute(input: YouTubeAnalyzerInput): Promise<YouTubeAnalyzerOutput> {
    const duration = input.endSec - input.startSec;
    
    // Build Gemini prompt for specific time range
    const prompt = `
      Analyze seconds ${input.startSec} to ${input.endSec} (${duration} seconds).
      Skip everything outside this range.
      ${input.modifications ? `Apply these changes: ${input.modifications}` : ''}
      
      Provide complete scene-by-scene breakdown for recreation.
    `;
    
    const analysis = await this.analyzer.analyzeYouTubeVideo(
      input.youtubeUrl,
      prompt
    );
    
    return { analysis, duration };
  }
}
```

### 3. Brain Already Handles Follow-ups!
```typescript
// The brain orchestrator ALREADY has this logic:
// src/brain/orchestratorNEW.ts

if (intent.tool === 'needs_clarification') {
  return {
    type: 'follow_up_needed',
    message: intent.clarification_question,
    // Brain will naturally handle the response
  };
}
```

## That's It! 

### What We DON'T Need
❌ YouTubeIntent analyzer - Brain already analyzes intent  
❌ TimeRange parser - Brain can parse time naturally  
❌ Follow-up handler - Brain already handles conversations  
❌ New files and abstractions  

### What We DO Need
✅ Teach brain about YouTube time ranges (prompt update)  
✅ Add startSec/endSec to existing tool  
✅ 10-second cap in schema  

## Examples of How It Works

### Scenario 1: Just URL
```
User: "https://youtube.com/watch?v=abc"
Brain: Sees URL, no time → Asks for time range
User: "26-30"  
Brain: Parses "26-30" → Calls tool with startSec: 26, endSec: 30
```

### Scenario 2: URL + Time
```
User: "https://youtube.com/watch?v=abc first 5 seconds"
Brain: Sees URL + "first 5 seconds" → Calls tool with startSec: 0, endSec: 5
```

### Scenario 3: URL + Time + Mods
```
User: "https://youtube.com/watch?v=abc 0-7, change text to Bazaar"
Brain: Sees all parts → Calls tool with:
  - startSec: 0
  - endSec: 7
  - modifications: "change text to Bazaar"
```

## Testing the Brain's Understanding

We can test if the brain understands by checking its intent analysis:

```typescript
// Quick test in the orchestrator
console.log('🧠 Brain detected:', {
  hasYouTube: intent.tool === 'youtube_analyzer',
  timeRange: intent.parameters?.timeRange,
  needsFollowUp: intent.tool === 'needs_clarification',
});
```

## Migration Path

1. **Step 1**: Update brain prompt with YouTube rules
2. **Step 2**: Add startSec/endSec to YouTube tool schema  
3. **Step 3**: Test with various inputs
4. **Step 4**: Fine-tune brain prompt based on results

## Why This Is Better

1. **Simpler**: Uses existing brain capabilities
2. **More Natural**: Brain understands context better
3. **Flexible**: Easy to adjust by changing prompts
4. **Maintainable**: No extra code to maintain
5. **Consistent**: Same conversation flow as other features

## Implementation Time

- Original approach: 3-5 days
- Simplified approach: 3-5 hours

The brain is already smart. We just need to tell it what to do with YouTube URLs!