//src/config/prompts.config.ts

import fs from 'fs';
import path from 'path';

// =============================================================================
// SYSTEM PROMPTS CONFIGURATION
// =============================================================================

export interface SystemPromptConfig {
    role: 'system';
    content: string;
  }
  
  export const SYSTEM_PROMPTS = {
    // =============================================================================
    // BRAIN ORCHESTRATOR PROMPTS
    // =============================================================================
        BRAIN_ORCHESTRATOR: {
      role: 'system' as const,
      content: 
            fs.readFileSync(path.join(process.cwd(), 'src/brain/config/prompts/BRAIN_ORCHESTRATOR.md'), 'utf-8')
    },
  
    // =============================================================================
    // MCP TOOLS PROMPTS
    // =============================================================================
        EDIT_SCENE: {
      role: 'system' as const,
      content: 
            fs.readFileSync(path.join(process.cwd(), 'src/brain/config/prompts/EDIT_SCENE.md'), 'utf-8')
    },

        CODE_GENERATOR: {
      role: 'system' as const,
      content: 
            fs.readFileSync(path.join(process.cwd(), 'src/brain/config/prompts/CODE_GENERATOR.md'), 'utf-8')
    },
  
        SCENE_BUILDER: {
      role: 'system' as const,
      content: 
            fs.readFileSync(path.join(process.cwd(), 'src/brain/config/prompts/SCENE_BUILDER.md'), 'utf-8')
    },
  
        LAYOUT_GENERATOR: {
      role: 'system' as const,
      content: 
            fs.readFileSync(path.join(process.cwd(), 'src/brain/config/prompts/LAYOUT_GENERATOR.md'), 'utf-8')
    }
  };
  
  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
  
  export function getSystemPrompt(service: keyof typeof SYSTEM_PROMPTS): SystemPromptConfig {
    return SYSTEM_PROMPTS[service];
  }
  
  export function getParameterizedPrompt(
    service: keyof typeof SYSTEM_PROMPTS, 
    params: Record<string, string>
  ): SystemPromptConfig {
    const prompt = SYSTEM_PROMPTS[service];
    let content = prompt.content;
    
    // Replace all placeholders like {{FUNCTION_NAME}} with actual values
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return {
      role: 'system',
      content
    };
  }
  
  export function getAllPrompts(): Record<string, SystemPromptConfig> {
    return SYSTEM_PROMPTS;
  }
  
  export function updatePrompt(service: keyof typeof SYSTEM_PROMPTS, newContent: string): void {
    SYSTEM_PROMPTS[service] = {
      role: 'system',
      content: newContent
    };
  }
  
  // Development helper to log prompt lengths
  export function logPromptLengths() {
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 System Prompt Lengths:');
      Object.entries(SYSTEM_PROMPTS).forEach(([key, prompt]) => {
        console.log(`  ${key}: ${prompt.content.length} characters`);
      });
    }
  }
  