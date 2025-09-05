# Typography Tool Merge Plan

## Current State Analysis

### Typography Tool
- **Purpose**: Creates text-focused animated scenes
- **Method**: Calls `codeGenerator.generateTypographyScene()`
- **Prompt**: Uses `TYPOGRAPHY_AGENT` - specialized for text animation
- **Features**:
  - Smart font sizing based on word count
  - Format-aware sizing (landscape/portrait/square)
  - Duration calculation based on text length
  - Typewriter effects, word bursts, gradient fills
  - Reading time calculation

### Add Tool
- **Purpose**: General scene creation
- **Method**: Multiple paths based on input type:
  - Text → `generateFromText()`
  - Images → `generateFromImages()`
  - Videos → `generateFromVideos()`
  - Web → `generateFromWebContext()`
  - Figma → `generateFromFigma()`
- **Prompt**: Uses general `CODE_GENERATOR` prompt

## Why Merge?

1. **They're fundamentally the same** - Both create scenes from scratch
2. **Typography is just specialized add** - Text-focused scene creation
3. **Reduces cognitive load** - One tool, conditional behavior
4. **Simplifies brain logic** - No need to decide between two similar tools
5. **Better maintenance** - Single code path for scene creation

## Merge Strategy: Conditional Context

### Detection Logic
```typescript
// In add tool's generateFromText method
const isTypographyFocused = (prompt: string): boolean => {
  const typographyIndicators = [
    /^(text|words?|type|typography|quote|title|heading|caption)/i,
    /\bsays?\b.*["'`]/i,  // "text that says..."
    /animated text/i,
    /text animation/i,
    /display.*text/i,
    /^["'`].*["'`]$/,  // Just quoted text
    /create.*text/i
  ];
  
  return typographyIndicators.some(pattern => pattern.test(prompt));
};
```

### Implementation Plan

#### Step 1: Enhance Add Tool
```typescript
private async generateFromText(input: AddToolInput): Promise<AddToolOutput> {
  const functionName = this.generateFunctionName();
  
  // Detect if this is typography-focused
  const isTypography = this.isTypographyFocused(input.userPrompt);
  
  if (isTypography) {
    // Use typography-specific generation
    const result = await codeGenerator.generateTypographyScene({
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectFormat: input.projectFormat,
      previousSceneContext: input.previousSceneContext,
    });
    
    return {
      success: true,
      tsxCode: result.code,
      name: result.name,
      duration: result.duration,
      reasoning: result.reasoning,
      chatResponse: `✨ Created animated text scene: "${result.name}"`,
      scene: { tsxCode: result.code, name: result.name, duration: result.duration },
    };
  }
  
  // Regular text-based generation
  // ... existing code
}
```

#### Step 2: Update Brain Orchestrator
```typescript
// Remove typographyScene from tool list
export type ToolName = 'addScene' | 'editScene' | 'deleteScene' | 'trimScene' | 'imageRecreatorScene' | 'addAudio' | 'websiteToVideo';

// Update decision logic
DECISION PROCESS:
- For ANY text/typography request → addScene (will auto-detect typography)
- Remove all references to typographyScene tool
```

#### Step 3: Smart Context Enhancement
Instead of separate tools, enhance the prompt context:

```typescript
// In CodeGeneratorNEW.ts
async generateFromText(input: {
  userPrompt: string;
  functionName: string;
  isTypographyFocused?: boolean;  // NEW
  // ... other params
}) {
  // Choose prompt based on context
  const systemPrompt = input.isTypographyFocused 
    ? TYPOGRAPHY_AGENT 
    : CODE_GENERATOR;
    
  // Or better: Merge prompts with conditional sections
  const enhancedPrompt = `
    ${CODE_GENERATOR.content}
    
    ${input.isTypographyFocused ? `
      TYPOGRAPHY FOCUS:
      ${TYPOGRAPHY_SPECIFIC_RULES}
    ` : ''}
  `;
}
```

## Benefits of This Approach

1. **Simpler Brain Logic**
   - No need to distinguish between addScene vs typographyScene
   - Just use addScene for everything

2. **Better User Experience**
   - Users don't need to know about tool differences
   - "Make a scene with text" → automatically gets typography treatment

3. **Easier to Extend**
   - Add more specialized contexts without new tools
   - E.g., detect "particles", "3D", "charts" → use specialized prompts

4. **Performance**
   - Same performance as before
   - But simpler code path = fewer bugs

## Migration Path

### Phase 1: Add Detection (5 min)
- Add `isTypographyFocused()` detection to add tool
- Route to typography generation when detected

### Phase 2: Update Brain (10 min)
- Remove typographyScene from available tools
- Update prompt to remove typography references
- Map all text requests to addScene

### Phase 3: Test & Verify (30 min)
- Test various text prompts
- Ensure typography detection works
- Verify non-text prompts still work

### Phase 4: Remove Typography Tool (5 min)
- Delete `/src/tools/typography/` directory
- Remove from tool type definitions
- Update imports

## Example User Flows

### Before (2 tools)
```
"Add text that says Welcome" → Brain decides → typographyScene
"Add a welcome message" → Brain decides → addScene or typographyScene?
"Create a scene with text" → Brain decides → typographyScene
"Make a blue scene with text" → Brain decides → addScene or typography?
```

### After (1 tool with context)
```
"Add text that says Welcome" → addScene → detects typography → uses TYPOGRAPHY_AGENT
"Add a welcome message" → addScene → detects typography → uses TYPOGRAPHY_AGENT  
"Create a scene with text" → addScene → detects typography → uses TYPOGRAPHY_AGENT
"Make a blue scene with text" → addScene → detects typography → uses TYPOGRAPHY_AGENT
"Make a particle scene" → addScene → no typography → uses CODE_GENERATOR
```

## Future Extensions

This pattern enables specialized contexts without new tools:

```typescript
const getSpecializedContext = (prompt: string) => {
  if (isTypography(prompt)) return 'typography';
  if (is3D(prompt)) return '3d';
  if (isDataViz(prompt)) return 'charts';
  if (isParticles(prompt)) return 'particles';
  return 'general';
};

// Use appropriate prompt/model based on context
const context = getSpecializedContext(input.userPrompt);
const systemPrompt = CONTEXT_PROMPTS[context];
```

## Conclusion

Merging typography into add is the right move. It:
- Simplifies the system (8 tools → 7 tools)
- Improves user experience (no ambiguity)
- Makes the code cleaner (conditional context > separate tools)
- Sets up a pattern for future specializations

The typography tool is just the add tool with a specialized prompt. Let's make that explicit by merging them.