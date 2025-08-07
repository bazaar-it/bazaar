// Video Analysis Router for Google Gemini Integration
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GoogleVideoAnalyzer, MOTION_GRAPHICS_ANALYSIS_PROMPT } from "../../services/ai/google-video-analyzer";
import { YouTubeToCodeConverter, youtubeToCodeSchema } from "../../../tools/youtube/youtube-to-code";
import { GoogleVideoToCode } from "../../services/ai/google-video-to-code";
import { env } from "../../../env";

const analyzeVideoSchema = z.object({
  source: z.enum(["youtube", "upload"]),
  url: z.string().optional(),
  filePath: z.string().optional(),
  customPrompt: z.string().optional(),
  duration: z.number().default(10) // Seconds to analyze
});

export const videoAnalysisRouter = createTRPCRouter({
  analyzeVideo: protectedProcedure
    .input(analyzeVideoSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Initialize Google Video Analyzer
        const analyzer = new GoogleVideoAnalyzer(env.GOOGLE_GEMINI_API_KEY);
        
        // Use custom prompt or default motion graphics prompt
        const systemPrompt = input.customPrompt || MOTION_GRAPHICS_ANALYSIS_PROMPT;
        
        let analysis: string;
        
        if (input.source === "youtube" && input.url) {
          // Analyze YouTube video directly
          analysis = await analyzer.analyzeYouTubeVideo(input.url, systemPrompt);
        } else if (input.source === "upload" && input.filePath) {
          // Analyze uploaded video
          analysis = await analyzer.analyzeUploadedVideo(input.filePath, systemPrompt);
        } else {
          throw new Error("Invalid input: missing URL or file path");
        }
        
        // Parse the analysis to extract structured data
        const parsedAnalysis = parseVideoAnalysis(analysis);
        
        // Convert to Bazaar-compatible format
        const bazaarPrompt = convertToBazaarPrompt(parsedAnalysis);
        
        return {
          rawAnalysis: analysis,
          parsedAnalysis,
          bazaarPrompt,
          success: true
        };
      } catch (error) {
        console.error("Video analysis error:", error);
        throw new Error("Failed to analyze video");
      }
    }),
    
  testYouTubeAnalysis: protectedProcedure
    .input(z.object({
      youtubeUrl: z.string().url()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const analyzer = new GoogleVideoAnalyzer(env.GOOGLE_GEMINI_API_KEY);
        
        // Test with the ElevenLabs example
        const analysis = await analyzer.analyzeYouTubeVideo(
          input.youtubeUrl,
          MOTION_GRAPHICS_ANALYSIS_PROMPT
        );
        
        return {
          analysis,
          success: true
        };
      } catch (error) {
        console.error("Test analysis error:", error);
        throw error;
      }
    }),
    
  // Direct YouTube to Remotion code conversion
  youtubeToCode: protectedProcedure
    .input(youtubeToCodeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if Google API key is configured
        if (!env.GOOGLE_GEMINI_API_KEY) {
          throw new Error("Google Gemini API key not configured");
        }
        
        const converter = new YouTubeToCodeConverter();
        const result = await converter.convert(input);
        
        if (!result.success) {
          throw new Error(result.error || "Conversion failed");
        }
        
        return {
          success: true,
          code: result.code,
          analysis: result.analysis,
        };
      } catch (error) {
        console.error("YouTube to code conversion error:", error);
        throw error;
      }
    }),
    
  // Direct YouTube to Code with Gemini (no intermediate analysis)
  directYouTubeToCode: protectedProcedure
    .input(z.object({
      youtubeUrl: z.string().url()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if Google API key is configured
        if (!env.GOOGLE_GEMINI_API_KEY) {
          throw new Error("Google Gemini API key not configured");
        }
        
        const converter = new GoogleVideoToCode(env.GOOGLE_GEMINI_API_KEY);
        const code = await converter.convertYouTubeToCode(input.youtubeUrl);
        
        // Clean up the response - extract just the code
        const codeMatch = code.match(/```(?:javascript|js|jsx)?\n([\s\S]*?)```/);
        const cleanCode = codeMatch ? codeMatch[1] : code;
        
        return {
          success: true,
          code: cleanCode,
        };
      } catch (error) {
        console.error("Direct YouTube to code error:", error);
        throw error;
      }
    })
});

// Helper function to parse the video analysis
function parseVideoAnalysis(analysis: string) {
  // This would parse the structured analysis from Gemini
  // For now, return the raw analysis
  return {
    scenes: [],
    rawText: analysis
  };
}

// Convert analysis to Bazaar-compatible prompt
function convertToBazaarPrompt(parsedAnalysis: any): string {
  // This would convert the Gemini analysis to a prompt
  // that Bazaar can use to generate similar video
  return `Create a motion graphics video based on the following analysis:\n\n${parsedAnalysis.rawText}`;
}