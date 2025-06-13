// src/server/services/scene/edit/BaseEditor.ts
import { StandardSceneEditService } from '~/server/services/base/StandardSceneService';
import { AIClientService } from '~/server/services/ai/aiClient.service';
import { getModel, resolveDirectCodeEditorModel } from '~/config/models.config';
import { getSystemPrompt } from '~/config/prompts.config';

/**
 * Base class for edit services with shared image/text handling logic
 */
export abstract class BaseEditor extends StandardSceneEditService {
  protected aiClient: AIClientService;
  
  constructor() {
    super();
    this.aiClient = new AIClientService();
  }
  
  /**
   * Get appropriate model and prompt based on edit type and presence of images
   */
  protected getModelAndPrompt(editType: 'surgical' | 'creative', hasImages: boolean) {
    if (hasImages) {
      return {
        model: getModel('editSceneWithImage'),
        prompt: getSystemPrompt('EDIT_SCENE_WITH_IMAGE')
      };
    }
    
    return {
      model: resolveDirectCodeEditorModel(editType),
      prompt: getSystemPrompt(editType === 'surgical' ? 'DIRECT_CODE_EDITOR_SURGICAL' : 'DIRECT_CODE_EDITOR_CREATIVE')
    };
  }
  
  /**
   * Make AI request with appropriate method (vision or text)
   */
  protected async makeAIRequest(params: {
    model: any;
    systemPrompt: string;
    userPrompt: string;
    messages: any[];
    imageUrls?: string[];
    editType?: string;
  }) {
    if (params.imageUrls?.length) {
      // Add edit type to the message for vision requests
      const messagesWithType = params.messages.map(msg => ({
        ...msg,
        content: typeof msg.content === 'string' 
          ? JSON.parse(msg.content) 
          : msg.content
      }));
      
      if (messagesWithType[0] && params.editType) {
        messagesWithType[0].content.editType = params.editType;
      }
      
      return await this.aiClient.generateVisionResponse({
        model: params.model.model,
        temperature: params.model.temperature,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        images: params.imageUrls,
        messages: messagesWithType
      });
    }
    
    return await this.aiClient.generateResponse({
      model: params.model.model,
      temperature: params.model.temperature,
      maxTokens: params.model.maxTokens,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      messages: params.messages
    });
  }
  
  /**
   * Parse edit response from AI
   */
  protected parseEditResponse(response: string): {
    tsxCode: string;
    changes?: string[];
    preserved?: string[];
    reasoning?: string;
  } {
    try {
      // First try to extract code
      const codeMatch = response.match(/```(?:typescript|tsx|javascript|jsx)?\s*([\s\S]*?)\s*```/);
      const tsxCode = codeMatch ? codeMatch[1].trim() : response.trim();
      
      // Try to parse structured response if it exists
      const structuredMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (structuredMatch) {
        const structured = JSON.parse(structuredMatch[1]);
        return {
          tsxCode: structured.code || tsxCode,
          changes: structured.changes,
          preserved: structured.preserved,
          reasoning: structured.reasoning
        };
      }
      
      // Otherwise just return the code
      return { tsxCode };
    } catch (error) {
      console.error('Failed to parse edit response:', error);
      return { tsxCode: response };
    }
  }
}