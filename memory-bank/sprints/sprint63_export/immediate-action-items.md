# Immediate Action Items for Export Feature

## Day 1: Essential Infrastructure

### 1. Install Required Dependencies

```bash
# Queue system for render jobs
npm install bullmq ioredis

# Development dependencies
npm install -D @types/node
```

### 2. Set Up Redis (for BullMQ)

```bash
# Option A: Docker (recommended for dev)
docker run -d --name redis-render -p 6379:6379 redis:alpine

# Option B: Use existing Redis or cloud service
# Update REDIS_HOST and REDIS_PORT in .env
```

### 3. Update Environment Variables

```env
# Add to .env.local

# Node.js Memory (for development)
NODE_OPTIONS="--max-old-space-size=4096"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Export Settings
MAX_CONCURRENT_RENDERS=1
USER_DAILY_EXPORT_LIMIT=10
MAX_RENDER_DURATION_MINUTES=30

# Future Lambda Settings (prepare now)
RENDER_MODE=ssr
AWS_REGION=us-east-1
REMOTION_FUNCTION_NAME=bazaar-vid-render
REMOTION_BUCKET_NAME=bazaar-vid-renders
WEBHOOK_SECRET=your-webhook-secret-here
```

### 4. Create Folder Structure

```bash
mkdir -p src/server/services/render
mkdir -p src/server/services/queue
mkdir -p src/components/export
mkdir -p src/app/api/render-progress
```

## Day 1 Implementation Checklist

- [ ] Install dependencies (bullmq, ioredis)
- [ ] Set up Redis locally
- [ ] Update .env.local with new variables
- [ ] Create folder structure
- [ ] Copy database schema and run migration
- [ ] Implement render queue service
- [ ] Test basic queue functionality

## Quick Validation Script

```typescript
// src/scripts/test-render-setup.ts
import { renderQueue } from "../server/services/queue/render-queue";

async function testSetup() {
  console.log("Testing render setup...");
  
  // Test Redis connection
  try {
    await renderQueue.add("test", { message: "Hello render queue!" });
    console.log("✅ Redis connection working");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    process.exit(1);
  }
  
  // Test memory allocation
  const memoryUsage = process.memoryUsage();
  console.log(`✅ Node.js heap limit: ${memoryUsage.heapTotal / 1024 / 1024} MB`);
  
  // Test Remotion import
  try {
    const { getCompositions } = await import("@remotion/renderer");
    console.log("✅ Remotion renderer available");
  } catch (error) {
    console.error("❌ Remotion import failed:", error);
  }
  
  process.exit(0);
}

testSetup();
```

Run with: `npx tsx src/scripts/test-render-setup.ts`

## Critical Path to First Export

1. **Database Migration** (30 min)
   - Add videoRenders table
   - Run migration

2. **Basic Render Service** (2 hours)
   - Copy render.service.ts from plan
   - Temporarily skip R2 upload (return local path)
   - Test with simple composition

3. **Queue Integration** (1 hour)
   - Copy queue setup
   - Wire up to render service
   - Test job processing

4. **Simple Export Button** (1 hour)
   - Basic button that triggers export
   - Console.log the result
   - No fancy UI yet

5. **First Successful Export** (30 min)
   - Click button
   - Watch logs
   - Find MP4 in /tmp/
   - 🎉 Celebrate!

## Common Gotchas to Avoid

1. **Remotion Entry Point**
   - Ensure `src/remotion/index.ts` exists and exports compositions
   - If missing, create minimal version:
   ```typescript
   import { registerRoot } from "remotion";
   import { MainComposition } from "./MainComposition";
   registerRoot(MainComposition);
   ```

2. **Bundle Permissions**
   - Remotion needs write access to temp directories
   - On some systems: `chmod 777 /tmp` (dev only!)

3. **Memory Issues**
   - If OOM on first render, increase to 8GB:
   - `NODE_OPTIONS="--max-old-space-size=8192"`

4. **Queue Connection**
   - BullMQ requires Redis 5.0+
   - Check version: `redis-cli INFO server | grep redis_version`

## Success Metrics for Day 1

- [ ] Redis queue accepting jobs
- [ ] Database migration completed  
- [ ] One successful local render (any quality)
- [ ] Export button visible in UI
- [ ] No crashes from memory issues

## Next Steps After Day 1

Once basic export works:
1. Add R2 upload
2. Implement progress tracking
3. Polish UI with loading states
4. Add error handling
5. Test with real project data

Remember: **Perfect is the enemy of shipped!** Get a basic export working first, then iterate.