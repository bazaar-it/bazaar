# Sprint 81: Context Engineering Technical Design

**Sprint Lead:** Engineering Team  
**Status:** PLANNING  
**Priority:** HIGH - Critical for v3 quality

## Overview

This document provides the technical design for implementing deterministic asset ingestion and context-aware generation in Bazaar-Vid. The goal is to eliminate hallucinated assets and ensure style consistency through structured context engineering.

## Current Problems

### 1. Asset URL Hallucination
```typescript
// Current behavior - AI sometimes ignores provided URLs
User uploads: "logo.png" → https://r2.bazaar-vid.com/assets/xyz123.png
AI generates: <Img src="https://placeholder.com/logo.png" /> ❌
```

### 2. Context Loss in Conversations
```typescript
// Message 1: User uploads image
// Message 5: AI can't remember the upload URL
// Result: Broken references or placeholders
```

### 3. Style Interpretation Inconsistency
```typescript
// User: "Make it like an Apple ad"
// Current: Random interpretation
// Desired: Consistent, researched style application
```

## Solution Architecture

### Phase 1: Deterministic Asset Pipeline

#### 1.1 Upload Enhancement
```typescript
// Before
interface UploadResponse {
  url: string;
  message: ChatMessage;
}

// After
interface EnhancedUploadResponse {
  asset: Asset;
  message: ChatMessage;
  contextId: string;
}

// Implementation
export const enhancedUploadRoute = async (req: Request) => {
  const { file, projectId, conversationId } = await parseRequest(req);
  
  // 1. Upload to R2 with permanent URL
  const permanentUrl = await r2.upload(file, {
    expires: 'never',
    signed: true
  });
  
  // 2. Extract metadata
  const metadata = await extractMetadata(file);
  
  // 3. Create asset record
  const asset: Asset = {
    id: generateId(),
    url: permanentUrl,
    type: detectAssetType(file),
    dimensions: metadata.dimensions,
    hash: await calculateHash(file),
    tags: await generateTags(file),
    immutable: false,
    usageCount: 0
  };
  
  // 4. Persist to context store
  await contextStore.appendAsset(conversationId, asset);
  
  // 5. Update project memory
  await projectMemory.create({
    projectId,
    type: 'uploaded_asset',
    content: asset
  });
  
  return { asset, contextId: conversationId };
};
```

#### 1.2 Context Store Implementation
```typescript
// Using Drizzle + PostgreSQL for persistence
export const assetContext = pgTable('asset_context', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  assets: jsonb('assets').notNull().$type<Asset[]>(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Service layer
export class PersistentContextStore {
  async saveAssetContext(
    conversationId: string,
    projectId: string,
    assets: Asset[]
  ): Promise<void> {
    await db.insert(assetContext)
      .values({
        conversationId,
        projectId,
        assets,
        metadata: await this.generateMetadata(assets)
      })
      .onConflictDoUpdate({
        target: assetContext.conversationId,
        set: {
          assets,
          updatedAt: new Date()
        }
      });
  }
  
  async getAssetContext(conversationId: string): Promise<Asset[]> {
    const result = await db.query.assetContext.findFirst({
      where: eq(assetContext.conversationId, conversationId)
    });
    
    return result?.assets || [];
  }
}
```

### Phase 2: Brain Context Enhancement

#### 2.1 Context Builder Updates
```typescript
// Update brain/contextBuilder.ts
export class EnhancedContextBuilder extends ContextBuilder {
  private contextStore = new PersistentContextStore();
  
  async buildContext(params: ContextParams): Promise<EnhancedContext> {
    const baseContext = await super.buildContext(params);
    
    // 1. Retrieve all uploaded assets for conversation
    const assets = await this.contextStore.getAssetContext(
      params.conversationId
    );
    
    // 2. Organize assets by type and recency
    const organizedAssets = {
      all: assets,
      images: assets.filter(a => a.type === 'image'),
      logos: assets.filter(a => a.tags.includes('logo')),
      recent: assets.slice(-5),
      required: assets.filter(a => a.immutable)
    };
    
    // 3. Build enhanced context
    return {
      ...baseContext,
      assets: organizedAssets,
      assetUrls: assets.map(a => a.url), // Quick access list
      constraints: {
        mustUseAssetUrls: true,
        forbidPlaceholders: true,
        assetValidation: 'strict'
      }
    };
  }
}
```

