# Feature 31: Fix First Scene Context Issue

**Created**: January 2, 2025  
**Priority**: MEDIUM  
**Complexity**: MEDIUM (1-2 days)  
**Status**: Not Started  
**Feature Type**: Bug Fix

## Overview

Remove previous scene context contamination that causes all first scenes to appear similar with purple/generic styling. Ensure each new project starts with a clean slate and generates unique, creative first scenes based solely on the user's prompt.

## Current State

- All first scenes generated are appearing similar with purple styling
- Suggests context bleed from previous projects or hardcoded defaults
- Reduces perceived AI capability and user satisfaction
- Makes the platform feel less dynamic and creative

## User Problems

1. **Lack of Variety**: First scenes all look similar regardless of prompt
2. **Purple Theme Dominance**: Consistent purple/generic styling across different projects
3. **Reduced Creativity**: AI appears less capable than it actually is
4. **Poor First Impression**: Users' initial experience lacks the "wow" factor
5. **Context Contamination**: Previous project styles bleeding into new projects

## Root Cause Investigation Areas

### 1. Brain Orchestrator Context Building
Check if previous scene context is incorrectly passed to first scene generation:
- Previous project data persisting in context
- Default template being applied when none selected
- Cached context between different users' requests

### 2. System Prompts
Review CODE_GENERATOR prompt for:
- Hardcoded style preferences or examples
- Purple-biased sample code
- Default styling instructions

### 3. Template Influence
Verify templates aren't automatically applying:
- Check if a default template is selected
- Ensure template context only applied when explicitly chosen

### 4. Caching Issues
Look for persistent context between requests:
- Session storage maintaining old context
- Server-side caching of generation context

## Technical Implementation

### 1. Context Isolation for First Scenes

```typescript
// brain/orchestratorNEW.ts - Ensure clean context for first scenes
export class BrainOrchestrator {
  async buildContext(
    projectId: string, 
    sceneId?: string,
    options?: { isFirstScene?: boolean }
  ): Promise<GenerationContext> {
    // Get project scenes
    const scenes = await this.getProjectScenes(projectId);
    
    // CRITICAL: For first scene, ensure completely clean context
    if (scenes.length === 0 || options?.isFirstScene) {
      console.log('[CONTEXT] Building clean context for first scene');
      
      return {
        projectId,
        projectScenes: [], // Empty - no previous scenes
        styleContext: null, // No inherited styles
        previousSceneCode: null, // No reference code
        templateCode: null, // No template unless explicitly selected
        colorPalette: null, // No inherited colors
        isFirstScene: true,
        // Only include user's current prompt
        userPrompt: options?.userPrompt || '',
        metadata: {
          timestamp: new Date(),
          contextType: 'first_scene_clean'
        }
      };
    }
    
    // For subsequent scenes, build full context
    return this.buildFullContext(scenes, sceneId);
  }
  
  // Add debug logging to trace context
  private debugContext(context: GenerationContext) {
    console.log('[DEBUG] Generation Context:', {
      hasProjectScenes: context.projectScenes.length > 0,
      hasStyleContext: !!context.styleContext,
      hasPreviousCode: !!context.previousSceneCode,
      hasTemplate: !!context.templateCode,
      hasColorPalette: !!context.colorPalette,
      isFirstScene: context.isFirstScene
    });
  }
}
```

### 2. Remove Style Bias from Prompts

```typescript
// config/prompts/active/code-generator.ts
export const CODE_GENERATOR_PROMPT = `
You are an expert at creating Remotion React components for motion graphics videos.

CRITICAL FOR FIRST SCENES:
- Each first scene should be UNIQUE and reflect ONLY the user's specific request
- DO NOT use default purple colors or any predetermined color scheme
- DO NOT apply any template styling unless explicitly requested
- Choose colors that match the user's prompt context:
  - Business: Professional blues, grays
  - Fun/Party: Bright, vibrant colors
  - Education: Calm, readable colors
  - Product: Match product theme
  
${
  // Remove any hardcoded examples that might bias toward purple
  // OLD: Example with purple theme
  // NEW: Dynamic examples based on context
}

STYLE GUIDELINES FOR FIRST SCENES:
1. Analyze the user's prompt for style hints
2. Choose appropriate colors for the content type
3. Ensure high variety between different projects
4. Never default to purple unless requested

// Rest of prompt...
`;
```

### 3. Add First Scene Detection

