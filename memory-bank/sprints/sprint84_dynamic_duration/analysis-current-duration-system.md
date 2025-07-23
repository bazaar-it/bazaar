# Sprint 84: Dynamic Duration System Analysis

## Current Duration System Overview

### Default Duration: 180 frames (6 seconds at 30fps)

The system currently defaults all scenes to 6 seconds, which creates monotonous pacing. This analysis documents how duration works today before implementing dynamic duration.

## 1. Duration Constants & Defaults

### Inconsistency Found! 🚨
- **Code Default**: 180 frames (6 seconds) in `codeDurationExtractor.ts`
- **Database Default**: 150 frames (5 seconds) in schema
- **Need to reconcile**: Should be 180 frames everywhere

### Key Files:
- `/src/lib/utils/codeDurationExtractor.ts` - `DEFAULT_DURATION = 180`
- `/src/server/db/schema.ts` - `duration: d.integer().default(150).notNull()`
- `/src/brain/utils/durationParser.ts` - Parses user duration requests

## 2. Duration Flow

```
User Prompt → Brain Orchestrator → Tool → LLM → Generated Code → Extract Duration → Database
     ↓              ↓                ↓       ↓         ↓              ↓
"5 second"   parseDuration()    passes   decides   exports      analyzeDuration()
             = 150 frames     to prompt  duration  duration        = 150
```

## 3. How Each Tool Handles Duration

### ADD Tool (Primary Scene Creation)
1. Receives `requestedDurationFrames` from orchestrator
2. Includes in LLM prompt: "DURATION REQUIREMENT: The scene MUST be exactly X frames"
3. LLM generates: `export const durationInFrames_ABC123 = 300;`
4. System extracts and stores this duration

### TRIM Tool (Fast Duration Changes)
- Direct metadata update without code regeneration
- Supports:
  - Absolute: "make it 3 seconds" → 90 frames
  - Relative: "cut 2 seconds" → currentDuration - 60
  - Direct frames: "90 frames" → 90

### EDIT Tool
- Preserves existing duration by default
- Can change if animations require it
- Returns new duration in response

## 4. Duration Extraction Patterns

The system looks for these patterns in generated code:

```typescript
// NEW PATTERN (preferred)
export const durationInFrames_ABC123 = totalFrames_ABC123;

// LEGACY PATTERN
export const durationInFrames = 180;

// SCRIPT-BASED (calculated)
const script = [
  { frames: 30 },
  { frames: 60 },
  { frames: 90 }
];
// Total: 180 frames
```

## 5. LLM Duration Decision Making

Currently, the LLM decides duration based on:

### Explicit Signals:
- User request: "5 second intro" → 150 frames
- Keywords: "quick" → shorter, "epic" → longer

### Implicit Factors:
- **Content complexity**: More elements = longer duration
- **Animation type**: 
  - Text fade: 90-120 frames
  - Logo animation: 150-180 frames
  - Complex transitions: 180-300 frames
- **Scene purpose**:
  - Intro/outro: Often longer (180-300)
  - Transition: Shorter (60-90)
  - Main content: Variable (150-300)

## 6. Problems with Current System

### 1. **Every Scene is 6 Seconds**
- Monotonous pacing
- Doesn't match content needs
- Users must manually trim

### 2. **Inconsistent Defaults**
- Code says 180, database says 150
- Confusion in system

### 3. **LLM Has No Duration Guidelines**
- No content-based duration suggestions
- No pacing recommendations
- Defaults to 180 when unsure

### 4. **No Duration Intelligence**
- Text-only scene: Still 6 seconds (too long)
- Complex animation: Still 6 seconds (too short)
- No adaptation to content

## 7. Where Duration Lives

### Input:
- User prompt: "create a 5 second..."
- Brain orchestrator: `requestedDurationFrames`

### Processing:
- Tool prompts: Duration requirements
- LLM code: Duration exports

### Storage:
- Database: `scenes.duration` column (frames)
- Code: Duration export statement

### Rendering:
- Remotion: `<Sequence durationInFrames={scene.duration}>`
- Timeline: Visual duration representation

## 8. Duration Limits

### Parser Limits:
- Min: 15 frames (0.5 seconds)
- Max: 1800 frames (60 seconds)

### Extractor Limits:
- Min: 30 frames (1 second)
- Max: 3600 frames (2 minutes)

### Practical Limits:
- Most scenes: 90-300 frames (3-10 seconds)
- Typical: 150-180 frames (5-6 seconds)

## Next Steps for Dynamic Duration

1. **Fix inconsistency**: Make default 180 everywhere
2. **Create duration guidelines**: Based on content type
3. **Enhance LLM prompts**: Include duration suggestions
4. **Add duration analysis**: Look at scene content to suggest duration
5. **Implement auto-duration**: Let system decide based on content

## Key Questions to Address

1. Should simple text scenes be shorter by default?
2. Should complex animations be longer?
3. How do we determine optimal duration from content?
4. Should we have scene-type-based defaults?
   - Text: 90-120 frames
   - Logo: 150-180 frames  
   - Animation: 180-300 frames
   - Transition: 60-90 frames