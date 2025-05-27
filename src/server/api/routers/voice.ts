// src/server/api/routers/voice.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { openai } from '~/server/lib/openai';
import { toFile } from 'openai/uploads';

export const voiceRouter = createTRPCRouter({
  transcribe: protectedProcedure
    .input(
      z.object({
        audio: z.string(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const base64 = input.audio.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const file = await toFile(buffer, 'audio.webm', { type: input.mimeType ?? 'audio/webm' });
      const result = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'text',
      });
      const text = typeof result === 'string' ? result : result.text;
      return { text };
    }),
});
