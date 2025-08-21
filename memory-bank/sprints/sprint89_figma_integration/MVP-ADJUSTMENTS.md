# Figma Integration - MVP Adjustments & Green Light

## ✅ Green Light Confirmation
Same catalog contract as GitHub with minimal changes. REST-only MVP ships in 5 days.

## 🎯 Critical Adjustments for 5-Day Success

### 1. Fix Figma API Usage (No `depth` param!)
```typescript
// ❌ WRONG - Figma doesn't support depth
const file = await fetch(`/files/${fileKey}?depth=1`);

// ✅ CORRECT - Two-step approach
// Step A: Get file structure (pages only)
const file = await fetch(`/files/${fileKey}`);
const pageNodes = file.document.children; // Just read top level

// Step B: Selective fetch for candidates
const nodeIds = candidateNodes.map(n => n.id).join(',');
const details = await fetch(`/files/${fileKey}/nodes?ids=${nodeIds}`);

// Step C: Batch thumbnails
const thumbnails = await fetch(`/images/${fileKey}?ids=${nodeIds}&format=png`);
```

### 2. Unified Catalog Payload
```typescript
interface CatalogItem {
  name: string
  category: 'auth' | 'core' | 'commerce' | 'interactive' | 'content'
  score: number
  
  // Source-specific
  source: 'github' | 'figma'
  
  // GitHub fields
  path?: string
  repo?: string
  
  // Figma fields
  fileKey?: string
  nodeId?: string
  previewUrl?: string
  instances?: number // Fan-in signal
}
```

### 3. Thumbnail Persistence (They Expire!)
```typescript
class FigmaThumbnailService {
  async getStableThumbnail(nodeId: string, tempUrl: string) {
    // Check R2 cache first
    const cached = await r2.get(`figma-thumbs/${nodeId}.png`);
    if (cached) return cached.cdnUrl;
    
    // Fetch and store
    const image = await fetch(tempUrl);
    const buffer = await image.arrayBuffer();
    
    // Store in R2 with long TTL
    const cdnUrl = await r2.put(`figma-thumbs/${nodeId}.png`, buffer);
    return cdnUrl;
  }
}
```

### 4. Simplified Scoring
```typescript
function scoreFigmaComponent(node: FigmaNode): number {
  let score = 0;
  
  // Name patterns (same as GitHub)
  if (/login|signup|header|footer|checkout/i.test(node.name)) score += 40;
  
  // Component vs Frame
  if (node.type === 'COMPONENT') score += 20;
  
  // Instance count (fan-in)
  score += Math.min((node.instances || 0) * 2, 20);
  
  // Page name bonus
  if (node.pageName && /auth|pricing|commerce/i.test(node.pageName)) score += 10;
  
  return score;
}
```

### 5. Rate Limit Queue
```typescript
class FigmaRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      
      if (!this.processing) this.process();
    });
  }
  
  private async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await request();
      await sleep(500); // 2 req/sec max
    }
    
    this.processing = false;
  }
}
```

## 📅 Adjusted 5-Day Timeline

### Day 1: Foundation
- ✅ Auth service (PAT for dev, OAuth structure)
- ✅ Database tables
- ✅ Type definitions
- ✅ Router skeleton
- ❌ ~~UI (moved to Day 4)~~

### Day 2: File Discovery
- ✅ Teams → Projects → Files picker
- ✅ Selective node fetching (no depth param!)
- ✅ Request queue implementation
- ✅ 24-hour cache by fileKey + lastModified

### Day 3: Smart Indexing
- ✅ Pattern matching (reuse GitHub patterns)
- ✅ Instance counting for scoring
- ✅ Catalog generation with `source: "figma"`
- ✅ Thumbnail fetching + R2 persistence

### Day 4: Panel UI
- ✅ Add Figma tab to existing panel
- ✅ Component grid with categories
- ✅ Search and filter
- ✅ Loading/error states

