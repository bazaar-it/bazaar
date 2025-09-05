# Technical Architecture: URL-to-Video Pipeline

## System Overview

The URL-to-Video pipeline transforms any website into a branded motion graphics video through a series of intelligent processing stages.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   URL Input  │────▶│ Web Analysis │────▶│Brand Profile │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│Video Output  │◀────│   Template   │◀────│    Story     │
│              │     │ Customization│     │  Generation  │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Core Components

### 1. Web Analysis Agent (`/src/tools/webAnalysis/`)

#### WebAnalysisEnhanced.ts
```typescript
class EnhancedWebAnalyzer {
  private browser: Browser;
  private page: Page;
  
  async analyzeWebsite(url: string): Promise<EnhancedWebAnalysis> {
    // 1. Multi-viewport screenshot capture
    const screenshots = await this.captureScreenshots(url);
    
    // 2. Brand extraction
    const brand = await this.extractBrand();
    
    // 3. Content analysis
    const content = await this.extractContent();
    
    // 4. Social proof extraction
    const socialProof = await this.extractSocialProof();
    
    // 5. Media asset collection
    const media = await this.collectMediaAssets();
    
    return {
      url,
      timestamp: new Date(),
      brand,
      content,
      socialProof,
      media,
      screenshots,
    };
  }
  
  private async captureScreenshots(url: string): Promise<Screenshot[]> {
    const viewports = [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop' },
      { width: 1440, height: 900, name: 'wide' },
    ];
    
    const screenshots = [];
    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      const screenshot = await this.page.screenshot({ fullPage: true });
      const s3Url = await uploadToS3(screenshot, viewport.name);
      screenshots.push({ ...viewport, url: s3Url });
    }
    
    return screenshots;
  }
}
```

### 2. Brand Profile Storage (`/src/server/db/`)

#### Database Schema
```sql
-- Brand profiles table
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  
  -- Brand data as JSONB for flexibility
  brand_data JSONB NOT NULL DEFAULT '{}',
  
  -- Extracted brand elements
  colors JSONB DEFAULT '{}',
  typography JSONB DEFAULT '{}',
  logos JSONB DEFAULT '{}',
  
  -- Screenshots and media
  screenshots JSONB DEFAULT '[]',
  media_assets JSONB DEFAULT '[]',
  
  -- Metadata
  extraction_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_brand_profiles_project_id (project_id),
  INDEX idx_brand_profiles_website_url (website_url)
);

-- Brand profile versions for history
CREATE TABLE brand_profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  brand_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(brand_profile_id, version_number)
);
```

#### TypeScript Types
```typescript
// src/lib/types/brand.types.ts
export interface BrandProfile {
  id: string;
  projectId: string;
  websiteUrl: string;
  
  brandData: {
    colors: BrandColors;
    typography: BrandTypography;
    voice: BrandVoice;
    imagery: BrandImagery;
    motion: BrandMotion;
  };
  
  screenshots: Screenshot[];
  mediaAssets: MediaAsset[];
  
  metadata: {
    extractionVersion: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accents: string[];
  neutrals: string[];
  gradients: Gradient[];
  colorUsage: {
    backgrounds: string[];
    text: string[];
    buttons: string[];
    borders: string[];
  };
}

export interface BrandTypography {
  fonts: {
    heading: FontStack;
    body: FontStack;
    code?: FontStack;
  };
  scale: {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    body: TypographyStyle;
    small: TypographyStyle;
  };
}
```

### 3. Story Generation (`/src/tools/narrative/`)

#### Hero's Journey LLM
```typescript
// src/tools/narrative/herosJourneyLLM.ts
export class HeroJourneyLLM {
  private openai: OpenAI;
  
  async generateStory(
    brand: BrandProfile,
    product: ProductData
  ): Promise<StoryArc> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(brand, product);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    
    return this.parseStoryResponse(response);
  }
  
  private buildSystemPrompt(): string {
    return `You are a master storyteller specializing in software product narratives.
    Create a hero's journey story arc that:
    1. Starts with a relatable problem
    2. Introduces the product as the solution
    3. Shows transformation through features
    4. Celebrates success with metrics
    5. Invites action with clear CTA
    
    Return a JSON object with this structure:
    {
      "arc": "problem-solution" | "transformation" | "discovery",
      "beats": [
        {
          "type": "problem" | "discovery" | "transformation" | "triumph" | "invitation",
          "duration": number (frames, 30fps),
          "narrative": string,
          "visualFocus": string[],
          "emotionalTone": string
        }
      ],
      "totalDuration": number (frames),
      "keyMessages": string[]
    }`;
  }
}
```

### 4. Template System (`/src/templates/`)

