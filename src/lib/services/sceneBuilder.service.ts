// src/lib/services/sceneBuilder.service.ts
import crypto from 'crypto';
import { layoutGeneratorService } from "./layoutGenerator.service";
import { codeGeneratorService } from "./codeGenerator.service";
import { analyzeDuration } from "~/lib/utils/codeDurationExtractor";

/**
 * SceneBuilder service - Simple orchestrator for the two-step pipeline
 * Step 1: LayoutGenerator (@style-json-prompt.md) 
 * Step 2: CodeGenerator (@codegen-prompt.md)
 */
export class SceneBuilderService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Two-step pipeline using proven prompts
   * LayoutGenerator (@style-json-prompt.md) → CodeGenerator (@codegen-prompt.md)
   */
  async generateTwoStepCode(input: {
    userPrompt: string;
    projectId: string;
    sceneNumber?: number;
    previousSceneJson?: string;
    visionAnalysis?: any; // 🚨 NEW: Vision analysis from analyzeImage tool
  }): Promise<{
    code: string;
    name: string;
    duration: number;
    reasoning: string;
    layoutJson: any;  // ✅ No schema - accept any JSON
    debug: any;
  }> {
    const startTime = Date.now();
    const sceneNumber = input.sceneNumber || 1;
    
    // ✅ TECHNICAL: Unique function name for React compilation
    const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    const uniqueFunctionName = `Scene${sceneNumber}_${uniqueId}`;
    
    // ✅ USER-FRIENDLY: Simple display name for users
    const displayName = `Scene ${sceneNumber}`;
    
    if (this.DEBUG) console.log(`[SceneBuilder] 🚀 Two-step pipeline starting`);
    if (this.DEBUG) console.log(`[SceneBuilder] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    if (this.DEBUG) console.log(`[SceneBuilder] 🎯 Function name: ${uniqueFunctionName}`);
    if (this.DEBUG) console.log(`[SceneBuilder] 👤 Display name: ${displayName}`);
    if (this.DEBUG) console.log(`[SceneBuilder] 📊 Scene number: ${sceneNumber}`);
    if (this.DEBUG) console.log(`[SceneBuilder] 🎨 Has previous scene: ${input.previousSceneJson ? 'YES' : 'NO'}`);
    
    try {
      // STEP 1: Generate JSON layout using @style-json-prompt.md
      if (this.DEBUG) console.log(`[SceneBuilder] 📋 STEP 1: LayoutGenerator`);
      const layoutResult = await layoutGeneratorService.generateLayout({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        previousSceneJson: input.previousSceneJson,
        isFirstScene: !input.previousSceneJson,
        visionAnalysis: input.visionAnalysis,
      });
      
      if (this.DEBUG) console.log(`[SceneBuilder] ✅ STEP 1 completed: ${layoutResult.layoutJson.sceneType} with ${layoutResult.layoutJson.elements?.length || 0} elements`);
      
      // ✅ NEW: Log the JSON handoff between steps
      if (this.DEBUG) {
        console.log(`\n[SceneBuilder] 🔄 PIPELINE HANDOFF:`);
        console.log(`[SceneBuilder] ✅ Layout Generator produced: ${layoutResult.layoutJson.sceneType || 'unknown'} scene`);
        console.log(`[SceneBuilder] ⚡ Passing ${JSON.stringify(layoutResult.layoutJson).length} char JSON to Code Generator`);
        console.log(`[SceneBuilder] 🎯 Target function: ${uniqueFunctionName}\n`);
      }
      
      // STEP 2: Generate React/Remotion code from JSON
      if (this.DEBUG) console.log(`[SceneBuilder] 🎬 STEP 2: CodeGenerator for ${layoutResult.layoutJson.sceneType} scene`);
      const codeResult = await codeGeneratorService.generateCode({
        layoutJson: layoutResult.layoutJson,
        userPrompt: input.userPrompt,
        functionName: uniqueFunctionName,
      });
      
      const generationTime = Date.now() - startTime;
      if (this.DEBUG) console.log(`[SceneBuilder] ✅ Two-step pipeline completed successfully in ${generationTime}ms`);
      if (this.DEBUG) console.log(`[SceneBuilder] 📊 Final result: ${codeResult.code.length} chars of code generated`);
      
      // ✅ NEW: Log the complete pipeline result
      if (this.DEBUG) {
        console.log(`\n[SceneBuilder] 🎉 PIPELINE COMPLETE:`);
        console.log(`[SceneBuilder] ⏱️  Total time: ${generationTime}ms`);
        console.log(`[SceneBuilder] 📝 Generated code: ${codeResult.code.length} characters`);
        console.log(`[SceneBuilder] 🎬 Scene duration: ${codeResult.duration} frames`);
        console.log(`[SceneBuilder] 🎯 Function name: ${uniqueFunctionName}`);
        console.log(`[SceneBuilder] 👤 Display name: ${displayName}`);
        console.log(`[SceneBuilder] 🎨 Scene type: ${layoutResult.layoutJson.sceneType || 'unknown'}\n`);
      }
      
      return {
        code: codeResult.code,
        name: displayName,
        duration: codeResult.duration,
        reasoning: `${layoutResult.reasoning} → ${codeResult.reasoning}`,
        layoutJson: layoutResult.layoutJson,
        debug: {
          generationTime,
          functionName: uniqueFunctionName,
          layoutStep: layoutResult.debug,
          codeStep: codeResult.debug,
        }
      };
      
    } catch (error) {
      if (this.DEBUG) console.error("[SceneBuilder] Pipeline error:", error);
      
      // Complete fallback (no schema)
      const fallbackLayout = {
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
        name: displayName,
        duration: analyzeDuration(fallbackCode).frames,
        reasoning: "Complete fallback due to two-step pipeline error",
        layoutJson: fallbackLayout,
        debug: { 
          error: String(error),
          functionName: uniqueFunctionName
        }
      };
    }
  }
}

// Export singleton instance
export const sceneBuilderService = new SceneBuilderService(); 