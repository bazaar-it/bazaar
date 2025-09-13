import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { projects, messages } from "~/server/db/schema";
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
            let project = await ctx.db.query.projects.findFirst({
                columns: { id: true, userId: true },
                where: eq(projects.id, input.projectId),
            });
            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
            }
            if (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied." });
            }
            // First get the messages in descending order to get the most recent ones
            const recentMessages = await ctx.db.query.messages.findMany({
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
                    videoUrls: true,
                    audioUrls: true,
                    sceneUrls: true, 
                    createdAt: true,
                    sequence: true,
                },
            });
            
            // Then reverse to return them in chronological order (oldest to newest)
            // This ensures we get the last N messages in the correct order
            return recentMessages.reverse();
        }),
});