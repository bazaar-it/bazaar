// Admin Marketing Router - Enhanced user management and bulk actions
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { users, projects, creditTransactions, emailSubscribers } from "~/server/db/schema";
import { sql, and, gte, lte, eq, like, or, desc, asc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Admin-only procedure that checks if user is admin
const adminOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, ctx.session.user.id))
    .limit(1);

  if (!user[0]?.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next();
});

// Filter schemas
const userFilterSchema = z.object({
  // Activity filters
  lastActive: z.object({
    operator: z.enum(['between', 'gt', 'lt']),
    value: z.date(),
    endValue: z.date().optional(),
  }).optional(),
  
  // Project filters
  projectCount: z.object({
    operator: z.enum(['equals', 'gt', 'lt', 'between']),
    value: z.number(),
    endValue: z.number().optional(),
  }).optional(),
  
  // Credit filters
  creditBalance: z.object({
    operator: z.enum(['equals', 'gt', 'lt', 'between']),
    value: z.number(),
    endValue: z.number().optional(),
  }).optional(),
  
  // Account filters
  registrationDate: z.object({
    operator: z.enum(['between', 'gt', 'lt']),
    value: z.date(),
    endValue: z.date().optional(),
  }).optional(),
  
  emailDomain: z.string().optional(),
  
  // Search
  search: z.string().optional(),
  
  // Pagination
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  
  // Sorting
  sortBy: z.enum(['lastActive', 'projectCount', 'creditBalance', 'registrationDate', 'name', 'email']).default('lastActive'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Bulk action schemas
const bulkActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('give_credits'),
    userIds: z.array(z.string()),
    amount: z.number().positive(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('send_email'),
    userIds: z.array(z.string()),
    subject: z.string(),
    template: z.string(),
    variables: z.record(z.string(), z.any()).optional(),
  }),
]);

// Store for undo functionality (in production, use database)
const actionHistory = new Map<string, { type: string; data: any; timestamp: Date }>();

