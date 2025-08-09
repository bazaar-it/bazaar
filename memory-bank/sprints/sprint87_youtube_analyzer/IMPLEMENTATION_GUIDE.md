# Sprint 87: YouTube Analyzer Implementation Guide

## Quick Start Implementation

### Step 1: Enhanced YouTube Analyzer Schema
```typescript
// src/brain/tools/youtube-analyzer.ts

import { z } from 'zod';

export const youtubeAnalyzerSchema = z.object({
  youtubeUrl: z.string().url(),
  startSec: z.number().min(0).default(0),
  endSec: z.number().positive(),
  modifications: z.string().optional(),
}).transform(data => {
  // Auto-cap at 10 seconds
  const duration = data.endSec - data.startSec;
  if (duration > 10) {
    console.log(`⚠️ Capping duration from ${duration}s to 10s`);
    data.endSec = data.startSec + 10;
  }
  return data;
});

export type YouTubeAnalyzerInput = z.infer<typeof youtubeAnalyzerSchema>;
```

### Step 2: Time Range Parser
```typescript
// src/brain/utils/youtube-time-parser.ts

export interface TimeRange {
  start: number;
  end: number;
}

export function parseTimeRange(input: string): TimeRange | null {
  // Remove extra whitespace and lowercase
  const normalized = input.trim().toLowerCase();
  
  // Pattern 1: "26-30" or "26 - 30"
  const dashPattern = /(\d+)\s*[-–—]\s*(\d+)/;
  const dashMatch = normalized.match(dashPattern);
  if (dashMatch) {
    return {
      start: parseInt(dashMatch[1]),
      end: parseInt(dashMatch[2])
    };
  }
  
  // Pattern 2: "first N seconds"
  const firstPattern = /first\s+(\d+)\s+seconds?/;
  const firstMatch = normalized.match(firstPattern);
  if (firstMatch) {
    return {
      start: 0,
      end: parseInt(firstMatch[1])
    };
  }
  
  // Pattern 3: "seconds 26 to 30"
  const toPattern = /(\d+)\s+to\s+(\d+)/;
  const toMatch = normalized.match(toPattern);
  if (toMatch) {
    return {
      start: parseInt(toMatch[1]),
      end: parseInt(toMatch[2])
    };
  }
  
  // Pattern 4: "1:26-1:30" (minutes:seconds)
  const timePattern = /(\d+):(\d+)\s*[-–—]\s*(\d+):(\d+)/;
  const timeMatch = normalized.match(timePattern);
  if (timeMatch) {
    const startSec = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    const endSec = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
    return { start: startSec, end: endSec };
  }
  
  // Pattern 5: Just a number (assume from start)
  const numberPattern = /^(\d+)$/;
  const numberMatch = normalized.match(numberPattern);
  if (numberMatch) {
    const seconds = parseInt(numberMatch[1]);
    return { start: 0, end: seconds };
  }
  
  return null;
}

export function extractModifications(input: string): string | null {
  // Common modification patterns
  const patterns = [
    /change\s+(.+?)\s+to\s+(.+)/i,
    /replace\s+(.+?)\s+with\s+(.+)/i,
    /make\s+it\s+(.+)/i,
    /but\s+(.+)/i,
    /with\s+(.+)\s+instead/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0]; // Return the full modification phrase
    }
  }
  
  // Check for comma-separated modifications
  if (input.includes(',')) {
    const parts = input.split(',');
    if (parts.length > 1) {
      // Return everything after the first comma
      return parts.slice(1).join(',').trim();
    }
  }
  
  return null;
}
```

