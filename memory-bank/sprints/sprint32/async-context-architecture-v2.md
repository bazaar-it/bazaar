# Async Context-Driven Architecture V2 - Implementation Plan

**Date**: January 2025  
**Sprint**: 32  
**Status**: READY FOR IMPLEMENTATION  
**Based on**: User feedback on context accumulation and async image processing

## Overview

This document outlines the implementation plan for the enhanced async context-driven architecture that addresses critical user feedback:

1. **Async Image Analysis**: Images analyzed concurrently, not blocking brain decisions
2. **Context Accumulation**: Persistent context across 30+ prompts with smart memory
3. **Scene Builder vs Editor Pattern**: Clear separation between new scenes and edits
4. **Memory Bank Evolution**: Store and apply user preferences from early prompts
5. **Smart Generation Logic**: JSON vs direct code decision based on complexity

## Architecture Principles

### 🔄 Async-First Design
- **Never block user flow**: Image analysis runs concurrently with brain decisions
- **Late-arriving data**: Handle image facts that arrive after initial decision
- **Graceful degradation**: System works with or without image analysis results

### 🧠 Context Accumulation Strategy
- **30+ Prompt Memory**: Maintain conversation context across extended sessions
- **User Preference Learning**: Extract and persist user style preferences
- **Scene Relationship Mapping**: Track connections between scenes for consistency
- **Smart Summarization**: Compress old context while preserving key insights

### 🎯 Decision Pattern Optimization  
- **Clear Entry Points**: Scene Builder vs Scene Editor based on intent
- **Context-Informed Decisions**: Use accumulated knowledge for better results
- **Structural Intelligence**: JSON when layout complexity requires it, direct code otherwise

## Implementation Steps

### Step 1: Enhanced Context Management 🧠

**File**: `src/lib/services/contextManager.service.ts`

```typescript
export interface ConversationContext {
  projectId: string;
  messageHistory: ContextMessage[];
  userPreferences: UserPreferences;
  sceneRelationships: SceneRelationship[];
  sessionMetadata: SessionMetadata;
}

export interface UserPreferences {
  stylePreferences: {
    duration: number;          // e.g., "2 seconds per scene"
    pacing: 'fast' | 'medium' | 'slow';
    visualStyle: string;       // e.g., "modern, minimalist"
    animationStyle: string;    // e.g., "smooth transitions"
  };
  technicalPreferences: {
    preferredComponents: string[];
    avoidedPatterns: string[];
  };
  confidenceScore: number;
}
```

**Key Features**:
- **Smart Summarization**: Compress 30+ messages into key insights
- **Preference Extraction**: Identify user style patterns from early prompts  
- **Relationship Tracking**: Map scene dependencies and connections
- **Memory Persistence**: Save to project_memory table with TTL management

### Step 2: Async Image Analysis Pipeline ⚡

**File**: `src/lib/services/asyncImageProcessor.service.ts`

```typescript
export class AsyncImageProcessor {
  private processingQueue = new Map<string, ImageProcessingJob>();
  
  async startImageAnalysis(imageUrl: string, requestId: string): Promise<void> {
    // Start analysis but don't wait
    const job = this.analyzeImageAsync(imageUrl, requestId);
    this.processingQueue.set(requestId, job);
    
    // Fire and forget - results will arrive via event
    job.then(result => {
      this.handleImageAnalysisComplete(requestId, result);
    }).catch(error => {
      this.handleImageAnalysisError(requestId, error);
    });
  }
  
  private async handleImageAnalysisComplete(requestId: string, facts: ImageFacts) {
    // Emit event for late-arriving image facts
    eventEmitter.emit('imageFactsReady', { requestId, facts });
    
    // Update context with new information
    await contextManager.addLateArrivingImageFacts(requestId, facts);
  }
}
```

**Integration Points**:
- **Brain Orchestrator**: Starts image analysis but continues with decision
- **Event System**: Notifies when image facts become available  
- **Context Manager**: Integrates late-arriving image data
- **Performance Tracking**: Monitor async processing performance

### Step 3: Scene Builder vs Editor Pattern 🏗️

**File**: `src/lib/services/sceneDecisionRouter.service.ts`