#### Template Structure
```typescript
// src/templates/registry.ts
export const TEMPLATE_REGISTRY: Map<string, TemplateDefinition> = new Map([
  ['logo-fade', {
    id: 'logo-fade',
    name: 'Logo Fade In',
    category: 'intro',
    component: () => import('./intros/LogoFade'),
    metadata: {
      duration: { min: 60, optimal: 90, max: 120 },
      style: ['minimal'],
      emotionalTone: ['professional', 'elegant'],
      customizable: {
        logo: true,
        backgroundColor: true,
        fadeSpeed: true,
      },
    },
  }],
  // ... more templates
]);

// Template component structure
// src/templates/intros/LogoFade.tsx
export interface LogoFadeProps {
  logo?: string;
  backgroundColor?: string;
  fadeSpeed?: number;
  duration: number;
}

export default function LogoFade({ 
  logo = '/default-logo.svg',
  backgroundColor = '#000000',
  fadeSpeed = 30,
  duration = 90,
}: LogoFadeProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const opacity = interpolate(
    frame,
    [0, fadeSpeed],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity,
      }}>
        <img src={logo} alt="Logo" style={{ maxWidth: '200px' }} />
      </div>
    </AbsoluteFill>
  );
}
```

### 5. Template Router (`/src/server/services/website/`)

#### Intelligent Selection
```typescript
// src/server/services/website/template-router.ts
export class TemplateRouter {
  private templateRegistry: Map<string, TemplateDefinition>;
  private selectionModel: TemplateSelectionModel;
  
  async routeStory(
    story: StoryArc,
    brand: BrandProfile,
    style: VideoStyle
  ): Promise<RoutedStory> {
    const routedBeats: RoutedBeat[] = [];
    let previousTemplate: TemplateDefinition | null = null;
    
    for (const beat of story.beats) {
      const template = await this.selectTemplate(
        beat,
        brand,
        style,
        previousTemplate
      );
      
      const customization = this.generateCustomization(
        template,
        brand,
        beat
      );
      
      routedBeats.push({
        beat,
        template,
        customization,
      });
      
      previousTemplate = template;
    }
    
    return {
      story,
      routedBeats,
      estimatedDuration: this.calculateDuration(routedBeats),
    };
  }
  
  private async selectTemplate(
    beat: StoryBeat,
    brand: BrandProfile,
    style: VideoStyle,
    previous: TemplateDefinition | null
  ): Promise<TemplateDefinition> {
    // Get candidates for this beat type
    const candidates = this.getCandidatesForBeat(beat.type);
    
    // Score each candidate
    const scores = candidates.map(template => ({
      template,
      score: this.scoreTemplate(template, beat, brand, style, previous),
    }));
    
    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);
    
    return scores[0].template;
  }
  
  private scoreTemplate(
    template: TemplateDefinition,
    beat: StoryBeat,
    brand: BrandProfile,
    style: VideoStyle,
    previous: TemplateDefinition | null
  ): number {
    let score = 0;
    
    // Beat type match (40%)
    if (template.metadata.beatTypes.includes(beat.type)) {
      score += 40;
    }
    
    // Style match (20%)
    if (template.metadata.style.includes(style)) {
      score += 20;
    }
    
    // Brand personality match (20%)
    const personalityMatch = this.calculatePersonalityMatch(
      template,
      brand
    );
    score += personalityMatch * 20;
    
    // Flow compatibility (10%)
    if (previous && template.metadata.compatibleWith.includes(previous.id)) {
      score += 10;
    }
    
    // Duration fit (10%)
    const durationFit = this.calculateDurationFit(
      template,
      beat.duration
    );
    score += durationFit * 10;
    
    return score;
  }
}
```

### 6. Template Customizer (`/src/server/services/website/`)

#### Brand Application
```typescript
// src/server/services/website/template-customizer.ts
export class TemplateCustomizer {
  async customizeTemplate(
    template: TemplateDefinition,
    brand: BrandProfile,
    content: BeatContent
  ): Promise<CustomizedTemplate> {
    const customization: TemplateCustomization = {};
    
    // Apply brand colors
    if (template.metadata.customizable.colors) {
      customization.colors = this.mapBrandColors(
        template.metadata.colorSlots,
        brand.brandData.colors
      );
    }
    
    // Apply typography
    if (template.metadata.customizable.typography) {
      customization.typography = this.mapBrandTypography(
        template.metadata.typographySlots,
        brand.brandData.typography
      );
    }
    
    // Apply content
    if (template.metadata.customizable.content) {
      customization.content = this.mapContent(
        template.metadata.contentSlots,
        content
      );
    }
    
    // Apply media
    if (template.metadata.customizable.media) {
      customization.media = this.mapMedia(
        template.metadata.mediaSlots,
        brand.mediaAssets
      );
    }
    
    // Generate final code
    const code = await this.generateCode(
      template,
      customization
    );
    
    return {
      templateId: template.id,
      customization,
      code,
      duration: content.duration,
    };
  }
  
  private mapBrandColors(
    slots: ColorSlot[],
    colors: BrandColors
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    for (const slot of slots) {
      switch (slot.role) {
        case 'primary':
          mapping[slot.name] = colors.primary;
          break;
        case 'secondary':
          mapping[slot.name] = colors.secondary;
          break;
        case 'accent':
          mapping[slot.name] = colors.accents[0] || colors.primary;
          break;
        case 'background':
          mapping[slot.name] = colors.neutrals[0] || '#ffffff';
          break;
        case 'text':
          mapping[slot.name] = colors.colorUsage.text[0] || '#000000';
          break;
      }
    }
    
    return mapping;
  }
}
```

