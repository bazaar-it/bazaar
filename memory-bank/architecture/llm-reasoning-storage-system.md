# LLM Reasoning Storage & Iteration Tracking System

**File**: `memory-bank/architecture/llm-reasoning-storage-system.md`  
**Purpose**: Track LLM decisions, user satisfaction, and iteration patterns for continuous improvement  
**Created**: February 1, 2025

## 🎯 **THE PROBLEM**

Currently, valuable LLM reasoning is lost:
```typescript
// This detailed reasoning gets logged but not stored
[BrainOrchestrator] Applied changes: Added a typewriter effect to the subheading text by incrementally revealing characters based on the current frame., Adjusted the subheading font weight to 500 for better readability during typing., Added a blinking caret effect using a CSS border-right animation after the full text is typed., Enhanced the subheading text shadow for a stronger glow effect matching the blue theme...
```

**Lost Insights**:
- What changes actually worked?
- Which scenes get edited repeatedly?
- Are surgical/creative/structural classifications accurate?
- What patterns lead to user satisfaction?

## 🏗️ **PROPOSED SOLUTION: Scene Iterations Tracking**

### **Database Schema**
```sql
-- Track every LLM operation on scenes
CREATE TABLE scene_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- LLM Decision Data
  operation_type VARCHAR(50) NOT NULL, -- 'create', 'edit', 'delete'
  edit_complexity VARCHAR(20), -- 'surgical', 'creative', 'structural'
  user_prompt TEXT NOT NULL,
  brain_reasoning TEXT, -- Brain LLM's tool selection reasoning
  tool_reasoning TEXT, -- Tool's execution reasoning
  
  -- Code Changes
  code_before TEXT, -- Previous TSX code (for edits)
  code_after TEXT,  -- New TSX code
  changes_applied JSONB, -- Structured list of changes
  changes_preserved JSONB, -- What was kept the same
  
  -- Performance Metrics
  generation_time_ms INTEGER,
  model_used VARCHAR(50), -- 'gpt-4.1', 'gpt-4.1-mini', etc.
  temperature DECIMAL(3,2),
  tokens_used INTEGER,
  
  -- User Satisfaction Indicators
  user_edited_again BOOLEAN DEFAULT FALSE, -- Did user edit this scene again within 5 minutes?
  user_satisfaction_score INTEGER, -- 1-5 rating (future feature)
  session_id VARCHAR(255), -- Track user sessions
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_scene_iterations_scene_id (scene_id),
  INDEX idx_scene_iterations_project_id (project_id),
  INDEX idx_scene_iterations_operation (operation_type, edit_complexity),
  INDEX idx_scene_iterations_satisfaction (user_edited_again, created_at)
);
```

### **Implementation Strategy**

#### **1. Capture in Brain Orchestrator**
```typescript
// In src/server/services/brain/orchestrator.ts
private async logSceneIteration(input: {
  sceneId: string,
  projectId: string,
  operationType: 'create' | 'edit' | 'delete',
  editComplexity?: 'surgical' | 'creative' | 'structural',
  userPrompt: string,
  brainReasoning?: string,
  toolReasoning?: string,
  codeBefore?: string,
  codeAfter?: string,
  changesApplied?: string[],
  changesPreserved?: string[],
  generationTimeMs: number,
  modelUsed: string,
  temperature: number,
}) {
  await db.insert(sceneIterations).values({
    sceneId: input.sceneId,
    projectId: input.projectId,
    operationType: input.operationType,
    editComplexity: input.editComplexity,
    userPrompt: input.userPrompt,
    brainReasoning: input.brainReasoning,
    toolReasoning: input.toolReasoning,
    codeBefore: input.codeBefore,
    codeAfter: input.codeAfter,
    changesApplied: input.changesApplied,
    changesPreserved: input.changesPreserved,
    generationTimeMs: input.generationTimeMs,
    modelUsed: input.modelUsed,
    temperature: input.temperature,
  });
}
```

#### **2. Track User Re-editing Pattern**
```typescript
// Background job to detect user dissatisfaction
async function markReEditedScenes() {
  // Find scenes edited multiple times within 5 minutes
  const reEditedScenes = await db.query(`
    SELECT scene_id, COUNT(*) as edit_count
    FROM scene_iterations 
    WHERE operation_type = 'edit' 
      AND created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY scene_id 
    HAVING COUNT(*) > 1
  `);
  
  // Mark as user dissatisfaction signal
  for (const scene of reEditedScenes) {
    await db.update(sceneIterations)
      .set({ userEditedAgain: true })
      .where(eq(sceneIterations.sceneId, scene.scene_id));
  }
}
```

## 📊 **ANALYTICS & INSIGHTS DASHBOARD**

