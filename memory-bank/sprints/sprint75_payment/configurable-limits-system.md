# Configurable Limits System

## Overview
Build a flexible limits system on top of existing tracking infrastructure. This allows experimenting with different pricing models without code changes.

## Current Tracking Infrastructure ✅
- **sceneIterations table**: Tracks every LLM operation (prompts, edits, deletes)
- **exports table**: Tracks video exports (needs Lambda fix)
- **projects table**: Tracks project creation
- **Google Analytics**: User journey events

## 1. Database Schema for Limits

### Usage Limits Config Table
```sql
-- Configurable limits that can be changed without code deployment
CREATE TABLE "bazaar-vid_usage_limits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "limit_key" VARCHAR(100) NOT NULL UNIQUE,
  "free_tier_limit" INTEGER NOT NULL DEFAULT 0,
  "pro_tier_limit" INTEGER NOT NULL DEFAULT 0,
  "enterprise_tier_limit" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "unit" VARCHAR(50) NOT NULL DEFAULT 'count', -- 'count', 'credits', 'minutes'
  "reset_period" VARCHAR(20) NOT NULL DEFAULT 'daily', -- 'daily', 'monthly', 'never'
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default limits configuration
INSERT INTO "bazaar-vid_usage_limits" VALUES
('daily_prompts', 50, 500, 2000, 'AI prompts per day', 'count', 'daily'),
('daily_projects', 2, 20, 100, 'New projects per day', 'count', 'daily'),
('prompts_per_project', 15, 100, 500, 'Prompts per project', 'count', 'never'),
('daily_exports', 3, 50, 200, 'Video exports per day', 'count', 'daily'),
('daily_credits', 150, 1000, 5000, 'Credits per day', 'credits', 'daily'),
('credits_per_prompt', 10, 10, 10, 'Credits per prompt', 'credits', 'never'),
('credits_per_export', 60, 60, 60, 'Credits per export', 'credits', 'never');
```

### User Usage Aggregation Table
```sql
-- Daily aggregated usage per user
CREATE TABLE "bazaar-vid_user_usage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "usage_type" VARCHAR(50) NOT NULL, -- 'prompts', 'projects', 'exports', 'credits'
  "count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date, usage_type)
);

CREATE INDEX "user_usage_user_date_idx" ON "bazaar-vid_user_usage"("user_id", "date");
CREATE INDEX "user_usage_type_idx" ON "bazaar-vid_user_usage"("usage_type");
```

## 2. Usage Aggregation Service

### Service Implementation
```typescript
// src/server/services/usage/usage-aggregation.service.ts
import { db } from "~/server/db";
import { sceneIterations, exports, projects, userUsage } from "~/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export class UsageAggregationService {
  /**
   * Get user's daily usage for a specific type
   */
  static async getUserDailyUsage(userId: string, usageType: string, date?: Date): Promise<number> {
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];
    
    const result = await db.select()
      .from(userUsage)
      .where(and(
        eq(userUsage.userId, userId),
        eq(userUsage.date, dateString),
        eq(userUsage.usageType, usageType)
      ))
      .limit(1);
    
    return result[0]?.count || 0;
  }

  /**
   * Increment user's daily usage
   */
  static async incrementUsage(userId: string, usageType: string, amount: number = 1, metadata?: any) {
    const today = new Date().toISOString().split('T')[0];
    
    await db.insert(userUsage)
      .values({
        userId,
        date: today,
        usageType,
        count: amount,
        metadata
      })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.date, userUsage.usageType],
        set: {
          count: sql`${userUsage.count} + ${amount}`,
          metadata: metadata || sql`${userUsage.metadata}`,
          updatedAt: new Date()
        }
      });
  }

  /**
   * Get real-time usage from tracking tables
   */
  static async getRealTimeUsage(userId: string, usageType: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (usageType) {
      case 'prompts':
        const promptResult = await db.select({ count: sql<number>`count(*)` })
          .from(sceneIterations)
          .where(and(
            eq(sceneIterations.projectId, userId), // Fix: need to join with projects
            gte(sceneIterations.createdAt, today)
          ));
        return promptResult[0]?.count || 0;
        
      case 'exports':
        const exportResult = await db.select({ count: sql<number>`count(*)` })
          .from(exports)
          .where(and(
            eq(exports.userId, userId),
            gte(exports.createdAt, today)
          ));
        return exportResult[0]?.count || 0;
        
      case 'projects':
        const projectResult = await db.select({ count: sql<number>`count(*)` })
          .from(projects)
          .where(and(
            eq(projects.userId, userId),
            gte(projects.createdAt, today)
          ));
        return projectResult[0]?.count || 0;
        
      default:
        return 0;
    }
  }

  /**
   * Sync aggregated usage with real-time data
   */
  static async syncUserUsage(userId: string) {
    const usageTypes = ['prompts', 'exports', 'projects'];
    
    for (const type of usageTypes) {
      const realTimeCount = await this.getRealTimeUsage(userId, type);
      const today = new Date().toISOString().split('T')[0];
      
      await db.insert(userUsage)
        .values({
          userId,
          date: today,
          usageType: type,
          count: realTimeCount
        })
        .onConflictDoUpdate({
          target: [userUsage.userId, userUsage.date, userUsage.usageType],
          set: {
            count: realTimeCount,
            updatedAt: new Date()
          }
        });
    }
  }
}
```

