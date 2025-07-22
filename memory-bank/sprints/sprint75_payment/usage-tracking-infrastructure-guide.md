# Usage Tracking & Limits Infrastructure Guide

**Sprint 75** - Building flexible usage tracking and configurable limits system

## Overview

This guide outlines a comprehensive infrastructure for tracking all user actions and enforcing flexible limits that can be adjusted without code changes. The system will track prompts, exports, projects, and any future billable actions.

## 1. Database Schema Design

### Core Usage Tables

```sql
-- Configuration table for all limit types
CREATE TABLE usage_limits_config (
  id SERIAL PRIMARY KEY,
  limit_type VARCHAR(50) NOT NULL UNIQUE, -- 'prompts_daily', 'exports_daily', 'projects_total', etc.
  free_tier_limit INTEGER NOT NULL DEFAULT 0,
  pro_tier_limit INTEGER NOT NULL DEFAULT -1, -- -1 means unlimited
  team_tier_limit INTEGER NOT NULL DEFAULT -1,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master usage tracking table
CREATE TABLE user_usage (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  usage_type VARCHAR(50) NOT NULL, -- 'prompt', 'export', 'project_create', etc.
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB, -- Store additional context (model used, export format, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, usage_type, usage_date)
);

-- Detailed action log for analytics
CREATE TABLE usage_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_subtype VARCHAR(50), -- 'gpt-4', 'mp4-export', etc.
  project_id UUID REFERENCES projects(id),
  scene_id UUID,
  tokens_used INTEGER,
  credits_used INTEGER,
  duration_ms INTEGER, -- How long the operation took
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'cancelled'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscription tiers
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) UNIQUE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'pro', 'team', 'enterprise'
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credits system for future flexibility
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_refill_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions log
CREATE TABLE credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL, -- positive for credits, negative for debits
  balance_after INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'daily_refill', 'usage', 'refund'
  description TEXT,
  reference_id VARCHAR(255), -- stripe payment id, usage event id, etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_usage_lookup ON user_usage(user_id, usage_type, usage_date);
CREATE INDEX idx_usage_events_user_date ON usage_events(user_id, created_at);
CREATE INDEX idx_usage_events_type ON usage_events(event_type, event_subtype);
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id, created_at);
```

### Default Limit Configuration

```sql
-- Insert default limits (easily adjustable)
INSERT INTO usage_limits_config (limit_type, free_tier_limit, pro_tier_limit, description) VALUES
  ('prompts_daily', 10, 100, 'AI generation prompts per day'),
  ('exports_daily', 3, 20, 'Video exports per day'),
  ('exports_monthly', 10, 200, 'Video exports per month'),
  ('projects_total', 5, -1, 'Total projects allowed'),
  ('storage_mb', 500, 10000, 'Storage limit in MB'),
  ('concurrent_renders', 1, 3, 'Simultaneous video renders'),
  ('api_calls_hourly', 60, 600, 'API calls per hour'),
  ('web_agent_daily', 5, 50, 'Web agent searches per day');
```

## 2. Drizzle ORM Schema

```typescript
// src/server/db/schema/usage.ts

import { pgTable, serial, varchar, integer, timestamp, date, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { projects } from "./projects";

export const usageLimitsConfig = pgTable("usage_limits_config", {
  id: serial("id").primaryKey(),
  limitType: varchar("limit_type", { length: 50 }).notNull().unique(),
  freeTierLimit: integer("free_tier_limit").notNull().default(0),
  proTierLimit: integer("pro_tier_limit").notNull().default(-1),
  teamTierLimit: integer("team_tier_limit").notNull().default(-1),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userUsage = pgTable("user_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  usageType: varchar("usage_type", { length: 50 }).notNull(),
  usageDate: date("usage_date").notNull().defaultNow(),
  count: integer("count").notNull().default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserTypeDate: unique().on(table.userId, table.usageType, table.usageDate),
  lookupIndex: index("idx_user_usage_lookup").on(table.userId, table.usageType, table.usageDate),
}));

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventSubtype: varchar("event_subtype", { length: 50 }),
  projectId: uuid("project_id").references(() => projects.id),
  sceneId: uuid("scene_id"),
  tokensUsed: integer("tokens_used"),
  creditsUsed: integer("credits_used"),
  durationMs: integer("duration_ms"),
  status: varchar("status", { length: 20 }).default("success"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIndex: index("idx_usage_events_user_date").on(table.userId, table.createdAt),
  typeIndex: index("idx_usage_events_type").on(table.eventType, table.eventSubtype),
}));

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id).unique(),
  tier: varchar("tier", { length: 20 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  lastRefillAt: timestamp("last_refill_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  description: text("description"),
  referenceId: varchar("reference_id", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIndex: index("idx_credit_transactions_user").on(table.userId, table.createdAt),
}));
```

