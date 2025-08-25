# 🎯 Dynamic Arc Length Feature

## Overview
Allow users to specify video duration and number of scenes, dynamically adjusting the narrative arc to match their requirements.

---

## 📊 User Input Patterns

### Duration-Based Requests
- "Make a 10-second video" → 4 acts (300 frames)
- "Create a 20-second version" → 6 acts (600 frames)
- "Quick 5-second teaser" → 2-3 acts (150 frames)
- "Full 30-second commercial" → 8-10 acts (900 frames)

### Scene-Based Requests
- "Create 6 scenes" → 6 acts
- "Just 3 quick scenes" → 3 acts
- "Make it 8 scenes long" → 8 acts

### Default Behavior
- No specification → 5 acts, 15 seconds (current default)

---

## 🏗️ Implementation Architecture

### 1. Intent Detection Enhancement
**File**: `/src/brain/orchestrator_functions/intentAnalyzer.ts`

```typescript
private detectDurationIntent(prompt: string): {
  requestedDuration?: number; // in seconds
  requestedScenes?: number;
  requestedFrames?: number;
} {
  const durationResult = {
    requestedDuration: undefined,
    requestedScenes: undefined,
    requestedFrames: undefined
  };
  
  // Duration detection patterns
  const durationMatch = prompt.match(/(\d+)\s*(?:second|sec|s)\b/i);
  if (durationMatch) {
    durationResult.requestedDuration = parseInt(durationMatch[1]);
    durationResult.requestedFrames = parseInt(durationMatch[1]) * 30; // 30fps
  }
  
  // Scene count detection
  const sceneMatch = prompt.match(/(\d+)\s*(?:scene|act|part|segment)s?\b/i);
  if (sceneMatch) {
    durationResult.requestedScenes = parseInt(sceneMatch[1]);
  }
  
  return durationResult;
}
```

### 2. Dynamic Arc Structure Generator
**File**: `/src/tools/narrative/herosJourneyLLM.ts`

```typescript
interface DynamicArcConfig {
  sceneCount: number;
  totalDuration: number; // in frames
  narrativeStructure: NarrativeStructure;
}

private generateDynamicArcStructure(
  extraction: ExtractedBrandDataV4,
  config: DynamicArcConfig
): ActStructure[] {
  const { sceneCount, totalDuration, narrativeStructure } = config;
  
  // Dynamic act templates based on scene count
  const actTemplates = {
    2: ['Hook', 'Call to Action'],
    3: ['Problem', 'Solution', 'Action'],
    4: ['Problem', 'Discovery', 'Transformation', 'Action'],
    5: ['Problem', 'Discovery', 'Transformation', 'Triumph', 'Invitation'],
    6: ['Hook', 'Problem', 'Discovery', 'Features', 'Benefits', 'Action'],
    7: ['Opening', 'Challenge', 'Journey', 'Transformation', 'Success', 'Impact', 'Invitation'],
    8: ['Teaser', 'Problem', 'Agitation', 'Solution Intro', 'Features', 'Benefits', 'Testimonial', 'CTA']
  };
  
  // Get appropriate template or generate custom
  const acts = actTemplates[sceneCount] || this.generateCustomActs(sceneCount, narrativeStructure);
  
  // Distribute duration across acts
  const durations = this.distributeDuration(totalDuration, sceneCount);
  
  return acts.map((actName, index) => ({
    name: actName,
    duration: durations[index],
    emotionalBeat: this.mapActToEmotionalBeat(actName, index, sceneCount)
  }));
}

private distributeDuration(totalFrames: number, sceneCount: number): number[] {
  // Smart duration distribution based on narrative importance
  if (sceneCount === 2) {
    // 60/40 split
    return [
      Math.floor(totalFrames * 0.6),
      Math.floor(totalFrames * 0.4)
    ];
  } else if (sceneCount === 3) {
    // 30/40/30 split
    return [
      Math.floor(totalFrames * 0.3),
      Math.floor(totalFrames * 0.4),
      Math.floor(totalFrames * 0.3)
    ];
  } else if (sceneCount === 4) {
    // 25/25/35/15 split
    return [
      Math.floor(totalFrames * 0.25),
      Math.floor(totalFrames * 0.25),
      Math.floor(totalFrames * 0.35),
      Math.floor(totalFrames * 0.15)
    ];
  } else if (sceneCount === 5) {
    // Classic 20/13/34/20/13 split
    return [
      Math.floor(totalFrames * 0.2),  // Problem
      Math.floor(totalFrames * 0.13), // Discovery
      Math.floor(totalFrames * 0.34), // Transformation (longest)
      Math.floor(totalFrames * 0.2),  // Triumph
      Math.floor(totalFrames * 0.13)  // CTA
    ];
  } else {
    // Even distribution with slight emphasis on middle
    const baseFrames = Math.floor(totalFrames / sceneCount);
    const durations = new Array(sceneCount).fill(baseFrames);
    
    // Add remaining frames to middle scenes
    const remainder = totalFrames - (baseFrames * sceneCount);
    const middleIndex = Math.floor(sceneCount / 2);
    for (let i = 0; i < remainder; i++) {
      durations[middleIndex - Math.floor(i/2) + (i%2)] += 1;
    }
    
    return durations;
  }
}

private mapActToEmotionalBeat(
  actName: string, 
  index: number, 
  totalActs: number
): EmotionalBeat {
  // Map act names to emotional beats
  const beatMappings = {
    'Hook': 'attention',
    'Problem': 'problem',
    'Challenge': 'tension',
    'Discovery': 'discovery',
    'Solution': 'revelation',
    'Transformation': 'transformation',
    'Features': 'showcase',
    'Benefits': 'value',
    'Success': 'triumph',
    'Triumph': 'triumph',
    'Impact': 'validation',
    'Testimonial': 'social_proof',
    'Action': 'invitation',
    'CTA': 'invitation',
    'Call to Action': 'invitation'
  };
  
  // Try direct mapping first
  for (const [key, value] of Object.entries(beatMappings)) {
    if (actName.toLowerCase().includes(key.toLowerCase())) {
      return value as EmotionalBeat;
    }
  }
  
  // Fallback to position-based mapping
  const positionRatio = index / (totalActs - 1);
  if (positionRatio <= 0.2) return 'problem';
  if (positionRatio <= 0.4) return 'discovery';
  if (positionRatio <= 0.6) return 'transformation';
  if (positionRatio <= 0.8) return 'triumph';
  return 'invitation';
}
```

