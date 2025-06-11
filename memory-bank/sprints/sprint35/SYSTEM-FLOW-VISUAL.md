# System Flow Visualization

## Add Scene Flow (6-8 seconds)
```
User Input: "Create scene with blue particles"
    ↓ [50ms]
ChatPanelG.tsx (Frontend)
    ↓ [50ms]
generation.ts (API Router)
    ↓
orchestrator.ts (Brain) ━━━━━━━━━┓ [2-2.5s total]
    ↓                            ┃
    ├─→ buildContextPacket() ────┃─→ contextBuilder.service.ts [1-1.5s]
    │   │                        ┃    ├─→ Load from DB (scenes, preferences)
    │   │                        ┃    ├─→ Build memory bank
    │   │                        ┃    ├─→ Extract patterns
    │   │                        ┃    └─→ 🔥 triggerAsyncPreferenceLearning()
    │   │                        ┃         └─→ preferenceExtractor.service.ts
    │   │                        ┃              (runs async, 0ms impact)
    │   ↓                        ┃
    ├─→ analyzeIntent() ─────────┃─→ GPT-4.1 Call [0.8-1.2s]
    │   │                        ┃    └─→ Returns: { toolName: "addScene" }
    │   ↓                        ┃
    └─→ prepareToolInput() ──────┗━━━ [50ms]
        ↓
addScene.ts (MCP Tool)
    ↓
sceneBuilder.service.ts ━━━━━━━━━┓ [3-5s total]
    ↓                            ┃
    ├─→ layoutGenerator ─────────┃─→ GPT-4o-mini [1.5-2s]
    │   │                        ┃    └─→ JSON structure
    │   ↓                        ┃
    └─→ codeGenerator ───────────┃─→ GPT-4o-mini [1.5-2.5s]
        │                        ┃    └─→ React/Remotion code
        ↓                        ┗━━━
sceneRepository.service.ts
    ↓ [300ms]
    └─→ Save to PostgreSQL
        ↓
SSE Response → ChatPanelG → videoState.updateScene()
                              ↓ [150ms]
                         Preview Updates
```

## Edit Scene Flow - First Edit (3.5-5.5 seconds)
```
User Input: "Make particles faster"
    ↓ [50ms]
ChatPanelG.tsx
    ↓ [50ms]
generation.ts
    ↓
orchestrator.ts ━━━━━━━━━━━━━━━━━┓ [1-1.5s total] ⚡ 50% FASTER!
    ↓                            ┃
    ├─→ buildContextPacket() ────┃─→ contextBuilder.service.ts [200-300ms]
    │   │                        ┃    └─→ ✨ CACHE HIT! Returns immediately
    │   ↓                        ┃
    ├─→ analyzeIntent() ─────────┃─→ GPT-4.1 Call [0.8-1.2s]
    │   │                        ┃    └─→ Returns: { 
    │   │                        ┃         toolName: "editScene",
    │   │                        ┃         targetSceneId: "abc123",
    │   │                        ┃         editComplexity: "simple"
    │   │                        ┃        }
    │   ↓                        ┃
    └─→ prepareToolInput() ──────┗━━━ [50ms]
        ↓                             Includes: existing code, scene ID
editScene.ts (MCP Tool)
    ↓ [Routes based on complexity]
directCodeEditor.service.ts
    ↓
    └─→ performSurgicalEdit() ───→ GPT-4o-mini [2-3s]
        ↓                          Single focused edit
sceneRepository.service.ts
    ↓ [250ms]
    └─→ Update in PostgreSQL
        ↓
SSE Response → State Update → Preview Refresh
```

## Edit Scene Flow - Second Edit (3.5-5.5 seconds)
```
User Input: "Change color to red"
    ↓
[Same initial flow...]
    ↓
orchestrator.ts ━━━━━━━━━━━━━━━━━┓ [0.9-1.4s] ⚡⚡ EVEN FASTER!
    ↓                            ┃
    ├─→ buildContextPacket() ────┃─→ [100-200ms]
    │                            ┃    ✨ FULL CACHE HIT!
    │                            ┃    
    │   [Background Process]     ┃    🧠 Preference Learning (async)
    │   preferenceExtractor ─────┃    Notices: User exploring colors
    │                            ┃    Confidence: color changes = temporary
    │                            ┃    
    └─→ [Rest same as edit #1]──┗━━━
```

## Key Performance Patterns

### 🐌 Cold Start (First Request)
- Context building: 1-1.5s (loads everything)
- No cache available
- Full preference extraction

### ⚡ Warm Requests (Subsequent)
- Context building: 0.2-0.3s (cache hits)
- Preferences pre-loaded
- 40-45% faster overall

### 🧠 Intelligence Building (Background)
```
Async Preference Learning:
┌─────────────────────────────────────┐
│ Runs AFTER main response sent       │
│ Zero impact on response time        │
│ Learns patterns for NEXT request    │
└─────────────────────────────────────┘
```

## Bottleneck Analysis
```
Total Time Breakdown:
┌─────────────────────────────────────┐
│ LLM Calls:        60-70%            │
│ ├─ Brain:         15-20%            │
│ ├─ Generation:    40-50%            │
│ └─ Editing:       30-40%            │
├─────────────────────────────────────┤
│ Context Building: 10-20% (1st only) │
│ Database:         5%                │
│ Network/Other:    5-10%             │
└─────────────────────────────────────┘
```