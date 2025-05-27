# Sprint 30: MCP-Based Intelligent Scene Orchestration
**Date**: January 26, 2025  
**Goal**: Transform monolithic generation.ts into intelligent, tool-orchestrated architecture

## 🎯 **Vision: From Monolith to Intelligence**

### **Current State (Sprint 29)**
```
User Prompt → generation.ts (1000+ lines) → LLM → Generated Code → Remotion Player
```
- ❌ **Monolithic**: Single massive prompt handling all logic
- ❌ **Hard-coded**: Regex-based intent detection
- ❌ **Fragile**: No validation, prone to hallucinations
- ❌ **Unscalable**: Adding features means editing giant file

### **Target State (Sprint 30)**
```
User Prompt → Brain LLM → MCP Tools → Specialized Services → Validated JSON → Code Generator → Remotion Player
```
- ✅ **Modular**: Clear separation of concerns
- ✅ **Intelligent**: Brain LLM orchestrates specialized tools
- ✅ **Validated**: Schema-enforced JSON at every step
- ✅ **Scalable**: Drop-in new tools without touching orchestration

## 🧠 **Brain LLM + MCP Tools Architecture**

### **Core Components**

#### **1. Brain LLM (Orchestrator)**
- **Role**: Analyzes user intent and chooses appropriate tools
- **Model**: GPT-4o-mini (fast, cheap for routing decisions)
- **Tools Available**: `addScene`, `editScene`, `deleteScene`, `askSpecify`
- **Location**: `src/server/services/brain/orchestrator.ts`

#### **2. MCP Tools (Actions)**
```typescript
// src/lib/services/mcp-tools/scene-tools.ts
export const sceneTools = [
  addSceneTool,     // Create new scene from user prompt
  editSceneTool,    // Modify existing scene with patch
  deleteSceneTool,  // Remove scene by ID
  askSpecifyTool,   // Request clarification from user
];
```

#### **3. SceneBuilder Service (Intelligence)**
- **Role**: Converts user intent into structured SceneSpec JSON
- **Model**: GPT-4o (higher quality for creative decisions)
- **Input**: User message + context + current storyboard
- **Output**: Validated SceneSpec with 4 key elements

#### **4. SceneSpec Schema (Contract)**
```typescript
export const SceneSpec = z.object({
  components: z.array(ComponentSpec),  // UI elements (Flowbite, custom)
  style: StyleSpec,                    // Colors, Tailwind classes, CSS
  text: z.array(TextSpec),            // Content with slots (headline, caption)
  motion: z.array(MotionSpec),        // Animations with timing/easing
});
```

## 🔄 **User Flow: Complete System Walkthrough**

### **Example Prompt**: 
*"Black background, white text, inter size 80px. Show a text input box - corners rounded by 50%. There's a neon purple gradient hue shining behind the text input box. The words 'Wow, Bazaar can actually produce some good results' appears letter by letter. When the words are finished appearing, we see a mouse cursor click on the submit button and the camera zoom straight in, really fast, to a totally black screen"*

### **Step-by-Step Flow**

#### **Phase 1: Intent Recognition (Brain LLM)**
```typescript
// src/server/api/routers/generation.ts - NEW orchestration endpoint
1. User submits prompt via ChatPanelG
2. Brain LLM analyzes: "This is a new scene request"
3. Brain LLM chooses: addSceneTool
4. Payload: { userPrompt, userContext, sessionId }
```

#### **Phase 2: Scene Planning (SceneBuilder Service)**
```typescript
// src/lib/services/sceneBuilder.service.ts
5. addSceneTool.run() calls buildScene()
6. SceneBuilder LLM processes with specialized prompt:
   - "You create UI animations with 4 elements..."
   - References: Flowbite guide, Style guide, Motion library
7. Returns structured JSON:
```

```json
{
  "components": [
    {
      "lib": "html",
      "name": "TextInput",
      "props": { "borderRadius": "50%", "background": "neon-purple-gradient" }
    },
    {
      "lib": "custom", 
      "name": "MouseCursor",
      "props": { "size": "medium" }
    }
  ],
  "style": {
    "palette": ["#000000", "#ffffff", "#8b5cf6"],
    "classes": ["bg-black", "text-white", "text-[80px]", "font-inter"]
  },
  "text": [
    {
      "slot": "typewriter",
      "content": "Wow, Bazaar can actually produce some good results"
    }
  ],
  "motion": [
    {
      "target": "typewriter",
      "fn": "typewriter",
      "duration": 3.0,
      "delay": 0
    },
    {
      "target": "camera",
      "fn": "zoomIn",
      "duration": 0.5,
      "delay": 3.5,
      "params": { "scale": 10 }
    }
  ]
}
```

#### **Phase 3: Validation & Storage**
```typescript
8. SceneSpec.parse() validates JSON structure
9. Scene saved to database with UUID
10. SSE event: "scene-added" → UI shows loading card
```

