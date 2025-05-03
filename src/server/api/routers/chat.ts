// src/server/api/routers/chat.ts

import { z } from "zod";
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects, patches, messages, customComponentJobs } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionToolChoiceOption } from "openai/resources/chat/completions";
import { generateComponentCode } from "~/server/workers/generateComponentCode";

// --- OpenAI Function Schema for JSON Patch ---
const applyPatchTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "applyJsonPatch",
  description: "Apply a JSON-Patch to the video state. Always return an object with an 'operations' array of RFC-6902 patch operations.",
    parameters: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          description: "RFC-6902 JSON Patch operations to apply to the video state.",
          items: {
            type: "object",
            properties: {
              op: { type: "string", enum: ["add", "remove", "replace"] },
              path: { type: "string" },
              value: {}
            },
            required: ["op", "path"]
          }
        }
      },
      required: ["operations"]
    }
  }
};

// --- Additional OpenAI Function Schema for requesting brand-new Remotion components ---
const generateRemotionComponentTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "generateRemotionComponent",
    description:
      "Queue the generation of a brand-new Remotion effect. Use when the requested change cannot be expressed via JSON-Patch alone.",
    parameters: {
      type: "object",
      required: ["effectDescription"],
      properties: {
        effectDescription: {
          type: "string",
          description: "Natural-language description of the desired effect",
        },
      },
    },
  },
} as const;

/**
 * Process a user message within a project context, handling both standard video updates
 * and custom component generation requests
 */
export async function processUserMessageInProject(ctx: any, projectId: string, message: string) {
  try {
    // 1. Fetch current props and validate ownership
    const [project] = await ctx.db
      .select({ props: projects.props, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    if (project.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
    }

    // 2. Store the user's message
    const [userMessage] = await ctx.db
      .insert(messages)
      .values({ projectId, content: message, role: "user" })
      .returning();

    if (!userMessage) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save user message" });
    }

    // 2.5. Decide handling strategy – rely on OpenAI function calls (legacy heuristics removed)
    const llmRequestPayload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a Remotion video assistant. Decide whether to apply a JSON patch or request a new custom component. When modifying the existing video, call applyJsonPatch. If a brand-new visual effect is needed, call generateRemotionComponent.",
        },
        {
          role: "user",
          content: JSON.stringify({ inputProps: project.props, request: message }),
        },
      ] as ChatCompletionMessageParam[],
      tools: [applyPatchTool, generateRemotionComponentTool],
      tool_choice: "auto" as ChatCompletionToolChoiceOption,
    };

    // 3. Call the LLM to get a JSON patch
    const llmResp = await openai.chat.completions.create(llmRequestPayload);

    // -----------------------------------------------------------
    // 4. Branch on LLM response: patch vs. component generation
    // -----------------------------------------------------------
    const msgResp = llmResp.choices[0]?.message;
    if (!msgResp) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned no choices" });
    }

    // Content string for JSON parsing
    let contentString: string | null = null;
    
    // a) The LLM requested a function via tool_calls
    if (msgResp.tool_calls && msgResp.tool_calls.length > 0) {
      const toolCall = msgResp.tool_calls[0];
      
      // Ensure toolCall exists and has function property
      if (toolCall && toolCall.function) {
        if (toolCall.function.name === "generateRemotionComponent") {
          const args = JSON.parse(toolCall.function.arguments ?? "{}");
          const description = args.effectDescription ?? message;
          console.log("[LLM] generateRemotionComponent requested:", description);
          return await handleCustomComponentRequest(ctx, projectId, description, userMessage.id);
        }
        
        if (toolCall.function.name === "applyJsonPatch") {
          contentString = toolCall.function.arguments ?? null;
        }
      }
    } else {
      // b) Fallback to content in case no tool was called
      contentString = msgResp.content ?? null;
    }

    // --- LOG: Raw LLM response ---
    console.log("[LLM PATCH] Raw LLM response:", contentString);
    console.log("[LLM PATCH] Tool calls:", JSON.stringify(msgResp.tool_calls, null, 2));
    if (!contentString) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "LLM returned empty response" });
    }

    const content = JSON.parse(contentString as string);
    // --- LOG: Parsed operations array ---
    console.log("[LLM PATCH] Parsed operations:", JSON.stringify(content.operations, null, 2));
    if (!content.operations) {
      console.error("LLM response missing operations property. Full response:", contentString);
      throw new TRPCError({ code: "BAD_REQUEST", message: "LLM response missing operations property" });
    }

    const parsed = jsonPatchSchema.safeParse(content.operations);
    // --- LOG: Patch schema validation result ---
    if (!parsed.success) {
      console.error("[LLM PATCH] Invalid patch format:", parsed.error);
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid patch format" });
    } else {
      console.log("[LLM PATCH] Patch schema validation succeeded.");
    }

    const patch = parsed.data;
    const patchOperations = patch as unknown as Operation[];

    // 5. Apply patch and validate
    const nextProps = applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
    // --- LOG: Resulting props after patch ---
    console.log("[LLM PATCH] Props after patch:", JSON.stringify(nextProps, null, 2));
    const validated = inputPropsSchema.safeParse(nextProps);
    if (!validated.success) {
      console.error("[LLM PATCH] Resulting document doesn't match input props schema:", validated.error);
      throw new TRPCError({ code: "BAD_REQUEST", message: "Resulting document doesn't match input props schema" });
    } else {
      console.log("[LLM PATCH] Props schema validation succeeded.");
    }

    // 6. Persist changes
    await ctx.db.update(projects).set({ props: validated.data, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await ctx.db.insert(patches).values({ projectId, patch });

    // 7. Assistant message
    let systemMessage = "";
    if (content.explanation && typeof content.explanation === "string") {
      systemMessage = content.explanation;
    } else {
      const opDescriptions = patchOperations.map((op: any) => `${op.op} ${op.path}`).join(", ");
      systemMessage = `I've updated your video: ${opDescriptions}.`;
    }

    await ctx.db.insert(messages).values({ projectId, content: systemMessage, role: "assistant" });

    return { patch, userMessageId: userMessage.id };
  } catch (error) {
    console.error("processUserMessageInProject error:", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process message" });
  }
}

export const chatRouter = createTRPCRouter({
  // Add a new procedure to get messages for a project
  getMessages: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Check if project exists and user has access to it
      const [project] = await ctx.db
        .select({ id: projects.id, userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Ensure the user has access to this project
      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }

      // Fetch messages for the project
      const messageHistory = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.projectId, input.projectId))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      // Return messages in chronological order (oldest first)
      return messageHistory.reverse();
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return processUserMessageInProject(ctx, input.projectId, input.message);
    }),
}); 

