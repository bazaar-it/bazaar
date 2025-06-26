# Deep Dive Vision for Bazaar-Vid

## Current State Analysis

### What We Have Today
```typescript
// Single page analysis
WebAnalysisAgent → Screenshots → Context → Brain → AddTool → One Scene

// Our current pipeline components:
- WebAnalysisAgent (single page screenshots)
- Brain Orchestrator (decides which tool to use)
- Generation Tools (Add/Edit/Delete/Trim)
- SSE streaming for real-time updates
- R2 storage for assets
- PostgreSQL with Drizzle ORM
- tRPC for API layer
```

### The Deep Dive Vision
Transform our single-scene generation into autonomous multi-scene campaign creation by enhancing existing components.

## What Needs to Change

### 1. Enhanced Web Analysis (Building on WebAnalysisAgent)

**Current**: 
```typescript
// Single page, two screenshots
analyzeWebsite(url) → { desktop, mobile, pageData }
```

**Enhanced**:
```typescript
class EnhancedWebAnalysisAgent extends WebAnalysisAgent {
  async analyzeForCampaign(
    startUrl: string, 
    objective: string,
    projectId: string
  ): Promise<CampaignIntelligence> {
    // 1. Analyze homepage (existing functionality)
    const homepage = await this.analyzeWebsite(startUrl, projectId);
    
    // 2. Intelligent page discovery
    const pagesToAnalyze = await this.discoverRelevantPages(homepage, objective);
    // Example: For "product launch", find /pricing, /features, /about
    
    // 3. Multi-page analysis
    const pages: WebAnalysisResult[] = [homepage];
    for (const pageUrl of pagesToAnalyze) {
      const analysis = await this.analyzeWebsite(pageUrl, projectId);
      pages.push(analysis);
    }
    
    // 4. Synthesize intelligence across all pages
    return this.synthesizeCampaignIntelligence(pages, objective);
  }
  
  private async discoverRelevantPages(
    homepage: WebAnalysisResult,
    objective: string
  ): Promise<string[]> {
    // Use AI to identify which links to follow
    const links = this.extractLinks(homepage.pageData);
    
    // Ask Claude/GPT: "Given objective X, which pages should I analyze?"
    const relevantLinks = await this.aiClient.selectPages({
      objective,
      availableLinks: links,
      maxPages: 5
    });
    
    return relevantLinks;
  }
}
```

### 2. Campaign-Aware Brain Orchestrator

**Current**:
```typescript
// Decides single tool action
BrainOrchestrator → { toolName: 'addScene', context: {...} }
```

**Enhanced**:
```typescript
class CampaignBrainOrchestrator extends BrainOrchestrator {
  async planCampaign(
    input: OrchestrationInput,
    campaignIntel: CampaignIntelligence
  ): Promise<CampaignPlan> {
    // Instead of single tool decision, create full campaign plan
    const storyboard = await this.createStoryboard({
      objective: input.prompt,
      brandIntel: campaignIntel,
      targetSceneCount: 6-8
    });
    
    return {
      scenes: storyboard.scenes.map(scene => ({
        id: scene.id,
        toolAction: 'addScene',
        context: {
          sceneObjective: scene.objective,
          brandElements: scene.brandElements,
          duration: scene.duration,
          narrativeRole: scene.narrativeRole // "hook", "problem", etc.
        }
      })),
      totalDuration: storyboard.totalDuration,
      narrative: storyboard.narrativeArc
    };
  }
}
```

### 3. Iterative Scene Generation (Using Existing Tools)

**Current**:
```typescript
// Single pass generation
AddTool.run() → Scene code
```

**Enhanced**:
```typescript
class IterativeSceneGenerator {
  constructor(
    private addTool: AddTool,
    private editTool: EditTool,
    private aiClient: AIClient
  ) {}
  
  async generateWithRefinement(
    scenePlan: ScenePlan,
    campaignContext: CampaignIntelligence,
    previousScenes: Scene[]
  ): Promise<Scene> {
    // 1. Initial generation using existing AddTool
    const initialScene = await this.addTool.run({
      userPrompt: scenePlan.objective,
      webContext: campaignContext.webContext,
      previousSceneContext: previousScenes[previousScenes.length - 1],
      projectId: scenePlan.projectId
    });
    
    // 2. Self-critique
    const critique = await this.evaluateScene(
      initialScene,
      scenePlan,
      campaignContext
    );
    
    if (critique.score > 0.8) return initialScene;
    
    // 3. Refine using EditTool
    const refinedScene = await this.editTool.run({
      sceneId: initialScene.id,
      editPrompt: critique.improvements,
      targetDuration: scenePlan.duration
    });
    
    return refinedScene;
  }
}
```