### Step 3: YouTube Intent Analyzer
```typescript
// src/brain/analyzers/youtube-intent.ts

export interface YouTubeIntent {
  hasYouTubeUrl: boolean;
  url?: string;
  hasTimeSpecification: boolean;
  timeRange?: TimeRange;
  hasModifications: boolean;
  modifications?: string;
  needsFollowUp: boolean;
}

export function analyzeYouTubeIntent(prompt: string): YouTubeIntent {
  // Extract YouTube URL
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const urlMatch = prompt.match(urlPattern);
  
  const intent: YouTubeIntent = {
    hasYouTubeUrl: !!urlMatch,
    url: urlMatch ? urlMatch[0] : undefined,
    hasTimeSpecification: false,
    hasModifications: false,
    needsFollowUp: false,
  };
  
  if (!intent.hasYouTubeUrl) {
    return intent;
  }
  
  // Remove URL from prompt for easier parsing
  const withoutUrl = prompt.replace(urlPattern, '').trim();
  
  // Check for time specification
  const timeRange = parseTimeRange(withoutUrl);
  if (timeRange) {
    intent.hasTimeSpecification = true;
    intent.timeRange = timeRange;
  }
  
  // Check for modifications
  const modifications = extractModifications(withoutUrl);
  if (modifications) {
    intent.hasModifications = true;
    intent.modifications = modifications;
  }
  
  // Determine if follow-up is needed
  intent.needsFollowUp = intent.hasYouTubeUrl && !intent.hasTimeSpecification;
  
  return intent;
}
```

### Step 4: Enhanced Brain Orchestrator
```typescript
// Updates to src/brain/orchestratorNEW.ts

import { analyzeYouTubeIntent } from './analyzers/youtube-intent';

export class Orchestrator {
  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    // Analyze for YouTube intent
    const youtubeIntent = analyzeYouTubeIntent(input.prompt);
    
    if (youtubeIntent.hasYouTubeUrl) {
      // Check if we need follow-up
      if (youtubeIntent.needsFollowUp) {
        return {
          success: true,
          type: 'follow_up_needed',
          message: "I'll analyze that YouTube video for you! Which seconds would you like me to recreate? (max 10s)\n\nExamples:\n• 'first 5 seconds'\n• '26-30'\n• '1:15 to 1:20'",
          metadata: {
            pendingAction: 'youtube_analysis',
            youtubeUrl: youtubeIntent.url,
          }
        };
      }
      
      // We have everything we need - proceed with analysis
      const timeRange = youtubeIntent.timeRange || { start: 0, end: 5 }; // Default to first 5s
      
      // Call YouTube analyzer with time range
      const analyzer = new YouTubeAnalyzerTool();
      const analysis = await analyzer.execute({
        youtubeUrl: youtubeIntent.url!,
        startSec: timeRange.start,
        endSec: timeRange.end,
        modifications: youtubeIntent.modifications,
      });
      
      // Build enhanced prompt for code generation
      let codeGenPrompt = `Create a scene based on this video analysis:\n\n${analysis.analysis}`;
      
      if (youtubeIntent.modifications) {
        codeGenPrompt += `\n\nIMPORTANT MODIFICATIONS: ${youtubeIntent.modifications}`;
      }
      
      // Continue with normal code generation flow
      // ... rest of the orchestration logic
    }
    
    // ... handle non-YouTube requests
  }
  
  async processFollowUpResponse(
    response: string, 
    metadata: any
  ): Promise<OrchestrationOutput> {
    if (metadata.pendingAction === 'youtube_analysis') {
      const timeRange = parseTimeRange(response);
      
      if (!timeRange) {
        return {
          success: false,
          type: 'error',
          message: "I couldn't understand that time range. Please try again with a format like '26-30' or 'first 5 seconds'.",
        };
      }
      
      // Now process with the time range
      return this.processUserInput({
        prompt: `${metadata.youtubeUrl} ${response}`,
        projectId: metadata.projectId,
        // ... other fields
      });
    }
    
    // Handle other follow-up types
  }
}
```

### Step 5: Updated Gemini Analysis Prompt
```typescript
// Update src/brain/tools/youtube-analyzer.ts

export class YouTubeAnalyzerTool {
  async execute(input: YouTubeAnalyzerInput): Promise<YouTubeAnalyzerOutput> {
    const duration = input.endSec - input.startSec;
    const frameCount = duration * 30; // 30fps
    
    // Build time-specific prompt
    const customPrompt = `
CRITICAL: Analyze ONLY seconds ${input.startSec} to ${input.endSec} (${duration} seconds = ${frameCount} frames at 30fps).

START TIME: ${input.startSec} seconds
END TIME: ${input.endSec} seconds
TOTAL DURATION: ${duration} seconds

Skip everything before ${input.startSec}s and after ${input.endSec}s.

${input.modifications ? `\nMODIFICATIONS TO APPLY:\n${input.modifications}\n` : ''}

Provide COMPLETE analysis of these ${frameCount} frames for EXACT recreation:

