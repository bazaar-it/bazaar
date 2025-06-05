# Sprint 38: Safe Image Persistence Migration

## 🚨 CRITICAL CONTEXT

**Previous Data Loss Incident**: Sprint 32 experienced complete production data loss due to destructive migration `0024_yummy_chamber.sql` that converted user ID columns from varchar to uuid, destroying all existing NextAuth.js user data.

**Current Status**: Database was recovered and migration system is working, but extreme caution is required for any new migrations.

## 🎯 Current Issue

**Problem**: Uploaded images in chat messages disappear after page refresh
- Images work perfectly during upload and display correctly in UI
- When page refreshes, `syncDbMessages()` loads from database which lacks image data
- Images are stored in local VideoState but not persisted to database

**Root Cause**: Database `messages` table is missing `imageUrls` field

## 🔍 Migration Status Analysis

### Current State Verification

1. **Schema Files Show**:
   ```typescript
   // src/server/db/schema.ts line 141
   imageUrls: d.jsonb("image_urls").$type<string[]>(), // Support for uploaded images
   ```

2. **Migration Files Present**:
   - `0025_add_image_urls_to_messages.sql` exists
   - Contains mixed changes (varchar conversions + image_urls addition + column drop)

3. **Drizzle Check Result**: `Everything's fine 🐶🔥`
   - Suggests no pending migrations
   - Either migration was already applied OR schema mismatch

### 🚨 DANGER SIGNALS

The migration `0025_add_image_urls_to_messages.sql` contains:
```sql
-- SAFE: Adding image support
ALTER TABLE "bazaar-vid_message" ADD COLUMN "image_urls" jsonb;

-- DANGEROUS: Mixed with other changes  
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_animation_design_brief" DROP COLUMN "designBrief"; -- 🚨 DATA LOSS!
```

**Problems**:
1. **Mixed migrations**: Combines image feature with other changes
2. **Column drop**: Could cause data loss
3. **Misleading name**: Should only add image URLs but does much more

## 🛡️ SAFE MIGRATION STRATEGY

### Phase 1: Database State Verification ✅

```bash
# Check if image_urls column already exists
npx drizzle-kit introspect  # Shows current database state
psql $DATABASE_URL -c "\d \"bazaar-vid_message\"" # Direct table inspection
```

### Phase 2: Conditional Migration

**If image_urls column missing**:
```sql
-- Create SAFE, isolated migration
-- File: 0026_safe_add_image_urls.sql
ALTER TABLE "bazaar-vid_message" ADD COLUMN IF NOT EXISTS "image_urls" jsonb;
```

**If image_urls column exists**:
- No migration needed
- Update tRPC endpoints to save/load imageUrls

### Phase 3: tRPC Integration

Update chat endpoints to persist images:
```typescript
// src/server/api/routers/chat.ts
addMessage: procedure
  .input(z.object({
    content: z.string(),
    projectId: z.string(),
    imageUrls: z.array(z.string()).optional(), // NEW
  }))
  .mutation(async ({ input, ctx }) => {
    await ctx.db.insert(messages).values({
      content: input.content,
      projectId: input.projectId,
      imageUrls: input.imageUrls || [], // NEW
      // ...
    });
  });
```

### Phase 4: Testing & Verification

1. **Upload image in chat** → Should display immediately
2. **Refresh page** → Image should persist in chat history
3. **Check database** → `image_urls` column should contain data

## 🚀 IMPLEMENTATION PLAN

### Step 1: Direct Database Inspection
```bash
# Check exact current state
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bazaar-vid_message' AND column_name = 'image_urls';"
```

### Step 2: Safe Column Addition (if needed)
```sql
-- Only if column doesn't exist
ALTER TABLE "bazaar-vid_message" ADD COLUMN IF NOT EXISTS "image_urls" jsonb;
```

### Step 3: Code Updates
- Update tRPC chat endpoints to save imageUrls
- Update `syncDbMessages()` to load imageUrls
- Test end-to-end image persistence

## 🎯 SUCCESS CRITERIA

- ✅ No data loss during migration
- ✅ Images persist across page refreshes
- ✅ Chat history maintains visual context
- ✅ No regression in existing functionality

## 🚨 ROLLBACK PLAN

If any issues occur:
```sql
-- Remove column if needed
ALTER TABLE "bazaar-vid_message" DROP COLUMN IF EXISTS "image_urls";
```

## 📋 LESSONS FROM SPRINT 32

1. **Never mix migrations**: One change per migration file
2. **Always backup before destructive changes**: Not applicable here (additive only)
3. **Test in development first**: Use separate test database
4. **Verify expected vs actual state**: Check what's really in the database

---

**Status**: Ready for implementation with maximum safety
**Priority**: High - User experience issue
**Risk Level**: Low - Additive change only 