## Data Flow

### 1. Input Processing
```
URL Input
    │
    ├─▶ URL Validation
    ├─▶ Website Reachability Check
    └─▶ Project Association
```

### 2. Brand Extraction Flow
```
Website URL
    │
    ├─▶ Playwright Browser Launch
    ├─▶ Multi-Viewport Navigation
    ├─▶ Screenshot Capture
    ├─▶ DOM Analysis
    │   ├─▶ Color Extraction
    │   ├─▶ Font Detection
    │   ├─▶ Logo Discovery
    │   └─▶ Content Scraping
    ├─▶ Style Analysis
    │   ├─▶ CSS Processing
    │   ├─▶ Animation Detection
    │   └─▶ Layout Analysis
    └─▶ Media Collection
        ├─▶ Image Download
        ├─▶ Icon Extraction
        └─▶ Video Discovery
```

### 3. Story Generation Flow
```
Brand Profile + Product Data
    │
    ├─▶ LLM Prompt Construction
    ├─▶ GPT-4 API Call
    ├─▶ Response Parsing
    ├─▶ Story Validation
    └─▶ Beat Generation
        ├─▶ Problem Beat
        ├─▶ Discovery Beat
        ├─▶ Transformation Beat
        ├─▶ Triumph Beat
        └─▶ Invitation Beat
```

### 4. Template Selection Flow
```
Story Beat
    │
    ├─▶ Candidate Retrieval
    ├─▶ Scoring Algorithm
    │   ├─▶ Beat Match Score
    │   ├─▶ Style Match Score
    │   ├─▶ Brand Match Score
    │   ├─▶ Flow Match Score
    │   └─▶ Duration Match Score
    ├─▶ Ranking
    └─▶ Selection
```

### 5. Customization Flow
```
Template + Brand + Content
    │
    ├─▶ Slot Identification
    ├─▶ Value Mapping
    │   ├─▶ Color Mapping
    │   ├─▶ Font Mapping
    │   ├─▶ Content Mapping
    │   └─▶ Media Mapping
    ├─▶ Code Generation
    └─▶ Validation
```

## API Endpoints

### tRPC Routes
```typescript
// src/server/api/routers/website-pipeline.ts
export const websitePipelineRouter = createTRPCRouter({
  // Main generation endpoint
  generateFromWebsite: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      projectId: z.string().uuid(),
      options: z.object({
        duration: z.number().min(10).max(60).default(20),
        style: z.enum(['minimal', 'dynamic', 'bold']).default('dynamic'),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Full pipeline execution
    }),
  
  // Brand profile management
  getBrandProfile: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Retrieve brand profile
    }),
  
  updateBrandProfile: protectedProcedure
    .input(z.object({
      profileId: z.string().uuid(),
      updates: z.any(), // BrandProfile partial
    }))
    .mutation(async ({ input, ctx }) => {
      // Update brand profile
    }),
  
  // Template management
  getTemplates: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      style: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // List available templates
    }),
  
  // Story management  
  regenerateStory: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      storyType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate new story variation
    }),
});
```

## Performance Optimization

### Caching Strategy
```typescript
// Redis cache for brand profiles
const brandCache = new Redis({
  keyPrefix: 'brand:',
  ttl: 3600, // 1 hour
});

// Template code cache
const templateCache = new Map<string, CompiledTemplate>();

// Story generation cache
const storyCache = new LRUCache<string, StoryArc>({
  max: 100,
  ttl: 1800, // 30 minutes
});
```

### Parallel Processing
```typescript
async function processInParallel(url: string) {
  const [
    screenshots,
    brandData,
    content,
    media,
  ] = await Promise.all([
    captureScreenshots(url),
    extractBrand(url),
    extractContent(url),
    collectMedia(url),
  ]);
  
  return { screenshots, brandData, content, media };
}
```

