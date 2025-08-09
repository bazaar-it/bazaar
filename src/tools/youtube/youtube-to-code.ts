import OpenAI from 'openai';
import { z } from 'zod';
import { YOUTUBE_TO_REMOTION_STRICT } from '~/config/prompts/active/youtube-to-remotion-strict';
import { GoogleVideoAnalyzer, MOTION_GRAPHICS_ANALYSIS_PROMPT } from '~/server/services/ai/google-video-analyzer';
import { env } from '~/env';

// Schema for YouTube video analysis request
export const youtubeToCodeSchema = z.object({
  youtubeUrl: z.string().url(),
  customAnalysisPrompt: z.string().optional(),
  projectFormat: z.enum(['landscape', 'portrait', 'square']).default('landscape'),
});

export type YouTubeToCodeInput = z.infer<typeof youtubeToCodeSchema>;

interface YouTubeToCodeOutput {
  success: boolean;
  code?: string;
  analysis?: string;
  error?: string;
}

/**
 * Direct YouTube video to Remotion code converter
 * Bypasses the brain orchestrator for faithful reproduction
 */
export class YouTubeToCodeConverter {
  private openai: OpenAI;
  private googleAnalyzer: GoogleVideoAnalyzer;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    this.googleAnalyzer = new GoogleVideoAnalyzer(env.GOOGLE_GEMINI_API_KEY!);
  }

  async convert(input: YouTubeToCodeInput): Promise<YouTubeToCodeOutput> {
    try {
      console.log('[YouTube-to-Code] Starting conversion for:', input.youtubeUrl);

      // Step 1: Analyze the YouTube video with Google Gemini
      const analysisPrompt = input.customAnalysisPrompt || MOTION_GRAPHICS_ANALYSIS_PROMPT;
      const analysis = await this.googleAnalyzer.analyzeYouTubeVideo(
        input.youtubeUrl,
        analysisPrompt
      );

      console.log('[YouTube-to-Code] Analysis complete, generating code...');

      // Step 2: Convert analysis to Remotion code
      const codeGenPrompt = this.buildCodeGenPrompt(analysis, input.projectFormat);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          YOUTUBE_TO_REMOTION_STRICT,
          {
            role: 'user',
            content: codeGenPrompt
          }
        ],
        temperature: 0.1, // Low temperature for faithful reproduction
        max_tokens: 16000,
        response_format: { type: "text" }
      });

      const code = completion.choices[0]?.message?.content;
      
      if (!code) {
        throw new Error('No code generated from analysis');
      }

      console.log('[YouTube-to-Code] Code generation complete');

      return {
        success: true,
        code,
        analysis,
      };
    } catch (error) {
      console.error('[YouTube-to-Code] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildCodeGenPrompt(analysis: string, format: string): string {
    const formatSpecs = {
      landscape: { width: 1920, height: 1080 },
      portrait: { width: 1080, height: 1920 },
      square: { width: 1080, height: 1080 },
    };

    const { width, height } = formatSpecs[format as keyof typeof formatSpecs];

    return `Convert the following video analysis into Remotion code for a ${format} video (${width}x${height}).

Video Analysis:
${analysis}

Technical Requirements:
- Export format: ${format} (${width}x${height})
- Frame rate: 30fps
- Use exact timings from analysis
- Include all visual effects mentioned
- Maintain precise animation parameters

Generate the complete Remotion component code.`;
  }
}