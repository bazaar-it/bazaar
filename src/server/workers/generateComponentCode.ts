// @ts-nocheck
// src/server/workers/generateComponentCode.ts
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";
import fs from "fs/promises";
import path from "path";
import { customComponentJobs, db } from "~/server/db";
import { eq } from "drizzle-orm";
import { updateComponentStatus } from "~/server/services/componentGenerator.service";
import { saveCheckpoint } from "~/server/services/componentJob.service";
import { OpenAI } from "openai";
import { env } from "~/env";
import logger, { componentLogger } from '~/lib/logger';
import { COMPONENT_TEMPLATE, applyComponentTemplate, validateComponentTemplate } from "./componentTemplate";
import { repairComponentSyntax } from './repairComponentSyntax';
import { preprocessTsx } from '../utils/tsxPreprocessor';
import type { ComponentJob } from '~/types/chat';

/**
 * Enhanced ComponentJob for internal use
 */
interface EnhancedComponentJob extends ComponentJob {
  id: string;
  name: string;
  prompt: string;
  variation?: string;
  timeframe?: string;
}

/**
 * Result of component job processing
 */
interface ComponentJobResult {
  id: string;
  name: string;
  prompt: string;
  tsxCode: string;
  duration: number;
  variation?: string;
}

/**
 * Type definition for the OpenAI function call that generates custom Remotion components
 */
export const generateCustomComponentFunctionDef = {
  name: "generateCustomComponent",
  description: "Generate a custom Remotion component based on the user's description",
  parameters: {
    type: "object",
    required: ["effect", "tsxCode"],
    properties: {
      effect: {
        type: "string",
        description: "A short description of the visual effect to be created",
      },
      tsxCode: {
        type: "string",
        description: "The full TSX code for the Remotion component. Must be valid TypeScript React code that can be compiled.",
      },
    },
  },
};

/**
 * List of Node.js built-in modules that should be removed from component code
 */
const NODE_BUILT_INS = [
  'fs', 'path', 'os', 'util', 'stream', 'buffer', 'zlib', 
  'http', 'https', 'child_process', 'cluster', 'dgram', 
  'dns', 'net', 'tls', 'repl', 'readline', 'crypto'
];

/**
 * Sanitizes a component name to ensure it's a valid JavaScript identifier
 * - Cannot start with a number
 * - Can only contain letters, numbers, $ and _
 */
function sanitizeComponentName(name: string): string {
  if (!name) return 'CustomComponent';
  
  // Remove any invalid characters
  let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, '');
  
  // If it starts with a number, prefix with "Scene"
  if (/^[0-9]/.test(sanitized)) {
    sanitized = `Scene${sanitized}`;
  }
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'CustomComponent';
  }
  
  return sanitized;
}

/**
 * Validates component syntax before storing
 * @param code The component code to validate
 * @param componentName The name of the component for preprocessing attempts
 * @returns An object with valid flag, optional error message, and preprocessed code if fixed
 */