#### **Phase 4: Code Generation**
```typescript
// src/lib/services/componentGenerator.service.ts
11. componentGenerator receives validated SceneSpec
12. Converts to Remotion component using enhanced prompt:
    - "Generate Remotion code from this SceneSpec..."
    - Uses window.Remotion patterns (ESM compatible)
    - Applies BazAnimations library for motion
13. Returns clean, validated Remotion component
```

#### **Phase 5: Build & Preview**
```typescript
14. Component bundled and uploaded to R2
15. SSE event: "scene-ready" → UI loads Remotion Player
16. User sees live preview with all animations
```

## 🏗️ **System Architecture Diagram**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│   Brain LLM      │───▶│  MCP Tools      │
│  (Chat Panel)   │    │ (Orchestrator)   │    │ (Actions)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Scene Preview  │◀───│  Code Generator  │◀───│ SceneBuilder    │
│ (Remotion)      │    │  (Remotion)      │    │ (Intelligence)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   R2 Storage    │◀───│   Validation     │◀───│   SceneSpec     │
│  (Components)   │    │   (Zod Schema)   │    │   (JSON)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 **Intelligence vs Performance Analysis**

### **Quality Improvements**
| Dimension | Current (Sprint 29) | New (Sprint 30) | Improvement |
|-----------|-------------------|-----------------|-------------|
| **LLM Reasoning** | Single monolithic prompt | Specialized prompts per tool | 🔥 **Huge** - Focused context |
| **Validation** | Basic syntax checking | Schema-enforced JSON | 🔥 **Huge** - Prevents hallucinations |
| **Personalization** | Minimal context | Rich userContext + history | 🚀 **Large** - Better UX |
| **Extensibility** | Edit giant file | Drop-in new tools | 🚀 **Large** - Future-proof |
| **Error Handling** | Generic failures | Specific tool errors | 🚀 **Medium** - Better debugging |

### **Performance Impact**
| Stage | Current | New | Delta |
|-------|---------|-----|-------|
| **Intent Recognition** | Regex parsing | Brain LLM call | +200ms |
| **Scene Planning** | Monolithic prompt | Specialized SceneBuilder | ≈ Same |
| **Code Generation** | Direct generation | Schema → Code | -500ms (less hallucination) |
| **Total Latency** | ~4-6 seconds | ~4-5 seconds | **Faster overall** |

### **Development Velocity**
- **Initial Setup**: +1-2 days to implement MCP framework
- **Feature Addition**: -80% time (drop-in tools vs editing monolith)
- **Debugging**: -60% time (clear separation of concerns)
- **Quality Assurance**: -70% time (schema validation catches issues early)

## 🛠️ **Implementation Strategy**

### **Phase 1: Foundation (Week 1)**
1. **SceneSpec Schema** - Lock down the contract
2. **MCP Tools Framework** - Implement base tool infrastructure
3. **Brain LLM Service** - Simple orchestrator with 4 tools
4. **SceneBuilder Service** - Specialized scene planning LLM

### **Phase 2: Integration (Week 2)**
1. **Update generation.ts** - Route through Brain LLM
2. **Component Generator** - Accept SceneSpec input
3. **SSE Events** - Progressive UI updates
4. **Error Handling** - Graceful fallbacks

### **Phase 3: Enhancement (Week 3)**
1. **User Context** - Rich context passing
2. **Edit Flow** - Patch-based scene modifications
3. **askSpecify Tool** - Clarification system
4. **Performance Optimization** - Caching and batching

## 🎯 **Success Metrics**

### **Technical KPIs**
- **Schema Validation Rate**: >99% (vs current ~85% success)
- **Average Generation Time**: <4 seconds (vs current 4-6s)
- **Edit Iteration Speed**: <2 seconds (vs current full regen)
- **Error Rate**: <1% (vs current ~15%)

### **User Experience KPIs**
- **Intent Recognition Accuracy**: >95% (vs current ~70%)
- **User Satisfaction**: >4.5/5 (vs current ~3.2/5)
- **Feature Request Fulfillment**: 90% (vs current ~60%)
- **Time to First Preview**: <3 seconds (vs current 4-6s)

## 🚀 **Future Scalability**

### **Stage 2: Retrieval-Augmented Generation**
- Embed Flowbite docs, style guides in vector DB
- Add retrieval step before SceneBuilder
- Real-time component library updates

### **Stage 3: Specialist Sub-Agents**
- Component-Picker Agent (UI library expert)
- Stylist Agent (Design system expert)  
- Copywriter Agent (Content expert)
- Choreographer Agent (Animation expert)

### **Stage 4: Personalization Engine**
- User preference learning
- Style token persistence
- Reinforcement learning from user feedback

