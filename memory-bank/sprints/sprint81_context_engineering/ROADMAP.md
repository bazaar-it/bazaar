# Robust Image Ingestion & Context-Oriented Reasoning Roadmap

**Session Reference:** Sprint-80 Design Sync — 22 July 2025, 20:48 CEST  
**Sprint Number:** 81  
**Sprint Name:** Context Engineering

---

## Executive Summary

The team resolved to overhaul both the media-upload pathway and the cognitive layer that supplies conditional context to downstream scene-generation agents. User-supplied image or video assets must be ingested with iron-clad determinism, eliminating hallucinated placeholders and guaranteeing that the *exact* URL remains addressable in every subsequent prompt. Parallel to this, we will replace ad-hoc prompt injection with a formal **context-engineering** strategy that dynamically curates stylistic and semantic metadata—e.g., "Apple-style minimalism"—and forwards that corpus to the code-generation subsystem.

## 1. Problem Statement

1. **Unreliable URL utilisation:** The LLM occasionally fabricates assets even when a concrete upload URL is present, leading to visual mismatches and user frustration.
2. **Context decay:** Uploaded asset references fall out of scope in multi-turn conversations; future prompts can no longer retrieve the canonical URL.
3. **Style inference gap:** "Animate this in the style of an Apple ad" currently depends on brittle keyword spotting rather than a structured research pipeline.

## 2. Strategic Goals

* **Deterministic Ingestion:** Any image/video that reaches the back-end is stored with a persistent CDN URL; *no content substitution is permitted*.
* **Perpetual Context Binding:** The brain layer serialises asset URLs into a conversation-scoped memory object, guaranteeing availability for the full session lifespan and beyond.
* **Research-Driven Stylistic Context:** A specialised web-scraping agent assembles mood-boards, colour palettes, and typographic norms for requested styles, feeding that dataset to the generator so it can emulate industry-grade aesthetics.

## 3. Architecture Overview

```
                ┌────────────┐      upload      ┌────────────┐
User Asset ───▶ │  Media API │ ───────────────▶ │  CDN Blob  │
                └────────────┘                  └────────────┘
                     │                               │
             URL + metadata                Signed, permanent URL
                     │                               │
                     ▼                               ▼
                ┌──────────────────────┐       ┌────────────────┐
                │  Brain Context Store │◀─────│  Style Agent   │
                └──────────────────────┘  fetch│ (web research) │
                     │   emits                    └────────────────┘
                     ▼
                ┌─────────────────────┐
                │  Code-Gen Agent     │
                └─────────────────────┘
```

## 4. Implementation Plan

| Phase | Deliverable                                                 | Owner  | Due     |
| ----- | ----------------------------------------------------------- | ------ | ------- |
| 0     | **Spec lock** – finalise schema for asset context object    | PM     |  T+2 d  |
| 1     | **Media API patch** – enforce URL integrity checks          | BE     |  T+5 d  |
| 2     | **Conversation memory** – embed URL list in Redis layer     | BE     |  T+8 d  |
| 3     | **Style Agent v0.1** – scrape & summarise visual references | AI ENG |  T+12 d |
| 4     | **LLM prompt refactor** – consume structured context token  | AI ENG |  T+16 d |
| 5     | **QA & A/B rollout** – measure hallucination regression     | QA     |  T+20 d |

## 5. Risk & Mitigation

* **Hallucination persists:** Implement a guard-rail that rejects generation output if the asset URL is missing.
* **Latency overhead:** Cache style-agent results for popular prompts ("Apple ad," "Cyberpunk neon") to maintain sub-second responses.
* **Scraper legal compliance:** Restrict web crawling to publicly licensed material; respect robots.txt directives.

## 6. Evaluation Metrics

| KPI                                  | Baseline | Target     |
| ------------------------------------ | -------- | ---------- |
| Asset URL Retention after 5 prompts  |  67 %    |  ≥ 98 %    |
| Hallucinated Asset Rate              |  12 %    |  ≤ 2 %     |
| Style-Match User Satisfaction (CSAT) |  –       |  ≥ 4.3 / 5 |

## 7. Open Questions

1. Which embedding granularity best preserves image semantics for future reasoning without ballooning token usage?
2. How do we gracefully degrade when a style query has scarce public exemplars?
3. Should we expose a UI toggle that lets power users lock an asset as "immutable" to prevent future overrides?

---

## Detailed Technical Specifications

### Asset Context Object Schema

