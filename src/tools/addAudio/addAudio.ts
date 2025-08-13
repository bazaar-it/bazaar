import { BaseMCPTool } from "~/tools/helpers/base";
import type { BaseToolInput, BaseToolOutput } from "~/tools/helpers/types";
import { z } from "zod";

/**
 * AddAudio Tool - Simple tool to add audio/music to the project
 * No AI processing needed - just adds an Audio component
 */

// Default audio library - no-copyright tracks hosted on R2
const DEFAULT_AUDIO_LIBRARY = [
  {
    name: "Cyberpunk Action Intro",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3",
    description: "High-energy cyberpunk track perfect for tech/action content"
  },
  {
    name: "Action Trailer Glitch",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/follow-the-leader-action-trailer-glitch-intro-146760.mp3", 
    description: "Intense action track with glitch effects"
  },
  {
    name: "Future Design",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/future-design-344320.mp3",
    description: "Modern, futuristic soundtrack for tech presentations"
  },
  {
    name: "Inspiring Ambient Lounge", 
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/in-slow-motion-inspiring-ambient-lounge-219592.mp3",
    description: "Calm, inspiring background music for thoughtful content"
  }
];

export interface AddAudioInput extends BaseToolInput {
  audioUrls?: string[]; // Now optional to allow default suggestions
  targetSceneId?: string; // Optional - defaults to adding globally
}

export interface AddAudioOutput extends BaseToolOutput {
  audioAdded: boolean;
  audioUrls: string[];
}

export const addAudioInputSchema = z.object({
  userPrompt: z.string(),
  projectId: z.string(),
  audioUrls: z.array(z.string()).optional(), // Now optional to allow default suggestions
  targetSceneId: z.string().optional(),
});

export class AddAudioTool extends BaseMCPTool<AddAudioInput, AddAudioOutput> {
  name = "ADD_AUDIO";
  description = "Add background music or audio to the project";
  inputSchema = addAudioInputSchema;

  protected async execute(input: AddAudioInput): Promise<AddAudioOutput> {
    console.log('\n🎵 [ADD AUDIO TOOL] === EXECUTING ===');
    console.log('🎵 [ADD AUDIO] Input:', {
      prompt: input.userPrompt,
      audioUrls: input.audioUrls,
      targetSceneId: input.targetSceneId,
      projectId: input.projectId
    });
    
    try {
      // Import necessary modules
      const { db } = await import("~/server/db");
      const { projects } = await import("~/server/db/schema");
      const { eq } = await import("drizzle-orm");
      
      // If no audio URLs provided, suggest from default library
      if (!input.audioUrls || input.audioUrls.length === 0) {
        console.log('🎵 [ADD AUDIO] No audio URLs provided, suggesting from default library');
        
        // Analyze user prompt to suggest best match
        const prompt = input.userPrompt.toLowerCase();
        let suggestedTrack = DEFAULT_AUDIO_LIBRARY[0]; // Default fallback
        
        if (prompt.includes('action') || prompt.includes('intense') || prompt.includes('cyberpunk')) {
          suggestedTrack = DEFAULT_AUDIO_LIBRARY[0]; // Cyberpunk Action
        } else if (prompt.includes('calm') || prompt.includes('ambient') || prompt.includes('relaxing')) {
          suggestedTrack = DEFAULT_AUDIO_LIBRARY[3]; // Inspiring Ambient
        } else if (prompt.includes('future') || prompt.includes('tech') || prompt.includes('modern')) {
          suggestedTrack = DEFAULT_AUDIO_LIBRARY[2]; // Future Design
        } else if (prompt.includes('glitch') || prompt.includes('trailer')) {
          suggestedTrack = DEFAULT_AUDIO_LIBRARY[1]; // Action Trailer Glitch
        }
        
        console.log('🎵 [ADD AUDIO] Selected track:', suggestedTrack.name);
        input.audioUrls = [suggestedTrack.url];
      }
      
      // Get the first audio URL (we typically handle one at a time)
      const audioUrl = input.audioUrls[0];
      if (!audioUrl) {
        throw new Error('No audio URL provided');
      }
      
      const filename = audioUrl.split('/').pop() || 'audio.mp3';
      
      // Check if this is a default track for messaging
      const isDefaultTrack = DEFAULT_AUDIO_LIBRARY.some(track => track.url === audioUrl);
      const trackInfo = DEFAULT_AUDIO_LIBRARY.find(track => track.url === audioUrl);
      
      // Try to get the actual audio duration
      let actualDuration = 30; // Default fallback
      
      try {
        // Create an audio element to get the real duration
        console.log('🎵 [ADD AUDIO] Attempting to load audio duration from:', audioUrl);
        
        // For now, use a reasonable default to prevent Remotion errors
        // The AudioPanel will update this when the audio loads
        actualDuration = 120; // 2 minutes default - reasonable for most audio files
      } catch (error) {
        console.warn('🎵 [ADD AUDIO] Could not determine audio duration, using default');
      }
      
      // Create audio track object compatible with AudioPanel
      const audioTrack = {
        id: audioUrl,
        url: audioUrl,
        name: filename,
        duration: actualDuration,
        startTime: 0,
        endTime: actualDuration, // Must be positive to prevent Remotion errors
        volume: 1,
      };
      
      // Update the project's audio in the database
      await db.update(projects)
        .set({
          audio: audioTrack,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));
      
      console.log('🎵 [ADD AUDIO] Successfully updated project audio in database');
      
      // Import and trigger audio panel auto-opening
      try {
        const { useVideoState } = await import("~/stores/videoState");
        useVideoState.getState().setShouldOpenAudioPanel(input.projectId, true);
        console.log('🎵 [ADD AUDIO] Set flag to auto-open audio panel');
      } catch (error) {
        console.warn('🎵 [ADD AUDIO] Could not set audio panel flag:', error);
      }
      
      // Create response message
      let chatResponse = `✅ Added audio: ${trackInfo?.name || filename}`;
      
      if (isDefaultTrack && trackInfo) {
        chatResponse += `\n\n${trackInfo.description}`;
      }
      
      chatResponse += `\n\nYou can control volume, trim, and fade effects in the Audio panel.`;
      
      return {
        success: true,
        audioAdded: true,
        audioUrls: input.audioUrls,
        reasoning: `Added audio track "${trackInfo?.name || filename}" to the project${isDefaultTrack ? ' (from default library)' : ''}`,
        chatResponse,
        scene: {
          // Return metadata about the audio addition
          audioTrack,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🎵 [ADD AUDIO] Error:', error);
      
      return {
        success: false,
        audioAdded: false,
        audioUrls: [],
        reasoning: `Failed to add audio: ${errorMessage}`,
        error: errorMessage,
        chatResponse: `❌ Failed to add audio: ${errorMessage}`,
      };
    }
  }
}