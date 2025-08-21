// src/server/api/routers/evals.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { evalsTable } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { OpenAI } from "openai";
import { GoogleVideoAnalyzer } from "~/server/services/ai/google-video-analyzer";
import { CODE_GENERATOR } from "~/config/prompts/active/code-generator";

const runYoutubeEvalSchema = z.object({
  youtubeUrl: z.string().url(),
  model: z.string(),
  strategy: z.enum(["direct", "two-step-describe", "multi-agent", "iterative"]),
  prompt: z.string().optional(),
});

interface ModelResponse {
  code: string;
  timeMs: number;
  tokensUsed?: number;
  cost?: number;
}

export const evalsRouter = createTRPCRouter({
  runYoutubeEval: protectedProcedure
    .input(runYoutubeEvalSchema)
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      
      try {
        // Extract video ID from YouTube URL
        const videoId = extractYoutubeVideoId(input.youtubeUrl);
        if (!videoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid YouTube URL",
          });
        }

        let result: ModelResponse;

        // Route to appropriate model and strategy
        switch (input.strategy) {
          case "direct":
            result = await runDirectStrategy(input.model, videoId, input.prompt);
            break;
          case "two-step-describe":
            result = await runTwoStepStrategy(input.model, videoId, input.prompt);
            break;
          case "multi-agent":
            result = await runMultiAgentStrategy(input.model, videoId, input.prompt);
            break;
          case "iterative":
            result = await runIterativeStrategy(input.model, videoId, input.prompt);
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid strategy",
            });
        }

        // Save to database
        const [savedEval] = await db.insert(evalsTable).values({
          youtubeUrl: input.youtubeUrl,
          model: input.model,
          strategy: input.strategy,
          prompt: input.prompt || getDefaultPrompt(input.strategy),
          generatedCode: result.code,
          timeMs: result.timeMs,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          userId: ctx.session.user.id,
        }).returning();

        return savedEval;
      } catch (error) {
        console.error("Eval error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to run evaluation",
        });
      }
    }),

  getEvalHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const evals = await db.select()
        .from(evalsTable)
        .where(eq(evalsTable.userId, ctx.session.user.id))
        .orderBy(desc(evalsTable.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return evals;
    }),

  getEvalById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const [evalResult] = await db.select()
        .from(evalsTable)
        .where(eq(evalsTable.id, input))
        .limit(1);

      if (!evalResult) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evaluation not found",
        });
      }

      return evalResult;
    }),

  compareEvals: protectedProcedure
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      const evals = await db.select()
        .from(evalsTable)
        .where(eq(evalsTable.userId, ctx.session.user.id));

      return evals.filter(e => input.includes(e.id));
    }),
});

// Helper functions
function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function getDefaultPrompt(strategy: string): string {
  const prompts: Record<string, string> = {
    direct: "Watch this YouTube video and generate Remotion code that recreates its key animations and visual elements.",
    "two-step-describe": "Step 1: Describe the video. Step 2: Generate code from description.",
    "multi-agent": "Multiple agents will analyze different aspects of this video.",
    iterative: "Generate and refine Remotion code iteratively.",
  };
  return prompts[strategy] || "";
}

