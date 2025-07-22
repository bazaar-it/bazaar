# Sprint 81: Context Engineering Implementation Guide

**Purpose:** Step-by-step guide for implementing deterministic asset handling and context-aware generation

## Quick Start Checklist

- [ ] Update upload route to create persistent asset records
- [ ] Implement context store with database backing
- [ ] Enhance brain context builder with asset retrieval
- [ ] Update all generation prompts with asset enforcement
- [ ] Add validation layer to reject placeholder URLs
- [ ] Implement style research agent with caching
- [ ] Test end-to-end asset persistence

## Implementation Steps

### Step 1: Database Setup

```bash
# Create migration file
npm run db:generate

# Add to migration:
-- asset_context table for persistent storage
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

# Run migration
npm run db:push
```

### Step 2: Update Upload Route

**File:** `/src/app/api/upload/route.ts`

```typescript
// Add asset persistence after successful upload
const asset: Asset = {
  id: crypto.randomUUID(),
  url: publicUrl,
  type: file.type.startsWith('image/') ? 'image' : 'video',
  dimensions: await getImageDimensions(file),
  fileSize: file.size,
  hash: await calculateFileHash(file),
  tags: await generateAssetTags(file),
  immutable: false,
  usageCount: 0
};

// Save to context store
await contextStore.appendAsset(conversationId, asset);

// Save to project memory for long-term reference
await db.insert(projectMemory).values({
  projectId,
  type: 'uploaded_asset',
  content: asset,
  metadata: { conversationId }
});
```

### Step 3: Create Context Store Service

**File:** `/src/server/services/context/assetContextStore.ts`

```typescript
import { db } from '@/server/db';
import { assetContext } from '@/server/db/schema';
import type { Asset } from '@/lib/types/context';

export class AssetContextStore {
  async appendAsset(conversationId: string, asset: Asset): Promise<void> {
    const existing = await this.getAssetContext(conversationId);
    const updated = [...existing, asset];
    
    await db.insert(assetContext)
      .values({
        conversationId,
        assets: updated
      })
      .onConflictDoUpdate({
        target: assetContext.conversationId,
        set: {
          assets: updated,
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

export const contextStore = new AssetContextStore();
```

### Step 4: Enhance Brain Context Builder

**File:** `/src/server/services/ai/brain/contextBuilder.ts`

```typescript
// Add to existing ContextBuilder class
import { contextStore } from '@/server/services/context/assetContextStore';

async buildContext(params: ContextParams): Promise<Context> {
  // Existing context building...
  
  // Add asset context
  const assets = await contextStore.getAssetContext(params.conversationId);
  
  return {
    ...existingContext,
    assets: {
      all: assets,
      urls: assets.map(a => a.url),
      recent: assets.slice(-5)
    },
    constraints: {
      mustUseProvidedAssets: true,
      forbidPlaceholders: true
    }
  };
}
```

### Step 5: Update Generation Prompts

**Files to Update:**
- `/src/config/prompts/active/code-generator.ts`
- `/src/config/prompts/active/code-editor.ts`
- `/src/config/prompts/active/image-recreator.ts`

