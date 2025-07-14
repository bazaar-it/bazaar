import { BaseMCPTool } from "~/tools/helpers/base";
import { SCENE_PLANNER } from "~/config/prompts/active/scene-planner";
import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { codeGenerator } from "~/tools/add/add_helpers/CodeGeneratorNEW";
import type { ScenePlannerToolInput, ScenePlannerToolOutput, ScenePlan } from "~/tools/helpers/types";
import { scenePlannerToolInputSchema } from "~/tools/helpers/types";

export class ScenePlannerTool extends BaseMCPTool<ScenePlannerToolInput, ScenePlannerToolOutput> {
  name = "SCENE_PLANNER";
  description = "Plan multi-scene video sequences";
  inputSchema = scenePlannerToolInputSchema;

  protected async execute(input: ScenePlannerToolInput): Promise<ScenePlannerToolOutput> {
    console.log('📋 [SCENE PLANNER] Planning multi-scene video');
    
    try {
      // Build context for the planner
      const contextString = this.buildContextString(input);
      
      const response = await AIClientService.generateResponse(
        getModel("brain"),
        [
          { role: "user", content: `${input.userPrompt}\n\n${contextString}` }
        ],
        { role: "system", content: SCENE_PLANNER.content }
      );
      
      const responseContent = response.content || '';
      
      // Validate that we got a response
      if (!responseContent.trim()) {
        return {
          success: false,
          scenePlans: [],
          reasoning: 'Scene planning failed - empty response from AI',
          error: 'Empty response from AI service',
        };
      }
      
      const scenePlans = this.parseScenePlans(responseContent);
      
      // Validate that we got at least one scene plan
      if (scenePlans.length === 0) {
        return {
          success: false,
          scenePlans: [],
          reasoning: 'Scene planning failed - no valid scene plans found in response',
          error: 'Failed to parse any valid scene plans from AI response',
        };
      }
      
      // 🚀 IMMEDIATE RETURN: Give scene plans to user right away
      console.log('📝 [SCENE PLANNER] Returning scene plans immediately to user');
      
      return {
        success: true,
        scenePlans,
        // No firstScene here - we'll generate it separately in the backend
        reasoning: `Planned ${scenePlans.length} scenes for your video`,
        chatResponse: `📝 I've planned ${scenePlans.length} scenes for your video and I'm creating the first one now!`,
        // Mark that we should auto-generate scene 1 in the background
        shouldAutoGenerateFirstScene: true,
        firstScenePlan: scenePlans[0] // Pass the plan for background generation
      };
    } catch (error) {
      return {
        success: false,
        scenePlans: [],
        reasoning: 'Failed to plan scenes',
        error: error instanceof Error ? error.message : 'Scene planning failed',
      };
    }
  }

