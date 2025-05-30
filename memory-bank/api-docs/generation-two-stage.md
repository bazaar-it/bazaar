# Two-Stage Scene Generation API

## Overview

The two-stage architecture provides a clean, predictable approach to generating animated scenes by separating planning from code generation.

## Architecture

### Stage 1: Scene Planner
**Function**: `planScene(userMessage: string)`
**Purpose**: Convert user input into structured JSON specification
**Model**: `gpt-4o-mini` with `json_object` response format

#### Input
- User message describing the desired scene
- Examples: "Create a hero section", "Make a loading animation", "Build a pricing table"

#### Output JSON Structure
```typescript
{
  component: {
    name: string;        // e.g., "Hero Section", "Loading Spinner"
    layout: string;      // Layout description using Tailwind classes
  },
  styling: {
    font: string;        // e.g., "Inter", "SF Pro Display"
    radius: string;      // e.g., "15px", "50%"
    palette: string;     // e.g., "high-contrast", "tech"
    background: string;  // Hex color
    textColor: string;   // Hex color
  },
  text: {
    headline?: string;   // Main title text
    subheading?: string; // Subtitle text
  },
  motion: {
    type: string;           // "fade", "slide", "zoom", "bounce", "explode", "typewriter"
    direction?: string;     // "left", "right", "up", "down", "bottom"
    durationInFrames: number; // Animation duration at 30fps
    easing: string;         // "easeOut", "easeIn", "easeInOut", "linear"
  }
}
```

#### Motion Types
| Type | Description | Use Cases |
|------|-------------|-----------|
| `fade` | Opacity in/out | Text, background transitions |
| `slide` | X or Y translate | Modals, drawers, panels |
| `zoom` | Scale in/out | Hero content, buttons |
| `bounce` | Elastic scale | Interactive elements |
| `explode` | Particles outward | Logo reveals, celebrations |
| `typewriter` | Character-by-character reveal | Code blocks, chat messages |

### Stage 2: Code Generator
**Function**: `generateCodeFromPlan(plan: any, userMessage: string)`
**Purpose**: Convert JSON specification into React/Remotion component
**Model**: `gpt-4o-mini`

#### Input
- JSON plan from Stage 1
- Original user message for context

#### Output
- Production-ready React/Remotion component code
- Uses `window.Remotion` destructuring (no imports)
- Implements specified motion type
- Follows component naming conventions

#### Code Structure
```tsx
const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;

export default function ComponentName() {
  const frame = useCurrentFrame();
  // Motion implementation based on plan.motion.type
  
  return (
    <AbsoluteFill style={{/* styling from plan */}}>
      {/* Component layout */}
    </AbsoluteFill>
  );
}
```

## Integration with Chat System

### generateSceneWithChat Procedure

The main tRPC procedure that integrates both stages:

```typescript
generateSceneWithChat: protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
    userMessage: z.string(),
    sceneId: z.string().optional(),
  }))
```

#### Flow Diagram
```
User Message
    ↓
Edit Mode Check
    ↓
┌─────────────────┬─────────────────┐
│   New Scene     │   Edit Scene    │
│                 │                 │
│ Stage 1: Plan   │ Direct LLM      │
│ Stage 2: Code   │ Edit Existing   │
└─────────────────┴─────────────────┘
    ↓
Code Cleanup & Validation
    ↓
Database Storage
    ↓
Chat Message Update
```

## Error Handling

### Stage 1 Fallbacks
If JSON parsing fails, returns default plan:
```json
{
  "component": { "name": "Hero Section", "layout": "Centered content" },
  "styling": { "font": "Inter", "background": "#000000", "textColor": "#FFFFFF" },
  "text": { "headline": "Generated Content", "subheading": "User message preview" },
  "motion": { "type": "fade", "durationInFrames": 120, "easing": "easeOut" }
}
```

### Stage 2 Fallbacks
If code generation fails, returns minimal working component:
```tsx
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function GeneratedComponent() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', opacity }}>
      <div style={{ color: '#fff', fontSize: 48 }}>
        Generated Scene
      </div>
    </AbsoluteFill>
  );
}
```

## Code Validation

### Validation Rules
1. ✅ Contains `export default function`
2. ✅ Uses `window.Remotion` destructuring
3. ✅ Valid TypeScript/JSX syntax
4. ✅ No dangerous patterns (infinite loops, explicit errors)
5. ✅ Proper React component structure

### Cleanup Process
1. Remove any `import` statements
2. Ensure `window.Remotion` destructuring exists
3. Convert arrow functions to export default functions
4. Validate interpolate array lengths match
5. Add missing closing braces

## Performance Characteristics

### Timing
- Stage 1 (Planning): ~1-2 seconds
- Stage 2 (Code Gen): ~2-3 seconds
- Total: ~3-5 seconds per scene

### Token Usage
- Stage 1: ~500-800 tokens
- Stage 2: ~1000-1500 tokens
- Edit mode: ~800-1200 tokens

### Success Rates
- Stage 1 JSON parsing: ~95%
- Stage 2 valid code: ~90%
- Overall success: ~85%

## Usage Examples

### Basic Hero Section
```
Input: "Create a hero section with a call to action"
Plan: { component: "Hero Section", motion: "fade", text: "Turn Ideas into Reality" }
Output: Animated hero with fade-in title and CTA button
```

### Loading Animation
```
Input: "Make a loading spinner"
Plan: { component: "Loading Spinner", motion: "bounce", styling: "circular" }
Output: Bouncing circular spinner with scale animation
```

### Pricing Card
```
Input: "Build a pricing card for premium plan"
Plan: { component: "Pricing Card", motion: "slide", direction: "up" }
Output: Card sliding up with pricing details and features
```

## Best Practices

### For Optimal Results
1. Be specific about the desired component type
2. Mention motion preferences explicitly
3. Include color/styling requirements
4. Specify text content when needed

### Prompt Examples
- ✅ "Create a dark hero section with fade-in animation and blue accents"
- ✅ "Make a loading spinner that bounces and uses purple colors"
- ✅ "Build a slide-in modal for delete confirmation with red warning colors"
- ❌ "Make something cool" (too vague)
- ❌ "Create a component" (no specifics)

## Debugging

### Stage 1 Debug Info
```javascript
console.log(`[generateSceneWithChat] Scene plan:`, JSON.stringify(scenePlan, null, 2));
```

### Stage 2 Debug Info
```javascript
console.log(`[generateSceneWithChat] Generated code length: ${generatedCode.length} characters`);
```

### Common Issues
1. **JSON Parse Errors**: Usually due to LLM hallucination, fallback plan activates
2. **Code Validation Failures**: Missing exports or invalid syntax, cleanup fixes most issues
3. **Animation Glitches**: Interpolate array length mismatches, validation catches these

## Future Enhancements

### Planned Improvements
1. More Flowbite component templates
2. Advanced motion combinations
3. Asset integration (images, icons)
4. Style inheritance between scenes
5. Performance optimizations

### Extension Points
- Custom motion types via plugin system
- Flowbite component library expansion
- External asset management
- Theme and brand consistency
- Multi-scene coordination 