### **Success Metrics Tracking**
```typescript
// Real-time analytics queries
const analyticsQueries = {
  // Edit complexity accuracy
  editComplexityAccuracy: `
    SELECT 
      edit_complexity,
      AVG(CASE WHEN user_edited_again THEN 0 ELSE 1 END) as success_rate,
      AVG(generation_time_ms) as avg_time_ms
    FROM scene_iterations 
    WHERE operation_type = 'edit'
    GROUP BY edit_complexity
  `,
  
  // Model performance comparison
  modelPerformance: `
    SELECT 
      model_used,
      AVG(generation_time_ms) as avg_time,
      COUNT(*) as total_operations,
      AVG(CASE WHEN user_edited_again THEN 0 ELSE 1 END) as satisfaction_rate
    FROM scene_iterations
    GROUP BY model_used
  `,
  
  // Most problematic prompts
  problematicPrompts: `
    SELECT 
      user_prompt,
      COUNT(*) as re_edit_count
    FROM scene_iterations
    WHERE user_edited_again = true
    GROUP BY user_prompt
    ORDER BY re_edit_count DESC
    LIMIT 10
  `
};
```

### **Pattern Recognition**
```typescript
// Identify successful patterns
const successfulPatterns = {
  // Prompts that rarely need re-editing
  reliablePrompts: `
    SELECT user_prompt, COUNT(*) as usage_count
    FROM scene_iterations
    WHERE user_edited_again = false 
      AND operation_type = 'edit'
    GROUP BY user_prompt
    HAVING COUNT(*) > 5
    ORDER BY usage_count DESC
  `,
  
  // Best complexity classifications
  optimalComplexity: `
    SELECT 
      edit_complexity,
      brain_reasoning,
      AVG(generation_time_ms) as avg_time,
      COUNT(*) as success_count
    FROM scene_iterations
    WHERE user_edited_again = false
    GROUP BY edit_complexity, brain_reasoning
    ORDER BY success_count DESC
  `
};
```

## 🎯 **BUSINESS VALUE**

### **Immediate Benefits (Month 1)**
- **Quality Metrics**: Track which LLM decisions lead to user satisfaction
- **Performance Optimization**: Identify slow operations and optimize
- **Error Patterns**: Spot recurring issues for targeted fixes

### **Medium-term Insights (Month 2-3)**
- **Prompt Engineering**: Improve system prompts based on success patterns
- **Model Selection**: Choose optimal models for different operation types
- **Complexity Classification**: Improve surgical/creative/structural accuracy

### **Long-term Intelligence (Month 4+)**
- **Predictive Success**: Predict if a generation will need re-editing
- **Auto-optimization**: Automatically adjust prompts for better results
- **User Behavior**: Understand workflow patterns and optimize UX

## 🔧 **IMPLEMENTATION PHASES**

### **Phase 1: Basic Tracking** (1 week)
- [ ] Create `scene_iterations` table
- [ ] Implement logging in Brain Orchestrator
- [ ] Track basic operations and timing

### **Phase 2: User Satisfaction Detection** (1 week)
- [ ] Implement re-editing detection
- [ ] Add background job for satisfaction scoring
- [ ] Create basic analytics queries

### **Phase 3: Analytics Dashboard** (2 weeks)
- [ ] Build admin dashboard for insights
- [ ] Implement pattern recognition queries
- [ ] Create automated reports

### **Phase 4: Intelligent Optimization** (Future)
- [ ] Use insights to improve prompts
- [ ] Implement predictive success scoring
- [ ] Auto-adjust model selection based on patterns

## 💡 **EXAMPLE INSIGHTS WE'LL DISCOVER**

**Potential Findings**:
- "Surgical edits on color changes have 95% success rate"
- "Creative edits taking >30s usually need re-editing"
- "Prompts mentioning 'typewriter' are 3x more likely to succeed on first try"
- "GPT-4.1 vs 4.1-mini: 4.1 has 20% better satisfaction but 3x cost"
- "Users who edit scenes >3 times in 5 minutes typically abandon the project"

**Actionable Improvements**:
- Optimize prompts for common successful patterns
- Adjust complexity classification thresholds
- Pre-warn users about potentially complex requests
- Suggest alternative approaches for problematic patterns

## 🎉 **SUMMARY**

This system transforms our current "blind" LLM operations into a **data-driven learning engine** that:

✅ **Captures Every Decision**: Store all LLM reasoning and results  
✅ **Tracks User Satisfaction**: Detect when users are happy vs frustrated  
✅ **Identifies Patterns**: Find what works and what doesn't  
✅ **Enables Optimization**: Use data to improve prompts and models  
✅ **Provides Business Intelligence**: Understand user behavior and system performance  

**Estimated Development Time**: 4 weeks for full implementation  
**Business Impact**: Continuous improvement of LLM accuracy and user satisfaction 