function validateComponentSyntax(
  code: string,
  componentName = 'CustomComponent'
): { 
  valid: boolean; 
  error?: string; 
  processedCode?: string;
  wasFixed?: boolean;
  issues?: string[];
  originalCode?: string;
} {
  // Apply syntax repair first to fix common issues like duplicate variable declarations
  let repairedCode = code;
  let wasFixed = false;
  let issues: string[] = [];
  
  try {
    // Try to repair common syntax issues in the TSX
    const { code: fixedCode, fixes, fixedSyntaxErrors } = repairComponentSyntax(code);
    
    if (fixedSyntaxErrors) {
      repairedCode = fixedCode;
      wasFixed = true;
      issues = fixes;
      logger.info(`Repaired component syntax with fixes: ${fixes.join(', ')}`);
    }
    
    // Now try to preprocess the (potentially repaired) code
    const preprocessResult = preprocessTsx(repairedCode, componentName);
    
    // If preprocessor was able to fix more issues, track those too
    if (preprocessResult.fixed) {
      repairedCode = preprocessResult.code;
      wasFixed = true;
      issues = [...issues, ...preprocessResult.issues];
    }
    
    // Try to validate the syntax by checking if it parses
    try {
      // Use Function constructor to check if code parses
      // This won't execute the code, just check syntax
      new Function('"use strict";' + repairedCode);
      
      // If we get here, the code is valid syntax
      return {
        valid: true,
        processedCode: repairedCode,
        wasFixed,
        issues,
        originalCode: wasFixed ? code : undefined
      };
    } catch (parseError) {
      // If we still have syntax errors after all our fixes
      return { 
        valid: false, 
        error: `Generated component has syntax errors: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        wasFixed,
        issues,
        originalCode: wasFixed ? code : undefined
      };
    }
  } catch (error) {
    logger.error("Error validating component syntax", { error });
    return { 
      valid: false, 
      error: `Component validation error: ${error instanceof Error ? error.message : String(error)}`,
      wasFixed,
      issues,
      originalCode: wasFixed ? code : undefined
    };
  }
}

/**
 * Removes imports of Node.js built-in modules from component code
 * that would cause errors in the browser
 */
function removeNodeBuiltInImports(code: string): string {
  let sanitized = code;
  
  // Create a regex pattern for all Node built-ins
  const builtInsPattern = NODE_BUILT_INS.join('|');
  
  // Match different import styles
  const importPatterns = [
    // ES Module imports
    new RegExp(`import\\s+(?:\\*\\s+as\\s+\\w+|[\\w\\{\\}\\s,]+)\\s+from\\s+['"](?:${builtInsPattern})(?:/[^'"]*)?['"];?`, 'g'),
    // Require style
    new RegExp(`(?:const|let|var)\\s+(?:\\w+|\\{[^}]*\\})\\s*=\\s*require\\(['"](?:${builtInsPattern})(?:/[^'"]*)?['"]\\);?`, 'g'),
    // Dynamic imports
    new RegExp(`import\\(['"](?:${builtInsPattern})(?:/[^'"]*)?['"]\\)`, 'g')
  ];
  
  // Replace each pattern with a comment
  importPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      return `// Removed Node.js module: ${match.trim()}`;
    });
  });
  
  return sanitized;
}

/**
 * Ensures there's only one default export in the generated code
 * by removing any duplicate export default statements
 */
