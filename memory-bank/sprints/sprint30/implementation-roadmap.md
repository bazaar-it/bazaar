# Sprint 30: Implementation Roadmap
**Date**: January 26, 2025  
**Goal**: Step-by-step implementation of MCP-based intelligent scene orchestration

## 🎯 **Implementation Strategy**

### **Approach**: Gradual Migration
- ✅ **Preserve existing functionality** during transition
- ✅ **Feature flag controlled** rollout
- ✅ **Parallel systems** until validation complete
- ✅ **Incremental complexity** - start simple, add intelligence

## 📋 **Phase 1: Foundation (Week 1)**

### **Day 1-2: Core Infrastructure**

#### **1.1 SceneSpec Schema Implementation**
```bash
# Create type definitions
touch src/lib/types/storyboard.ts
```

**Tasks**:
- [ ] Implement complete SceneSpec schema from `scene-spec-schema.md`
- [ ] Add validation helpers and type guards
- [ ] Create example SceneSpec instances for testing
- [ ] Add unit tests for schema validation

**Files to create**:
- `src/lib/types/storyboard.ts` - Core schema definitions
- `src/lib/validators/sceneSpec.ts` - Validation utilities
- `src/lib/examples/sceneSpecs.ts` - Example instances

#### **1.2 MCP Tools Framework**
```bash
# Create MCP tools infrastructure
mkdir -p src/lib/services/mcp-tools
touch src/lib/services/mcp-tools/base.ts
```

**Tasks**:
- [ ] Implement base MCP tool infrastructure (already scaffolded)
- [ ] Create tool registration system
- [ ] Add error handling and logging
- [ ] Implement tool validation

**Files to create**:
- `src/lib/services/mcp-tools/base.ts` - Base tool infrastructure
- `src/lib/services/mcp-tools/registry.ts` - Tool registration
- `src/lib/services/mcp-tools/scene-tools.ts` - Scene-specific tools (update existing)

### **Day 3-4: Brain LLM Service**

#### **1.3 Brain LLM Orchestrator**
```bash
# Create brain service
mkdir -p src/server/services/brain
touch src/server/services/brain/orchestrator.ts
```

**Tasks**:
- [ ] Implement Brain LLM service for intent recognition
- [ ] Add tool selection logic
- [ ] Create system prompt for orchestration
- [ ] Add context management

**Files to create**:
- `src/server/services/brain/orchestrator.ts` - Main orchestrator
- `src/server/services/brain/prompts.ts` - System prompts
- `src/server/services/brain/context.ts` - Context management

#### **1.4 SceneBuilder Service**
```bash
# Create scene builder
touch src/lib/services/sceneBuilder.service.ts
```

**Tasks**:
- [ ] Implement SceneBuilder LLM service
- [ ] Create specialized prompts for scene planning
- [ ] Add SceneSpec generation and validation
- [ ] Integrate with component/style/text/motion guides

**Files to create**:
- `src/lib/services/sceneBuilder.service.ts` - Scene planning service
- `src/lib/prompts/sceneBuilder.ts` - Specialized prompts
- `src/lib/guides/` - Component, style, text, motion guides

### **Day 5: Integration Testing**

#### **1.5 End-to-End Testing**
**Tasks**:
- [ ] Create test harness for new architecture
- [ ] Test Brain LLM → MCP Tools → SceneBuilder flow
- [ ] Validate SceneSpec generation
- [ ] Performance benchmarking

**Files to create**:
- `src/tests/integration/mcp-flow.test.ts` - Integration tests
- `src/tests/fixtures/sceneSpecs.ts` - Test fixtures

## 📋 **Phase 2: Integration (Week 2)**

### **Day 6-7: Generation Router Update**

#### **2.1 New Orchestration Endpoint**
```bash
# Update generation router
# File: src/server/api/routers/generation.ts
```

**Tasks**:
- [ ] Add new `generateSceneWithMCP` endpoint
- [ ] Implement feature flag for MCP vs legacy
- [ ] Add proper error handling and fallbacks
- [ ] Maintain backward compatibility

**Changes**:
```typescript
// src/server/api/routers/generation.ts
export const generationRouter = createTRPCRouter({
  // Existing endpoints...
  
  generateSceneWithMCP: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      projectId: z.string(),
      userContext: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Route through Brain LLM
      const result = await orchestrateSceneGeneration(input);
      return result;
    }),
});
```

#### **2.2 Component Generator Update**
```bash
# Update component generator
touch src/lib/services/componentGenerator.service.ts
```

**Tasks**:
- [ ] Modify to accept SceneSpec input
- [ ] Update prompts to use structured data
- [ ] Maintain ESM compatibility patterns
- [ ] Add SceneSpec → Remotion conversion

### **Day 8-9: UI Integration**

#### **2.3 ChatPanelG Updates**
```bash
# Update chat panel
# File: src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
```

**Tasks**:
- [ ] Add feature flag toggle for MCP mode
- [ ] Update to call new orchestration endpoint
- [ ] Add progressive loading states
- [ ] Handle new error types

#### **2.4 SSE Event System**
```bash
# Create SSE event system
touch src/lib/events/sceneEvents.ts
```

**Tasks**:
- [ ] Implement scene lifecycle events
- [ ] Add progressive UI updates
- [ ] Create event handlers for UI components
- [ ] Add real-time status updates

**Events**:
- `scene-planning-started`
- `scene-spec-generated`
- `component-generation-started`
- `component-ready`
- `scene-complete`

### **Day 10: Error Handling & Fallbacks**

