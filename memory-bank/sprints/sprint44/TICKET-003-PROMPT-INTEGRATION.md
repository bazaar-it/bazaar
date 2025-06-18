# TICKET-003: Integrate Contract with AI Prompts

## Priority: HIGH
## Status: TODO
## Estimated: 2 hours
## Depends on: TICKET-001

## Objective
Update all code generation prompts to use the dependency contract, ensuring AI models have machine-readable rules and reducing hallucination.

## Background
Current prompts use prose instructions which can be:
- Ambiguous to the model
- Hard to keep in sync
- Prone to interpretation errors

## Implementation Details

### 1. Update Prompt Builder
**Location**: Create `src/lib/codegen/prompt-builder.ts`

```typescript
import { DEPENDENCIES_CONTRACT, getEnabledDependencies } from './dependencies-contract';

export class PromptBuilder {
  /**
   * Generate system prompt with contract injected
   */
  static buildSystemPrompt(sceneName: string): string {
    const enabledDeps = getEnabledDependencies();
    const depsList = Object.keys(enabledDeps);
    
    // Build contract section
    const contractSection = `
=== DEPENDENCY CONTRACT ===
${JSON.stringify({
  availableLibraries: depsList,
  rules: DEPENDENCIES_CONTRACT.rules,
  constraints: DEPENDENCIES_CONTRACT.constraints
}, null, 2)}
=== END CONTRACT ===`;

    // Build examples section
    const examplesSection = `
=== USAGE EXAMPLES ===
${depsList.map(dep => 
  `// Using ${dep}:\nconst { /* destructure needed exports */ } = window.${dep};`
).join('\n')}
=== END EXAMPLES ===`;

    // Build the full prompt
    return `You are an expert React/Remotion developer creating motion graphics.

${contractSection}

${examplesSection}

CRITICAL RULES (from contract above):
1. NO imports - use window.* pattern ONLY
2. Function signature: ${DEPENDENCIES_CONTRACT.rules.functionSignature.replace('{{SCENE_NAME}}', sceneName)}
3. Available libraries: ${depsList.join(', ')}
4. CSS values must be quoted: fontSize: "4rem", padding: "20px"
5. Default duration: ${DEPENDENCIES_CONTRACT.rules.defaultDuration} frames
6. Interpolation must use: ${JSON.stringify(DEPENDENCIES_CONTRACT.rules.interpolationDefaults)}

Generate ONLY executable code. No markdown, no explanations.`;
  }
  
  /**
   * Build user prompt with context
   */
  static buildUserPrompt(request: string, context?: {
    imageDescriptions?: string[];
    previousSceneCode?: string;
  }): string {
    let prompt = `USER REQUEST: "${request}"`;
    
    if (context?.imageDescriptions?.length) {
      prompt += `\n\nIMAGE CONTEXT:\n${context.imageDescriptions.join('\n')}`;
    }
    
    if (context?.previousSceneCode) {
      prompt += `\n\nREFERENCE SCENE (match style/animations):\n${context.previousSceneCode}`;
    }
    
    return prompt;
  }
  
  /**
   * Build retry prompt after validation failure
   */
  static buildRetryPrompt(errors: string[]): string {
    return `Your code has validation errors:

${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Please fix these errors and return the corrected code. Remember to follow the contract rules exactly.`;
  }
}
```

### 2. Update Code Generator
**Location**: `src/tools/add/add_helpers/CodeGeneratorNEW.ts`

```typescript
import { PromptBuilder } from '~/lib/codegen/prompt-builder';
import { validateCode } from '~/lib/codegen/code-validator';

// In generateCodeDirect method:
async generateCodeDirect(input: {
  userPrompt: string;
  functionName: string;
  projectId: string;
}): Promise<CodeGenerationOutput> {
  const config = getModel('codeGenerator');
  
  try {
    // Use PromptBuilder instead of getParameterizedPrompt
    const systemPrompt = PromptBuilder.buildSystemPrompt(input.functionName);
    const userPrompt = PromptBuilder.buildUserPrompt(input.userPrompt);
    
    const messages = [
      { role: 'user' as const, content: userPrompt }
    ];
    
    // First attempt
    let response = await AIClientService.generateResponse(
      config,
      messages,
      { role: 'system', content: systemPrompt }
    );
    
    let code = this.extractCode(response?.content);
    
    // Validate
    const validation = validateCode(code, input.functionName);
    
    // Retry once if validation fails
    if (!validation.ok) {
      console.warn('Code validation failed, retrying...', validation.errors);
      
      messages.push({
        role: 'assistant' as const,
        content: code
      });
      messages.push({
        role: 'user' as const,
        content: PromptBuilder.buildRetryPrompt(
          validation.errors.map(e => e.message)
        )
      });
      
      response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: systemPrompt }
      );
      
      code = this.extractCode(response?.content);
      
      // Validate again
      const retryValidation = validateCode(code, input.functionName);
      if (!retryValidation.ok) {
        console.error('Code validation failed after retry:', retryValidation.errors);
        // Continue anyway, but log for monitoring
      }
    }
    
    return {
      code,
      metadata: {
        durationFrames: extractDurationFromCode(code),
        validated: validation.ok,
        dependencies: validation.metadata?.detectedDeps || []
      }
    };
  } catch (error) {
    // ... error handling
  }
}
```

### 3. Update Edit Tools
Apply same pattern to edit operations in `src/tools/edit/edit.ts`

### 4. Remove Old Prompt Files
Once integrated, deprecate:
- Hardcoded dependency lists in prompts
- Manual rule specifications

## Benefits
1. **Single source of truth** - Contract drives everything
2. **Machine-readable rules** - Less ambiguity for AI
3. **Easy updates** - Change contract, all prompts update
4. **Validation loop** - Retry with specific errors
5. **Telemetry ready** - Track which deps are used

## Testing
1. Generate scenes with each enabled dependency
2. Verify no hallucination of disabled deps
3. Test validation-retry loop
4. Compare quality before/after

## Success Criteria
- [ ] All prompts use PromptBuilder
- [ ] Contract injected into every generation
- [ ] Validation integrated with retry
- [ ] No hardcoded rules in prompts
- [ ] Improved generation success rate

## Notes
- Keep contract at top of prompt for visibility
- JSON format helps models parse rules
- Retry adds ~2-3 seconds but improves quality significantly