```typescript
// tools/add/add.ts
export async function executeAddTool(input: AddToolInput, context: ToolContext) {
  const { prompt, projectId, referenceImageUrl } = input;
  
  // Detect if this is the first scene
  const projectScenes = await getProjectScenes(projectId);
  const isFirstScene = projectScenes.length === 0;
  
  if (isFirstScene) {
    console.log('[ADD_TOOL] Generating first scene - ensuring clean context');
    
    // Override any inherited context
    context = {
      ...context,
      projectScenes: [],
      styleContext: null,
      previousSceneCode: null,
      isFirstScene: true
    };
  }
  
  // Generate with clean context
  const generatedCode = await generateSceneCode(prompt, context);
  
  return {
    code: generatedCode,
    metadata: {
      isFirstScene,
      contextUsed: isFirstScene ? 'clean' : 'inherited'
    }
  };
}
```

### 4. Debug Logging System

```typescript
// utils/debug-context.ts
export class ContextDebugger {
  private static instance: ContextDebugger;
  private contextHistory: Map<string, GenerationContext> = new Map();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new ContextDebugger();
    }
    return this.instance;
  }
  
  logContext(requestId: string, context: GenerationContext) {
    // Store context for debugging
    this.contextHistory.set(requestId, context);
    
    // Log potential issues
    if (context.isFirstScene && context.projectScenes.length > 0) {
      console.error('[CONTEXT_ERROR] First scene has project scenes in context!');
    }
    
    if (context.isFirstScene && context.styleContext) {
      console.error('[CONTEXT_ERROR] First scene has inherited style context!');
    }
    
    // Extract and log colors from any previous code
    if (context.previousSceneCode) {
      const colors = this.extractColors(context.previousSceneCode);
      console.log('[CONTEXT_COLORS] Previous scene colors:', colors);
    }
  }
  
  private extractColors(code: string): string[] {
    // Extract hex colors, rgb values, and color names
    const hexColors = code.match(/#[0-9A-Fa-f]{6}/g) || [];
    const rgbColors = code.match(/rgb\([^)]+\)/g) || [];
    const namedColors = code.match(/(?:bg-|text-|border-)(\w+)-\d+/g) || [];
    
    return [...hexColors, ...rgbColors, ...namedColors];
  }
  
  async analyzeFirstSceneVariety(count: number = 10) {
    // Test function to generate multiple first scenes and check variety
    const prompts = [
      "Create a business presentation slide",
      "Make a fun birthday animation",
      "Design a product showcase",
      "Build a motivational quote display",
      "Create an educational infographic",
      "Make a social media announcement",
      "Design a tech startup intro",
      "Create a restaurant menu display",
      "Build a fitness motivation video",
      "Make a travel destination showcase"
    ];
    
    const results = [];
    
    for (const prompt of prompts.slice(0, count)) {
      const mockContext = {
        projectId: `test-${Date.now()}`,
        projectScenes: [],
        isFirstScene: true,
        userPrompt: prompt
      };
      
      // Generate scene (mocked for testing)
      const generatedCode = await this.mockGenerateScene(prompt, mockContext);
      const colors = this.extractColors(generatedCode);
      
      results.push({
        prompt,
        colors,
        hasPurple: colors.some(c => c.includes('purple') || c.includes('#9333ea'))
      });
    }
    
    // Analyze results
    const purpleCount = results.filter(r => r.hasPurple).length;
    const varietyScore = new Set(results.flatMap(r => r.colors)).size;
    
    console.log('[VARIETY_ANALYSIS]', {
      totalScenes: count,
      purpleScenes: purpleCount,
      purplePercentage: (purpleCount / count) * 100,
      uniqueColors: varietyScore,
      results
    });
    
    return results;
  }
}
```

### 5. Clean Template System

```typescript
// Ensure templates don't auto-apply
export async function getGenerationContext(options: {
  projectId: string;
  templateId?: string;
  isFirstScene: boolean;
}) {
  const context: GenerationContext = {
    projectId: options.projectId,
    projectScenes: [],
    isFirstScene: options.isFirstScene
  };
  
  // Only add template if explicitly provided
  if (options.templateId) {
    console.log('[CONTEXT] Adding template to context:', options.templateId);
    const template = await getTemplate(options.templateId);
    context.templateCode = template.code;
    context.templateStyle = template.style;
  } else if (options.isFirstScene) {
    // CRITICAL: Ensure no default template for first scenes
    console.log('[CONTEXT] First scene - no template applied');
    context.templateCode = null;
    context.templateStyle = null;
  }
  
  return context;
}
```

### 6. Cache Busting

```typescript
// Ensure no context persistence between requests
export class GenerationService {
  private contextCache = new Map<string, GenerationContext>();
  
  async generateScene(input: GenerateSceneInput) {
    const requestId = `${input.projectId}-${Date.now()}`;
    
    // CRITICAL: Never reuse context for first scenes
    if (input.isFirstScene) {
      this.contextCache.delete(input.projectId);
    }
    
    // Build fresh context
    const context = await this.buildContext(input);
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      ContextDebugger.getInstance().logContext(requestId, context);
    }
    
    // Generate scene
    const result = await this.generate(input, context);
    
    // Clear context after generation
    if (input.isFirstScene) {
      this.contextCache.delete(input.projectId);
    }
    
    return result;
  }
}
```

