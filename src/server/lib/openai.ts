import "openai/shims/node";
import OpenAI from "openai";
import { env } from "~/env";

/**
 * OpenAI API client for server-side operations
 * Used primarily for chatbot interactions and JSON Patch generation
 */
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
}); 