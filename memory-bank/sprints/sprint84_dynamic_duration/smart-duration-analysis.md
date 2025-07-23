# Sprint 84: Smart Duration Analysis

## The Real Problem
Users request simple things like "intro of bazaar" and get a 6-second scene when 2 seconds would be perfect. The system needs to understand WHAT is being created and assign appropriate duration.

## Content-Based Duration Intelligence

### Quick Duration Map
```
"text: hello" → 2 seconds (60 frames)
"intro of bazaar" → 2-3 seconds (60-90 frames)
"logo animation" → 3-4 seconds (90-120 frames)
"show our product features" → 6-8 seconds (180-240 frames)
"epic intro with multiple elements" → 8-10 seconds (240-300 frames)
```

### Smart Duration Rules

#### 1. Single Word/Short Text
- Pattern: "text: [1-3 words]", "show [word]", "display [short phrase]"
- Duration: 60-90 frames (2-3 seconds)
- Why: Quick read, simple fade in/out

#### 2. Logo/Brand Elements
- Pattern: "logo", "brand", "intro of [company]"
- Duration: 90-120 frames (3-4 seconds)
- Why: Need time for logo animation but not too long

#### 3. Single Statement/Message
- Pattern: "text saying [sentence]", "message: [full sentence]"
- Duration: 120-150 frames (4-5 seconds)
- Why: Reading time + animation

#### 4. Multi-Element Scenes
- Pattern: "show [multiple things]", contains "and", "with", "plus"
- Duration: 180-240 frames (6-8 seconds)
- Why: Sequential animations need time

#### 5. Complex/Epic Scenes
- Pattern: "epic", "comprehensive", "detailed", "showcase"
- Duration: 240-360 frames (8-12 seconds)
- Why: Multiple animations, transitions

## Implementation Strategy

### 1. Add Duration Analyzer to Brain Orchestrator

```typescript
function analyzeDurationFromPrompt(prompt: string): {
  suggestedFrames: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const lower = prompt.toLowerCase();
  
  // Count words in quotes (actual text content)
  const quotedText = prompt.match(/["']([^"']+)["']/)?.[1] || '';
  const quotedWordCount = quotedText.split(' ').filter(w => w).length;
  
  // Simple text detection
  if (quotedWordCount > 0 && quotedWordCount <= 3) {
    return {
      suggestedFrames: 60,
      confidence: 'high',
      reasoning: `Short text (${quotedWordCount} words) needs only 2 seconds`
    };
  }
  
  // Logo/intro detection
  if (lower.includes('intro') || lower.includes('logo')) {
    // But check if it's "epic intro" or similar
    if (lower.includes('epic') || lower.includes('amazing')) {
      return {
        suggestedFrames: 240,
        confidence: 'medium',
        reasoning: 'Epic intro needs 8 seconds for impact'
      };
    }
    return {
      suggestedFrames: 90,
      confidence: 'high',
      reasoning: 'Simple intro/logo needs 3 seconds'
    };
  }
  
  // Multi-element detection
  const hasMultiple = lower.includes(' and ') || 
                     lower.includes(' with ') || 
                     lower.includes(' plus ') ||
                     lower.includes('multiple') ||
                     lower.includes('several');
  
  if (hasMultiple) {
    return {
      suggestedFrames: 210,
      confidence: 'medium',
      reasoning: 'Multiple elements need 7 seconds'
    };
  }
  
  // Default based on prompt length
  if (prompt.length < 50) {
    return {
      suggestedFrames: 120,
      confidence: 'low',
      reasoning: 'Short prompt suggests simple scene (4 seconds)'
    };
  }
  
  // Default
  return {
    suggestedFrames: 180,
    confidence: 'low',
    reasoning: 'Standard scene duration (6 seconds)'
  };
}
```

### 2. Pass Smart Duration to Code Generator

Update the ADD tool to use smart duration when user doesn't specify:

```typescript
// In orchestratorNEW.ts
const explicitDuration = parseDurationFromPrompt(input.prompt);
let targetDuration = explicitDuration;

if (!explicitDuration) {
  // Use smart duration analysis
  const analysis = analyzeDurationFromPrompt(input.prompt);
  targetDuration = analysis.suggestedFrames;
  console.log(`🧠 [ORCHESTRATOR] Smart duration: ${analysis.suggestedFrames} frames - ${analysis.reasoning}`);
}
```

### 3. Update Code Generator Prompt

Add clear duration instructions:

```
CRITICAL DURATION RULES:
The user has not specified a duration, so you must choose based on content:

- Single word/phrase (1-3 words): Use 60 frames (2 seconds)
- Simple logo or intro: Use 90 frames (3 seconds)  
- Single sentence/statement: Use 120 frames (4 seconds)
- Standard scene: Use 180 frames (6 seconds)
- Complex multi-element: Use 240 frames (8 seconds)

Examples:
- "text: Hello" → 60 frames
- "intro of Bazaar" → 90 frames
- "Our mission is to help" → 120 frames
- "Product showcase with features" → 240 frames

The scene duration MUST match the content complexity!
Export: export const durationInFrames_[ID] = [SMART_DURATION];
```

## Expected Results

### Before:
- "intro of bazaar" → 6 seconds (too long!)
- "text: Hi" → 6 seconds (way too long!)
- "epic product showcase" → 6 seconds (too short!)

### After:
- "intro of bazaar" → 3 seconds (perfect)
- "text: Hi" → 2 seconds (quick and snappy)
- "epic product showcase" → 8-10 seconds (appropriate)

## Success Criteria
1. Simple text/logos are 2-4 seconds
2. Complex scenes get 6-10 seconds
3. Users rarely need to trim
4. Scenes feel "right" for their content