```typescript
export class SceneDecisionRouter {
  async routeSceneRequest(context: ConversationContext, userInput: string): Promise<SceneRoute> {
    const intent = await this.analyzeIntent(userInput, context);
    
    if (intent.type === 'new_scene') {
      return await this.routeToSceneBuilder(intent, context);
    } else if (intent.type === 'edit_scene') {
      return await this.routeToSceneEditor(intent, context);
    }
    
    throw new Error(`Unknown intent type: ${intent.type}`);
  }
  
  private async routeToSceneBuilder(intent: SceneIntent, context: ConversationContext) {
    const isFirstScene = context.sceneRelationships.length === 0;
    const previousScenes = isFirstScene ? [] : await this.getPreviousScenes(context.projectId);
    
    return {
      type: 'scene_builder',
      isFirstScene,
      previousScenes,
      userPreferences: context.userPreferences,
      imageContext: await this.getImageContext(intent.requestId)
    };
  }
}
```

**Decision Logic**:
- **Intent Analysis**: Distinguish between new scene vs edit requests
- **Context Routing**: Route to appropriate handler with full context
- **First Scene Detection**: Special handling for initial scene creation
- **Previous Scene Palette**: Use existing scenes as inspiration for consistency

### Step 4: Smart Generation Decision Logic 🎯

**File**: `src/lib/services/generationDecisionEngine.service.ts`

```typescript
export class GenerationDecisionEngine {
  async decideGenerationApproach(
    sceneRequest: SceneRequest, 
    context: ConversationContext
  ): Promise<GenerationApproach> {
    
    const complexity = await this.analyzeComplexity(sceneRequest);
    const userPreferences = context.userPreferences;
    
    // Direct code for simple scenes
    if (complexity.layoutComplexity < 3 && complexity.animationComplexity < 2) {
      return {
        approach: 'direct_code',
        rationale: 'Simple scene - direct code generation',
        estimatedTokens: complexity.estimatedTokens
      };
    }
    
    // JSON first for complex layouts
    if (complexity.layoutComplexity >= 3 || complexity.multipleComponents) {
      return {
        approach: 'json_then_code',
        rationale: 'Complex layout requires structured planning',
        estimatedTokens: complexity.estimatedTokens
      };
    }
    
    // User preference override
    if (userPreferences.technicalPreferences.preferredComponents.length > 0) {
      return {
        approach: 'json_then_code',
        rationale: 'User has specific component preferences',
        estimatedTokens: complexity.estimatedTokens
      };
    }
    
    return {
      approach: 'direct_code',
      rationale: 'Default to direct code generation',
      estimatedTokens: complexity.estimatedTokens
    };
  }
}
```

**Complexity Factors**:
- **Layout Complexity**: Number of elements, positioning requirements
- **Animation Complexity**: Transition types, timing coordination
- **Component Diversity**: Multiple component types requiring coordination
- **User Preferences**: Explicit component or style requirements

### Step 5: Enhanced Brain Orchestrator Integration 🧠

**File**: `src/server/services/brain/orchestrator.ts` (Enhanced)

```typescript
export class BrainOrchestrator {
  async processRequest(input: string, imageUrl?: string, projectId?: string): Promise<BrainResponse> {
    const requestId = generateRequestId();
    
    // 1. Start async image analysis (don't wait)
    if (imageUrl) {
      this.asyncImageProcessor.startImageAnalysis(imageUrl, requestId);
    }
    
    // 2. Load conversation context
    const context = await this.contextManager.getConversationContext(projectId);
    
    // 3. Make brain decision (concurrent with image analysis)
    const decision = await this.makeBrainDecision(input, context, requestId);
    
    // 4. Route based on decision
    switch (decision.type) {
      case 'new_scene':
        return await this.handleNewScene(decision, context, requestId);
      case 'edit_scene':
        return await this.handleEditScene(decision, context, requestId);
      case 'ask_clarification':
        return await this.handleAskClarification(decision, context);
      case 'delete_scene':
        return await this.handleDeleteScene(decision, context);
    }
  }
  
  private async handleNewScene(decision: BrainDecision, context: ConversationContext, requestId: string) {
    // Route to scene builder with full context
    const route = await this.sceneRouter.routeToSceneBuilder(decision, context);
    
    // Decide generation approach
    const approach = await this.generationEngine.decideGenerationApproach(route.sceneRequest, context);
    
    // Execute generation
    if (approach.approach === 'direct_code') {
      return await this.executeDirectCodeGeneration(route, context, requestId);
    } else {
      return await this.executeJsonThenCodeGeneration(route, context, requestId);
    }
  }
}
```

