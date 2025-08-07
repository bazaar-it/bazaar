import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GoogleVideoAnalyzer, MOTION_GRAPHICS_ANALYSIS_PROMPT } from "../../services/ai/google-video-analyzer";
import { env } from "../../../env";
import { db } from "../../db";
import { messages } from "../../db/schema";

export const youtubeAnalysisIntegrationRouter = createTRPCRouter({
  analyzeAndInjectIntoChat: protectedProcedure
    .input(z.object({
      youtubeUrl: z.string().url(),
      projectId: z.string(),
      chatId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Step 1: Analyze the YouTube video with Gemini
        const analyzer = new GoogleVideoAnalyzer(env.GOOGLE_GEMINI_API_KEY!);
        const analysis = await analyzer.analyzeYouTubeVideo(
          input.youtubeUrl,
          MOTION_GRAPHICS_ANALYSIS_PROMPT
        );

        // Step 2: Create a message in the chat with the analysis
        // This simulates the user pasting the analysis into the chat
        const userMessage = await db.insert(messages).values({
          id: crypto.randomUUID(),
          chatId: input.chatId,
          role: "user",
          content: `Create a motion graphics video based on this detailed analysis of a YouTube video:\n\n${analysis}\n\nIMPORTANT: Reproduce this video as accurately as possible, matching all animations, timing, colors, and visual elements exactly as described.`,
          timestamp: new Date(),
          userId: ctx.session.user.id,
        }).returning();

        // The existing chat system will now handle this message
        // and generate the code using your existing Sonnet 3.5 pipeline
        
        return {
          success: true,
          messageId: userMessage[0]?.id,
          analysis: analysis,
        };
      } catch (error) {
        console.error("YouTube analysis integration error:", error);
        throw error;
      }
    }),
});