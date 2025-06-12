// src/server/services/generation/sceneBuilder.service.updated.ts
import crypto from 'crypto';
import { StandardSceneService } from '~/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse } from '~/lib/types/api/golden-rule-contracts';
import { layoutGeneratorService } from "~/server/services/generation/layoutGenerator.service";
import { codeGeneratorService } from "~/server/services/generation/codeGenerator.service";
import { analyzeDuration } from "~/lib/utils/codeDurationExtractor";

/**
 * SceneBuilder service - UPDATED to extend StandardSceneService
 * Returns standardized format with exact database field names
 */
export class SceneBuilderService extends StandardSceneService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Main method that satisfies the abstract requirement
   * Returns StandardApiResponse with Scene using exact DB field names
   */
  async generateScene(input: {
    userPrompt: string;
    projectId: string;
    sceneNumber?: number;
    previousSceneJson?: string;
    visionAnalysis?: any;
    order?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const startTime = Date.now();
    const sceneNumber = input.sceneNumber || 1;
    const order = input.order ?? 0;
    
    // Generate unique function name
    const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    const uniqueFunctionName = `Scene${sceneNumber}_${uniqueId}`;
    
    // User-friendly display name
    const displayName = `Scene ${sceneNumber}`;
    
    if (this.DEBUG) {
      console.log(`[SceneBuilder] 🚀 Generating scene with standardized output`);
      console.log(`[SceneBuilder] 📝 User prompt: "${input.userPrompt.substring(0, 100)}..."`);
      console.log(`[SceneBuilder] 🎯 Function name: ${uniqueFunctionName}`);
    }
    
    try {
      // STEP 1: Generate JSON layout
      const layoutResult = await layoutGeneratorService.generateLayout({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        previousSceneJson: input.previousSceneJson,
        isFirstScene: !input.previousSceneJson,
        visionAnalysis: input.visionAnalysis,
      });
      
      if (this.DEBUG) {
        console.log(`[SceneBuilder] ✅ Layout generated: ${layoutResult.layoutJson.sceneType}`);
      }
      
      // STEP 2: Generate React/Remotion code from JSON
      const codeResult = await codeGeneratorService.generateCode({
        layoutJson: layoutResult.layoutJson,
        userPrompt: input.userPrompt,
        functionName: uniqueFunctionName,
      });
      
      const generationTime = Date.now() - startTime;
      
      // Create Scene entity with EXACT database field names
      const scene = this.createSceneEntity({
        projectId: input.projectId,
        order: order,
        name: displayName,                    // 'name' not 'sceneName'
        tsxCode: codeResult.code,            // 'tsxCode' not 'code'
        duration: codeResult.duration,        // In frames
        layoutJson: this.stringifyLayout(layoutResult.layoutJson),
        props: null
      });
      
      // Validate scene has all required fields
      this.validateScene(scene);
      
      // Return standardized response
      return this.createSceneResponse(
        scene,
        `${layoutResult.reasoning} → ${codeResult.reasoning}`,
        `Created ${displayName} with ${layoutResult.layoutJson.sceneType} layout`,
        {
          generationTime,
          functionName: uniqueFunctionName,
          layoutStep: layoutResult.debug,
          codeStep: codeResult.debug,
        }
      );
      
    } catch (error) {
      if (this.DEBUG) console.error("[SceneBuilder] Generation error:", error);
      
      // Create fallback scene
      const fallbackScene = this.createFallbackScene(
        input.projectId,
        order,
        displayName,
        uniqueFunctionName,
        input.userPrompt
      );
      
      // Return error response with fallback scene
      return this.createSceneResponse(
        fallbackScene,
        "Generated fallback scene due to pipeline error",
        "An error occurred, created a fallback scene",
        { 
          error: String(error),
          functionName: uniqueFunctionName
        }
      );
    }
  }

  /**
   * Create a fallback scene when generation fails
   */
  private createFallbackScene(
    projectId: string,
    order: number,
    displayName: string,
    functionName: string,
    userPrompt: string
  ) {
    const fallbackLayout = {
      sceneType: "simple",
      background: "#1e1b4b",
      elements: [{
        type: "title",
        id: "title1",
        text: "Scene Generation Error",
        fontSize: 48,
        fontWeight: "700",
        color: "#ffffff",
      }],
      layout: {
        align: "center",
        direction: "column",
        gap: 16,
      },
      animations: {
        title1: {
          type: "fadeIn",
          duration: 60,
          delay: 0,
        }
      }
    };
    
    const fallbackCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${functionName}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill className="bg-red-900 text-white flex items-center justify-center p-8">
      <div style={{ opacity: fadeIn, textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>
          Generation Error
        </h1>
        <p style={{ fontSize: '16px' }}>
          Request: "${userPrompt.substring(0, 100)}..."
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

    return this.createSceneEntity({
      projectId,
      order,
      name: displayName,
      tsxCode: fallbackCode,  // Using exact DB field name
      duration: 150,
      layoutJson: this.stringifyLayout(fallbackLayout),
      props: null
    });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateScene() instead
   */
  async generateTwoStepCode(input: {
    userPrompt: string;
    projectId: string;
    sceneNumber?: number;
    previousSceneJson?: string;
    visionAnalysis?: any;
  }) {
    console.warn('[SceneBuilder] generateTwoStepCode is deprecated. Use generateScene() instead.');
    
    // Call the new standardized method
    const response = await this.generateScene({
      ...input,
      order: 0
    });
    
    // Transform back to legacy format for compatibility
    if (response.success) {
      const { scene } = response.data;
      return {
        code: scene.tsxCode,           // Map back from tsxCode
        name: scene.name,
        duration: scene.duration,
        reasoning: response.metadata.reasoning || '',
        layoutJson: scene.layoutJson ? JSON.parse(scene.layoutJson) : {},
        debug: response.debug
      };
    } else {
      throw new Error(response.metadata.reasoning || 'Generation failed');
    }
  }
}

// Export singleton instance
export const sceneBuilderService = new SceneBuilderService();