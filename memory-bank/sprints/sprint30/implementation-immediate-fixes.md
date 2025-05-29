# Sprint 30: Immediate Implementation Fixes
**Date**: January 27, 2025  
**Goal**: High-impact fixes for production readiness based on user feedback

## 🚀 **IMMEDIATE ACTIONS (Next 2 Hours)**

### **Fix 1: Replace 2000-Line Prompt with Constrained Prompt**
**Priority**: 🔥 **CRITICAL** - 30 minutes  
**File**: `src/lib/services/sceneBuilder.service.ts`

**Current Problem**: 2000+ line prompt overwhelming LLM
**Solution**: Replace with 200-line constrained prompt

```typescript
const CONSTRAINED_PROMPT = `
You are generating React/Remotion motion graphics. You have UNLIMITED creative freedom for content, but MUST follow these structural constraints:

🚨 CRITICAL ESM REQUIREMENTS:
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

NEVER use:
- import React from 'react'
- import { ... } from 'remotion'
- import * as THREE from 'three'

✅ REQUIRED STRUCTURE:
export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Your animations here using interpolate()
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill className="bg-black flex items-center justify-center">
      {/* Your creative content here */}
    </AbsoluteFill>
  );
}

ANIMATION RULES:
- Use interpolate(frame, [start, end], [from, to]) for ALL animations
- Common patterns: opacity, translateX, translateY, scale, rotate
- Timing: 30fps, so 30 frames = 1 second

UI RULES:
- Use Tailwind classes only: bg-blue-500, text-white, text-6xl, etc.
- For forms: className="p-3 border rounded"
- For buttons: className="bg-blue-500 text-white p-3 rounded"

USER REQUEST: "${userRequest}"

Be creative with the content but follow the structure exactly. Generate working code now:
`;
```

**Implementation**:
```typescript
// Replace in generateDirectCode()
temperature: 0.1, // DOWN from 0.7
max_tokens: 2000, // DOWN from 4000
```

### **Fix 2: AST-Based ESM Validation**
**Priority**: 🔥 **HIGH** - 45 minutes  
**File**: `src/lib/services/codeValidation.service.ts`

**Current Problem**: Regex misses edge cases
**Solution**: Use SWC AST parsing for bulletproof validation

```typescript
import { parseSync } from '@swc/core';

export class ESMValidator {
  validateESMCompliance(code: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    try {
      const ast = parseSync(code, {
        syntax: 'typescript',
        tsx: true,
      });
      
      // Walk AST for forbidden patterns
      this.walkAST(ast, (node) => {
        // Check for React imports
        if (node.type === 'ImportDeclaration' && 
            node.source.value === 'react') {
          violations.push('❌ React import detected - use global React');
        }
        
        // Check for Remotion imports
        if (node.type === 'ImportDeclaration' && 
            node.source.value.includes('remotion')) {
          violations.push('❌ Remotion import detected - use window.Remotion');
        }
        
        // Check for external library imports
        if (node.type === 'ImportDeclaration' && 
            ['three', 'gsap', 'd3'].includes(node.source.value)) {
          violations.push(`❌ External library import: ${node.source.value}`);
        }
      });
      
      // Check for required window.Remotion pattern
      if (!code.includes('window.Remotion')) {
        violations.push('❌ Missing window.Remotion destructuring');
      }
      
      return { isValid: violations.length === 0, violations };
      
    } catch (parseError) {
      return { isValid: false, violations: [`❌ Syntax error: ${parseError.message}`] };
    }
  }
}
```

### **Fix 3: Context Window Management**
**Priority**: 🔥 **HIGH** - 30 minutes  
**File**: `src/server/services/conversationAnalysis.service.ts`

**Current Problem**: Context window blow-ups
**Solution**: Smart conversation summarization

```typescript
export class ConversationAnalysisService {
  async analyzeConversationContext(input: {
    chatHistory: Message[];
    currentPrompt: string;
    existingScene: Scene;
  }): Promise<ConversationAnalysis> {
    
    // Smart context management
    const relevantContext = await this.buildRelevantContext(input.chatHistory);
    
    const systemPrompt = `Analyze this conversation for motion graphics editing context.

RECENT CONVERSATION (last 5 messages):
${relevantContext.recentMessages}

CONVERSATION SUMMARY:
${relevantContext.summary}

CURRENT EDIT REQUEST: "${input.currentPrompt}"

EXISTING SCENE: ${input.existingScene.name}

