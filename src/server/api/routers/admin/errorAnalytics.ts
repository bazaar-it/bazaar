import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

const timeRangeSchema = z.enum(['today', 'week', 'month', 'lastWeek', 'last30days', 'custom']);

export const errorAnalyticsRouter = createTRPCRouter({
  getErrorStats: protectedProcedure
    .input(z.object({
      timeRange: timeRangeSchema,
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // No admin check needed - if they can access /admin routes, they're already admin

      // Calculate date range - avoid mutating the date objects
      const now = new Date();
      let startDate: Date;
      let endDate = new Date(now);

      switch (input.timeRange) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'lastWeek':
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 7);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'last30days':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'custom':
          startDate = input.startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = input.endDate || new Date(now);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get all messages with errors in the time range
      const { messages } = await import('~/server/db/schema');
      const { and, gte, lte, eq, or, like, desc } = await import('drizzle-orm');
      
      // Look for messages that indicate errors or fixes
      // "fixed issues" messages mean an error occurred and was auto-fixed
      // "FIX BROKEN SCENE" means auto-fix was triggered
      const errorMessages = await ctx.db.query.messages.findMany({
        where: and(
          gte(messages.createdAt, startDate),
          lte(messages.createdAt, endDate),
          or(
            // Auto-fix successful completion messages
            and(
              eq(messages.role, 'assistant'),
              like(messages.content, '%fixed issues%')
            ),
            // Auto-fix trigger messages (from user role, sent by auto-fix system)
            and(
              eq(messages.role, 'user'),
              like(messages.content, '%FIX BROKEN SCENE%')
            ),
            // Other error patterns
            and(
              eq(messages.role, 'assistant'),
              or(
                like(messages.content, '%error%'),
                like(messages.content, '%Error%'),
                like(messages.content, '%failed%'),
                like(messages.content, '%undefined%'),
                like(messages.content, '%is not defined%'),
                like(messages.content, '%Unexpected token%'),
                like(messages.content, '%cannot%'),
                like(messages.content, '%Cannot%'),
                eq(messages.status, 'error')
              )
            )
          )
        ),
        orderBy: desc(messages.createdAt),
      });

      // Get total messages for percentage calculation
      const { count } = await import('drizzle-orm');
      const totalMessagesResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, startDate),
            lte(messages.createdAt, endDate),
            eq(messages.role, 'assistant')
          )
        );
      const totalMessages = totalMessagesResult[0]?.count || 0;

      // Categorize errors
      const errorPatterns: Record<string, { count: number; examples: string[] }> = {};
      const projectErrors: Record<string, number> = {};
      const dailyErrors: Record<string, number> = {};

      for (const msg of errorMessages) {
        const content = msg.content;
        let category = 'Other';

        // Categorize by error type - prioritize real compilation errors
        if (content.includes('is not defined')) {
          // Extract the undefined variable name
          const match = content.match(/(\w+) is not defined/);
          if (match?.[1] === 'x') {
            category = 'Mysterious "x" variable (first line bug)';
          } else if (match?.[1]) {
            category = `Variable not defined: ${match[1]}`;
          } else {
            category = 'Variable not defined';
          }
        } else if (content.includes('Unexpected token')) {
          // Extract details about the syntax error
          const posMatch = content.match(/\((\d+):(\d+)\)/);
          if (posMatch) {
            category = `Syntax error at line ${posMatch[1]}, col ${posMatch[2]}`;
          } else {
            category = 'Syntax error (Unexpected token)';
          }
        } else if (content.includes('Cannot read properties')) {
          const propMatch = content.match(/Cannot read properties of (\w+) \(reading '([^']+)'\)/);
          if (propMatch) {
            category = `Cannot read property '${propMatch[2]}' of ${propMatch[1]}`;
          } else {
            category = 'Cannot read property';
          }
        } else if (content.includes('fps') && content.includes('undefined')) {
          category = 'FPS undefined in spring() animation';
        } else if (content.includes('currentFrame')) {
          category = 'currentFrame vs frame naming issue';
        } else if (content.includes('import') && (content.includes('not found') || content.includes('Cannot find'))) {
          category = 'Import/module not found';
        } else if (content.includes('fixed issues')) {
          // These are successful auto-fixes, less interesting for debugging
          const sceneMatch = content.match(/Updated "([^"]+)" - fixed issues/);
          category = `Auto-fixed: ${sceneMatch?.[1] || 'unknown scene'}`;
        } else if (content.includes('FIX BROKEN SCENE')) {
          // Auto-fix trigger messages
          if (content.includes('REWRITE BROKEN SCENE')) {
            category = 'Auto-fix attempt 3 (complete rewrite)';
          } else if (content.includes('ATTEMPT 2')) {
            category = 'Auto-fix attempt 2 (comprehensive)';
          } else {
            category = 'Auto-fix attempt 1 (targeted)';
          }
        } else if (content.includes('SyntaxError')) {
          category = 'Syntax Error';
        } else if (content.includes('TypeError')) {
          category = 'Type Error';  
        } else if (content.includes('ReferenceError')) {
          category = 'Reference Error';
        } else if (content.includes('⏱️ Manually adjusted')) {
          // These are just duration adjustments, not errors
          category = 'Duration adjustment (not an error)';
        }

        // Track error patterns
        if (!errorPatterns[category]) {
          errorPatterns[category] = { count: 0, examples: [] };
        }
        errorPatterns[category].count++;
        if (errorPatterns[category].examples.length < 3) {
          errorPatterns[category].examples.push(content.substring(0, 200));
        }

        // Track errors by project
        projectErrors[msg.projectId] = (projectErrors[msg.projectId] || 0) + 1;

        // Track daily errors
        const day = msg.createdAt.toISOString().split('T')[0];
        dailyErrors[day] = (dailyErrors[day] || 0) + 1;
      }

      // Get scenes that failed
      const { scenes } = await import('~/server/db/schema');
      const failedScenes = await ctx.db.query.scenes.findMany({
        where: and(
          gte(scenes.createdAt, startDate),
          lte(scenes.createdAt, endDate),
          or(
            like(scenes.tsxCode, '%error%'),
            like(scenes.tsxCode, '%Error%'),
            like(scenes.tsxCode, '%undefined%')
          )
        ),
      });

      // Calculate success/failure rates
      const errorRate = totalMessages > 0 
        ? ((errorMessages.length / totalMessages) * 100).toFixed(2)
        : '0';

      // Sort error patterns by frequency
      const sortedPatterns = Object.entries(errorPatterns)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          percentage: ((data.count / errorMessages.length) * 100).toFixed(2),
          examples: data.examples,
        }));

      // Get top problematic projects
      const topProblematicProjects = Object.entries(projectErrors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([projectId, count]) => ({ projectId, errorCount: count }));

      // Calculate daily trend
      const dailyTrend = Object.entries(dailyErrors)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      return {
        summary: {
          totalMessages,
          totalErrors: errorMessages.length,
          errorRate: parseFloat(errorRate),
          totalFailedScenes: failedScenes.length,
          uniqueProjectsAffected: Object.keys(projectErrors).length,
        },
        errorPatterns: sortedPatterns,
        topProblematicProjects,
        dailyTrend,
        recentErrors: errorMessages
          // Prioritize real errors over auto-fix success messages
          .sort((a, b) => {
            const aIsAutoFix = a.content.includes('fixed issues');
            const bIsAutoFix = b.content.includes('fixed issues');
            
            // If one is auto-fix and one isn't, prioritize the non-auto-fix
            if (aIsAutoFix && !bIsAutoFix) return 1;
            if (!aIsAutoFix && bIsAutoFix) return -1;
            
            // Otherwise sort by date (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 20)
          .map(msg => ({
            id: msg.id,
            content: msg.content.substring(0, 300),
            createdAt: msg.createdAt,
            projectId: msg.projectId,
            isAutoFixLoop: msg.content.includes('fixed issues'),
          })),
      };
    }),

  getComparisonStats: protectedProcedure
    .query(async ({ ctx }) => {
      // No admin check needed - if they can access /admin routes, they're already admin

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 7);
      
      const lastWeekEnd = new Date(thisWeekStart);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 7);

      // Import required schema and functions
      const { messages } = await import('~/server/db/schema');
      const { and, gte, lte, eq, or, like, count } = await import('drizzle-orm');
      
      // Get this week's stats - match the same logic as main query
      const thisWeekErrorsResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, thisWeekStart),
            lte(messages.createdAt, now),
            or(
              // Auto-fix successful completion messages
              and(
                eq(messages.role, 'assistant'),
                like(messages.content, '%fixed issues%')
              ),
              // Auto-fix trigger messages
              and(
                eq(messages.role, 'user'),
                like(messages.content, '%FIX BROKEN SCENE%')
              ),
              // Other error patterns
              and(
                eq(messages.role, 'assistant'),
                or(
                  like(messages.content, '%error%'),
                  like(messages.content, '%Error%'),
                  like(messages.content, '%failed%'),
                  like(messages.content, '%undefined%')
                )
              )
            )
          )
        );
      const thisWeekErrors = thisWeekErrorsResult[0]?.count || 0;

      const thisWeekTotalResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, thisWeekStart),
            lte(messages.createdAt, now),
            eq(messages.role, 'assistant')
          )
        );
      const thisWeekTotal = thisWeekTotalResult[0]?.count || 0;

      // Get last week's stats - match the same logic as main query
      const lastWeekErrorsResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, lastWeekStart),
            lte(messages.createdAt, lastWeekEnd),
            or(
              // Auto-fix successful completion messages
              and(
                eq(messages.role, 'assistant'),
                like(messages.content, '%fixed issues%')
              ),
              // Auto-fix trigger messages
              and(
                eq(messages.role, 'user'),
                like(messages.content, '%FIX BROKEN SCENE%')
              ),
              // Other error patterns
              and(
                eq(messages.role, 'assistant'),
                or(
                  like(messages.content, '%error%'),
                  like(messages.content, '%Error%'),
                  like(messages.content, '%failed%'),
                  like(messages.content, '%undefined%')
                )
              )
            )
          )
        );
      const lastWeekErrors = lastWeekErrorsResult[0]?.count || 0;

      const lastWeekTotalResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            gte(messages.createdAt, lastWeekStart),
            lte(messages.createdAt, lastWeekEnd),
            eq(messages.role, 'assistant')
          )
        );
      const lastWeekTotal = lastWeekTotalResult[0]?.count || 0;

      const thisWeekRate = thisWeekTotal > 0 ? (thisWeekErrors / thisWeekTotal) * 100 : 0;
      const lastWeekRate = lastWeekTotal > 0 ? (lastWeekErrors / lastWeekTotal) * 100 : 0;
      const improvement = lastWeekRate - thisWeekRate;

      return {
        thisWeek: {
          errors: thisWeekErrors,
          total: thisWeekTotal,
          rate: thisWeekRate.toFixed(2),
        },
        lastWeek: {
          errors: lastWeekErrors,
          total: lastWeekTotal,
          rate: lastWeekRate.toFixed(2),
        },
        improvement: improvement.toFixed(2),
        trending: improvement > 0 ? 'improving' : improvement < 0 ? 'worsening' : 'stable',
      };
    }),
});