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
      
      // Debug log to see what brain actually returned
      console.log('🎯 [NEW INTENT ANALYZER] Raw parsed JSON:', JSON.stringify(parsed, null, 2));
      
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
        const durationSec = (scene.duration / 30).toFixed(1); // Convert frames to seconds
        return `Scene ${sceneNum}: "${scene.name}" (ID: ${scene.id}, Duration: ${scene.duration} frames / ${durationSec}s)${isNewest ? ' [NEWEST/LAST ADDED]' : ''}${isFirst ? ' [FIRST]' : ''}`;
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
    if (contextPacket.imageContext && contextPacket.imageContext.recentImagesFromChat && contextPacket.imageContext.recentImagesFromChat.length > 0) {
      const images = contextPacket.imageContext.recentImagesFromChat;
      imageInfo = `\nIMAGES IN CONVERSATION:`;
      images.forEach((img: any) => {
        imageInfo += `\n${img.position}. "${img.userPrompt}" [${img.imageUrls.length} image(s)]`;
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
    const recentMessages = contextPacket.recentMessages || [];
    if (recentMessages.length > 0) {
      chatInfo = "\nRECENT CONVERSATION:";
      // Include last 3 message pairs for context
      const messagesToShow = recentMessages.slice(-6);
      messagesToShow.forEach((msg, idx) => {
        chatInfo += `\n${msg.role.toUpperCase()}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`;
      });
    }

    // Add web analysis context
    let webInfo = "";
    if (contextPacket.webContext) {
      const web = contextPacket.webContext;
      webInfo = `\nWEB ANALYSIS CONTEXT:
Website: ${web.pageData.title} (${web.originalUrl})
Description: ${web.pageData.description || 'No description'}
Key Headings: ${web.pageData.headings.slice(0, 3).join(', ')}
Screenshots: Desktop (${web.screenshotUrls.desktop}) & Mobile (${web.screenshotUrls.mobile})
Analyzed: ${new Date(web.analyzedAt).toLocaleString()}

The AI has access to visual screenshots of this website and can reference them for brand matching, design inspiration, and style consistency.`;
    }

    return `USER: "${prompt}"

STORYBOARD:
${storyboardInfo}${imageInfo}${chatInfo}${webInfo}

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
      // If brain provided both tool and clarification, prefer the tool
      if (parsed.toolName) {
        console.log('🎯 [INTENT] Brain wants clarification but chose tool - proceeding with tool:', parsed.toolName);
        // Continue to normal processing
      } else {
        // Only clarification, no tool
        return {
          success: true,
          needsClarification: true,
          clarificationQuestion: parsed.clarificationQuestion,
          reasoning: parsed.reasoning,
          toolName: null  // Explicitly null, not undefined
        };
      }
    }

    // Single tool operation
    const result: ToolSelectionResult = {
      success: true,
      toolName: parsed.toolName,
      reasoning: parsed.reasoning,
      targetSceneId: parsed.targetSceneId,
      targetDuration: parsed.targetDuration, // Pass through targetDuration for trim
      referencedSceneIds: parsed.referencedSceneIds, // Pass through referenced scenes
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