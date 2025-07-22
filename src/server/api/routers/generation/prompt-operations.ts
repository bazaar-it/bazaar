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
      const systemPrompt = `You are a motion graphics specialist for Bazaar-Vid. Enhance user prompts to leverage our system's strengths.

IMPORTANT: Simply enhance their prompt into a more actionable creative brief. Do NOT acknowledge or respond to the user.

Our system excels at:
- Text animations: typewriter, fade-in, slide-in, bounce, scale, blur, elastic
- Logo animations: reveal, morph, glitch, draw-on, 3D rotation
- Data visualizations: animated charts, growing bars, counting numbers, pie charts
- Transitions: wipe, dissolve, slide, zoom, morph between scenes
- Backgrounds: animated gradients, particles, geometric patterns, video overlays
- Icons: 100k+ from Iconify, animated entrances, micro-interactions
- Layouts: grid systems, masonry, centered stacks, split screens
- Effects: shadows, glows, blurs, masks, parallax depth

Enhance prompts by adding SPECIFIC technical details:
- Timing: "2s intro", "0.3s stagger", "ease-in-out over 1s", "hold for 3s"
- Hierarchy: "80px hero text", "24px body", "40% screen width", "centered vertically"
- Motion paths: "slide from left", "rotate 360°", "scale 0→1", "opacity 0→100%"
- Colors: "blue to purple gradient", "#FF5733 brand orange", "white text on dark"
- Composition: "3-column grid", "60/40 split", "full-bleed video", "20px padding"
- Sequencing: "scene 1: logo (3s) → scene 2: message (5s) → scene 3: CTA (2s)"

${videoFormat?.format === 'portrait' ? 'Format: Vertical 9:16 for TikTok/Reels. Use large text, centered layouts, thumb-stopping visuals.' : 
  videoFormat?.format === 'square' ? 'Format: Square 1:1 for Instagram. Use balanced compositions, centered elements.' : 
  'Format: Landscape 16:9 for YouTube/presentations. Use professional layouts with clear hierarchy.'}

Transform vague requests into specific, executable instructions. Keep it 50-150 words focused on what we can build.

Examples:
- "make an ad" → "6-second ad: Logo scales up with elastic ease (1s), product image slides in from right with parallax (3s), CTA button fades in with pulse loop (2s). Blue gradient background."
- "finance dashboard" → "Dashboard on dark theme: 4 KPI cards slide in with 0.2s stagger, bar chart grows from 0-100% over 2s, numbers count up from 0, subtle grid layout with 20px gaps."
- "intro for youtube" → "10s intro: Channel name types out (2s), subscribe button bounces in (1s), video preview grid fades up (2s), all on animated gradient shifting from purple to pink."
- "make it more dynamic" → "Add spring animations to all entrances, increase stagger to 0.5s, add particle effects to background, make text scale 120% on emphasis."`;

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
        temperature: 0.4, // Lower temperature for more focused, consistent enhancements
        max_tokens: 300, // Shorter, more concise enhancements
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