### Resource Management
```typescript
class ResourcePool {
  private browsers: Browser[] = [];
  private maxBrowsers = 5;
  
  async getBrowser(): Promise<Browser> {
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await chromium.launch();
      this.browsers.push(browser);
      return browser;
    }
    
    // Wait for available browser
    return this.waitForBrowser();
  }
  
  async releaseBrowser(browser: Browser) {
    // Return to pool or close if excess
  }
}
```

## Error Handling

### Error Types
```typescript
export class WebAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
  }
}

export class StoryGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public fallbackStory?: StoryArc
  ) {
    super(message);
  }
}

export class TemplateError extends Error {
  constructor(
    message: string,
    public templateId: string,
    public fallbackTemplate?: string
  ) {
    super(message);
  }
}
```

### Fallback Strategies
```typescript
// Fallback for web analysis failure
async function analyzeWithFallback(url: string) {
  try {
    return await analyzeWebsite(url);
  } catch (error) {
    // Try with simpler analysis
    return await basicAnalysis(url);
  }
}

// Fallback for story generation
async function generateStoryWithFallback(brand: BrandProfile) {
  try {
    return await generateWithLLM(brand);
  } catch (error) {
    // Use template story
    return getTemplateStory(brand);
  }
}

// Fallback for template selection
function selectTemplateWithFallback(beat: StoryBeat) {
  try {
    return selectOptimalTemplate(beat);
  } catch (error) {
    // Use generic template
    return getGenericTemplate(beat.type);
  }
}
```

## Monitoring & Analytics

### Metrics Collection
```typescript
interface PipelineMetrics {
  urlAnalysisTime: number;
  brandExtractionTime: number;
  storyGenerationTime: number;
  templateSelectionTime: number;
  customizationTime: number;
  totalPipelineTime: number;
  
  brandAccuracy: number;
  storyCoherence: number;
  templateMatchScore: number;
  userSatisfaction: number;
}
```

### Performance Tracking
```typescript
class PerformanceTracker {
  private metrics: Map<string, PipelineMetrics> = new Map();
  
  startTimer(sessionId: string, phase: string) {
    // Start timing for phase
  }
  
  endTimer(sessionId: string, phase: string) {
    // End timing and record
  }
  
  recordMetric(sessionId: string, metric: string, value: number) {
    // Record custom metric
  }
  
  async flush() {
    // Send metrics to analytics service
  }
}
```

## Security Considerations

### URL Validation
```typescript
function validateUrl(url: string): boolean {
  // Check URL format
  // Check against blocklist
  // Verify HTTPS
  // Check rate limits
  return isValid;
}
```

### Resource Limits
```typescript
const LIMITS = {
  maxScreenshotSize: 10 * 1024 * 1024, // 10MB
  maxAnalysisTime: 60 * 1000, // 60 seconds
  maxTemplatesPerVideo: 20,
  maxVideoDuration: 60, // seconds
  maxConcurrentJobs: 10,
};
```

### Sandboxing
```typescript
// Run untrusted template code in sandbox
const sandbox = {
  window: {
    Remotion: RemotionAPI,
  },
  console: restrictedConsole,
  // No access to fs, network, etc.
};
```

## Deployment Architecture

### Infrastructure
```yaml
# docker-compose.yml
services:
  web:
    image: bazaar-web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - REDIS_URL
      - S3_BUCKET
  
  worker:
    image: bazaar-worker
    replicas: 3
    environment:
      - PLAYWRIGHT_BROWSERS_PATH
      - OPENAI_API_KEY
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Scaling Strategy
- Horizontal scaling for web analysis workers
- GPU instances for video rendering
- CDN for template and media delivery
- Queue system for async processing
- Auto-scaling based on queue depth

## Testing Strategy

### Unit Tests
```typescript
describe('TemplateRouter', () => {
  it('selects appropriate template for beat', async () => {
    const router = new TemplateRouter();
    const template = await router.selectTemplate(
      mockBeat,
      mockBrand,
      'dynamic',
      null
    );
    expect(template.category).toBe('intro');
  });
});
```

### Integration Tests
```typescript
describe('Website Pipeline', () => {
  it('generates video from URL', async () => {
    const result = await pipeline.generateFromWebsite({
      url: 'https://example.com',
      projectId: 'test-project',
    });
    expect(result.scenes).toHaveLength(5);
  });
});
```

### E2E Tests
```typescript
describe('Full Pipeline', () => {
  it('creates video from real website', async () => {
    const video = await createVideoFromUrl('https://stripe.com');
    expect(video.duration).toBeLessThan(60);
    expect(video.brandAccuracy).toBeGreaterThan(0.9);
  });
});
```

---

*This architecture document will be updated as the system evolves.*