# Figma API Integration Guide

## API Overview

Figma provides a comprehensive REST API for accessing design files, with additional capabilities through plugins and webhooks.

## Authentication

### OAuth 2.0 Flow (Recommended for Production)

```typescript
// 1. Redirect user to Figma OAuth
const authUrl = new URL('https://www.figma.com/oauth');
authUrl.searchParams.append('client_id', FIGMA_CLIENT_ID);
authUrl.searchParams.append('redirect_uri', CALLBACK_URL);
authUrl.searchParams.append('scope', 'file_read');
authUrl.searchParams.append('state', generateState());
authUrl.searchParams.append('response_type', 'code');

// 2. Handle callback
app.get('/auth/figma/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 3. Exchange code for tokens
  const response = await fetch('https://www.figma.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FIGMA_CLIENT_ID,
      client_secret: FIGMA_CLIENT_SECRET,
      redirect_uri: CALLBACK_URL,
      code,
      grant_type: 'authorization_code',
    }),
  });
  
  const { access_token, refresh_token, expires_in } = await response.json();
  // Store encrypted tokens
});
```

### Personal Access Token (Quick Testing)

```typescript
// Simpler for development
const headers = {
  'X-Figma-Token': process.env.FIGMA_PAT
};

// Test the token
const response = await fetch('https://api.figma.com/v1/me', { headers });
const user = await response.json();
```

## Core API Endpoints

### 1. User & Teams

```typescript
// Get current user
GET https://api.figma.com/v1/me
Response: {
  id: string
  email: string
  handle: string
  img_url: string
}

// Get user's teams (only works with OAuth, not PAT)
GET https://api.figma.com/v1/teams
Response: {
  teams: [{
    id: string
    name: string
  }]
}
```

### 2. Projects & Files

```typescript
// List projects in a team
GET https://api.figma.com/v1/teams/{team_id}/projects
Response: {
  projects: [{
    id: string
    name: string
  }]
}

// List files in a project
GET https://api.figma.com/v1/projects/{project_id}/files
Response: {
  files: [{
    key: string
    name: string
    thumbnail_url: string
    last_modified: string
  }]
}
```

### 3. File Structure

```typescript
// Get file contents (can be HUGE - use carefully)
GET https://api.figma.com/v1/files/{file_key}
Query params:
  - depth: number (limit traversal depth, use 1 for shallow)
  - geometry: 'paths' | '' (include vector data)
  - plugin_data: string (comma-separated plugin IDs)

Response: {
  document: Node // Root node with children
  components: { [key]: Component } // Component definitions
  componentSets: { [key]: ComponentSet } // Variant groups
  styles: { [key]: Style } // Shared styles
}

// Get specific nodes only (more efficient)
GET https://api.figma.com/v1/files/{file_key}/nodes
Query params:
  - ids: string (comma-separated node IDs)
  
Response: {
  nodes: {
    [nodeId]: {
      document: Node
      components: {...}
      styles: {...}
    }
  }
}
```

### 4. Image Export

```typescript
// Export nodes as images
GET https://api.figma.com/v1/images/{file_key}
Query params:
  - ids: string (comma-separated node IDs)
  - scale: number (0.01 to 4)
  - format: 'jpg' | 'png' | 'svg' | 'pdf'
  - svg_include_id: boolean
  - svg_simplify_stroke: boolean
  - use_absolute_bounds: boolean

Response: {
  err: string | null
  images: {
    [nodeId]: string // Temporary URL (expires ~30 mins)
  }
}

// Example request
const response = await fetch(
  `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds.join(',')}&format=png&scale=2`,
  { headers }
);
```

## Node Structure

### Base Node Properties
```typescript
interface Node {
  id: string
  name: string
  type: NodeType
  visible: boolean
  locked: boolean
  children?: Node[]
  
  // Positioning
  absoluteBoundingBox?: Rectangle
  relativeTransform?: Transform
  size?: Vector
  
  // Styling
  fills?: Paint[]
  strokes?: Paint[]
  effects?: Effect[]
  opacity?: number
  blendMode?: BlendMode
  
  // Component-specific
  componentId?: string // Instance of component
  componentProperties?: Record<string, any> // Variant props
}
```

### Node Types
```typescript
type NodeType = 
  | 'DOCUMENT'
  | 'CANVAS' // Page
  | 'FRAME' // Frame or Artboard
  | 'GROUP'
  | 'COMPONENT' // Component master
  | 'COMPONENT_SET' // Variants
  | 'INSTANCE' // Component instance
  | 'TEXT'
  | 'VECTOR'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'BOOLEAN_OPERATION'
  // ... more types
```

### Important Node Types for Components

```typescript
// FRAME - Usually represents screens or major UI sections
interface FrameNode extends Node {
  type: 'FRAME'
  children: Node[]
  background: Paint[]
  clipsContent: boolean
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' // Auto-layout
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  itemSpacing?: number
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH'
}

// COMPONENT - Reusable component definition
interface ComponentNode extends Node {
  type: 'COMPONENT'
  children: Node[]
  componentPropertyDefinitions?: {
    [property: string]: ComponentPropertyDefinition
  }
}

// INSTANCE - Usage of a component
interface InstanceNode extends Node {
  type: 'INSTANCE'
  componentId: string
  componentProperties?: Record<string, any>
  children: Node[]
}

// TEXT - Text layers
interface TextNode extends Node {
  type: 'TEXT'
  characters: string
  style: TypeStyle
  characterStyleOverrides?: number[]
  styleOverrideTable?: Record<number, TypeStyle>
}
```

