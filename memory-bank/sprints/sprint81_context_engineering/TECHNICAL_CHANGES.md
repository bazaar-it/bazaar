# Sprint 81: Technical Changes - Detailed Documentation

**Date:** July 22, 2025  
**Sprint:** Context Engineering

## Files Created

### 1. `/src/lib/types/asset-context.ts`
```typescript
export interface Asset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo';
  dimensions?: { width: number; height: number };
  fileSize: number;
  originalName: string;
  hash?: string;
  tags?: string[];
  uploadedAt: Date;
  usageCount: number;
}

export interface AssetContext {
  projectId: string;
  assets: Asset[];
  logos: Asset[];
  recent: Asset[];
}
```

### 2. `/src/server/services/context/assetContextService.ts`
- Service for managing asset persistence in projectMemory
- Key methods:
  - `saveAsset()` - Stores asset metadata
  - `getProjectAssets()` - Retrieves all assets for a project
  - `isLikelyLogo()` - Detects logo assets

## Files Modified

### 1. `/src/app/api/upload/route.ts`
**Changes:** Added asset persistence after successful upload
```typescript
// New imports
import { assetContext, AssetContextService } from '~/server/services/context/assetContextService';
import type { Asset } from '~/lib/types/asset-context';
import crypto from 'crypto';

// After S3 upload success (line 99+)
try {
  const asset: Asset = {
    id: crypto.randomUUID(),
    url: publicUrl,
    type: assetType,
    fileSize: file.size,
    originalName: file.name,
    hash: fileHash,
    tags: assetType === 'logo' ? ['logo', 'brand'] : [],
    uploadedAt: new Date(),
    usageCount: 0
  };
  
  await assetContext.saveAsset(projectId, asset, {
    isLogo: assetType === 'logo',
    uploadedBy: session.user.id
  });
} catch (contextError) {
  console.error('[Upload] Failed to save asset context:', contextError);
}
```

### 2. `/src/brain/orchestrator_functions/contextBuilder.ts`
**Changes:** Added asset context retrieval
```typescript
// New imports
import { assetContext } from "~/server/services/context/assetContextService";
import type { AssetContext } from "~/lib/types/asset-context";

// In buildContext method (line 41+)
const projectAssets = await assetContext.getProjectAssets(input.projectId);

// In return statement (line 72+)
assetContext: projectAssets.assets.length > 0 ? {
  allAssets: projectAssets.assets.map(a => ({
    url: a.url,
    type: a.type,
    originalName: a.originalName
  })),
  logos: projectAssets.logos.map(l => l.url),
  assetUrls: projectAssets.assets.map(a => a.url)
} : undefined
```

### 3. `/src/lib/types/ai/brain.types.ts`
**Changes:** Added asset context to interfaces
```typescript
// In ContextPacket interface (line 176+)
assetContext?: {
  allAssets: Array<{
    url: string;
    type: string;
    originalName: string;
  }>;
  logos: string[];
  assetUrls: string[];
};

// In BrainDecision.toolContext (line 50)
assetUrls?: string[]; // All persistent project assets
```

### 4. `/src/brain/orchestratorNEW.ts`
**Changes:** Pass asset URLs to tool context
```typescript
// In toolContext construction (line 97+)
// Include persistent asset URLs for context
assetUrls: contextPacket.assetContext?.assetUrls || []
```

### 5. `/src/config/prompts/active/brain-orchestrator.ts`
**Changes:** Added project assets awareness section
```typescript
// After IMAGE DECISION CRITERIA (line 43+)
PROJECT ASSETS AWARENESS:
When the context includes previously uploaded assets (logos, images, etc.), consider:
- If user says "the logo", "my logo", "that image from before" → They likely mean a project asset
- If user references something they uploaded earlier → Check assetContext for matches
- Pass relevant asset URLs to tools when the user's intent suggests using existing assets
- But also allow for new asset creation when that's what the user wants
```

