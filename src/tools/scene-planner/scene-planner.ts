import { BaseMCPTool } from "~/tools/helpers/base";
import { SCENE_PLANNER } from "~/config/prompts/active/scene-planner";
import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
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
      
      return {
        success: true,
        scenePlans,
        reasoning: `Planned ${scenePlans.length} scenes for multi-scene video`,
        chatResponse: `📝 I've planned ${scenePlans.length} scenes for your video`,
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
    
    if (input.storyboardSoFar?.length) {
      context += `<Previous scenes>\n${input.storyboardSoFar.map(s => `${s.name}: ${s.tsxCode.substring(0, 200)}...`).join('\n')}\n\n`;
    }
    
    if (input.imageUrls?.length) {
      context += `<Image provided>\nUser uploaded ${input.imageUrls.length} image(s)\n\n`;
    }
    
    if (input.chatHistory?.length) {
      context += `<Chat history>\n${input.chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`;
    }
    
    return context;
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
      
      // More flexible regex to match variations - make it case insensitive and flexible with whitespace
      const toolMatch = sceneText.match(/Tool Type:\s*(.*?)$/im);
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
        console.log(`✅ [SCENE PLANNER] Scene ${index + 1} prompt: "${prompt.substring(0, 50)}..."`);
        
        plans.push({
          toolType,
          prompt,
          order: index,
          context: {},
          fallbackUsed
        });
      } else {
        console.error(`🚨 [SCENE PLANNER] Failed to parse scene ${index + 1}:`);
        console.error(`🚨 [SCENE PLANNER] Scene text: ${sceneText}`);
        console.error(`🚨 [SCENE PLANNER] Tool match:`, toolMatch);
        console.error(`🚨 [SCENE PLANNER] Prompt match:`, promptMatch);
      }
    });
    
    console.log(`📋 [SCENE PLANNER] Successfully parsed ${plans.length} scenes`);
    return plans;
  }
}

export const scenePlannerTool = new ScenePlannerTool();