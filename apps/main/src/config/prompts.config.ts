/**
 * Modular Prompts Configuration
 * 
 * This file imports all active prompts from individual files.
 * Deprecated prompts are kept in the deprecated folder for reference.
 * 
 * Active Prompts (4 total):
 * 1. BRAIN_ORCHESTRATOR - Tool selection
 * 2. CODE_GENERATOR - Universal scene creation
 * 3. CODE_EDITOR - Universal scene editing
 * 4. TITLE_GENERATOR - Project titles
 */

import { BRAIN_ORCHESTRATOR } from './prompts/active/brain-orchestrator';
import { CODE_GENERATOR } from './prompts/active/code-generator';
import { CODE_EDITOR } from './prompts/active/code-editor';
import { TITLE_GENERATOR } from './prompts/active/title-generator';

// Export all prompts as a single object for backward compatibility
export const SYSTEM_PROMPTS = {
  // Core prompts
  BRAIN_ORCHESTRATOR,
  CODE_GENERATOR,
  CODE_EDITOR,
  TITLE_GENERATOR,
  
} as const;

// Type for prompt keys
export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;

// Helper to get system prompt with proper typing
export function getSystemPrompt(key: SystemPromptKey): string {
  const prompt = SYSTEM_PROMPTS[key];
  if (!prompt) {
    console.warn(`Prompt not found: ${key}`);
    return '';
  }
  return prompt.content;
}

// Helper to get parameterized prompt (replaces placeholders)
export function getParameterizedPrompt(
  key: SystemPromptKey,
  params: Record<string, string>
): { role: 'system', content: string } {
  const prompt = SYSTEM_PROMPTS[key];
  if (!prompt) {
    console.warn(`Prompt not found: ${key}`);
    return { role: 'system', content: '' };
  }
  
  let content = prompt.content;
  
  // Replace all placeholders
  Object.entries(params).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  
  return {
    role: prompt.role,
    content
  };
}

// Re-export the main content for direct access
export const PROMPTS = {
  brainOrchestrator: BRAIN_ORCHESTRATOR.content,
  codeGenerator: CODE_GENERATOR.content,
  codeEditor: CODE_EDITOR.content,
  titleGenerator: TITLE_GENERATOR.content,
} as const;