### 6. `/src/brain/orchestrator_functions/intentAnalyzer.ts`
**Changes:** Added asset context to brain prompt
```typescript
// In buildUserPrompt method (line 133+)
// Add project assets context
let assetInfo = "";
if (contextPacket.assetContext && contextPacket.assetContext.assetUrls.length > 0) {
  assetInfo = `\n\nPROJECT ASSETS (Previously uploaded):
${contextPacket.assetContext.assetUrls.length} assets available in this project:`;
  
  contextPacket.assetContext.allAssets.slice(0, 5).forEach((asset, idx) => {
    assetInfo += `\n${idx + 1}. ${asset.originalName} (${asset.type})`;
  });
  
  if (contextPacket.assetContext.logos.length > 0) {
    assetInfo += `\n\nLOGOS: ${contextPacket.assetContext.logos.length} logo(s) detected in project`;
  }
  
  assetInfo += `\n\nWhen user references "the logo", "my image", "that file from before", they likely mean one of these project assets.`;
}
```

### 7. `/src/tools/helpers/types.ts`
**Changes:** Added assetUrls to BaseToolInput
```typescript
// In BaseToolInput interface (line 21)
assetUrls?: string[];  // All persistent project assets for context enforcement
```

### 8. `/src/server/api/routers/generation/helpers.ts`
**Changes:** Pass asset URLs to tools
```typescript
// In ADD tool case (line 76)
assetUrls: decision.toolContext.assetUrls, // Pass persistent asset URLs
```

### 9. `/src/tools/add/add.ts`
**Changes:** Forward asset URLs to code generator
```typescript
// In generateFromText method (line 165)
assetUrls: input.assetUrls, // Pass persistent asset URLs

// In generateFromImages method (line 214)
assetUrls: input.assetUrls, // Pass all project assets
```

### 10. `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`
**Changes:** Include asset context in prompts
```typescript
// In generateCodeDirect signature (line 282)
assetUrls?: string[];

// In prompt building (line 300+)
if (input.assetUrls && input.assetUrls.length > 0) {
  userPrompt += `\n\nPROJECT ASSETS AVAILABLE:`;
  input.assetUrls.forEach(url => {
    userPrompt += `\n- ${url}`;
  });
  userPrompt += `\n\nThese are previously uploaded assets in this project. Use them when appropriate based on the user's request.`;
  userPrompt += `\nFor example: If user asks for "the logo" or "that image from before", use one of these assets.`;
}

// In generateCodeFromImage signature (line 551)
async generateCodeFromImage(input: ImageToCodeInput & { assetUrls?: string[] })
```

## Architecture Decisions

### 1. Database Strategy
- **Decision:** Use existing `projectMemory` table
- **Rationale:** No migrations needed, follows existing patterns
- **Implementation:** Store as JSON in memoryValue field with type 'uploaded_asset'

### 2. Context Flow
- **Decision:** Pass assets through entire chain (Context → Brain → Tools)
- **Rationale:** Each layer can make intelligent decisions
- **Implementation:** Added to ContextPacket, BrainDecision, and BaseToolInput

### 3. AI Guidance
- **Decision:** Gentle suggestions, not hard requirements
- **Rationale:** Trust AI to understand context
- **Implementation:** "Use when appropriate" language in prompts

### 4. Asset Detection
- **Decision:** Simple heuristics for logo detection
- **Rationale:** Good enough for MVP, can enhance later
- **Implementation:** Check filename for "logo" keywords

## Testing Checklist

- [x] Upload image → Saved to projectMemory
- [x] Context builder retrieves assets
- [x] Brain sees asset context
- [x] Tools receive asset URLs
- [x] Generated code can reference assets
- [ ] Multi-turn conversation maintains asset context
- [ ] Logo detection works correctly
- [ ] Performance with many assets

## Rollback Plan

If issues arise:
1. Remove asset context from prompts
2. Comment out assetContext in context builder
3. Assets still persist in projectMemory (no data loss)
4. Can re-enable incrementally

---

**Total Changes:** ~400 lines across 10 files  
**Breaking Changes:** None  
**Migration Required:** No