# Restructure Brain Analysis - Sprint 40

## Current Architecture (After Merge)

### 1. Brain/Orchestrator Structure ✅
The new modular orchestrator (`/src/brain/orchestratorNEW.ts`) has three main components:

```
Orchestrator (main coordinator)
├── ContextBuilder - Builds context for decision-making
├── IntentAnalyzer - Analyzes intent and selects tools
└── ToolExecutor - Executes selected tools
```

**Flow:**
1. User request → generation.ts
2. generation.ts → orchestratorNEW.processUserInput()
3. ContextBuilder → builds context packet
4. IntentAnalyzer → decides which tool to use
5. ToolExecutor → executes tool via sceneBuilderNEW
6. Tool (add/edit/delete) → performs operation
7. Response → back through the chain

### 2. Tools Structure ✅
New modular tools under `/src/tools/`:

```
/src/tools/
├── sceneBuilderNEW.ts         # Main wrapper/facade
├── add/
│   ├── add.ts                 # ADD tool implementation
│   └── add_helpers/
│       ├── layoutGeneratorNEW.ts
│       ├── CodeGeneratorNEW.ts
│       └── ImageToCodeGeneratorNEW.ts
├── edit/
│   ├── edit.ts                # EDIT tool implementation
│   └── edit_helpers/
│       ├── BaseEditorNEW.ts
│       ├── CreativeEditorNEW.ts
│       ├── SurgicalEditorNEW.ts
│       └── ErrorFixerNEW.ts
└── delete/
    └── delete.ts              # DELETE tool implementation
```

### 3. Role Separation ✅
- **Brain (orchestratorNEW)**: Makes decisions ONLY
- **ToolExecutor**: Bridges decisions to execution
- **Generation.ts**: Entry point, handles DB operations
- **Tools**: Execute actual operations

## Issues Found

### 1. Field Name Inconsistencies 🔴
**Critical issue that breaks the "zero transformation" goal from Sprint 40:**

- Tools return: `sceneCode` (BaseToolOutput)
- Database expects: `tsxCode` (add.ts line 172)
- SceneData type uses: `sceneCode`
- This requires mapping at multiple layers

### 2. Type Alignment Issues 🟡
- Brain types (`OrchestrationOutput`) and tool types (`BaseToolOutput`) are separate
- Need to ensure consistent interfaces across all layers

### 3. Prompt Configuration 🟡
- New prompts under `/src/brain/config/prompts/` 
- Old prompts still exist elsewhere
- Need to consolidate and simplify per Sprint 40 goals (90% reduction)

## Recommendations

### Priority 1: Fix Field Naming
Align all field names to match database schema:
- Change `sceneCode` → `tsxCode` everywhere
- Use exact database field names in all types
- Remove all mapping/transformation layers

### Priority 2: Simplify Types
Create unified types that flow unchanged through all layers:
```typescript
// Single source of truth matching DB schema
interface Scene {
  id: string;
  projectId: string;
  name: string;
  tsxCode: string;  // NOT sceneCode
  duration: number;
  layoutJson?: string;
  order: number;
}
```

### Priority 3: Integrate Sprint 40 Improvements
- Implement discriminated unions for type safety
- Add optimistic UI support
- Simplify prompts to 30-50 words
- Remove old orchestrator (2442 lines)

## Next Steps

1. **Immediate**: Fix field naming inconsistencies
2. **Short-term**: Align types across all layers
3. **Medium-term**: Integrate Sprint 40 architecture improvements
4. **Long-term**: Remove old code and fully migrate

## Status
- Merge complete ✅
- Architecture reviewed ✅
- Issues identified ✅
- Ready for fixes 🟡