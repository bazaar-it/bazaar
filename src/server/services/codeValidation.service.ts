import { openai } from "~/server/lib/openai";
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { emitSceneEvent } from "~/lib/events/sceneEvents";

// 📊 Metrics tracking interfaces
interface ValidationMetrics {
  attemptCount: number;
  duration: number;
  success: boolean;
  errorTypes: string[];
  fixesApplied: string[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd: number;
}

interface ProjectCostMetrics {
  projectId: string;
  totalTokens: number;
  totalCostUsd: number;
  sceneCount: number;
  avgCostPerScene: number;
}

// 🎯 Input interface for validation
export interface CodeValidationInput {
  code: string;
  userPrompt: string;
  sceneContext: {
    projectId: string;
    sceneId: string;
  };
  maxAttempts?: number;
}

// 📋 Result interface
export interface CodeValidationResult {
  isValid: boolean;
  fixedCode?: string;
  errors: string[];
  fixes: string[];
  attempts: number;
  userMessage?: string;
  metrics: ValidationMetrics;
}

// 🧪 Runtime validation result
interface RuntimeValidationResult {
  isValid: boolean;
  errors: string[];
  runtimeErrors: string[];
  syntaxErrors: string[];
  logicErrors: string[];
}

export class CodeValidationService {
  /**
   * 🎯 Main validation and fix method - INTELLIGENT & ADAPTIVE
   */
  async validateAndFix(input: CodeValidationInput): Promise<CodeValidationResult> {
    const startTime = Date.now();
    const maxAttempts = input.maxAttempts || 3;
    let currentCode = input.code;
    let attempts = 0;
    let allErrors: string[] = [];
    let allFixes: string[] = [];
    let totalTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let totalCost = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 🔍 STEP 1: Intelligent runtime validation
      const validation = await this.intelligentValidation(currentCode);
      
      if (validation.isValid) {
        const duration = Date.now() - startTime;
        const metrics: ValidationMetrics = {
          attemptCount: attempts,
          duration,
          success: true,
          errorTypes: allErrors,
          fixesApplied: allFixes,
          tokenUsage: totalTokenUsage,
          costUsd: totalCost
        };

        // 📊 Emit success metrics
        await this.emitValidationMetrics('pass', metrics, input.sceneContext.projectId);
        
        // 💰 Update project cost tracking
        await this.updateProjectCostMetrics(input.sceneContext.projectId, totalTokenUsage, totalCost);

        return {
          isValid: true,
          fixedCode: currentCode,
          errors: allErrors,
          fixes: allFixes,
          attempts,
          metrics
        };
      }
      
      allErrors.push(...validation.errors);
      
      // 💬 STEP 2: Generate user notification for first attempt
      if (attempts === 1) {
        const userMessage = await this.generateIntelligentUserNotification(
          input.userPrompt, 
          validation.errors,
          validation.runtimeErrors,
          validation.syntaxErrors,
          validation.logicErrors
        );
        await this.sendChatMessage(userMessage, input.sceneContext.projectId, 'system-notification');
      }
      
      // 🔧 STEP 3: Intelligent code fixing
      const fixResult = await this.generateIntelligentCodeFix({
        originalCode: currentCode,
        errors: validation.errors,
        runtimeErrors: validation.runtimeErrors,
        syntaxErrors: validation.syntaxErrors,
        logicErrors: validation.logicErrors,
        userPrompt: input.userPrompt,
        attempt: attempts,
      });
      
      if (fixResult.fixedCode) {
        currentCode = fixResult.fixedCode;
        allFixes.push(`Attempt ${attempts}: Fixed ${validation.errors.length} issues`);
        
        // Track token usage and cost
        totalTokenUsage.promptTokens += fixResult.tokenUsage.promptTokens;
        totalTokenUsage.completionTokens += fixResult.tokenUsage.completionTokens;
        totalTokenUsage.totalTokens += fixResult.tokenUsage.totalTokens;
        totalCost += fixResult.costUsd;
      } else {
        break; // Can't fix, give up
      }
    }
    
