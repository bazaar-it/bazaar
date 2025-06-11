// AI-Powered Preference Extraction Service

import { AIClientService } from '~/server/services/ai/aiClient.service';
import { projectMemoryService } from '../data/projectMemory.service';
import type { ChatMessage } from '~/lib/types/api';

export interface ExtractedPreference {
  key: string;
  value: string;
  confidence: number;
  reasoning: string;
  evidence: string[];
}

export interface PreferenceExtractionResult {
  preferences: ExtractedPreference[];
  deprecatedPreferences: Array<{
    key: string;
    reason: string;
  }>;
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
    if (params.conversationHistory.length < 3) {
      return { preferences: [], deprecatedPreferences: [] };
    }
    
    // Get existing preferences
    const existingPrefs = await projectMemoryService.getUserPreferences(params.projectId);
    
    const systemPrompt = `You are an intelligent preference learning system for a video creation platform.

Your task is to identify PERSISTENT USER PREFERENCES from conversations, not one-time instructions.

PREFERENCES TO IDENTIFY:
- Visual style (minimal, detailed, modern, vintage, corporate, playful)
- Color preferences (specific colors, warm/cool tones, monochrome, vibrant)
- Animation style (fast, smooth, bouncy, subtle, dramatic)
- Typography (bold, elegant, playful, minimal)
- Effects (particles, gradients, shadows, neon, 3D)
- Layout (centered, asymmetric, grid, dynamic)
- Content tone (professional, casual, energetic, calm)

CRITICAL RULES:
1. Only extract PERSISTENT preferences, not one-time requests
   ❌ "Make this text red" = ONE-TIME instruction
   ✅ "I prefer red accents" = PREFERENCE
   ✅ "I always like smooth animations" = PREFERENCE
   ✅ Pattern: User chose blue in 4 out of 5 scenes = PREFERENCE

2. Confidence scoring:
   - Explicit preference statements: 0.9-1.0
   - Repeated patterns (3+ times): 0.7-0.8
   - Inferred from 2 instances: 0.5-0.6
   - Single instance: DON'T EXTRACT

3. Look for:
   - Patterns across multiple requests
   - Adjectives that describe style preferences
   - Corrections that indicate preferences ("make it less X, more Y")
   - Emotional responses that indicate preferences

4. Return JSON with:
{
  "preferences": [
    {
      "key": "style_preference",
      "value": "minimal_modern",
      "confidence": 0.85,
      "reasoning": "User consistently requests clean, minimal designs",
      "evidence": ["requested 'clean design' in scene 1", "said 'keep it minimal' in scene 3"]
    }
  ],
  "deprecatedPreferences": [
    {
      "key": "animation_speed",
      "reason": "User said 'actually, make animations slower' - preference changed"
    }
  ]
}`;

    const contextMessage = `CONVERSATION HISTORY:
${params.conversationHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

CURRENT REQUEST: "${params.currentRequest}"

EXISTING PREFERENCES:
${existingPrefs.map(p => `- ${p.key}: ${p.value} (confidence: ${p.confidence})`).join('\n') || 'None yet'}

${params.scenePatterns ? `PATTERNS IN CREATED SCENES:\n${params.scenePatterns.join('\n')}` : ''}

Analyze the conversation and extract any persistent preferences. Focus on patterns and explicit preference statements, not one-time instructions.`;

    try {
      const response = await AIClientService.generateResponse(
        { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
        [{ role: "user", content: contextMessage }],
        systemPrompt,
        { responseFormat: { type: "json_object" } }
      );
      
      const result = JSON.parse(response.content || '{}') as PreferenceExtractionResult;
      
      // Store high-confidence preferences
      for (const pref of result.preferences) {
        if (pref.confidence >= 0.7) {
          await projectMemoryService.storeUserPreference(
            params.projectId,
            pref.key,
            pref.value,
            pref.confidence
          );
          
          console.log(`[PreferenceExtractor] 🧠 Learned: ${pref.key} = ${pref.value} (${pref.confidence} confidence)`);
          console.log(`  Reasoning: ${pref.reasoning}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('[PreferenceExtractor] Failed to extract preferences:', error);
      return { preferences: [], deprecatedPreferences: [] };
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