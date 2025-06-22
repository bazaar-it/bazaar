# Implementation Guide: Perfect Context System

## Phase 1: Quick Wins (2-4 hours)

### Fix 1: Make Add Scene Use Previous Scene (30 mins)

```typescript
// In generation/helpers.ts, line ~36
case 'addScene':
  // Get previous scene if it exists
  const previousScene = storyboard.length > 0 
    ? storyboard[storyboard.length - 1] 
    : null;

  toolInput = {
    userPrompt: decision.toolContext.userPrompt,
    projectId,
    userId,
    sceneNumber: storyboard.length + 1,
    
    // NEW: Always pass previous scene for continuity
    previousSceneContext: previousScene ? {
      tsxCode: previousScene.tsxCode,
      style: undefined // TODO: Extract style later
    } : undefined,
    
    imageUrls: decision.toolContext.imageUrls,
    visionAnalysis: decision.toolContext.visionAnalysis,
  } as AddToolInput;
```

**Impact**: Every new scene automatically matches the previous scene's style.

### Fix 2: Enable Cross-Scene References for Edit (1 hour)

```typescript
// Step 1: Update Brain prompt (brain-orchestrator.ts)
// Add to response format:
{
  "toolName": "editScene",
  "reasoning": "...",
  "targetSceneId": "scene-2-id",
  "referencedSceneIds": ["scene-1-id"], // NEW
  "userFeedback": "..."
}

// Step 2: Update types (brain.types.ts)
interface BrainDecision {
  // ... existing fields
  referencedSceneIds?: string[]; // NEW
}

// Step 3: In helpers.ts for editScene
case 'editScene':
  // Get referenced scenes if Brain identified them
  let referenceScenes: any[] = [];
  if (decision.referencedSceneIds?.length > 0) {
    referenceScenes = storyboard.filter(s => 
      decision.referencedSceneIds!.includes(s.id)
    );
  }
  
  toolInput = {
    userPrompt: decision.toolContext.userPrompt,
    projectId,
    userId,
    sceneId: decision.toolContext.targetSceneId,
    tsxCode: sceneToEdit.tsxCode,
    
    // NEW: Pass reference scenes
    referenceScenes: referenceScenes.map(s => ({
      id: s.id,
      name: s.name,
      tsxCode: s.tsxCode
    })),
    
    currentDuration: sceneToEdit.duration,
    imageUrls: decision.toolContext.imageUrls,
  } as EditToolInput;
```

### Fix 3: Update Tool Types (30 mins)

```typescript
// In helpers/types.ts
export interface EditToolInput extends BaseToolInput {
  sceneId: string;
  tsxCode: string;
  currentDuration?: number;
  imageUrls?: string[];
  visionAnalysis?: any;
  errorDetails?: string;
  
  // NEW: Reference scenes for style matching
  referenceScenes?: Array<{
    id: string;
    name: string;
    tsxCode: string;
  }>;
}
```

### Fix 4: Update Edit Tool to Use References (1 hour)

```typescript
// In edit.ts performEdit method
private async performEdit(input: EditToolInput): Promise<EditToolOutput> {
  try {
    // Build context for the AI
    let context = `USER REQUEST: "${input.userPrompt}"`;
    
    // NEW: Add reference scenes to context
    if (input.referenceScenes?.length) {
      context += `\n\nREFERENCE SCENES:`;
      input.referenceScenes.forEach((scene, i) => {
        context += `\n\n${scene.name} (Scene ${i + 1}):\n\`\`\`tsx\n${scene.tsxCode}\n\`\`\``;
      });
      context += `\n\nIMPORTANT: Extract colors, styles, and patterns from the reference scenes and apply them as requested.`;
    }
    
    // ... rest of existing code
  }
}
```

## Phase 2: Smart Context System (1 day)

### Step 1: Delete ProjectMemoryService (1 hour)

```bash
# Remove the dead weight
rm apps/main/src/server/services/data/projectMemory.service.ts

# Remove imports from contextBuilder
# Remove userPreferences and imageAnalyses from context
```

### Step 2: Simplify ContextBuilder (2 hours)

```typescript
// New contextBuilder.ts
export class ContextBuilder {
  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    const [scenes, imageContext] = await Promise.all([
      this.getScenes(input.projectId),
      this.buildImageContext(input)
    ]);
    
    return {
      scenes: scenes.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        duration: s.duration,
        // Don't include code by default (save tokens)
      })),
      imageContext,
      recentMessages: input.chatHistory?.slice(-5) || [],
      // That's it! No ghost features
    };
  }
  
  // NEW: Get scenes with code when needed
  async getScenesWithCode(sceneIds: string[]): Promise<Map<string, string>> {
    const scenes = await db
      .select({ id: scenes.id, tsxCode: scenes.tsxCode })
      .from(scenes)
      .where(inArray(scenes.id, sceneIds));
    
    return new Map(scenes.map(s => [s.id, s.tsxCode]));
  }
}
```

### Step 3: Two-Phase Brain Decision (2 hours)

```typescript
// In orchestratorNEW.ts
async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
  // Phase 1: Initial context and decision
  const contextPacket = await this.contextBuilder.buildContext(input);
  const toolSelection = await this.intentAnalyzer.analyzeIntent(input, contextPacket);
  
  // Phase 2: Enrich with scene code if needed
  if (toolSelection.referencedSceneIds?.length > 0) {
    const sceneCodes = await this.contextBuilder.getScenesWithCode(
      toolSelection.referencedSceneIds
    );
    
    // Attach to decision for router to use
    toolSelection.referencedSceneCode = sceneCodes;
  }
  
  return toolSelection;
}
```

## Phase 3: Style Intelligence (Future - 1 week)

### Extract Scene Properties (Cached)

```typescript
interface SceneProperties {
  sceneId: string;
  version: number;
  extracted: {
    colors: {
      primary: string[];
      background: string[];
      text: string[];
    };
    animations: string[]; // ['fade-in', 'slide', 'scale']
    layout: 'centered' | 'grid' | 'asymmetric';
    elements: string[]; // ['particles', 'gradient', 'text']
  };
}

// Cache in Redis or database
// Extract on scene save, not on every request
```

### Project Style Profile

```typescript
class StyleProfileService {
  async getProjectStyle(projectId: string): Promise<ProjectStyle> {
    const scenes = await this.getSceneProperties(projectId);
    
    return {
      dominantColors: this.extractDominantColors(scenes),
      animationPreference: this.detectAnimationStyle(scenes),
      layoutPattern: this.detectLayoutPattern(scenes),
      // Build from actual usage, not imaginary preferences
    };
  }
}
```

## Migration Path

### Day 1: Quick Wins
- [ ] Fix add scene to use previous scene (30 mins)
- [ ] Enable cross-scene references (2 hours)
- [ ] Test basic continuity

### Day 2: Cleanup
- [ ] Delete ProjectMemoryService
- [ ] Simplify ContextBuilder
- [ ] Remove ghost features

### Week 1: Intelligence
- [ ] Scene property extraction
- [ ] Style profile building
- [ ] Smart context inclusion

## Success Metrics

1. **"Add scene" creates matching style**: Currently 0%, Target 90%
2. **"Match scene X" works**: Currently 0%, Target 100%
3. **Context build time**: Currently ~50ms, Target <20ms
4. **Wasted tokens**: Currently ~170, Target 0

## The Key Insight

We don't need complex preference systems or async job queues. We need:
1. Pass previous scene to add tool (1 line fix)
2. Pass referenced scenes to edit tool (20 lines)
3. Delete the ghost features (saves complexity)

The foundation exists. It just needs to be connected.