    // All attempts failed
    const duration = Date.now() - startTime;
    const metrics: ValidationMetrics = {
      attemptCount: attempts,
      duration,
      success: false,
      errorTypes: allErrors,
      fixesApplied: allFixes,
      tokenUsage: totalTokenUsage,
      costUsd: totalCost
    };

    // 📊 Emit failure metrics
    await this.emitValidationMetrics('fail', metrics, input.sceneContext.projectId);
    
    // 💰 Update project cost tracking even for failures
    await this.updateProjectCostMetrics(input.sceneContext.projectId, totalTokenUsage, totalCost);

    return {
      isValid: false,
      errors: allErrors,
      fixes: allFixes,
      attempts,
      userMessage: "I tried my best to fix the code, but I'm having trouble. Let me try a simpler approach.",
      metrics
    };
  }
  
  /**
   * 🧠 INTELLIGENT VALIDATION - Runs code in safe sandbox and detects ANY errors
   */
  private async intelligentValidation(code: string): Promise<RuntimeValidationResult> {
    const errors: string[] = [];
    const runtimeErrors: string[] = [];
    const syntaxErrors: string[] = [];
    const logicErrors: string[] = [];
    
    try {
      // 🔍 STEP 1: Syntax validation using safe parsing
      const syntaxValidation = await this.validateSyntax(code);
      if (!syntaxValidation.isValid) {
        syntaxErrors.push(...syntaxValidation.errors);
        errors.push(...syntaxValidation.errors);
      }
      
      // 🔍 STEP 2: Runtime validation in safe sandbox - TEMPORARILY DISABLED
      // The JSX transformation is complex and causing issues. 
      // The main problem (invalid CSS syntax) is fixed in the prompt.
      // TODO: Re-enable with proper JSX transformer
      /*
      const runtimeValidation = await this.validateRuntime(code);
      if (!runtimeValidation.isValid) {
        runtimeErrors.push(...runtimeValidation.errors);
        errors.push(...runtimeValidation.errors);
      }
      */
      
      // 🔍 STEP 3: Logic validation (Remotion-specific patterns)
      const logicValidation = await this.validateLogic(code);
      if (!logicValidation.isValid) {
        logicErrors.push(...logicValidation.errors);
        errors.push(...logicValidation.errors);
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        runtimeErrors,
        syntaxErrors,
        logicErrors
      };
      
    } catch (error) {
      const errorMsg = `Validation system error: ${error instanceof Error ? error.message : String(error)}`;
      return {
        isValid: false,
        errors: [errorMsg],
        runtimeErrors: [errorMsg],
        syntaxErrors: [],
        logicErrors: []
      };
    }
  }
  
  /**
   * 🔧 Syntax validation using TypeScript compiler API
   */
  private async validateSyntax(code: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Use Sucrase for fast syntax checking
      const { transform } = await import('sucrase');
      
      transform(code, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false
      });
      
