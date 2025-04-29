// src/server/api/routers/chat.ts

import { z } from "zod";
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects, patches, messages } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";

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

    // 3. Call the LLM to get a JSON patch
    // Detailed system prompt with examples and allowed scene types
    const systemPrompt = `
You are an API that modifies video scenes according to user instructions.
You MUST return a JSON object with:
1. An "operations" property containing a valid RFC-6902 JSON Patch array
2. An "explanation" property with a brief, clear explanation of what changes you made

Each operation should have op, path, and (if needed) value or from fields.
The patch will be applied to the inputProps below to update the video.

Available scene types:
- text: display text with color, fontSize, backgroundColor
- image: display an image with src URL and fit (cover/contain)
- background-color: fills screen with color, optional toColor for animation
- shape: renders circle/square/etc with animation
- gradient: multi-color background with animation
- particles: animated particle effects
- text-animation: animated text with various effects
- split-screen: shows content side-by-side
- zoom-pan: Ken Burns effect on images
- svg-animation: animated vector graphics

Transitions between scenes:
To create smooth transitions between scenes, add a "transitionToNext" property to a scene.
This defines how this scene transitions to the next scene in the sequence.

Example transition:
{"op": "add", "path": "/scenes/0/transitionToNext", "value": {
  "type": "fade",  // Options: "fade", "slide", "wipe"
  "duration": 30,  // Number of frames the transition lasts
  "direction": "from-right", // For slide/wipe
  "useSpring": false // true for spring physics, false for linear
}}

Example patch operations:
- Change text color: {"op": "replace", "path": "/scenes/0/data/color", "value": "#FF0000"}
- Add new scene: {"op": "add", "path": "/scenes/-", "value": {"id": "unique-uuid", "type": "text", ...}}
- Move scene: {"op": "move", "path": "/scenes/2", "from": "/scenes/1"}
- Add transition: {"op": "add", "path": "/scenes/1/transitionToNext", "value": {"type": "slide", "duration": 30, "direction": "from-right"}}

The inputProps schema is:
${JSON.stringify(inputPropsSchema.shape, null, 2)}
`.trim();

    const llmResp = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: JSON.stringify({ inputProps: project.props, request: message }) },
      ],
    });

    // 4. Validate LLM response
    const contentString = llmResp.choices[0]?.message?.content;
    if (!contentString) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "LLM returned empty response" });
    }

    const content = JSON.parse(contentString);
    if (!content.operations) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "LLM response missing operations property" });
    }

    const parsed = jsonPatchSchema.safeParse(content.operations);
    if (!parsed.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid patch format" });
    }

    const patch = parsed.data;
    const patchOperations = patch as unknown as Operation[];

    // 5. Apply patch and validate
    const nextProps = applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
    const validated = inputPropsSchema.safeParse(nextProps);
    if (!validated.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Resulting document doesn't match input props schema" });
    }

    // 6. Persist changes
    await ctx.db.update(projects).set({ props: validated.data, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await ctx.db.insert(patches).values({ projectId, patch });

    // 7. Assistant message
    let systemMessage = "";
    if (content.explanation && typeof content.explanation === "string") {
      systemMessage = content.explanation;
    } else {
      const opDescriptions = patchOperations.map((op) => `${op.op} ${op.path}`).join(", ");
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