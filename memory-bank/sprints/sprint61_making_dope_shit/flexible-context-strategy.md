# Flexible Context Strategy - Not Hardcoding

## The Problem with Hardcoding

You're right - if we hardcode "60-120 frames" and the user asks for "8 second video", we create confusion. The system should be smart about interpreting user intent.

## Better Approach: Context-Aware Enhancement

### 1. Text Only - Flexible Duration

```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

SCENE TYPE: Standalone motion graphic

Generate a complete Remotion scene based on the user's request.
Pay attention to any duration specified by the user.
If no duration specified, default to 3-4 seconds (90-120 frames).`;
```

### 2. System Prompt Handles the Speed

The system prompt already has the timing guidelines:
- Headline entrance: 8-12 frames
- Stagger: 4 frames
- Quick exits: 6-10 frames

This affects HOW things animate, not HOW LONG the scene is.

### 3. Smart Duration Detection

Instead of hardcoding, we could add a helper:

```typescript
function extractRequestedDuration(userPrompt: string): number | null {
  // Check for explicit duration requests
  const durationMatch = userPrompt.match(/(\d+)\s*(second|sec|s)\s*(video|scene|animation)?/i);
  if (durationMatch) {
    return parseInt(durationMatch[1]) * 30; // Convert to frames
  }
  
  // Check for frame requests
  const frameMatch = userPrompt.match(/(\d+)\s*frames?/i);
  if (frameMatch) {
    return parseInt(frameMatch[1]);
  }
  
  return null; // Let AI decide
}
```

### 4. Revised Context Building

```typescript
// For text generation
const requestedDuration = extractRequestedDuration(input.userPrompt);
const userPrompt = `USER REQUEST: "${input.userPrompt}"

SCENE TYPE: Standalone motion graphic
${requestedDuration ? `REQUESTED DURATION: ${requestedDuration} frames` : ''}

Generate a complete Remotion scene with professional motion graphics.
Focus on creating smooth, engaging animations.`;
```

### 5. Let System Prompt Guide Style, Not Duration

The system prompt should focus on:
- **Animation speed**: How fast elements enter (8-12 frames)
- **Visual hierarchy**: One focal point
- **Quality**: Smooth, professional animations

But NOT dictate total scene duration - that comes from:
1. User's explicit request
2. Content complexity (AI judgment)
3. Default fallback (3-4 seconds if nothing specified)

## Key Principle

**System Prompt** = HOW to animate (fast entrances, snappy timing)
**User Context** = WHAT to create and HOW LONG

This separation ensures:
- User asking for "8 second video" gets 8 seconds
- User asking for "quick product demo" gets fast animations in appropriate duration
- System maintains quality without being prescriptive

## Updated Implementation

Instead of hardcoding durations in context, we:
1. Parse user intent for duration
2. Pass it as a hint if found
3. Let AI decide based on content if not specified
4. System prompt ensures animations are always snappy regardless of total duration