## 3. Usage Tracking Service

```typescript
// src/server/services/usage/usage-tracker.ts

import { db } from "@/server/db";
import { userUsage, usageEvents, usageLimitsConfig, userSubscriptions } from "@/server/db/schema/usage";
import { eq, and, gte, sql } from "drizzle-orm";

export type UsageType = 'prompt' | 'export' | 'project_create' | 'web_agent' | 'api_call';
export type EventStatus = 'success' | 'failed' | 'cancelled';

interface TrackUsageParams {
  userId: string;
  usageType: UsageType;
  eventSubtype?: string;
  projectId?: string;
  sceneId?: string;
  tokensUsed?: number;
  creditsUsed?: number;
  durationMs?: number;
  status?: EventStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class UsageTracker {
  /**
   * Track a usage event and update daily counters
   */
  async trackUsage(params: TrackUsageParams): Promise<void> {
    const {
      userId,
      usageType,
      eventSubtype,
      projectId,
      sceneId,
      tokensUsed,
      creditsUsed,
      durationMs,
      status = 'success',
      errorMessage,
      metadata
    } = params;

    try {
      await db.transaction(async (tx) => {
        // 1. Log the detailed event
        await tx.insert(usageEvents).values({
          userId,
          eventType: usageType,
          eventSubtype,
          projectId,
          sceneId,
          tokensUsed,
          creditsUsed,
          durationMs,
          status,
          errorMessage,
          metadata,
        });

        // 2. Update daily usage counter (only for successful events)
        if (status === 'success') {
          const today = new Date().toISOString().split('T')[0];
          
          await tx.insert(userUsage)
            .values({
              userId,
              usageType,
              usageDate: today,
              count: 1,
              metadata: { lastEventSubtype: eventSubtype },
            })
            .onConflictDoUpdate({
              target: [userUsage.userId, userUsage.usageType, userUsage.usageDate],
              set: {
                count: sql`${userUsage.count} + 1`,
                metadata: sql`jsonb_set(COALESCE(${userUsage.metadata}, '{}'), '{lastEventSubtype}', '"${eventSubtype}"')`,
              },
            });
        }
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - we don't want usage tracking to break the main flow
    }
  }

  /**
   * Check if user has exceeded their limit
   */
  async checkLimit(userId: string, limitType: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    resetAt?: Date;
  }> {
    // Get user's subscription tier
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });
    
    const tier = subscription?.tier || 'free';
    
    // Get limit configuration
    const limitConfig = await db.query.usageLimitsConfig.findFirst({
      where: and(
        eq(usageLimitsConfig.limitType, limitType),
        eq(usageLimitsConfig.isActive, true)
      ),
    });
    
    if (!limitConfig) {
      // No limit configured - allow by default
      return { allowed: true, current: 0, limit: -1 };
    }
    
    // Get the limit for user's tier
    const limit = tier === 'pro' ? limitConfig.proTierLimit :
                  tier === 'team' ? limitConfig.teamTierLimit :
                  limitConfig.freeTierLimit;
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1 };
    }
    
    // Extract the period from limit type (daily, monthly, etc.)
    const period = limitType.includes('daily') ? 'daily' :
                   limitType.includes('monthly') ? 'monthly' :
                   limitType.includes('hourly') ? 'hourly' : 'total';
    
    // Calculate the date range based on period
    let startDate: Date;
    let resetAt: Date | undefined;
    
    const now = new Date();
    
    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        resetAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now.toISOString().split('T')[0]);
        resetAt = new Date(startDate);
        resetAt.setDate(resetAt.getDate() + 1);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(0); // Beginning of time for 'total' limits
    }
    
    // Get current usage count
    const usageTypeBase = limitType.replace(/_daily|_monthly|_hourly|_total/, '');
    
    const currentUsage = await db
      .select({ total: sql<number>`COALESCE(SUM(${userUsage.count}), 0)` })
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          eq(userUsage.usageType, usageTypeBase),
          gte(userUsage.usageDate, startDate.toISOString().split('T')[0])
        )
      );
    
    const current = Number(currentUsage[0]?.total || 0);
    
    return {
      allowed: current < limit,
      current,
      limit,
      resetAt,
    };
  }

  /**
   * Get usage statistics for a user
   */
  async getUserStats(userId: string, days: number = 30): Promise<{
    daily: Record<string, Record<string, number>>;
    totals: Record<string, number>;
    recentEvents: typeof usageEvents.$inferSelect[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get daily usage
    const dailyUsage = await db.query.userUsage.findMany({
      where: and(
        eq(userUsage.userId, userId),
        gte(userUsage.usageDate, startDate.toISOString().split('T')[0])
      ),
      orderBy: (usage, { desc }) => [desc(usage.usageDate)],
    });
    
    // Get recent events
    const recentEvents = await db.query.usageEvents.findMany({
      where: and(
        eq(usageEvents.userId, userId),
        gte(usageEvents.createdAt, startDate)
      ),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
      limit: 100,
    });
    
    // Organize daily usage by date and type
    const daily: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    
    for (const usage of dailyUsage) {
      const date = usage.usageDate;
      if (!daily[date]) daily[date] = {};
      daily[date][usage.usageType] = usage.count;
      
      if (!totals[usage.usageType]) totals[usage.usageType] = 0;
      totals[usage.usageType] += usage.count;
    }
    
    return { daily, totals, recentEvents };
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();
```