## Webhooks

### Setup
```typescript
// Register webhook
POST https://api.figma.com/v2/webhooks
Body: {
  event_type: 'FILE_UPDATE' | 'FILE_DELETE' | 'LIBRARY_PUBLISH'
  team_id: string
  endpoint: string // Your webhook URL
  passcode: string // For verification
  description?: string
}

// List webhooks
GET https://api.figma.com/v2/webhooks/{team_id}

// Delete webhook
DELETE https://api.figma.com/v2/webhooks/{webhook_id}
```

### Webhook Payload
```typescript
interface WebhookPayload {
  event_type: string
  passcode: string
  timestamp: string
  file_key?: string
  file_name?: string
  // Event-specific data
}

// Verify webhook
function verifyWebhook(payload: WebhookPayload, expectedPasscode: string) {
  return payload.passcode === expectedPasscode;
}
```

## Rate Limiting

### Limits
- **General**: No official rate limit documented, but be respectful
- **Files endpoint**: ~1 request per second per file recommended
- **Images endpoint**: Batch requests when possible
- **Best practice**: Implement exponential backoff

### Implementation
```typescript
class FigmaAPIClient {
  private requestQueue = new Map<string, number>();
  
  async throttledRequest(fileKey: string, url: string, options: RequestInit) {
    const lastRequest = this.requestQueue.get(fileKey) || 0;
    const timeSince = Date.now() - lastRequest;
    
    // Ensure 1 second between requests to same file
    if (timeSince < 1000) {
      await sleep(1000 - timeSince);
    }
    
    this.requestQueue.set(fileKey, Date.now());
    
    // Exponential backoff on errors
    let attempts = 0;
    while (attempts < 3) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) { // Rate limited
          await sleep(Math.pow(2, attempts) * 1000);
          attempts++;
          continue;
        }
        return response;
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        await sleep(Math.pow(2, attempts) * 1000);
      }
    }
  }
}
```

## Plugin Data (Optional Future Enhancement)

### Writing Plugin Data
```typescript
// In Figma plugin
figma.currentPage.selection[0].setPluginData('bazaar-motion', JSON.stringify({
  animation: 'slide-up',
  duration: 500,
  delay: 100,
  easing: 'ease-out'
}));

// Or shared plugin data (visible to all plugins)
figma.currentPage.selection[0].setSharedPluginData('bazaar', 'motion', JSON.stringify({...}));
```

### Reading Plugin Data
```typescript
// Via API
GET https://api.figma.com/v1/files/{file_key}?plugin_data=bazaar

// In response
node.pluginData = {
  bazaar: {
    motion: "{\"animation\":\"slide-up\",...}"
  }
}

// Parse and use
const motionData = JSON.parse(node.pluginData.bazaar.motion);
```

## Error Handling

### Common Errors
```typescript
// 400 - Bad Request (invalid parameters)
{
  err: "Invalid file key"
}

// 403 - Forbidden (no access to file)
{
  err: "Not allowed"
}

// 404 - Not Found
{
  err: "File not found"
}

// 429 - Rate Limited
{
  err: "Rate limited"
}

// 500 - Server Error
{
  err: "Internal server error"
}
```

### Error Handler
```typescript
async function handleFigmaError(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 403:
        throw new Error('No access to this Figma file. Check permissions.');
      case 404:
        throw new Error('Figma file not found.');
      case 429:
        throw new Error('Rate limited. Please try again later.');
      default:
        throw new Error(error.err || 'Figma API error');
    }
  }
  
  return response;
}
```

## Best Practices

### 1. Efficient Fetching
```typescript
// BAD - Fetches entire file
const file = await fetch(`/v1/files/${fileKey}`);

// GOOD - Fetch only what you need
const shallowFile = await fetch(`/v1/files/${fileKey}?depth=1`);
const specificNodes = await fetch(`/v1/files/${fileKey}/nodes?ids=${nodeIds}`);
```

### 2. Batch Operations
```typescript
// BAD - Multiple image export requests
for (const nodeId of nodeIds) {
  await exportImage(fileKey, nodeId);
}

// GOOD - Single batch request
const images = await exportImages(fileKey, nodeIds);
```

### 3. Caching Strategy
```typescript
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class FigmaCache {
  private cache = new Map<string, CacheEntry>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttl = 300000) { // 5 min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}
```

### 4. Respect Limits
```typescript
// Implement queuing for large operations
class BatchProcessor {
  async processInBatches<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<any>
  ) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await processor(batch);
      results.push(result);
      
      // Pause between batches
      if (i + batchSize < items.length) {
        await sleep(1000);
      }
    }
    
    return results.flat();
  }
}
```

## Testing Tools

### Figma API Playground
- https://www.figma.com/developers/api#api-playground
- Test endpoints with your PAT
- Explore response structures

### Sample Files
```typescript
// Create test files for development
const TEST_FILES = {
  components: 'FILE_KEY_WITH_COMPONENTS',
  frames: 'FILE_KEY_WITH_FRAMES',
  complex: 'FILE_KEY_WITH_COMPLEX_DESIGNS'
};
```

### Mock Responses
```typescript
// For unit testing
const mockFileResponse = {
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [...]
  },
  components: {},
  componentSets: {}
};
```

---

This guide provides comprehensive coverage of the Figma API integration requirements for the Bazaar-Vid Figma feature.