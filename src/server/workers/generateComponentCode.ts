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
    
    try {
      componentLogger.start(jobId, `Starting component generation for effect: "${prompt}"`);
      
      const result = await generateComponentCode(jobId, prompt, {
        animationBrief: (job.metadata as any).animationBrief,
      });
      
      componentLogger.info(jobId, `Successfully generated TSX code (${result.code.length} characters). Attempting to save...`);
      
      // CRITICALLY IMPORTANT: We must await this database update to avoid race conditions
      await db.update(customComponentJobs)
        .set({
          tsxCode: result.code,
          status: 'building',
          updatedAt: new Date()
        })
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
      componentLogger.error(jobId, "Error generating code", { 
        error: error instanceof Error ? error.message : String(error),
        type: "GENERATION_ERROR"
      });
      await updateComponentStatus(
        jobId, 
        'error', 
        db, 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  } catch (error) {
    componentLogger.error(jobId, "Error processing job", {
      error: error instanceof Error ? error.message : String(error),
      type: "PROCESSING_ERROR"
    });
    // Try to update status if possible
    try {
      await updateComponentStatus(
        jobId, 
        'error', 
        db, 
        undefined, 
        `Failed to process job: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (dbError) {
      componentLogger.error(jobId, "Could not update job status", { 
        error: dbError instanceof Error ? dbError.message : String(dbError),
        type: "STATUS_UPDATE_ERROR"
      });
    }
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
      // temperature: 0.7, - Removed: o4-mini doesn't support custom temperature values
      messages: [
        {
          role: "system",
          content: `You are an expert React and Remotion developer. You build beautiful video components using Remotion and React.
          
When creating React components with Remotion, please follow these guidelines:
1. Each component must be a properly structured React component accepting props and returning valid JSX.
2. Always use TypeScript for type safety, defining interfaces for props.
3. For each component, define timing functions for entrance and exit animations.
4. Smooth transitions between scenes are important - use interpolate, useCurrentFrame and other Remotion utilities.
5. For better maintainability, use well-named and reusable sub-components.
6. Maintain a professional and modern visual style.
7. Import only what's needed - avoid excessive dependencies.
8. Use the full 'remotion' import path, don't assume specific exports are available unless imported directly.
9. When generating TypeScript code, imports should include all necessary components and be properly structured.
10. For visual styling, use CSS-in-JS (styled-components) or inline styles. This enables easier animation of properties.

IMPORTANT RESTRICTION:
- DO NOT use or reference any external images, videos, or other media files.
- DO NOT use the <Img> component from Remotion to load images.
- DO NOT include any code that attempts to load assets using URLs or file paths.
- INSTEAD, create visual elements using CSS, SVG, or other programmatically generated graphics.
- Focus on animations, shapes, text, and colors rather than loading external assets.
- If the prompt mentions images, videos, or other assets, implement them as colored shapes, gradients, or SVG graphics.

For animation:
- Make extensive use of Remotion's animation utilities like interpolate and useCurrentFrame().
- Separate entrance, main, and exit animations with clear timing windows.
- Use spring() or other easing functions for natural movement.
- Consider implementing progressive reveals of text or graphic elements.
- Create simple shapes (circles, rectangles) using divs with appropriate styling.
- Use SVG elements for more complex shapes and illustrations.

IMPORTANT: Always return production-ready, styled TSX code that requires minimal editing. Use simple shapes, backgrounds, and text animations instead of external assets.`
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
                  description: "Name of the React component to generate"
                },
                componentCode: {
                  type: "string",
                  description: "Complete TypeScript/TSX code for the component, including imports and export"
                },
                componentDescription: {
                  type: "string",
                  description: "Brief description of what the component does"
                },
                dependencies: {
                  type: "object",
                  description: "Dependencies required for the component beyond React and Remotion",
                  additionalProperties: {
                    type: "string",
                    description: "Version of the dependency (can be 'latest')"
                  }
                }
              },
              required: ["componentName", "componentCode", "componentDescription"]
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
    
    // Sanitize the component name and code
    const sanitizedComponentName = sanitizeComponentName(args.componentName || 'CustomComponent');
    
    // Sanitize the component code in multiple steps:
    // 1. Remove Node.js built-in imports
    let sanitizedCode = removeNodeBuiltInImports(args.componentCode);
    // 2. Ensure there's only one default export
    sanitizedCode = sanitizeDefaultExports(sanitizedCode);
    
    componentLogger.plan(jobId, `Generated component "${sanitizedComponentName}" (${sanitizedCode.length} chars)`, {
      generatedAt: new Date().toISOString(),
      dependencies: args.dependencies || {},
    });

    // Extract component details
    const generatedComponentName = sanitizedComponentName;
    
    // Log code length as a simple metric
    componentLogger.parse(jobId, `Generated ${sanitizedCode.length} bytes of component code for "${generatedComponentName}"`, {
      codeLength: sanitizedCode.length,
      componentName: generatedComponentName
    });
    
    // Process the code to fix common issues
    const processedCode = processGeneratedCode(sanitizedCode, generatedComponentName);
    
    const totalDuration = Date.now() - startTime;
    componentLogger.complete(jobId, `Component generation complete in ${totalDuration}ms`, {
      duration: totalDuration,
      componentName: generatedComponentName
    });
    
    return {
      code: processedCode,
      dependencies: args.dependencies || {},
    };
  } catch (error) {
    componentLogger.error(jobId, `Component generation failed: ${error instanceof Error ? error.message : String(error)}`, {
      type: "FATAL",
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Helper function to clean up and process generated code
function processGeneratedCode(code: string, componentName: string): string {
  try {
    // Ensure componentName is valid before processing
    componentName = sanitizeComponentName(componentName);
    
    // Fix common issues in the generated code
    
    // Some models include markdown code fences - remove them
    let processedCode = code.replace(/```tsx?/g, '').replace(/```/g, '').trim();
    
    // Ensure code has proper exports
    if (!processedCode.includes('export default') && !processedCode.includes('export const')) {
      // Add export if missing
      processedCode = processedCode.replace(
        new RegExp(`(function|const) ${componentName}`),
        `export $1 ${componentName}`
      );
    }
    
    // Fix missing "use client" directive
    if (!processedCode.includes('"use client"') && !processedCode.includes("'use client'")) {
      processedCode = `"use client";\n\n${processedCode}`;
    }
    
    // Remove any Img component imports
    processedCode = processedCode.replace(/import\s+{([^}]*)Img([^}]*)}\s+from\s+['"]remotion['"]/g, (match, before, after) => {
      return `import {${before}${after}} from 'remotion'`;
    });
    
    // Remove any staticFile import if it exists
    processedCode = processedCode.replace(/import\s+{([^}]*)staticFile([^}]*)}\s+from\s+['"]remotion['"]/g, (match, before, after) => {
      return `import {${before}${after}} from 'remotion'`;
    });
    
    // Clean up comma issues in imports that might be caused by removing items
    processedCode = processedCode.replace(/import\s+{([^}]*)}\s+from\s+['"]remotion['"]/g, (match, importItems) => {
      // Fix any potential double commas caused by removing items from import lists
      const cleanedImports = importItems.replace(/,\s*,/g, ',').replace(/,\s*}/g, '}').replace(/{,\s*/g, '{');
      return `import {${cleanedImports}} from 'remotion'`;
    });
    
    // Process all imports to ensure there are no empty import brackets
    processedCode = processedCode.replace(/import\s+{\s*}\s+from\s+['"][^'"]+['"]/g, '');
    
    // Remove any <Img> component usage with more robust regex that handles multiline
    processedCode = processedCode.replace(/<Img[\s\n]+[^>]*src=\{[^}]*\}[^>]*>/g, 
      `<div style={{ backgroundColor: '#3498db', width: '100px', height: '100px', borderRadius: '8px' }} />`);
    
    // Also catch single-quoted and double-quoted src attributes
    processedCode = processedCode.replace(/<Img[\s\n]+[^>]*src=['"][^'"]*['"][^>]*>/g,
      `<div style={{ backgroundColor: '#3498db', width: '100px', height: '100px', borderRadius: '8px' }} />`);
    
    // Replace any staticFile usage with a simple string
    processedCode = processedCode.replace(/staticFile\(['"]([^'"]*)['"]\)/g, "''");
    
    // Remove any references to image file extensions
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
    
    // Create a regex to match strings containing image extensions
    const imageExtRegex = new RegExp(`['"][^'"]*\\.(${imageExtensions.join('|')})[^'"]*['"]`, 'g');
    processedCode = processedCode.replace(imageExtRegex, "''");
    
    // Log what we've done
    logger.debug(`Processed component code for ${componentName}`, {
      component: true,
      codeLength: processedCode.length
    });
    
    return processedCode;
  } catch (error) {
    logger.error(`Error processing generated code`, { 
      type: "PROCESSING",
      error: error instanceof Error ? error.message : String(error),
      component: true
    });
    // Return original code if processing fails
    return code;
  }
}
