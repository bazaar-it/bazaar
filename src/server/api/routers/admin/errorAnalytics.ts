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
      
      // Based on production data analysis - capture ALL error patterns
      const errorMessages = await ctx.db.query.messages.findMany({
        where: and(
          gte(messages.createdAt, startDate),
          lte(messages.createdAt, endDate),
          eq(messages.role, 'assistant'),
          or(
            // Auto-fix attempts - "Fixing the..." pattern
            like(messages.content, 'Fixing%'),
            // Successful auto-fixes
            like(messages.content, '%fixed issues%'),
            // Failed auto-fixes (scene reversions)
            like(messages.content, 'Reverted scene%'),
            // Thorough/comprehensive fix attempts
            like(messages.content, '%Thoroughly fixing%'),
            like(messages.content, '%Applying a thorough fix%'),
            // Rewrite attempts
            like(messages.content, 'Rewriting%scene%')
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

        // Advanced pattern detection based on production data analysis
        let severity = 'medium';
        let actualError = content;
        
        // Extract the actual error from fixing messages
        if (content.startsWith('Fixing')) {
          // Extract error type from "Fixing the 'x is not defined' error..."
          const errorMatch = content.match(/['"]([^'"]+)['"]\s*error|error[:\s]+['"]([^'"]+)['"]/i);
          if (errorMatch) {
            actualError = errorMatch[1] || errorMatch[2] || content;
          }
        } else if (content.startsWith('Reverted scene')) {
          // Extract from reverted messages which often contain the original error
          const errorMatch = content.match(/Error:\s*"([^"]+)"/);
          if (errorMatch) {
            actualError = errorMatch[1];
          }
        }
        
        if (actualError.includes('is not defined')) {
          const match = actualError.match(/(\w+) is not defined/);
          const variable = match?.[1];
          
          if (variable === 'x') {
            category = '🚨 CRITICAL: Mysterious "x" first-line bug';
            severity = 'critical';
          } else if (['Easing', 'spring', 'interpolate', 'useCurrentFrame'].includes(variable || '')) {
            category = `🔴 HIGH: Missing Remotion import (${variable})`;
            severity = 'high';
          } else if (variable?.match(/^card\d+[A-Z]/)) {
            category = `🔴 HIGH: Generated variable not defined (${variable})`;
            severity = 'high';
          } else if (variable) {
            category = `⚠️  Variable not defined: ${variable}`;
            severity = 'medium';
          } else {
            category = 'Variable not defined (unknown)';
          }
        } else if (actualError.includes('Unexpected token')) {
          const posMatch = actualError.match(/\((\d+):(\d+)\)/);
          const expectedMatch = actualError.match(/expected "([^"]+)"/);
          
          if (expectedMatch?.[1] === ';') {
            category = '🔴 HIGH: Missing semicolon';
            severity = 'high';
          } else if (expectedMatch?.[1] === '}') {
            category = '🚨 CRITICAL: Unmatched braces/brackets';  
            severity = 'critical';
          } else if (posMatch) {
            category = `🔴 Syntax error at line ${posMatch[1]}, col ${posMatch[2]}`;
            severity = 'high';
          } else {
            category = 'Syntax error (Unexpected token)';
          }
        } else if (actualError.includes('Cannot read properties')) {
          const propMatch = actualError.match(/Cannot read properties of (\w+) \(reading '([^']+)'\)/);
          if (propMatch) {
            if (propMatch[1] === 'undefined') {
              category = `🚨 CRITICAL: Accessing '${propMatch[2]}' on undefined`;
              severity = 'critical';
            } else {
              category = `🔴 Cannot read '${propMatch[2]}' of ${propMatch[1]}`;
              severity = 'high';
            }
          } else {
            category = 'Cannot read property';
          }
        } else if (content.includes('Reverted scene')) {
          // Scene reversion indicates multiple failed auto-fix attempts
          category = '🚨 CRITICAL: Auto-fix failed, scene reverted';
          severity = 'critical';
        } else if (content.includes('fps') && content.includes('undefined')) {
          category = '🔴 HIGH: FPS undefined in spring() animation';
          severity = 'high';
        } else if (content.includes('currentFrame')) {
          category = '⚠️  currentFrame vs frame naming mismatch';
          severity = 'medium';
        } else if (content.includes('import') && (content.includes('not found') || content.includes('Cannot find'))) {
          category = '🔴 HIGH: Import/module not found';
          severity = 'high';
        } else if (content.includes('fixed issues')) {
          const sceneMatch = content.match(/Updated "([^"]+)" - fixed issues/);
          category = `✅ Auto-fixed: ${sceneMatch?.[1] || 'scene'}`;
          severity = 'low';
        } else if (content.includes('🔧 FIX BROKEN SCENE') || content.includes('🔧 REWRITE BROKEN SCENE')) {
          // These are the actual error triggers - extract attempt level
          const sceneName = content.match(/Scene "([^"]+)"/)?.[1] || 'unknown';
          const errorExtract = actualError.substring(0, 50);
          
          if (content.includes('REWRITE BROKEN SCENE') || content.includes('FINAL ATTEMPT')) {
            category = `🚨 ATTEMPT 3 FAILED: ${sceneName} - ${errorExtract}`;
            severity = 'critical';
          } else if (content.includes('ATTEMPT 2')) {
            category = `🔴 ATTEMPT 2: ${sceneName} - ${errorExtract}`;
            severity = 'high';
          } else {
            category = `⚠️  ATTEMPT 1: ${sceneName} - ${errorExtract}`;
            severity = 'medium';
          }
        } else if (content.includes('SyntaxError')) {
          category = '🔴 HIGH: Syntax Error';
          severity = 'high';
        } else if (content.includes('TypeError')) {
          category = '🔴 HIGH: Type Error';
          severity = 'high';
        } else if (content.includes('ReferenceError')) {
          category = '🔴 HIGH: Reference Error';
          severity = 'high';
        } else if (content.includes('⏱️ Manually adjusted')) {
          category = 'ℹ️  Duration adjustment (not an error)';
          severity = 'info';
        }

        // Track error patterns with severity
        if (!errorPatterns[category]) {
          errorPatterns[category] = { count: 0, examples: [], severity };
        }
        errorPatterns[category].count++;
        if (errorPatterns[category].examples.length < 3) {
          errorPatterns[category].examples.push(content.substring(0, 200));
        }

        // Track errors by project (weight critical errors more heavily)
        const weight = severity === 'critical' ? 3 : severity === 'high' ? 2 : 1;
        projectErrors[msg.projectId] = (projectErrors[msg.projectId] || 0) + weight;

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

      // Sort error patterns by severity first, then frequency
      const sortedPatterns = Object.entries(errorPatterns)
        .sort(([, a], [, b]) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
          const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
          const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
          
          // First sort by severity, then by count
          if (bSeverity !== aSeverity) return bSeverity - aSeverity;
          return b.count - a.count;
        })
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          percentage: ((data.count / errorMessages.length) * 100).toFixed(2),
          examples: data.examples,
          severity: data.severity,
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

      // Calculate auto-fix success rate
      const autoFixAttempts = errorMessages.filter(m => 
        m.content.includes('🔧 FIX BROKEN SCENE') || 
        m.content.includes('🔧 REWRITE BROKEN SCENE')
      ).length;
      
      const autoFixSuccesses = errorMessages.filter(m => 
        m.content.includes('fixed issues')
      ).length;
      
      const autoFixSuccessRate = autoFixAttempts > 0 
        ? ((autoFixSuccesses / autoFixAttempts) * 100).toFixed(2)
        : '0';

      // Identify most critical issues
      const criticalIssues = sortedPatterns
        .filter(p => p.severity === 'critical')
        .slice(0, 3)
        .map(p => p.pattern);

      return {
        summary: {
          totalMessages,
          totalErrors: errorMessages.length,
          errorRate: parseFloat(errorRate),
          totalFailedScenes: failedScenes.length,
          uniqueProjectsAffected: Object.keys(projectErrors).length,
          autoFixAttempts,
          autoFixSuccesses,
          autoFixSuccessRate: parseFloat(autoFixSuccessRate),
          criticalIssues,
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