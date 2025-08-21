# Technical Architecture: Figma Integration

## System Overview

The Figma integration extends our existing component discovery system to support design files as a source for video animation. It follows the same architectural patterns as our GitHub integration but adapts them for Figma's design-centric data model.

## Core Components

### 1. Figma Discovery Service
`src/server/services/figma/figma-discovery.service.ts`

```typescript
interface FigmaDiscoveryService {
  // Authentication
  authenticate(token: string): Promise<FigmaUser>
  
  // Discovery
  listTeams(): Promise<FigmaTeam[]>
  listProjects(teamId: string): Promise<FigmaProject[]>
  listFiles(projectId: string): Promise<FigmaFile[]>
  
  // Indexing
  indexFile(fileKey: string): Promise<FigmaComponentCatalog>
  getFileStructure(fileKey: string, depth?: number): Promise<FigmaNode>
  
  // Export
  exportNode(fileKey: string, nodeId: string, format: 'svg' | 'png'): Promise<Buffer>
  getNodeDetails(fileKey: string, nodeIds: string[]): Promise<FigmaNode[]>
}
```

### 2. Figma-to-Remotion Converter
`src/server/services/figma/figma-remotion-converter.ts`

```typescript
interface FigmaRemotionConverter {
  // Main conversion
  convertToRemotionCode(node: FigmaNode, options: ConversionOptions): string
  
  // Style extraction
  extractStyles(node: FigmaNode): RemotionStyles
  extractAnimationHints(node: FigmaNode): AnimationConfig
  
  // Asset handling
  processVectorData(node: VectorNode): SVGElement
  processImageFills(fills: Paint[]): ImageAsset[]
  
  // Component mapping
  mapFigmaComponentToRemotion(component: ComponentNode): RemotionComponent
}
```

### 3. Figma Router (tRPC)
`src/server/api/routers/figma.router.ts`

```typescript
export const figmaRouter = createTRPCRouter({
  // Connection
  connect: protectedProcedure
    .input(z.object({ accessToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Store encrypted token
      // Validate connection
      // Return user info
    }),
  
  // Discovery
  listFiles: protectedProcedure
    .input(z.object({ teamId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      // Fetch user's accessible files
      // Group by team/project
      // Return hierarchical structure
    }),
  
  // Indexing
  indexFile: protectedProcedure
    .input(z.object({ fileKey: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Index components and frames
      // Categorize by UI patterns
      // Generate thumbnails
      // Cache results
    }),
  
  // Import
  importDesign: protectedProcedure
    .input(z.object({
      fileKey: z.string(),
      nodeId: z.string(),
      projectId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Export design from Figma
      // Convert to Remotion code
      // Store in project
      // Return scene data
    }),
});
```

## Data Models

### Figma Component Catalog
```typescript
interface FigmaComponentCatalog {
  fileKey: string
  fileName: string
  lastIndexed: Date
  categories: {
    core: FigmaComponentItem[]
    auth: FigmaComponentItem[]
    commerce: FigmaComponentItem[]
    interactive: FigmaComponentItem[]
    content: FigmaComponentItem[]
    custom: FigmaComponentItem[]
  }
}

interface FigmaComponentItem {
  id: string
  nodeId: string
  name: string
  type: 'COMPONENT' | 'FRAME' | 'GROUP'
  category: CategoryKey
  score: number
  thumbnailUrl?: string
  pageName?: string
  componentKey?: string // For component instances
  variantProperties?: Record<string, string>
  metadata: {
    width: number
    height: number
    childCount: number
    hasText: boolean
    hasImages: boolean
    complexity: 'simple' | 'moderate' | 'complex'
  }
}
```

### Database Schema Extensions
```sql
-- Figma connections table
CREATE TABLE figma_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  figma_user_id VARCHAR(255) NOT NULL,
  figma_user_email VARCHAR(255),
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Figma file cache
CREATE TABLE figma_file_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key VARCHAR(255) NOT NULL UNIQUE,
  file_name VARCHAR(255),
  team_id VARCHAR(255),
  project_id VARCHAR(255),
  indexed_at TIMESTAMP,
  component_catalog JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Figma imports
CREATE TABLE figma_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  scene_id UUID REFERENCES scenes(id),
  file_key VARCHAR(255) NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  node_name VARCHAR(255),
  export_format VARCHAR(10),
  remotion_code TEXT,
  assets JSONB, -- URLs to exported images/SVGs
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Integration Details

### Figma REST API Endpoints

#### 1. File Discovery
```typescript
// GET /v1/files/:file_key
// Returns entire file structure (can be huge)
// Strategy: Use depth=1 for shallow fetch, then target specific nodes

// GET /v1/files/:file_key?ids=node1,node2
// Returns specific nodes only (efficient for large files)

// GET /v1/files/:file_key/nodes
// Returns nodes matching specific criteria
```

#### 2. Image Export
```typescript
// GET /v1/images/:file_key
// Body: { ids: string[], format: 'png' | 'svg', scale: number }
// Returns: { images: { [nodeId]: url } }
// URLs are temporary (expire after ~30 mins)
```

#### 3. Teams & Projects
```typescript
// GET /v1/me
// Returns user info and accessible teams

// GET /v1/teams/:team_id/projects
// Lists all projects in a team

// GET /v1/projects/:project_id/files
// Lists all files in a project
```

### Authentication Flow

```typescript
class FigmaAuthService {
  async authenticate(method: 'oauth' | 'pat') {
    if (method === 'oauth') {
      // 1. Redirect to Figma OAuth
      // 2. Handle callback
      // 3. Exchange code for tokens
      // 4. Store encrypted tokens
    } else {
      // 1. Validate PAT
      // 2. Store encrypted
    }
  }
  