For EACH visual element in this time range:
- Exact timing relative to the clip (0 = start of selected range)
- Text content, fonts, sizes, colors
- Animations and transitions
- Positions and movements
- Effects and styling

Your analysis will recreate these exact ${duration} seconds.`;

    // Call Gemini with time-specific prompt
    const analysis = await this.analyzer.analyzeYouTubeVideo(
      input.youtubeUrl,
      customPrompt
    );
    
    return {
      analysis,
      duration,
      timeRange: { start: input.startSec, end: input.endSec },
    };
  }
}
```

## Testing Plan

### Unit Tests
```typescript
// src/brain/utils/__tests__/youtube-time-parser.test.ts

describe('YouTube Time Parser', () => {
  test('parses dash format', () => {
    expect(parseTimeRange('26-30')).toEqual({ start: 26, end: 30 });
    expect(parseTimeRange('0 - 5')).toEqual({ start: 0, end: 5 });
  });
  
  test('parses first N seconds', () => {
    expect(parseTimeRange('first 5 seconds')).toEqual({ start: 0, end: 5 });
    expect(parseTimeRange('first 10 seconds')).toEqual({ start: 0, end: 10 });
  });
  
  test('parses time format', () => {
    expect(parseTimeRange('1:30-1:40')).toEqual({ start: 90, end: 100 });
  });
  
  test('enforces 10 second cap', () => {
    const input = youtubeAnalyzerSchema.parse({
      youtubeUrl: 'https://youtube.com/watch?v=test',
      startSec: 20,
      endSec: 35, // 15 seconds
    });
    expect(input.endSec).toBe(30); // Capped to 20+10
  });
});
```

### Integration Test Scenarios
```typescript
// Test Scenario 1: URL only
const response1 = await orchestrator.processUserInput({
  prompt: "https://youtube.com/watch?v=abc123"
});
expect(response1.type).toBe('follow_up_needed');

// Test Scenario 2: URL with time
const response2 = await orchestrator.processUserInput({
  prompt: "https://youtube.com/watch?v=abc123 first 5 seconds"
});
expect(response2.type).toBe('scene_generation');

// Test Scenario 3: URL with time and mods
const response3 = await orchestrator.processUserInput({
  prompt: "https://youtube.com/watch?v=abc123 26-30, change text to Bazaar"
});
expect(response3.metadata.modifications).toBe("change text to Bazaar");
```

## Rollout Strategy

### Phase 1: Backend (Day 1-2)
1. Implement time parser utilities
2. Update YouTube analyzer schema
3. Add intent analysis
4. Test with unit tests

### Phase 2: Orchestrator (Day 2-3)
1. Integrate YouTube intent detection
2. Add follow-up question logic
3. Handle follow-up responses
4. Test integration flow

### Phase 3: UI Updates (Day 3-4)
1. Handle follow-up question display
2. Parse follow-up responses
3. Show time range in UI
4. Test end-to-end

### Phase 4: Polish (Day 4-5)
1. Error handling improvements
2. Edge case testing
3. Performance optimization
4. Documentation

## Key Decision Points

### 1. Default Behavior
- **Option A**: Default to first 5 seconds if no time specified
- **Option B**: Always ask for time range
- **Recommendation**: Option B (explicit is better)

### 2. Cap Handling
- **Option A**: Show error if >10 seconds requested
- **Option B**: Silently cap at 10 seconds
- **Recommendation**: Option B with console warning

### 3. Modification Syntax
- **Option A**: Strict syntax parsing
- **Option B**: Flexible natural language
- **Recommendation**: Option B (better UX)

## Common Edge Cases

1. **Invalid time ranges**: 30-20 (end before start)
2. **Extreme ranges**: 1000-1010 (very late in video)
3. **Missing video**: Private or deleted
4. **Live streams**: No defined duration
5. **Shorts**: Less than requested duration
6. **Multiple URLs**: Two YouTube links in one prompt
7. **Complex modifications**: Multiple comma-separated changes

## Performance Considerations

1. **Gemini Analysis**: ~5-10s for 10s of video
2. **Code Generation**: ~3-5s with GPT-4
3. **Total Time**: ~8-15s from request to scene

## Next Steps

1. ✅ Review this implementation guide
2. Choose rollout phases to prioritize
3. Set up development branch
4. Begin Phase 1 implementation
5. Create PR with tests