#### 2.2 Prompt Template Updates
```typescript
// Update all generation prompts to include asset context
const ASSET_AWARE_PROMPT_SECTION = `
## MANDATORY ASSET USAGE

You MUST use these exact URLs for any images/videos in your generated code:
{{#each assetUrls}}
- {{this}}
{{/each}}

CRITICAL RULES:
1. NEVER use placeholder.com or any other placeholder service
2. NEVER fabricate or modify these URLs
3. If you need an image, you MUST use one of the provided URLs
4. If no suitable asset exists, state this clearly instead of using placeholders

VALIDATION:
Your code will be rejected if it contains any image/video URLs not in the list above.
`;

// Apply to each prompt
export const updatePromptWithAssets = (
  basePrompt: string,
  context: EnhancedContext
): string => {
  return basePrompt + '\n\n' + Handlebars.compile(ASSET_AWARE_PROMPT_SECTION)({
    assetUrls: context.assetUrls
  });
};
```

### Phase 3: Style Research Agent

#### 3.1 Style Agent Implementation
```typescript
interface StyleAgent {
  research(query: string): Promise<StyleContext>;
}

export class CachedStyleAgent implements StyleAgent {
  private cache = new Map<string, StyleContext>();
  
  // Predefined style mappings
  private styleDatabase: Record<string, Partial<StyleContext>> = {
    'apple': {
      name: 'Apple Minimalism',
      colorPalette: ['#000000', '#FFFFFF', '#F5F5F7', '#1D1D1F'],
      typography: {
        primary: 'SF Pro Display',
        secondary: 'SF Pro Text',
        weights: [300, 400, 600]
      },
      layoutPrinciples: [
        'Generous whitespace',
        'Center-aligned text',
        'Large, bold headlines',
        'Subtle animations',
        'Focus on product'
      ],
      animationStyle: {
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        duration: 'slow',
        type: 'fade-and-scale'
      }
    },
    'cyberpunk': {
      name: 'Cyberpunk Aesthetic',
      colorPalette: ['#FF006E', '#8338EC', '#3A86FF', '#06FFB4', '#000000'],
      typography: {
        primary: 'Orbitron',
        secondary: 'Rajdhani',
        weights: [400, 700, 900]
      },
      layoutPrinciples: [
        'Neon glows',
        'Glitch effects',
        'Angular layouts',
        'High contrast',
        'Tech-inspired UI'
      ],
      animationStyle: {
        easing: 'linear',
        duration: 'fast',
        type: 'glitch-and-flicker'
      }
    }
  };
  
  async research(query: string): Promise<StyleContext> {
    // 1. Check cache
    const cached = this.cache.get(query.toLowerCase());
    if (cached) return cached;
    
    // 2. Match against known styles
    const matchedStyle = this.findBestMatch(query);
    if (matchedStyle) {
      this.cache.set(query.toLowerCase(), matchedStyle);
      return matchedStyle;
    }
    
    // 3. Fallback to generic style
    return this.generateGenericStyle(query);
  }
  
  private findBestMatch(query: string): StyleContext | null {
    const normalized = query.toLowerCase();
    
    for (const [key, style] of Object.entries(this.styleDatabase)) {
      if (normalized.includes(key)) {
        return this.completeStyleContext(style);
      }
    }
    
    return null;
  }
}
```

#### 3.2 Context Integration
```typescript
// Update brain orchestrator to use style agent
export class StyleAwareBrainOrchestrator extends BrainOrchestrator {
  private styleAgent = new CachedStyleAgent();
  
  async process(input: ProcessInput): Promise<ProcessOutput> {
    // 1. Extract style hints from prompt
    const styleQuery = this.extractStyleQuery(input.prompt);
    
    // 2. Research style if found
    let styleContext: StyleContext | undefined;
    if (styleQuery) {
      styleContext = await this.styleAgent.research(styleQuery);
    }
    
    // 3. Build enhanced context
    const context = await this.contextBuilder.buildContext({
      ...input,
      styleContext
    });
    
    // 4. Process with style-aware context
    return super.process({
      ...input,
      context
    });
  }
  
  private extractStyleQuery(prompt: string): string | null {
    const stylePatterns = [
      /style of (an? )?(.+?)(?:\.|,|$)/i,
      /like (an? )?(.+?) (?:ad|video|animation)/i,
      /(.+?) style/i,
      /(.+?) aesthetic/i
    ];
    
    for (const pattern of stylePatterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[2] || match[1];
      }
    }
    
    return null;
  }
}
```

### Phase 4: Validation & Guard Rails

#### 4.1 Output Validation
```typescript
export class AssetURLValidator {
  validate(
    generatedCode: string, 
    requiredAssets: Asset[]
  ): ValidationResult {
    const errors: string[] = [];
    
    // 1. Check for placeholder URLs
    const placeholderPatterns = [
      /placeholder\.com/gi,
      /lorempixel\.com/gi,
      /placehold\.it/gi,
      /dummyimage\.com/gi,
      /via\.placeholder\.com/gi
    ];
    
    for (const pattern of placeholderPatterns) {
      if (pattern.test(generatedCode)) {
        errors.push('Generated code contains placeholder URLs');
      }
    }
    
    // 2. Verify required assets are used
    for (const asset of requiredAssets) {
      if (!generatedCode.includes(asset.url)) {
        errors.push(`Missing required asset: ${asset.url}`);
      }
    }
    
    // 3. Check for fabricated URLs
    const imgSrcPattern = /<Img[^>]+src=["']([^"']+)["']/g;
    let match;
    
    while ((match = imgSrcPattern.exec(generatedCode)) !== null) {
      const url = match[1];
      const isValidAsset = requiredAssets.some(a => a.url === url);
      const isDataUrl = url.startsWith('data:');
      
      if (!isValidAsset && !isDataUrl) {
        errors.push(`Unknown image URL detected: ${url}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Integration in generation router
export const validateGeneratedCode = async (
  code: string,
  context: EnhancedContext
): Promise<void> => {
  const validator = new AssetURLValidator();
  const result = validator.validate(code, context.assets.all);
  
  if (!result.valid) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Generated code validation failed',
      cause: result.errors
    });
  }
};
```

### Phase 5: Database Migrations

```sql
-- Create asset_context table
CREATE TABLE asset_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(255) NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assets JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_asset_context_conversation ON asset_context(conversation_id);
CREATE INDEX idx_asset_context_project ON asset_context(project_id);

