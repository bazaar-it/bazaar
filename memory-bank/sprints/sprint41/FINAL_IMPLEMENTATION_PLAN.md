# Sprint 41: Final Implementation Plan

## 🎯 The Goal: Complete Sprint 40's Vision

Make everything:
- **Fast as fuck** (<16ms UI updates)
- **Modular** (clear boundaries)
- **Single source of truth** (database field names)
- **Idiot proof** (type-safe, clear flow)
- **Perfect** (no duplicates, no confusion)

## 📋 What We Learned from Sprint 40

1. **Trust the vision**: Sprint 40 had the right architecture
2. **Simplicity wins**: 100 lines > 2442 lines
3. **Zero transformation**: Use DB field names everywhere
4. **Optimistic UI**: Update immediately, reconcile later
5. **Trust AI**: Short prompts (30-50 words) work better

## 🏗️ The Perfect Architecture

### Flow Overview
```
ChatPanel → generation.ts → Brain (decide) → generation.ts (execute) → Tools → VideoState → All Panels Update
                    ↓                                         ↓                      ↓
                Database ←────────────────────────────────────┘              Database Update
```

### Detailed Flow

1. **ChatPanel** sends user message
   ```typescript
   // ChatPanelG.tsx
   await api.generation.generateScene.mutate({
     projectId,
     userMessage,
     sceneId?: optional
   })
   ```

2. **generation.ts** receives request
   ```typescript
   // 1. Get brain decision
   const decision = await brain.decide({
     prompt: userMessage,
     projectId,
     storyboard: scenes,
     chatHistory: messages
   });
   
   // 2. Save version before changes
   await versionHistory.saveSnapshot(projectId, scenes);
   
   // 3. Execute based on decision
   let results = [];
   
   if (decision.workflow) {
     // Multi-step execution
     for (const step of decision.workflow) {
       const result = await executeStep(step);
       results.push(result);
       
       // Update state after each step
       videoState.handleApiResponse(result);
     }
   } else {
     // Single tool execution
     const result = await executeTool(decision.tool, decision.context);
     results.push(result);
     videoState.handleApiResponse(result);
   }
   
   // 4. Database update
   await db.update(scenes)...
   
   // 5. Save version after changes
   await versionHistory.commitChanges(projectId);
   ```

3. **Brain** only decides (supports multi-step)
   ```typescript
   // ~100 lines total
   class Brain {
     async decide(input): Decision {
       // 1. Build context
       const context = await this.buildContext(input);
       
       // 2. Analyze intent
       const intent = await this.analyzeIntent(input, context);
       
       // 3. Return decision (can be multi-step!)
       return {
         tool: intent.tool,           // Single tool OR
         workflow: intent.workflow,    // Multi-step workflow
         context: intent.context,
         reasoning: intent.reasoning
       };
     }
   }
   
   // Example multi-step decision:
   {
     workflow: [
       { tool: 'addScene', context: {...} },
       { tool: 'editScene', context: {...}, dependsOn: 0 }
     ],
     reasoning: "Creating scene then customizing it"
   }
   ```

4. **Tools/Services** execute
   ```typescript
   // Use tsxCode everywhere (match database!)
   class SceneService {
     async add(context) {
       const tsxCode = await this.generateCode(context);
       return {
         tsxCode,  // NOT sceneCode!
         name,
         duration
       };
     }
   }
   ```

5. **VideoState** updates all panels (with history)
   ```typescript
   // Normalized, flat structure with version control
   class VideoStateNormalized {
     scenes: Record<string, Scene>;  // Flat!
     history: VersionHistory[];      // Version snapshots
     
     handleApiResponse(response) {
       // Single method for all updates
       if (response.scene) {
         this.scenes[response.scene.id] = response.scene;
       }
     }
     
     // Version control methods
     undo() {
       const previousVersion = this.history.pop();
       if (previousVersion) {
         this.scenes = previousVersion.scenes;
       }
     }
     
     redo() {
       // Restore next version
     }
   }
   ```

## 🛠️ Implementation Steps

### Phase 1: Clean House (Delete Duplicates)

**DELETE these files:**
```
❌ /src/server/services/brain/orchestrator.ts (2442 lines)
❌ /src/brain/ (entire directory)
❌ /src/tools/ (entire directory after migrating)
❌ /src/stores/videoState.ts
❌ /src/stores/videoState-simple.ts
❌ /src/stores/videoState-hybrid.ts
❌ /src/server/services/mcp/tools/*.ts (keep only simplified/)
❌ All .backup and .updated files
```

### Phase 2: Fix Architecture

1. **Create new Brain** (100 lines)
   ```typescript
   // /src/server/services/brain/brain.ts
   export class Brain {
     async decide(input): Decision { ... }
   }
   ```

2. **Update generation.ts**
   - Remove orchestrator import
   - Add brain.decide()
   - Add tool execution logic
   - Add optimistic updates

3. **Consolidate Scene Services**
   ```
   /src/server/services/scene/
   ├── README.md
   ├── scene.service.ts
   ├── types.ts (tsxCode, not sceneCode!)
   ├── add/
   ├── edit/
   └── delete/
   ```

### Phase 3: Fix Field Names

**Change ALL occurrences:**
- `sceneCode` → `tsxCode`
- `code` → `tsxCode`
- Remove ALL mapping/transformation

### Phase 4: Integrate Normalized VideoState

1. Rename `videoState.normalized.ts` → `videoState.ts`
2. Update all imports in components
3. Use flat structure: `scenes[id]`
4. Single `handleApiResponse()` method

### Phase 5: Update Frontend Panels

**All panels must:**
- Use normalized VideoState
- Get updates via `handleApiResponse`
- No direct API calls except through generation.ts

**Files to update:**
- ChatPanelG.tsx
- CodePanelG.tsx
- PreviewPanelG.tsx
- TemplatesPanelG.tsx
- GenerateWorkspaceRoot.tsx
- WorkspaceContentAreaG.tsx

### Phase 6: Simplify Prompts

Replace all verbose prompt files with inline strings:
```typescript
const BRAIN_PROMPT = `
Choose tool: addScene, editScene, or deleteScene
User: {prompt}
Scenes: {count}
Return: { tool, context, reasoning }
`;
```

## ✅ Success Checklist

- [ ] Brain under 100 lines
- [ ] Brain supports multi-step workflows
- [ ] All execution in generation.ts
- [ ] Zero field transformations
- [ ] Single VideoState (normalized)
- [ ] Version control implemented
- [ ] All prompts under 50 words
- [ ] No duplicate files
- [ ] UI updates in <16ms
- [ ] Type-safe throughout
- [ ] Clear data flow
- [ ] All panels updated via VideoState
- [ ] Undo/redo functionality works

## 🚫 Common Mistakes to Avoid

1. **DON'T** put execution in brain
2. **DON'T** transform field names
3. **DON'T** keep duplicate files
4. **DON'T** use nested VideoState
5. **DON'T** make panels call APIs directly
6. **DON'T** use verbose prompts

## 🎉 End Result

- **One** brain (decides only)
- **One** generation.ts (executes)
- **One** VideoState (normalized)
- **One** set of services
- **Zero** duplicates
- **Zero** confusion
- **Fast as fuck**
- **Perfect**

## 🚀 Let's Do This!

We implement once, we implement right. Sprint 40 showed us the way. Now we execute.