**Enhanced Features**:
- **Concurrent Processing**: Image analysis doesn't block brain decisions
- **Context Integration**: Full conversation history informs decisions
- **Smart Routing**: Scene builder vs editor based on intent analysis
- **Generation Optimization**: Choose approach based on complexity and preferences

## Data Flow Architecture

### Message Processing Flow

```
1. User Input Received
   ├── Start Image Analysis (if image) → Async Queue
   ├── Load Conversation Context → Context Manager
   └── Brain Decision → Decision Engine

2. Brain Decision Made
   ├── New Scene → Scene Builder Route
   ├── Edit Scene → Scene Editor Route  
   ├── Ask Clarification → Clarification Handler
   └── Delete Scene → Deletion Handler

3. Scene Builder Route (New Scene)
   ├── Check if First Scene → Boolean
   ├── Load Previous Scenes → Scene History
   ├── Apply User Preferences → Context Application
   └── Decide Generation Approach → Direct Code or JSON

4. Generation Execution
   ├── Direct Code → Single AI Call
   └── JSON → AI Call 1 (Structure) → AI Call 2 (Code)

5. Late Image Facts (Async)
   ├── Image Analysis Complete → Event Emission
   ├── Update Context → Context Manager
   └── Enhance Future Decisions → Learning Loop
```

### Context Persistence Strategy

```
Short-term Memory (TTL: 1 hour):
- Current conversation thread
- Active scene editing context
- Pending async operations

Medium-term Memory (TTL: 1 day):
- User session preferences
- Recent scene relationships
- Performance metrics

Long-term Memory (TTL: 30-180 days):
- User style preferences (high confidence)
- Project-level patterns
- Cross-session learnings
```

## Implementation Timeline

### Phase 1: Context Management Foundation (2-3 days)
- ✅ Implement ContextManager service
- ✅ Create conversation context persistence
- ✅ Build user preference extraction
- ✅ Set up context summarization

### Phase 2: Async Image Processing (1-2 days)
- ✅ Build AsyncImageProcessor service
- ✅ Implement event-driven result handling
- ✅ Create late-arriving data integration
- ✅ Add performance monitoring

### Phase 3: Scene Routing Logic (2 days)
- ✅ Implement SceneDecisionRouter
- ✅ Build intent analysis system
- ✅ Create scene builder vs editor routing
- ✅ Add first scene detection

### Phase 4: Smart Generation Engine (2 days)
- ✅ Build GenerationDecisionEngine
- ✅ Implement complexity analysis
- ✅ Create generation approach selection
- ✅ Add user preference integration

### Phase 5: Brain Orchestrator Integration (1-2 days)
- ✅ Enhance existing orchestrator
- ✅ Integrate all new services
- ✅ Add comprehensive testing
- ✅ Performance optimization

## Success Metrics

### Context Quality Metrics
- **Context Relevance**: >90% of decisions use appropriate historical context
- **Preference Accuracy**: >85% of generated scenes match user style preferences
- **Memory Efficiency**: Context summarization maintains <5MB per project

### Performance Metrics  
- **Async Benefit**: Image analysis doesn't block decisions (0ms blocking time)
- **Response Speed**: Brain decisions <2000ms regardless of image processing
- **Context Loading**: Conversation context loaded <300ms

### User Experience Metrics
- **Style Consistency**: >80% of scenes match established project style
- **Intent Recognition**: >95% accurate scene builder vs editor routing
- **Preference Learning**: User style preferences detected within 5 prompts

## Next Steps After Implementation

1. **A/B Testing**: Compare new architecture vs current system
2. **Performance Monitoring**: Track all success metrics in production
3. **User Feedback Integration**: Collect feedback on context awareness
4. **Machine Learning Enhancement**: Train models on successful context patterns
5. **Dashboard Integration**: Surface context insights in production dashboard

## Conclusion

This enhanced architecture transforms bazaar-vid from a reactive prompt-response system to an intelligent, context-aware platform that learns user preferences and optimizes decisions based on accumulated knowledge. The async-first design ensures performance while the context accumulation provides the intelligence needed for truly personalized video generation.

**Ready for implementation** with comprehensive testing and monitoring in place. 