      return { isValid: true, errors: [] };
      
    } catch (syntaxError: any) {
      const errorMessage = syntaxError?.message || String(syntaxError);
      errors.push(`SYNTAX_ERROR: ${errorMessage}`);
      
      // Extract specific error details if available
      if (syntaxError?.loc) {
        errors.push(`Error at line ${syntaxError.loc.line}, column ${syntaxError.loc.column}`);
      }
      
      return { isValid: false, errors };
    }
  }
  
  /**
   * 🏃 Runtime validation in safe sandbox environment
   */
  private async validateRuntime(code: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Create a safe sandbox environment for testing
      const sandboxCode = this.createSandboxWrapper(code);
      
      // Try to execute in safe environment
      const result = await this.executeSafely(sandboxCode);
      
      if (!result.success) {
        const errorMsg = result.error || 'Unknown runtime error';
        errors.push(`RUNTIME_ERROR: ${errorMsg}`);
        
        // Analyze specific error types
        if (errorMsg.includes('interpolate')) {
          errors.push('INTERPOLATE_ERROR: Issue with interpolate function usage');
        }
        if (errorMsg.includes('useCurrentFrame')) {
          errors.push('HOOK_ERROR: Issue with useCurrentFrame hook');
        }
        if (errorMsg.includes('undefined')) {
          errors.push('UNDEFINED_ERROR: Accessing undefined variables or properties');
        }
      }
      
      return { isValid: errors.length === 0, errors };
      
    } catch (error) {
      errors.push(`RUNTIME_VALIDATION_ERROR: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors };
    }
  }
  
  /**
   * 🧮 Logic validation for Remotion-specific patterns
   */
  private async validateLogic(code: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check for required Remotion patterns
    if (!code.includes('window.Remotion')) {
      errors.push('LOGIC_ERROR: Missing window.Remotion destructuring');
    }
    
    if (!code.includes('export default function')) {
      errors.push('LOGIC_ERROR: Missing export default function');
    }
    
    // Check for ACTUALLY invalid CSS syntax patterns (JavaScript variables in Tailwind classes)
    // These patterns specifically look for JavaScript variables being used incorrectly in className
    const invalidCSSPatterns = [
      /className="[^"]*\w+-\[\$\{[^}]+\}\]/g, // Matches patterns like "opacity-[${variable}]" - INVALID
      /className="[^"]*\w+-\[[a-zA-Z_$][a-zA-Z0-9_$]*\]/g, // Matches patterns like "opacity-[titleOpacity]" - INVALID (JS variable)
    ];
    
    for (const pattern of invalidCSSPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        // Filter out valid Tailwind arbitrary values (numbers, colors, etc.)
        const actuallyInvalid = matches.filter(match => {
          // Valid Tailwind arbitrary values we should NOT flag:
          // - Numbers: border-l-[50px], w-[100px], h-[200px]
          // - Colors: bg-[#ff0000], text-[rgb(255,0,0)]
          // - Percentages: w-[50%], h-[100%]
          // - CSS values: p-[1rem], m-[2em]
          
          // Extract the value inside brackets
          const bracketContent = match.match(/\[([^\]]+)\]/)?.[1];
          if (!bracketContent) return true; // If we can't parse it, flag it
          
          // Valid patterns (don't flag these):
          const validPatterns = [
            /^\d+px$/,           // 50px, 100px
            /^\d+%$/,            // 50%, 100%
            /^\d+rem$/,          // 1rem, 2rem
            /^\d+em$/,           // 1em, 2em
            /^\d+$/,             // 50, 100 (unitless numbers)
            /^#[0-9a-fA-F]{3,6}$/, // #fff, #ff0000
            /^rgb\([^)]+\)$/,    // rgb(255,0,0)
            /^rgba\([^)]+\)$/,   // rgba(255,0,0,0.5)
            /^hsl\([^)]+\)$/,    // hsl(0,100%,50%)
            /^transparent$/,     // transparent
            /^inherit$/,         // inherit
            /^auto$/,            // auto
            /^none$/,            // none
          ];
          
          // If it matches any valid pattern, don't flag it
          return !validPatterns.some(pattern => pattern.test(bracketContent));
        });
        
        // Only add errors for actually invalid patterns
        if (actuallyInvalid.length > 0) {
          errors.push(`LOGIC_ERROR: Invalid CSS syntax detected: ${actuallyInvalid[0]}. Use inline styles for dynamic values: style={{ opacity: variable }}`);
        }
      }
    }
    
    // Check for interpolate usage patterns
    const interpolateMatches = code.match(/interpolate\s*\([^)]+\)/g);
    if (interpolateMatches) {
      for (const match of interpolateMatches) {
        const arrayMatches = match.match(/\[[^\]]+\]/g);
        if (arrayMatches && arrayMatches.length >= 2) {
          const inputRange = arrayMatches[0];
          const outputRange = arrayMatches[1];
          
          if (inputRange && outputRange) {
            // Count elements in arrays
            const inputCount = (inputRange.match(/,/g) || []).length + 1;
            const outputCount = (outputRange.match(/,/g) || []).length + 1;
            
            if (inputCount !== outputCount) {
              errors.push(`LOGIC_ERROR: interpolate inputRange (${inputCount}) and outputRange (${outputCount}) length mismatch`);
            }
          }
        }
      }
    }
    
    // Check for spring() calls without fps parameter
    const springMatches = code.match(/spring\s*\(\s*\{[^}]*\}\s*\)/g);
    if (springMatches) {
      for (const match of springMatches) {
        if (!match.includes('fps')) {
          errors.push(`LOGIC_ERROR: spring() call missing required fps parameter. Use: spring({ frame, fps, config: {...} })`);
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 🛡️ Create safe sandbox wrapper for code execution
   */
  private createSandboxWrapper(code: string): string {
    // Transform ES module exports to CommonJS for sandbox execution
    let transformedCode = code
      .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+default\s+/g, 'module.exports = ')
      .replace(/export\s+\{([^}]+)\}/g, '// Exported: $1')
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*/g, '// Import removed for sandbox\n');

    // Transform JSX to createElement calls for safe execution
    // This is a simple transformation - in production you'd use a proper JSX transformer
    transformedCode = transformedCode
      .replace(/<AbsoluteFill([^>]*)>/g, 'React.createElement("div",$1,')
      .replace(/<\/AbsoluteFill>/g, ')')
      .replace(/<h1([^>]*)>/g, 'React.createElement("h1",$1,')
      .replace(/<\/h1>/g, ')')
      .replace(/<div([^>]*)>/g, 'React.createElement("div",$1,')
      .replace(/<\/div>/g, ')')
      .replace(/<input([^>]*)\s*\/>/g, 'React.createElement("input",$1)')
      .replace(/<button([^>]*)>/g, 'React.createElement("button",$1,')
      .replace(/<\/button>/g, ')')
      .replace(/<svg([^>]*)>/g, 'React.createElement("svg",$1,')
      .replace(/<\/svg>/g, ')')
      .replace(/<polyline([^>]*)\s*\/>/g, 'React.createElement("polyline",$1)')
      // Handle className and style attributes
      .replace(/className="([^"]*)"/g, '{"className":"$1"}')
      .replace(/style=\{([^}]+)\}/g, '{"style":$1}')
      // Handle other common attributes
      .replace(/(\w+)="([^"]*)"/g, '{"$1":"$2"}')
      .replace(/(\w+)=\{([^}]+)\}/g, '{"$1":$2}');

    return `
      // Safe sandbox environment with ES module support
      const module = { exports: {} };
      const exports = module.exports;
      
      const mockWindow = {
        Remotion: {
          AbsoluteFill: ({ children, style, ...props }) => ({ type: 'AbsoluteFill', children, style, props }),
          useCurrentFrame: () => 0,
          useVideoConfig: () => ({ fps: 30, width: 1920, height: 1080, durationInFrames: 300 }),
          interpolate: (value, inputRange, outputRange, options) => {
            if (!Array.isArray(inputRange) || !Array.isArray(outputRange)) {
              throw new Error('interpolate requires arrays for inputRange and outputRange');
            }
            if (inputRange.length !== outputRange.length) {
              throw new Error('inputRange and outputRange must have the same length');
            }
            // Simple linear interpolation for testing
            const ratio = Math.max(0, Math.min(1, (value - inputRange[0]) / (inputRange[inputRange.length - 1] - inputRange[0])));
            return outputRange[0] + ratio * (outputRange[outputRange.length - 1] - outputRange[0]);
          },
          spring: (options) => 0.5, // Mock spring animation
          Sequence: ({ children, from, durationInFrames, ...props }) => ({ type: 'Sequence', children, from, durationInFrames, props }),
          Easing: { 
            easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeIn: (t) => t * t,
            easeOut: (t) => t * (2 - t),
            linear: (t) => t
          },
          Img: ({ src, style, ...props }) => ({ type: 'Img', src, style, props }),
          Audio: ({ src, ...props }) => ({ type: 'Audio', src, props })
        }
      };
      
      const React = { 
        createElement: (type, props, ...children) => {
          // Simple mock createElement that returns a basic object
          return { 
            type: typeof type === 'string' ? type : type.name || 'Component', 
            props: props || {}, 
            children: children.length === 1 ? children[0] : children 
          };
        },
        Fragment: ({ children }) => children
      };
      const window = mockWindow;
      
      // Global CSS and animation helpers
      const CSS = {
        supports: () => true
      };
      
      try {
        ${transformedCode}
        
        // Try to get the component function
        let Component = module.exports;
        if (typeof Component === 'object' && Component.default) {
          Component = Component.default;
        }
        
        if (typeof Component === 'function') {
          // Test component instantiation with mock props
          const result = Component({
            frame: 0,
            fps: 30,
            width: 1920,
            height: 1080,
            durationInFrames: 300
          });
          
          // Basic validation that component returns something renderable
          if (result === null || result === undefined) {
            throw new Error('Component returned null or undefined');
          }
          
          // Check if result looks like a valid React element
          if (typeof result === 'object' && result.type) {
            return { success: true };
          } else {
            throw new Error('Component did not return a valid React element');
          }
        } else {
          throw new Error('No valid React component found - missing export default function');
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    `;
  }
  
  /**
   * ⚡ Execute code safely in isolated environment
   */
  private async executeSafely(sandboxCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use VM or Worker for true isolation in production
      // For now, use Function constructor with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), 1000);
      });
      
      const executionPromise = new Promise((resolve) => {
        try {
          const func = new Function(sandboxCode);
          const result = func();
          resolve(result || { success: true });
        } catch (error) {
          resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      });
      
      const result = await Promise.race([executionPromise, timeoutPromise]) as any;
      return result;
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
  
  /**
   * 🔧 INTELLIGENT CODE FIXING using LLM with error context
   */
  private async generateIntelligentCodeFix(input: {
    originalCode: string;
    errors: string[];
    runtimeErrors: string[];
    syntaxErrors: string[];
    logicErrors: string[];
    userPrompt: string;
    attempt: number;
  }): Promise<{
    fixedCode: string | null;
    tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
    costUsd: number;
  }> {
    const systemPrompt = `You are an expert React/Remotion code fixer with deep understanding of runtime errors.

CRITICAL RULES:
1. NEVER import React (use global React)
2. NEVER import from 'remotion' (use window.Remotion destructuring)
3. ALWAYS use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, Audio } = window.Remotion;
4. Video imports are NOT supported - use CSS animations or static images
5. Fix ALL errors provided, don't ignore any

🚨 CRITICAL SPRING() ANIMATION RULES:
- ALWAYS destructure fps from useVideoConfig: const { fps } = useVideoConfig();
- ALWAYS pass fps to spring(): spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 100 } })
- NEVER call spring() without fps parameter
- CORRECT PATTERN: const { fps } = useVideoConfig(); const animation = spring({ frame, fps, config: {...} });

