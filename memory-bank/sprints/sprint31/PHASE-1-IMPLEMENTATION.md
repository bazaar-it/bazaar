# Sprint 31 - Phase 1: Enhanced Prompting Implementation

## 🎯 Phase 1 Goals (Week 1-2)

Transform our single LLM call into an intelligent multi-stage system that:
1. **Deeply analyzes user intent** (brand, purpose, tone, audience)
2. **Uses advanced animation patterns** (professional motion graphics)
3. **Applies context-aware prompting** (industry-specific guidance)
4. **Generates sophisticated Remotion code** (spring, interpolate, Sequence)

## 🏗️ Technical Architecture

### Current Flow:
```
User Input → Brain Orchestrator → addScene Tool → generateDirectCode() → Basic React/Remotion
```

### Enhanced Flow:
```
User Input → IntentAnalysisService → ContextEnhancedPrompting → AnimationLibraryService → generateDirectCode() → Professional Motion Graphics
```

## 🔧 Implementation Tasks

### Task 1: Create IntentAnalysisService

**Location**: `src/server/services/intent/intentAnalysis.service.ts`

```typescript
//src/server/services/intent/intentAnalysis.service.ts

export interface UserIntent {
  brand?: string;
  industry?: 'tech' | 'finance' | 'creative' | 'luxury' | 'healthcare' | 'education';
  purpose?: 'ad' | 'presentation' | 'social' | 'explainer' | 'product-demo';
  tone?: 'professional' | 'playful' | 'urgent' | 'luxury' | 'friendly';
  audience?: 'b2b' | 'consumer' | 'internal' | 'investors';
  duration?: number;
  keyMessage?: string;
  callToAction?: string;
}

export class IntentAnalysisService {
  async analyzeUserIntent(userMessage: string): Promise<UserIntent> {
    // Multi-stage analysis using GPT-4o-mini
    const analysis = await this.extractIntent(userMessage);
    const context = await this.enrichContext(analysis, userMessage);
    return this.validateAndNormalize(context);
  }

  private async extractIntent(userMessage: string): Promise<Partial<UserIntent>> {
    const prompt = `
    Analyze this user request for video creation and extract key context:
    
    User Request: "${userMessage}"
    
    Extract and return JSON with:
    {
      "brand": "company/brand name if mentioned",
      "industry": "tech|finance|creative|luxury|healthcare|education",
      "purpose": "ad|presentation|social|explainer|product-demo", 
      "tone": "professional|playful|urgent|luxury|friendly",
      "audience": "b2b|consumer|internal|investors",
      "keyMessage": "main message to communicate",
      "callToAction": "desired action from viewer"
    }
    
    Only include fields you can confidently extract. Use null for uncertain fields.
    `;
    
    // Implementation with OpenAI call
  }
}
```

### Task 2: Create AnimationLibraryService

**Location**: `src/server/services/animation/animationLibrary.service.ts`

```typescript
//src/server/services/animation/animationLibrary.service.ts

export interface AnimationPattern {
  name: string;
  description: string;
  remotionCode: string;
  timing: {
    delay: number;
    duration: number;
    easing: string;
  };
  suitableFor: string[];
}

export class AnimationLibraryService {
  private patterns: Map<string, AnimationPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  getAnimationForContext(intent: UserIntent, elementType: 'text' | 'image' | 'shape'): AnimationPattern {
    // Select appropriate animation based on context
    const key = this.selectAnimationKey(intent, elementType);
    return this.patterns.get(key) || this.patterns.get('default');
  }

  private initializePatterns() {
    // Cinematic text entrance for professional content
    this.patterns.set('professional-text-entrance', {
      name: 'Professional Text Entrance',
      description: 'Smooth fade-in with subtle slide for professional content',
      remotionCode: `
        const opacity = interpolate(frame, [0, 30], [0, 1], {
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94)
        });
        const translateY = interpolate(frame, [0, 30], [20, 0], {
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94)
        });
      `,
      timing: { delay: 0.3, duration: 1.0, easing: 'ease-out' },
      suitableFor: ['professional', 'b2b', 'presentation']
    });

    // Dynamic entrance for creative content
    this.patterns.set('creative-text-entrance', {
      name: 'Creative Text Entrance',
      description: 'Bouncy spring animation for creative/playful content',
      remotionCode: `
        const scale = spring({
          frame,
          fps,
          config: { stiffness: 200, damping: 12 }
        });
        const rotation = interpolate(frame, [0, 20], [-5, 0], {
          easing: Easing.elastic(1.5)
        });
      `,
      timing: { delay: 0.2, duration: 1.5, easing: 'spring' },
      suitableFor: ['creative', 'playful', 'social']
    });

    // Add more patterns...
  }
}
```

### Task 3: Enhance SceneBuilder with Context-Aware Prompting

