import { openai } from "~/server/lib/openai";
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { emitSceneEvent } from "~/lib/events/sceneEvents";

export interface ConversationalResponseInput {
  operation: 'addScene' | 'editScene' | 'deleteScene' | 'askSpecify' | 'fixBrokenScene';
  userPrompt: string;
  result: any;
  context: {
    sceneName?: string;
    changes?: string[];
    sceneCount?: number;
    availableScenes?: Array<{ id: string; name: string }>;
    projectId?: string;
    actualElements?: Array<{
      type: string;
      text?: string;
      color?: string;
      fontSize?: string | number;
    }>;
    sceneType?: string;
    background?: string;
    animations?: string[];
  };
}

export class ConversationalResponseService {
  /**
   * Generate contextual chat response for completed operations
   */
  async generateContextualResponse(input: ConversationalResponseInput): Promise<string> {
    const systemPrompt = this.buildResponsePrompt(input.operation);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast, cheap for response generation
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: this.buildResponseContext(input) }
        ],
        temperature: 0.7,
        max_tokens: 150, // Keep responses concise
      });
      
      return completion.choices[0]?.message?.content || "Operation completed!";
    } catch (error) {
      console.error('Failed to generate conversational response:', error);
      return this.getFallbackResponse(input.operation);
    }
  }

  /**
   * Generate specific clarification questions for askSpecify operations
   */
  async generateClarificationQuestion(input: {
    userPrompt: string;
    availableScenes?: Array<{ id: string; name: string; number?: number }>;
    ambiguityType: 'scene-selection' | 'action-unclear' | 'parameter-missing' | 'duration_intent';
    context?: Record<string, any>;
  }): Promise<string> {
    const systemPrompt = `You are a helpful motion graphics assistant. The user's request is ambiguous and you need to ask a specific clarification question.

TONE: Friendly, conversational, helpful
LENGTH: 1-2 sentences maximum
STYLE: Natural question, not robotic

AMBIGUITY TYPE: ${input.ambiguityType}

${input.availableScenes && input.availableScenes.length > 0 ? `
AVAILABLE SCENES:
${input.availableScenes.map(scene => `- Scene ${scene.number || scene.id}: ${scene.name}`).join('\n')}
` : ''}

Generate a specific question to clarify the user's intent.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User said: "${input.userPrompt}"\n\nWhat clarification question should I ask?` }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });
      
      return completion.choices[0]?.message?.content || "Could you please clarify what you'd like me to do?";
    } catch (error) {
      console.error('Failed to generate clarification question:', error);
      return this.getFallbackClarification(input.ambiguityType, input.availableScenes);
    }
  }

  /**
   * Send chat message to database and emit real-time event
   */
  async sendChatMessage(message: string, projectId: string, type: 'success' | 'error' | 'system-notification' = 'success'): Promise<void> {
    try {
      // Save to database
      await db.insert(messages).values({
        projectId,
        content: message,
        role: 'assistant',
        status: type === 'error' ? 'error' : 'success',
        createdAt: new Date(),
      });
      
      // Emit SSE event for real-time UI update
      // Note: Using scene-ready event type to carry chat message
      emitSceneEvent(projectId, 'scene-ready', {
        message,
        type,
        timestamp: new Date().toISOString(),
        isChat: true,
      });
      
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  /**
   * Build response prompt based on operation type
   */
  private buildResponsePrompt(operation: string): string {
    const basePrompt = `You are a helpful motion graphics assistant. Generate a brief, friendly response about the operation you just completed.

TONE: Conversational, helpful, specific
LENGTH: 1-2 sentences maximum
STYLE: Natural, not robotic

`;

    switch (operation) {
      case 'addScene':
        return basePrompt + `You just created a new scene. Mention what you created and highlight key visual elements or animations.`;
      
      case 'editScene':
        return basePrompt + `You just modified an existing scene. Mention what you changed specifically.`;
      
      case 'deleteScene':
        return basePrompt + `You just deleted a scene. Confirm the deletion briefly and mention what's remaining.`;
      
      case 'askSpecify':
        return basePrompt + `You need clarification. Ask a specific question to help understand what the user wants.`;
      
      case 'fixBrokenScene':
        return basePrompt + `You need to fix a broken scene. Mention the specific issue and the steps you'll take to fix it.`;
      
      default:
        return basePrompt + `You completed an operation. Briefly describe what happened.`;
    }
  }

  /**
   * Build context for response generation
   */
  private buildResponseContext(input: ConversationalResponseInput): string {
    let context = `USER REQUEST: "${input.userPrompt}"\n`;
    
    if (input.context.sceneName) {
      context += `SCENE NAME: ${input.context.sceneName}\n`;
    }
    
    if (input.context.sceneType) {
      context += `SCENE TYPE: ${input.context.sceneType}\n`;
    }
    
    if (input.context.background) {
      context += `BACKGROUND: ${input.context.background}\n`;
    }
    
    if (input.context.actualElements && input.context.actualElements.length > 0) {
      context += `ACTUAL ELEMENTS CREATED:\n`;
      input.context.actualElements.forEach((element, index) => {
        context += `  ${index + 1}. ${element.type}`;
        if (element.text) context += ` - "${element.text}"`;
        if (element.color) context += ` (${element.color})`;
        if (element.fontSize) context += ` (${element.fontSize}px)`;
        context += `\n`;
      });
    }
    
    if (input.context.animations && input.context.animations.length > 0) {
      context += `ANIMATIONS: ${input.context.animations.join(', ')}\n`;
    }
    
    if (input.context.changes && input.context.changes.length > 0) {
      context += `CHANGES MADE: ${input.context.changes.join(', ')}\n`;
    }
    
    if (input.context.sceneCount !== undefined) {
      context += `TOTAL SCENES: ${input.context.sceneCount}\n`;
    }
    
    if (input.context.availableScenes && input.context.availableScenes.length > 0) {
      context += `AVAILABLE SCENES: ${input.context.availableScenes.map(s => s.name).join(', ')}\n`;
    }
    
    context += `\n✅ CRITICAL: Base your response ONLY on the actual elements and content listed above. Do NOT invent details like clouds, sunset, or other elements that are not explicitly mentioned in the ACTUAL ELEMENTS CREATED section.`;
    context += `\nGenerate a conversational response about this ${input.operation} operation.`;
    
    return context;
  }

  /**
   * Get fallback responses for different operations
   */
  private getFallbackResponse(operation: string): string {
    switch (operation) {
      case 'addScene':
        return "I've created a new scene for you! Check it out in the timeline.";
      case 'editScene':
        return "I've updated the scene with your requested changes.";
      case 'deleteScene':
        return "Scene deleted successfully.";
      case 'askSpecify':
        return "Could you please provide more details about what you'd like me to do?";
      case 'fixBrokenScene':
        return "I'm sorry to hear that the scene is broken. I'll work on fixing it for you.";
      default:
        return "Operation completed successfully!";
    }
  }

  /**
   * Get fallback clarification questions
   */
  private getFallbackClarification(ambiguityType: string, availableScenes?: Array<{ id: string; name: string; number?: number }>): string {
    switch (ambiguityType) {
      case 'scene-selection':
        if (availableScenes && availableScenes.length > 0) {
          return `Which scene are you referring to? I see ${availableScenes.map(s => `Scene ${s.number || s.id}`).join(' and ')}.`;
        }
        return "Which scene would you like me to work with?";
      
      case 'action-unclear':
        return "What would you like me to do exactly?";
      
      case 'parameter-missing':
        return "Could you provide more details about what you'd like me to change?";
      
      default:
        return "Could you please clarify what you'd like me to do?";
    }
  }
}

// Export singleton instance
export const conversationalResponseService = new ConversationalResponseService(); 