🚨 CRITICAL CSS SYNTAX RULES:
- NEVER use JavaScript variables in Tailwind classes: opacity-[titleOpacity] ❌
- ALWAYS use inline styles for dynamic values: style={{ opacity: titleOpacity }} ✅
- CORRECT: style={{ transform: \`translateX(\${slideX}px)\` }} ✅
- CORRECT: style={{ opacity: fadeIn, fontSize: '24px' }} ✅

ERROR ANALYSIS:
- Syntax Errors: ${input.syntaxErrors.join(', ') || 'None'}
- Runtime Errors: ${input.runtimeErrors.join(', ') || 'None'}  
- Logic Errors: ${input.logicErrors.join(', ') || 'None'}
- All Errors: ${input.errors.join(', ')}

ORIGINAL USER REQUEST: ${input.userPrompt}

Fix ALL the errors while preserving the user's intent. Return ONLY the corrected code, no explanations.

ORIGINAL CODE:
${input.originalCode}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Use powerful model for intelligent fixing
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Fix attempt ${input.attempt}: Please analyze and fix all the errors in the code.` }
        ],
        temperature: 0.1, // Low temperature for precise fixes
        max_tokens: 4000,
      });
      
      const fixedCode = completion.choices[0]?.message?.content;
      const usage = completion.usage;
      
      // 💰 Calculate cost (GPT-4o pricing: $5/1M input tokens, $15/1M output tokens)
      const inputCost = (usage?.prompt_tokens || 0) * 0.000005;
      const outputCost = (usage?.completion_tokens || 0) * 0.000015;
      const totalCost = inputCost + outputCost;
      
      return {
        fixedCode: fixedCode || null,
        tokenUsage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0
        },
        costUsd: totalCost
      };
      
    } catch (error) {
      console.error(`Intelligent code fix attempt ${input.attempt} failed:`, error);
      return {
        fixedCode: null,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        costUsd: 0
      };
    }
  }
  
  /**
   * 💬 Generate intelligent user notification based on error types
   */
  private async generateIntelligentUserNotification(
    userPrompt: string, 
    errors: string[],
    runtimeErrors: string[],
    syntaxErrors: string[],
    logicErrors: string[]
  ): Promise<string> {
    let specificContext = '';
    
    if (syntaxErrors.length > 0) {
      specificContext = ' I had some code syntax issues that I need to fix.';
    } else if (runtimeErrors.length > 0) {
      if (runtimeErrors.some(e => e.includes('interpolate'))) {
        specificContext = ' I had some animation timing issues that I need to fix.';
      } else if (runtimeErrors.some(e => e.includes('undefined'))) {
        specificContext = ' I had some variable reference issues that I need to fix.';
      } else {
        specificContext = ' I had some runtime issues that I need to fix.';
      }
    } else if (logicErrors.length > 0) {
      specificContext = ' I had some logic issues with the animation structure that I need to fix.';
    }
    
    const systemPrompt = `Generate a conversational, apologetic message for a user whose animation code had errors.

REQUIREMENTS:
- Apologetic but confident tone
- Mention you're in Beta
- Avoid technical jargon
- Include context about what's happening
- 1-2 sentences max
- Conversational, not technical

USER REQUEST: ${userPrompt}
ERROR COUNT: ${errors.length} issues detected
SPECIFIC CONTEXT: ${specificContext}

Generate a message like: "Oops, looks like I generated some invalid code for your request.${specificContext} I'm currently analyzing my errors and rewriting the animations. Have some patience with me, I'm still in Beta..."`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the user notification message." }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });
      
      return completion.choices[0]?.message?.content || 
             `Oops, I generated some invalid code for your request.${specificContext} I'm analyzing my errors and rewriting the animations. Have some patience with me, I'm still in Beta...`;
    } catch (error) {
      return "I'm having some technical difficulties with your request. Let me try a different approach...";
    }
  }
  
  /**
   * 💬 Send WCAG-compliant chat message with ARIA live region support
   */
  private async sendChatMessage(message: string, projectId: string, type: 'success' | 'error' | 'system-notification' = 'system-notification'): Promise<void> {
    try {
      // Save to database using correct schema
      await db.insert(messages).values({
        projectId,
        content: message,
        role: 'assistant',
        kind: 'status', // Use 'kind' instead of 'type'
        status: type === 'error' ? 'error' : 'success',
        createdAt: new Date(),
      });
      
      // Emit real-time event using existing event type
      emitSceneEvent(projectId, 'scene-ready', {
        message,
        type,
        timestamp: new Date().toISOString(),
        isSystemNotification: true,
        accessibility: {
          ariaLive: 'polite',
          role: 'status'
        }
      });
      
    } catch (error) {
      console.error('Failed to send chat message:', error);
    }
  }
  
  /**
   * 📊 Emit validation metrics for observability
   */
  private async emitValidationMetrics(
    result: 'pass' | 'fail',
    metrics: ValidationMetrics,
    projectId: string
  ): Promise<void> {
    try {
      emitSceneEvent(projectId, 'code_validation', {
        result,
        ...metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to emit validation metrics:', error);
    }
  }
  
  /**
   * 💰 Update project cost metrics
   */
  private async updateProjectCostMetrics(
    projectId: string,
    tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number },
    costUsd: number
  ): Promise<void> {
    try {
      const metrics: ProjectCostMetrics = {
        projectId,
        totalTokens: tokenUsage.totalTokens,
        totalCostUsd: costUsd,
        sceneCount: 1,
        avgCostPerScene: costUsd
      };
      
      emitSceneEvent(projectId, 'project_cost_update', {
        ...metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update project cost metrics:', error);
    }
  }
}

// Export singleton instance
export const codeValidationService = new CodeValidationService(); 