## 3. Limits Enforcement Middleware

### tRPC Middleware
```typescript
// src/server/api/middleware/usage-limits.middleware.ts
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { usageLimits } from "~/server/db/schema";
import { UsageAggregationService } from "~/server/services/usage/usage-aggregation.service";
import { eq, and } from "drizzle-orm";

export interface UsageLimitCheck {
  limitKey: string;
  increment?: number;
  skipCheck?: boolean;
}

export const createUsageLimitMiddleware = (config: UsageLimitCheck) => {
  return async (opts: any) => {
    const { ctx, next } = opts;
    
    if (!ctx.session?.user?.id || config.skipCheck) {
      return next();
    }
    
    // Get limit configuration
    const limitConfig = await db.select()
      .from(usageLimits)
      .where(and(
        eq(usageLimits.limitKey, config.limitKey),
        eq(usageLimits.isActive, true)
      ))
      .limit(1);
      
    if (!limitConfig[0]) {
      // No limit configured, allow
      return next();
    }
    
    const limit = limitConfig[0];
    const userTier = ctx.session.user.tier || 'free'; // Default to free tier
    
    // Get appropriate limit for user's tier
    const userLimit = userTier === 'pro' ? limit.proTierLimit : 
                     userTier === 'enterprise' ? limit.enterpriseTierLimit : 
                     limit.freeTierLimit;
    
    // Check current usage
    const currentUsage = await UsageAggregationService.getUserDailyUsage(
      ctx.session.user.id,
      config.limitKey
    );
    
    // Check if user would exceed limit
    const wouldExceed = currentUsage + (config.increment || 1) > userLimit;
    
    if (wouldExceed) {
      // Different error messages based on limit type
      let message = `Daily limit reached for ${config.limitKey}`;
      
      if (config.limitKey === 'daily_prompts') {
        message = `Daily prompt limit reached (${userLimit}). Upgrade to Pro for ${limit.proTierLimit} prompts per day.`;
      } else if (config.limitKey === 'daily_exports') {
        message = `Daily export limit reached (${userLimit}). Upgrade to Pro for ${limit.proTierLimit} exports per day.`;
      } else if (config.limitKey === 'daily_projects') {
        message = `Daily project limit reached (${userLimit}). Upgrade to Pro for ${limit.proTierLimit} projects per day.`;
      }
      
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message,
        cause: {
          limitKey: config.limitKey,
          currentUsage,
          userLimit,
          userTier,
          upgradeAvailable: userTier === 'free'
        }
      });
    }
    
    // Run the actual procedure
    const result = await next();
    
    // Increment usage after successful completion
    if (config.increment && config.increment > 0) {
      await UsageAggregationService.incrementUsage(
        ctx.session.user.id,
        config.limitKey,
        config.increment
      );
    }
    
    return result;
  };
};
```

## 4. Usage in tRPC Procedures

### Example Integration
```typescript
// src/server/api/routers/generation.ts
import { createUsageLimitMiddleware } from "~/server/api/middleware/usage-limits.middleware";

export const generationRouter = createTRPCRouter({
  generateScene: protectedProcedure
    .use(createUsageLimitMiddleware({ limitKey: 'daily_prompts', increment: 1 }))
    .input(generateSceneSchema)
    .mutation(async ({ ctx, input }) => {
      // Existing generation logic
      // Usage is automatically tracked by middleware
    }),
    
  exportVideo: protectedProcedure
    .use(createUsageLimitMiddleware({ limitKey: 'daily_exports', increment: 1 }))
    .input(exportVideoSchema)
    .mutation(async ({ ctx, input }) => {
      // Existing export logic
      // Usage is automatically tracked by middleware
    }),
});
```

## 5. React Hooks for Usage Display