#### **2.5 Robust Error Handling**
**Tasks**:
- [ ] Implement graceful fallbacks to legacy system
- [ ] Add comprehensive error logging
- [ ] Create user-friendly error messages
- [ ] Add retry mechanisms

## 📋 **Phase 3: Enhancement (Week 3)**

### **Day 11-12: User Context System**

#### **3.1 Rich Context Management**
```bash
# Create context system
mkdir -p src/lib/context
touch src/lib/context/userContext.ts
```

**Tasks**:
- [ ] Implement user context collection
- [ ] Add project history integration
- [ ] Create preference learning system
- [ ] Add context injection to prompts

#### **3.2 Edit Flow Implementation**
```bash
# Implement edit flow
touch src/lib/services/sceneEditor.service.ts
```

**Tasks**:
- [ ] Implement patch-based scene editing
- [ ] Add diff detection and merging
- [ ] Create incremental component updates
- [ ] Add edit validation

### **Day 13-14: askSpecify Tool**

#### **3.3 Clarification System**
**Tasks**:
- [ ] Implement askSpecify tool logic
- [ ] Add ambiguity detection
- [ ] Create clarification UI components
- [ ] Add conversation flow management

#### **3.4 Performance Optimization**
**Tasks**:
- [ ] Add caching for SceneSpecs
- [ ] Implement request batching
- [ ] Optimize LLM calls
- [ ] Add performance monitoring

### **Day 15: Production Readiness**

#### **3.5 Feature Flag System**
```bash
# Create feature flags
touch src/lib/featureFlags.ts
```

**Tasks**:
- [ ] Implement feature flag infrastructure
- [ ] Add gradual rollout controls
- [ ] Create A/B testing framework
- [ ] Add metrics collection

## 🔧 **Technical Implementation Details**

### **Brain LLM Service Architecture**
```typescript
// src/server/services/brain/orchestrator.ts
export class BrainOrchestrator {
  async processUserInput(input: {
    prompt: string;
    userContext: Record<string, unknown>;
    projectId: string;
  }): Promise<MCPResult> {
    // 1. Analyze intent
    const intent = await this.analyzeIntent(input.prompt);
    
    // 2. Select appropriate tool
    const tool = this.selectTool(intent);
    
    // 3. Execute tool with context
    const result = await tool.run({
      input: {
        userPrompt: input.prompt,
        userContext: input.userContext,
        sessionId: input.projectId,
      }
    });
    
    return result;
  }
}
```

### **SceneBuilder Service Architecture**
```typescript
// src/lib/services/sceneBuilder.service.ts
export class SceneBuilderService {
  async buildScene(input: {
    userMessage: string;
    userContext: Record<string, unknown>;
    storyboardSoFar: SceneSpec[];
  }): Promise<SceneSpec> {
    // 1. Prepare specialized prompt
    const prompt = this.buildScenePrompt(input);
    
    // 2. Call LLM with structured output
    const rawOutput = await this.callLLM(prompt);
    
    // 3. Validate and parse
    const sceneSpec = SceneSpec.parse(rawOutput);
    
    // 4. Post-process and enhance
    return this.enhanceSceneSpec(sceneSpec);
  }
}
```

### **Database Schema Updates**
```sql
-- Add scene_specs table
CREATE TABLE scene_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  spec JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_scene_specs_project ON scene_specs(project_id);
CREATE INDEX idx_scene_specs_scene ON scene_specs(scene_id);
CREATE INDEX idx_scene_specs_components ON scene_specs USING GIN ((spec->'components'));
CREATE INDEX idx_scene_specs_motion ON scene_specs USING GIN ((spec->'motion'));

-- Add feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0,
  conditions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📊 **Testing Strategy**

### **Unit Tests**
- [ ] SceneSpec schema validation
- [ ] MCP tool functionality
- [ ] Brain LLM intent recognition
- [ ] SceneBuilder service

### **Integration Tests**
- [ ] End-to-end MCP flow
- [ ] Legacy system compatibility
- [ ] Error handling and fallbacks
- [ ] Performance benchmarks

### **User Acceptance Tests**
- [ ] Feature flag rollout
- [ ] A/B testing with real users
- [ ] Quality metrics comparison
- [ ] User satisfaction surveys

## 🎯 **Success Criteria**

### **Technical Metrics**
- [ ] **Schema Validation Rate**: >99%
- [ ] **Intent Recognition Accuracy**: >95%
- [ ] **Generation Time**: <4 seconds average
- [ ] **Error Rate**: <1%
- [ ] **Edit Iteration Speed**: <2 seconds

### **Quality Metrics**
- [ ] **User Satisfaction**: >4.5/5
- [ ] **Feature Adoption**: >80% of users try MCP mode
- [ ] **Retention**: Users prefer MCP over legacy
- [ ] **Support Tickets**: 50% reduction in generation issues

## 🚀 **Rollout Plan**

### **Week 1: Internal Testing**
- Development team testing
- Bug fixes and refinements
- Performance optimization

### **Week 2: Beta Testing**
- 10% user rollout with feature flag
- Collect feedback and metrics
- Compare with legacy system

### **Week 3: Gradual Rollout**
- 25% → 50% → 75% → 100% rollout
- Monitor metrics at each stage
- Rollback capability maintained

### **Week 4: Legacy Deprecation**
- Full MCP system deployment
- Legacy system removal
- Documentation updates

This roadmap provides a structured approach to implementing the MCP-based architecture while minimizing risk and ensuring quality. 