  async refreshToken(userId: string) {
    // Use refresh token to get new access token
    // Update database
  }
}
```

## Component Categorization

### Detection Patterns (Reuse from GitHub)
```typescript
const FIGMA_PATTERNS = {
  auth: [
    /login|sign[-_ ]?in/i,
    /sign[-_ ]?up|register/i,
    /forgot|reset|password/i,
  ],
  core: [
    /header|nav|menu|appbar/i,
    /sidebar|drawer|panel/i,
    /footer|bottom/i,
  ],
  commerce: [
    /price|pricing|plan|subscription/i,
    /checkout|payment|cart/i,
    /product|item|card/i,
  ],
  // ... etc
};
```

### Scoring Algorithm
```typescript
function scoreFigmaComponent(node: FigmaNode): number {
  let score = 0;
  
  // Name matching
  if (matchesHighValuePattern(node.name)) score += 50;
  
  // Component vs Frame
  if (node.type === 'COMPONENT') score += 30;
  if (node.type === 'FRAME' && isPageLike(node)) score += 20;
  
  // Complexity (more complex = more valuable)
  score += Math.min(node.children?.length || 0, 20);
  
  // Has variants (component set)
  if (node.componentPropertyDefinitions) score += 15;
  
  // Used as instance multiple times
  if (node.componentKey) {
    score += countInstances(node.componentKey) * 5;
  }
  
  return score;
}
```

## Caching Strategy

### Multi-Level Cache
```typescript
class FigmaCacheService {
  // L1: Memory cache (5 mins)
  private memoryCache = new Map<string, any>();
  
  // L2: Database cache (24 hours)
  async getCachedFile(fileKey: string) {
    // Check memory first
    // Then check database
    // Finally fetch from API
  }
  
  // L3: R2 storage for images
  async cacheImage(nodeId: string, imageBuffer: Buffer) {
    // Store in R2 with 7-day expiry
    // Return CDN URL
  }
}
```

## Motion Hint System

### Plugin Data Structure
```typescript
interface MotionHints {
  enter?: {
    animation: 'slide' | 'fade' | 'scale' | 'rotate'
    direction?: 'up' | 'down' | 'left' | 'right'
    duration?: number
    delay?: number
    easing?: string
  }
  exit?: MotionHintConfig
  hover?: MotionHintConfig
  stagger?: {
    delay: number
    order: 'top-to-bottom' | 'left-to-right' | 'random'
  }
}

// Stored in Figma node's pluginData
node.setPluginData('bazaar-motion', JSON.stringify(hints));
```

## Error Handling

### Rate Limiting
```typescript
class FigmaRateLimiter {
  // Figma allows 1 request per second per file
  async throttleRequest(fileKey: string) {
    const lastRequest = this.getLastRequest(fileKey);
    const timeSince = Date.now() - lastRequest;
    if (timeSince < 1000) {
      await sleep(1000 - timeSince);
    }
    this.setLastRequest(fileKey);
  }
}
```

### Fallback Strategies
1. **Large Files**: Use shallow fetch + targeted node requests
2. **Export Failures**: Retry with lower resolution
3. **Complex Designs**: Simplify or rasterize
4. **Missing Fonts**: Map to web-safe alternatives

## Security Considerations

### Token Storage
- Encrypt all tokens using `AUTH_SECRET`
- Store in separate table with user association
- Implement token refresh before expiry
- Clear tokens on disconnect

### API Key Management
```typescript
// Environment variables
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_OAUTH_CALLBACK_URL=

// Runtime validation
if (!process.env.FIGMA_CLIENT_ID) {
  throw new Error('Figma integration not configured');
}
```

## Performance Optimizations

### Batch Operations
```typescript
// Instead of multiple single requests
const nodes = await Promise.all(
  nodeIds.map(id => fetchNode(fileKey, id))
);

// Use batch endpoint
const nodes = await fetchNodes(fileKey, nodeIds); // Single request
```

### Progressive Loading
1. Show file list immediately
2. Index in background
3. Generate thumbnails on-demand
4. Cache aggressively

### WebSocket Updates (Future)
```typescript
// Figma Webhooks for real-time sync
interface FigmaWebhook {
  event: 'FILE_UPDATE' | 'LIBRARY_PUBLISH'
  fileKey: string
  timestamp: number
}
```

## Integration Points

### With Brain Orchestrator
```typescript
// New tool type
interface FigmaImportTool {
  type: 'figma-import'
  fileKey: string
  nodeId: string
  hints?: MotionHints
}

// Orchestrator handles Figma imports
if (tool.type === 'figma-import') {
  const design = await figmaService.exportNode(tool.fileKey, tool.nodeId);
  const code = await converter.convertToRemotionCode(design);
  return { sceneCode: code };
}
```

### With Chat System
```typescript
// Handle Figma drops in chat
const handleFigmaDrop = (data: FigmaDropData) => {
  const prompt = `Animate the ${data.nodeName} design from Figma`;
  // Include metadata for context
  const context = {
    source: 'figma',
    fileKey: data.fileKey,
    nodeId: data.nodeId,
  };
  submitMessage(prompt, context);
};
```

## Testing Strategy

### Unit Tests
- Service methods (auth, fetch, convert)
- Categorization logic
- Scoring algorithm
- Cache behavior

### Integration Tests
- Full flow: Connect → Browse → Import → Animate
- Error scenarios (rate limits, large files)
- Token refresh
- Webhook handling

### E2E Tests
- User connects Figma account
- Browses and selects design
- Drags to chat
- Sees animated result

---

This architecture provides a solid foundation for Figma integration while maintaining consistency with existing patterns and allowing for future enhancements.