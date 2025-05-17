// src/server/lib/r2.ts
import { a2aLogger } from '~/lib/logger';
import type { GetObjectCommandOutput, PutObjectCommandOutput } from '@aws-sdk/client-s3';

// A basic mock S3 client for R2 to allow ComponentLoadingFixerAgent to type-check
// and provide a clear placeholder for actual R2 implementation.
export const r2 = {
  send: async (command: any): Promise<any> => {
    const commandName = command.constructor.name;
    a2aLogger.warn('r2-mock', `Mock R2 client 'send' called with command: ${commandName}`, { commandInput: command.input });

    if (commandName === 'GetObjectCommand') {
      // Simulate GetObjectCommand output
      a2aLogger.info('r2-mock', `Mock R2 GetObject: Returning mock content for Key: ${command.input.Key}`);
      return {
        Body: {
          transformToString: async () => {
            return `// Mock content for ${command.input.Key}\nconsole.log("This is mock R2 content.");`;
          },
        },
        ContentType: 'application/javascript',
        Metadata: {},
      } as GetObjectCommandOutput;
    } else if (commandName === 'PutObjectCommand') {
      // Simulate PutObjectCommand output
      a2aLogger.info('r2-mock', `Mock R2 PutObject: Simulating upload for Key: ${command.input.Key}`);
      return {
        $metadata: {
          httpStatusCode: 200,
        },
      } as PutObjectCommandOutput;
    }
    a2aLogger.error('r2-mock', `Mock R2 client 'send' received unhandled command: ${commandName}`);
    throw new Error(`Mock R2 client does not handle command: ${commandName}`);
  },
};
