# Sprint 87: YouTube Analyzer v1 - 10s Extraction with Selective Follow-up

## Sprint Overview
**Objective**: Enable users to paste YouTube links and generate scenes matching the video content (max 10 seconds), with optional user modifications through intelligent follow-up questions.

**Status**: Planning Phase  
**Created**: 2025-01-09  
**Target Completion**: TBD

## Current State Analysis

### Existing Components
1. **YouTube Analyzer Tool** (`/src/brain/tools/youtube-analyzer.ts`)
   - ✅ Already has schema validation with Zod
   - ✅ Integrates with GoogleVideoAnalyzer
   - ✅ Has helper functions for URL and duration extraction
   - ⚠️ Currently defaults to 10 seconds (needs 10s cap enforcement)
   - ⚠️ No time range selection (startSec, endSec)

2. **YouTube to Code Converter** (`/src/tools/youtube/youtube-to-code.ts`)
   - ✅ Direct conversion pipeline (bypasses orchestrator)
   - ✅ Uses Gemini for analysis
   - ✅ Generates Remotion code with GPT-4
   - ⚠️ No time range selection
   - ⚠️ No 10-second limit enforcement

3. **Google Video Analyzer** (`/src/server/services/ai/google-video-analyzer.ts`)
   - ✅ Gemini 1.5 Pro integration
   - ✅ YouTube URL analysis support
   - ✅ Frame-by-frame analysis prompts
   - ⚠️ Analyzes entire video (no time range support)

4. **Brain Orchestrator** (`/src/brain/orchestratorNEW.ts`)
   - ✅ Already detects YouTube URLs
   - ✅ Calls YouTube analyzer tool
   - ⚠️ No follow-up question logic
   - ⚠️ No modification detection

## Requirements Breakdown

### Core Features
1. **10-Second Maximum Enforcement**
   - Hard cap at 10 seconds
   - Brain overrides if user requests >10s (no error, just caps)

2. **Time Range Selection**
   - Support "26-30" format (seconds 26 to 30)
   - Support "first 5 seconds" format
   - Support "0:26-0:30" format (minutes:seconds)

3. **Intelligent Follow-up**
   - If only URL: Ask "Which seconds would you like me to analyze? (max 10s)"
   - If URL + directive: Skip follow-up, proceed directly
   - Examples:
     - "youtube.com/watch?v=xxx" → Ask for time range
     - "youtube.com/watch?v=xxx first 5 seconds" → Direct generation
     - "youtube.com/watch?v=xxx 26-30, change text to Bazaar" → Direct generation with mods

## Architecture Design

### 1. Enhanced YouTube Analyzer Tool
```typescript
// src/brain/tools/youtube-analyzer.ts
export const youtubeAnalyzerSchema = z.object({
  youtubeUrl: z.string().url(),
  startSec: z.number().min(0).default(0),
  endSec: z.number().max(z.number()),
  modifications: z.string().optional(),
}).refine(data => {
  // Enforce 10 second maximum
  const duration = data.endSec - data.startSec;
  if (duration > 10) {
    data.endSec = data.startSec + 10; // Cap at 10 seconds
  }
  return true;
});
```

### 2. Brain Orchestrator Enhancement
```typescript
// Add to intent analysis
interface YouTubeIntent {
  hasYouTubeUrl: boolean;
  url?: string;
  hasTimeSpecification: boolean;
  timeRange?: { start: number; end: number };
  hasModifications: boolean;
  modifications?: string;
  needsFollowUp: boolean;
}
```

### 3. Follow-up Question Handler
```typescript
// New file: src/brain/handlers/youtube-followup.ts
export class YouTubeFollowUpHandler {
  static needsFollowUp(intent: YouTubeIntent): boolean {
    return intent.hasYouTubeUrl && !intent.hasTimeSpecification;
  }

  static generateFollowUp(): string {
    return "Which seconds would you like me to analyze? (max 10s)\n" +
           "Examples: '0-5', 'first 7 seconds', '26-30'";
  }

  static parseTimeResponse(response: string): TimeRange {
    // Parse various formats
    // "26-30" → { start: 26, end: 30 }
    // "first 5 seconds" → { start: 0, end: 5 }
    // "0:26-0:30" → { start: 26, end: 30 }
  }
}
```

## Implementation Tasks

### Phase 1: Core Functionality (Priority: HIGH)
- [ ] Update `youtubeAnalyzerSchema` with startSec/endSec
- [ ] Implement 10-second cap enforcement (override, not error)
- [ ] Add time range parsing utilities
- [ ] Support multiple time format inputs

