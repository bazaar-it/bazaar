# Prompt Simplification Guide - Trust the Models

## Current Problem: Over-Instructing AI

Our current prompts are 500-2000 lines of prescriptive rules. This causes:
- Model confusion
- Less creativity
- More hallucinations
- Harder maintenance

## New Philosophy: Trust Modern Models

### Before (BAD) - 1000+ words:
```typescript
const CODE_GENERATOR = `React/Remotion expert. Convert JSON guidance to high-quality code.

🚨 CRITICAL RULES:
- const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- export default function {{FUNCTION_NAME}}() - MUST be on the function declaration line
- NO imports, NO markdown
- Quote ALL CSS values: fontSize: "4rem", fontWeight: "700"
- Use extrapolateLeft: "clamp", extrapolateRight: "clamp"
- Single transform per element (combine: translate(-50%, -50%) scale(1.2))
- Use standard CSS, avoid WebKit-only properties
- 🚨 FONT FAMILIES: ONLY use "Inter", "Arial", or "sans-serif"
- 🚨 INTERPOLATE() CRITICAL: outputRange must contain ONLY numbers
  ❌ WRONG: interpolate(frame, [0, 30], ["-200px", "0px"])
  ✅ CORRECT: const x = interpolate(frame, [0, 30], [-200, 0]); 
[... 500 more lines of rules ...]`;
```

### After (GOOD) - <100 words:
```typescript
const CODE_GENERATOR = `Generate a React/Remotion component.

Context:
- Use window.Remotion (no imports)
- Export: export default function ComponentName()
- User wants: {{USER_PROMPT}}
- Style preference: {{STYLE}}

Create something beautiful.`;
```

## Simplification Rules

### 1. Remove Prescriptive Rules
```typescript
// BAD
"You MUST use fontSize: '4rem' with quotes"
"ALWAYS use Inter font family"
"NEVER use system-ui"

// GOOD
// Just let the model choose appropriate values
```

### 2. Focus on Context, Not Rules
```typescript
// BAD
"Follow these 47 animation timing rules..."

// GOOD
"Animation style: smooth and modern"
```

### 3. Trust Model Knowledge
```typescript
// BAD
"To create a button, you must:
1. Create a div element
2. Add onClick handler
3. Style with these exact properties..."

// GOOD
"Create a button that says {{TEXT}}"
// Model knows how to make buttons!
```

### 4. Use Examples Sparingly
```typescript
// BAD - Teaching the model
"Here's how to use interpolate:
Example 1: ...
Example 2: ...
Example 3: ..."

// GOOD - Just the need
"Animate entrance over 1 second"
```

## Prompt Templates by Service

### Brain Orchestrator
```typescript
// Old: 115 lines
// New: 15 lines
const BRAIN_ORCHESTRATOR = `Analyze the user request and choose the appropriate tool.

Available tools:
- addScene: Create new scenes
- editScene: Modify existing scenes (surgical/creative/fix)
- deleteScene: Remove scenes
- analyzeImage: Understand uploaded images

Context: {{SCENE_COUNT}} scenes exist
User says: "{{PROMPT}}"

Return: { tool, reasoning, confidence }`;
```

### Code Generator
```typescript
// Old: 60 lines of rules
// New: 8 lines of context
const CODE_GENERATOR = `Create a React/Remotion component.

Request: {{USER_PROMPT}}
Style: {{USER_STYLE || 'modern'}}
Duration: {{DURATION || 6}} seconds

Component name: {{COMPONENT_NAME}}`;
```

### Layout Generator
```typescript
// Old: Complex rules about JSON structure
// New: Simple and trusting
const LAYOUT_GENERATOR = `Design the layout for: {{PROMPT}}

Consider:
- Visual hierarchy
- User's style preference: {{STYLE}}
- Mobile-friendly

Return layout as JSON.`;
```

### Edit Services

#### Surgical Editor
```typescript
const SURGICAL_EDIT = `Make this specific change: {{CHANGE}}

Current code:
{{CODE}}

Change only what's needed.`;
```

#### Creative Editor
```typescript
const CREATIVE_EDIT = `Enhance this scene: {{PROMPT}}

Current code:
{{CODE}}

Be creative while preserving functionality.`;
```

## Migration Strategy

### Phase 1: Measure Current Output
1. Save 100 outputs with current prompts
2. Note quality, creativity, accuracy

### Phase 2: Gradual Reduction
1. Remove 50% of rules
2. Test output quality
3. Remove another 25%
4. Test again

### Phase 3: A/B Testing
```typescript
// Run both prompts in parallel
const [oldResult, newResult] = await Promise.all([
  generateWithOldPrompt(input),
  generateWithNewPrompt(input)
]);

// Compare quality
```

### Phase 4: Monitor & Adjust
- Track user satisfaction
- Monitor error rates
- Fine-tune as needed

## Expected Benefits

### 1. Better Creativity
Without rigid rules, models can:
- Use modern patterns they know
- Apply best practices naturally
- Create unique solutions

### 2. Fewer Errors
Less confusion means:
- No conflicting rules
- Clear intent
- Natural code generation

### 3. Easier Maintenance
- 90% less prompt code
- Easier to understand
- Faster to modify

### 4. Model Evolution
As models improve:
- No need to update rules
- Automatically benefits
- Future-proof

## Testing Simplified Prompts

### Test 1: Basic Generation
```typescript
// Minimal prompt
const result = await generate({
  prompt: "Button that counts clicks",
  style: "playful"
});

// Should produce modern React code with:
// - Proper state management
// - Nice animations
// - Good styling
// WITHOUT being told how
```

### Test 2: Complex Scene
```typescript
const result = await generate({
  prompt: "Dashboard showing sales data with charts",
  style: "professional"
});

// Model should know:
// - Chart libraries
// - Layout patterns
// - Data visualization
// WITHOUT 500 lines of instructions
```

### Test 3: Creative Freedom
```typescript
const result = await generate({
  prompt: "Something surprising and delightful",
  style: "experimental"
});

// With minimal constraints, see what it creates!
```

## Monitoring Quality

### Metrics to Track
1. **Code Quality**
   - Syntax errors: Should be near 0%
   - Runtime errors: Should be <5%
   - ESLint issues: Should be minimal

2. **User Satisfaction**
   - "Regenerate" clicks: Should decrease
   - Positive feedback: Should increase
   - Time to satisfaction: Should decrease

3. **Model Performance**
   - Response time: Should be faster
   - Token usage: Should be lower
   - Cost: Should decrease 50%+

## Rollback Criteria

If simplified prompts cause:
- >10% increase in errors
- >20% decrease in satisfaction
- Critical functionality loss

Then rollback and analyze why.

## Future Vision

```typescript
// Ultimate simplicity
const FUTURE_PROMPT = `{{USER_REQUEST}}`;

// Just pass through what user wants
// Trust model completely
// No prompt engineering needed
```

As models improve, prompts disappear!