**Location**: `src/lib/services/sceneBuilder.service.ts` (enhance existing)

```typescript
// Add to existing SceneBuilderService class

private async buildContextEnhancedPrompt(
  userMessage: string, 
  intent: UserIntent,
  animationPattern: AnimationPattern
): Promise<string> {
  
  const industryGuidance = this.getIndustryGuidance(intent.industry);
  const colorScheme = this.getColorScheme(intent.industry, intent.tone);
  const typography = this.getTypography(intent.industry, intent.tone);

  return `
Create a professional ${intent.purpose || 'video'} for ${intent.industry || 'general'} industry.

User Request: "${userMessage}"

Context:
- Brand: ${intent.brand || 'Generic brand'}
- Industry: ${intent.industry || 'General'}
- Purpose: ${intent.purpose || 'General video'}
- Tone: ${intent.tone || 'Professional'}
- Audience: ${intent.audience || 'General'}
- Key Message: ${intent.keyMessage || 'Extract from user request'}

Design Guidelines:
${industryGuidance}

Color Scheme:
${colorScheme}

Typography:
${typography}

Animation Pattern:
${animationPattern.description}
Use this Remotion code pattern:
${animationPattern.remotionCode}

Technical Requirements:
- Use advanced Remotion features: spring(), interpolate(), Sequence
- Implement proper timing with delays and overlaps
- Apply professional easing curves
- Use multiple layers with proper z-indexing
- Ensure responsive design with useVideoConfig()
- Follow ESM module format (no React imports, use window.Remotion)

Create a sophisticated, professional video component that reflects the ${intent.tone || 'professional'} tone and serves the ${intent.purpose || 'general'} purpose.
`;
}

private getIndustryGuidance(industry?: string): string {
  const guidance = {
    tech: `
- Use clean, modern design with plenty of white space
- Emphasize innovation and reliability
- Include subtle tech-inspired elements (gradients, geometric shapes)
- Focus on clarity and precision
`,
    finance: `
- Convey trust and stability through design
- Use conservative color palette with accent colors for growth
- Include data visualization elements where appropriate
- Emphasize security and reliability
`,
    creative: `
- Express creativity through bold colors and dynamic animations
- Use artistic elements and creative typography
- Emphasize originality and innovation
- Allow for more experimental design approaches
`,
    luxury: `
- Use premium materials and sophisticated color palettes
- Emphasize elegance and exclusivity
- Include subtle animations that convey quality
- Focus on craftsmanship and attention to detail
`
  };
  
  return guidance[industry] || guidance.tech;
}
```

### Task 4: Update Brain Orchestrator Integration

**Location**: `src/server/services/brain/orchestrator.ts` (enhance existing)

```typescript
// Add to existing BrainOrchestrator class

private intentAnalysisService = new IntentAnalysisService();
private animationLibraryService = new AnimationLibraryService();

// Enhance processUserInput method
async processUserInput(input: string, context: BrainContext): Promise<BrainResponse> {
  // Step 1: Analyze user intent
  const userIntent = await this.intentAnalysisService.analyzeUserIntent(input);
  
  // Step 2: Select appropriate animation patterns
  const animationPattern = this.animationLibraryService.getAnimationForContext(
    userIntent, 
    'text' // or determine from content
  );
  
  // Step 3: Enhanced tool selection with context
  const toolSelection = await this.selectToolWithContext(input, userIntent);
  
  // Step 4: Execute with enhanced context
  return this.executeToolWithContext(toolSelection, input, userIntent, animationPattern);
}

private async executeToolWithContext(
  tool: string,
  input: string,
  intent: UserIntent,
  animationPattern: AnimationPattern
): Promise<BrainResponse> {
  
  if (tool === 'addScene') {
    // Pass enhanced context to addScene tool
    return this.mcpClient.callTool('addScene', {
      userMessage: input,
      intent: intent,
      animationPattern: animationPattern,
      enhancedPrompting: true
    });
  }
  
  // Handle other tools...
}
```

### Task 5: Update MCP Tools

**Location**: `src/lib/services/mcp-tools/addScene.ts` (enhance existing)

```typescript
// Enhance addScene tool to use new context

export async function addScene(args: {
  userMessage: string;
  intent?: UserIntent;
  animationPattern?: AnimationPattern;
  enhancedPrompting?: boolean;
}): Promise<ToolResult> {
  
  const { userMessage, intent, animationPattern, enhancedPrompting } = args;
  
  if (enhancedPrompting && intent && animationPattern) {
    // Use enhanced prompting
    const enhancedCode = await sceneBuilderService.generateDirectCodeWithContext(
      userMessage,
      intent,
      animationPattern
    );
    
    return {
      content: [{
        type: "text",
        text: `Generated enhanced scene with context-aware prompting:\n\n${enhancedCode}`
      }]
    };
  }
  
  // Fallback to existing logic
  return sceneBuilderService.generateDirectCode(userMessage);
}
```

