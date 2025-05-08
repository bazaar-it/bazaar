/**
 * Simple wrapper around the OpenAI SDK to provide consistent configuration.
 * This file is used to centralize OpenAI API usage throughout the application.
 */

import OpenAI from 'openai';
import { env } from '~/env';

// Create and export a configured OpenAI client
export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Export default for convenience
export default openaiClient; 