## 4. Usage Enforcement Middleware

```typescript
// src/server/services/usage/usage-limiter.ts

import { TRPCError } from "@trpc/server";
import { usageTracker } from "./usage-tracker";

interface CheckLimitOptions {
  userId: string;
  action: string;
  throwOnExceed?: boolean;
}

export class UsageLimiter {
  /**
   * Check if an action is allowed based on usage limits
   */
  async checkActionAllowed(options: CheckLimitOptions): Promise<boolean> {
    const { userId, action, throwOnExceed = true } = options;
    
    // Map actions to limit types
    const limitTypeMap: Record<string, string> = {
      'generate_scene': 'prompts_daily',
      'export_video': 'exports_daily',
      'create_project': 'projects_total',
      'web_search': 'web_agent_daily',
      'api_call': 'api_calls_hourly',
    };
    
    const limitType = limitTypeMap[action];
    if (!limitType) {
      // No limit defined for this action
      return true;
    }
    
    const limitCheck = await usageTracker.checkLimit(userId, limitType);
    
    if (!limitCheck.allowed && throwOnExceed) {
      const resetMessage = limitCheck.resetAt 
        ? ` Resets at ${limitCheck.resetAt.toLocaleString()}.`
        : '';
        
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `You've reached your ${limitType} limit (${limitCheck.current}/${limitCheck.limit}).${resetMessage}`,
        cause: {
          limitType,
          current: limitCheck.current,
          limit: limitCheck.limit,
          resetAt: limitCheck.resetAt,
        },
      });
    }
    
    return limitCheck.allowed;
  }
  
  /**
   * Middleware for tRPC procedures
   */
  async middleware(userId: string, action: string) {
    await this.checkActionAllowed({ userId, action });
  }
}

