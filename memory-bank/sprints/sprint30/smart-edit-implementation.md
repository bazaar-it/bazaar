# Smart Edit Scene Implementation - Sprint 30
**Date**: January 27, 2025  
**Goal**: Implement intelligent edit scene system with full conversation context analysis

## 🧠 **Smart Edit Architecture Overview**

The smart edit system analyzes the entire conversation history to understand user intent, preserve working elements, and make intelligent modifications while maintaining strict ESM compliance.

### **Key Components**:
1. **Conversation Analysis Service** - Analyzes chat history patterns
2. **User Pattern Recognition** - Learns from user's editing preferences  
3. **Smart Brain Context Generator** - Creates intelligent editing strategy
4. **ESM-Compliant Code Editor** - Modifies code while preserving functionality
5. **Risk-Aware Preservation** - Protects working elements from breaking

---

## 🔄 **Complete Smart Edit Flow**

### **Step 1: Conversation History Analysis**
```typescript
// src/server/services/conversationAnalysis.service.ts
export class ConversationAnalysisService {
  async analyzeFullConversation(input: {
    chatHistory: Message[];
    currentPrompt: string;
    existingScene: Scene;
    userId: string;
  }): Promise<ConversationInsights> {
    
    // Extract conversation patterns
    const conversationPatterns = this.extractPatterns(input.chatHistory);
    
    // Analyze user editing behavior
    const userBehavior = await this.analyzeUserBehavior(input.userId, input.chatHistory);
    
    // Identify scene evolution
    const sceneEvolution = this.trackSceneEvolution(input.chatHistory, input.existingScene);
    
    // Generate insights
    return {
      conversationTheme: conversationPatterns.theme,
      userIntent: this.inferUserIntent(input.currentPrompt, conversationPatterns),
      previousChanges: sceneEvolution.changes,
      preserveElements: sceneEvolution.workingElements,
      riskAreas: this.identifyRisks(input.currentPrompt, input.existingScene),
      editStrategy: this.determineEditStrategy(input.currentPrompt, userBehavior),
      animationContinuity: sceneEvolution.animationFlow
    };
  }
  
  private extractPatterns(chatHistory: Message[]): ConversationPatterns {
    const userMessages = chatHistory.filter(msg => msg.role === 'user');
    const assistantMessages = chatHistory.filter(msg => msg.role === 'assistant');
    
    // Analyze conversation themes
    const themes = this.identifyThemes(userMessages);
    
    // Track editing progression
    const progression = this.trackProgression(userMessages);
    
    // Identify user preferences
    const preferences = this.extractPreferences(userMessages);
    
    return {
      theme: themes.primary,
      subThemes: themes.secondary,
      progression: progression,
      preferences: preferences,
      editingStyle: this.categorizeEditingStyle(userMessages)
    };
  }
  
  private async analyzeUserBehavior(userId: string, chatHistory: Message[]): Promise<UserBehavior> {
    // Get historical user patterns from database
    const historicalPatterns = await this.getUserHistoricalPatterns(userId);
    
    // Analyze current session patterns
    const sessionPatterns = this.analyzeSessionPatterns(chatHistory);
    
    // Combine for comprehensive behavior profile
    return {
      preferredAnimations: [...historicalPatterns.animations, ...sessionPatterns.animations],
      commonRequests: [...historicalPatterns.requests, ...sessionPatterns.requests],
      editingFrequency: sessionPatterns.editingFrequency,
      complexityPreference: sessionPatterns.complexityPreference,
      styleConsistency: this.assessStyleConsistency(chatHistory)
    };
  }
  
  private trackSceneEvolution(chatHistory: Message[], currentScene: Scene): SceneEvolution {
    const sceneChanges = [];
    const workingElements = [];
    const animationFlow = [];
    
    // Parse assistant messages for implemented changes
    const assistantMessages = chatHistory.filter(msg => msg.role === 'assistant');
    
    assistantMessages.forEach((msg, index) => {
      const changes = this.extractChangesFromMessage(msg.content);
      sceneChanges.push(...changes);
      
      // Track what was added and is likely working
      const addedElements = this.extractAddedElements(msg.content);
      workingElements.push(...addedElements);
      
      // Track animation progression
      const animations = this.extractAnimationInfo(msg.content);
      animationFlow.push(...animations);
    });
    
    // Analyze current scene code for working elements
    const codeAnalysis = this.analyzeSceneCode(currentScene.code);
    
    return {
      changes: sceneChanges,
      workingElements: [...workingElements, ...codeAnalysis.workingElements],
      animationFlow: animationFlow,
      codeStructure: codeAnalysis.structure,
      preservationPriority: this.calculatePreservationPriority(workingElements)
    };
  }
}
```

