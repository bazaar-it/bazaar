# Prompt Flow Architecture

This document explains the prompt processing pipeline for BAZAAR-302's scene-first generation approach.

## Overview

The system uses a two-step model for generating Remotion components:

1. **Prompt Analysis** - Classify user intent and specificity
2. **Template Injection** - Enhance low-specificity prompts with code snippets

## Architecture Diagram

```
User Prompt
     ↓
[Prompt Inspector] ← analyzePrompt()
     ↓
┌─────────────────┐    ┌─────────────────┐
│ High Specificity│    │ Low Specificity │
│ (2+ tech tokens │    │ (vague prompts) │
│  OR duration +  │    │                 │
│  visual props)  │    │                 │
└─────────────────┘    └─────────────────┘
     ↓                          ↓
[Direct LLM Call]      [Template Snippet] ← getTemplateSnippet()
     ↓                          ↓
[Generated Code]       [Enhanced LLM Call]
     ↓                          ↓
[Database Storage]     [Generated Code]
     ↓                          ↓
[Browser Preview]      [Database Storage]
                               ↓
                       [Browser Preview]
```

## Single Scene vs Multi-Scene Branch

### Single Scene Generation
- **Trigger**: "Single Scene" mode in UI
- **Flow**: Prompt → Analysis → Generation → Immediate Preview
- **Storage**: Postgres `scenes` table
- **Preview**: Blob URL + `import()` for sub-second feedback

### Multi-Scene Generation  
- **Trigger**: "Multi-Scene Video" mode in UI
- **Flow**: Prompt → Scene Planning → Style → Assets → Components
- **Storage**: Traditional storyboard approach
- **Preview**: Full video composition

## Prompt Analysis (`promptInspector.ts`)

### High-Specificity Indicators
- **Technical tokens** (2+ required): `interpolate`, `spring`, `useCurrentFrame`, `translateX`, etc.
- **Duration + Visual**: Explicit timing with visual properties
- **CSS properties**: `backgroundColor`, `borderRadius`, `transform`, etc.

### Low-Specificity Indicators
- **Vague descriptions**: "cool animation", "nice effect"
- **Pattern hints**: "bounce", "spin", "fade", "slide"
- **Single visual property**: color, size, movement without technical details

### Example Classifications

```typescript
// High specificity (no template needed)
"Create animation with interpolate and spring effects"
"Set backgroundColor to blue and add borderRadius"
"Use translateX for 3 seconds with opacity fade"

// Low specificity (template injection)
"cool bubble animation"        → bounce template
"spinning logo"               → spin template  
"text that appears"           → fade template
```

## Template Snippet System (`getTemplateSnippet.ts`)

### Template Categories
- **bounce**: Vertical movement with easing
- **spin**: Rotation animations
- **fade**: Opacity transitions
- **slide**: Horizontal/vertical sliding

### Snippet Processing
1. **Whitespace stripping**: Remove comments and extra spaces
2. **Token limiting**: Max 40 tokens (~200 characters)
3. **Truncation**: Add "..." if needed
4. **Fallback hints**: Style suggestions when no template matches

### Example Template

```typescript
// Input pattern: "bounce"
// Output snippet:
"const frame = useCurrentFrame(); const bounceY = interpolate(frame % 60, [0, 30, 60], [0, -50, 0], { easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) }); return ( <div style={{ transform: `translateY(${bounceY}px)`, width: 100, height: 100, backgroundColor: '#ff6b6b' }}> Bouncing Element </div> );"
```

## Edit Loop with @scene(id) Tagging

### Auto-Tagging Logic
```typescript
// Detect edit commands (≤5 words + edit verbs)
isLikelyEdit("make it red")     → true
isLikelyEdit("change the color") → true  
isLikelyEdit("create a new animation") → false

// Auto-tag when scene selected
"make it red" → "@scene(uuid-123) make it red"
```

### Edit Mode Processing
1. **Pattern Detection**: `^@scene\(([^)]+)\)\s+([\s\S]*)$`
2. **Scene Lookup**: Fetch existing `tsxCode` from database
3. **Edit Prompt**: Focused system prompt for modifications
4. **Code Update**: `UPDATE scenes SET tsxCode = ... WHERE id = ...`

### Edit System Prompt
```
You are editing an existing Remotion component. Apply ONLY the requested change while preserving the existing structure and functionality.

EXISTING COMPONENT CODE:
```tsx
[existing code here]
```

Apply the requested change while maintaining all existing functionality.
```

## Database Schema

### Scenes Table
```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(255) DEFAULT 'Scene',
  tsx_code TEXT NOT NULL,
  props JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenes_project_order ON scenes(project_id, "order");
```

### Props Structure
```typescript
interface SceneProps {
  userPrompt: string;
  insight: PromptInsight;
  templateSnippet?: string;
  styleHint?: string;
  isEdit?: boolean;
  originalPrompt?: string; // For edit operations
}
```

## ESM Compatibility Rules

### Required Patterns
```typescript
// ✅ Correct - Use window.Remotion
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

// ❌ Forbidden - Import statements
import React from 'react';
import { AbsoluteFill } from 'remotion';
```

### Code Validation
1. **No React imports**: Removed automatically
2. **No Remotion imports**: Replaced with `window.Remotion`
3. **Default export required**: Component must export default
4. **Window globals**: React and Remotion available globally

## Performance Characteristics

### Sub-Second Preview
- **Blob URL creation**: ~10ms
- **Dynamic import**: ~50-100ms  
- **Component compilation**: ~200ms
- **Total time to preview**: <500ms

### Database Operations
- **Scene insert**: Async, non-blocking
- **Scene update**: Immediate for edits
- **Query optimization**: Index on `(project_id, order)`

## Error Handling

### Fallback Strategies
1. **Generation failure**: Return template component
2. **Compilation error**: Show error in preview
3. **Database error**: Continue with in-memory state
4. **Template missing**: Use default style hint

### User Feedback
- **Edit without selection**: "Please select a scene to edit first"
- **Generation error**: Show specific error message
- **Compilation warning**: Log but continue with fallback

## Future Considerations

### BAZAAR-303: Publish Pipeline
- **ESBuild bundling**: Server-side compilation
- **R2 upload**: Cloudflare storage for production assets
- **Public URLs**: Shareable component links

### BAZAAR-304: Multi-Scene Storyboard
- **Scene ordering**: Drag-to-reorder UI
- **Composition stitching**: Sequential scene playback
- **Transition effects**: Between-scene animations

## Development Guidelines

### Adding New Templates
1. Add pattern to `getPatternHint()` function
2. Create template in `templates` object
3. Test with both unit and smoke tests
4. Update documentation

### Modifying Prompt Analysis
1. Update token lists in `analyzePrompt()`
2. Adjust specificity thresholds carefully
3. Test edge cases thoroughly
4. Consider backward compatibility

### ESM Compatibility
- **Never import React/Remotion** in generated code
- **Always use window.Remotion** destructuring
- **Validate patterns** before compilation
- **Test in browser environment** for compatibility

---

*This document is part of the BAZAAR-302 implementation. For questions or updates, see the sprint documentation in `/memory-bank/sprints/sprint26/`.* 