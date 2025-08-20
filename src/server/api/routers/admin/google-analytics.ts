import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { googleAnalyticsService } from "~/server/services/google-analytics.service";
import { TRPCError } from "@trpc/server";

export const googleAnalyticsRouter = createTRPCRouter({
  // Check if Google Analytics is configured
  isConfigured: protectedProcedure
    .query(async ({ ctx }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      return {
        isConfigured: googleAnalyticsService.isServiceConfigured()
      };
    }),

  // Get country data from Google Analytics
  getCountryData: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getCountryData(input.timeframe);
      return data;
    }),

  // Get page views data
  getPageViews: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getPageViews(input.timeframe);
      return data;
    }),

  // Get traffic sources
  getTrafficSources: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getTrafficSources(input.timeframe);
      return data;
    }),

  // Get device categories
  getDeviceCategories: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getDeviceCategories(input.timeframe);
      return data;
    }),

  // Get realtime users
  getRealtimeUsers: protectedProcedure
    .query(async ({ ctx }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getRealtimeUsers();
      return data;
    }),

  // Get time series data
  getTimeSeries: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d'),
      metric: z.enum(['users', 'sessions', 'pageViews']).default('users')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      const data = await googleAnalyticsService.getTimeSeries(input.timeframe, input.metric);
      return data;
    }),

  // Get all analytics data at once (for dashboard)
  getDashboardData: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['7d', '30d']).default('7d')
    }))
    .query(async ({ ctx, input }) => {
      // Check admin access
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id)
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required"
        });
      }

      // Fetch all data in parallel for efficiency
      const [countries, pageViews, trafficSources, devices, realtimeUsers, timeSeries] = await Promise.all([
        googleAnalyticsService.getCountryData(input.timeframe),
        googleAnalyticsService.getPageViews(input.timeframe),
        googleAnalyticsService.getTrafficSources(input.timeframe),
        googleAnalyticsService.getDeviceCategories(input.timeframe),
        googleAnalyticsService.getRealtimeUsers(),
        googleAnalyticsService.getTimeSeries(input.timeframe, 'users')
      ]);

      return {
        countries,
        pageViews,
        trafficSources,
        devices,
        realtimeUsers,
        timeSeries,
        isConfigured: googleAnalyticsService.isServiceConfigured()
      };
    })
});