export const usageLimiter = new UsageLimiter();
```

## 5. Integration with Existing Code

### Fix Export Tracking

```typescript
// src/server/api/routers/export.ts

import { usageTracker } from "@/server/services/usage/usage-tracker";
import { usageLimiter } from "@/server/services/usage/usage-limiter";

export const exportRouter = createTRPCRouter({
  exportVideo: protectedProcedure
    .input(exportVideoSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Check export limit
      await usageLimiter.checkActionAllowed({
        userId,
        action: 'export_video',
      });
      
      const startTime = Date.now();
      
      try {
        // Your existing export logic
        const result = await renderVideo(input);
        
        // Track successful export
        await usageTracker.trackUsage({
          userId,
          usageType: 'export',
          eventSubtype: input.format || 'mp4',
          projectId: input.projectId,
          durationMs: Date.now() - startTime,
          metadata: {
            format: input.format,
            quality: input.quality,
            dimensions: `${input.width}x${input.height}`,
          },
        });
        
        return result;
      } catch (error) {
        // Track failed export
        await usageTracker.trackUsage({
          userId,
          usageType: 'export',
          eventSubtype: input.format || 'mp4',
          projectId: input.projectId,
          durationMs: Date.now() - startTime,
          status: 'failed',
          errorMessage: error.message,
        });
        
        throw error;
      }
    }),
});
```

### Track AI Generation

```typescript
// src/server/api/routers/generation.universal.ts

import { usageTracker } from "@/server/services/usage/usage-tracker";
import { usageLimiter } from "@/server/services/usage/usage-limiter";

generateScene: protectedProcedure
  .input(generateSceneSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    
    // Check prompt limit
    await usageLimiter.checkActionAllowed({
      userId,
      action: 'generate_scene',
    });
    
    const startTime = Date.now();
    let tokensUsed = 0;
    
    try {
      // Your existing generation logic
      const result = await orchestrator.process(input);
      
      // Extract token usage if available
      tokensUsed = result.tokensUsed || 0;
      
      // Track successful generation
      await usageTracker.trackUsage({
        userId,
        usageType: 'prompt',
        eventSubtype: input.model || 'gpt-4o-mini',
        projectId: input.projectId,
        sceneId: result.sceneId,
        tokensUsed,
        durationMs: Date.now() - startTime,
        metadata: {
          prompt: input.prompt.substring(0, 100), // First 100 chars
          hasImage: !!input.imageUrl,
          workflow: input.workflow,
        },
      });
      
      return result;
    } catch (error) {
      // Track failed generation
      await usageTracker.trackUsage({
        userId,
        usageType: 'prompt',
        eventSubtype: input.model || 'gpt-4o-mini',
        projectId: input.projectId,
        durationMs: Date.now() - startTime,
        status: 'failed',
        errorMessage: error.message,
      });
      
      throw error;
    }
  }),
```

## 6. React Hooks for Usage Display

```typescript
// src/hooks/use-usage-limits.ts

import { api } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";

export function useUsageLimits() {
  const { data: session } = useSession();
  
  const { data: limits, isLoading } = api.usage.getUserLimits.useQuery(
    undefined,
    {
      enabled: !!session?.user,
      refetchInterval: 60000, // Refresh every minute
    }
  );
  
  const { data: stats } = api.usage.getUserStats.useQuery(
    { days: 30 },
    {
      enabled: !!session?.user,
    }
  );
  
  return {
    limits: limits || {},
    stats: stats || {},
    isLoading,
    isFreeTier: limits?.tier === 'free',
    canExport: limits?.exports?.allowed ?? true,
    canGenerate: limits?.prompts?.allowed ?? true,
  };
}
```

### Usage Display Component

```tsx
// src/components/usage/usage-display.tsx

import { useUsageLimits } from "@/hooks/use-usage-limits";
import { Progress } from "@/components/ui/progress";