  private buildContextString(input: ScenePlannerToolInput): string {
    let context = '';
    
    // Enhanced previous scenes context
    if (input.storyboardSoFar?.length) {
      context += `<Previous scenes - Study for continuity>\n`;
      input.storyboardSoFar.forEach((scene, index) => {
        // Extract visual style information from code
        const visualStyle = this.extractVisualStyle(scene.tsxCode);
        context += `Scene ${index + 1}: "${scene.name}"\n`;
        context += `Visual Style: ${visualStyle}\n`;
        context += `Code Preview: ${scene.tsxCode.substring(0, 300)}...\n`;
        context += `---\n`;
      });
      context += `\nKey Continuity Notes:\n`;
      context += `- Maintain consistent color palette and animation timing\n`;
      context += `- Consider visual transitions between scenes\n`;
      context += `- Build narrative flow from previous scenes\n\n`;
    }
    
    // Enhanced image context with detailed analysis
    if (input.imageUrls?.length) {
      context += `<Images provided - Key context for scene planning>\n`;
      context += `User uploaded ${input.imageUrls.length} image(s) which should heavily influence the planning:\n\n`;
      
      // Smart image context based on multiple images
      if (input.imageUrls.length === 1) {
        context += `SINGLE IMAGE STRATEGY:\n`;
        context += `- This image likely represents the core visual identity/brand\n`;
        context += `- Extract colors, typography, UI elements for consistent theming\n`;
        context += `- Consider if this shows a product/interface that should be recreated\n`;
        context += `- Use this as the primary visual reference for all scenes\n\n`;
      } else {
        context += `MULTIPLE IMAGES STRATEGY:\n`;
        context += `- These images likely show different aspects/features of the product\n`;
        context += `- Plan scenes that correspond to each major image\n`;
        context += `- Extract consistent brand elements across all images\n`;
        context += `- Consider a sequence that walks through different features/views\n`;
        context += `- Each scene should focus on recreating/highlighting specific images\n\n`;
      }
      
      // Add image URLs for reference
      input.imageUrls.forEach((url, index) => {
        context += `Image ${index + 1}: ${url}\n`;
      });
      context += `\nCRITICAL: When planning scenes based on images, specify which image each scene should reference!\n\n`;
    }
    
    // Enhanced chat history with intent extraction
    if (input.chatHistory?.length) {
      context += `<Chat history - User intent and preferences>\n`;
      const recentMessages = input.chatHistory.slice(-10); // Last 10 messages for context
      const userMessages = recentMessages.filter(m => m.role === 'user');
      const assistantMessages = recentMessages.filter(m => m.role === 'assistant');
      
      if (userMessages.length > 0) {
        context += `User's Key Requests:\n`;
        userMessages.forEach((msg, index) => {
          context += `- ${msg.content.substring(0, 200)}...\n`;
        });
        context += `\n`;
      }
      
      if (assistantMessages.length > 0) {
        context += `Previous AI Responses (for continuity):\n`;
        assistantMessages.slice(-3).forEach((msg, index) => {
          context += `- ${msg.content.substring(0, 150)}...\n`;
        });
        context += `\n`;
      }
    }
    
    // Add strategic planning guidance
    context += `<Strategic Planning Guidance>\n`;
    context += `1. If images show UI/product: Plan scenes that demonstrate key features sequentially\n`;
    context += `2. If images show branding: Extract visual identity for consistent theming\n`;
    context += `3. If no images: Focus on clear value proposition and feature highlights\n`;
    context += `4. Consider narrative arc: Problem → Solution → Benefits → Call to Action\n`;
    context += `5. Plan for visual continuity: consistent colors, typography, animation style\n\n`;
    
    return context;
  }

  // Extract visual style information from scene code
  private extractVisualStyle(code: string): string {
    const styles: string[] = [];
    
    // Extract colors
    const colorMatches = code.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
    if (colorMatches) {
      styles.push(`Colors: ${[...new Set(colorMatches)].slice(0, 3).join(', ')}`);
    }
    
    // Extract gradients
    const gradientMatches = code.match(/linear-gradient\([^)]+\)/g);
    if (gradientMatches) {
      styles.push(`Gradients: ${gradientMatches.length} found`);
    }
    
    // Extract fonts
    const fontMatches = code.match(/fontFamily:\s*["']([^"']+)["']/g);
    if (fontMatches) {
      styles.push(`Fonts: ${fontMatches[0]}`);
    }
    
    // Extract animation patterns
    if (code.includes('spring(')) {
      styles.push('Animations: Spring-based');
    } else if (code.includes('interpolate(')) {
      styles.push('Animations: Linear interpolation');
    }
    
    // Extract background patterns
    if (code.includes('backgroundColor')) {
      styles.push('Background: Solid color');
    } else if (code.includes('gradient')) {
      styles.push('Background: Gradient');
    }
    