## Testing Strategy

### 1. Automated Variety Testing

```typescript
// tests/first-scene-variety.test.ts
describe('First Scene Variety', () => {
  it('should generate unique colors for different prompts', async () => {
    const prompts = [
      { text: "Business presentation", expectedColors: ['blue', 'gray', 'white'] },
      { text: "Birthday party", expectedColors: ['pink', 'yellow', 'orange'] },
      { text: "Nature documentary", expectedColors: ['green', 'brown', 'blue'] },
      { text: "Tech startup", expectedColors: ['black', 'blue', 'teal'] }
    ];
    
    const results = [];
    
    for (const { text, expectedColors } of prompts) {
      const scene = await generateFirstScene(text);
      const colors = extractColors(scene.code);
      
      results.push({
        prompt: text,
        hasExpectedColors: expectedColors.some(c => 
          colors.some(color => color.includes(c))
        ),
        hasPurple: colors.some(c => c.includes('purple')),
        colors
      });
    }
    
    // Assert variety
    const purpleCount = results.filter(r => r.hasPurple).length;
    expect(purpleCount).toBeLessThan(2); // Max 1 purple out of 4
    
    // Assert appropriate colors
    results.forEach(r => {
      expect(r.hasExpectedColors).toBe(true);
    });
  });
});
```

### 2. Manual Testing Checklist

- [ ] Generate 10 first scenes with different prompts
- [ ] Verify color variety (not all purple)
- [ ] Check that business prompts get professional colors
- [ ] Verify fun prompts get vibrant colors
- [ ] Ensure no style carryover between projects
- [ ] Test with and without templates
- [ ] Verify clean context in logs
- [ ] Check no cached data between users

### 3. Debug Dashboard

```typescript
// admin/debug/first-scenes/page.tsx
export function FirstScenesDebugDashboard() {
  const [results, setResults] = useState([]);
  
  const runVarietyTest = async () => {
    const debugger = ContextDebugger.getInstance();
    const testResults = await debugger.analyzeFirstSceneVariety(20);
    setResults(testResults);
  };
  
  return (
    <div className="p-6">
      <h1>First Scene Variety Analysis</h1>
      
      <Button onClick={runVarietyTest}>
        Run Variety Test (20 scenes)
      </Button>
      
      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>Purple Scene Count</CardHeader>
              <CardContent>
                {results.filter(r => r.hasPurple).length} / {results.length}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>Color Variety Score</CardHeader>
              <CardContent>
                {new Set(results.flatMap(r => r.colors)).size} unique colors
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="p-3 border rounded">
                <p className="font-medium">{r.prompt}</p>
                <div className="flex gap-2 mt-2">
                  {r.colors.map((color, j) => (
                    <div
                      key={j}
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                {r.hasPurple && (
                  <Badge variant="destructive" className="mt-2">
                    Contains Purple
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Implementation Steps

1. **Add Debug Logging** - Implement ContextDebugger to trace context
2. **Fix Context Building** - Ensure clean context for first scenes
3. **Update Prompts** - Remove any purple bias from system prompts
4. **Test Variety** - Run automated tests to verify color diversity
5. **Deploy & Monitor** - Track first scene variety in production

## Success Metrics

- **Color Variety**: < 20% of first scenes should contain purple
- **Prompt Matching**: Colors should match prompt context (business = professional, fun = vibrant)
- **No Context Bleed**: Zero instances of previous project styles in new projects
- **User Satisfaction**: Positive feedback on first scene creativity
- **Unique Styles**: Each project starts with distinctive visual identity

## Monitoring Plan

```typescript
// Track first scene generation metrics
interface FirstSceneMetrics {
  projectId: string;
  prompt: string;
  dominantColors: string[];
  hasPurple: boolean;
  timestamp: Date;
  userId: string;
}

// Log and analyze patterns
async function trackFirstSceneGeneration(scene: GeneratedScene) {
  const metrics: FirstSceneMetrics = {
    projectId: scene.projectId,
    prompt: scene.prompt,
    dominantColors: extractDominantColors(scene.code),
    hasPurple: scene.code.includes('purple') || scene.code.includes('#9333ea'),
    timestamp: new Date(),
    userId: scene.userId
  };
  
  await logMetrics('first_scene_generation', metrics);
}
```

## Rollback Plan

If the fix causes issues:
1. Revert context isolation changes
2. Restore previous prompt version
3. Monitor for regression
4. Implement more gradual fix

## Future Improvements

1. **Style Presets**: Let users choose initial style direction
2. **Color Preferences**: User profile color preferences
3. **AI Style Learning**: Learn from user's preferred styles
4. **Template Suggestions**: Suggest templates based on prompt
5. **Style History**: Track and learn from successful first scenes