/**
 * Handles requests to generate custom components using the OpenAI function calling API
 * 
 * @param ctx TRPC context
 * @param projectId Project ID
 * @param message User message requesting a custom component
 * @param userMessageId ID of the saved user message
 * @returns Operation result with custom component job details
 */
async function handleCustomComponentRequest(ctx: any, projectId: string, message: string, userMessageId: string) {
  try {
    console.log("[CUSTOM COMPONENT] Starting component generation process");
    
    // 1. Use OpenAI function calling to generate the component code
    console.log("[CUSTOM COMPONENT] Calling generateComponentCode with message:", message);
    const { effect, tsxCode } = await generateComponentCode(message);
    console.log(`[CUSTOM COMPONENT] Successfully generated code for "${effect}", code length: ${tsxCode.length} chars`);
    
    // 2. Create a custom component job
    console.log("[CUSTOM COMPONENT] Creating component job in database");
    const [job] = await ctx.db.insert(customComponentJobs)
      .values({
        projectId,
        effect,
        tsxCode,
        status: "pending",
        retryCount: 0, // Initialize retry count
        errorMessage: null,
      })
      .returning();
    
    if (!job) {
      console.error("[CUSTOM COMPONENT] Failed to create job record in database");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create component job record",
      });
    }
    
    console.log(`[CUSTOM COMPONENT] Job created successfully with ID: ${job.id}`);
    
    // 3. Create an assistant response
    const systemMessage = `I'm generating a custom component for: "${effect}"

Status: Processing
Job ID: ${job.id}

Your component is being compiled and will be available to insert in your timeline once it's ready. You can check the status and insert it using the custom component panel.`;
    
    console.log("[CUSTOM COMPONENT] Saving assistant response to database");
    await ctx.db.insert(messages).values({
      projectId,
      content: systemMessage,
      role: "assistant",
    });
    
    // 4. Trigger the build process manually for testing
    try {
      console.log("[CUSTOM COMPONENT] Attempting to trigger build process manually");
      // Import the processPendingJobs function from the buildCustomComponent worker
      const { processPendingJobs } = await import("~/server/workers/buildCustomComponent");
      // Call the function to process the job immediately (for testing)
      processPendingJobs().catch(err => {
        console.error("[CUSTOM COMPONENT] Error in manual build process:", err);
      });
    } catch (buildError) {
      console.error("[CUSTOM COMPONENT] Failed to trigger manual build:", buildError);
      // Don't rethrow here, as we don't want to fail the component creation - the CRON job should pick it up later
    }
    
    console.log("[CUSTOM COMPONENT] Returning success response");
    return { 
      jobId: job.id,
      effect: job.effect,
      userMessageId, 
      noPatches: true 
    };
  } catch (error) {
    console.error("[CUSTOM COMPONENT] Generation error:", error);
    
    // Create error message response with more details
    const errorMessage = `I wasn't able to generate the custom component you requested. ${error instanceof Error ? `Error: ${error.message}` : "Please try again with a different description."}\n\nFor text animations specifically, try phrases like "Create a custom component with a bouncing text that says 'Hello World'"` ;
    
    console.log("[CUSTOM COMPONENT] Saving error message to database");
    await ctx.db.insert(messages).values({
      projectId,
      content: errorMessage,
      role: "assistant",
    });
    
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate custom component: " + (error instanceof Error ? error.message : String(error)),
    });
  }
}