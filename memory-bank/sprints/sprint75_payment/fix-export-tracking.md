# Fix Export Tracking Issue

## Current Issue

Export tracking is currently broken for most users because it only works when AWS Lambda is configured. This means we're missing critical usage data from the majority of our user base.

### Problem Location
In `/src/server/api/routers/render.ts` (lines 123-131), export tracking only occurs within the Lambda rendering block:

```typescript
// Current problematic code
if (process.env.RENDER_MODE === "lambda" && remotionLambda) {
  // ... Lambda rendering logic ...
  
  // Export tracking ONLY happens here!
  await ctx.db
    .update(projects)
    .set({ exportCount: sql`${projects.exportCount} + 1` })
    .where(eq(projects.id, input.projectId));
}
// No tracking for local rendering!
```

## Impact

- **Most users don't have Lambda configured** (requires AWS setup, costs money)
- **We're missing 90%+ of export data** 
- **Can't track usage patterns or enforce limits**
- **No visibility into actual platform usage**

## Quick Fix: Add Basic Tracking

### Solution 1: Track All Exports Immediately

Move the export tracking outside the Lambda conditional:

```typescript
// In render.ts, after line 91 (user validation)
// Track the export attempt immediately
await ctx.db
  .update(projects)
  .set({ 
    exportCount: sql`${projects.exportCount} + 1`,
    lastExportAt: new Date() 
  })
  .where(eq(projects.id, input.projectId));

// Then continue with rendering logic...
if (process.env.RENDER_MODE === "lambda" && remotionLambda) {
  // Lambda rendering
} else {
  // Local rendering
}
```

### Solution 2: Add User-Level Tracking

Also track exports at the user level for better analytics:

```typescript
// Add to schema if not exists
export const userExports = pgTable("user_exports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  projectId: varchar("project_id", { length: 36 }).notNull(),
  exportedAt: timestamp("exported_at").defaultNow().notNull(),
  renderMode: varchar("render_mode", { length: 20 }).notNull(), // 'lambda' or 'local'
  format: varchar("format", { length: 20 }), // 'mp4', 'webm', 'gif'
  duration: integer("duration"), // in seconds
  resolution: varchar("resolution", { length: 20 }), // '1920x1080', etc
});

// In render.ts, track export
await ctx.db.insert(userExports).values({
  userId: ctx.session.user.id,
  projectId: input.projectId,
  renderMode: process.env.RENDER_MODE === "lambda" ? "lambda" : "local",
  format: input.format || "mp4",
  // ... other metadata
});
```

## Implementation Steps

### 1. Immediate Fix (5 minutes)
```typescript
// render.ts - Move tracking outside Lambda check
renderVideo: protectedProcedure
  .input(renderVideoSchema)
  .mutation(async ({ input, ctx }) => {
    // ... existing user checks ...

    // ADD THIS: Track export immediately
    await ctx.db
      .update(projects)
      .set({ 
        exportCount: sql`${projects.exportCount} + 1`,
        lastExportAt: new Date()
      })
      .where(eq(projects.id, input.projectId));

    // Check export limits
    if (project.exportCount >= 10) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Export limit reached (10 per day)"
      });
    }

    // ... rest of rendering logic ...
  })
```

### 2. Add Proper Tracking Table (30 minutes)
```typescript
// 1. Add to schema.ts
export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  projectId: varchar("project_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'started', 'completed', 'failed'
  renderMode: varchar("render_mode", { length: 20 }).notNull(),
  format: varchar("format", { length: 20 }),
  duration: integer("duration"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

// 2. Track export start
const exportRecord = await ctx.db.insert(exports).values({
  userId: ctx.session.user.id,
  projectId: input.projectId,
  status: "started",
  renderMode: process.env.RENDER_MODE === "lambda" ? "lambda" : "local",
  format: input.format || "mp4",
}).returning();

// 3. Update on completion/failure
await ctx.db.update(exports)
  .set({ 
    status: "completed",
    completedAt: new Date(),
    fileSize: outputFile.size 
  })
  .where(eq(exports.id, exportRecord[0].id));
```

## Long-Term Solution: Comprehensive Usage Tracking

### 1. Multi-Level Tracking
- **User Level**: Total exports, last export date, subscription tier
- **Project Level**: Export count, formats used, total duration
- **System Level**: Daily/monthly aggregates, popular formats, peak times

### 2. Analytics Dashboard
```typescript
// New analytics router
export const analyticsRouter = createTRPCRouter({
  getUserStats: protectedProcedure
    .query(async ({ ctx }) => {
      const stats = await ctx.db.select({
        totalExports: count(),
        lastExport: max(exports.createdAt),
        favoriteFormat: sql`mode() WITHIN GROUP (ORDER BY format)`,
      })
      .from(exports)
      .where(eq(exports.userId, ctx.session.user.id));
      
      return stats[0];
    }),
    
  getSystemStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Admin only
      const dailyExports = await ctx.db.select({
        date: sql`DATE(created_at)`,
        count: count(),
        avgDuration: avg(exports.duration),
      })
      .from(exports)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(desc(sql`DATE(created_at)`))
      .limit(30);
      
      return dailyExports;
    }),
});
```

### 3. Usage Limits & Tiers
```typescript
// Define tiers
const USAGE_TIERS = {
  free: { dailyExports: 3, maxDuration: 30 },
  pro: { dailyExports: 50, maxDuration: 120 },
  unlimited: { dailyExports: -1, maxDuration: -1 },
};

// Check limits before export
const todayExports = await ctx.db.select({ count: count() })
  .from(exports)
  .where(and(
    eq(exports.userId, ctx.session.user.id),
    gte(exports.createdAt, startOfDay(new Date()))
  ));

const userTier = user.subscriptionTier || 'free';
const limits = USAGE_TIERS[userTier];

if (limits.dailyExports !== -1 && todayExports[0].count >= limits.dailyExports) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Daily export limit reached (${limits.dailyExports} for ${userTier} tier)`
  });
}
```

## Priority Actions

1. **Immediate (Today)**: 
   - Move export tracking outside Lambda conditional
   - Add basic user_id and timestamp tracking

2. **This Week**:
   - Create proper exports table with full schema
   - Add tracking for both start and completion
   - Include error tracking for failed exports

3. **Next Sprint**:
   - Build analytics dashboard
   - Implement tiered usage limits
   - Add export history to user profile

## Testing

```typescript
// Test export tracking without Lambda
describe('Export Tracking', () => {
  it('should track exports even without Lambda', async () => {
    // Disable Lambda
    process.env.RENDER_MODE = 'local';
    
    // Make export request
    const result = await trpc.render.renderVideo.mutate({
      projectId: 'test-project',
      format: 'mp4',
    });
    
    // Verify tracking occurred
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, 'test-project'));
      
    expect(project[0].exportCount).toBe(1);
  });
});
```

## Summary

The current export tracking implementation is fundamentally broken because it assumes all users have AWS Lambda configured. By moving the tracking logic outside the Lambda conditional and implementing a proper tracking system, we can:

1. **Immediately start collecting usage data** from all users
2. **Implement usage-based pricing tiers** 
3. **Understand actual platform usage patterns**
4. **Provide users with export history and analytics**

This is a critical fix that should be implemented immediately to start gathering the data needed for the payment system.