### 3. WebsiteToVideo Handler Update
**File**: `/src/tools/website/websiteToVideoHandler.ts`

```typescript
async handleWebsiteToVideo(input: WebsiteToVideoInput) {
  // ... existing brand extraction ...
  
  // Determine arc configuration from input
  const arcConfig = this.determineArcConfig(input);
  
  // Generate dynamic narrative
  const narrativeScenes = await this.generateDynamicNarrative(
    websiteData,
    arcConfig
  );
  
  // ... continue with template selection ...
}

private determineArcConfig(input: WebsiteToVideoInput): {
  sceneCount: number;
  totalDuration: number;
} {
  // Check for explicit duration/scene requests
  const { requestedDuration, requestedScenes } = input.userContext || {};
  
  let sceneCount = 5; // default
  let totalDuration = 450; // default 15 seconds
  
  if (requestedScenes) {
    // User specified exact scene count
    sceneCount = Math.min(Math.max(requestedScenes, 2), 10); // Clamp 2-10
    totalDuration = sceneCount * 90; // ~3 seconds per scene average
  } else if (requestedDuration) {
    // User specified duration, calculate optimal scene count
    totalDuration = requestedDuration * 30; // Convert to frames
    
    if (requestedDuration <= 6) {
      sceneCount = 2;
    } else if (requestedDuration <= 10) {
      sceneCount = 3;
    } else if (requestedDuration <= 15) {
      sceneCount = 4;
    } else if (requestedDuration <= 20) {
      sceneCount = 5;
    } else if (requestedDuration <= 25) {
      sceneCount = 6;
    } else if (requestedDuration <= 30) {
      sceneCount = 7;
    } else {
      sceneCount = Math.ceil(requestedDuration / 5); // ~5 seconds per scene for long videos
    }
  }
  
  console.log(`🎬 [ARC CONFIG] Scenes: ${sceneCount}, Duration: ${totalDuration} frames (${totalDuration/30}s)`);
  
  return { sceneCount, totalDuration };
}
```

---

## 🎭 Emotional Beat Expansion

### Current Beats (5)
- `problem`
- `discovery`
- `transformation`
- `triumph`
- `invitation`

### Extended Beats for Dynamic Arcs
```typescript
type EmotionalBeat = 
  | 'attention'      // Hook, grabber
  | 'problem'        // Pain point, challenge
  | 'tension'        // Building urgency
  | 'discovery'      // Solution reveal
  | 'revelation'     // Aha moment
  | 'transformation' // Change, progress
  | 'showcase'       // Feature display
  | 'value'          // Benefits
  | 'triumph'        // Success
  | 'validation'     // Proof, credibility
  | 'social_proof'   // Testimonials
  | 'invitation';    // CTA
```

