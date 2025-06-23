# SSE Performance Solutions

## The Problem
- **8-10 second delay** before "Generating code..." appears
- Caused by serverless cold starts and database initialization
- Poor user experience - feels unresponsive

## Solutions Implemented

### 1. ✅ **Optimistic UI (Implemented)**
Shows "Generating code..." immediately without waiting for SSE:
```typescript
// Add optimistic message immediately
const optimisticMessageId = `optimistic-${nanoid()}`;
addAssistantMessage(projectId, optimisticMessageId, "Generating code...");

// Then start SSE (which creates the real message)
generateSSE(trimmedMessage, imageUrls);
```

### 2. ✅ **Improved URL Detection**
Fixed regex to catch patterns like "my company is coinbase.com"

## Why Connection Pooling Isn't Working

The current setup uses `@neondatabase/serverless` HTTP driver:
- Each query is a separate HTTP request
- No persistent connections to reuse
- "Initializing database connection" happens on every cold start

## Recommended Solutions

### 1. **Switch to WebSocket Driver** (Best for this use case)
```typescript
// Install: npm install @neondatabase/serverless ws
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool);
```

### 2. **Use Vercel Edge Functions**
```typescript
// Add to route files
export const runtime = 'edge';
```
- 50-200ms cold starts vs 3-8 seconds
- But requires rewriting to use edge-compatible APIs

### 3. **Keep Functions Warm**
```json
// vercel.json
{
  "functions": {
    "api/generate-stream/route.ts": {
      "maxDuration": 30
    }
  },
  "crons": [{
    "path": "/api/warm",
    "schedule": "*/5 * * * *"
  }]
}
```

### 4. **Use Vercel KV for Message Creation**
Instead of Postgres for initial message creation:
```typescript
import { kv } from '@vercel/kv';

// Fast message creation
await kv.set(`message:${messageId}`, {
  content: "Generating code...",
  status: "pending"
});

// Sync to Postgres later
```

## Immediate Action Items

1. **Keep Optimistic UI** - Users see instant feedback
2. **Add WebSocket pooling** - Reuse connections within same request
3. **Monitor cold starts** - Add timing logs to identify bottlenecks
4. **Consider Edge Runtime** - For critical user-facing endpoints

The optimistic UI solves the perceived performance issue. The other solutions can be implemented based on actual usage patterns and requirements.