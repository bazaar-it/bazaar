# Edit Scene Problems & Solution - Sprint 31

## 🚨 **Critical Problems Identified**

### **Problem 1: Wrong Pipeline**
**Current**: EditScene uses the same two-step pipeline as addScene
- Generates new JSON from scratch
- Generates new TSX code from scratch
- Loses all existing animations and functionality

**Should**: Direct code modification approach
- Parse existing TSX code
- Make targeted changes only
- Preserve all working functionality

### **Problem 2: Missing Chat History**
**Current**: EditScene gets no chat history context
```typescript
// Only gets current user message and scene data
const brainContext = await this.generateEditBrainContext({
  userPrompt,
  existingCode,
  existingName,
  storyboardSoFar: storyboardSoFar || []
});
```

**Should**: Get full conversation context
- Previous user requests
- Assistant responses about what was added
- Build context of user preferences

### **Problem 3: No Targeted Changes**
**Current**: Regenerates entire scene
- User asks: "make text typewriter effect"
- System: Rebuilds everything, loses animations

**Should**: Surgical code modifications
- Identify specific elements to change
- Preserve everything else exactly as-is
- Apply minimal, precise modifications

## 💡 **Proposed Solution: Direct Code Editing**

### **New EditScene Approach**

#### **Step 1: Context Analysis**
```typescript
const editContext = {
  userPrompt: "make the Experience the future of technology part be typewriter effect",
  existingCode: "const { AbsoluteFill... } = window.Remotion;...",
  chatHistory: [
    { role: "user", content: "Make a crypto hero section..." },
    { role: "assistant", content: "Created sleek hero with spring animations..." },
    { role: "user", content: "make background dark gray" },
    { role: "assistant", content: "Updated background while preserving animations..." }
  ]
}
```

#### **Step 2: Code Analysis & Planning**
```typescript
// Parse existing code to understand structure
const codeAnalysis = {
  components: ["title", "subtitle", "poweredByAI", "button"],
  animations: ["titleSpring", "subtitleSpring", "poweredByAIOpacity", "ctaSpring"],
  targetElement: "subtitle", // "Experience the future of technology"
  preserveElements: ["title", "poweredByAI", "button", "background", "all animations"]
}
```

#### **Step 3: Surgical Code Modification**
```typescript
// Only modify the specific element requested
const modifications = {
  element: "subtitle",
  change: "add typewriter effect",
  preserveAnimations: true,
  preserveOtherElements: true
}
```

### **Implementation Plan**

#### **New EditScene Service**
```typescript
class DirectCodeEditorService {
  async editCode(input: {
    userPrompt: string;
    existingCode: string;
    chatHistory: Array<{role: string, content: string}>;
    existingName: string;
  }): Promise<{
    code: string;
    changes: string[];
    preserved: string[];
  }> {
    // 1. Analyze what user wants to change
    const changeAnalysis = await this.analyzeRequestedChanges(input);
    
    // 2. Parse existing code structure
    const codeStructure = await this.parseCodeStructure(input.existingCode);
    
    // 3. Make targeted modifications
    const modifiedCode = await this.applyTargetedChanges({
      code: input.existingCode,
      changes: changeAnalysis,
      preserve: codeStructure.preserve
    });
    
    return modifiedCode;
  }
}
```

#### **Change Analysis Prompt**
```typescript
const prompt = `You are a code editor analyzing what changes to make to existing React/Remotion code.

EXISTING CODE:
\`\`\`tsx
${existingCode}
\`\`\`

USER REQUEST: "${userPrompt}"

CHAT HISTORY (for context):
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CRITICAL: You must preserve ALL existing functionality and animations.
Only modify what the user specifically requested.

ANALYSIS REQUIRED:
1. What specific element(s) need to change?
2. What exact modification is requested?
3. What must be preserved exactly as-is?
4. How to make minimal, targeted changes?

RESPONSE FORMAT (JSON):
{
  "targetElement": "subtitle|title|button|background|etc",
  "targetText": "Experience the future of technology",
  "requestedChange": "add typewriter effect",
  "preserveAnimations": ["titleSpring", "subtitleSpring", "ctaSpring"],
  "preserveElements": ["title", "button", "background", "poweredByAI"],
  "modificationStrategy": "Add typewriter animation to subtitle while keeping existing spring animation"
}`;
```

#### **Targeted Code Modification**
```typescript
const modificationPrompt = `You are a surgical code editor. Make ONLY the requested change while preserving everything else.

EXISTING WORKING CODE:
\`\`\`tsx
${existingCode}
\`\`\`

MODIFICATION REQUIRED:
- Target: ${changeAnalysis.targetElement}
- Change: ${changeAnalysis.requestedChange}
- PRESERVE: ${changeAnalysis.preserveElements.join(', ')}
- PRESERVE ANIMATIONS: ${changeAnalysis.preserveAnimations.join(', ')}

RULES:
1. Make MINIMAL changes - only what's requested
2. Keep ALL existing animations and functionality
3. Preserve the exact same component structure
4. Don't change variable names or function structure
5. Only add the requested feature (typewriter effect)

Return the complete modified code with ONLY the requested change applied.`;
```

## 🎯 **Expected Results**

### **Before (Current Broken Approach)**
User: "make text typewriter effect"
System: Regenerates entire scene, loses spring animations, changes layout

### **After (Proposed Targeted Approach)**
User: "make text typewriter effect"
System: 
- Preserves all existing spring animations
- Preserves exact layout and styling
- ONLY adds typewriter effect to specified text
- Keeps function name, structure, everything else identical

## 📋 **Implementation Steps**

1. **Create DirectCodeEditorService** - New service for surgical code edits
2. **Update EditScene tool** - Use direct editing instead of two-step pipeline
3. **Add chat history context** - Pass previous conversation to editor
4. **Test targeted changes** - Verify only requested elements change
5. **Performance comparison** - Should be faster than regenerating everything

## 🚀 **Benefits**

1. **Preserves functionality** - No loss of working animations
2. **Faster edits** - No need to regenerate JSON + code
3. **More precise** - Only changes what user requests
4. **Better UX** - User gets exactly what they asked for
5. **Maintains context** - Builds on previous work instead of starting over

This approach treats code editing like a human developer would - make targeted changes while preserving working functionality! 