import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { projects, messages } from "@bazaar/database";
import { eq, desc } from "drizzle-orm";

export const chatRouter = createTRPCRouter({
    /**
     * Fetches recent messages for a given project.
     * Used by ChatPanelG component for displaying chat history.
     */
    getMessages: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            limit: z.number().int().min(1).max(100).optional().default(50),
        }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                columns: { id: true, userId: true },
                where: eq(projects.id, input.projectId),
            });
            if (!project || project.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied." });
            }
            const messageHistory = await ctx.db.query.messages.findMany({
                where: eq(messages.projectId, input.projectId),
                orderBy: [desc(messages.sequence)],
                limit: input.limit,
                columns: {
                    id: true,
                    projectId: true,
                    content: true,
                    role: true,
                    kind: true,
                    imageUrls: true,
                    createdAt: true,
                    sequence: true,
                },
            });
            return messageHistory.reverse();
        }),
});