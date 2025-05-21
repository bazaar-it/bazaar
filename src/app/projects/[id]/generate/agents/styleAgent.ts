import type { StyleAgent } from './interfaces';
import type { VideoStyle } from '../types/storyboard';

type OpenAIChatCompletionRequestMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * StyleAgent - Responsible for generating visual style guidelines
 * for the video based on user prompt and additional instructions
 */
export class AIStyleAgent implements StyleAgent {
  private apiKey: string;
  
  constructor(apiKey?: string) {
    // Use environment variable if no API key is provided
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('StyleAgent initialized without API key. LLM calls will fail.');
    }
  }
  
  /**
   * Generate a consistent style for the entire video
   */
  async generateStyle(userPrompt: string, additionalInstructions?: string): Promise<VideoStyle> {
    try {
      if (!this.apiKey) {
        throw new Error('Missing OpenAI API key');
      }
      
      const messages: OpenAIChatCompletionRequestMessage[] = [
        {
          role: 'system',
          content: `You are a visual style expert for video production. Your job is to determine the most appropriate visual style
for a video based on the user's prompt. You must output a JSON object with the following structure:
{
  "colorPalette": [string, string, string, string], // Array of 4 hex color codes that work well together
  "fontPrimary": string, // Name of primary font (choose from: Inter, Roboto, Montserrat, Poppins, Playfair Display, Open Sans, Raleway)
  "fontSecondary": string, // Name of secondary font complementary to primary
  "mood": string, // One of: "playful", "serious", "professional", "casual", "energetic", "calm", "inspiring"
  "visualStyle": string, // One of: "minimalist", "modern", "retro", "corporate", "artistic", "technical"
  "pacing": string // One of: "slow", "medium", "fast"
}

Choose a style that aligns with the content and purpose of the video as described in the user's prompt.`
        },
        {
          role: 'user',
          content: `Create a visual style for a video with the following prompt: "${userPrompt}"${
            additionalInstructions ? `\n\nAdditional style instructions: ${additionalInstructions}` : ''
          }`
        }
      ];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      const style = JSON.parse(data.choices[0].message.content);
      
      // Validate the returned style conforms to our expected shape
      this.validateStyle(style);
      
      return style;
    } catch (error) {
      console.error('Error generating video style:', error);
      
      // Return fallback style if LLM call fails
      return this.getFallbackStyle(userPrompt);
    }
  }
  
  /**
   * Validate that the AI response conforms to our expected style structure
   */
  private validateStyle(style: any): void {
    // Check required fields
    const requiredFields = ['colorPalette', 'fontPrimary', 'fontSecondary', 'mood', 'visualStyle', 'pacing'];
    for (const field of requiredFields) {
      if (!style[field]) {
        throw new Error(`Missing required style field: ${field}`);
      }
    }
    
    // Validate color palette
    if (!Array.isArray(style.colorPalette) || style.colorPalette.length !== 4) {
      throw new Error('Color palette must be an array of 4 colors');
    }
    
    // Validate pacing is one of the allowed values
    const validPacingValues = ['slow', 'medium', 'fast'];
    if (!validPacingValues.includes(style.pacing)) {
      throw new Error(`Invalid pacing value: ${style.pacing}. Must be one of: ${validPacingValues.join(', ')}`);
    }
    
    // Validate mood is one of the allowed values
    const validMoodValues = ['playful', 'serious', 'professional', 'casual', 'energetic', 'calm', 'inspiring'];
    if (!validMoodValues.includes(style.mood)) {
      throw new Error(`Invalid mood value: ${style.mood}. Must be one of: ${validMoodValues.join(', ')}`);
    }
    
    // Validate visual style is one of the allowed values
    const validVisualStyleValues = ['minimalist', 'modern', 'retro', 'corporate', 'artistic', 'technical'];
    if (!validVisualStyleValues.includes(style.visualStyle)) {
      throw new Error(`Invalid visualStyle value: ${style.visualStyle}. Must be one of: ${validVisualStyleValues.join(', ')}`);
    }
  }
  
  /**
   * Get a fallback style if AI generation fails
   */
  private getFallbackStyle(userPrompt: string): VideoStyle {
    // Default to a neutral, professional style
    return {
      colorPalette: ['#3b82f6', '#6366f1', '#f43f5e', '#10b981'],
      fontPrimary: 'Inter',
      fontSecondary: 'Montserrat',
      mood: 'professional',
      visualStyle: 'modern',
      pacing: 'medium',
    };
  }
} 