### **Step 2: Smart Brain Context Generation**
```typescript
// src/server/services/smartBrainContext.service.ts
export class SmartBrainContextService {
  async generateEditContext(input: {
    userPrompt: string;
    conversationInsights: ConversationInsights;
    existingCode: string;
    sceneMetadata: SceneMetadata;
  }): Promise<SmartEditContext> {
    
    const systemPrompt = `You are a motion graphics expert providing strategic editing guidance.

CONVERSATION ANALYSIS:
- Theme: ${input.conversationInsights.conversationTheme}
- User Intent: ${input.conversationInsights.userIntent}
- Previous Changes: ${input.conversationInsights.previousChanges.join(', ')}
- Working Elements: ${input.conversationInsights.preserveElements.join(', ')}
- Risk Areas: ${input.conversationInsights.riskAreas.join(', ')}

CURRENT SCENE CODE ANALYSIS:
${this.analyzeCodeStructure(input.existingCode)}

EDIT REQUEST: "${input.userPrompt}"

SCENE METADATA:
- Duration: ${input.sceneMetadata.duration}s
- Animations: ${input.sceneMetadata.animations.join(', ')}
- Components: ${input.sceneMetadata.components.join(', ')}

Provide strategic editing guidance for this motion graphics scene:

RESPONSE FORMAT (JSON):
{
  "editStrategy": "specific technical approach for this edit",
  "preservationInstructions": [
    "explicit instructions on what to keep unchanged",
    "specific code sections that must be preserved"
  ],
  "modificationAreas": [
    "specific code sections to modify",
    "new elements to add"
  ],
  "animationEnhancements": [
    "motion graphics improvements to make",
    "animation timing adjustments"
  ],
  "continuityGuidance": "how to maintain visual and animation continuity",
  "technicalImplementation": [
    "specific code changes needed",
    "ESM compliance requirements"
  ],
  "riskMitigation": [
    "how to avoid breaking existing functionality",
    "fallback strategies if changes fail"
  ],
  "codePreservation": {
    "criticalSections": ["code sections that must not change"],
    "safeModificationZones": ["areas safe to modify"],
    "animationDependencies": ["animations that depend on each other"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate comprehensive smart edit context." }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
  
  private analyzeCodeStructure(code: string): string {
    // Analyze the existing code structure
    const analysis = {
      components: this.extractComponents(code),
      animations: this.extractAnimations(code),
      styles: this.extractStyles(code),
      dependencies: this.extractDependencies(code),
      structure: this.analyzeStructure(code)
    };
    
    return `
CODE STRUCTURE ANALYSIS:
- Components: ${analysis.components.join(', ')}
- Animations: ${analysis.animations.join(', ')}
- Styles: ${analysis.styles.join(', ')}
- Dependencies: ${analysis.dependencies.join(', ')}
- Structure: ${analysis.structure}
`;
  }
}
```

### **Step 3: ESM-Compliant Smart Code Editor**
```typescript
// src/server/services/smartCodeEditor.service.ts
export class SmartCodeEditorService {
  async editMotionGraphicsCode(input: {
    userPrompt: string;
    existingCode: string;
    smartEditContext: SmartEditContext;
    conversationInsights: ConversationInsights;
  }): Promise<SmartEditResult> {
    
    const systemPrompt = `You are an expert motion graphics code editor specializing in React/Remotion animations.

🚨 CRITICAL ESM REQUIREMENTS - NEVER VIOLATE:
1. NEVER import React: React is globally available
2. NEVER import Remotion: Use window.Remotion destructuring ONLY
3. NEVER import external libraries: NO THREE.js, GSAP, D3, etc.
4. NEVER import CSS files or stylesheets

✅ REQUIRED PATTERN:
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

🧠 SMART EDITING STRATEGY:
${input.smartEditContext.editStrategy}

🔒 CRITICAL PRESERVATION REQUIREMENTS:
${input.smartEditContext.preservationInstructions.map(instruction => `- ${instruction}`).join('\n')}

🎯 MODIFICATION AREAS:
${input.smartEditContext.modificationAreas.map(area => `- ${area}`).join('\n')}

🎬 ANIMATION ENHANCEMENTS:
${input.smartEditContext.animationEnhancements.map(enhancement => `- ${enhancement}`).join('\n')}

⚠️ RISK MITIGATION:
${input.smartEditContext.riskMitigation.map(risk => `- ${risk}`).join('\n')}

EXISTING CODE TO EDIT:
\`\`\`typescript
${input.existingCode}
\`\`\`

EDIT REQUEST: "${input.userPrompt}"

CONVERSATION CONTEXT:
- User Intent: ${input.conversationInsights.userIntent}
- Previous Changes: ${input.conversationInsights.previousChanges.join(', ')}
- Animation Continuity: ${input.conversationInsights.animationContinuity}

EDITING INSTRUCTIONS:
1. Preserve all working elements identified in preservation instructions
2. Only modify the specific areas mentioned in modification areas
3. Enhance animations as specified while maintaining continuity
4. Follow ESM compliance rules strictly
5. Maintain visual and functional continuity
6. Add comments explaining changes made

RESPONSE FORMAT (JSON):
{
  "code": "// Complete modified React/Remotion component code",
  "name": "Updated scene name",
  "duration": 5,
  "changes": [
    "specific change 1: what was modified",
    "specific change 2: what was added",
    "specific change 3: what was preserved"
  ],
  "reasoning": "Detailed explanation of edit approach and preservation strategy",
  "preservedElements": [
    "list of elements that were kept unchanged",
    "animations that were preserved"
  ],
  "newElements": [
    "list of new elements added",
    "new animations introduced"
  ],
  "riskAssessment": "assessment of potential issues and how they were mitigated"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Edit the motion graphics scene intelligently while preserving working elements." }
      ],
      temperature: 0.1, // Very low temperature for precise edits
      max_tokens: 5000
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Validate ESM compliance
    await this.validateESMCompliance(result.code);
    
    // Validate preservation requirements
    await this.validatePreservation(input.existingCode, result.code, input.smartEditContext);
    
    return result;
  }
  
  private async validateESMCompliance(code: string): Promise<void> {
    const violations = [];
    
    // Check for forbidden imports
    if (/import\s+React/.test(code)) {
      violations.push("❌ React import detected - use global React");
    }
    
    if (/import.*from\s+['"]remotion['"]/.test(code)) {
      violations.push("❌ Remotion import detected - use window.Remotion");
    }
    
    if (/import.*from\s+['"]three['"]/.test(code)) {
      violations.push("❌ THREE.js import detected - external libraries forbidden");
    }
    
    if (/import.*\.css['"]/.test(code)) {
      violations.push("❌ CSS import detected - stylesheets forbidden");
    }
    
    // Check for required pattern
    if (!code.includes('window.Remotion')) {
      violations.push("❌ Missing window.Remotion destructuring");
    }
    
    if (violations.length > 0) {
      throw new Error(`ESM Compliance Violations:\n${violations.join('\n')}`);
    }
  }
  
  private async validatePreservation(
    originalCode: string, 
    editedCode: string, 
    editContext: SmartEditContext
  ): Promise<void> {
    const preservationIssues = [];
    
    // Check that critical sections were preserved
    for (const criticalSection of editContext.codePreservation.criticalSections) {
      if (!editedCode.includes(criticalSection)) {
        preservationIssues.push(`❌ Critical section removed: ${criticalSection}`);
      }
    }
    
    // Check that animation dependencies are maintained
    for (const dependency of editContext.codePreservation.animationDependencies) {
      if (originalCode.includes(dependency) && !editedCode.includes(dependency)) {
        preservationIssues.push(`❌ Animation dependency broken: ${dependency}`);
      }
    }
    
    if (preservationIssues.length > 0) {
      throw new Error(`Preservation Violations:\n${preservationIssues.join('\n')}`);
    }
  }
}
```

---

## 🎬 **Real-World Example: Smart Edit in Action**

### **Conversation History**:
```
1. User: "Create a login form with purple gradient"
   Assistant: "I've created a sleek login form with a purple gradient background and smooth animations!"

2. User: "make the text bigger and add fade-in animation"
   Assistant: "I've increased the text size to 24px and added smooth fade-in animations for all form elements!"

3. User: "add more typewriter effects and make it more animated"
   Assistant: [SMART EDIT SYSTEM ACTIVATES]
```

### **Smart Analysis Process**:

#### **1. Conversation Analysis**:
```json
{
  "conversationTheme": "Progressive enhancement of login form design",
  "userIntent": "Add typewriter text effects while enhancing overall animation",
  "previousChanges": [
    "added purple gradient background",
    "increased text size to 24px", 
    "added fade-in animations for form elements"
  ],
  "preserveElements": [
    "login form structure",
    "purple gradient background", 
    "24px text size",
    "existing fade-in animations"
  ],
  "riskAreas": [
    "Don't break form input functionality",
    "Maintain purple gradient",
    "Preserve existing fade-in timing"
  ]
}
```

#### **2. Smart Edit Context**:
```json
{
  "editStrategy": "Layer typewriter effects on existing animations without disrupting form functionality",
  "preservationInstructions": [
    "Keep all existing fade-in animations with current timing",
    "Preserve purple gradient background styling",
    "Maintain 24px text size for all text elements",
    "Keep form input functionality intact"
  ],
  "modificationAreas": [
    "Add typewriter effect to title text",
    "Enhance button animations with subtle pulse",
    "Add cursor blinking effect for typewriter"
  ],
  "animationEnhancements": [
    "Implement character-by-character text reveal",
    "Add typing cursor animation",
    "Layer new animations after existing fade-ins"
  ],
  "riskMitigation": [
    "Start typewriter after fade-in completes",
    "Use separate animation variables to avoid conflicts",
    "Test form inputs remain functional"
  ]
}
```

#### **3. Generated Smart Edit**:
```typescript
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function EnhancedLoginForm(props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // PRESERVED: Original fade-in animation (unchanged)
  const fadeIn = interpolate(frame, [0, 30], [0, 1]);
  
  // PRESERVED: Form slide animation (unchanged)
  const formSlide = interpolate(frame, [15, 45], [50, 0]);
  
  // NEW: Typewriter effect for title (starts after fade-in)
  const titleText = "Welcome Back";
  const typewriterProgress = interpolate(
    frame, 
    [45, 105], // Starts after fade-in completes
    [0, titleText.length], 
    { extrapolateRight: 'clamp' }
  );
  const visibleTitle = titleText.substring(0, Math.floor(typewriterProgress));
  const showCursor = typewriterProgress < titleText.length;
  
  // NEW: Enhanced button animation (preserves existing functionality)
  const buttonPulse = interpolate(
    frame, 
    [120, 150], 
    [1, 1.05], 
    { extrapolateRight: 'mirror' }
  );
  
  return (
    <AbsoluteFill 
      style={{ 
        opacity: fadeIn, // PRESERVED: Original fade-in
        // PRESERVED: Original purple gradient (unchanged)
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
      className="flex items-center justify-center"
    >
      <div 
        style={{ transform: `translateY(${formSlide}px)` }} // PRESERVED: Original slide
        className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full"
      >
        {/* NEW: Typewriter title with preserved text size */}
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800"> {/* PRESERVED: 24px equivalent */}
          {visibleTitle}
          {showCursor && (
            <span className="animate-pulse text-purple-600">|</span>
          )}
        </h1>
        
        {/* PRESERVED: Original form structure and styling (unchanged) */}
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full p-3 border rounded mb-4 text-lg" // PRESERVED: Large text
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full p-3 border rounded mb-6 text-lg" // PRESERVED: Large text
        />
        
        {/* ENHANCED: Button with new pulse animation */}
        <button 
          style={{ transform: `scale(${buttonPulse})` }} // NEW: Pulse effect
          className="w-full bg-purple-600 text-white p-3 rounded font-semibold hover:bg-purple-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    </AbsoluteFill>
  );
}
```

#### **4. Smart Edit Result**:
```json
{
  "changes": [
    "Added typewriter effect to title starting at frame 45",
    "Added blinking cursor animation for typewriter",
    "Enhanced button with subtle pulse animation",
    "Preserved all existing fade-in and slide animations"
  ],
  "preservedElements": [
    "Purple gradient background",
    "24px text size (text-2xl)",
    "Original fade-in timing (frames 0-30)",
    "Form slide animation (frames 15-45)",
    "Form input functionality and styling"
  ],
  "newElements": [
    "Character-by-character title reveal",
    "Animated typing cursor",
    "Button pulse animation"
  ],
  "riskAssessment": "Low risk - new animations start after existing ones complete, no conflicts with form functionality"
}
```

---

## 🎯 **Key Benefits of Smart Edit System**

### **1. Conversation Continuity**
- ✅ Analyzes entire chat history for context
- ✅ Understands user's progressive enhancement approach
- ✅ Preserves all previous work and improvements

### **2. Intelligent Preservation**
- ✅ Identifies working elements automatically
- ✅ Protects critical functionality from breaking
- ✅ Maintains visual and animation continuity

### **3. Risk-Aware Editing**
- ✅ Identifies potential conflicts before editing
- ✅ Uses safe modification zones
- ✅ Implements fallback strategies

### **4. ESM Compliance Guaranteed**
- ✅ Strict validation prevents forbidden imports
- ✅ Enforces `window.Remotion` pattern
- ✅ Motion graphics focus with professional animations

### **5. User Pattern Learning**
- ✅ Learns from user's editing preferences
- ✅ Adapts to user's complexity preferences
- ✅ Maintains consistent style across edits

This smart edit system transforms simple edit requests into intelligent, context-aware modifications that build upon previous work while maintaining strict ESM compliance and motion graphics excellence! 🚀 