-- Add style_cache table
CREATE TABLE style_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query VARCHAR(255) NOT NULL UNIQUE,
  style_context JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_style_cache_query ON style_cache(query);
CREATE INDEX idx_style_cache_expires ON style_cache(expires_at);
```

## Testing Strategy

### Unit Tests
```typescript
describe('AssetContext', () => {
  it('should persist assets across conversation', async () => {
    const store = new PersistentContextStore();
    const asset = createMockAsset();
    
    await store.appendAsset('conv-123', asset);
    const retrieved = await store.getAssetContext('conv-123');
    
    expect(retrieved).toContainEqual(asset);
  });
});

describe('AssetURLValidator', () => {
  it('should reject placeholder URLs', () => {
    const validator = new AssetURLValidator();
    const code = '<Img src="https://placeholder.com/test.jpg" />';
    
    const result = validator.validate(code, []);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Generated code contains placeholder URLs');
  });
});
```

## Rollout Plan

1. **Week 1**: Implement asset context persistence
2. **Week 2**: Update brain and prompts
3. **Week 3**: Add style agent and validation
4. **Week 4**: Testing and refinement

## Success Metrics

- Asset URL retention: >98% after 5 messages
- Hallucination rate: <2%
- Style consistency score: >4.3/5
- Zero placeholder URLs in production

---

**Document Status:** Ready for Review  
**Next Steps:** Architecture review meeting