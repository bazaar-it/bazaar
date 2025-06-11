# AI-Powered Preference Learning System

## The Problem

Current system uses basic keyword matching:
```typescript
if (msg.includes('blue')) {
  prefs['preferred_colors'] = 'blue';
}
```

This is inadequate because:
- No context understanding
- Can't differentiate between preferences and one-time requests
- No pattern recognition across multiple interactions
- Saves everything indiscriminately

## Proposed Solution: Brain-Based Preference Learning

### 1. Preference Extraction Service

```typescript
// New service: preferenceExtractor.service.ts
export class PreferenceExtractorService {
  
  /**
   * Uses AI to analyze conversation history and extract meaningful preferences
   */
  async extractPreferences(params: {
    conversationHistory: ChatMessage[];
    currentRequest: string;
    existingPreferences: UserPreference[];
    sceneHistory: SceneData[];
  }): Promise<ExtractedPreferences> {
    
    const systemPrompt = `You are a preference learning system for a video creation platform.
    
Your job is to identify PERSISTENT USER PREFERENCES from conversations.

PREFERENCES TO EXTRACT:
- Visual style preferences (minimal, detailed, modern, vintage, etc.)
- Color preferences (specific colors, palettes, moods)
- Animation preferences (speed, smoothness, complexity)
- Content preferences (professional, playful, dramatic)
- Typography preferences (fonts, sizes, styles)
- Layout preferences (centered, asymmetric, grid-based)
- Effect preferences (particles, gradients, shadows)