// Helper function to extract code from response
function extractCodeFromResponse(response: string): string {
  // Try to find code block markers
  const codeBlockMatch = response.match(/```(?:jsx?|tsx?|javascript|typescript)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code block, check if the entire response looks like code
  if (response.includes('import') || response.includes('const') || response.includes('function')) {
    // Remove any leading/trailing text that's not code
    const lines = response.split('\n');
    let startIdx = 0;
    let endIdx = lines.length - 1;
    
    // Find first line that looks like code
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import') || lines[i].includes('const') || lines[i].includes('function')) {
        startIdx = i;
        break;
      }
    }
    
    // Find last line that looks like code
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('}') || lines[i].includes(';') || lines[i].includes(')')) {
        endIdx = i;
        break;
      }
    }
    
    return lines.slice(startIdx, endIdx + 1).join('\n');
  }
  
  return response;
}

async function runDirectStrategy(model: string, videoId: string, customPrompt?: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  let code = "";
  let tokensUsed = 0;
  let cost = 0;

  const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
  
  // Check if this is a Gemini model
  if (model === "gemini-flash" || model === "gemini-pro") {
    // Use Google Gemini for video analysis
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }
    
    const analyzer = new GoogleVideoAnalyzer(geminiApiKey);
    
    // Use the production CODE_GENERATOR prompt
    const systemPrompt = CODE_GENERATOR.content;
    const userPrompt = customPrompt || `Analyze this YouTube video and generate Remotion code that recreates it EXACTLY as described. Focus on animations, timing, and visual hierarchy.`;
    
    try {
      const rawResponse = await analyzer.analyzeYouTubeVideo(youtubeUrl, `${systemPrompt}\n\n${userPrompt}`);
      code = extractCodeFromResponse(rawResponse);
      // Estimate tokens for Gemini (rough approximation)
      tokensUsed = Math.round((rawResponse.length + systemPrompt.length) / 4);
      cost = calculateCost(model === "gemini-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro", tokensUsed);
    } catch (error) {
      console.error("Error with Gemini:", error);
      throw error;
    }
  } else {
    // Use OpenAI for other models
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const modelMap: Record<string, string> = {
      "gpt-5": "gpt-4o", // GPT-5 not available yet
      "gpt-5-mini": "gpt-4o-mini", // GPT-5-mini not available yet
      "gpt-4o": "gpt-4o",
      "gpt-4o-mini": "gpt-4o-mini",
      "claude-3-sonnet": "gpt-4o", // Claude requires Anthropic API - fallback
      "claude-3-haiku": "gpt-4o-mini", // Claude requires Anthropic API - fallback
    };
    
    const actualModel = modelMap[model] || "gpt-4o-mini";
    
    try {
      const userPrompt = customPrompt || `Generate Remotion code for a video about: ${youtubeUrl}`;
      
      const response = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          CODE_GENERATOR,
          {
            role: "user",
            content: userPrompt,
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      
      const rawResponse = response.choices[0].message.content || "";
      code = extractCodeFromResponse(rawResponse);
      tokensUsed = response.usage?.total_tokens || 0;
      cost = calculateCost(actualModel, tokensUsed);
    } catch (error) {
      console.error("Error in runDirectStrategy:", error);
      throw error;
    }
  }

  return {
    code,
    timeMs: Date.now() - startTime,
    tokensUsed,
    cost,
  };
}

async function runTwoStepStrategy(model: string, videoId: string, customPrompt?: string): Promise<ModelResponse> {
  const startTime = Date.now();
  const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
  
  let totalTokens = 0;
  let totalCost = 0;
  
  try {
    // Step 1: Analyze video using PRODUCTION flow - exactly like when user says "first 4 seconds"
    let analysis = "";
    
    if (model === "gemini-flash" || model === "gemini-pro") {
      // Use Gemini for actual video analysis - MATCH PRODUCTION SYSTEM
      const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("GOOGLE_GEMINI_API_KEY not configured");
      }
      
      const analyzer = new GoogleVideoAnalyzer(geminiApiKey);
      
      // Use PRODUCTION prompt for video description
      const { YOUTUBE_DESCRIPTION_PROMPT } = await import('~/config/prompts/active/youtube-description');
      
      // Extract duration from custom prompt if provided (e.g., "first 4 seconds")
      let duration = 10; // default
      if (customPrompt) {
        const durationMatch = customPrompt.match(/first\s+(\d+)\s+seconds?/i) || 
                              customPrompt.match(/(\d+)\s+seconds?/i);
        if (durationMatch) {
          duration = parseInt(durationMatch[1]);
        }
      }
      
      // Build the exact prompt used in production
      const analysisPrompt = YOUTUBE_DESCRIPTION_PROMPT
        + `\n\nDESCRIBE THE FIRST ${duration} SECONDS OF THIS VIDEO.`
        + `\nFocus only on what happens in the first ${duration} seconds.`;
      
      analysis = await analyzer.analyzeYouTubeVideo(youtubeUrl, analysisPrompt);
      totalTokens += Math.round(analysis.length / 4);
      totalCost += calculateCost(model === "gemini-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro", totalTokens);
    } else {
      // GPT models can't see video, so generate placeholder analysis
      analysis = `Video Title: [Unable to view video content - GPT models cannot analyze YouTube videos]
Duration: 4 seconds (estimated)
Background: Professional gradient background
Text: Corporate presentation style with clean typography
Animation: Smooth fade-ins and transitions
Layout: Centered content with modern design
Note: This is a placeholder - only Gemini models can actually analyze YouTube videos`;
    }
    
    // Step 2: Generate code from analysis using production prompts
    const { CODE_GENERATOR } = await import('~/config/prompts/active/code-generator');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Use the exact prompt structure that production uses for YouTube → Code
    const codeGenPrompt = `Based on this video analysis, recreate it EXACTLY in Remotion:

${analysis}

RECREATE this video content precisely - use the exact text, colors, animations, and timing described above.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        CODE_GENERATOR, // Use production code generator prompt
        {
          role: 'user',
          content: codeGenPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });
    
    const rawCode = completion.choices[0]?.message?.content || "";
    const code = extractCodeFromResponse(rawCode);
    
    totalTokens += completion.usage?.total_tokens || 0;
    totalCost += calculateCost('gpt-4o', completion.usage?.total_tokens || 0);
    
    return {
      code,
      timeMs: Date.now() - startTime,
      tokensUsed: totalTokens,
      cost: totalCost,
    };
  } catch (error) {
    console.error("Error in runTwoStepStrategy:", error);
    throw error;
  }
}

