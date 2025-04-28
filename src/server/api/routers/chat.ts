import { z } from "zod";
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects, patches } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Fetch current props
        const [project] = await ctx.db
          .select({ props: projects.props })
          .from(projects)
          .where(eq(projects.id, input.projectId));

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // 2. Call GPT-4o in JSON-mode to get patch
        const llmResp = await openai.chat.completions.create({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `
              You are an API that modifies video scenes according to user instructions.
              You MUST return ONLY a valid RFC-6902 JSON Patch array as the "operations" property.
              Each operation should have op, path, and (if needed) value or from fields.
              The patch will be applied to the inputProps below to update the video.
              
              Available scene types:
              - text: display text with color, fontSize, backgroundColor
              - image: display an image with src URL and fit (cover/contain)
              
              Example patch operations:
              - Change text color: {"op": "replace", "path": "/scenes/0/data/color", "value": "#FF0000"}
              - Add new scene: {"op": "add", "path": "/scenes/-", "value": {"id": "unique-uuid", "type": "text", ...}}
              - Move scene: {"op": "move", "path": "/scenes/2", "from": "/scenes/1"}
              
              The inputProps schema is:
              ${JSON.stringify(inputPropsSchema.shape, null, 2)}
              `,
            },
            {
              role: "user",
              content: JSON.stringify({
                inputProps: project.props,
                request: input.message,
              }),
            },
          ],
        });

        // 3. Parse and validate the patch
        const contentString = llmResp.choices[0]?.message?.content;
        if (!contentString) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "LLM returned empty response",
          });
        }
        
        const content = JSON.parse(contentString);
        
        if (!content.operations) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "LLM response missing operations property",
          });
        }
        
        const parsed = jsonPatchSchema.safeParse(content.operations);
        
        if (!parsed.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "LLM returned invalid patch format",
          });
        }
        
        const patch = parsed.data;
        // Use type assertion when applying patch
        const patchOperations = patch as unknown as Operation[];

        // 4. Apply the patch and validate the result
        const nextProps = applyPatch(
          structuredClone(project.props), 
          patchOperations,
          true, // validate
          false // mutate
        ).newDocument;
        
        // 5. Validate the resulting object against our schema
        const validated = inputPropsSchema.safeParse(nextProps);
        
        if (!validated.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Resulting document doesn't match input props schema",
          });
        }

        // 6. Persist to database
        // 6a. Update project with new props
        await ctx.db
          .update(projects)
          .set({ 
            props: validated.data,
            updatedAt: new Date()
          })
          .where(eq(projects.id, input.projectId));

        // 6b. Store the patch itself
        await ctx.db
          .insert(patches)
          .values({
            projectId: input.projectId,
            patch: patch, // Store as JsonPatch type, which matches our schema
          });

        // 7. Return the validated patch
        return { patch };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error("Chat mutation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process message",
        });
      }
    }),
}); 