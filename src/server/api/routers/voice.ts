// src/server/api/routers/voice.ts
import "openai/shims/node";
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { openai } from '~/server/lib/openai';
import { toFile } from 'openai/uploads';
import { logger } from '~/lib/utils/logger';

// Define possible response types from Whisper API
interface TranscriptionResponseObject {
  text: string;
  [key: string]: unknown;
}

// Map MIME types to appropriate file extensions for Whisper API
const mimeToExtension = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export const voiceRouter = createTRPCRouter({
  transcribe: protectedProcedure
    .input(
      z.object({
        audio: z.string(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Extract base64 data and determine appropriate file extension
        const base64 = input.audio.replace(/^data:.*?;base64,/, '');
        const mimeType = input.mimeType ?? 'audio/webm';
        
        // Get appropriate extension or default to mp3
        const extension = mimeToExtension[mimeType as keyof typeof mimeToExtension] || 'mp3';
        const filename = `audio.${extension}`;
        
        logger.info(`Processing audio transcription with format: ${mimeType} -> ${extension}`);
        
        // Convert to buffer and create file
        const buffer = Buffer.from(base64, 'base64');
        const file = await toFile(buffer, filename, { type: mimeType });
        
        // Send to OpenAI Whisper API
        const result = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          response_format: 'text',
        });
        
        // Handle the response based on response_format: 'text'
        // When response_format is 'text', result will be a string
        let text: string;
        
        if (typeof result === 'string') {
          // Direct string response (expected with response_format: 'text')
          text = result;
        } else if (result && typeof result === 'object' && 'text' in result) {
          // Object with text property
          text = (result as TranscriptionResponseObject).text;
        } else {
          // Fallback for unexpected formats
          logger.warn('Unexpected response format from Whisper API:', result);
          text = String(result);
        }
        
        logger.info(`Transcription successful: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
        
        return { text };
      } catch (error) {
        logger.error('Transcription error:', error);
        throw error;
      }
    }),
});
