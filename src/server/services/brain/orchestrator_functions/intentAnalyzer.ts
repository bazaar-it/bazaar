// src/server/services/brain/orchestrator_functions/intentAnalyzer.ts
// Analyzes user intent to understand what they want to do

import { AIClientService } from '~/server/services/ai/aiClient.service';
import type { ProjectContext } from './types';
import type { AnalyzedIntent } from '~/lib/types/api/brain-contracts';

const INTENT_ANALYSIS_PROMPT = `You are an intent analyzer for a video creation platform.
Analyze the user's request and determine their exact intent.

INTENT TYPES:
- create: User wants to add a new scene
- edit: User wants to modify an existing scene
- delete: User wants to remove a scene
- analyze: User wants to understand/analyze an image

EDIT TYPES (if intent is edit):
- surgical: Specific, minimal change (e.g., "change button to red", "fix typo")
- creative: Aesthetic improvements (e.g., "make it modern", "improve design")
- fix: Fix errors or broken functionality
- duration: Only changing timing (e.g., "make it 3 seconds")

RESPONSE FORMAT:
{
  "type": "create|edit|delete|analyze",
  "editType": "surgical|creative|fix|duration",
  "targetSceneId": "scene_id if specific scene mentioned",
  "specificChange": "exact change requested for surgical edits",
  "durationSeconds": 3,
  "confidence": 0.95,
  "reasoning": "why you made this decision"
}

IMPORTANT:
- For surgical edits, be VERY specific about what to change and what to preserve
- If user mentions a specific scene by name or context, include targetSceneId
- If no scenes exist, always choose "create" regardless of wording
- Duration changes are just number extraction
- If the request is ambiguous, set type: "ambiguous" and provide clarificationNeeded`;

class IntentAnalyzer {
  private aiClient: AIClientService;

  constructor() {
    this.aiClient = new AIClientService();
  }

  async analyze(prompt: string, context: ProjectContext): Promise<AnalyzedIntent> {
    try {
      // Build context for AI
      const contextInfo = {
        hasScenes: context.scenes.length > 0,
        sceneCount: context.scenes.length,
        scenes: context.scenes.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description
        })),
        lastMessage: context.chatHistory[context.chatHistory.length - 1]?.content
      };

      const response = await this.aiClient.chat({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: INTENT_ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: `User request: "${prompt}"\n\nContext: ${JSON.stringify(contextInfo, null, 2)}`
          }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response);
      
      // Check for ambiguous request
      if (parsed.type === 'ambiguous' || parsed.confidence < 0.5) {
        return {
          type: 'ambiguous',
          clarificationNeeded: parsed.clarificationNeeded || 'Could you please clarify what you want to do?',
          possibleInterpretations: parsed.possibleInterpretations,
          confidence: parsed.confidence || 0.3
        };
      }
      
      // Validate and clean the response
      return {
        type: parsed.type || 'create',
        editType: parsed.editType,
        targetSceneId: parsed.targetSceneId,
        specificChange: parsed.specificChange,
        durationSeconds: parsed.durationSeconds,
        durationFrames: parsed.durationSeconds ? parsed.durationSeconds * 30 : undefined,
        confidence: parsed.confidence || 0.8,
        imageUrls: [] // Will be filled by orchestrator if present
      };

    } catch (error) {
      console.error('[IntentAnalyzer] Failed to analyze intent:', error);
      
      // Fallback logic
      if (context.scenes.length === 0) {
        return {
          type: 'create',
          confidence: 0.7
        };
      }
      
      // Default to edit if scenes exist
      return {
        type: 'edit',
        editType: 'creative',
        targetSceneId: context.scenes[context.scenes.length - 1]?.id,
        confidence: 0.5
      };
    }
  }

  // Quick intent detection without AI for common patterns
  quickDetect(prompt: string, context: ProjectContext): AnalyzedIntent | null {
    const lowerPrompt = prompt.toLowerCase();
    
    // Duration changes
    const durationMatch = lowerPrompt.match(/(?:make it|change to|set to)\s*(\d+)\s*(?:second|sec)/);
    if (durationMatch) {
      const seconds = parseInt(durationMatch[1]);
      return {
        type: 'edit',
        editType: 'duration',
        durationSeconds: seconds,
        durationFrames: seconds * 30,
        targetSceneId: context.scenes[context.scenes.length - 1]?.id,
        confidence: 0.95
      };
    }
    
    // Delete patterns
    if (lowerPrompt.includes('delete') || lowerPrompt.includes('remove')) {
      return {
        type: 'delete',
        targetSceneId: context.scenes[context.scenes.length - 1]?.id,
        confidence: 0.9
      };
    }
    
    // Create patterns when no scenes
    if (context.scenes.length === 0) {
      return {
        type: 'create',
        confidence: 1.0
      };
    }
    
    return null;
  }
}

// Export singleton instance
export const intentAnalyzer = new IntentAnalyzer();