export function UsageDisplay() {
  const { limits, isLoading } = useUsageLimits();
  
  if (isLoading || !limits.prompts) return null;
  
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <h3 className="text-sm font-medium">Usage Today</h3>
      
      {/* AI Generations */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>AI Generations</span>
          <span className="text-muted-foreground">
            {limits.prompts.current} / {limits.prompts.limit === -1 ? '∞' : limits.prompts.limit}
          </span>
        </div>
        {limits.prompts.limit !== -1 && (
          <Progress 
            value={(limits.prompts.current / limits.prompts.limit) * 100} 
            className="h-2"
          />
        )}
      </div>
      
      {/* Video Exports */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Video Exports</span>
          <span className="text-muted-foreground">
            {limits.exports.current} / {limits.exports.limit === -1 ? '∞' : limits.exports.limit}
          </span>
        </div>
        {limits.exports.limit !== -1 && (
          <Progress 
            value={(limits.exports.current / limits.exports.limit) * 100} 
            className="h-2"
          />
        )}
      </div>
      
      {limits.prompts.resetAt && (
        <p className="text-xs text-muted-foreground">
          Resets in {getTimeUntil(limits.prompts.resetAt)}
        </p>
      )}
    </div>
  );
}

function getTimeUntil(date: Date): string {
  const ms = new Date(date).getTime() - Date.now();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
```

## 7. Usage Analytics Queries

```typescript
// src/server/services/usage/usage-analytics.ts

import { db } from "@/server/db";
import { usageEvents, userUsage } from "@/server/db/schema/usage";
import { sql } from "drizzle-orm";

export class UsageAnalytics {
  /**
   * Get top users by usage type
   */
  async getTopUsers(usageType: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        userId: userUsage.userId,
        totalUsage: sql<number>`SUM(${userUsage.count})`,
        lastUsed: sql<Date>`MAX(${userUsage.createdAt})`,
      })
      .from(userUsage)
      .where(
        and(
          eq(userUsage.usageType, usageType),
          gte(userUsage.createdAt, startDate)
        )
      )
      .groupBy(userUsage.userId)
      .orderBy(sql`SUM(${userUsage.count}) DESC`)
      .limit(100);
  }
  
  /**
   * Get usage trends over time
   */
  async getUsageTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        date: userUsage.usageDate,
        usageType: userUsage.usageType,
        totalCount: sql<number>`SUM(${userUsage.count})`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${userUsage.userId})`,
      })
      .from(userUsage)
      .where(gte(userUsage.usageDate, startDate.toISOString().split('T')[0]))
      .groupBy(userUsage.usageDate, userUsage.usageType)
      .orderBy(userUsage.usageDate);
  }
  
  /**
   * Get conversion funnel
   */
  async getConversionFunnel(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get unique users who performed each action
    const results = await db
      .select({
        usageType: userUsage.usageType,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${userUsage.userId})`,
      })
      .from(userUsage)
      .where(gte(userUsage.createdAt, startDate))
      .groupBy(userUsage.usageType);
    
    // Convert to funnel format
    const funnel = {
      registered: 0, // Get from users table
      createdProject: results.find(r => r.usageType === 'project_create')?.uniqueUsers || 0,
      generatedScene: results.find(r => r.usageType === 'prompt')?.uniqueUsers || 0,
      exportedVideo: results.find(r => r.usageType === 'export')?.uniqueUsers || 0,
    };
    
    return funnel;
  }
  
  /**
   * Get error rates by operation
   */
  async getErrorRates(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        eventType: usageEvents.eventType,
        eventSubtype: usageEvents.eventSubtype,
        totalEvents: sql<number>`COUNT(*)`,
        failedEvents: sql<number>`COUNT(*) FILTER (WHERE ${usageEvents.status} = 'failed')`,
        errorRate: sql<number>`ROUND(COUNT(*) FILTER (WHERE ${usageEvents.status} = 'failed') * 100.0 / COUNT(*), 2)`,
        avgDurationMs: sql<number>`AVG(${usageEvents.durationMs})`,
      })
      .from(usageEvents)
      .where(gte(usageEvents.createdAt, startDate))
      .groupBy(usageEvents.eventType, usageEvents.eventSubtype)
      .having(sql`COUNT(*) > 10`) // Only show types with significant volume
      .orderBy(sql`COUNT(*) DESC`);
  }
}

