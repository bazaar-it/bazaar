# Duration Flow in Bazaar-Vid

## Overview
This document traces how duration values flow through the Bazaar-Vid system from user input to final scene rendering.

## 1. User Input → Brain Orchestrator

### Entry Point: Chat Panel
- User provides duration in natural language: "Create a 10 second intro"
- Message sent to `generation.universal.ts` router

### Brain Orchestrator Processing (`/src/brain/orchestratorNEW.ts`)
```typescript
// Line 70: Attempts to pass duration (but it's always undefined)
requestedDurationSeconds: toolSelection.requestedDurationSeconds,
```

**Important**: The brain orchestrator does NOT extract duration. It passes `requestedDurationSeconds` but this value is always `undefined` because the brain AI prompt doesn't return it.

## 2. Tool Processing

### Add Tool (`/src/tools/add/add_helpers/CodeGeneratorNEW.ts`)
**Note**: The ADD tool does NOT use `requestedDurationSeconds` (it's always undefined)

Instead, the code generator:
1. Receives the full user prompt: "Create a 10 second intro"
2. The LLM generates code with appropriate duration
3. `analyzeDuration()` extracts the actual duration from generated code
4. This extracted duration is saved to the database

### Edit Tool
- Preserves existing scene duration by default
- If user requests duration change in prompt, the LLM regenerates code
- New duration extracted from regenerated code
- Does NOT use `requestedDurationSeconds` (undefined)

### Trim Tool (`/src/tools/trim/trim.ts`)
- Has its own duration parser (line 72-88)
- Extracts duration from patterns like "3 seconds", "90 frames"
- Updates database duration WITHOUT regenerating code
- Fast path for duration-only changes

## 3. Database Storage (`generation.universal.ts`)

### Add Scene (lines 66-81)
```typescript
// Trust the duration from the ADD tool
let addFinalDuration = addResult.data.duration || 150;

const [newScene] = await db.insert(scenes).values({
  // ...
  duration: addFinalDuration || 150,
  // ...
});
```

### Edit Scene (lines 144-156)
```typescript
// Use duration from edit result if provided
let editFinalDuration = editResult.data.duration;

.set({
  // ...
  duration: editFinalDuration || sceneToEdit.duration,
  // ...
})
```

### Trim Scene (lines 193-214)
```typescript
// Update only the duration
.set({
  duration: trimResult.data.duration,
  updatedAt: new Date(),
})
```

## 4. Scene Rendering

### Preview Panel (`PreviewPanelG.tsx`)
```tsx
// Line 228-234
<Series.Sequence
  key={`${sceneItem.sceneName}-${sceneIndex}`}
  durationInFrames={sceneDuration} // HARD LIMIT from database
  premountFor={60}
>
  <SceneWrapper>
    <DynamicSceneFromDB {...sceneItem} />
  </SceneWrapper>
</Series.Sequence>
```

### Admin Video Player (`AdminVideoPlayer.tsx`)
```tsx
// Lines 55-80
const sceneDuration = scene.duration || 150;

<Sequence
  key={scene.id}
  from={from}
  durationInFrames={sceneDuration} // HARD LIMIT from database
>
  <SceneWrapper>
    <DynamicSceneFromDB {...scene} />
  </SceneWrapper>
</Sequence>
```

## 5. Duration Enforcement

### Hard Limits
- Remotion's `<Sequence>` and `<Series.Sequence>` components enforce duration as a hard cutoff
- Scene will be cut off at the specified duration, regardless of animation length
- No content can exceed the container duration

### Duration Constants (`/src/lib/utils/codeDurationExtractor.ts`)
```typescript
export const DEFAULT_DURATION = 180; // 6 seconds
export const MIN_PRACTICAL_DURATION = 60; // 2 seconds  
export const MAX_DURATION = 900; // 30 seconds
```

## 6. Template System

### Adding Templates (`generation.universal.ts` lines 612-658)
```typescript
// Direct duration specification
templateeDuration: z.number(),

// Save with provided duration
const [newScene] = await db.insert(scenes).values({
  // ...
  duration: templateDuration,
  // ...
});
```

Templates can specify their own duration, bypassing AI analysis.

## 7. Duration Flow Summary

```mermaid
graph TD
    A[User Input] -->|"10 second intro"| B[Brain Orchestrator]
    B -->|Routes to tool| C[Tool Selection]
    C --> D{Which Tool?}
    D -->|Add| E[LLM Generates Code]
    D -->|Edit| F[LLM Regenerates]
    D -->|Trim| G[Parse Duration]
    E -->|analyzeDuration()| H[Extract Duration]
    F -->|analyzeDuration()| H
    G -->|"2 seconds" → 60 frames| H
    H -->|duration: frames| I[Database]
    I -->|scene.duration| J[Preview/Player]
    J -->|durationInFrames| K[Remotion Sequence]
    K -->|Hard Cutoff| L[Rendered Scene]
```

## Key Insights

1. **Duration is frames-based throughout the system** (30fps standard)
2. **Multiple default values exist:**
   - Code Generator: 150 frames (5s)
   - Duration Extractor: 180 frames (6s)
   - Various templates: 60-300 frames (2-10s)

3. **Duration enforcement happens at render time** via Remotion components
4. **Tools can analyze and modify duration** based on animation content
5. **Templates bypass AI analysis** for duration

## How It Actually Works

1. **Duration is NOT parsed by brain orchestrator** - It's always undefined
2. **LLMs understand duration from context** - "quick" vs "10 seconds"
3. **Each tool handles duration differently**:
   - ADD: LLM generates, system extracts
   - EDIT: LLM regenerates, system extracts
   - TRIM: Tool parses duration directly
4. **All duration stored as frames** (30fps) in database