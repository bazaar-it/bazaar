# API Specification - Community Platform

## tRPC Router Structure

### community.router.ts

```typescript
// src/server/api/routers/community.ts

export const communityRouter = createTRPCRouter({
  // Template Management
  createTemplate: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      sceneIds: z.array(z.string().uuid()), // Which scenes to include
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.enum(['animation', 'marketing', 'social', 'educational', 'other']).optional(),
      supportedFormats: z.array(z.enum(['landscape','portrait','square'])).default(['landscape','portrait','square']),
      visibility: z.enum(['public', 'unlisted']).default('public'), // MVP: no 'private'
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify user owns the project
      // 2. Fetch scenes from database
      // 3. Create community_template entry
      // 4. Initialize metrics
      // 5. Generate thumbnail
      // 6. Return template ID
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      supportedFormats: z.array(z.enum(['landscape','portrait','square'])).optional(),
      visibility: z.enum(['public', 'unlisted']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Update template
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Soft delete or hard delete
    }),

  // Browsing & Discovery
  listTemplates: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(), // For pagination
      filter: z.object({
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        format: z.enum(['landscape', 'portrait', 'square']).optional(),
        search: z.string().optional(),
        creatorId: z.string().optional(),
      }).optional(),
      sort: z.enum(['recent', 'popular', 'trending', 'most-used']).default('recent'),
    }))
    .query(async ({ ctx, input }) => {
      // Build query with filters
      // Join with metrics for sorting
      // Return paginated results
    }),

  getTemplate: publicProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch template with creator info
      // Increment view count
      // Return full template data
    }),

  // User Interactions
  favoriteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Add to user_favorites
      // Update metrics
      // Track usage event
    }),

  unfavoriteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Remove from user_favorites
      // Update metrics
    }),

  getUserFavorites: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get user's favorited templates
      // Include template details
    }),

  // Using Templates
  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      projectId: z.string().uuid().optional(), // Target project or create new
      action: z.enum(['copy', 'remix']).default('copy'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch template scenes
      // Copy to user's project
      // Track usage via community_events and update cached counters
      // Return new scene IDs
    }),

  // Creator Dashboard
  getCreatorStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all templates by user
      // Aggregate metrics
      // Return dashboard data
    }),

  getTemplateAnalytics: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      timeRange: z.enum(['day', 'week', 'month', 'all']).default('week'),
    }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      // Aggregate from community_metrics_daily
      // Return time-series data
    }),

  // Search & Discovery
  searchTemplates: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Full-text search
      // Return ranked results
    }),

  getTrendingTemplates: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      timeWindow: z.enum(['hour', 'day', 'week']).default('day'),
    }))
    .query(async ({ ctx, input }) => {
      // Calculate trending score
      // Return top templates
    }),

  getSimilarTemplates: publicProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      limit: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ ctx, input }) => {
      // Find similar by tags/category
      // Return recommendations
    }),
});
```

## REST API Endpoints (for subdomain)

### Authentication
```
GET  /api/auth/session     - Get current session
POST /api/auth/callback    - OAuth callback handler
```

### Templates
```
GET  /api/templates                - List public templates
GET  /api/templates/:id            - Get template details
POST /api/templates/:id/use        - Use template (redirect/deep-link to main app)
POST /api/templates/:id/favorite   - Toggle favorite
GET  /api/templates/trending       - Get trending templates
GET  /api/templates/search         - Search templates
```

### User
```
GET  /api/user/favorites           - Get user's favorites
GET  /api/user/templates           - Get user's created templates
GET  /api/user/stats               - Get creator statistics
```

### Metrics
```
POST /api/metrics/track            - Track anonymous events
GET  /api/metrics/template/:id     - Get public metrics
```

## Data Transfer Objects (DTOs)

### Template Response
```typescript
interface TemplateDTO {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  scenes: Array<{
    id: string;
    duration: number;
    preview?: string; // Base64 preview frame
  }>;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean; // Future (creator profiles)
  };
  metrics: {
    views: number;
    uses: number;
    favorites: number;
  };
  tags: string[];
  category?: string;
  supportedFormats: Array<'landscape'|'portrait'|'square'>;
  duration: number; // Total frames
  createdAt: string;
  isFavorited?: boolean; // If user is logged in
}
```

### Usage Event
```typescript
// Events are persisted as community_events
type CommunityEventType = 'view' | 'favorite' | 'unfavorite' | 'use' | 'mix' | 'prompt' | 'click';
interface CommunityEventDTO {
  templateId: string;
  eventType: CommunityEventType;
  userId?: string; // optional for anonymous views
  sessionId?: string;
  referrer?: string;
  projectId?: string;
  source?: 'in_app_panel' | 'community_site' | 'direct';
  timestamp?: string;
}
```

## WebSocket Events (Optional, Phase 2)

```typescript
// Server -> Client
interface TemplateUpdate {
  type: 'template:updated' | 'template:deleted';
  templateId: string;
  data?: Partial<TemplateDTO>;
}

interface MetricsUpdate {
  type: 'metrics:updated';
  templateId: string;
  metrics: {
    views: number;
    uses: number;
    favorites: number;
  };
}

// Client -> Server
interface Subscribe {
  type: 'subscribe';
  templateIds: string[];
}
```

## Rate Limiting

```typescript
const rateLimits = {
  createTemplate: {
    window: '1h',
    max: 10,
  },
  useTemplate: {
    window: '1h',
    max: 50,
  },
  favorite: {
    window: '1m',
    max: 30,
  },
  search: {
    window: '1m',
    max: 60,
  },
};
```

## Error Codes

```typescript
enum CommunityErrorCode {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_SCENE_DATA = 'INVALID_SCENE_DATA',
  TEMPLATE_LIMIT_REACHED = 'TEMPLATE_LIMIT_REACHED',
  INVALID_PROJECT = 'INVALID_PROJECT',
  DUPLICATE_FAVORITE = 'DUPLICATE_FAVORITE',
}
```

## Caching Strategy (Optional, Phase 2)

### Redis Keys
```
template:{id}                    - Template data (TTL: 5 min)
template:{id}:metrics            - Metrics (TTL: 1 min)
trending:templates:{window}      - Trending list (TTL: 5 min)
user:{id}:favorites             - User favorites (TTL: 10 min)
search:{query_hash}             - Search results (TTL: 5 min)
```

### CDN Headers
```
/api/templates - Cache-Control: public, max-age=60
/api/templates/:id - Cache-Control: public, max-age=300
/api/templates/trending - Cache-Control: public, max-age=60
```

## Security Headers

```typescript
const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```