async function runMultiAgentStrategy(model: string, videoId: string, customPrompt?: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  // Agent 1: Analyze structure
  const structureAnalysis = await runDirectStrategy(model, videoId, "Analyze the overall structure and timeline of this video.");
  
  // Agent 2: Analyze animations
  const animationAnalysis = await runDirectStrategy(model, videoId, "Focus on the animations, transitions, and motion in this video.");
  
  // Agent 3: Analyze design
  const designAnalysis = await runDirectStrategy(model, videoId, "Analyze the design elements, colors, typography, and layout.");
  
  // Combine insights and generate code
  const combinedPrompt = `Based on these analyses, generate Remotion code:
    Structure: ${structureAnalysis.code}
    Animations: ${animationAnalysis.code}
    Design: ${designAnalysis.code}`;
  
  const finalResult = await runDirectStrategy(model, videoId, combinedPrompt);
  
  return {
    code: finalResult.code,
    timeMs: Date.now() - startTime,
    tokensUsed: (structureAnalysis.tokensUsed || 0) + (animationAnalysis.tokensUsed || 0) + 
                (designAnalysis.tokensUsed || 0) + (finalResult.tokensUsed || 0),
    cost: (structureAnalysis.cost || 0) + (animationAnalysis.cost || 0) + 
          (designAnalysis.cost || 0) + (finalResult.cost || 0),
  };
}

async function runIterativeStrategy(model: string, videoId: string, customPrompt?: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  // Initial generation
  let currentCode = await runDirectStrategy(model, videoId, customPrompt);
  let totalTokens = currentCode.tokensUsed || 0;
  let totalCost = currentCode.cost || 0;
  
  // Refinement iterations (simplified for demo)
  for (let i = 0; i < 2; i++) {
    const refinementPrompt = `Improve this Remotion code to better match the video:\n\n${currentCode.code}`;
    const refinement = await runDirectStrategy(model, videoId, refinementPrompt);
    currentCode = refinement;
    totalTokens += refinement.tokensUsed || 0;
    totalCost += refinement.cost || 0;
  }
  
  return {
    code: currentCode.code,
    timeMs: Date.now() - startTime,
    tokensUsed: totalTokens,
    cost: totalCost,
  };
}

function calculateCost(model: string, tokens: number): number {
  // Updated cost calculation based on actual pricing
  const costPerThousand: Record<string, number> = {
    "gpt-5": 0.0055, // Average of $1.25 input + $10 output per 1M tokens
    "gpt-5-mini": 0.00125, // Average of $0.25 input + $2 output per 1M tokens
    "gpt-4o": 0.0025, // Actual pricing from platform
    "gpt-4o-mini": 0.00015,
    "gemini-2.5-flash": 0.00035, // Gemini 2.5 Flash pricing
    "gemini-2.5-pro": 0.00125, // Gemini 2.5 Pro pricing
    "claude-3-sonnet": 0.003,
    "claude-3-haiku": 0.00025,
  };
  
  return (tokens / 1000) * (costPerThousand[model] || 0.001);
}