// src/server/services/mcp/tools/changeDuration.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const changeDurationInputSchema = z.object({
  sceneId: z.string().describe("Scene ID to change duration for"),
  durationSeconds: z.number().positive().describe("New duration in seconds"),
  projectId: z.string().describe("Project ID for context"),
});

type ChangeDurationInput = z.infer<typeof changeDurationInputSchema>;

interface ChangeDurationOutput {
  success: boolean;
  oldDurationFrames: number;
  newDurationFrames: number;
  oldDurationSeconds: number;
  newDurationSeconds: number;
  reasoning: string;
  chatResponse: string;
}

export class ChangeDurationTool extends BaseMCPTool<ChangeDurationInput, ChangeDurationOutput> {
  name = "changeDuration";
  description = "Change the duration of a scene without modifying its animation code. Use when user wants to change scene timing/length.";
  inputSchema = changeDurationInputSchema;
  
  protected async execute(input: ChangeDurationInput): Promise<ChangeDurationOutput> {
    const { sceneId, durationSeconds, projectId } = input;

    try {
      console.log(`[ChangeDuration] Changing scene ${sceneId} to ${durationSeconds} seconds`);
      
      // Convert seconds to frames (30fps)
      const newDurationFrames = Math.round(durationSeconds * 30);
      
      // First, get the current scene data to retrieve old duration
      const currentScene = await db
        .select()
        .from(scenes)
        .where(eq(scenes.id, sceneId))
        .limit(1);
        
      if (currentScene.length === 0) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }
      
      const oldDurationFrames = currentScene[0]?.duration || 180;
      const oldDurationSeconds = oldDurationFrames / 30;
      
      // Update the scene duration in the database
      await db
        .update(scenes)
        .set({ 
          duration: newDurationFrames,
          updatedAt: new Date()
        })
        .where(eq(scenes.id, sceneId));
      
      const reasoning = `Updated scene duration from ${oldDurationSeconds}s (${oldDurationFrames} frames) to ${durationSeconds}s (${newDurationFrames} frames). Animation code unchanged.`;
      
      const chatResponse = `✅ Scene duration changed to ${durationSeconds} seconds! The animation code stays exactly the same - I just updated how long the scene plays in your timeline.`;

      console.log(`[ChangeDuration] Successfully changed duration: ${oldDurationFrames} → ${newDurationFrames} frames`);

      return {
        success: true,
        oldDurationFrames,
        newDurationFrames,
        oldDurationSeconds,
        newDurationSeconds: durationSeconds,
        reasoning,
        chatResponse
      };
      
    } catch (error) {
      console.error("[ChangeDuration] Failed to change duration:", error);
      
      return {
        success: false,
        oldDurationFrames: 0,
        newDurationFrames: 0,
        oldDurationSeconds: 0,
        newDurationSeconds: 0,
        reasoning: `Failed to change duration: ${error}`,
        chatResponse: `❌ Sorry, I couldn't change the scene duration. Error: ${error}`
      };
    }
  }
}

export const changeDurationTool = new ChangeDurationTool(); 