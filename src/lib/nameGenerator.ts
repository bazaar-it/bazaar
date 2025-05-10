// src/lib/nameGenerator.ts
/**
 * Utility functions for generating project names from user prompts
 */

/**
 * Cleans and formats a user prompt into a concise title
 * @param prompt The user's chat message
 * @returns A cleaned up title derived from the prompt
 */
export function generateNameFromPrompt(prompt: string): string {
  if (!prompt) return "New Project";
  
  // Remove common phrases that don't add value to the title
  const cleaned = prompt
    .replace(/^(create|make|generate|build|develop|design|implement|add|show me|can you|please)/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/\s+(for me|for us|for our team|for our company|for my project)$/i, "")
    .trim();
  
  // Limit length and capitalize first letter of each word
  const words = cleaned.split(" ");
  const limitedWords = words.slice(0, 7); // Take first 7 words max
  
  const titled = limitedWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return titled || "New Project";
}
