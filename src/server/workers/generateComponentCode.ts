// src/server/workers/generateComponentCode.ts
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";
import fs from "fs/promises";
import path from "path";
import { customComponentJobs, db } from "~/server/db";
import { eq } from "drizzle-orm";
import { updateComponentStatus } from "~/server/services/componentGenerator.service";
import { OpenAI } from "openai";
import { env } from "~/env";
import logger, { componentLogger } from "~/lib/logger";
import { COMPONENT_TEMPLATE, applyComponentTemplate } from "./componentTemplate";

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
  componentName: string = 'CustomComponent'
): { 
  valid: boolean; 
  error?: string; 
  processedCode?: string;
  wasFixed?: boolean;
  issues?: string[];
} {
  // First try to preprocess and fix common issues
  let processedCode = code;
  let wasFixed = false;
  let issues: string[] = [];
  
  try {
    // Import dynamically to avoid circular dependencies
    const { preprocessTsx } = require('~/server/utils/tsxPreprocessor');
    
    if (typeof preprocessTsx === 'function') {
      const preprocessResult = preprocessTsx(code, componentName);
      
      if (preprocessResult.fixed) {
        processedCode = preprocessResult.code;
        wasFixed = true;
        issues = preprocessResult.issues;
        
        // Log pre-processing results
        componentLogger.info('component-validation', `Preprocessor fixed ${issues.length} issues in component ${componentName}`, {
          issues,
          wasFixed
        });
      }
    }
  } catch (preprocessError) {
    // If preprocessor fails, continue with original code
    componentLogger.info('component-validation', `Preprocessor error: ${preprocessError instanceof Error ? preprocessError.message : String(preprocessError)}`, {
      preprocessorStatus: 'error'
    });
  }
  
  // Now validate the potentially fixed code
  try {
    // Use Function constructor to check if code parses
    // This won't execute the code, just check syntax
    new Function('"use strict";' + processedCode);
    
    // If we fixed issues, return the processed code
    if (wasFixed) {
      return { 
        valid: true, 
        processedCode,
        wasFixed,
        issues
      };
    }
    
    // Otherwise just return valid
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : String(error),
      processedCode: wasFixed ? processedCode : undefined,
      wasFixed,
      issues
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
 * Processes a component generation job from the database.
 * This is the function that is called from componentGenerator.service.ts
 * 
 * @param jobId ID of the component generation job
 */
export async function processComponentJob(jobId: string): Promise<void> {
  try {
    componentLogger.start(jobId, "Processing component job");
    
    // Get the job from database
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, jobId)
    });
    
    if (!job) {
      componentLogger.error(jobId, "Job not found");
      throw new Error(`Job ${jobId} not found`);
    }
    
    if (!job.metadata || typeof job.metadata !== 'object') {
      componentLogger.error(jobId, "Invalid job metadata");
      await updateComponentStatus(jobId, 'error', db, undefined, 'Invalid job metadata');
      return;
    }
    
    const prompt = (job.metadata as any).prompt;
    if (!prompt || typeof prompt !== 'string') {
      componentLogger.error(jobId, "No prompt in metadata");
      await updateComponentStatus(jobId, 'error', db, undefined, 'Missing prompt in job metadata');
      return;
    }
    
    // Declare tsxCode variable at a higher scope to be accessible in catch block
    let tsxCode = '';
    
    try {
      componentLogger.start(jobId, `Starting component generation for effect: "${prompt}"`);
      
      // Generate the component code
      const result = await generateComponentCode(jobId, prompt, {
        animationBrief: (job.metadata as any).animationBrief,
      });
      
      // Check if the component was fixed during validation
      const wasFixed = !!result.wasFixed;
      const issues = result.issues || [];
      tsxCode = result.processedCode || result.code;
      
      componentLogger.info(jobId, `Successfully generated TSX code (${tsxCode.length} characters)${wasFixed ? ' with automatic fixes' : ''}. Attempting to save...`, {
        wasFixed,
        issueCount: issues.length
      });
      
      // Prepare update data with potential fix information
      const updateData: any = {
        tsxCode: tsxCode,
        status: 'building',
        updatedAt: new Date()
      };
      
      // If the code was automatically fixed, store the original and the issues
      if (wasFixed) {
        updateData.originalTsxCode = result.originalCode;
        updateData.fixIssues = issues.join(', ');
        updateData.lastFixAttempt = new Date();
      }
      
      // CRITICALLY IMPORTANT: We must await this database update to avoid race conditions
      await db.update(customComponentJobs)
        .set(updateData)
        .where(eq(customComponentJobs.id, jobId));
      
      componentLogger.info(jobId, "DB update for TSX code and 'building' status complete. Triggering build directly.");
      
      // Import and call buildCustomComponent directly after DB update completes
      try {
        const buildModule = await import('~/server/workers/buildCustomComponent');
        await buildModule.buildCustomComponent(jobId);
        componentLogger.complete(jobId, "Successfully generated TSX code and triggered build");
      } catch (importError) {
        componentLogger.error(jobId, `Failed to import or call buildCustomComponent: ${importError instanceof Error ? importError.message : String(importError)}`);
      }
    } catch (error) {
      await handleComponentGenerationError(
        jobId, 
        error instanceof Error ? error : new Error(String(error)), 
        tsxCode // We can now access tsxCode from the higher scope
      );
      return;
    }
  } catch (genError) {
    componentLogger.error(jobId, `Failed to process job: ${genError instanceof Error ? genError.message : String(genError)}`);
    await updateComponentStatus(
      jobId, 
      'error', 
      db, 
      undefined, 
      genError instanceof Error ? genError.message : String(genError)
    );
  }
}