```typescript
interface AssetContext {
  id: string;
  projectId: string;
  conversationId: string;
  assets: Asset[];
  metadata: AssetMetadata;
  createdAt: Date;
  updatedAt: Date;
}

interface Asset {
  id: string;
  url: string;  // Permanent CDN URL
  type: 'image' | 'video' | 'logo';
  dimensions: { width: number; height: number };
  fileSize: number;
  hash: string;  // For deduplication
  tags: string[];  // AI-generated tags
  immutable: boolean;  // User-lockable flag
  usageCount: number;  // Track references
}

interface AssetMetadata {
  dominantColors: string[];
  detectedObjects: string[];
  textContent?: string;
  brandElements?: BrandElement[];
  styleAttributes?: StyleAttribute[];
}
```

### Context Store Implementation

```typescript
// Redis-backed context persistence
class ContextStore {
  private redis: RedisClient;
  
  async saveAssetContext(
    conversationId: string, 
    assets: Asset[]
  ): Promise<void> {
    const key = `context:${conversationId}:assets`;
    await this.redis.setex(
      key, 
      86400 * 7, // 7-day TTL
      JSON.stringify(assets)
    );
  }
  
  async getAssetContext(conversationId: string): Promise<Asset[]> {
    const key = `context:${conversationId}:assets`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : [];
  }
  
  async appendAsset(conversationId: string, asset: Asset): Promise<void> {
    const assets = await this.getAssetContext(conversationId);
    assets.push(asset);
    await this.saveAssetContext(conversationId, assets);
  }
}
```

### Style Research Agent

```typescript
interface StyleResearchAgent {
  research(styleQuery: string): Promise<StyleContext>;
}

interface StyleContext {
  name: string;
  description: string;
  colorPalette: Color[];
  typography: Typography[];
  layoutPrinciples: string[];
  animationStyle: AnimationStyle;
  referenceUrls: string[];
  confidence: number;
}

class WebScrapingStyleAgent implements StyleResearchAgent {
  async research(styleQuery: string): Promise<StyleContext> {
    // 1. Check cache first
    const cached = await this.cache.get(styleQuery);
    if (cached) return cached;
    
    // 2. Perform web search
    const searchResults = await this.searchEngine.search(
      `${styleQuery} design principles color palette typography`
    );
    
    // 3. Scrape and analyze
    const styleData = await this.analyzeResults(searchResults);
    
    // 4. Cache results
    await this.cache.set(styleQuery, styleData, { ttl: 604800 }); // 7 days
    
    return styleData;
  }
}
```

### Guard Rails Implementation

```typescript
class AssetURLGuardRail {
  validate(generatedCode: string, requiredAssets: Asset[]): ValidationResult {
    const missingAssets: Asset[] = [];
    
    for (const asset of requiredAssets) {
      if (!generatedCode.includes(asset.url)) {
        missingAssets.push(asset);
      }
    }
    
    if (missingAssets.length > 0) {
      return {
        valid: false,
        errors: missingAssets.map(a => 
          `Missing required asset: ${a.url} (${a.type})`
        ),
        suggestion: 'Regenerate with explicit asset URL injection'
      };
    }
    
    return { valid: true };
  }
}
```

### Enhanced Brain Context Builder

```typescript
class EnhancedContextBuilder {
  async buildContext(
    conversation: Conversation,
    styleQuery?: string
  ): Promise<EnhancedContext> {
    // 1. Get base context
    const baseContext = await this.baseBuilder.build(conversation);
    
    // 2. Retrieve persisted assets
    const assets = await this.contextStore.getAssetContext(conversation.id);
    
    // 3. Research style if requested
    let styleContext: StyleContext | undefined;
    if (styleQuery) {
      styleContext = await this.styleAgent.research(styleQuery);
    }
    
    // 4. Construct enhanced context
    return {
      ...baseContext,
      assets: {
        uploaded: assets,
        required: assets.filter(a => a.immutable),
        recent: assets.slice(-5) // Last 5 uploads
      },
      style: styleContext,
      constraints: {
        mustUseAssets: assets.filter(a => a.immutable).map(a => a.url),
        forbidPlaceholders: true
      }
    };
  }
}
```

### Prompt Engineering Updates

```typescript
const CONTEXT_AWARE_GENERATION_PROMPT = `
You are generating Remotion code for a video scene.

CRITICAL REQUIREMENTS:
1. You MUST use the exact URLs provided in the assets section
2. You MUST NOT use placeholder images or fabricate URLs
3. If an asset URL is provided, it MUST appear in your generated code

AVAILABLE ASSETS:
{{#each assets.uploaded}}
- {{this.type}}: {{this.url}} ({{this.dimensions.width}}x{{this.dimensions.height}})
{{/each}}

{{#if style}}
STYLE CONTEXT:
- Style: {{style.name}}
- Colors: {{style.colorPalette}}
- Typography: {{style.typography}}
- Animation: {{style.animationStyle}}
{{/if}}

Generate code that uses these exact assets and follows the style guidelines.
`;
```

---

**Document Status:** Complete  
**Next Review:** Sprint 81 Planning Session