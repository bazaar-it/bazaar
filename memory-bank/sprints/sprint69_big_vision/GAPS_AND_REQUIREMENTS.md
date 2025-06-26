# Gap Analysis: What We Need for Deep Dive Mode

## Current Capabilities vs Deep Dive Requirements

### ✅ What We Already Have

1. **Web Analysis Foundation**
   - WebAnalysisAgent captures screenshots
   - Extracts basic page data (title, headings)
   - Uploads to R2 storage
   - URL validation and security

2. **AI Pipeline**
   - Brain Orchestrator for decision making
   - Context Builder for gathering info
   - OpenAI integration for generation
   - Vision API for image analysis

3. **Generation Tools**
   - AddTool for creating scenes
   - EditTool for refinements
   - Scene management in database
   - Remotion rendering

4. **Infrastructure**
   - tRPC API layer
   - PostgreSQL with Drizzle
   - SSE for real-time updates
   - R2 for asset storage

### ❌ What We Need to Build

#### 1. Multi-Page Crawling
**Current**: Single page analysis
**Need**: Intelligent multi-page exploration

```typescript
// Need to add to WebAnalysisAgent:
- Page discovery (extract links from HTML)
- AI-driven page selection
- Crawl management (visited tracking, depth limits)
- Parallel page processing
```

#### 2. Campaign Intelligence Synthesis
**Current**: Basic page data extraction
**Need**: Deep brand understanding across pages

```typescript
// Need to build:
- Color palette extraction from screenshots
- Typography analysis
- Content pattern recognition
- Value proposition mapping
- Brand voice extraction
```

#### 3. Campaign Planning
**Current**: Single scene decision
**Need**: Multi-scene storyboard creation

```typescript
// Need to enhance Brain Orchestrator:
- Narrative arc planning
- Scene sequencing logic
- Duration allocation
- Asset mapping
```

#### 4. Iterative Refinement
**Current**: One-shot generation
**Need**: Quality scoring and improvement

```typescript
// Need to add:
- Scene quality assessment
- Automated critique generation
- Refinement prompts
- Iteration tracking
```

#### 5. Campaign Job Management
**Current**: Single scene tracking
**Need**: Multi-scene campaign orchestration

```typescript
// Need new database tables:
- campaign_jobs (track overall progress)
- campaign_scenes (link scenes to campaigns)
- Extended web_analyses for multi-page
```

## Specific Technical Gaps

### 1. Link Extraction from Web Pages
```typescript
// Current: We don't extract links
// Need: Parse HTML to find navigation

private async extractLinks(html: string): Promise<Link[]> {
  const $ = cheerio.load(html);
  const links: Link[] = [];
  
  $('a[href]').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    if (href && this.isInternalLink(href)) {
      links.push({ href: this.normalizeUrl(href), text });
    }
  });
  
  return links;
}
```

### 2. Color Extraction from Screenshots
```typescript
// Current: We don't analyze colors
// Need: Extract brand palette

import Vibrant from 'node-vibrant';

private async extractColors(screenshotBuffer: Buffer): Promise<ColorPalette> {
  const palette = await Vibrant.from(screenshotBuffer).getPalette();
  
  return {
    primary: palette.Vibrant?.hex || '#000000',
    secondary: palette.DarkVibrant?.hex,
    accent: palette.LightVibrant?.hex,
    muted: palette.Muted?.hex,
    dark: palette.DarkMuted?.hex
  };
}
```

### 3. Storyboard Templates
```typescript
// Current: No concept of storyboards
// Need: Narrative structures

const NARRATIVE_TEMPLATES = {
  productLaunch: {
    scenes: [
      { type: 'hook', duration: 3, purpose: 'Grab attention' },
      { type: 'problem', duration: 4, purpose: 'Show pain point' },
      { type: 'solution', duration: 5, purpose: 'Introduce product' },
      { type: 'features', duration: 6, purpose: 'Key benefits' },
      { type: 'social-proof', duration: 4, purpose: 'Build trust' },
      { type: 'cta', duration: 3, purpose: 'Drive action' }
    ]
  },
  // More templates...
};
```

### 4. Scene Quality Scoring
```typescript
// Current: No quality assessment
// Need: Automated evaluation

async assessSceneQuality(
  scene: GeneratedScene,
  requirements: SceneRequirements,
  brand: BrandProfile
): Promise<QualityScore> {
  const checks = {
    brandAlignment: this.checkBrandColors(scene, brand),
    narrativeFlow: this.checkStoryConnection(scene, requirements),
    visualClarity: this.checkReadability(scene),
    technicalQuality: this.checkRenderability(scene)
  };
  
  return {
    overall: Object.values(checks).reduce((a, b) => a + b) / 4,
    breakdown: checks,
    improvements: this.suggestImprovements(checks)
  };
}
```

## Implementation Priority

### Phase 1: Foundation (Must Have)
1. **Multi-page crawling** - Core capability
2. **Campaign job tracking** - Database schema
3. **Sequential scene generation** - Use existing tools

### Phase 2: Intelligence (Should Have)
1. **Color extraction** - Better brand matching
2. **Content synthesis** - Smarter narratives
3. **Progress streaming** - User experience

### Phase 3: Polish (Nice to Have)
1. **Iterative refinement** - Quality improvement
2. **Advanced templates** - More variety
3. **Performance optimization** - Faster processing

## External Dependencies Needed

### Required npm packages:
```json
{
  "node-vibrant": "^3.2.1",  // Color extraction
  "cheerio": "^1.0.0-rc.12", // HTML parsing (might already have)
  "p-limit": "^5.0.0"        // Concurrency control
}
```

### No need for:
- ❌ New database (use PostgreSQL)
- ❌ New message queue (use tRPC)
- ❌ New AI service (use OpenAI)
- ❌ New storage (use R2)
- ❌ New auth (use NextAuth)

## Time Estimates

### Development Time per Component:
1. Multi-page crawling: 2-3 days
2. Brand intelligence: 2-3 days
3. Campaign planning: 2 days
4. Quality scoring: 1-2 days
5. UI updates: 1-2 days
6. Testing & refinement: 2-3 days

**Total: 2-3 weeks for full Deep Dive mode**

## Risk Mitigation

### Technical Risks:
1. **Crawling blocked**: Use proper headers, respect robots.txt
2. **Timeout issues**: Implement proper concurrency limits
3. **Cost overruns**: Add token counting and limits
4. **Quality variance**: Start with templates, add AI later

### Mitigation Strategy:
- Build incrementally
- Test with friendly sites first
- Add circuit breakers
- Monitor costs closely

## Success Metrics

1. **Crawl Success**: 80%+ pages analyzed successfully
2. **Generation Time**: <10 minutes for 6-scene campaign
3. **Quality Score**: 85%+ scenes need no refinement
4. **User Satisfaction**: "Wow" reaction to output
5. **Cost Efficiency**: <$2 per campaign

This gap analysis shows that while we need to build several components, they all extend our existing infrastructure rather than replacing it.