**Add to each prompt:**
```typescript
const ASSET_ENFORCEMENT = `
{{#if assets.urls.length}}
MANDATORY: You MUST use these exact image/video URLs:
{{#each assets.urls}}
- {{this}}
{{/each}}

FORBIDDEN: Never use placeholder.com, lorempixel, or any fabricated URLs.
If you need an image, pick from the list above.
{{/if}}
`;

// In prompt template
export const CODE_GENERATOR_PROMPT = `
${existingPrompt}

${ASSET_ENFORCEMENT}
`;
```

### Step 6: Add Validation Layer

**File:** `/src/server/services/generation/validation.ts`

```typescript
export class GenerationValidator {
  private placeholderPatterns = [
    /placeholder\.com/gi,
    /lorempixel\.com/gi,
    /placehold\.it/gi,
    /dummyimage\.com/gi
  ];
  
  validateAssetUsage(code: string, context: Context): ValidationResult {
    const errors: string[] = [];
    
    // Check for placeholders
    for (const pattern of this.placeholderPatterns) {
      if (pattern.test(code)) {
        errors.push('Placeholder URLs detected');
      }
    }
    
    // Verify required assets
    if (context.assets?.urls.length > 0) {
      const codeIncludesAsset = context.assets.urls.some(
        url => code.includes(url)
      );
      
      if (!codeIncludesAsset && code.includes('<Img')) {
        errors.push('Generated code uses images but not provided assets');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

**Integration in generation router:**
```typescript
// In generateScene mutation
const result = await orchestrator.process(input);

// Validate before returning
const validator = new GenerationValidator();
const validation = validator.validateAssetUsage(result.code, context);

if (!validation.valid) {
  // Retry with stronger prompt
  const retryResult = await orchestrator.process({
    ...input,
    prompt: `${input.prompt}\n\nCRITICAL: Use ONLY these URLs: ${context.assets.urls.join(', ')}`
  });
  
  return retryResult;
}
```

### Step 7: Implement Style Agent

**File:** `/src/server/services/ai/styleAgent.ts`

```typescript
interface StyleDatabase {
  [key: string]: StyleDefinition;
}

const STYLE_DB: StyleDatabase = {
  apple: {
    colors: ['#000', '#FFF', '#F5F5F7'],
    fonts: ['SF Pro Display', '-apple-system'],
    principles: ['minimal', 'centered', 'bold-headlines'],
    animations: 'subtle-fade'
  },
  cyberpunk: {
    colors: ['#FF006E', '#8338EC', '#06FFB4'],
    fonts: ['Orbitron', 'monospace'],
    principles: ['neon', 'glitch', 'tech'],
    animations: 'glitch-effects'
  }
};

export class StyleAgent {
  async research(query: string): Promise<StyleContext> {
    const normalized = query.toLowerCase();
    
    // Check known styles
    for (const [key, style] of Object.entries(STYLE_DB)) {
      if (normalized.includes(key)) {
        return this.expandStyle(key, style);
      }
    }
    
    // Default style
    return this.getDefaultStyle();
  }
}
```

### Step 8: Testing

**File:** `/src/tests/context-engineering.test.ts`

```typescript
describe('Context Engineering', () => {
  it('should persist assets across messages', async () => {
    // Upload image
    const uploadResponse = await uploadImage(testImage);
    const assetUrl = uploadResponse.url;
    
    // Generate scene 5 messages later
    const scene = await generateScene({
      prompt: 'Create intro with the uploaded logo',
      messageIndex: 5
    });
    
    // Verify asset URL is used
    expect(scene.code).toContain(assetUrl);
    expect(scene.code).not.toContain('placeholder');
  });
  
  it('should apply style context', async () => {
    const scene = await generateScene({
      prompt: 'Create an Apple-style product reveal'
    });
    
    // Verify Apple style elements
    expect(scene.code).toMatch(/SF Pro|system-ui/);
    expect(scene.code).toMatch(/#000|#FFF/);
  });
});
```

## Common Issues & Solutions

### Issue: Assets not persisting
**Solution:** Check conversation_id is consistent across requests

### Issue: Placeholders still appearing
**Solution:** Verify prompt templates are updated and context is passed correctly

### Issue: Style not applying
**Solution:** Ensure style agent is called in brain orchestrator

## Monitoring & Metrics

```typescript
// Add logging to track success
logger.info('Asset context', {
  conversationId,
  assetCount: assets.length,
  hasStyle: !!styleContext
});

// Track metrics
metrics.increment('asset.usage', {
  used: codeIncludesAsset,
  available: assets.length
});
```

## Rollback Plan

If issues arise:
1. Remove validation temporarily
2. Revert prompt changes
3. Keep asset storage (non-breaking)
4. Monitor and fix incrementally

---

**Status:** Ready for Implementation  
**Estimated Time:** 3-4 days  
**Dependencies:** Database migration must run first