### Day 5: Integration & Ship
- ✅ Drag payload with `{fileKey, nodeId}`
- ✅ Chat prefill "Animate [name] from Figma"
- ✅ Basic converter (frames, text, images)
- ✅ Full E2E test
- ✅ Deploy!

## 🚫 MVP Non-Goals (Avoid!)
- ❌ Auto-layout precision (basic flex only)
- ❌ Blend modes/filters (rasterize)
- ❌ Prototype animations (not exposed via REST)
- ❌ Full design tokens (colors + fonts only)
- ❌ Component variants (just list main component)

## ✅ MVP Acceptance Criteria
- [ ] Connect Figma in < 3 seconds
- [ ] Index 100-node file in < 5 seconds
- [ ] Show categorized components with stable thumbnails
- [ ] Drag creates correct chat payload
- [ ] Basic animation plays in Remotion
- [ ] Zero 429 errors under normal use

## 🎨 Conversion Guardrails (Day 5)

### What We Convert
```typescript
// SUPPORTED
- FRAME → <div> with absolute positioning
- GROUP → <div> container
- RECTANGLE → <div> with background
- TEXT → <span> with CSS styles
- IMAGE → <img> with src

// RASTERIZED (log warning)
- VECTOR → Export as PNG
- BOOLEAN_OPERATION → Export as PNG
- Complex effects → Export as PNG
```

### Text Mapping
```typescript
function mapTextStyles(textNode: FigmaTextNode) {
  return {
    fontFamily: textNode.style.fontFamily || 'Inter',
    fontSize: textNode.style.fontSize,
    fontWeight: textNode.style.fontWeight,
    lineHeight: `${textNode.style.lineHeightPx}px`,
    color: rgbToHex(textNode.fills[0]?.color),
    // Fallback for missing fonts
    fontFamilyFallback: 'system-ui, sans-serif'
  };
}
```

## 🚀 Quick Wins for Week 2
After MVP ships, enhance with:
1. Webhook refresh (debounced 60s)
2. Better auto-layout mapping
3. Component variants support
4. Gradient fills
5. Shadow effects

## 📝 Code Changes Summary

### 1. Update Types
```typescript
// src/lib/types/catalog.types.ts
export interface CatalogItem {
  source: 'github' | 'figma'
  // ... existing fields
  fileKey?: string
  nodeId?: string
  instances?: number
}
```

### 2. Figma Service
```typescript
// src/server/services/figma/figma-discovery.service.ts
class FigmaDiscoveryService {
  private queue = new FigmaRequestQueue();
  
  async indexFile(fileKey: string) {
    // Step 1: Get file (pages only)
    const file = await this.queue.add(() => 
      fetch(`/files/${fileKey}`)
    );
    
    // Step 2: Find candidates
    const candidates = this.findCandidates(file.document);
    
    // Step 3: Fetch details
    const nodeIds = candidates.map(c => c.id);
    const details = await this.queue.add(() =>
      fetch(`/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`)
    );
    
    // Step 4: Get thumbnails
    const thumbnails = await this.queue.add(() =>
      fetch(`/images/${fileKey}?ids=${nodeIds.join(',')}&format=png`)
    );
    
    // Step 5: Persist thumbnails to R2
    const stableThumbs = await this.persistThumbnails(thumbnails);
    
    // Step 6: Build catalog
    return this.buildCatalog(details, stableThumbs);
  }
}
```

### 3. Panel Integration
```typescript
// Just add source check in drag handler
onDragStart={(e) => {
  const payload = {
    type: 'component',
    source: 'figma', // or 'github'
    fileKey: component.fileKey,
    nodeId: component.nodeId,
    name: component.name
  };
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
}}
```

---

## ✅ Final Green Light

With these adjustments:
- **Risk**: LOW (reusing proven patterns)
- **Timeline**: 5 days achievable
- **Value**: HIGH (designer audience)
- **Complexity**: MEDIUM (manageable with adjustments)

Ship it! 🚀