    return styles.length > 0 ? styles.join(' | ') : 'Basic styling';
  }

  /**
   * Generate unique component name using a stable ID
   */
  private generateFunctionName(): string {
    const uniqueId = this.generateUniqueId();
    return `Scene_${uniqueId}`;
  }

  /**
   * Generate a unique 8-character ID
   */
  private generateUniqueId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).substring(0, 8);
  }

  private parseScenePlans(content: string): ScenePlan[] {
    const plans: ScenePlan[] = [];
    const sceneMatches = content.match(/<Scene_\d+>[\s\S]*?(?=<Scene_\d+>|$)/g);
    
    if (!sceneMatches) {
      console.warn('🚨 [SCENE PLANNER] No scene matches found in response');
      console.log('🚨 [SCENE PLANNER] Response content:', content.substring(0, 200) + '...');
      return plans;
    }
    
    console.log(`📋 [SCENE PLANNER] Found ${sceneMatches.length} scene blocks`);
    
    sceneMatches.forEach((sceneText, index) => {
      console.log(`📋 [SCENE PLANNER] Parsing scene ${index + 1}:`, sceneText.substring(0, 100) + '...');
      
      // Enhanced regex patterns to match new format
      const toolMatch = sceneText.match(/Tool Type:\s*(.*?)$/im);
      const imageRefMatch = sceneText.match(/Image Reference:\s*(.*?)$/im);
      const promptMatch = sceneText.match(/Your generated prompt:\s*(.*?)(?:\n|$)/im);
      
      if (promptMatch && promptMatch[1]) {
        let toolType: 'typography' | 'recreate' | 'code-generator' = 'code-generator';
        let fallbackUsed = false;
        
        if (toolMatch && toolMatch[1]) {
          const toolText = toolMatch[1].toLowerCase().trim();
          console.log(`📋 [SCENE PLANNER] Scene ${index + 1} tool text: "${toolText}"`);
          
          // Enhanced matching for tool types - handle variations
          if (toolText.includes('typography') || toolText.includes('text')) {
            toolType = 'typography';
          } else if (toolText.includes('recreate') || toolText.includes('image')) {
            toolType = 'recreate';
          } else if (toolText.includes('code') || toolText.includes('generator')) {
            toolType = 'code-generator';
          } else {
            console.warn(`🚨 [SCENE PLANNER] Unknown tool type "${toolText}", falling back to code-generator`);
            fallbackUsed = true;
          }
          
          console.log(`✅ [SCENE PLANNER] Scene ${index + 1}: "${toolText}" → ${toolType}${fallbackUsed ? ' (fallback)' : ''}`);
        } else {
          console.warn(`🚨 [SCENE PLANNER] No tool type found for scene ${index + 1}, falling back to code-generator`);
          fallbackUsed = true;
        }
        
        const prompt = promptMatch[1].trim();
        const imageReference = imageRefMatch && imageRefMatch[1] ? imageRefMatch[1].trim() : null;
        
        console.log(`✅ [SCENE PLANNER] Scene ${index + 1} prompt: "${prompt.substring(0, 50)}..."`);
        if (imageReference) {
          console.log(`🖼️ [SCENE PLANNER] Scene ${index + 1} image ref: "${imageReference}"`);
        }
        
        // Enhanced context with image reference
        const sceneContext: Record<string, any> = {};
        if (imageReference) {
          sceneContext.imageReference = imageReference;
          
          // Parse specific image numbers from reference
          const imageNumberMatch = imageReference.match(/Image (\d+)/i);
          if (imageNumberMatch && imageNumberMatch[1]) {
            sceneContext.specificImageIndex = parseInt(imageNumberMatch[1]) - 1; // 0-based index
          }
          
          // Determine if this is a brand style reference vs direct recreation
          if (imageReference.toLowerCase().includes('brand') || 
              imageReference.toLowerCase().includes('style') || 
              imageReference.toLowerCase().includes('colors')) {
            sceneContext.useBrandStyle = true;
            sceneContext.recreateDirectly = false;
          } else {
            sceneContext.useBrandStyle = false;
            sceneContext.recreateDirectly = true;
          }
        }
        
        plans.push({
          toolType,
          prompt,
          order: index,
          context: sceneContext,
          fallbackUsed
        });
      } else {
        console.error(`🚨 [SCENE PLANNER] Failed to parse scene ${index + 1}:`);
        console.error(`🚨 [SCENE PLANNER] Scene text: ${sceneText}`);
        console.error(`🚨 [SCENE PLANNER] Tool match:`, toolMatch);
        console.error(`🚨 [SCENE PLANNER] Image ref match:`, imageRefMatch);
        console.error(`🚨 [SCENE PLANNER] Prompt match:`, promptMatch);
      }
    });
    
    console.log(`📋 [SCENE PLANNER] Successfully parsed ${plans.length} scenes`);
    return plans;
  }
}

export const scenePlannerTool = new ScenePlannerTool();