/**
 * Handles errors during component generation and determines if the component is fixable
 */
async function handleComponentGenerationError(
  jobId: string, 
  error: Error, 
  tsxCode: string | null
): Promise<void> {
  // If no code was generated, mark as failed
  if (!tsxCode) {
    await db.update(customComponentJobs)
      .set({ 
        status: "failed", 
        errorMessage: error.message,
        updatedAt: new Date() 
      })
      .where(eq(customComponentJobs.id, jobId));
    
    componentLogger.error(jobId, `Component generation failed: ${error.message}`);
    return;
  }
  
  // Try to get the component name for the preprocessor
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, jobId)
  });
  
  if (!component) {
    componentLogger.error(jobId, "Job not found during error handling");
    return;
  }
  
  // Check if the preprocessor can fix the error
  try {
    // Load the preprocessor dynamically to avoid circular dependencies
    const { preprocessTsx } = await import("~/server/utils/tsxPreprocessor");
    const { fixed, issues } = preprocessTsx(tsxCode, component.effect);
    
    // Store the component with appropriate status
    await db.update(customComponentJobs)
      .set({ 
        status: fixed ? "fixable" : "failed", 
        errorMessage: error.message,
        originalTsxCode: tsxCode,
        fixIssues: issues.join(", "),
        updatedAt: new Date() 
      })
      .where(eq(customComponentJobs.id, jobId));
    
    componentLogger.info(jobId, `Component marked as ${fixed ? "fixable" : "failed"}: ${error.message}`, {
      fixed,
      issues
    });
  } catch (preprocessError) {
    // If preprocessor fails, mark as failed
    await db.update(customComponentJobs)
      .set({ 
        status: "failed", 
        errorMessage: error.message,
        updatedAt: new Date() 
      })
      .where(eq(customComponentJobs.id, jobId));
    
    componentLogger.error(jobId, `Component marked as failed (preprocessor error): ${error.message}`);
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
}> {
  const startTime = Date.now();
  componentLogger.start(jobId, `Generating component for: "${description.substring(0, 50)}..."`);

  let componentName: string = 'CustomComponent';
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
    
    // Validate the generated component
    const validation = validateComponentSyntax(componentCode, sanitizedComponentName);
    if (!validation.valid) {
      componentLogger.error(jobId, `Generated component has syntax errors: ${validation.error}`);
      throw new Error(`Generated component has syntax errors: ${validation.error}`);
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
