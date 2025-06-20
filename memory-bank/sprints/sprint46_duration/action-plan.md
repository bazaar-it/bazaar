# Duration Action Plan - Sprint 46

## Core Philosophy: The Infrastructure Already Works

Duration handling is already built into the system at multiple levels:
- **New scenes**: LLM generates appropriate duration based on user intent
- **Existing scenes**: TRIM tool handles "make scene 3 2 seconds" perfectly
- **Content changes**: EDIT tool adjusts animations to fit new durations

## Current Reality

1. **The pipeline already passes user prompts to the LLM**
   - User: "Create a quick flash of text" → LLM generates 30-60 frames
   - User: "Create an epic 10 second intro" → LLM generates 300 frames
   - User: "Show product features" → LLM decides based on content complexity

2. **Duration extraction already works**
   - `analyzeDuration()` extracts the actual duration from generated code
   - This duration is saved to the database
   - Remotion enforces it during rendering

3. **The LLM is already smart about duration**
   - It understands context: "quick" = short, "epic" = long
   - It matches duration to animation complexity
   - It sees the full user prompt

## What Actually Needs Fixing

### Problem 1: Inconsistent Defaults
**Current**: 6+ different default values scattered everywhere
**Solution**: Just pick one and stick with it

```typescript
// In code-generator.ts prompt
"Generate animations that fit the user's request naturally.
Default to around 5 seconds (150 frames) for general requests."
```

### Problem 2: Mixed Frame/Second Units
**Current**: Some code uses frames, some uses seconds
**Solution**: Stay in frames everywhere (Remotion's native unit)

### Problem 3: Template Rigidity
**Current**: 23 templates with hardcoded durations
**Solution**: Leave them alone - they work fine as examples

## Minimal Action Plan

### 1. Update Code Generator Prompt (Minimal Change)
```typescript
// In /src/config/prompts/active/code-generator.ts
// Change line 35 from:
"5. Default duration: 150 frames (5 seconds at 30fps) unless specified"
// To:
"5. Duration: Generate animations that match the user's intent naturally"
```

That's it. The LLM will understand:
- "quick flash" → 30-60 frames
- "product showcase" → 150-300 frames
- "5 seconds" → 150 frames
- No mention → appropriate duration for content

### 2. Fix Inconsistent Defaults (Optional)
The scattered defaults (60, 90, 150, 180, 300) aren't actually a problem because:
- Templates work fine with their hardcoded durations
- New scenes get duration from generated code
- Existing scenes can be trimmed/edited

Only fix if it causes actual bugs.

### 3. Document the Approach (Done)
- Scene duration = container limit
- Animation duration = what happens inside
- LLM decides duration based on user intent

## What We're NOT Doing

❌ Adding duration parsing to brain orchestrator
❌ Creating complex duration configuration systems
❌ Updating all 23 templates
❌ Building duration validation layers
❌ Adding more parameters to tool interfaces

## How Duration Already Works

### Creating New Scenes:
1. **User**: "Create a quick logo flash"
2. **Brain**: Routes to ADD tool
3. **LLM**: Generates 60-frame animation
4. **System**: Extracts and saves duration

### Changing Duration:
1. **User**: "Make scene 3 2 seconds"
2. **Brain**: Routes to TRIM tool (fast path)
3. **TRIM**: Parses "2 seconds" → 60 frames
4. **Database**: Updates duration to 60

### Content + Duration:
1. **User**: "Compress animations to fit 3 seconds"
2. **Brain**: Routes to EDIT tool
3. **EDIT**: Regenerates with 90-frame constraint
4. **System**: New code with adjusted timings

## Success Metrics

✅ Users get appropriate durations without specifying seconds
✅ "Quick" things are quick, "long" things are long
✅ Explicit durations ("5 seconds") are respected
✅ No overengineering

## Actual Action Items

### Required (1 minute):
1. Update code generator prompt line 35 to remove "default duration" language

### Not Required:
- ❌ Brain orchestrator changes (already routes correctly)
- ❌ New duration parsing (TRIM tool already does it)
- ❌ Config files (overengineering)
- ❌ Template updates (they work fine)

### Testing:
The system already handles:
- "Create 5 second intro" → ADD tool generates 150 frames
- "Make scene 2 3 seconds" → TRIM tool sets to 90 frames
- "Extend by 2 seconds" → TRIM tool adds 60 frames
- "Speed up the animations" → EDIT tool regenerates

## Remember

The best code is no code. The second best code is simple code.
We already have a working system. Don't break it by making it "better".