function sanitizeDefaultExports(code: string): string {
  // Find all export default statements with improved regex
  // This handles both "export default ComponentName;" and "export default function ComponentName()"
  const defaultExportRegex = /export\s+default\s+(function\s+)?([A-Za-z0-9_]+\s*(\(\))?\s*{|\s*[A-Za-z0-9_]+\s*;?)/g;
  const matches = Array.from(code.matchAll(defaultExportRegex));
  
  // If we have multiple default exports
  if (matches.length > 1) {
    logger.debug('Found multiple default exports, keeping only the first one', {
      component: true,
      exportCount: matches.length,
      exports: matches.map((match, i) => {
        const lineNumber = code.substring(0, match.index || 0).split('\n').length;
        return `[${i}] Line ~${lineNumber}: ${match[0]}`;
      })
    });
    
    // Keep only the first export default statement
    const firstMatch = matches[0];
    const otherMatches = matches.slice(1);
    
    // Replace other export default statements with comments
    let sanitizedCode = code;
    for (const match of otherMatches) {
      if (!match.index) continue; // TypeScript safety check
      
      const fullMatch = match[0]; // The full export default statement
      
      // Replace with comment and remove the export
      sanitizedCode = sanitizedCode.replace(
        fullMatch, 
        `// Removed duplicate export: ${fullMatch.replace(/\n/g, ' ')}`
      );
    }
    
    logger.debug('Successfully sanitized duplicate exports', { component: true });
    return sanitizedCode;
  }
  
  // If there's only one or zero export default, return the original code
  return code;
}

/**
 * Process a component generation job
 */
export async function processComponentJob(job: ComponentJob): Promise<{ 
  success: boolean; 
  component?: ComponentJobResult; 
  error?: string;
}> {
  const start = Date.now();
  const { id, name, prompt, variation, timeframe } = job;
  
  try {
    // Set status to "generating_code"
    await db.update(customComponentJobs)
      .set({ status: "generating_code", updatedAt: new Date() })
      .where(eq(customComponentJobs.id, id));

    await saveCheckpoint(id, { step: "generating_code" }, "generating_code");
    
    componentLogger.info(id, `Status updated to generating_code for job: ${id} [${name}]`);
    
    // Log job details without sensitive info
    componentLogger.info('process-start', `Processing component job: ${id} [${name}]`, {
      componentId: id,
      timeframe: timeframe
    });
    
    // Convert variation to object if it's a string
    const animationBrief = job.variation ? 
      (typeof job.variation === 'string' ? JSON.parse(job.variation) : job.variation) : 
      undefined;
      
    const result = await generateComponentCode(job.id, job.prompt, animationBrief);
    
    if (result.error) {
      componentLogger.error('process-failed', `Component generation failed: ${result.error}`, { 
        componentId: id,
        error: result.error
      });
      
      return { 
        success: false, 
        error: result.error 
      };
    }
    
    // The code property from generateComponentCode is our tsxCode
    const tsxCode = result.code;
    
    // Validate the TypeScript/JSX syntax
    const validationResult = validateComponentSyntax(tsxCode, name);
    
    if (!validationResult.valid) {
      componentLogger.error('validation-failed', `Component validation failed for ${id}: ${validationResult.error}`, {
        componentId: id,
        error: validationResult.error
      });
      
      // Critical fix: Update the database with failed status and save the code for potential fixes
      await handleComponentGenerationError(
        id,
        new Error(validationResult.error || 'Validation failed'),
        tsxCode // Save the code even though it has errors
      );
      
      return { 
        success: false, 
        error: validationResult.error 
      };
    }
    
    // Use the processed code if the validator fixed issues
    const finalTsxCode = validationResult.processedCode || tsxCode;
    
    // Calculate duration
    const duration = Date.now() - start;
    
    const success = {
      id,
      name,
      prompt,
      tsxCode: finalTsxCode,
      duration,
      variation
    };
    
    // Prepare update data with potential fix information
    const updateData: any = {
      tsxCode: finalTsxCode,
      status: 'building',
      updatedAt: new Date()
    };
    
    // If the code was automatically fixed, store the original and the issues
    if (validationResult.wasFixed) {
      updateData.originalTsxCode = validationResult.originalCode;
      updateData.fixIssues = validationResult.issues?.join(', ');
      updateData.lastFixAttempt = new Date();
      
      componentLogger.info('validation-fixed', `Component ${id} fixed with ${validationResult.issues?.length} issues`, {
        componentId: id,
        fixes: validationResult.issues
      });
    }
    
    componentLogger.info('process-complete', `Component generation completed for ${id} in ${duration}ms`, {
      componentId: id,
      duration
    });

    await saveCheckpoint(id, { step: 'code_generated' }, 'code_generated');

    return {
      success: true,
      component: success
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    componentLogger.error('process-error', `Unexpected error processing component ${id}: ${errorMessage}`, {
      componentId: id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    await saveCheckpoint(id, { step: 'error', error: errorMessage }, 'error');
    
    // Critical fix: Update the database status to 'failed' so it doesn't stay in 'queued'
    await handleComponentGenerationError(id, 
      error instanceof Error ? error : new Error(String(error)),
      null // We don't have code to save in this case
    );
    
    return { 
      success: false, 
      error: `Component generation failed: ${errorMessage}`
    };
  }
}

/**
 * Handles errors during component generation and determines if the component is fixable
 */
async function handleComponentGenerationError(
  jobId: string, 
  error: Error, 
  tsxCode: string | null // This is the code from the LLM, potentially after some initial processing
): Promise<void> {
  const errorTimestamp = Date.now();
  // Log 1: Clarity on input tsxCode
  if (tsxCode) {
    componentLogger.error(jobId, `Entering handleComponentGenerationError (ts: ${errorTimestamp}) with existing tsxCode (length: ${tsxCode.length}). Error: ${error.message}`);
  } else {
    componentLogger.error(jobId, `Entering handleComponentGenerationError (ts: ${errorTimestamp}) with NULL tsxCode. Error: ${error.message}`);
  }

  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, jobId)
  });
  
  if (!component) {
    componentLogger.error(jobId, `Job not found during error handling (ts: ${errorTimestamp})`);
    return;
  }
  
  let tsxToSave = tsxCode;
  const statusToSave = "failed";
  let errorMessageToSave = error.message;

  if (!tsxCode) {
    // Log 2: Fallback code generation details
    componentLogger.info(jobId, `Original tsxCode from LLM was null/empty, generating fallback. (ts: ${errorTimestamp})`);
    const componentName = component.effect || 'FallbackComponent';
    const escapedErrorMessage = JSON.stringify(error.message || "Unknown error during generation.");
    const generatedFallbackCode = `// FALLBACK COMPONENT - Generated because original TSX was null - Error: ${error.message.replace(/`/g, "\\`")}\nimport { AbsoluteFill, useCurrentFrame } from 'remotion';\nconst ${componentName} = () => {\n  const frame = useCurrentFrame();\n  const errorMessageToDisplay = ${escapedErrorMessage};\n  return (\n    <AbsoluteFill style={{ backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'sans-serif'}}>\n      <div style={{ textAlign: 'center', maxWidth: '80%' }}>\n        <h1 style={{ color: '#ff4040' }}>Component Generation Error</h1>\n        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>There was an error generating this component:</p>\n        <pre style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', maxWidth: '100%', overflowX: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap'}}>{errorMessageToDisplay}</pre>\n        <p style={{ marginTop: '2rem', opacity: 0.7 + (Math.sin(frame / 10) * 0.3) }}>Please try regenerating this component or use the Fix button.</p>\n      </div>\n    </AbsoluteFill>\n  );\n};\nexport default ${componentName};\nif (typeof window !== 'undefined') { window.__REMOTION_COMPONENT = ${componentName}; }\n`;
    tsxToSave = generatedFallbackCode;
    errorMessageToSave = `${error.message} (Fallback component created as original TSX was null/empty)`;
    componentLogger.info(jobId, `Generated new fallback TSX (length: ${tsxToSave.length}). (ts: ${errorTimestamp})`);
  } else {
    componentLogger.info(jobId, `Error occurred with existing tsxCode (length: ${tsxCode.length}). Will save this failing code. (ts: ${errorTimestamp})`);
    errorMessageToSave = error.message + " (Original LLM TSX saved, marked as failed due to processing error)";
  }

  // Log 3: Consolidated pre-DB update log
  componentLogger.info(jobId, `[DB_UPDATE_PREP] Job: ${jobId}, Status: ${statusToSave}, TSX Length: ${tsxToSave?.length || 0}, Error: "${errorMessageToSave}" (ts: ${errorTimestamp})`);

  try {
    await db.update(customComponentJobs)
      .set({ 
        status: statusToSave, 
        errorMessage: errorMessageToSave,
        tsxCode: tsxToSave,
        originalTsxCode: component.originalTsxCode, 
        updatedAt: new Date() 
      })
      .where(eq(customComponentJobs.id, jobId));
    componentLogger.info(jobId, `DB updated successfully. Status: ${statusToSave}. (ts: ${errorTimestamp})`);
  } catch (dbError) { // Log 4: DB update error logging (already present and good)
    const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    componentLogger.error(jobId, `Failed to update component job in DB during error handling (ts: ${errorTimestamp})`, { error: dbErrorMessage });
  }
}

/**
 * Generates TSX code for a custom Remotion component based on the user's description
 * using OpenAI's function calling capabilities
 * 
 * @param jobId ID of the component generation job
 * @param description User's description of the desired visual effect
 * @returns Generated effect name and TSX code
 */
export async function generateComponentCode(
  jobId: string,
  description: string,
  animationBrief?: object
): Promise<{
  code: string;
  dependencies: Record<string, string>;
  wasFixed?: boolean;
  issues?: string[];
  processedCode?: string;
  originalCode?: string;
  error?: string;
  valid?: boolean;
}> {
  const startTime = Date.now();
  componentLogger.start(jobId, `Generating component for: "${description.substring(0, 50)}..."`);

  let componentName = 'CustomComponent';
  if (description) {
    // Generate component name from description
    const nameRegex = /([A-Z][a-z]+)/g;
    const nameMatches = description.match(nameRegex) || [];
    if (nameMatches.length > 0) {
      componentName = nameMatches.slice(0, 3).join('') + 'Scene';
    } else {
      // Alternative approach for when the regex doesn't find good matches
      const words = description
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      
      componentName = words.join('') + 'Scene';
    }
  }
  
  // Sanitize the component name
  componentName = sanitizeComponentName(componentName);

  componentLogger.plan(jobId, `Using component name: ${componentName}`);

  try {
    // Initialize client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const enhancedDescription = animationBrief 
      ? `Design a React component for a video scene with Remotion (www.remotion.dev) and TypeScript with the following description: "${description}". ` +
        `Use this Animation Design Brief for precise guidance: ${JSON.stringify(animationBrief, null, 2)}`
      : `Design a React component for a video scene with Remotion (www.remotion.dev) and TypeScript with the following description: "${description}"`;

    componentLogger.prompt(jobId, "Sending prompt to LLM", { 
      promptLength: enhancedDescription.length,
      hasAnimationBrief: !!animationBrief
    });
    const llmStartTime = Date.now();

    // Call OpenAI with function calling enabled
    const response = await openai.chat.completions.create({
      model: "o4-mini", // Using the correct OpenAI model name
      messages: [
        {
          role: "system",
          content: `You are an expert React and Remotion developer. You build beautiful video components using Remotion and React.
          
