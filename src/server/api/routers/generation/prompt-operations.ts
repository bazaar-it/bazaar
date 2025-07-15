import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { openai } from "~/server/lib/openai";

/**
 * ENHANCE PROMPT - Expands user prompts into detailed motion graphics instructions
 * 
 * Uses GPT-4.1-nano (fastest model) to transform simple user prompts into comprehensive
 * motion graphics specifications with animation details, visual styles,
 * timing, and effects.
 */
export const enhancePrompt = protectedProcedure
  .input(z.object({
    prompt: z.string().min(1).max(1000),
    videoFormat: z.object({
      width: z.number().optional().default(1920),
      height: z.number().optional().default(1080),
      format: z.enum(['landscape', 'portrait', 'square']).optional().default('landscape'),
    }).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { prompt, videoFormat } = input;
    const userId = ctx.session.user.id;

    console.log(`[EnhancePrompt] Starting prompt enhancement for user ${userId}`, {
      originalPrompt: prompt,
      videoFormat,
    });

    try {
      // System prompt for motion graphics enhancement
      const systemPrompt = `You are an expert motion graphics designer for software demo videos. Transform this user prompt into a detailed creative brief for their motion graphics video.

IMPORTANT: Do not respond conversationally or acknowledge the user. Simply enhance their prompt into a more detailed creative description.

Take their idea and expand it by adding:
- Visual style and aesthetic that matches their tone
- User interface elements and interactions
- icons, avatars, and logos
- mobile or laptop frames
- Specific animation techniques, timing, and effects
- Layout and composition details
- Special effects, particles, or elements that enhance the concept

${videoFormat?.format === 'portrait' ? 'Optimize for vertical mobile viewing with bold, readable elements.' : 
  videoFormat?.format === 'square' ? 'Design for social media with balanced, eye-catching composition.' : 
  'Create for desktop viewing with dynamic horizontal layouts.'}

Write as a direct creative brief, not a conversation. If they say "make it faster", enhance it to "Create fast-paced motion graphics with rapid transitions..." instead of "Absolutely! Let's make it faster..."

Transform their input into 100-200 words of detailed motion graphics direction.`;

      // Call OpenAI to enhance the prompt using GPT-4.1-nano (fastest model)
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano-2025-04-14",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 500,
      });

      const enhancedPrompt = completion.choices[0]?.message?.content;

      if (!enhancedPrompt) {
        throw new Error("Failed to generate enhanced prompt");
      }

      console.log(`[EnhancePrompt] Successfully enhanced prompt`, {
        originalLength: prompt.length,
        enhancedLength: enhancedPrompt.length,
        model: "gpt-4.1-nano-2025-04-14",
      });

      return {
        success: true,
        originalPrompt: prompt,
        enhancedPrompt,
        metadata: {
          model: "gpt-4.1-nano-2025-04-14",
          videoFormat,
          enhancementRatio: Math.round((enhancedPrompt.length / prompt.length) * 100) / 100,
        },
      };

    } catch (error) {
      console.error(`[EnhancePrompt] Error enhancing prompt:`, error);
      
      // Fallback to original prompt on error
      return {
        success: false,
        originalPrompt: prompt,
        enhancedPrompt: prompt, // Return original if enhancement fails
        error: error instanceof Error ? error.message : "Failed to enhance prompt",
        metadata: {
          model: "gpt-4.1-nano-2025-04-14",
          videoFormat,
          enhancementRatio: 1,
        },
      };
    }
  });