// Intent analyzer for tool selection

import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { SYSTEM_PROMPTS } from "~/config/prompts.config";
import type { OrchestrationInput, ToolSelectionResult, ContextPacket } from "~/lib/types/ai/brain.types";

export class IntentAnalyzer {
  private modelConfig = getModel("brain");
  
  async analyzeIntent(input: OrchestrationInput, contextPacket: ContextPacket): Promise<ToolSelectionResult> {
    console.log('\n🎯 [NEW INTENT ANALYZER] === ANALYZING INTENT ===');
    console.log('🎯 [NEW INTENT ANALYZER] User prompt:', input.prompt.substring(0, 50) + '...');
    
    try {
      const systemPrompt = SYSTEM_PROMPTS.BRAIN_ORCHESTRATOR.content;
      const userPrompt = this.buildUserPrompt(input, contextPacket);
      
      const response = await AIClientService.generateResponse(
        this.modelConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        undefined,
        { responseFormat: { type: "json_object" } }
      );

      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from Brain LLM");
      }

      console.log('🎯 [NEW INTENT ANALYZER] Brain responded, parsing decision...');
      const parsed = this.extractJsonFromResponse(rawOutput);
      const result = this.processBrainDecision(parsed, input);
      
      console.log('🎯 [NEW INTENT ANALYZER] Decision:', {
        toolName: result.toolName,
        success: result.success,
        reasoning: result.reasoning?.substring(0, 50) + '...'
      });
      
      return result;

    } catch (error) {
      console.error('[IntentAnalyzer] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Intent analysis failed",
      };
    }
  }

  private buildUserPrompt(input: OrchestrationInput, contextPacket: ContextPacket): string {
    const { prompt, storyboardSoFar } = input;
    
    // Build storyboard context with clear ordering and recency
    let storyboardInfo = "No scenes yet";
    if (storyboardSoFar && storyboardSoFar.length > 0) {
      storyboardInfo = storyboardSoFar.map((scene, i) => {
        const sceneNum = i + 1;
        const isNewest = i === storyboardSoFar.length - 1;
        const isFirst = i === 0;
        return `Scene ${sceneNum}: "${scene.name}" (ID: ${scene.id})${isNewest ? ' [NEWEST/LAST ADDED]' : ''}${isFirst ? ' [FIRST]' : ''}`;
      }).join('\n');
      
      // Add helpful context about recent actions
      if (storyboardSoFar.length > 0) {
        storyboardInfo += `\n\nIMPORTANT: When user says "it" or "the scene" right after adding content, they usually mean the NEWEST scene (Scene ${storyboardSoFar.length}).`;
      }
      
      if (input.userContext?.sceneId) {
        const selected = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
        if (selected) storyboardInfo += `\nUSER SELECTED: "${selected.name}"`;
      }
    }
    
    // Add image context
    let imageInfo = "";
    if (contextPacket.imageContext && contextPacket.imageContext.conversationImages.length > 0) {
      const images = contextPacket.imageContext.conversationImages;
      imageInfo = `\nIMAGES IN CONVERSATION:`;
      images.forEach((img: any) => {
        imageInfo += `\n${img.position}. "${img.userPrompt}" [${img.imageCount} image(s)]`;
      });
      imageInfo += `\n\nWhen user references images:
- "the image" or "this image" → most recent image (position ${images.length})
- "first/second/third image" → by position number
- "image 1/2/3" → by position number
- "earlier image" → previous images in conversation

NOTE: All tools are multimodal. When images are referenced, include them in the tool's imageUrls parameter.`;
    }
    
    // Check if current prompt has images  
    const currentImageUrls = (input.userContext?.imageUrls as string[]) || [];
    if (currentImageUrls.length > 0) {
      imageInfo += `\n\nCURRENT MESSAGE: Includes ${currentImageUrls.length} image(s) uploaded with this request.`;
    }
    
    // Add conversation context with recent action detection
    let chatInfo = "";
    if (contextPacket.conversationContext !== 'New conversation') {
      chatInfo = `\nCONVERSATION: ${contextPacket.conversationContext}`;
      
      // Check if last message indicates we just added a scene
      const lastMessages = contextPacket.last5Messages || [];
      if (lastMessages.length >= 2) {
        const lastAssistantMsg = [...lastMessages].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMsg && (
          lastAssistantMsg.content.includes('added') || 
          lastAssistantMsg.content.includes('created') ||
          lastAssistantMsg.content.includes('I\'ve added')
        )) {
          chatInfo += `\nRECENT: Just added a new scene (likely Scene ${storyboardSoFar?.length || 'latest'})`;
        }
      }
    }

    return `USER: "${prompt}"

STORYBOARD:
${storyboardInfo}${imageInfo}${chatInfo}

Respond with JSON only.`;
  }

  private extractJsonFromResponse(content: string): any {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    const cleaned = content.trim();

    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      const startIndex = lines.findIndex(line => line.includes('```json') || line === '```');
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('```'));
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonLines = lines.slice(startIndex + 1, endIndex);
        const jsonString = jsonLines.join('\n').trim();
        
        if (!jsonString) {
          throw new Error('Empty JSON content in markdown block');
        }
        
        return JSON.parse(jsonString);
      }
    }

    return JSON.parse(cleaned);
  }

  private processBrainDecision(parsed: any, input: OrchestrationInput): ToolSelectionResult {
    // Check for multi-step workflow
    if (parsed.workflow && Array.isArray(parsed.workflow)) {
      return {
        success: true,
        workflow: parsed.workflow,
        reasoning: parsed.reasoning || "Multi-step workflow planned",
      };
    }
    
    // Handle clarification responses
    if (parsed.needsClarification) {
      return {
        success: true,
        needsClarification: true,
        clarificationQuestion: parsed.clarificationQuestion,
        reasoning: parsed.reasoning
      };
    }

    // Single tool operation
    const result: ToolSelectionResult = {
      success: true,
      toolName: parsed.toolName,
      reasoning: parsed.reasoning,
      targetSceneId: parsed.targetSceneId,
      userFeedback: parsed.userFeedback,
    };

    // Extract requested duration
    const requestedDurationSeconds = this.extractRequestedDuration(input.prompt);
    if (requestedDurationSeconds) {
      result.requestedDurationSeconds = requestedDurationSeconds;
    }

    return result;
  }

  private extractRequestedDuration(prompt: string): number | undefined {
    const durationMatch = prompt.match(/\b(\d+)\s*(?:seconds?|sec|se[ocn]{1,3}ds?)\b/i);
    if (durationMatch && durationMatch[1]) {
      const seconds = parseInt(durationMatch[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds;
      }
    }
    return undefined;
  }
} 