When creating React components with Remotion, you will ONLY provide implementation details following a very strict template structure.

You will NOT write complete component files. Instead:
1. ONLY provide the COMPONENT_NAME, COMPONENT_IMPLEMENTATION, and COMPONENT_RENDER parts.
2. These parts will be inserted into our template that already has:
   - "use client" directive
   - All necessary imports from React and Remotion
   - Component structure with props
   - window.__REMOTION_COMPONENT assignment

COMPONENT STRUCTURE RULES:
1. COMPONENT_NAME: Provide a CamelCase name for the component (e.g., BlueCircleScene)
2. COMPONENT_IMPLEMENTATION: Provide ONLY the implementation logic inside the component function
   - Access animation design brief data with props.brief
   - Use frame, width, height, fps, and durationInFrames which are already defined
   - Define variables, calculations, and animations here
3. COMPONENT_RENDER: Provide ONLY the JSX content that goes inside the AbsoluteFill
   - The AbsoluteFill wrapper is already included in the template
   - Only provide what goes inside it

IMPORTANT RESTRICTIONS:
- DO NOT include imports - they're already in the template
- DO NOT include the "use client" directive - it's already in the template
- DO NOT include the window.__REMOTION_COMPONENT assignment - it's already in the template
- DO NOT use or reference any external images, videos, or other media files
- DO NOT use the <Img> component from Remotion
- DO NOT include any code that attempts to load assets using URLs or file paths
- DO NOT use staticFile from Remotion
- INSTEAD, create visual elements using CSS, SVG, or other programmatically generated graphics
- Focus on animations, shapes, text, and colors