---

## 📋 Example Scenarios

### Scenario 1: "Make a 10-second video about elhub.no"
```typescript
// Detection
requestedDuration: 10
requestedScenes: undefined

// Arc Generation
sceneCount: 3
totalDuration: 300 frames

// Narrative Structure
Act 1: "The Energy Challenge" (90 frames, 'problem')
Act 2: "Digital Infrastructure Solution" (120 frames, 'transformation')
Act 3: "Join the Energy Revolution" (90 frames, 'invitation')
```

### Scenario 2: "Create 6 scenes for our product"
```typescript
// Detection
requestedDuration: undefined
requestedScenes: 6

// Arc Generation
sceneCount: 6
totalDuration: 540 frames (18 seconds)

// Narrative Structure
Act 1: "The Hook" (90 frames, 'attention')
Act 2: "The Problem" (90 frames, 'problem')
Act 3: "Our Discovery" (90 frames, 'discovery')
Act 4: "Powerful Features" (90 frames, 'showcase')
Act 5: "Real Benefits" (90 frames, 'value')
Act 6: "Start Today" (90 frames, 'invitation')
```

### Scenario 3: "Quick 5-second teaser"
```typescript
// Detection
requestedDuration: 5
requestedScenes: undefined

// Arc Generation
sceneCount: 2
totalDuration: 150 frames

// Narrative Structure
Act 1: "The Big Reveal" (90 frames, 'attention')
Act 2: "Get It Now" (60 frames, 'invitation')
```

---

## 🔧 Template Mapping Update

### Extended Beat-to-Template Mapping
```typescript
beatToTemplateMap = {
  attention: {
    dynamic: ['ParticleExplosion', 'GlitchText', 'ScaleIn'],
    minimal: ['FadeIn', 'SlideIn', 'TypeOn']
  },
  problem: {
    dynamic: ['GlitchText', 'MorphingText', 'DrawOn'],
    minimal: ['DarkBGGradientText', 'FadeIn']
  },
  tension: {
    dynamic: ['PulsingCircles', 'WaveAnimation', 'HighlightSweep'],
    minimal: ['FastText', 'CarouselText']
  },
  showcase: {
    dynamic: ['FloatingElements', 'AppJiggle', 'DualScreenApp'],
    minimal: ['SlideIn', 'FadeIn']
  },
  value: {
    dynamic: ['GrowthGraph', 'TeslaStockGraph', 'Today1Percent'],
    minimal: ['TypingTemplate', 'FastText']
  },
  social_proof: {
    dynamic: ['TestimonialCards', 'QuoteAnimation', 'StarRating'],
    minimal: ['FadeIn', 'TypeOn']
  }
  // ... etc
}
```

---

## 🎯 User Input Examples

### Duration-Based
- "10 second video" → 3-4 scenes
- "30 second commercial" → 8-10 scenes
- "quick 5 sec" → 2 scenes
- "one minute video" → 12 scenes

### Scene-Based
- "make 7 scenes" → 7 scenes
- "just 3 acts" → 3 scenes
- "create 6 part story" → 6 scenes

### Mixed Inputs
- "10 second video with 4 scenes" → 4 scenes, 10 seconds
- "6 quick scenes, about 15 seconds" → 6 scenes, 15 seconds

---

## 📈 Benefits

1. **Flexibility**: Adapts to any duration requirement
2. **Variety**: Different arc structures for different lengths
3. **Optimization**: Better pacing for shorter/longer videos
4. **User Control**: Explicit control over video structure
5. **Smart Defaults**: Intelligent scene count based on duration

---

## 🚨 Edge Cases

### Minimum Viable Video
- Minimum: 2 scenes, 3 seconds (90 frames)
- Below this: "Video too short, minimum 3 seconds"

### Maximum Practical Length
- Maximum: 20 scenes, 60 seconds
- Above this: "Consider breaking into multiple videos"

### Odd Requests
- "1 scene" → Convert to 2 scenes (need arc)
- "100 scenes" → Cap at 20, warn user
- "0.5 seconds" → Minimum 3 seconds

---

## 🔄 Migration Strategy

1. **Phase 1**: Add detection logic (non-breaking)
2. **Phase 2**: Implement dynamic arc generation with feature flag
3. **Phase 3**: Update UI to show scene count options
4. **Phase 4**: Full rollout with user education

---

**Status**: Ready for implementation
**Priority**: High - Significantly improves user control and video variety