export const adminMarketingRouter = createTRPCRouter({
  // Get filtered users with all necessary data
  getFilteredUsers: adminOnlyProcedure
    .input(userFilterSchema)
    .query(async ({ input }) => {
      const {
        lastActive,
        projectCount,
        creditBalance,
        registrationDate,
        emailDomain,
        search,
        limit,
        offset,
        sortBy,
        sortOrder,
      } = input;

      // Build the base query with user data and counts
      let query = db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          projectCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${projects}
            WHERE ${projects.userId} = ${users.id}
          )`,
          currentCredits: sql<number>`(
            SELECT COALESCE(
              (SELECT balance FROM ${creditTransactions}
               WHERE ${creditTransactions.userId} = ${users.id}
               ORDER BY ${creditTransactions.createdAt} DESC
               LIMIT 1
              ), 0
            )::int
          )`,
          lastProjectDate: sql<Date | null>`(
            SELECT MAX(${projects.createdAt})
            FROM ${projects}
            WHERE ${projects.userId} = ${users.id}
          )`,
        })
        .from(users);

      // Apply filters
      const conditions: any[] = [];

      // Search filter
      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }

      // Email domain filter
      if (emailDomain) {
        conditions.push(like(users.email, `%@${emailDomain}`));
      }

      // Registration date filter
      if (registrationDate) {
        if (registrationDate.operator === 'between' && registrationDate.endValue) {
          conditions.push(
            and(
              gte(users.createdAt, registrationDate.value),
              lte(users.createdAt, registrationDate.endValue)
            )
          );
        } else if (registrationDate.operator === 'gt') {
          conditions.push(gte(users.createdAt, registrationDate.value));
        } else if (registrationDate.operator === 'lt') {
          conditions.push(lte(users.createdAt, registrationDate.value));
        }
      }

      // Apply WHERE conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Execute query to get all results for filtering
      const allResults = await query;

      // Apply post-query filters (for computed fields)
      let filteredResults = allResults;

      // Project count filter
      if (projectCount) {
        filteredResults = filteredResults.filter(user => {
          const count = user.projectCount;
          if (projectCount.operator === 'equals') {
            return count === projectCount.value;
          } else if (projectCount.operator === 'gt') {
            return count > projectCount.value;
          } else if (projectCount.operator === 'lt') {
            return count < projectCount.value;
          } else if (projectCount.operator === 'between' && projectCount.endValue) {
            return count >= projectCount.value && count <= projectCount.endValue;
          }
          return true;
        });
      }

      // Credit balance filter
      if (creditBalance) {
        filteredResults = filteredResults.filter(user => {
          const balance = user.currentCredits;
          if (creditBalance.operator === 'equals') {
            return balance === creditBalance.value;
          } else if (creditBalance.operator === 'gt') {
            return balance > creditBalance.value;
          } else if (creditBalance.operator === 'lt') {
            return balance < creditBalance.value;
          } else if (creditBalance.operator === 'between' && creditBalance.endValue) {
            return balance >= creditBalance.value && balance <= creditBalance.endValue;
          }
          return true;
        });
      }

      // Last active filter (based on last project creation)
      if (lastActive) {
        filteredResults = filteredResults.filter(user => {
          const lastDate = user.lastProjectDate;
          if (!lastDate) return false;
          
          if (lastActive.operator === 'between' && lastActive.endValue) {
            return lastDate >= lastActive.value && lastDate <= lastActive.endValue;
          } else if (lastActive.operator === 'gt') {
            return lastDate > lastActive.value;
          } else if (lastActive.operator === 'lt') {
            return lastDate < lastActive.value;
          }
          return true;
        });
      }

      // Sort results
      filteredResults.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortBy) {
          case 'lastActive':
            aVal = a.lastProjectDate || new Date(0);
            bVal = b.lastProjectDate || new Date(0);
            break;
          case 'projectCount':
            aVal = a.projectCount;
            bVal = b.projectCount;
            break;
          case 'creditBalance':
            aVal = a.currentCredits;
            bVal = b.currentCredits;
            break;
          case 'registrationDate':
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'email':
            aVal = a.email;
            bVal = b.email;
            break;
          default:
            aVal = a.lastProjectDate || new Date(0);
            bVal = b.lastProjectDate || new Date(0);
        }
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      // Paginate
      const paginatedResults = filteredResults.slice(offset, offset + limit);

      return {
        users: paginatedResults,
        totalCount: filteredResults.length,
        hasMore: offset + limit < filteredResults.length,
      };
    }),

  // Execute bulk actions
  executeBulkAction: adminOnlyProcedure
    .input(bulkActionSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.type === 'give_credits') {
        const { userIds, amount, description } = input;
        
        // Process each user
        const results = await Promise.allSettled(
          userIds.map(async (userId) => {
            // Get current balance
            const lastTransaction = await db
              .select({ balance: creditTransactions.balance })
              .from(creditTransactions)
              .where(eq(creditTransactions.userId, userId))
              .orderBy(desc(creditTransactions.createdAt))
              .limit(1);

            const currentBalance = lastTransaction[0]?.balance || 0;
            const newBalance = currentBalance + amount;

            // Create credit transaction
            await db.insert(creditTransactions).values({
              userId,
              type: 'bonus',
              amount,
              balance: newBalance,
              description: description || `Admin bonus: ${amount} credits`,
              metadata: {
                adminId: ctx.session.user.id,
                bulkAction: true,
              },
            });

            return { userId, success: true };
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        // Store in action history for undo
        const actionId = `credit_${Date.now()}`;
        actionHistory.set(actionId, {
          type: 'give_credits',
          data: { userIds, amount, description },
          timestamp: new Date(),
        });

        return {
          success: true,
          message: `Credits given to ${successful} users${failed > 0 ? `, ${failed} failed` : ''}`,
          results: {
            successful,
            failed,
            total: userIds.length,
          },
          actionId, // Return for client-side tracking
        };
      }

      if (input.type === 'send_email') {
        const { userIds, subject, template, variables } = input;
        
        // Get user emails
        const usersToEmail = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
          })
          .from(users)
          .where(sql`${users.id} = ANY(${userIds})`);

        // Process template with variables
        const processTemplate = (template: string, user: any) => {
          let processed = template;
          processed = processed.replace(/{{firstName}}/g, user.name?.split(' ')[0] || 'there');
          processed = processed.replace(/{{email}}/g, user.email);
          processed = processed.replace(/{{name}}/g, user.name || 'User');
          
          // Add any custom variables
          if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
              processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
          }
          
          return processed;
        };

        // Send emails (using existing email API)
        const results = await Promise.allSettled(
          usersToEmail.map(async (user) => {
            const processedContent = processTemplate(template, user);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'newsletter',
                to: user.email,
                firstName: user.name?.split(' ')[0],
                subject,
                content: processedContent,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to send email to ${user.email}`);
            }

            return { userId: user.id, success: true };
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return {
          success: true,
          message: `Email sent to ${successful} users${failed > 0 ? `, ${failed} failed` : ''}`,
          results: {
            successful,
            failed,
            total: userIds.length,
          },
        };
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid bulk action type",
      });
    }),

  // Get quick stats for the marketing dashboard
  getMarketingStats: adminOnlyProcedure
    .query(async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        activeToday,
        activeThisWeek,
        activeThisMonth,
        totalCreditsGiven,
      ] = await Promise.all([
        // Total users
        db.select({ count: count() }).from(users),
        
        // Active today (created project today)
        db
          .select({ count: sql<number>`COUNT(DISTINCT ${projects.userId})::int` })
          .from(projects)
          .where(gte(projects.createdAt, today)),
        
        // Active this week
        db
          .select({ count: sql<number>`COUNT(DISTINCT ${projects.userId})::int` })
          .from(projects)
          .where(gte(projects.createdAt, thisWeek)),
        
        // Active this month
        db
          .select({ count: sql<number>`COUNT(DISTINCT ${projects.userId})::int` })
          .from(projects)
          .where(gte(projects.createdAt, thisMonth)),
        
        // Total credits given via admin
        db
          .select({ 
            total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)::int` 
          })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.type, 'bonus'),
              sql`${creditTransactions.metadata}->>'bulkAction' = 'true'`
            )
          ),
      ]);

      return {
        totalUsers: totalUsers[0]?.count || 0,
        activeToday: activeToday[0]?.count || 0,
        activeThisWeek: activeThisWeek[0]?.count || 0,
        activeThisMonth: activeThisMonth[0]?.count || 0,
        totalCreditsGiven: totalCreditsGiven[0]?.total || 0,
      };
    }),

  // Get user credit transaction history
  getUserCreditHistory: adminOnlyProcedure
    .input(z.object({ 
      userId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const { userId, limit } = input;

      // Get all credit transactions for the user
      const transactions = await db
        .select({
          id: creditTransactions.id,
          type: creditTransactions.type,
          amount: creditTransactions.amount,
          balance: creditTransactions.balance,
          description: creditTransactions.description,
          createdAt: creditTransactions.createdAt,
          metadata: creditTransactions.metadata,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit);

      // Calculate totals
      const totals = await db
        .select({
          totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactions.amount} > 0 THEN ${creditTransactions.amount} ELSE 0 END), 0)::int`,
          totalUsed: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${creditTransactions.amount} < 0 THEN ${creditTransactions.amount} ELSE 0 END)), 0)::int`,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId));

      // Get current balance
      const currentBalance = transactions[0]?.balance || 0;

      return {
        transactions,
        currentBalance,
        totalEarned: totals[0]?.totalEarned || 0,
        totalUsed: totals[0]?.totalUsed || 0,
      };
    }),

  // Undo bulk action (limited to credit actions)
  undoBulkAction: adminOnlyProcedure
    .input(z.object({
      actionId: z.string(),
      type: z.enum(['give_credits', 'send_email']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { actionId, type } = input;

      // Get action from history
      const action = actionHistory.get(actionId);
      
      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action not found or expired",
        });
      }

      // Check if action is less than 24 hours old
      const hoursSinceAction = (Date.now() - action.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceAction > 24) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Action is too old to undo (>24 hours)",
        });
      }

      if (type === 'give_credits' && action.data.userIds && action.data.amount) {
        // Reverse the credit transaction
        const results = await Promise.allSettled(
          action.data.userIds.map(async (userId: string) => {
            // Get current balance
            const lastTransaction = await db
              .select({ balance: creditTransactions.balance })
              .from(creditTransactions)
              .where(eq(creditTransactions.userId, userId))
              .orderBy(desc(creditTransactions.createdAt))
              .limit(1);

            const currentBalance = lastTransaction[0]?.balance || 0;
            const newBalance = currentBalance - action.data.amount;

            // Create reversal transaction
            await db.insert(creditTransactions).values({
              userId,
              type: 'adjustment',
              amount: -action.data.amount,
              balance: newBalance,
              description: `Undo: ${action.data.description || 'Admin bonus'}`,
              metadata: {
                adminId: ctx.session.user.id,
                undoAction: actionId,
                originalAmount: action.data.amount,
              },
            });

            return { userId, success: true };
          })
        );

        // Remove from history
        actionHistory.delete(actionId);

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return {
          success: true,
          message: `Undid credit gift for ${successful} users${failed > 0 ? `, ${failed} failed` : ''}`,
        };
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This action cannot be undone",
      });
    }),
});