For animation:
- Make extensive use of Remotion's animation utilities like interpolate and Easing
- Create simple shapes using divs with appropriate styling
- Use SVG elements for more complex shapes and illustrations
- Access the Animation Design Brief data through props.brief`
        },
        {
          role: "user",
          content: enhancedDescription
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_remotion_component",
            description: "Generate a Remotion React component based on the provided description",
            parameters: {
              type: "object",
              properties: {
                componentName: {
                  type: "string",
                  description: "Name of the React component to generate (CamelCase)"
                },
                componentImplementation: {
                  type: "string",
                  description: "The implementation logic that will go inside the component function (without the function declaration or return statement)"
                },
                componentRender: {
                  type: "string",
                  description: "The JSX to render inside the AbsoluteFill (without the AbsoluteFill wrapper)"
                },
                componentDescription: {
                  type: "string",
                  description: "Brief description of what the component does"
                }
              },
              required: ["componentName", "componentImplementation", "componentRender", "componentDescription"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "generate_remotion_component" } }
    });

    const llmDuration = Date.now() - llmStartTime;
    componentLogger.llm(jobId, `Received LLM response in ${llmDuration}ms`, {
      duration: llmDuration,
      model: "o4-mini"
    });

    // Extract tool call from the response
    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_remotion_component") {
      componentLogger.error(jobId, `LLM did not return expected tool call: ${JSON.stringify(response.choices[0]?.message)}`);
      throw new Error("Failed to generate component: LLM did not return a valid tool call");
    }
    
    // Parse the arguments from the function call
    let args: any;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      componentLogger.error(jobId, `Failed to parse tool call arguments: ${String(parseError)}`, { error: parseError });
      throw new Error(`Failed to parse component generation arguments: ${String(parseError)}`);
    }
    
    // Sanitize the component name
    const sanitizedComponentName = sanitizeComponentName(args.componentName || 'CustomComponent');
    
    componentLogger.plan(jobId, `Generated component "${sanitizedComponentName}" parts`);

    // Apply the component template
    const componentCode = applyComponentTemplate(
      sanitizedComponentName,
      args.componentImplementation || '',
      args.componentRender || '<div>Empty component</div>'
    );

    if (!validateComponentTemplate(componentCode)) {
      componentLogger.warn(jobId, 'Generated component failed template validation');
    }

    // Log the raw assembled component code BEFORE validation
    componentLogger.info(jobId, `Raw assembled component code for "${sanitizedComponentName}" (length: ${componentCode.length}):\n${componentCode.substring(0, 2000)}${componentCode.length > 2000 ? '... (truncated)' : ''}`);

    // Validate the generated component
    const validation = validateComponentSyntax(componentCode, sanitizedComponentName);
    if (!validation.valid) {
      componentLogger.error(jobId, `Generated component has syntax errors: ${validation.error}`);
      // Instead of throwing an error, return the invalid code with error details
      // This allows the code to be saved to the database and fixed later
      return {
        code: componentCode, // Return the original code even though it's invalid
        dependencies: {},
        wasFixed: false,
        issues: validation.issues || [],
        processedCode: validation.processedCode,
        originalCode: componentCode, // Save the original for reference
        error: validation.error, // Include the error so caller knows it failed
        valid: false // Indicate validation failed
      };
    }
    
    // Return any fixes made during validation
    const result = {
      code: validation.processedCode || componentCode,
      dependencies: {},
      wasFixed: validation.wasFixed,
      issues: validation.issues,
      processedCode: validation.processedCode,
      originalCode: validation.wasFixed ? componentCode : undefined
    };
    
    // Log code length as a simple metric
    componentLogger.parse(jobId, `Generated ${result.code.length} bytes of component code for "${sanitizedComponentName}"`, {
      codeLength: result.code.length,
      componentName: sanitizedComponentName,
      wasFixed: result.wasFixed
    });
    
    const totalDuration = Date.now() - startTime;
    componentLogger.complete(jobId, `Component generation complete in ${totalDuration}ms`, {
      duration: totalDuration,
      componentName: sanitizedComponentName
    });
    
    return result;
  } catch (error) {
    componentLogger.error(jobId, `Component generation failed: ${error instanceof Error ? error.message : String(error)}`, {
      type: "FATAL",
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
