import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { UsageService } from "~/server/services/usage/usage.service";

export const usageRouter = createTRPCRouter({
  getPromptUsage: protectedProcedure
    .query(async ({ ctx }) => {
      const usage = await UsageService.getTodayPromptUsage(ctx.session.user.id);
      return usage;
    }),
});