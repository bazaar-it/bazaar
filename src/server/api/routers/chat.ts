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
      try {
        // 1. Fetch current props
        const [project] = await ctx.db
          .select({ props: projects.props, userId: projects.userId })
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

        // 1a. Store the user's message in the database
        const userMessages = await ctx.db
          .insert(messages)
          .values({
            projectId: input.projectId,
            content: input.message,
            role: 'user',
          })
          .returning();

        const userMessage = userMessages[0];
        if (!userMessage) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save user message",
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
                "direction": "from-right", // For slide/wipe: "from-left", "from-right", "from-top", "from-bottom"
                "useSpring": false // Optional: true for spring physics, false for linear
              }}
              
              Example patch operations:
              - Change text color: {"op": "replace", "path": "/scenes/0/data/color", "value": "#FF0000"}
              - Add new scene: {"op": "add", "path": "/scenes/-", "value": {"id": "unique-uuid", "type": "text", ...}}
              - Move scene: {"op": "move", "path": "/scenes/2", "from": "/scenes/1"}
              - Add transition: {"op": "add", "path": "/scenes/1/transitionToNext", "value": {"type": "slide", "duration": 30, "direction": "from-right"}}
              
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

        // 6c. Store the assistant's response in the database with a meaningful message
        // Extract explanation from the LLM response or generate a description based on the patch
        let systemMessage = "";
        
        if (content.explanation && typeof content.explanation === 'string') {
          // Use the explanation from the LLM if available
          systemMessage = content.explanation;
        } else {
          // Generate a meaningful message based on the operations
          const opDescriptions = patchOperations.map(op => {
            const pathParts = op.path.split('/').filter(Boolean);
            
            if (op.op === 'add' && pathParts[0] === 'scenes' && pathParts[1] === '-') {
              const sceneType = op.value?.type || 'scene';
              return `Added a new ${sceneType} ${op.value?.data?.text ? `with text "${op.value.data.text}"` : ''}`;
            } else if (op.op === 'replace' && pathParts[0] === 'scenes') {
              const property = pathParts[pathParts.length - 1];
              const sceneIndex = parseInt(pathParts[1] || "0");
              const sceneType = project.props.scenes?.[sceneIndex]?.type || 'scene';
              
              if (property === 'color') {
                return `Changed ${sceneType} color to ${op.value}`;
              } else if (property === 'fontSize') {
                return `Changed font size to ${op.value}px`;
              } else if (property === 'duration') {
                return `Adjusted ${sceneType} duration to ${op.value} frames`;
              } else if (property === 'start') {
                return `Modified ${sceneType} start time to frame ${op.value}`;
              } else if (property === 'text') {
                return `Updated text to "${op.value}"`;
              } else if (property === 'backgroundColor') {
                return `Changed ${sceneType} background color to ${op.value}`;
              } else {
                return `Updated ${property} in ${sceneType}`;
              }
            } else if (op.op === 'remove') {
              return `Removed ${pathParts.join('/')}`;
            }
            
            return `${op.op} operation on ${op.path}`;
          });
          
          // Join the descriptions into a message
          systemMessage = `I've updated your video: ${opDescriptions.join(', ')}.`;
        }

        await ctx.db
          .insert(messages)
          .values({
            projectId: input.projectId,
            content: systemMessage,
            role: 'assistant',
          });

        // 7. Return the validated patch and message IDs
        return { 
          patch,
          userMessageId: userMessage.id
        };
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