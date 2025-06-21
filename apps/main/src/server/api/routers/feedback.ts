// src/server/api/routers/feedback.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "@bazaar/database";
import { feedback as feedbackTable } from "@bazaar/database";

export const feedbackInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({
    message: "Invalid email address"
  }).optional().or(z.literal('')), // Allow empty string and treat as undefined later
  content: z.string().optional(),
  prioritizedFeatures: z.array(z.string()).optional(),
});

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(feedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      try {
        await db.insert(feedbackTable).values({
          name: input.name,
          // Treat empty string email as null
          email: input.email === '' ? undefined : input.email,
          content: input.content,
          prioritizedFeatures: input.prioritizedFeatures,
          userId: userId ?? null, // Link to user if logged in, otherwise null
          status: 'new',
        });
        return { success: true, message: "Feedback submitted successfully." };
      } catch (error) {
        console.error("Failed to submit feedback:", error);
        // Consider throwing a TRPCError for client-side handling
        // For now, returning a generic error message or rethrowing
        throw new Error("Failed to submit feedback. Please try again later.");
      }
    }),
});
