// src/server/services/scene/add/ImageToCodeGenerator.ts
import { StandardSceneService } from '@/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse } from '@/lib/types/api/golden-rule-contracts';
import { aiClient } from '@/server/services/ai/aiClient.service';
import { getModel } from '@/config/models.config';
import { getPrompt } from '@/config/prompts.config';
import { analyzeDuration } from '@/lib/utils/codeDurationExtractor';
import { db } from '@/server/db';
import { scenes } from '@/server/db/schema';
import crypto from 'crypto';

/**
 * Image to Code Generator Service
 * Responsible for generating scenes directly from images using vision models
 * Bypasses the layout step for direct visual-to-code generation
 */
export class ImageToCodeGenerator extends StandardSceneService {
  
  /**
   * Generate scene code directly from images
   */
  async generateFromImages(input: {
    projectId: string;
    prompt: string;
    imageUrls: string[];
    order?: number;
    visionAnalysis?: any;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const order = input.order || 0;
    const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    const functionName = `Scene${order + 1}_${uniqueId}`;
    const displayName = `Scene ${order + 1}`;
    
    // Get model and prompt configuration
    const model = getModel('createSceneFromImage');
    const systemPrompt = getPrompt('create-scene-from-image');
    
    // Generate code directly from images
    const response = await aiClient.generateVisionResponse({
      model: model.model,
      temperature: model.temperature,
      systemPrompt: systemPrompt,
      userPrompt: input.prompt,
      images: input.imageUrls,
      messages: [{
        role: 'user',
        content: `Generate React/Remotion code for function ${functionName} based on these images. ${input.prompt}`
      }]
    });
    
    // Extract code from response
    const tsxCode = this.extractCode(response.content);
    
    // Analyze duration from the generated code
    const duration = analyzeDuration(tsxCode).frames || 150;
    
    // Create scene entity
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order,
      name: displayName,
      tsxCode, // Using exact DB field name
      duration,
      props: { 
        imageUrls: input.imageUrls,
        visionAnalysis: input.visionAnalysis 
      }
    });
    
    // Save to database
    await db.insert(scenes).values(scene);
    
    return this.createSceneResponse(
      scene,
      `Generated scene from ${input.imageUrls.length} image(s)`,
      `Created ${displayName} from visual reference`
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
    return this.generateFromImages(input);
  }
}