### **Stage 5: Multi-Modal Intelligence**
- Image input → scene generation
- Voice commands → scene modifications
- Real-time collaboration

## 🔗 **Integration Points**

### **Current System Touchpoints**
1. **ChatPanelG** - Update to call new orchestration endpoint
2. **generation.ts** - Gradually migrate logic to MCP tools
3. **RemotionPreview** - Accept SceneSpec-generated components (Player only, no Lambda)
4. **Database Schema** - Add scene_specs table for structured storage

### **New System Components**
1. **Brain LLM Service** - `src/server/services/brain/`
2. **MCP Tools** - `src/lib/services/mcp-tools/`
3. **SceneBuilder** - `src/lib/services/sceneBuilder.service.ts`
4. **SceneSpec Types** - `src/lib/types/storyboard.ts`

### **Database Migrations (Phase 1 Critical)**
```sql
-- Add scene_specs table with proper foreign keys and RLS
CREATE TABLE scene_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  spec JSONB NOT NULL,
  bundle_url TEXT NULL, -- R2 URL for compiled component
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_scene_specs_project ON scene_specs(project_id);
CREATE INDEX idx_scene_specs_user ON scene_specs(user_id);
CREATE INDEX idx_scene_specs_scene ON scene_specs(scene_id);
CREATE INDEX idx_scene_specs_proj_created ON scene_specs (project_id, created_at DESC);

-- JSON indexes for component and motion queries
CREATE INDEX idx_scene_specs_components ON scene_specs USING GIN ((spec->'components'));
CREATE INDEX idx_scene_specs_motion ON scene_specs USING GIN ((spec->'motion'));

-- Row Level Security for collaboration
ALTER TABLE scene_specs ENABLE ROW LEVEL SECURITY;

-- Users can view scenes in projects they have access to
CREATE POLICY scene_specs_select_policy ON scene_specs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() 
      OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid())
    )
  );

-- Users can only modify their own scenes
CREATE POLICY scene_specs_modify_policy ON scene_specs
  FOR ALL USING (user_id = auth.uid());
```

### **Build Pipeline Optimizations**
```typescript
// src/lib/bundler/remotionBundler.ts
export const bundlerConfig = {
  // Mark as externals to keep bundles tiny
  externals: [
    'react',
    'react-dom', 
    'flowbite',
    'flowbite-react',
    '@remotion/player'
  ],
  
  // Auto-inject required imports at top of every file
  banner: `
import "tailwindcss/tailwind.css";
import "flowbite";
  `,
  
  // Target Remotion Player (no Lambda rendering)
  target: 'remotion-player',
  format: 'esm'
};
```

## 📊 **Realistic Performance Expectations**

### **Updated Performance Analysis**
| Stage | Realistic Range | Comment |
|-------|----------------|---------|
| **Brain LLM (GPT-4o-mini, 64T)** | 150-250ms | Intent recognition + tool selection |
| **SceneBuilder (GPT-4o, 2K tokens)** | 1.8-2.3s | Creative scene planning at temp 0.3 |
| **Bundle + Upload (esbuild → R2)** | 0.9-1.3s | With externals configured |
| **Total (warm)** | 3.0-4.0s | Typical case with warm functions |
| **Total (cold start)** | 4.5-6.0s | First-time cold starts on Vercel |

### **Risk Mitigation for Performance**
- **Prompt Drift**: Retrieval-augmented step (Stage 2) auto-surfaces new Flowbite props
- **askSpecify Loops**: `maxClarifications: 2` guard in Brain LLM prompt
- **SSE Over-emit**: Debounce `scene-ready` events by sceneId in bundler
- **Cold Starts**: Keep functions warm with periodic health checks

## 🛠️ **Enhanced MCP Tools**

### **Core Tools (Phase 1)**
```typescript
// src/lib/services/mcp-tools/scene-tools.ts
export const sceneTools = [
  addSceneTool,     // Create new scene from user prompt
  editSceneTool,    // Modify existing scene with JSON patch
  deleteSceneTool,  // Remove scene by ID
  askSpecifyTool,   // Request clarification (max 2 iterations)
];
```

### **Future Tools (Phase 2)**
```typescript
// Additional tools for specialized operations
export const styleTools = [
  updateStyleTool,  // Global style changes (dark mode, brand palette)
  applyThemeTool,   // Apply predefined theme templates
];
```

## ✅ **Next Steps**

1. **Validate SceneSpec Schema** - Confirm all required fields
2. **Implement MCP Framework** - Base tool infrastructure
3. **Create Brain LLM Service** - Simple orchestrator
4. **Build SceneBuilder Service** - Specialized scene planning
5. **Update generation.ts** - Route through new architecture
6. **Test with Example Prompt** - Validate end-to-end flow

This architecture evolution positions Bazaar-Vid for intelligent, scalable scene generation while maintaining the quality improvements from Sprint 29's Tailwind-First strategy. 