 Implementation Plan: 5-Layer Import Handling System

  Based on my analysis, here's how to implement the robust import
  handling system for Bazaar-Vid:

  Current State

  - No imports allowed - strict window.* pattern
  - Limited dependencies - only React, ReactDOM, Remotion exposed
  - No validation after generation
  - No machine-readable contract for dependencies

  Proposed 5-Layer Implementation

  Layer 1: Contract (JSON blob)

  Create a centralized dependency contract:

  // src/lib/codegen/dependencies-contract.ts
  export const DEPENDENCIES_CONTRACT = {
    sceneFunctionNameRule: "export default function {{NAME}}()",
    allowedImports: [], // Empty = no imports allowed
    windowDeps: {
      React: {
        description: "Core React library",
        available: ["useState", "useEffect", "useRef", "useMemo",
  "useCallback"]
      },
      Remotion: {
        description: "Remotion video framework",
        available: ["AbsoluteFill", "useCurrentFrame", "useVideoConfig",
   "interpolate", "spring", "Sequence"]
      },
      // Ready to add per Sprint 44:
      HeroiconsSolid: {
        description: "Solid variant icons",
        available: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon"]
      },
      HeroiconsOutline: {
        description: "Outline variant icons",
        available: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon"]
      }
    },
    cssRules: {
      quotedValues: true,
      allowedFonts: ["Inter", "Arial", "sans-serif"]
    },
    technicalConstraints: {
      singleTransform: true,
      interpolationClamp: true,
      defaultDuration: 150
    }
  };

  Layer 2: System Prompt Ruleset

  Update the prompts to use the contract:

  // src/config/prompts/active/code-generator-v2.ts
  export const generateSystemPrompt = (contract: typeof 
  DEPENDENCIES_CONTRACT) => {
    const rules = [
      `1. NO import or require statements (window.* only)`,
      `2. Destructure ONLY from: 
  ${Object.keys(contract.windowDeps).join(', ')}`,
      `3. Function signature: ${contract.sceneFunctionNameRule}`,
      `4. Return raw JSX, no markdown fences`,
      ...Object.entries(contract.cssRules).map(([key, value]) =>
        `- ${key}: ${value}`
      )
    ];

    return `You are a React/Remotion developer.

  STRICT RULES (NO EXCEPTIONS):
  ${rules.join('\n')}

  AVAILABLE DEPENDENCIES:
  ${JSON.stringify(contract.windowDeps, null, 2)}

  Generate ONLY executable code.`;
  };

  Layer 3: Few-Shot Examples

  Create a dynamic example selector:

  // src/lib/codegen/few-shot-examples.ts
  export const FEW_SHOT_EXAMPLES = {
    basic: {
      description: "Simple text animation",
      code: `const { AbsoluteFill, useCurrentFrame, interpolate } = 
  window.Remotion;

  export default function BasicText() {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 30], [0, 1]);
    
    return (
      <AbsoluteFill style={{ backgroundColor: "white" }}>
        <h1 style={{ opacity, fontSize: "4rem" }}>Hello</h1>
      </AbsoluteFill>
    );
  }`
    },

    withIcons: {
      description: "Using Heroicons",
      dependencies: ["HeroiconsSolid"],
      code: `const { AbsoluteFill, spring, useCurrentFrame } = 
  window.Remotion;
  const { StarIcon } = window.HeroiconsSolid;

  export default function IconScene() {
    const frame = useCurrentFrame();
    const scale = spring({ frame, fps: 30 });
    
    return (
      <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
        <StarIcon 
          style={{ 
            width: "100px",
            height: "100px", 
            color: "gold",
            transform: \`scale(\${scale})\`
          }} 
        />
      </AbsoluteFill>
    );
  }`
    }
  };

  export function selectExamples(prompt: string, contract: any): 
  string[] {
    // Smart selection based on prompt content
    const examples = [];

    if (prompt.toLowerCase().includes('icon')) {
      examples.push(FEW_SHOT_EXAMPLES.withIcons);
    } else {
      examples.push(FEW_SHOT_EXAMPLES.basic);
    }

    return examples.map(ex => ex.code);
  }

  Layer 4: Automatic Validator

  Create an AST-based validator:

  // src/lib/codegen/code-validator.ts
  import * as parser from '@babel/parser';
  import traverse from '@babel/traverse';

  export interface ValidationResult {
    ok: boolean;
    errors: string[];
    warnings: string[];
  }

  export function validateGeneratedCode(
    code: string, 
    contract: typeof DEPENDENCIES_CONTRACT
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse the code
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      // Check for forbidden patterns
      traverse(ast, {
        ImportDeclaration(path) {
          errors.push('Import statements are not allowed. Use window.* 
  pattern.');
        },

        CallExpression(path) {
          if (path.node.callee.type === 'Identifier' &&
              path.node.callee.name === 'require') {
            errors.push('require() is not allowed. Use window.* 
  pattern.');
          }
        },

        MemberExpression(path) {
          if (path.node.object.type === 'Identifier' &&
              path.node.object.name === 'window') {
            const property = path.node.property;
            if (property.type === 'Identifier' &&
                !contract.windowDeps[property.name]) {
              errors.push(`window.${property.name} is not available.`);
            }
          }
        }
      });

      // Check for export default function
      const hasExportDefault = code.includes('export default function');
      if (!hasExportDefault) {
        errors.push('Must have "export default function" declaration.');
      }

      // Check for markdown fences
      if (code.includes('```')) {
        errors.push('Code contains markdown fences. Return raw code 
  only.');
      }

    } catch (parseError) {
      errors.push(`Parse error: ${parseError.message}`);
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    };
  }

  Layer 5: Integration in Code Generator

  Update the code generator to use all layers:

  // src/tools/add/add_helpers/CodeGeneratorNEW.ts
  import { DEPENDENCIES_CONTRACT } from
  '~/lib/codegen/dependencies-contract';
  import { generateSystemPrompt } from
  '~/config/prompts/active/code-generator-v2';
  import { selectExamples } from '~/lib/codegen/few-shot-examples';
  import { validateGeneratedCode } from '~/lib/codegen/code-validator';

  export class CodeGeneratorService {
    async generateCodeDirect(input: {
      userPrompt: string;
      functionName: string;
      projectId: string;
    }): Promise<CodeGenerationOutput> {
      // Layer 1: Get contract
      const contract = { ...DEPENDENCIES_CONTRACT };
      contract.sceneFunctionNameRule =
        contract.sceneFunctionNameRule.replace('{{NAME}}',
  input.functionName);

      // Layer 2: Generate system prompt
      const systemPrompt = generateSystemPrompt(contract);

      // Layer 3: Select few-shot examples
      const examples = selectExamples(input.userPrompt, contract);

      // Build messages
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...examples.map(code => ({
          role: 'assistant' as const,
          content: code
        })),
        { role: 'user' as const, content: input.userPrompt }
      ];

      // Generate code
      let code = await this.callLLM(messages);

      // Layer 4: Validate
      let validation = validateGeneratedCode(code, contract);

      // Retry if validation fails
      if (!validation.ok) {
        messages.push({
          role: 'assistant' as const,
          content: validation.errors.join('\n')
        });

        code = await this.callLLM(messages);
        validation = validateGeneratedCode(code, contract);
      }

      if (!validation.ok) {
        throw new Error(`Code generation failed: 
  ${validation.errors.join(', ')}`);
      }

      return { code, success: true };
    }
  }

  Next Steps for Implementation

  1. Update GlobalDependencyProvider.tsx to include new libraries
  (Heroicons)
  2. Update global.d.ts with new type definitions
  3. Create the contract and validation system
  4. Update prompts to use the new system
  5. Add regression tests for existing scenes

  This system maintains the no-import pattern while providing robust
  validation and extensibility for adding new libraries as outlined in
  Sprint 44.