### Phase 2: Follow-up Logic (Priority: HIGH)
- [ ] Create YouTubeFollowUpHandler
- [ ] Enhance IntentAnalyzer to detect YouTube patterns
- [ ] Add follow-up question generation
- [ ] Implement response parsing for time ranges

### Phase 3: Integration (Priority: HIGH)
- [ ] Update brain orchestrator with follow-up logic
- [ ] Integrate with existing chat flow
- [ ] Ensure modifications are passed through pipeline
- [ ] Test with code generation tools

### Phase 4: Testing (Priority: MEDIUM)
- [ ] Unit tests for time parsing
- [ ] Integration tests for follow-up flow
- [ ] E2E tests for various input patterns
- [ ] Edge case testing (>10s, invalid ranges)

## Time Parsing Examples

### Input Patterns to Support
```
"26-30"                    → start: 26, end: 30
"seconds 26-30"            → start: 26, end: 30
"26 to 30"                 → start: 26, end: 30
"first 5 seconds"          → start: 0, end: 5
"first 10 seconds"         → start: 0, end: 10
"0:26-0:30"               → start: 26, end: 30
"1:15-1:25"               → start: 75, end: 85 (capped to 75-85)
"last 5 seconds"          → Requires video duration (defer)
```

### Modification Patterns to Detect
```
"change text to Bazaar"
"replace logo with mine"
"make it blue instead of red"
"use my company name"
"but with different colors"
```

## API Flow Diagram

```
User Input
    ↓
[Brain Orchestrator]
    ↓
[YouTube Intent Detection]
    ↓
Has URL? → Yes
    ↓
Has Time? → No → [Generate Follow-up Question] → Wait for Response
    ↓ Yes            ↓
    ↓                Parse Time Range
    ↓                ↓
[YouTube Analyzer Tool]
    ↓
[Gemini Analysis] (max 10s)
    ↓
Has Modifications? → Yes → [Include in prompt]
    ↓ No
    ↓
[Code Generation Tool]
    ↓
[Scene Output]
```

## Acceptance Criteria

### Scenario 1: URL Only
**Input**: "https://youtube.com/watch?v=abc123"  
**Expected**: System asks "Which seconds would you like me to analyze? (max 10s)"  
**User Reply**: "26-30"  
**Result**: Generates scene for seconds 26-30

### Scenario 2: URL with Time
**Input**: "https://youtube.com/watch?v=abc123 first 5 seconds"  
**Expected**: Direct generation of first 5 seconds, no follow-up

### Scenario 3: URL with Time and Modifications
**Input**: "https://youtube.com/watch?v=abc123 first 5 seconds, change text to Bazaar"  
**Expected**: Generates first 5 seconds with text changed to "Bazaar"

### Scenario 4: Over 10 Second Request
**Input**: "https://youtube.com/watch?v=abc123 0-15"  
**Expected**: System caps to 0-10, generates 10 seconds (no error shown)

### Scenario 5: Complex Time Format
**Input**: "https://youtube.com/watch?v=abc123"  
**User Reply**: "1:26 to 1:31"  
**Expected**: Converts to seconds (86-91), generates scene

## Technical Considerations

### Performance
- Gemini analysis is the bottleneck (~5-10s for 10s of video)
- Consider caching analyzed segments
- Stream responses where possible

### Error Handling
- Invalid YouTube URLs
- Private/deleted videos
- Gemini API failures
- Time parsing errors

### Limits
- 10-second hard cap
- Gemini token limits
- YouTube API quotas (if using API)

## Migration Path

### From Current System
1. Preserve existing YouTube analyzer functionality
2. Add new schema fields as optional initially
3. Gradually migrate to time-range based analysis
4. Phase out full-video analysis

### Database Considerations
- No schema changes required
- Messages table already supports follow-up flows
- Scene generation remains unchanged

## Success Metrics
- User can paste URL and get follow-up question
- Time range parsing success rate > 95%
- 10-second cap properly enforced
- Modifications correctly applied
- No regression in existing functionality

## Next Steps
1. Review and approve this plan
2. Create detailed technical specs for each component
3. Set up test cases
4. Begin Phase 1 implementation
5. Iterate based on user feedback

## Open Questions
1. Should we support "last 5 seconds" without knowing video duration?
2. How to handle live streams or very long videos?
3. Should we show preview frames before generation?
4. Cache analysis results for same video segments?
5. Support multiple segments in one request?