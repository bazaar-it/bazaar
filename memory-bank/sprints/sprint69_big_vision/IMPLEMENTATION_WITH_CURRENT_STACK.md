# Deep Dive Implementation with Current Bazaar-Vid Stack

## Overview
This document shows exactly how to implement Deep Dive mode using our EXISTING infrastructure - no new frameworks, no new services, just enhancing what we have.

## Current Architecture We're Building On

```typescript
// Our current flow
User Message → tRPC Router → Brain Orchestrator → Context Builder → Tools → Database → SSE Updates

// Key components we'll enhance:
- WebAnalysisAgent (add multi-page)
- ContextBuilder (add campaign context) 
- BrainOrchestrator (add campaign planning)
- Generation Tools (use in sequence)
- SSE (stream campaign progress)
```

## Step 1: Enhance WebAnalysisAgent for Multi-Page

```typescript
// File: /apps/main/src/tools/webAnalysis/WebAnalysisAgent.ts

export class WebAnalysisAgent {
  // Keep existing single-page method
  async analyzeWebsite(url: string, projectId?: string): Promise<WebAnalysisResult> {
    // ... existing code
  }
  
  // ADD: Multi-page campaign analysis
  async analyzeCampaign(
    startUrl: string, 
    objective: string,
    projectId: string,
    userId: string
  ): Promise<CampaignAnalysis> {
    const pages: WebAnalysisResult[] = [];
    
    // 1. Analyze homepage first
    const homepage = await this.analyzeWebsite(startUrl, projectId, userId);
    pages.push(homepage);
    
    // 2. Extract links from homepage
    const links = await this.extractNavigationLinks(homepage);
    
    // 3. Use AI to select relevant pages based on objective
    const relevantUrls = await this.selectRelevantPages(links, objective);
    
    // 4. Analyze each relevant page (max 5)
    for (const url of relevantUrls.slice(0, 5)) {
      try {
        const pageAnalysis = await this.analyzeWebsite(url, projectId, userId);
        pages.push(pageAnalysis);
      } catch (error) {
        console.log(`Skipping ${url}:`, error.message);
      }
    }
    
    // 5. Synthesize insights across all pages
    return {
      pages,
      brandIntelligence: this.extractBrandIntelligence(pages),
      contentMap: this.mapContentByType(pages),
      timestamp: new Date()
    };
  }
  
  private async selectRelevantPages(
    links: LinkInfo[], 
    objective: string
  ): Promise<string[]> {
    // Use our existing AI client to select pages
    const prompt = `
      Given the objective: "${objective}"
      And these available pages: ${links.map(l => `${l.text} (${l.url})`).join('\n')}
      
      Which pages would be most relevant to analyze? 
      Consider: pricing, features, about, product pages.
      Return just the URLs, max 5.
    `;
    
    const response = await openai.createCompletion({
      model: "gpt-4o-mini",
      prompt,
      max_tokens: 200
    });
    
    return this.parseUrlsFromResponse(response);
  }
}
```

## Step 2: Add Campaign Mode to Brain Orchestrator

```typescript
// File: /apps/main/src/brain/orchestratorNEW.ts

export class BrainOrchestrator {
  // Keep existing single-action method
  async processUserInput(input: OrchestrationInput): Promise<OrchestratorResponse> {
    // Check if this is a campaign request
    if (this.isCampaignRequest(input.prompt)) {
      return this.planCampaign(input);
    }
    
    // Otherwise use existing logic
    return this.processSingleAction(input);
  }
  
  private async planCampaign(input: OrchestrationInput): Promise<OrchestratorResponse> {
    const context = await this.contextBuilder.buildCampaignContext(input);
    
    // Create a multi-scene plan instead of single action
    const campaignPlan = await this.createCampaignStoryboard(
      input.prompt,
      context.campaignIntelligence
    );
    
    return {
      success: true,
      result: {
        toolName: 'campaign', // New tool type
        toolContext: {
          scenes: campaignPlan.scenes,
          totalDuration: campaignPlan.totalDuration,
          narrative: campaignPlan.narrative
        }
      },
      reasoning: `Creating ${campaignPlan.scenes.length}-scene campaign`,
      chatResponse: `I'll create a complete marketing video with ${campaignPlan.scenes.length} scenes...`
    };
  }
  
  private isCampaignRequest(prompt: string): boolean {
    const campaignKeywords = [
      'campaign', 'full video', 'marketing video', 
      'product launch', 'explainer video', 'promo'
    ];
    return campaignKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );
  }
}
```

## Step 3: Create Campaign Router Handler

```typescript
// File: /apps/main/src/server/api/routers/generation/campaign-operations.ts