### 4. Real-Time Progress (Using Existing SSE)

**Current**:
```typescript
// SSE for single scene generation
eventStream.send({ type: 'scene-generated', scene })
```

**Enhanced**:
```typescript
// Rich progress updates through existing SSE infrastructure
class CampaignProgressReporter {
  constructor(private eventStream: SSEService) {}
  
  reportProgress(projectId: string, event: CampaignEvent) {
    // Use existing SSE to stream campaign progress
    this.eventStream.send(projectId, {
      type: 'campaign-progress',
      phase: event.phase, // 'analyzing', 'planning', 'creating-scene-3'
      message: event.message,
      progress: event.progress, // 0-100
      preview: event.preview // Scene preview URL from R2
    });
  }
}
```

## Database Changes Needed

### 1. Add Campaign Jobs Table
```sql
-- New table to track multi-scene campaigns
CREATE TABLE campaign_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  
  -- Campaign config
  objective TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_scene_count INTEGER DEFAULT 6,
  
  -- Status
  status VARCHAR(50) DEFAULT 'queued',
  current_phase VARCHAR(50),
  progress INTEGER DEFAULT 0,
  
  -- Results
  campaign_intel JSONB, -- Brand analysis results
  storyboard JSONB,     -- Scene planning
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 2. Extend Web Analysis Storage
```sql
-- Store multi-page analysis results
ALTER TABLE web_analyses ADD COLUMN campaign_job_id UUID REFERENCES campaign_jobs(id);
ALTER TABLE web_analyses ADD COLUMN page_type VARCHAR(50); -- 'home', 'pricing', etc.
ALTER TABLE web_analyses ADD COLUMN extracted_content JSONB; -- Structured data
```

## Implementation Path Using Current Codebase

### Phase 1: Multi-Page Web Analysis
1. Extend `WebAnalysisAgent` to handle multiple pages
2. Add page discovery logic (AI-driven link selection)
3. Store results in extended `web_analyses` table

### Phase 2: Campaign Planning in Brain
1. Create `CampaignPlanner` service that uses Brain Orchestrator
2. Generate multi-scene storyboards instead of single decisions
3. Store campaign plans in new table

### Phase 3: Sequential Scene Generation
1. Use existing AddTool for each scene in sequence
2. Pass previous scene context for continuity
3. Stream progress via existing SSE

### Phase 4: Iterative Refinement
1. Add quality scoring to generated scenes
2. Use EditTool to refine low-scoring scenes
3. Maximum 2-3 iterations per scene

### Phase 5: Assembly & Polish
1. Combine all scenes using existing Remotion pipeline
2. Add transitions between scenes
3. Export final video

## What We DON'T Need to Build

- ❌ New messaging system (use SSE)
- ❌ New storage (use R2)  
- ❌ New database (extend PostgreSQL)
- ❌ New API layer (use tRPC)
- ❌ New AI infrastructure (use existing OpenAI client)
- ❌ New auth system (use existing NextAuth)

## Cost & Performance Estimates

### Token Usage (OpenAI)
- Current single scene: ~2-3k tokens
- Deep Dive campaign: ~30-40k tokens (10-15x)
- Cost per campaign: $0.50-1.00

### Time Estimates  
- Multi-page analysis: 30-60 seconds
- Storyboard planning: 10-20 seconds
- Scene generation (6 scenes): 3-5 minutes
- Refinements: 1-2 minutes
- **Total: 5-8 minutes**

### Storage (R2)
- Current: 2 screenshots per generation
- Deep Dive: 10-20 screenshots + 6-8 scene previews
- ~10MB per campaign

## Success Criteria

1. **Quality**: Videos tell coherent brand story
2. **Speed**: Under 10 minutes total
3. **Cost**: Under $2 per campaign
4. **Reliability**: 80%+ success rate
5. **User Delight**: "This looks professional!"

## Next Steps

1. **Prototype**: Extend WebAnalysisAgent for multi-page
2. **Test**: Campaign planning with real websites
3. **Iterate**: Refine quality scoring
4. **Ship**: Beta with 10 power users

This vision leverages everything we've built while adding autonomous campaign creation capabilities!