Provide editing guidance in JSON format:
{
  "userIntent": "What the user wants to achieve",
  "preserveElements": ["specific elements to keep unchanged"],
  "modificationAreas": ["specific areas to modify"],
  "editStrategy": "technical approach"
}`;

    // Use GPT-4o-mini for fast analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.2,
      max_tokens: 800 // Keep it focused
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
  
  private async buildRelevantContext(chatHistory: Message[]): Promise<{
    recentMessages: string;
    summary: string;
  }> {
    // Keep last 5 messages for immediate context
    const recentMessages = chatHistory.slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    // Summarize older messages if conversation is long
    let summary = '';
    if (chatHistory.length > 10) {
      const olderMessages = chatHistory.slice(0, -5);
      summary = await this.summarizeConversation(olderMessages);
    }
    
    return { recentMessages, summary };
  }
}
```

### **Fix 4: JSON Repair & Retry Logic**
**Priority**: 🔥 **MEDIUM** - 20 minutes  
**File**: `src/lib/services/sceneBuilder.service.ts`

**Current Problem**: JSON.parse() explosions
**Solution**: Robust JSON parsing with repair

```typescript
import { jsonrepair } from 'jsonrepair';

export class SceneBuilderService {
  private async parseJSONResponse(response: string, attempt: number = 1): Promise<any> {
    try {
      // Try direct parse first
      return JSON.parse(response);
    } catch (error) {
      if (attempt === 1) {
        try {
          // Try JSON repair
          const repaired = jsonrepair(response);
          return JSON.parse(repaired);
        } catch (repairError) {
          // Retry with explicit JSON instruction
          return this.retryWithJSONFix(response);
        }
      }
      throw new Error(`JSON parsing failed after repair: ${error.message}`);
    }
  }
  
  private async retryWithJSONFix(originalResponse: string): Promise<any> {
    const fixPrompt = `The following response has JSON formatting issues. Fix it and return only valid JSON:

${originalResponse}

Return only the corrected JSON, no explanation:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: fixPrompt }],
      temperature: 0.1,
      max_tokens: 1000
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
}
```

## 🎯 **QUICK WINS (Next 1 Hour)**

### **Fix 5: Complex Request Detection**
**Priority**: 🚀 **MEDIUM** - 15 minutes

```typescript
const detectComplexRequest = (userPrompt: string): boolean => {
  const complexIndicators = [
    /\bthen\b/i,           // "create X then Y"
    /\bafter\b/i,          // "after X happens"
    /\bwhile\b/i,          // "while X is happening"
    /\bwhen\b/i,           // "when X finishes"
    /,.*,.*,/,             // Multiple comma-separated items
  ];
  
  const wordCount = userPrompt.split(/\s+/).length;
  
  return wordCount > 20 || 
         complexIndicators.some(pattern => pattern.test(userPrompt));
};
```

### **Fix 6: Success Metrics Tracking**
**Priority**: 🚀 **MEDIUM** - 15 minutes

```typescript
export class MetricsTracker {
  async trackGeneration(result: {
    success: boolean;
    compilationSuccess: boolean;
    generationTime: number;
    promptType: 'simple' | 'complex';
    temperature: number;
  }) {
    // Track first-compile pass rate (target: ≥95%)
    const metrics = {
      timestamp: new Date(),
      success_rate: result.success ? 1 : 0,
      compile_rate: result.compilationSuccess ? 1 : 0,
      generation_time_ms: result.generationTime,
      prompt_type: result.promptType,
      temperature: result.temperature
    };
    
    // Store in database for analysis
    await this.storeMetrics(metrics);
    
    // Real-time monitoring
    console.log(`[METRICS] Success: ${result.success}, Compile: ${result.compilationSuccess}, Time: ${result.generationTime}ms`);
  }
}
```

## 📊 **EXPECTED IMPACT**

### **Before Fixes**:
- Success Rate: ~60%
- Generation Time: 3-8 seconds
- Context Window: Frequent blow-ups
- JSON Failures: ~15%

### **After Fixes**:
- Success Rate: ~90% (constrained prompt)
- Generation Time: 1-2 seconds (lower temperature)
- Context Window: Managed with summarization
- JSON Failures: <2% (repair + retry)

## 🚀 **IMPLEMENTATION ORDER**

1. **Fix 1** (30 min): Replace mega-prompt → immediate quality boost
2. **Fix 4** (20 min): JSON repair → eliminate parse failures  
3. **Fix 2** (45 min): AST validation → bulletproof ESM compliance
4. **Fix 3** (30 min): Context management → scale to long conversations
5. **Fix 5** (15 min): Complex detection → smart routing
6. **Fix 6** (15 min): Metrics → data-driven optimization

**Total Time**: ~2.5 hours for production-ready system

## ✅ **SUCCESS CRITERIA**

- [ ] First-compile pass rate ≥95%
- [ ] Generation time <2 seconds for simple prompts
- [ ] Zero ESM violations in production
- [ ] JSON parsing success rate ≥98%
- [ ] Context window management working
- [ ] Metrics tracking operational

**Status**: Ready for immediate implementation! 🚀 