IMPORTANT RULES:
1. Only extract PERSISTENT preferences, not one-time requests
   - "Make this scene blue" = ONE-TIME (don't save)
   - "I prefer blue color schemes" = PREFERENCE (save)
   - "I always like minimal designs" = PREFERENCE (save)
   
2. Look for patterns across multiple requests
   - If user asks for "fast animations" 3+ times = PREFERENCE
   - If user consistently chooses similar styles = PREFERENCE
   
3. Consider context and confidence
   - Explicit statements = HIGH confidence (0.9)
   - Repeated patterns = MEDIUM confidence (0.7)
   - Inferred from choices = LOW confidence (0.5)
   
4. Return structured preferences with:
   - key: preference_name (snake_case)
   - value: preference_value
   - confidence: 0.0-1.0
   - reasoning: why this is a preference
   - evidence: specific quotes/patterns that support this
   
5. DON'T extract:
   - Scene-specific instructions
   - Temporary adjustments
   - Contradictions to existing high-confidence preferences`;

    const userMessage = `CONVERSATION HISTORY:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

CURRENT REQUEST: "${currentRequest}"

EXISTING PREFERENCES:
${existingPreferences.map(p => `- ${p.key}: ${p.value} (confidence: ${p.confidence})`).join('\n')}

RECENT SCENE PATTERNS:
${this.analyzeScenePatterns(sceneHistory)}

Extract any NEW persistent preferences or UPDATE confidence of existing ones.`;

    const response = await AIClientService.generateResponse(
      { provider: 'openai', model: 'gpt-4.1-mini', temperature: 0.3 },
      [{ role: "user", content: userMessage }],
      systemPrompt,
      { responseFormat: { type: "json_object" } }
    );

    return JSON.parse(response.content);
  }
  
  /**
   * Analyzes scene history for implicit preferences
   */
  private analyzeScenePatterns(scenes: SceneData[]): string {
    // Look for repeated patterns in generated scenes
    const patterns = {
      colors: this.findCommonColors(scenes),
      animations: this.findCommonAnimations(scenes),
      layouts: this.findCommonLayouts(scenes),
      effects: this.findCommonEffects(scenes)
    };
    
    return `Common patterns found:
- Colors: ${patterns.colors.join(', ')}
- Animations: ${patterns.animations.join(', ')}
- Layouts: ${patterns.layouts.join(', ')}
- Effects: ${patterns.effects.join(', ')}`;
  }
}
```

### 2. Integration with Brain Orchestrator

```typescript
// In brain/orchestrator.ts
async buildContextPacket(
  projectId: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentImageTraceIds: string[]
): Promise<MemoryBankSummary> {
  
  // ... existing code ...
  
  // NEW: AI-powered preference extraction
  if (conversationHistory.length > 3) { // Only after some interaction
    const extractedPrefs = await this.preferenceExtractor.extractPreferences({
      conversationHistory,
      currentRequest: conversationHistory[conversationHistory.length - 1].content,
      existingPreferences: await projectMemoryService.getUserPreferences(projectId),
      sceneHistory: currentScenes
    });
    
    // Store high-confidence preferences
    for (const pref of extractedPrefs.preferences) {
      if (pref.confidence >= 0.7) {
        await projectMemoryService.storeUserPreference(
          projectId,
          pref.key,
          pref.value,
          pref.confidence
        );
        
        console.log(`[Brain] 🧠 Learned preference: ${pref.key} = ${pref.value} (${pref.confidence} confidence)`);
      }
    }
  }
}
```

### 3. Preference Types & Examples

```typescript
interface ExtractedPreferences {
  preferences: Array<{
    key: string;
    value: string;
    confidence: number;
    reasoning: string;
    evidence: string[];
  }>;
  
  // Preferences to remove/downgrade
  deprecatedPreferences: Array<{
    key: string;
    reason: string;
  }>;
}

// Example extraction:
{
  preferences: [
    {
      key: "animation_style",
      value: "smooth_professional",
      confidence: 0.85,
      reasoning: "User consistently requests smooth transitions and professional look across 5 different scenes",
      evidence: [
        "make it smooth and professional",
        "I want smooth transitions",
        "keep it professional looking"
      ]
    },
    {
      key: "color_temperature",
      value: "cool_tones",
      confidence: 0.7,
      reasoning: "User has chosen blue/purple/teal colors in 4 out of 6 scenes",
      evidence: [
        "Scene 1: blue gradient",
        "Scene 3: purple accent",
        "Scene 5: teal highlights"
      ]
    }
  ],
  deprecatedPreferences: [
    {
      key: "animation_speed",
      reason: "User explicitly said 'actually, forget about the fast animations'"
    }
  ]
}
```

### 4. Smart Preference Application

```typescript
// In contextBuilder
private async applyPreferences(
  basePrompt: string,
  preferences: UserPreference[],
  currentRequest: string
): Promise<string> {
  
  // Group preferences by confidence
  const highConfidence = preferences.filter(p => p.confidence >= 0.8);
  const mediumConfidence = preferences.filter(p => p.confidence >= 0.5 && p.confidence < 0.8);
  
  let enhanced = basePrompt;
  
  if (highConfidence.length > 0) {
    enhanced += "\n\n🎯 STRONG USER PREFERENCES (apply unless explicitly overridden):";
    highConfidence.forEach(p => {
      enhanced += `\n- ${p.key}: ${p.value}`;
    });
  }
  
  if (mediumConfidence.length > 0) {
    enhanced += "\n\n💡 LIKELY PREFERENCES (apply when relevant):";
    mediumConfidence.forEach(p => {
      enhanced += `\n- ${p.key}: ${p.value}`;
    });
  }
  
  // Check for conflicts
  const conflicts = this.detectConflicts(currentRequest, preferences);
  if (conflicts.length > 0) {
    enhanced += "\n\n⚠️ OVERRIDE DETECTED: Current request conflicts with preferences:";
    conflicts.forEach(c => {
      enhanced += `\n- Ignoring ${c.preference} for this request`;
    });
  }
  
  return enhanced;
}
```

### 5. Preference Evolution & Learning

```typescript
// Track preference changes over time
interface PreferenceEvolution {
  key: string;
  history: Array<{
    value: string;
    confidence: number;
    timestamp: Date;
    source: 'explicit' | 'pattern' | 'inferred';
  }>;
}

// Auto-adjust confidence based on usage
async updatePreferenceConfidence(
  projectId: string,
  preferenceKey: string,
  wasApplied: boolean,
  userFeedback?: 'positive' | 'negative' | 'neutral'
) {
  const current = await projectMemoryService.getPreference(projectId, preferenceKey);
  
  let newConfidence = current.confidence;
  
  if (userFeedback === 'positive') {
    newConfidence = Math.min(1.0, newConfidence + 0.1);
  } else if (userFeedback === 'negative') {
    newConfidence = Math.max(0.0, newConfidence - 0.2);
  } else if (wasApplied) {
    newConfidence = Math.min(1.0, newConfidence + 0.05);
  }
  
  await projectMemoryService.updatePreferenceConfidence(
    projectId,
    preferenceKey,
    newConfidence
  );
}
```

## Benefits of AI-Powered System

1. **Context-Aware**: Understands "I don't like overly bright colors" vs "make this one brighter"
2. **Pattern Recognition**: Identifies preferences from behavior, not just explicit statements
3. **Confidence Scoring**: Knows which preferences are strong vs tentative
4. **Evolution**: Preferences can change over time based on user behavior
5. **Conflict Resolution**: Handles when current request contradicts preferences
6. **Semantic Understanding**: "Professional" can mean minimal, clean, corporate colors, etc.

## Implementation Priority

1. **Phase 1**: Basic AI extraction with Brain
2. **Phase 2**: Pattern analysis from scene history  
3. **Phase 3**: Confidence evolution system
4. **Phase 4**: Multi-project preference learning

## Example Scenarios

### Scenario 1: Explicit Preference
User: "I always prefer minimal, clean designs with plenty of whitespace"
→ Saves: `design_style: minimal_clean` (0.9 confidence)

### Scenario 2: Pattern Detection
User creates 5 scenes, 4 have particle effects
→ Infers: `effects_preference: particles` (0.7 confidence)

### Scenario 3: Preference Override
User (with blue preference): "Make this one red for urgency"
→ Applies red, but doesn't change blue preference

### Scenario 4: Preference Evolution
User initially likes fast animations, but over time chooses slower ones
→ Gradually reduces confidence in 'fast' and increases 'smooth'

## Conclusion

This AI-powered preference system is far superior to keyword matching. It understands context, learns from patterns, and builds a rich user profile that improves the video generation experience over time.