// src/server/api/routers/admin.ts
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { users, projects, scenes, feedback, messages, accounts, imageAnalysis, sceneIterations, projectMemory, emailSubscribers, exports } from "~/server/db/schema";
import { sql, and, gte, desc, count, eq, like, or, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Input schema for timeframe filtering
const timeframeSchema = z.enum(['all', '30d', '24h']).default('all');

// User update schema - now includes isAdmin
const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
  isAdmin: z.boolean().optional(),
});

// Admin-only procedure that checks if user is admin
const adminOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if user is admin
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

export const adminRouter = createTRPCRouter({
  // Check if current user is admin
  checkAdminAccess: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1);

      return {
        isAdmin: user[0]?.isAdmin || false,
      };
    }),

  // Toggle user admin status - admin only
  toggleUserAdmin: adminOnlyProcedure
    .input(z.object({ 
      userId: z.string(),
      isAdmin: z.boolean() 
    }))
    .mutation(async ({ input }) => {
      const updatedUser = await db
        .update(users)
        .set({ isAdmin: input.isAdmin })
        .where(eq(users.id, input.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          isAdmin: users.isAdmin,
        });

      if (!updatedUser[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser[0];
    }),

  // Get total users count with timeframe filtering - admin only
  getTotalUsers: adminOnlyProcedure
    .input(z.object({ timeframe: timeframeSchema }))
    .query(async ({ input }) => {
      let whereCondition;

      if (input.timeframe === '24h') {
        // Use createdAt for user creation time tracking
        whereCondition = gte(users.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000));
      } else if (input.timeframe === '30d') {
        whereCondition = gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      }

      const result = await db
        .select({ count: count() })
        .from(users)
        .where(whereCondition);

      return {
        total: result[0]?.count || 0,
        timeframe: input.timeframe
      };
    }),

  // Get unique projects created in timeframe - admin only
  getProjectsCreated: adminOnlyProcedure
    .input(z.object({ timeframe: timeframeSchema }))
    .query(async ({ input }) => {
      let whereCondition;

      if (input.timeframe === '24h') {
        whereCondition = gte(projects.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000));
      } else if (input.timeframe === '30d') {
        whereCondition = gte(projects.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      }

      const result = await db
        .select({ count: count() })
        .from(projects)
        .where(whereCondition);

      return {
        total: result[0]?.count || 0,
        timeframe: input.timeframe
      };
    }),

  // Get scenes created in timeframe - admin only
  getScenesCreated: adminOnlyProcedure
    .input(z.object({ timeframe: timeframeSchema }))
    .query(async ({ input }) => {
      let whereCondition;

      if (input.timeframe === '24h') {
        whereCondition = gte(scenes.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000));
      } else if (input.timeframe === '30d') {
        whereCondition = gte(scenes.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      }

      const result = await db
        .select({ count: count() })
        .from(scenes)
        .where(whereCondition);

      return {
        total: result[0]?.count || 0,
        timeframe: input.timeframe
      };
    }),

  // Get recent feedback entries - admin only
  getRecentFeedback: adminOnlyProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const feedbackEntries = await db
        .select({
          id: feedback.id,
          content: feedback.content,
          name: feedback.name,
          email: feedback.email,
          createdAt: feedback.createdAt,
          status: feedback.status,
          prioritizedFeatures: feedback.prioritizedFeatures,
        })
        .from(feedback)
        .orderBy(desc(feedback.createdAt))
        .limit(input.limit);

      return feedbackEntries;
    }),

  // Get comprehensive dashboard metrics - admin only
  getDashboardMetrics: adminOnlyProcedure
    .query(async () => {
      // Get all timeframes for each metric in parallel
      const [
        totalUsersAll,
        totalUsers30d,
        totalUsers7d,
        totalUsers24h,
        projectsAll,
        projects30d,
        projects7d,
        projects24h,
        scenesAll,
        scenes30d,
        scenes7d,
        scenes24h,
        promptsAll,
        prompts30d,
        prompts7d,
        prompts24h,
        recentFeedback
      ] = await Promise.all([
        // Users - using createdAt for user registration tracking
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users)
          .where(and(
            gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
            sql`${users.createdAt} IS NOT NULL`
          )),
        db.select({ count: count() }).from(users)
          .where(and(
            gte(users.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
            sql`${users.createdAt} IS NOT NULL`
          )),
        db.select({ count: count() }).from(users)
          .where(and(
            gte(users.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
            sql`${users.createdAt} IS NOT NULL`
          )),

        // Projects
        db.select({ count: count() }).from(projects),
        db.select({ count: count() }).from(projects)
          .where(gte(projects.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
        db.select({ count: count() }).from(projects)
          .where(gte(projects.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
        db.select({ count: count() }).from(projects)
          .where(gte(projects.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),

        // Scenes
        db.select({ count: count() }).from(scenes),
        db.select({ count: count() }).from(scenes)
          .where(gte(scenes.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
        db.select({ count: count() }).from(scenes)
          .where(gte(scenes.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
        db.select({ count: count() }).from(scenes)
          .where(gte(scenes.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),

        // Prompts (user messages) - all timeframes
        db.select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(eq(messages.role, 'user')),
        db.select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(and(
            eq(messages.role, 'user'),
            gte(messages.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )),
        db.select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(and(
            eq(messages.role, 'user'),
            gte(messages.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )),
        db.select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(and(
            eq(messages.role, 'user'),
            gte(messages.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )),

        // Recent feedback
        db.select({
          id: feedback.id,
          content: feedback.content,
          name: feedback.name,
          email: feedback.email,
          createdAt: feedback.createdAt,
          status: feedback.status,
        }).from(feedback)
          .orderBy(desc(feedback.createdAt))
          .limit(5)
      ]);

      return {
        users: {
          all: totalUsersAll[0]?.count || 0,
          last30Days: totalUsers30d[0]?.count || 0,
          last7Days: totalUsers7d[0]?.count || 0,
          last24Hours: totalUsers24h[0]?.count || 0,
        },
        projects: {
          all: projectsAll[0]?.count || 0,
          last30Days: projects30d[0]?.count || 0,
          last7Days: projects7d[0]?.count || 0,
          last24Hours: projects24h[0]?.count || 0,
        },
        scenes: {
          all: scenesAll[0]?.count || 0,
          last30Days: scenes30d[0]?.count || 0,
          last7Days: scenes7d[0]?.count || 0,
          last24Hours: scenes24h[0]?.count || 0,
        },
        prompts: {
          all: promptsAll[0]?.count || 0,
          last30Days: prompts30d[0]?.count || 0,
          last7Days: prompts7d[0]?.count || 0,
          last24Hours: prompts24h[0]?.count || 0,
        },
        recentFeedback
      };
    }),

  // USER MANAGEMENT ENDPOINTS - admin only

  // Get all users with pagination and search - admin only
  getUsers: adminOnlyProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      let whereCondition;
      if (input.search) {
        whereCondition = or(
          like(users.name, `%${input.search}%`),
          like(users.email, `%${input.search}%`)
        );
      }

      const [usersList, totalCount] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            isAdmin: users.isAdmin, // Include admin status
            createdAt: users.createdAt, // Include creation timestamp
          })
          .from(users)
          .where(whereCondition)
          .orderBy(desc(users.createdAt)) // Order by creation time instead
          .limit(input.limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(users)
          .where(whereCondition)
      ]);

      // Get prompt counts for each user
      const userIds = usersList.map(user => user.id);
      const promptCounts = userIds.length > 0 ? await db
        .select({
          userId: projects.userId,
          count: count(messages.id)
        })
        .from(messages)
        .innerJoin(projects, eq(messages.projectId, projects.id))
        .where(and(
          inArray(projects.userId, userIds),
          eq(messages.role, 'user')
        ))
        .groupBy(projects.userId) : [];

      // Create a map of userId to prompt count for easy lookup
      const promptCountMap = new Map();
      promptCounts.forEach(pc => {
        promptCountMap.set(pc.userId, pc.count);
      });

      // Add prompt counts to users
      const usersWithPrompts = usersList.map(user => ({
        ...user,
        totalPrompts: promptCountMap.get(user.id) || 0
      }));

      return {
        users: usersWithPrompts,
        total: totalCount[0]?.count || 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / input.limit)
      };
    }),

  // Get single user by ID - admin only
  getUser: adminOnlyProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          isAdmin: users.isAdmin, // Include admin status
          createdAt: users.createdAt, // Include creation timestamp
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get user's project count, latest activity, and prompt count
      const [projectCount, latestProject, promptCount] = await Promise.all([
        db
          .select({ count: count() })
          .from(projects)
          .where(eq(projects.userId, input.userId)),

        db
          .select({
            id: projects.id,
            title: projects.title,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(eq(projects.userId, input.userId))
          .orderBy(desc(projects.updatedAt))
          .limit(1),

        // Count total user messages/prompts by joining through projects
        db
          .select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(and(
            eq(projects.userId, input.userId),
            eq(messages.role, 'user') // Only count user messages, not assistant responses
          ))
      ]);

      return {
        ...user[0],
        projectCount: projectCount[0]?.count || 0,
        latestProject: latestProject[0] || null,
        promptCount: promptCount[0]?.count || 0,
      };
    }),

  // Update user data - admin only
  updateUser: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
      data: userUpdateSchema,
    }))
    .mutation(async ({ input }) => {
      const updateData: any = {};

      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.email !== undefined) updateData.email = input.data.email;
      if (input.data.image !== undefined) updateData.image = input.data.image;
      if (input.data.isAdmin !== undefined) updateData.isAdmin = input.data.isAdmin;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No data provided for update",
        });
      }

      const updatedUser = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, input.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt, // Include creation timestamp
        });

      if (!updatedUser[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found or update failed",
        });
      }

      return updatedUser[0];
    }),

  // Delete user - admin only
  deleteUser: adminOnlyProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      // Prevent deletion of admin users for safety
      const userToDelete = await db
        .select({ isAdmin: users.isAdmin, email: users.email })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!userToDelete[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (userToDelete[0].isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete admin users",
        });
      }

      // Delete user and all associated data
      // Note: This will cascade delete related data due to foreign key constraints
      const deletedUser = await db
        .delete(users)
        .where(eq(users.id, input.userId))
        .returning({
          id: users.id,
          email: users.email,
        });

      if (!deletedUser[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user",
        });
      }

      return { 
        success: true, 
        deletedUser: deletedUser[0] 
      };
    }),

  // Get user activity summary - admin only
  getUserActivity: adminOnlyProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [userProjects, userScenes, userFeedback] = await Promise.all([
        db
          .select({
            id: projects.id,
            title: projects.title,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(eq(projects.userId, input.userId))
          .orderBy(desc(projects.updatedAt))
          .limit(10),

        db
          .select({
            id: scenes.id,
            name: scenes.name,
            createdAt: scenes.createdAt,
            projectId: scenes.projectId,
          })
          .from(scenes)
          .innerJoin(projects, eq(scenes.projectId, projects.id))
          .where(eq(projects.userId, input.userId))
          .orderBy(desc(scenes.createdAt))
          .limit(10),

        db
          .select({
            id: feedback.id,
            content: feedback.content,
            createdAt: feedback.createdAt,
            status: feedback.status,
          })
          .from(feedback)
          .where(eq(feedback.userId, input.userId))
          .orderBy(desc(feedback.createdAt))
          .limit(5)
      ]);

      return {
        projects: userProjects,
        scenes: userScenes,
        feedback: userFeedback,
      };
    }),

  // ANALYTICS ENDPOINTS - admin only

  // Get time-series analytics data
  getAnalyticsData: adminOnlyProcedure
    .input(z.object({ 
      timeframe: z.enum(['24h', '7d', '30d']),
      metric: z.enum(['users', 'projects', 'scenes', 'prompts'])
    }))
    .query(async ({ input }) => {
      const { timeframe, metric } = input;

      // Calculate intervals and date ranges
      let intervalHours: number;
      let totalPeriodHours: number;

      switch (timeframe) {
        case '24h':
          intervalHours = 1; // 1-hour intervals
          totalPeriodHours = 24;
          break;
        case '7d':
          intervalHours = 24; // 24-hour (daily) intervals
          totalPeriodHours = 7 * 24;
          break;
        case '30d':
          intervalHours = 24; // 24-hour (daily) intervals
          totalPeriodHours = 30 * 24;
          break;
      }

      const startDate = new Date(Date.now() - totalPeriodHours * 60 * 60 * 1000);

      // Generate time slots
      const timeSlots = [];
      for (let i = 0; i < Math.ceil(totalPeriodHours / intervalHours); i++) {
        const slotStart = new Date(startDate.getTime() + i * intervalHours * 60 * 60 * 1000);
        const slotEnd = new Date(slotStart.getTime() + intervalHours * 60 * 60 * 1000);
        timeSlots.push({
          start: slotStart,
          end: slotEnd,
          label: timeframe === '24h' 
            ? slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : slotStart.toLocaleDateString([], { month: 'short', day: 'numeric' })
        });
      }

      // Get data based on metric type
      let data: { timestamp: Date; count: number }[] = [];

      switch (metric) {
        case 'users':
          // Get new users by createdAt timestamp
          const userCounts = await db
            .select({
              timestamp: users.createdAt,
            })
            .from(users)
            .where(and(
              gte(users.createdAt, startDate),
              sql`${users.createdAt} IS NOT NULL`
            ))
            .orderBy(users.createdAt);

          data = userCounts.map(row => ({
            timestamp: row.timestamp!,
            count: 1
          }));
          break;

        case 'projects':
          const projectCounts = await db
            .select({
              timestamp: projects.createdAt,
            })
            .from(projects)
            .where(gte(projects.createdAt, startDate))
            .orderBy(projects.createdAt);

          data = projectCounts.map(row => ({
            timestamp: row.timestamp,
            count: 1
          }));
          break;

        case 'scenes':
          const sceneCounts = await db
            .select({
              timestamp: scenes.createdAt,
            })
            .from(scenes)
            .where(gte(scenes.createdAt, startDate))
            .orderBy(scenes.createdAt);

          data = sceneCounts.map(row => ({
            timestamp: row.timestamp,
            count: 1
          }));
          break;

        case 'prompts':
          // Get user messages (prompts) by joining through projects
          const promptCounts = await db
            .select({
              timestamp: messages.createdAt,
            })
            .from(messages)
            .innerJoin(projects, eq(messages.projectId, projects.id))
            .where(and(
              gte(messages.createdAt, startDate),
              eq(messages.role, 'user') // Only count user messages
            ))
            .orderBy(messages.createdAt);

          data = promptCounts.map(row => ({
            timestamp: row.timestamp,
            count: 1
          }));
          break;
      }

      // Aggregate data into time slots
      const chartData = timeSlots.map(slot => {
        const slotData = data.filter(item => 
          item.timestamp >= slot.start && item.timestamp < slot.end
        );

        return {
          label: slot.label,
          timestamp: slot.start.toISOString(),
          count: slotData.length,
          cumulative: 0, // Will be calculated below
        };
      });

      // Calculate cumulative values
      let cumulative = 0;
      chartData.forEach(point => {
        cumulative += point.count;
        point.cumulative = cumulative;
      });

      return {
        timeframe,
        metric,
        data: chartData,
        totalCount: cumulative,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString(),
      };
    }),

  // Get overview analytics for all metrics
  getAnalyticsOverview: adminOnlyProcedure
    .input(z.object({ timeframe: z.enum(['24h', '7d', '30d']) }))
    .query(async ({ input }) => {
      const { timeframe } = input;

      let periodHours: number;
      switch (timeframe) {
        case '24h': periodHours = 24; break;
        case '7d': periodHours = 7 * 24; break;
        case '30d': periodHours = 30 * 24; break;
      }

      const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      // Get all metrics in parallel
      const [newUsers, newProjects, newScenes, newPrompts] = await Promise.all([
        // New users
        db
          .select({ count: count() })
          .from(users)
          .where(and(
            gte(users.createdAt, startDate),
            sql`${users.createdAt} IS NOT NULL`
          )),

        // New projects
        db
          .select({ count: count() })
          .from(projects)
          .where(gte(projects.createdAt, startDate)),

        // New scenes
        db
          .select({ count: count() })
          .from(scenes)
          .where(gte(scenes.createdAt, startDate)),

        // New prompts (user messages)
        db
          .select({ count: count() })
          .from(messages)
          .innerJoin(projects, eq(messages.projectId, projects.id))
          .where(and(
            gte(messages.createdAt, startDate),
            eq(messages.role, 'user')
          ))
      ]);

      return {
        timeframe,
        metrics: {
          users: newUsers[0]?.count || 0,
          projects: newProjects[0]?.count || 0,
          scenes: newScenes[0]?.count || 0,
          prompts: newPrompts[0]?.count || 0,
        },
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString(),
      };
    }),

  // EVALUATION ENDPOINTS - admin only

  // Run evaluation suite
  runEvaluation: adminOnlyProcedure
    .input(z.object({
      suiteId: z.string(),
      modelPacks: z.array(z.string()),
      maxPrompts: z.number().optional(),
      showOutputs: z.boolean().optional(),
      comparison: z.boolean().optional(),
      verbose: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      // Import the evaluation runner
      const { EvaluationRunner } = await import("~/lib/evals/runner");
      
      const runner = new EvaluationRunner();
      
      try {
        const result = await runner.runSuite({
          suiteId: input.suiteId,
          modelPacks: input.modelPacks,
          maxPrompts: input.maxPrompts,
          showOutputs: input.showOutputs,
          comparison: input.comparison,
          verbose: input.verbose,
        });

        return result;
      } catch (error) {
        console.error('Evaluation failed:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  // Create custom evaluation suite
  createCustomSuite: adminOnlyProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      prompts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['text', 'image', 'code', 'scene']),
        input: z.object({
          text: z.string().optional(),
          image: z.string().optional(),
          context: z.record(z.any()).optional(),
        }),
        expectedOutput: z.object({
          type: z.enum(['exact', 'contains', 'pattern', 'quality_score']),
          value: z.union([z.string(), z.number()]),
        }).optional(),
        expectedBehavior: z.object({
          toolCalled: z.string().optional(),
          editType: z.enum(['surgical', 'creative', 'structural']).optional(),
          shouldMention: z.array(z.string()).optional(),
          shouldModify: z.array(z.string()).optional(),
          shouldAnalyzeImage: z.boolean().optional(),
          shouldUseContext: z.boolean().optional(),
          shouldConfirm: z.boolean().optional(),
          shouldAsk: z.array(z.string()).optional(),
          needsClarification: z.boolean().optional(),
          expectedDuration: z.number().optional(),
          complexity: z.enum(['low', 'medium', 'high', 'very-high']),
        }).optional(),
      })),
      modelPacks: z.array(z.string()),
      services: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      // For now, just return the created suite structure
      // In the future, this could be stored in a database
      const customSuite = {
        id: `custom-${Date.now()}`,
        name: input.name,
        description: input.description,
        prompts: input.prompts,
        modelPacks: input.modelPacks,
        services: input.services,
      };

      return customSuite;
    }),

  // Get available evaluation suites
  getEvaluationSuites: adminOnlyProcedure
    .query(async () => {
      // Import suites dynamically
      const { allEvalSuites } = await import("~/lib/evals/suites/basic-prompts");
      
      return allEvalSuites.map(suite => ({
        id: suite.id,
        name: suite.name,
        description: suite.description,
        promptCount: suite.prompts.length,
        services: suite.services,
        modelPacks: suite.modelPacks,
      }));
    }),

  // Get available model packs
  getModelPacks: adminOnlyProcedure
    .query(async () => {
      const { MODEL_PACKS } = await import("~/config/models.config");
      
      return Object.entries(MODEL_PACKS).map(([id, pack]) => ({
        id,
        name: pack.name,
        description: pack.description,
        models: {
          brain: `${pack.models.brain.provider}/${pack.models.brain.model}`,
          codeGenerator: `${pack.models.codeGenerator.provider}/${pack.models.codeGenerator.model}`,
          editScene: `${pack.models.editScene.provider}/${pack.models.editScene.model}`,
          titleGenerator: `${pack.models.titleGenerator.provider}/${pack.models.titleGenerator.model}`,
        },
      }));
    }),

  // Create custom prompt - admin only
  createCustomPrompt: adminOnlyProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(['text', 'code', 'image', 'scene']),
      text: z.string(),
      expectedOutput: z.object({
        type: z.string(),
        value: z.string().optional(),
      }).optional(),
      context: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      // TODO: Store in database for persistence
      const customPrompt = {
        id: `prompt-${Date.now()}`,
        name: input.name,
        type: input.type,
        input: {
          text: input.text,
          context: input.context,
        },
        expectedOutput: input.expectedOutput,
        createdAt: new Date().toISOString(),
      };

      console.log('Creating custom prompt:', customPrompt);
      return { 
        success: true, 
        promptId: customPrompt.id,
        prompt: customPrompt
      };
    }),

  // Create custom model pack - admin only
  createCustomModelPack: adminOnlyProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      brainModel: z.string(),
      codeModel: z.string(),
      visionModel: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Parse provider/model format
      const parseModel = (modelString: string) => {
        const [provider, model] = modelString.split('/');
        return { provider: provider!, model: model! };
      };

      const customPack = {
        id: `custom-${Date.now()}`,
        name: input.name,
        description: input.description,
        models: {
          brain: parseModel(input.brainModel),
          codeGenerator: parseModel(input.codeModel),
          visionAnalysis: parseModel(input.visionModel),
        },
        createdAt: new Date().toISOString(),
      };

      // TODO: Store in database for persistence
      console.log('Creating custom model pack:', customPack);
      return { success: true, packId: customPack.id, pack: customPack };
    }),

  // Analyze uploaded image - admin only
  analyzeUploadedImage: adminOnlyProcedure
    .input(z.object({
      imageData: z.string(), // base64 image data
      prompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // TODO: Integrate with actual image analysis service from ~/lib/services/analyzeImage.ts
        const analysisResult = {
          success: true,
          analysis: {
            description: "A user interface mockup showing a modern web application with clean design elements, including navigation, content areas, and interactive components.",
            colors: ["#3B82F6", "#1F2937", "#F9FAFB", "#EF4444"],
            elements: ["Navigation bar", "Content cards", "Buttons", "Text elements"],
            mood: "Professional and modern",
            suggestions: [
              "This design could be implemented using React components",
              "The color scheme suggests a professional application",
              "Layout appears to be responsive-friendly"
            ],
            palette: {
              primary: "#3B82F6",
              secondary: "#1F2937", 
              accent: "#EF4444",
              background: "#F9FAFB"
            },
            typography: {
              headers: "Bold, sans-serif typography",
              body: "Clean, readable text"
            }
          },
          timestamp: new Date().toISOString(),
        };

        return analysisResult;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Image analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  // Generate scene from image - admin only
  generateSceneFromImage: adminOnlyProcedure
    .input(z.object({
      imageData: z.string(),
      analysisData: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // TODO: Integrate with actual scene generation service
        const sceneCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function GeneratedScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const scale = interpolate(frame, [0, fps], [0.8, 1], {
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp"
  });
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#3B82F6",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundImage: "linear-gradient(135deg, #3B82F6 0%, #1F2937 100%)"
    }}>
      <div style={{
        opacity,
        transform: \`scale(\${scale})\`,
        textAlign: "center",
        color: "white",
        padding: "2rem"
      }}>
        <h1 style={{
          fontSize: "4rem",
          fontWeight: "700",
          margin: "0 0 1rem 0",
          textShadow: "0 4px 8px rgba(0,0,0,0.3)"
        }}>
          Generated from Image
        </h1>
        <p style={{
          fontSize: "1.5rem",
          opacity: 0.9,
          maxWidth: "600px"
        }}>
          Professional UI Design with Modern Elements
        </p>
        <div style={{
          marginTop: "2rem",
          padding: "1rem 2rem",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: "10px",
          backdropFilter: "blur(10px)"
        }}>
          <span style={{ fontSize: "1.2rem" }}>
            Auto-generated from uploaded reference
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}`;

        return {
          success: true,
          sceneCode,
          sceneId: `scene-${Date.now()}`,
          sceneName: "Generated Scene",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // 🆕 NEW: Comprehensive user analytics endpoint
  getUserAnalytics: adminOnlyProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['signup_date', 'last_activity', 'total_projects', 'total_prompts']).default('signup_date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      searchTerm: z.string().optional(),
      authProvider: z.enum(['all', 'google', 'github', 'unknown']).default('all'),
      activityFilter: z.enum(['all', 'today', 'week', 'month', 'never']).default('all'),
      signupDateFilter: z.enum(['all', 'today', 'week', 'month', 'older']).default('all'),
      projectsFilter: z.enum(['all', 'none', 'low', 'medium', 'high']).default('all'),
      adminFilter: z.enum(['all', 'admin', 'user']).default('all'),
    }))
    .query(async ({ input }) => {
      const { 
        limit, 
        offset, 
        sortBy, 
        sortOrder, 
        searchTerm, 
        authProvider, 
        activityFilter, 
        signupDateFilter, 
        projectsFilter,
        adminFilter 
      } = input;

      // Build WHERE conditions for filtering
      const whereConditions = [];

      // Search filter
      if (searchTerm && searchTerm.trim()) {
        whereConditions.push(
          or(
            like(users.name, `%${searchTerm}%`),
            like(users.email, `%${searchTerm}%`)
          )
        );
      }

      // Admin status filter
      if (adminFilter !== 'all') {
        whereConditions.push(eq(users.isAdmin, adminFilter === 'admin'));
      }

      // Signup date filter
      if (signupDateFilter !== 'all') {
        const now = new Date();
        let signupThreshold: Date;
        
        switch (signupDateFilter) {
          case 'today':
            signupThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            whereConditions.push(gte(users.createdAt, signupThreshold));
            break;
          case 'week':
            signupThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            whereConditions.push(gte(users.createdAt, signupThreshold));
            break;
          case 'month':
            signupThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            whereConditions.push(gte(users.createdAt, signupThreshold));
            break;
          case 'older':
            signupThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            whereConditions.push(sql`${users.createdAt} < ${signupThreshold}`);
            break;
        }
      }

      // 🚨 COMPREHENSIVE USER ANALYTICS QUERY WITH ENHANCED FILTERING
      const baseQuery = db
        .select({
          // Basic user info
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          isAdmin: users.isAdmin,
          signupDate: users.createdAt,
          
          // OAuth provider info
          oauthProvider: accounts.provider,
          
          // Project metrics
          totalProjects: sql<number>`COUNT(DISTINCT ${projects.id})`.as('total_projects'),
          
          // Scene metrics  
          totalScenes: sql<number>`COUNT(DISTINCT ${scenes.id})`.as('total_scenes'),
          
          // Chat/prompt metrics
          totalMessages: sql<number>`COUNT(DISTINCT ${messages.id})`.as('total_messages'),
          totalUserPrompts: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.role} = 'user' THEN ${messages.id} END)`.as('total_user_prompts'),
          
          // Error message tracking
          totalErrorMessages: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.status} = 'error' THEN ${messages.id} END)`.as('total_error_messages'),
          
          // Image usage metrics - simplified to avoid double-counting
          promptsWithImages: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.imageUrls} IS NOT NULL AND jsonb_array_length(${messages.imageUrls}) > 0 THEN ${messages.id} END)`.as('prompts_with_images'),
          totalImagesUploaded: sql<number>`COALESCE(SUM(CASE WHEN ${messages.imageUrls} IS NOT NULL THEN jsonb_array_length(${messages.imageUrls}) ELSE 0 END), 0)`.as('total_images_uploaded'),
          
          // Activity metrics
          firstActivity: sql<Date>`MIN(${messages.createdAt})`.as('first_activity'),
          lastActivity: sql<Date>`MAX(${messages.createdAt})`.as('last_activity'),
          
          // Engagement metrics
          totalSceneIterations: sql<number>`COUNT(DISTINCT ${sceneIterations.id})`.as('total_scene_iterations'),
          
          // Advanced behavior metrics
          complexEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'structural' THEN ${sceneIterations.id} END)`.as('complex_edits'),
          creativeEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'creative' THEN ${sceneIterations.id} END)`.as('creative_edits'),
          surgicalEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'surgical' THEN ${sceneIterations.id} END)`.as('surgical_edits'),
          
          // Project memory insights
          userPreferences: sql<number>`COUNT(DISTINCT CASE WHEN ${projectMemory.memoryType} = 'user_preference' THEN ${projectMemory.id} END)`.as('user_preferences'),
        })
        .from(users)
        .leftJoin(accounts, eq(users.id, accounts.userId))
        .leftJoin(projects, eq(users.id, projects.userId))
        .leftJoin(scenes, eq(projects.id, scenes.projectId))
        .leftJoin(messages, eq(projects.id, messages.projectId))
        .leftJoin(sceneIterations, eq(projects.id, sceneIterations.projectId))
        .leftJoin(projectMemory, eq(projects.id, projectMemory.projectId))
        .$dynamic();

      // Execute the query with conditional WHERE clause, groupBy and ordering
      let userAnalytics = await (whereConditions.length > 0 
        ? baseQuery.where(and(...whereConditions))
        : baseQuery
      )
        .groupBy(users.id, users.name, users.email, users.image, users.isAdmin, users.createdAt, accounts.provider)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(
                sortBy === 'signup_date' ? users.createdAt :
                sortBy === 'last_activity' ? sql`MAX(${messages.createdAt})` :
                sortBy === 'total_projects' ? sql`COUNT(DISTINCT ${projects.id})` :
                sql`COUNT(DISTINCT CASE WHEN ${messages.role} = 'user' THEN ${messages.id} END)`
              )
            : asc(
                sortBy === 'signup_date' ? users.createdAt :
                sortBy === 'last_activity' ? sql`MAX(${messages.createdAt})` :
                sortBy === 'total_projects' ? sql`COUNT(DISTINCT ${projects.id})` :
                sql`COUNT(DISTINCT CASE WHEN ${messages.role} = 'user' THEN ${messages.id} END)`
              )
        );

      // Apply post-query filtering (since Drizzle doesn't support complex HAVING clauses well)
      if (authProvider !== 'all') {
        userAnalytics = userAnalytics.filter(user => {
          if (authProvider === 'unknown') {
            return !user.oauthProvider;
          }
          return user.oauthProvider === authProvider;
        });
      }

      if (projectsFilter !== 'all') {
        userAnalytics = userAnalytics.filter(user => {
          const projectCount = user.totalProjects;
          switch (projectsFilter) {
            case 'none':
              return projectCount === 0;
            case 'low':
              return projectCount >= 1 && projectCount <= 2;
            case 'medium':
              return projectCount >= 3 && projectCount <= 10;
            case 'high':
              return projectCount > 10;
            default:
              return true;
          }
        });
      }

      if (activityFilter !== 'all') {
        const now = new Date();
        userAnalytics = userAnalytics.filter(user => {
          if (activityFilter === 'never') {
            return !user.lastActivity;
          }
          
          if (!user.lastActivity) return false;
          
          const lastActivity = new Date(user.lastActivity);
          let threshold: Date;
          
          switch (activityFilter) {
            case 'today':
              threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              return lastActivity >= threshold;
            case 'week':
              threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return lastActivity >= threshold;
            case 'month':
              threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              return lastActivity >= threshold;
            default:
              return true;
          }
        });
      }

      // Apply pagination after filtering
      const totalCount = userAnalytics.length;
      const paginatedUsers = userAnalytics.slice(offset, offset + limit);

      return {
        users: paginatedUsers,
        totalCount,
        hasMore: offset + limit < totalCount,
        appliedFilters: {
          searchTerm,
          authProvider,
          activityFilter,
          signupDateFilter,
          projectsFilter,
          adminFilter,
        },
      };
    }),

  // 🆕 NEW: Get detailed user activity timeline
  getUserActivityTimeline: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ input }) => {
      const { userId, days } = input;
      
      // 🚨 FIXED: Calculate date threshold explicitly to avoid SQL parameter binding issues
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const activityTimeline = await db
        .select({
          date: sql<string>`DATE(${messages.createdAt})`.as('date'),
          totalMessages: sql<number>`COUNT(*)`.as('total_messages'),
          userPrompts: sql<number>`COUNT(CASE WHEN ${messages.role} = 'user' THEN 1 END)`.as('user_prompts'),
          assistantResponses: sql<number>`COUNT(CASE WHEN ${messages.role} = 'assistant' THEN 1 END)`.as('assistant_responses'),
          imagesUploaded: sql<number>`COUNT(CASE WHEN ${messages.imageUrls} IS NOT NULL AND jsonb_array_length(${messages.imageUrls}) > 0 THEN 1 END)`.as('images_uploaded'),
          scenesCreated: sql<number>`COUNT(DISTINCT ${scenes.id})`.as('scenes_created'),
          projectsWorkedOn: sql<number>`COUNT(DISTINCT ${projects.id})`.as('projects_worked_on'),
          avgSessionTime: sql<number>`EXTRACT(EPOCH FROM (MAX(${messages.createdAt}) - MIN(${messages.createdAt})))/60`.as('avg_session_minutes'),
        })
        .from(messages)
        .innerJoin(projects, eq(messages.projectId, projects.id))
        .leftJoin(scenes, and(
          eq(projects.id, scenes.projectId),
          sql`DATE(${scenes.createdAt}) = DATE(${messages.createdAt})`
        ))
        .where(and(
          eq(projects.userId, userId),
          gte(messages.createdAt, startDate)
        ))
        .groupBy(sql`DATE(${messages.createdAt})`)
        .orderBy(sql`DATE(${messages.createdAt}) DESC`);

      return activityTimeline;
    }),

  // 🆕 NEW: Get individual user details
  getUserDetails: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      const { userId } = input;
      
      const userDetails = await db
        .select({
          // Basic user info
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          isAdmin: users.isAdmin,
          signupDate: users.createdAt,
          
          // OAuth provider info
          oauthProvider: accounts.provider,
          
          // Project metrics
          totalProjects: sql<number>`COUNT(DISTINCT ${projects.id})`.as('total_projects'),
          
          // Scene metrics  
          totalScenes: sql<number>`COUNT(DISTINCT ${scenes.id})`.as('total_scenes'),
          
          // Chat/prompt metrics
          totalMessages: sql<number>`COUNT(DISTINCT ${messages.id})`.as('total_messages'),
          totalUserPrompts: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.role} = 'user' THEN ${messages.id} END)`.as('total_user_prompts'),
          
          // Error message tracking
          totalErrorMessages: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.status} = 'error' THEN ${messages.id} END)`.as('total_error_messages'),
          
          // Image usage metrics - simplified to avoid double-counting
          promptsWithImages: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.imageUrls} IS NOT NULL AND jsonb_array_length(${messages.imageUrls}) > 0 THEN ${messages.id} END)`.as('prompts_with_images'),
          totalImagesUploaded: sql<number>`COALESCE(SUM(CASE WHEN ${messages.imageUrls} IS NOT NULL THEN jsonb_array_length(${messages.imageUrls}) ELSE 0 END), 0)`.as('total_images_uploaded'),
          
          // Activity metrics
          firstActivity: sql<Date>`MIN(${messages.createdAt})`.as('first_activity'),
          lastActivity: sql<Date>`MAX(${messages.createdAt})`.as('last_activity'),
          
          // Engagement metrics
          totalSceneIterations: sql<number>`COUNT(DISTINCT ${sceneIterations.id})`.as('total_scene_iterations'),
          
          // Advanced behavior metrics
          complexEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'structural' THEN ${sceneIterations.id} END)`.as('complex_edits'),
          creativeEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'creative' THEN ${sceneIterations.id} END)`.as('creative_edits'),
          surgicalEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'surgical' THEN ${sceneIterations.id} END)`.as('surgical_edits'),
          
          // Project memory insights
          userPreferences: sql<number>`COUNT(DISTINCT CASE WHEN ${projectMemory.memoryType} = 'user_preference' THEN ${projectMemory.id} END)`.as('user_preferences'),
        })
        .from(users)
        .leftJoin(accounts, eq(users.id, accounts.userId))
        .leftJoin(projects, eq(users.id, projects.userId))
        .leftJoin(scenes, eq(projects.id, scenes.projectId))
        .leftJoin(messages, eq(projects.id, messages.projectId))
        .leftJoin(sceneIterations, eq(projects.id, sceneIterations.projectId))
        .leftJoin(projectMemory, eq(projects.id, projectMemory.projectId))
        .where(eq(users.id, userId))
        .groupBy(users.id, users.name, users.email, users.image, users.isAdmin, users.createdAt, accounts.provider)
        .limit(1);

      return userDetails[0] || null;
    }),

  // 🆕 NEW: Get detailed user projects with scenes and activity
  getUserProjects: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { userId, limit, offset } = input;
      
      const userProjects = await db
        .select({
          // Project details
          id: projects.id,
          title: projects.title,
          props: projects.props, // Use props instead of description
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          
          // Scene metrics for this project
          totalScenes: sql<number>`COUNT(DISTINCT ${scenes.id})`.as('total_scenes'),
          
          // Message metrics for this project
          totalMessages: sql<number>`COUNT(DISTINCT ${messages.id})`.as('total_messages'),
          totalUserPrompts: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.role} = 'user' THEN ${messages.id} END)`.as('total_user_prompts'),
          
          // Image usage in this project
          promptsWithImages: sql<number>`COUNT(DISTINCT CASE WHEN ${messages.imageUrls} IS NOT NULL AND jsonb_array_length(${messages.imageUrls}) > 0 THEN ${messages.id} END)`.as('prompts_with_images'),
          
          // Activity metrics
          firstActivity: sql<Date>`MIN(${messages.createdAt})`.as('first_activity'),
          lastActivity: sql<Date>`MAX(${messages.createdAt})`.as('last_activity'),
          
          // Scene iterations for this project
          totalIterations: sql<number>`COUNT(DISTINCT ${sceneIterations.id})`.as('total_iterations'),
        })
        .from(projects)
        .leftJoin(scenes, eq(projects.id, scenes.projectId))
        .leftJoin(messages, eq(projects.id, messages.projectId))
        .leftJoin(sceneIterations, eq(projects.id, sceneIterations.projectId))
        .where(eq(projects.userId, userId))
        .groupBy(projects.id, projects.title, projects.props, projects.createdAt, projects.updatedAt)
        .orderBy(desc(projects.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.userId, userId));

      return {
        projects: userProjects,
        totalCount: totalCountResult[0]?.count || 0,
        hasMore: offset + limit < (totalCountResult[0]?.count || 0),
      };
    }),

  // 🆕 NEW: Get full project details including scenes and complete chat history
  getUserProjectDetails: adminOnlyProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(), // For security - ensure project belongs to user
    }))
    .query(async ({ input }) => {
      const { projectId, userId } = input;
      
      // Verify project belongs to user
      const projectOwnership = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
        
      if (!projectOwnership[0] || projectOwnership[0].userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or doesn't belong to user",
        });
      }

      // Get project details
      const projectDetails = await db
        .select({
          id: projects.id,
          title: projects.title,
          props: projects.props, // Use props instead of description
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      // Get all scenes for this project
      const projectScenes = await db
        .select({
          id: scenes.id,
          name: scenes.name,
          tsxCode: scenes.tsxCode, // Use tsxCode instead of code
          duration: scenes.duration,
          createdAt: scenes.createdAt,
          updatedAt: scenes.updatedAt,
          // Iteration count for each scene
          iterationCount: sql<number>`COUNT(DISTINCT ${sceneIterations.id})`.as('iteration_count'),
        })
        .from(scenes)
        .leftJoin(sceneIterations, eq(scenes.id, sceneIterations.sceneId))
        .where(eq(scenes.projectId, projectId))
        .groupBy(scenes.id, scenes.name, scenes.tsxCode, scenes.duration, scenes.createdAt, scenes.updatedAt)
        .orderBy(asc(scenes.createdAt));

      // Get complete chat history for this project
      const chatHistory = await db
        .select({
          id: messages.id,
          role: messages.role,
          content: messages.content,
          imageUrls: messages.imageUrls,
          status: messages.status,
          createdAt: messages.createdAt,
          // Additional metadata
          originalTsxCode: messages.originalTsxCode,
        })
        .from(messages)
        .where(eq(messages.projectId, projectId))
        .orderBy(asc(messages.createdAt));

      // Get scene iterations for detailed editing history (renamed variable)
      const projectSceneIterations = await db
        .select({
          id: sceneIterations.id,
          sceneId: sceneIterations.sceneId,
          editComplexity: sceneIterations.editComplexity,
          userPrompt: sceneIterations.userPrompt,
          brainReasoning: sceneIterations.brainReasoning,
          toolReasoning: sceneIterations.toolReasoning,
          codeBefore: sceneIterations.codeBefore,
          codeAfter: sceneIterations.codeAfter,
          changesApplied: sceneIterations.changesApplied,
          changesPreserved: sceneIterations.changesPreserved,
          generationTimeMs: sceneIterations.generationTimeMs,
          modelUsed: sceneIterations.modelUsed,
          operationType: sceneIterations.operationType,
          temperature: sceneIterations.temperature,
          tokensUsed: sceneIterations.tokensUsed,
          createdAt: sceneIterations.createdAt,
        })
        .from(sceneIterations)
        .where(eq(sceneIterations.projectId, projectId))
        .orderBy(asc(sceneIterations.createdAt));

      // Get project memory for context
      const projectMemoryEntries = await db
        .select({
          id: projectMemory.id,
          memoryType: projectMemory.memoryType,
          memoryValue: projectMemory.memoryValue, // Use memoryValue instead of content
          createdAt: projectMemory.createdAt,
        })
        .from(projectMemory)
        .where(eq(projectMemory.projectId, projectId))
        .orderBy(desc(projectMemory.createdAt));

      return {
        project: projectDetails[0],
        scenes: projectScenes,
        chatHistory,
        sceneIterations: projectSceneIterations, // Use renamed variable
        projectMemory: projectMemoryEntries,
        summary: {
          totalScenes: projectScenes.length,
          totalMessages: chatHistory.length,
          totalUserPrompts: chatHistory.filter(msg => msg.role === 'user').length,
          totalAssistantResponses: chatHistory.filter(msg => msg.role === 'assistant').length,
          totalIterations: projectSceneIterations.length,
          imagesUploaded: chatHistory.filter(msg => msg.imageUrls && Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0).length,
          firstActivity: chatHistory[0]?.createdAt || null,
          lastActivity: chatHistory[chatHistory.length - 1]?.createdAt || null,
        }
      };
    }),

  // 🆕 NEW: Get all scenes created by a user across all projects
  getUserScenes: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['created_date', 'updated_date', 'project_name', 'scene_name', 'duration']).default('created_date'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input }) => {
      const { userId, limit, offset, sortBy, sortOrder } = input;
      
      const sortColumn = 
        sortBy === 'created_date' ? scenes.createdAt :
        sortBy === 'updated_date' ? scenes.updatedAt :
        sortBy === 'project_name' ? projects.title :
        sortBy === 'scene_name' ? scenes.name :
        scenes.duration;

      const userScenes = await db
        .select({
          // Scene details
          id: scenes.id,
          name: scenes.name,
          tsxCode: scenes.tsxCode, // Use tsxCode instead of code
          duration: scenes.duration,
          createdAt: scenes.createdAt,
          updatedAt: scenes.updatedAt,
          
          // Project context
          projectId: projects.id,
          projectTitle: projects.title,
          projectCreatedAt: projects.createdAt,
          
          // Scene activity metrics
          iterationCount: sql<number>`COUNT(DISTINCT ${sceneIterations.id})`.as('iteration_count'),
          lastIterationDate: sql<Date>`MAX(${sceneIterations.createdAt})`.as('last_iteration_date'),
          
          // Complexity breakdown
          complexEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'structural' THEN ${sceneIterations.id} END)`.as('complex_edits'),
          creativeEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'creative' THEN ${sceneIterations.id} END)`.as('creative_edits'),
          surgicalEdits: sql<number>`COUNT(DISTINCT CASE WHEN ${sceneIterations.editComplexity} = 'surgical' THEN ${sceneIterations.id} END)`.as('surgical_edits'),
        })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .leftJoin(sceneIterations, eq(scenes.id, sceneIterations.sceneId))
        .where(eq(projects.userId, userId))
        .groupBy(scenes.id, scenes.name, scenes.tsxCode, scenes.duration, scenes.createdAt, scenes.updatedAt, projects.id, projects.title, projects.createdAt)
        .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: count() })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(eq(projects.userId, userId));

      return {
        scenes: userScenes,
        totalCount: totalCountResult[0]?.count || 0,
        hasMore: offset + limit < (totalCountResult[0]?.count || 0),
        appliedSort: { sortBy, sortOrder },
      };
    }),

  // 🆕 NEW: Get detailed scene information including iteration history
  getSceneDetails: adminOnlyProcedure
    .input(z.object({
      sceneId: z.string(),
      userId: z.string(), // For security verification
    }))
    .query(async ({ input }) => {
      const { sceneId, userId } = input;
      
      // Verify scene belongs to user's project
      const sceneOwnership = await db
        .select({ 
          userId: projects.userId,
          projectId: scenes.projectId 
        })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(eq(scenes.id, sceneId))
        .limit(1);
        
      if (!sceneOwnership[0] || sceneOwnership[0].userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scene not found or doesn't belong to user",
        });
      }

      // Get scene details
      const sceneDetails = await db
        .select({
          id: scenes.id,
          name: scenes.name,
          tsxCode: scenes.tsxCode, // Use tsxCode instead of code
          duration: scenes.duration,
          createdAt: scenes.createdAt,
          updatedAt: scenes.updatedAt,
          
          // Project context
          projectId: projects.id,
          projectTitle: projects.title,
        })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(eq(scenes.id, sceneId))
        .limit(1);

      // Get all iterations for this scene
      const iterations = await db
        .select({
          id: sceneIterations.id,
          editComplexity: sceneIterations.editComplexity,
          userPrompt: sceneIterations.userPrompt,
          generationTimeMs: sceneIterations.generationTimeMs,
          modelUsed: sceneIterations.modelUsed,
          createdAt: sceneIterations.createdAt,
        })
        .from(sceneIterations)
        .where(eq(sceneIterations.sceneId, sceneId))
        .orderBy(asc(sceneIterations.createdAt));

      // Get related messages from the project (context around scene creation)
      const relatedMessages = await db
        .select({
          id: messages.id,
          role: messages.role,
          content: messages.content,
          imageUrls: messages.imageUrls,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.projectId, sceneOwnership[0].projectId))
        .orderBy(asc(messages.createdAt));

      return {
        scene: sceneDetails[0],
        iterations,
        relatedMessages,
        summary: {
          totalIterations: iterations.length,
          complexityBreakdown: {
            structural: iterations.filter(i => i.editComplexity === 'structural').length,
            creative: iterations.filter(i => i.editComplexity === 'creative').length,
            surgical: iterations.filter(i => i.editComplexity === 'surgical').length,
          },
          averageGenerationTime: iterations.length > 0 
            ? Math.round(iterations.reduce((sum, i) => sum + (i.generationTimeMs || 0), 0) / iterations.length)
            : 0,
          firstIteration: iterations[0]?.createdAt || null,
          lastIteration: iterations[iterations.length - 1]?.createdAt || null,
        }
      };
    }),

  // EMAIL MARKETING ENDPOINTS - admin only

  // Send welcome email to new user
  sendWelcomeEmail: adminOnlyProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { userId } = input;

      // Get user details
      const user = await db
        .select({
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'welcome',
            to: user[0].email,
            firstName: user[0].name || 'there',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send email');
        }

        return {
          success: true,
          message: `Welcome email sent to ${user[0].email}`,
          emailId: result.data?.id,
        };
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Send newsletter to multiple users
  sendNewsletter: adminOnlyProcedure
    .input(z.object({
      userIds: z.array(z.string()).optional(),
      customEmails: z.array(z.string().email()).optional(),
      sendToAll: z.boolean().default(false),
      subject: z.string(),
      content: z.string(),
      ctaText: z.string().optional(),
      ctaUrl: z.string().url().optional(),
      isCustomCode: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const { userIds, customEmails, sendToAll, subject, content, ctaText, ctaUrl } = input;

      let targetEmails: Array<{ email: string; name?: string }> = [];

              if (sendToAll) {
          // Send to all users and subscribers
          const [allUsers, allSubscribers] = await Promise.all([
            db
              .select({
                email: users.email,
                name: users.name,
              })
              .from(users)
              .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`),
            db
              .select({
                email: emailSubscribers.email,
                name: sql<string | null>`NULL`.as('name'),
              })
              .from(emailSubscribers)
              .where(eq(emailSubscribers.status, 'active'))
          ]);

          targetEmails = [
            ...allUsers.map(user => ({ email: user.email, name: user.name || undefined })), 
            ...allSubscribers.map(sub => ({ email: sub.email, name: sub.name || undefined }))
          ];
        } else {
          // Send to specific users and/or custom emails
          if (userIds && userIds.length > 0) {
            const selectedUsers = await db
              .select({
                email: users.email,
                name: users.name,
              })
              .from(users)
              .where(inArray(users.id, userIds));
            
            targetEmails.push(...selectedUsers.map(user => ({ email: user.email, name: user.name || undefined })));
          }

          if (customEmails && customEmails.length > 0) {
            targetEmails.push(...customEmails.map(email => ({ email, name: undefined })));
          }
        }

        if (targetEmails.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No valid recipients found",
          });
        }

                const emailPromises = targetEmails.map(async (recipient) => {
          try {
            const emailPayload = input.isCustomCode ? {
              type: 'custom',
              to: recipient.email,
              subject,
              reactCode: content,
            } : {
              type: 'newsletter',
              to: recipient.email,
              firstName: recipient.name || 'there',
              subject,
              content,
              ctaText,
              ctaUrl,
            };

            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/email/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(emailPayload),
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error || 'Failed to send email');
            }

            return {
              email: recipient.email,
              success: true,
              emailId: result.data?.id,
            };
          } catch (error) {
            console.error(`Failed to send newsletter to ${recipient.email}:`, error);
            return {
              email: recipient.email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

              const results = await Promise.all(emailPromises);
        const successful = results.filter((r: any) => r.success);
        const failed = results.filter((r: any) => !r.success);

        return {
          totalSent: successful.length,
          totalFailed: failed.length,
          totalUsers: targetEmails.length,
          successful,
          failed,
          message: `Newsletter sent to ${successful.length} out of ${targetEmails.length} recipients`,
        };
    }),

  // Get email marketing statistics
  getEmailStats: adminOnlyProcedure
    .query(async () => {
      // Get user counts for email targeting - only count users with email addresses
      const [totalUsers, recentUsers, totalSubscribers, recentSubscribers] = await Promise.all([
        db
          .select({ count: count() })
          .from(users)
          .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`),
        db
          .select({ count: count() })
          .from(users)
          .where(and(
            gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
            sql`${users.email} IS NOT NULL AND ${users.email} != ''`
          )),
        db
          .select({ count: count() })
          .from(emailSubscribers)
          .where(eq(emailSubscribers.status, 'active')),
        db
          .select({ count: count() })
          .from(emailSubscribers)
          .where(and(
            eq(emailSubscribers.status, 'active'),
            gte(emailSubscribers.subscribedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          )),
      ]);

      return {
        totalUsers: totalUsers[0]?.count || 0,
        recentUsers: recentUsers[0]?.count || 0,
        totalSubscribers: totalSubscribers[0]?.count || 0,
        recentSubscribers: recentSubscribers[0]?.count || 0,
        emailsSentToday: 0, // TODO: Track email sends in database
        emailsSentThisMonth: 0, // TODO: Track email sends in database
        openRate: 0, // TODO: Implement email tracking
        clickRate: 0, // TODO: Implement email tracking
      };
    }),

  // Get email recipients for targeting
  getEmailRecipients: adminOnlyProcedure
    .input(z.object({
      segment: z.enum(['users', 'subscribers', 'all', 'none']).default('all'),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { segment, search, limit, offset } = input;

      // If segment is "none", return empty results as user will use custom emails
      if (segment === 'none') {
        return {
          recipients: [],
          totalCount: 0,
          hasMore: false,
          segments: {
            users: 0,
            subscribers: 0,
          },
        };
      }

      let usersQuery;
      let subscribersQuery;

      // Build search conditions
      const userSearchCondition = search ? or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      ) : undefined;

      const subscriberSearchCondition = search ? 
        like(emailSubscribers.email, `%${search}%`) : undefined;

      // Get users (registered users)
      if (segment === 'users' || segment === 'all') {
        const userWhereConditions = [
          sql`${users.email} IS NOT NULL AND ${users.email} != ''`
        ];
        if (userSearchCondition) {
          userWhereConditions.push(userSearchCondition);
        }

        usersQuery = db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            type: sql<'user'>`'user'`.as('type'),
            createdAt: users.createdAt,
          })
          .from(users)
          .where(and(...userWhereConditions))
          .orderBy(asc(users.email));
      }

      // Get email subscribers (homepage signups)
      if (segment === 'subscribers' || segment === 'all') {
        const subscriberWhereConditions = [
          eq(emailSubscribers.status, 'active')
        ];
        if (subscriberSearchCondition) {
          subscriberWhereConditions.push(subscriberSearchCondition);
        }

        subscribersQuery = db
          .select({
            id: emailSubscribers.id,
            name: sql<string | null>`NULL`.as('name'),
            email: emailSubscribers.email,
            type: sql<'subscriber'>`'subscriber'`.as('type'),
            createdAt: emailSubscribers.subscribedAt,
          })
          .from(emailSubscribers)
          .where(and(...subscriberWhereConditions))
          .orderBy(asc(emailSubscribers.email));
      }

      // Execute queries and combine results
      let allRecipients: Array<{
        id: string;
        name: string | null;
        email: string;
        type: 'user' | 'subscriber';
        createdAt: Date;
      }> = [];

      if (usersQuery && subscribersQuery) {
        const [userResults, subscriberResults] = await Promise.all([
          usersQuery,
          subscribersQuery
        ]);
        allRecipients = [...userResults, ...subscriberResults];
      } else if (usersQuery) {
        allRecipients = await usersQuery;
      } else if (subscribersQuery) {
        allRecipients = await subscribersQuery;
      }

      // Sort combined results by email
      allRecipients.sort((a, b) => a.email.localeCompare(b.email));

      // Apply pagination
      const totalCount = allRecipients.length;
      const paginatedRecipients = allRecipients.slice(offset, offset + limit);

      return {
        recipients: paginatedRecipients,
        totalCount,
        hasMore: offset + limit < totalCount,
        segments: {
          users: allRecipients.filter(r => r.type === 'user').length,
          subscribers: allRecipients.filter(r => r.type === 'subscriber').length,
        },
      };
    }),

  // EXPORT ANALYTICS ENDPOINTS - admin only

  // Get export statistics with timeframe filtering
  getExportStats: adminOnlyProcedure
    .input(z.object({ 
      timeframe: z.enum(['all', '30d', '7d', '24h']).default('30d') 
    }))
    .query(async ({ input }) => {
      const now = new Date();
      const timeframeFilter = 
        input.timeframe === '24h' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
        input.timeframe === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
        input.timeframe === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
        null;

      const whereCondition = timeframeFilter ? gte(exports.createdAt, timeframeFilter) : undefined;

      // Get basic stats
      const [
        totalExportsResult,
        successfulExportsResult,
        formatDistribution,
        avgDurationResult,
        totalMinutesResult
      ] = await Promise.all([
        // Total exports
        db.select({ count: count() }).from(exports).where(whereCondition),
        
        // Successful exports
        db.select({ count: count() })
          .from(exports)
          .where(and(whereCondition, eq(exports.status, 'completed'))),
        
        // Format distribution
        db.select({
          format: exports.format,
          count: count(),
        })
          .from(exports)
          .where(whereCondition)
          .groupBy(exports.format),
        
        // Average render duration (for successful exports)
        db.select({
          avgDuration: sql<number>`ROUND(AVG(EXTRACT(EPOCH FROM (${exports.completedAt} - ${exports.createdAt}))))::integer`
        })
          .from(exports)
          .where(and(whereCondition, eq(exports.status, 'completed'), sql`${exports.completedAt} IS NOT NULL`)),
        
        // Total video minutes exported
        db.select({
          totalMinutes: sql<number>`ROUND(SUM(${exports.duration}::float / 30 / 60))::integer`
        })
          .from(exports)
          .where(and(whereCondition, eq(exports.status, 'completed')))
      ]);

      const totalExports = totalExportsResult[0]?.count || 0;
      const successfulExports = successfulExportsResult[0]?.count || 0;
      const successRate = totalExports > 0 ? Math.round((successfulExports / totalExports) * 100) : 0;

      // Calculate format distribution percentages
      const formatDistributionWithPercentage = formatDistribution.reduce((acc, item) => {
        const percentage = totalExports > 0 ? Math.round((item.count / totalExports) * 100) : 0;
        acc[item.format] = {
          count: item.count,
          percentage
        };
        return acc;
      }, {} as Record<string, { count: number; percentage: number }>);

      // Calculate trends (comparing to previous period)
      let exportsTrend, successRateTrend;
      if (input.timeframe !== 'all') {
        const previousPeriodStart = 
          input.timeframe === '24h' ? new Date(now.getTime() - 48 * 60 * 60 * 1000) :
          input.timeframe === '7d' ? new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) :
          new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        const previousPeriodEnd = timeframeFilter!;

        const [prevTotalResult, prevSuccessResult] = await Promise.all([
          db.select({ count: count() })
            .from(exports)
            .where(and(gte(exports.createdAt, previousPeriodStart), sql`${exports.createdAt} < ${previousPeriodEnd}`)),
          
          db.select({ count: count() })
            .from(exports)
            .where(and(
              gte(exports.createdAt, previousPeriodStart),
              sql`${exports.createdAt} < ${previousPeriodEnd}`,
              eq(exports.status, 'completed')
            ))
        ]);

        const prevTotal = prevTotalResult[0]?.count || 0;
        const prevSuccess = prevSuccessResult[0]?.count || 0;
        const prevSuccessRate = prevTotal > 0 ? (prevSuccess / prevTotal) * 100 : 0;

        exportsTrend = prevTotal > 0 ? {
          value: Math.round(((totalExports - prevTotal) / prevTotal) * 100),
          isPositive: totalExports >= prevTotal
        } : undefined;

        successRateTrend = prevSuccessRate > 0 ? {
          value: Math.round(successRate - prevSuccessRate),
          isPositive: successRate >= prevSuccessRate
        } : undefined;
      }

      return {
        totalExports,
        successRate,
        avgDuration: avgDurationResult[0]?.avgDuration || 0,
        totalMinutesExported: totalMinutesResult[0]?.totalMinutes || 0,
        formatDistribution: formatDistributionWithPercentage,
        exportsTrend,
        successRateTrend
      };
    }),

  // Get recent exports with pagination
  getRecentExports: adminOnlyProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      timeframe: z.enum(['all', '30d', '7d', '24h']).default('30d'),
      status: z.enum(['all', 'completed', 'failed', 'rendering']).optional(),
      userId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;
      
      const now = new Date();
      const timeframeFilter = 
        input.timeframe === '24h' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
        input.timeframe === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
        input.timeframe === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
        null;

      const conditions = [];
      if (timeframeFilter) conditions.push(gte(exports.createdAt, timeframeFilter));
      if (input.status && input.status !== 'all') conditions.push(eq(exports.status, input.status));
      if (input.userId) conditions.push(eq(exports.userId, input.userId));

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      const [exportsList, totalCountResult] = await Promise.all([
        db.select({
          id: exports.id,
          userId: exports.userId,
          projectId: exports.projectId,
          renderId: exports.renderId,
          status: exports.status,
          progress: exports.progress,
          format: exports.format,
          quality: exports.quality,
          outputUrl: exports.outputUrl,
          fileSize: exports.fileSize,
          duration: exports.duration,
          error: exports.error,
          downloadCount: exports.downloadCount,
          createdAt: exports.createdAt,
          completedAt: exports.completedAt,
          // Join user info
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          // Join project info
          project: {
            id: projects.id,
            name: projects.title,
          }
        })
        .from(exports)
        .leftJoin(users, eq(exports.userId, users.id))
        .leftJoin(projects, eq(exports.projectId, projects.id))
        .where(whereCondition)
        .orderBy(desc(exports.createdAt))
        .limit(input.pageSize)
        .offset(offset),

        db.select({ count: count() })
          .from(exports)
          .where(whereCondition)
      ]);

      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / input.pageSize);

      return {
        exports: exportsList,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages,
          hasMore: input.page < totalPages
        }
      };
    }),
});