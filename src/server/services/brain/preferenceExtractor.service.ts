// AI-Powered Preference Extraction Service

import { AIClientService } from '~/server/services/ai/aiClient.service';
import { projectMemoryService } from '../data/projectMemory.service';
import { getModel } from '~/config/models.config';
import { getSystemPrompt } from '~/config/prompts.config';
import type { ChatMessage } from '~/lib/types/api';

// Types from the prompt output format
interface ExtractedPreference {
  key: string;
  value: string;
  confidence: number;
  evidence: string[];
  scope: 'global' | 'scene-specific';
}

interface TemporaryOverride {
  key: string;
  value: string;
  reason: string;
}

export interface PreferenceExtractionResult {
  preferences: ExtractedPreference[];
  temporaryOverrides: TemporaryOverride[];
  reasoning: string;
}

export class PreferenceExtractorService {
  private static instance: PreferenceExtractorService;
  
  static getInstance(): PreferenceExtractorService {
    if (!this.instance) {
      this.instance = new PreferenceExtractorService();
    }
    return this.instance;
  }
  
  /**
   * Uses AI to intelligently extract user preferences from conversation context
   */
  async extractPreferences(params: {
    conversationHistory: ChatMessage[];
    currentRequest: string;
    projectId: string;
    scenePatterns?: string[];
  }): Promise<PreferenceExtractionResult> {
    
    // Only analyze if we have enough context
    if (params.conversationHistory.length < 2) {
      return { preferences: [], temporaryOverrides: [], reasoning: 'Not enough conversation history' };
    }
    
    // Get existing preferences
    const existingPrefs = await projectMemoryService.getUserPreferences(params.projectId);
    
    // Get system prompt from config
    const systemPrompt = getSystemPrompt('PREFERENCE_EXTRACTOR');

    const contextMessage = `CONVERSATION HISTORY:
${params.conversationHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

CURRENT REQUEST: "${params.currentRequest}"

EXISTING PREFERENCES:
${existingPrefs.map(p => `- ${p.key}: ${p.value} (confidence: ${p.confidence})`).join('\n') || 'None yet'}

${params.scenePatterns ? `PATTERNS IN CREATED SCENES:\n${params.scenePatterns.join('\n')}` : ''}

Analyze the conversation and extract any persistent preferences. Focus on patterns and explicit preference statements, not one-time instructions.`;

    try {
      // Use model from config
      const model = getModel('FAST_EDIT');
      
      const response = await AIClientService.generateResponse(
        { ...model, temperature: 0.3 },
        [{ role: "user", content: contextMessage }],
        systemPrompt.content,
        { responseFormat: { type: "json_object" } }
      );
      
      const result = JSON.parse(response.content || '{}') as PreferenceExtractionResult;
      
      // Store high-confidence preferences (threshold from prompt: > 0.5)
      for (const pref of result.preferences) {
        if (pref.confidence > 0.5) {
          await projectMemoryService.storeUserPreference(
            params.projectId,
            pref.key,
            pref.value,
            pref.confidence
          );
          
          console.log(`[PreferenceExtractor] 🧠 Learned: ${pref.key} = ${pref.value} (${pref.confidence} confidence)`);
          if (pref.evidence?.length > 0) {
            console.log(`  Evidence: ${pref.evidence[0]}`);
          }
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('[PreferenceExtractor] Failed to extract preferences:', error);
      return { preferences: [], temporaryOverrides: [], reasoning: 'Failed to extract preferences' };
    }
  }
  
  /**
   * Quick confidence adjustment based on user feedback
   */
  async adjustConfidence(
    projectId: string,
    preferenceKey: string,
    adjustment: 'increase' | 'decrease' | 'remove'
  ): Promise<void> {
    const existing = await projectMemoryService.getUserPreferences(projectId);
    const pref = existing.find(p => p.key === preferenceKey);
    
    if (!pref) return;
    
    let newConfidence = pref.confidence;
    
    switch (adjustment) {
      case 'increase':
        newConfidence = Math.min(1.0, newConfidence + 0.1);
        break;
      case 'decrease':
        newConfidence = Math.max(0.3, newConfidence - 0.2);
        break;
      case 'remove':
        newConfidence = 0;
        break;
    }
    
    if (newConfidence > 0) {
      await projectMemoryService.storeUserPreference(
        projectId,
        preferenceKey,
        pref.value,
        newConfidence
      );
    } else {
      // TODO: Add remove preference method to projectMemoryService
      console.log(`[PreferenceExtractor] Would remove preference: ${preferenceKey}`);
    }
  }
}

export const preferenceExtractor = PreferenceExtractorService.getInstance();