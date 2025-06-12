// src/server/services/scene/add/CodeGenerator.ts
import { StandardSceneService } from '@/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse } from '@/lib/types/api/golden-rule-contracts';
import { aiClient } from '@/server/services/ai/aiClient.service';
import { getModel } from '@/config/models.config';
import { getPrompt } from '@/config/prompts.config';
import { analyzeDuration } from '@/lib/utils/codeDurationExtractor';
import { db } from '@/server/db';
import { scenes } from '@/server/db/schema';

/**
 * Code Generator Service
 * Responsible for converting JSON layouts to React/Remotion code
 * This is step 2 of the 2-step scene creation pipeline
 */
export class CodeGenerator extends StandardSceneService {
  
  /**
   * Generate React/Remotion code from a JSON layout
   */
  async generateFromLayout(input: {
    projectId: string;
    prompt: string;
    layout: any;
    functionName: string;
    order?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const order = input.order || 0;
    const displayName = `Scene ${order + 1}`;
    
    // Get model and prompt configuration
    const model = getModel('codeGenerator');
    const systemPrompt = getPrompt('code-generator');
    
    // Generate code from layout
    const response = await aiClient.generateResponse({
      model: model.model,
      temperature: model.temperature,
      systemPrompt: systemPrompt,
      userPrompt: `Generate React/Remotion code for function ${input.functionName}`,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          layoutJson: input.layout,
          functionName: input.functionName,
          originalPrompt: input.prompt
        })
      }]
    });
    
    // Extract code from response
    const tsxCode = this.extractCode(response.content);
    
    // Analyze duration from the generated code
    const duration = analyzeDuration(tsxCode).frames || 150;
    
    // Create complete scene entity
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order,
      name: displayName,
      tsxCode, // Using exact DB field name
      duration,
      layoutJson: JSON.stringify(input.layout)
    });
    
    // Save to database
    await db.insert(scenes).values(scene);
    
    return this.createSceneResponse(
      scene,
      `Generated ${input.layout.sceneType || 'custom'} scene code`,
      `Created ${displayName} with ${input.layout.elements?.length || 0} elements`
    );
  }
  
  /**
   * Extract code from AI response
   */
  private extractCode(response: string): string {
    // Extract code from markdown code blocks
    const codeMatch = response.match(/```(?:typescript|tsx|javascript|jsx)?\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    // If no code block, assume entire response is code
    return response.trim();
  }
  
  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.generateFromLayout(input);
  }
}