export const generateCampaign = protectedProcedure
  .input(generateCampaignSchema)
  .mutation(async ({ input, ctx }) => {
    const { projectId, objective, targetUrl } = input;
    
    // 1. Create campaign job in database
    const [campaign] = await db.insert(campaignJobs).values({
      projectId,
      userId: ctx.userId,
      objective,
      targetUrl,
      status: 'analyzing'
    }).returning();
    
    // 2. Stream progress via SSE
    const stream = new CampaignProgressStream(ctx.eventStream, projectId);
    
    try {
      // 3. Multi-page analysis
      stream.update('Analyzing website...', 10);
      const webAgent = new WebAnalysisAgent();
      const campaignIntel = await webAgent.analyzeCampaign(
        targetUrl,
        objective,
        projectId,
        ctx.userId
      );
      
      // 4. Create storyboard
      stream.update('Planning your video...', 30);
      const orchestrator = new BrainOrchestrator();
      const storyboard = await orchestrator.planCampaign({
        prompt: objective,
        projectId,
        campaignIntelligence: campaignIntel
      });
      
      // 5. Generate scenes sequentially
      const scenes: Scene[] = [];
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scenePlan = storyboard.scenes[i];
        stream.update(`Creating scene ${i + 1}/${storyboard.scenes.length}...`, 40 + (i * 10));
        
        // Use existing AddTool
        const scene = await generateSceneForCampaign(
          scenePlan,
          campaignIntel,
          scenes, // Previous scenes for context
          projectId
        );
        
        scenes.push(scene);
        
        // Stream preview
        stream.sendPreview(scene.id, scene.previewUrl);
      }
      
      // 6. Update campaign status
      await db.update(campaignJobs)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(campaignJobs.id, campaign.id));
      
      stream.complete('Campaign video ready!', 100);
      
      return {
        success: true,
        campaignId: campaign.id,
        scenes: scenes.map(s => ({ id: s.id, name: s.name }))
      };
      
    } catch (error) {
      stream.error(error.message);
      throw error;
    }
  });
```

## Step 4: SSE Progress Streaming

```typescript
// File: /apps/main/src/lib/services/CampaignProgressStream.ts

export class CampaignProgressStream {
  constructor(
    private eventStream: SSEService,
    private projectId: string
  ) {}
  
  update(message: string, progress: number) {
    this.eventStream.send(this.projectId, {
      type: 'campaign-progress',
      message,
      progress,
      timestamp: new Date()
    });
  }
  
  sendPreview(sceneId: string, previewUrl: string) {
    this.eventStream.send(this.projectId, {
      type: 'scene-preview',
      sceneId,
      previewUrl,
      timestamp: new Date()
    });
  }
  
  error(message: string) {
    this.eventStream.send(this.projectId, {
      type: 'campaign-error',
      error: message,
      timestamp: new Date()
    });
  }
  
  complete(message: string, progress: number = 100) {
    this.eventStream.send(this.projectId, {
      type: 'campaign-complete',
      message,
      progress,
      timestamp: new Date()
    });
  }
}
```

## Step 5: Frontend Campaign UI

```typescript
// File: /apps/main/src/app/projects/[id]/generate/workspace/panels/CampaignPanel.tsx

export function CampaignPanel({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [objective, setObjective] = useState('');
  const [url, setUrl] = useState('');
  
  // Use existing SSE hook
  useSSEGeneration({
    projectId,
    onMessage: (event) => {
      switch (event.type) {
        case 'campaign-progress':
          setProgress(event.progress);
          setMessage(event.message);
          break;
        case 'scene-preview':
          setPreviews(prev => ({
            ...prev,
            [event.sceneId]: event.previewUrl
          }));
          break;
      }
    }
  });
  
  const startCampaign = api.generation.generateCampaign.useMutation({
    onSuccess: (data) => {
      console.log('Campaign started:', data.campaignId);
    }
  });
  
  return (
    <div className="space-y-6 p-6">
      {/* Input Form */}
      <div className="space-y-4">
        <Input
          placeholder="Website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Textarea
          placeholder="What kind of video do you want? (e.g., 'Product launch video for our new pricing')"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
        />
        <Button
          onClick={() => startCampaign.mutate({ projectId, objective, targetUrl: url })}
          disabled={!url || !objective || startCampaign.isLoading}
        >
          Create Marketing Campaign
        </Button>
      </div>
      
      {/* Progress Display */}
      {progress > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{message}</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
          
          {/* Scene Previews */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {Object.entries(previews).map(([sceneId, url]) => (
              <div key={sceneId} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img src={url} alt={`Scene ${sceneId}`} className="object-cover" />
                <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                  Scene {sceneId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Step 6: Database Updates

```sql
-- Add to your schema.ts
export const campaignJobs = createTable(
  "campaign_job",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(() => projects.id),
    userId: d.uuid().notNull().references(() => users.id),
    
    // Campaign details
    objective: d.text().notNull(),
    targetUrl: d.text().notNull(),
    targetSceneCount: d.integer().default(6),
    
    // Status
    status: d.varchar({ length: 50 }).default('queued'),
    progress: d.integer().default(0),
    
    // Results  
    brandIntelligence: d.jsonb(),
    storyboard: d.jsonb(),
    
    // Timestamps
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
    startedAt: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true })
  }),
  (t) => [
    index("campaign_job_project_idx").on(t.projectId),
    index("campaign_job_status_idx").on(t.status)
  ]
);

-- Link web analyses to campaigns
ALTER TABLE web_analyses ADD COLUMN campaign_job_id UUID REFERENCES campaign_jobs(id);
```

## What This Gives Us

1. **Multi-page analysis** using enhanced WebAnalysisAgent
2. **Campaign planning** via extended Brain Orchestrator  
3. **Sequential scene generation** using existing tools
4. **Real-time progress** via our SSE infrastructure
5. **Persistent job tracking** in PostgreSQL
6. **R2 storage** for all screenshots and previews

## No New Dependencies

- ✅ Uses existing Playwright for web crawling
- ✅ Uses existing OpenAI client for AI
- ✅ Uses existing tRPC for API  
- ✅ Uses existing SSE for real-time updates
- ✅ Uses existing Remotion for rendering
- ✅ Uses existing R2 for storage

## Performance Considerations

1. **Parallel Analysis**: Analyze multiple pages concurrently
2. **Caching**: Cache brand intelligence by domain
3. **Progress Streaming**: Users see progress in real-time
4. **Error Recovery**: Save progress after each scene

This implementation builds entirely on your existing infrastructure while adding powerful campaign generation capabilities!