export const usageAnalytics = new UsageAnalytics();
```

## 8. Admin Dashboard Integration

```typescript
// src/app/admin/usage/page.tsx

import { usageAnalytics } from "@/server/services/usage/usage-analytics";
import { UsageChart } from "@/components/admin/usage-chart";
import { TopUsersTable } from "@/components/admin/top-users-table";
import { ErrorRatesTable } from "@/components/admin/error-rates-table";

export default async function UsageDashboard() {
  const [trends, topUsers, errorRates, funnel] = await Promise.all([
    usageAnalytics.getUsageTrends(30),
    usageAnalytics.getTopUsers('prompt', 30),
    usageAnalytics.getErrorRates(7),
    usageAnalytics.getConversionFunnel(30),
  ]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usage Analytics</h1>
      
      {/* Conversion Funnel */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Registered Users" value={funnel.registered} />
        <MetricCard title="Created Project" value={funnel.createdProject} />
        <MetricCard title="Generated Scene" value={funnel.generatedScene} />
        <MetricCard title="Exported Video" value={funnel.exportedVideo} />
      </div>
      
      {/* Usage Trends Chart */}
      <UsageChart data={trends} />
      
      {/* Top Users */}
      <TopUsersTable users={topUsers} />
      
      {/* Error Rates */}
      <ErrorRatesTable errors={errorRates} />
    </div>
  );
}
```

## 9. Environment Variables Configuration

```env
# Usage Limits (Override database defaults)
USAGE_LIMIT_PROMPTS_DAILY_FREE=10
USAGE_LIMIT_PROMPTS_DAILY_PRO=100
USAGE_LIMIT_EXPORTS_DAILY_FREE=3
USAGE_LIMIT_EXPORTS_DAILY_PRO=20
USAGE_LIMIT_PROJECTS_TOTAL_FREE=5
USAGE_LIMIT_PROJECTS_TOTAL_PRO=-1

# Feature Flags
USAGE_TRACKING_ENABLED=true
USAGE_LIMITS_ENFORCED=true
USAGE_ANALYTICS_ENABLED=true

# Credits System (for future)
CREDITS_ENABLED=false
CREDITS_DAILY_REFILL_FREE=100
CREDITS_DAILY_REFILL_PRO=1000
CREDITS_COST_PROMPT=10
CREDITS_COST_EXPORT=50
```

## 10. Migration Steps

1. **Database Migration**
   ```bash
   # Generate migration
   npm run db:generate
   
   # Review the migration file carefully
   # Apply to development first
   npm run db:push
   ```

2. **Seed Initial Data**
   ```sql
   -- Run this after migration
   INSERT INTO usage_limits_config (limit_type, free_tier_limit, pro_tier_limit, description)
   VALUES 
     ('prompts_daily', 10, 100, 'AI generation prompts per day'),
     ('exports_daily', 3, 20, 'Video exports per day'),
     ('projects_total', 5, -1, 'Total projects allowed');
   ```

3. **Update Existing Code**
   - Add usage tracking to generation router
   - Add usage tracking to export router
   - Add limit checks before operations
   - Update UI to show usage limits

4. **Testing Plan**
   - Test limit enforcement
   - Test usage tracking accuracy
   - Test analytics queries
   - Test UI updates

## Key Benefits

1. **Flexible Limits**: Change limits without deploying code
2. **Comprehensive Tracking**: Every action is logged
3. **Analytics Ready**: Built-in queries for understanding usage
4. **Future Proof**: Credits system ready for pay-per-use model
5. **Performance**: Optimized indexes for fast queries
6. **User Friendly**: Clear UI showing usage and limits

## Next Steps

1. Implement the database schema
2. Add tracking to all billable operations
3. Create admin UI for configuring limits
4. Build user-facing usage dashboard
5. Set up monitoring alerts for unusual usage patterns
6. Plan pricing tiers based on usage data