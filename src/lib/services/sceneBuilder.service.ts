import { openai } from "~/server/lib/openai";
import { codeValidationService } from "~/server/services/codeValidation.service";
import { jsonrepair } from 'jsonrepair';
import { layoutGeneratorService } from "./layoutGenerator.service";
import { codeGeneratorService } from "./codeGenerator.service";
import { type SceneLayout } from "~/lib/schemas/sceneLayout";

/**
 * SceneBuilder service - Simple orchestrator for the two-step pipeline
 * Step 1: LayoutGenerator (@style-json-prompt.md) 
 * Step 2: CodeGenerator (@codegen-prompt.md)
 */
export class SceneBuilderService {
  private readonly model = "gpt-4.1-mini";
  private readonly temperature = 0.3; // Balanced creativity vs consistency
  
  /**
   * Two-step pipeline using proven prompts
   * LayoutGenerator (@style-json-prompt.md) → CodeGenerator (@codegen-prompt.md)
   */
  async generateTwoStepCode(input: {
    userPrompt: string;
    projectId: string;
    sceneNumber?: number;
    previousSceneJson?: string;
  }): Promise<{
    code: string;
    name: string;
    duration: number;
    reasoning: string;
    layoutJson: SceneLayout;
    debug: any;
  }> {
    const startTime = Date.now();
    const sceneNumber = input.sceneNumber || 1;
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const uniqueFunctionName = `Scene${sceneNumber}_${uniqueId}`;
    
    console.log(`[SceneBuilder] 🚀 Two-step pipeline starting`);
    console.log(`[SceneBuilder] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    console.log(`[SceneBuilder] 🎯 Function name: ${uniqueFunctionName}`);
    console.log(`[SceneBuilder] 📊 Scene number: ${sceneNumber}`);
    console.log(`[SceneBuilder] 🎨 Has previous scene: ${input.previousSceneJson ? 'YES' : 'NO'}`);
    
    try {
      // STEP 1: Generate JSON layout using @style-json-prompt.md
      console.log(`[SceneBuilder] 📋 STEP 1: LayoutGenerator`);
      const layoutResult = await layoutGeneratorService.generateLayout({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        previousSceneJson: input.previousSceneJson,
        isFirstScene: !input.previousSceneJson,
      });
      
      console.log(`[SceneBuilder] ✅ STEP 1 completed: ${layoutResult.layoutJson.sceneType} with ${layoutResult.layoutJson.elements?.length || 0} elements`);
      
      // STEP 2: Generate React/Remotion code from JSON
      console.log(`[SceneBuilder] 🎬 STEP 2: CodeGenerator for ${layoutResult.layoutJson.sceneType} scene`);
      const codeResult = await codeGeneratorService.generateCode({
        layoutJson: layoutResult.layoutJson,
        userPrompt: input.userPrompt,
        functionName: uniqueFunctionName,
      });
      
      const generationTime = Date.now() - startTime;
      console.log(`[SceneBuilder] ✅ Two-step pipeline completed successfully in ${generationTime}ms`);
      console.log(`[SceneBuilder] 📊 Final result: ${codeResult.code.length} chars of code generated`);
      
      return {
        code: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
        reasoning: `${layoutResult.reasoning} → ${codeResult.reasoning}`,
        layoutJson: layoutResult.layoutJson,
        debug: {
          generationTime,
          layoutStep: layoutResult.debug,
          codeStep: codeResult.debug,
        }
      };
      
    } catch (error) {
      console.error("[SceneBuilder] Pipeline error:", error);
      
      // Complete fallback
      const fallbackLayout: SceneLayout = {
        sceneType: "simple",
        background: "#1e1b4b",
        elements: [
          {
            type: "title",
            id: "title1",
            text: "Scene Generation Error",
            fontSize: 48,
            fontWeight: "700",
            color: "#ffffff",
          }
        ],
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

export default function ${uniqueFunctionName}() {
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
          Request: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

      return {
        code: fallbackCode,
        name: "Error Scene",
        duration: 90,
        reasoning: "Complete fallback due to two-step pipeline error",
        layoutJson: fallbackLayout,
        debug: { error: String(error) }
      };
    }
  }
}

// Export singleton instance
export const sceneBuilderService = new SceneBuilderService(); 