## 📊 Success Criteria for Phase 1

### Week 1 Milestones:
- [ ] IntentAnalysisService extracts basic context (brand, industry, purpose)
- [ ] AnimationLibraryService provides 5+ professional animation patterns
- [ ] Enhanced prompting generates more sophisticated Remotion code

### Week 2 Milestones:
- [ ] Full integration with Brain Orchestrator
- [ ] Context-aware animation selection working
- [ ] Demonstrable improvement in video quality
- [ ] A/B testing shows 30%+ improvement in user satisfaction

### Quality Metrics:
- **Intent Extraction Accuracy**: >80% for clear requests
- **Animation Sophistication**: 50%+ use of spring() and interpolate()
- **Code Quality**: Proper use of Sequence and timing
- **User Feedback**: Noticeable improvement in generated videos

## 🧪 Testing Strategy

### Unit Tests:
- IntentAnalysisService with various user inputs
- AnimationLibraryService pattern selection
- Enhanced prompt generation

### Integration Tests:
- Full flow from user input to enhanced video generation
- Context preservation through the pipeline
- Animation pattern application

### User Testing:
- A/B test enhanced vs. basic generation
- Collect feedback on video quality improvement
- Measure user satisfaction scores

## 🔄 Implementation Order

### Day 1-3: Foundation
1. Create IntentAnalysisService structure
2. Build basic intent extraction with GPT-4o-mini
3. Test intent analysis with sample inputs

### Day 4-7: Animation Library
1. Create AnimationLibraryService
2. Implement 5+ professional animation patterns
3. Build context-based pattern selection

### Day 8-10: Integration
1. Enhance SceneBuilderService with context-aware prompting
2. Update Brain Orchestrator integration
3. Modify MCP tools to use enhanced context

### Day 11-14: Testing & Refinement
1. Comprehensive testing of enhanced flow
2. A/B testing with users
3. Performance optimization and bug fixes

This Phase 1 implementation will transform our basic system into an intelligent, context-aware video generation platform that produces significantly higher quality motion graphics.

# Phase 1 Implementation Plan for Sprint 31

## Introduction

This document outlines the implementation plan for Phase 1 of Sprint 31, focusing on a balanced approach between simplicity and speed. Based on user feedback and lessons from Sprint 30, we aim to optimize the video generation workflow by enhancing core functionalities, fixing critical issues, and introducing lightweight UX improvements.

## Implementation Steps

### Step 1: Simplify Core Flow
- **Objective**: Enhance the direct code generation path for better accuracy and robustness.
- **Tasks**:
  - Refine `generateDirectCode()` to improve user intent handling without additional processing layers.
  - Optimize `generateEditCode()` to support seamless edits with minimal complexity.
  - Test both functions to ensure they perform reliably under typical user scenarios.

### Step 2: Fix Critical Issues
- **Objective**: Address key issues identified in Sprint 30 to stabilize the system.
- **Tasks**:
  - Consolidate edit detection logic to eliminate conflicts between frontend and backend.
  - Simplify validation processes by reducing redundant checks and focusing on essential validations.
  - Update error handling to provide clearer feedback when issues occur during generation or edits.

### Step 3: Lightweight UX Enhancements
- **Objective**: Improve user experience without overcomplicating the system.
- **Tasks**:
  - Implement a single-stage progressive generation preview to give users immediate feedback on their requests.
  - Ensure the preview mechanism is lightweight and does not slow down the overall generation process.

### Step 4: Documentation Updates
- **Objective**: Align documentation with the actual implementation to prevent confusion.
- **Tasks**:
  - Revise user flow documentation to reflect the direct code generation approach.
  - Update descriptions of LLM models and prompts to match current usage.
  - Ensure all critical system components are accurately documented.

## Timeline

- **Week 1**: Focus on simplifying core flow and initial testing of `generateDirectCode()` and `generateEditCode()`.
- **Week 2**: Address critical fixes for edit detection and validation simplification.
- **Week 3**: Implement and test lightweight UX enhancements, specifically the single-stage preview.
- **Week 4**: Finalize documentation updates and conduct a full system review to ensure stability.

## Success Criteria

- **Core Flow**: `generateDirectCode()` and `generateEditCode()` handle user intent accurately in at least 90% of test cases.
- **Critical Fixes**: Edit detection conflicts are resolved, and validation errors are reduced by 50%.
- **UX Enhancements**: Single-stage previews are functional and do not increase generation time by more than 10%.
- **Documentation**: Updated to reflect the current system state with no major discrepancies.

This Phase 1 plan prioritizes actionable, impactful changes while maintaining a lean approach to development.