### Usage Hook
```typescript
// src/hooks/use-usage-limits.ts
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

export function useUsageLimits() {
  const { data: session } = useSession();
  
  const { data: usageData, isLoading } = api.usage.getUserUsage.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  
  const { data: limitsConfig } = api.usage.getLimitsConfig.useQuery();
  
  return {
    usage: usageData,
    limits: limitsConfig,
    isLoading,
    
    // Helper functions
    getUsagePercentage: (limitKey: string) => {
      if (!usageData || !limitsConfig) return 0;
      
      const usage = usageData[limitKey] || 0;
      const limit = limitsConfig[limitKey]?.freeTierLimit || 0;
      
      return Math.min((usage / limit) * 100, 100);
    },
    
    isNearLimit: (limitKey: string, threshold = 80) => {
      return getUsagePercentage(limitKey) >= threshold;
    },
    
    isOverLimit: (limitKey: string) => {
      return getUsagePercentage(limitKey) >= 100;
    }
  };
}
```

## 6. UI Components

### Usage Display Component
```typescript
// src/components/usage/UsageDisplay.tsx
import { useUsageLimits } from "~/hooks/use-usage-limits";
import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function UsageDisplay() {
  const { usage, limits, getUsagePercentage, isNearLimit } = useUsageLimits();
  
  if (!usage || !limits) return null;
  
  const usageItems = [
    { key: 'daily_prompts', label: 'Daily Prompts', icon: '💬' },
    { key: 'daily_projects', label: 'Daily Projects', icon: '📁' },
    { key: 'daily_exports', label: 'Daily Exports', icon: '🎬' },
  ];
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Usage Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {usageItems.map(item => {
          const percentage = getUsagePercentage(item.key);
          const current = usage[item.key] || 0;
          const limit = limits[item.key]?.freeTierLimit || 0;
          const isNear = isNearLimit(item.key);
          
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1">
                  {item.icon} {item.label}
                </span>
                <span className={`font-mono ${isNear ? 'text-orange-600' : 'text-gray-600'}`}>
                  {current}/{limit}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                indicatorClassName={isNear ? 'bg-orange-500' : 'bg-blue-500'}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

## 7. Admin Dashboard for Limits

### Admin Interface
```typescript
// src/app/admin/limits/page.tsx
import { api } from "~/trpc/server";
import { LimitsConfigForm } from "~/components/admin/LimitsConfigForm";

export default async function AdminLimitsPage() {
  const limitsConfig = await api.admin.getLimitsConfig.query();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Usage Limits Configuration</h1>
      
      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Current Limits</h2>
          <LimitsConfigForm initialData={limitsConfig} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Usage Analytics</h2>
          <UsageAnalytics />
        </div>
      </div>
    </div>
  );
}
```

## 8. Implementation Steps

### Phase 1: Database Setup (Day 1)
- [ ] Create usage_limits table with default values
- [ ] Create user_usage aggregation table
- [ ] Run migrations

### Phase 2: Core Services (Day 2-3)
- [ ] Implement UsageAggregationService
- [ ] Create usage limits middleware
- [ ] Add tRPC procedures for usage queries

### Phase 3: UI Integration (Day 4-5)
- [ ] Create usage display components
- [ ] Add usage hooks
- [ ] Integrate into sidebar/header

### Phase 4: Admin Dashboard (Day 6)
- [ ] Create admin interface for limits
- [ ] Add usage analytics
- [ ] Test limit changes

### Phase 5: Testing & Polish (Day 7-8)
- [ ] Test all limit scenarios
- [ ] Add proper error handling
- [ ] Performance optimization

## 9. Benefits

1. **Flexibility**: Change limits without code deployment
2. **Experimentation**: A/B test different pricing models
3. **Scalability**: Built on existing tracking infrastructure
4. **User Experience**: Clear usage visibility and guidance
5. **Business Intelligence**: Rich usage analytics for decisions

## 10. Example Usage Scenarios

### Free Tier Daily Limits
```sql
-- Conservative starter limits
UPDATE usage_limits SET free_tier_limit = 2 WHERE limit_key = 'daily_projects';
UPDATE usage_limits SET free_tier_limit = 15 WHERE limit_key = 'prompts_per_project';
UPDATE usage_limits SET free_tier_limit = 3 WHERE limit_key = 'daily_exports';
```

### Credit-Based System
```sql
-- Switch to credit-based model
UPDATE usage_limits SET free_tier_limit = 150 WHERE limit_key = 'daily_credits';
UPDATE usage_limits SET free_tier_limit = 10 WHERE limit_key = 'credits_per_prompt';
UPDATE usage_limits SET free_tier_limit = 60 WHERE limit_key = 'credits_per_export';
```

### Generous Launch Limits
```sql
-- Higher limits for launch period
UPDATE usage_limits SET free_tier_limit = 5 WHERE limit_key = 'daily_projects';
UPDATE usage_limits SET free_tier_limit = 50 WHERE limit_key = 'prompts_per_project';
UPDATE usage_limits SET free_tier_limit = 10 WHERE limit_key = 'daily_exports';
```

This system lets you adjust pricing strategy based on real usage data and user feedback!