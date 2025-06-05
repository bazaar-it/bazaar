//memory-bank/sprints/sprint33/manual-change-tracking-analysis.md
# Manual Change Tracking Analysis

## Current State Assessment

### ✅ EXISTING INFRASTRUCTURE (Found)

We DO have existing manual change tracking! Key components:

#### 1. Scene Iterations Table (`sceneIterations`)
**Purpose**: Comprehensive tracking of ALL scene changes
**Location**: `/src/server/db/schema.ts:198-236`

**Tracked Data**:
- `operationType`: 'create', 'edit', 'delete'  
- `editComplexity`: 'surgical', 'creative', 'structural'
- `userPrompt`: Original user request
- `codeBefore`/`codeAfter`: Full change tracking
- `changesApplied`: Structured list of changes
- `changesPreserved`: What was kept the same ✅
- `userEditedAgain`: Re-edit detection (dissatisfaction signal)
- `modelUsed`, `temperature`, `tokensUsed`: AI context

#### 2. Scene Repository Service  
**Purpose**: Background analysis of edit patterns
**Location**: `/src/server/services/brain/sceneRepository.service.ts`

**Key Method**: `markReEditedScenes()`
- Detects rapid re-editing (within 5 minutes)
- Marks iterations as `userEditedAgain: true`
- Provides user dissatisfaction signals

#### 3. Project Memory Service
**Purpose**: Long-term context storage
**Location**: `/src/lib/services/projectMemory.service.ts`

**Memory Types**:
- `USER_PREFERENCE`: Dynamic user preferences
- `SCENE_RELATIONSHIP`: Scene connections  
- Image analysis facts
- Conversation context

#### 4. Context Builder Service
**Purpose**: AI context orchestration
**Location**: `/src/lib/services/contextBuilder.service.ts`

**Features**:
- Scene history analysis
- Style pattern extraction
- User preference management
- Dynamic preference extraction from prompts

## 🚨 IDENTIFIED GAPS

### 1. Manual vs LLM Change Distinction ❌
**Problem**: System tracks ALL changes but doesn't distinguish:
- Manual code edits (CodePanelG direct editing)
- Template additions (TemplatesPanelG)  
- LLM-generated changes (ChatPanelG)

**Current**: `operationType` only has 'create', 'edit', 'delete'
**Needed**: `changeSource: 'manual' | 'llm' | 'template'`

### 2. Manual Change Preservation Context ❌
**Problem**: Brain LLM doesn't receive explicit "preserve these manual edits" context
**Current**: `changesPreserved` field exists but not used for Brain context
**Needed**: Manual changes should be highlighted in Brain prompts

### 3. Real-time Manual Change Detection ❌
**Problem**: Manual edits in CodePanelG aren't immediately tracked
**Current**: Only tRPC-based changes create sceneIterations
**Needed**: CodePanelG.saveCodeMutation should create iteration record

### 4. Context Builder Integration ❌
**Problem**: Context Builder doesn't use sceneIterations data
**Current**: Only analyzes scene content, not change history
**Needed**: Include manual change patterns in context

## 🎯 SOLUTION ARCHITECTURE

### Phase 1: Enhanced Change Tracking
1. **Add `changeSource` field** to sceneIterations
2. **Update CodePanelG** to create iteration records
3. **Update TemplatesPanelG** to mark template additions
4. **Preserve LLM tracking** in existing Brain workflows

### Phase 2: Brain LLM Context Enhancement  
1. **Query manual changes** in Brain Orchestrator
2. **Build "preserve context"** from recent manual edits
3. **Enhance prompts** with manual change preservation instructions
4. **Test preservation** in edit scenarios

### Phase 3: Advanced Pattern Detection
1. **Conflict detection** between manual/LLM changes  
2. **User intent analysis** from manual edit patterns
3. **Smart merge strategies** for overlapping changes
4. **Performance optimization** for large change histories

## 🔄 USER SCENARIO SOLUTION

**Target Flow**: User gets LLM scene → 4 manual changes → 2 templates → LLM edit

**Current Problem**: Brain LLM unaware of manual changes
**Solution Steps**:

1. **Track Sources**: Each change tagged with source
2. **Build Context**: Brain query: "Recent manual changes to preserve"  
3. **Enhanced Prompt**: "PRESERVE these manual elements: [list]"
4. **Validation**: Ensure manual edits survive LLM changes

## 📋 IMPLEMENTATION TASKS

### High Priority (This Sprint)
- [ ] Add `changeSource` to sceneIterations schema
- [ ] Update CodePanelG to track manual saves  
- [ ] Update Brain Orchestrator to query manual changes
- [ ] Enhance editScene prompts with preservation context

### Medium Priority (Next Sprint)  
- [ ] Context Builder integration with sceneIterations
- [ ] Advanced conflict detection
- [ ] User intent analysis from patterns
- [ ] Performance optimization

### Future Enhancements
- [ ] Real-time collaboration conflict resolution
- [ ] ML-based change pattern analysis  
- [ ] Automated merge strategies
- [ ] User satisfaction correlation analysis

## 🏗️ NO DUPLICATION FOUND

**Good News**: Services are complementary, not duplicated:
- **sceneIterations**: Granular change tracking (database)
- **projectMemory**: Long-term context storage  
- **contextBuilder**: AI context orchestration
- **sceneRepository**: Pattern analysis & background jobs

Each serves a distinct purpose in the change tracking ecosystem.

## 🔧 NEXT STEPS

1. **Implement Phase 1** changes (schema + tracking)
2. **Test manual change preservation** with user scenario
3. **Document new workflows** for team
4. **Monitor performance** impact of enhanced tracking

**Status**: Ready for implementation - existing infrastructure solid, gaps clearly identified.
