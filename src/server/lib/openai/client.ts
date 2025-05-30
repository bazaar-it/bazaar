/**
 * Simple wrapper around the OpenAI SDK to provide consistent configuration.
 * This file is used to centralize OpenAI API usage throughout the application.
 */

import OpenAI from 'openai';
import { env } from '~/env';

// Create and export a configured OpenAI client with resilience settings
export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout
  maxRetries: 3, // Retry failed requests up to 3 times
});

// Export default for convenience
export default openaiClient; 