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
      // Call the implementation that takes a description
      const result = await generateComponentCode(jobId, prompt);
      
      // Save the result to the database
      await db.update(customComponentJobs)
        .set({
          tsxCode: result.code,
          status: 'building', // Mark as building so buildCustomComponent can pick it up
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, jobId));
        
      componentLogger.complete(jobId, "Successfully generated TSX code");
    } catch (error) {
      componentLogger.error(jobId, "Error generating code", { 
        error: error instanceof Error ? error.message : String(error)
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
      error: error instanceof Error ? error.message : String(error)
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
        error: dbError instanceof Error ? dbError.message : String(dbError)
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
        .filter((word) => word.length > 3)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .slice(0, 3);
      if (words.length > 0) {
        componentName = words.join('') + 'Scene';
      }
    }
  }

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

For animation:
- Make extensive use of Remotion's animation utilities like interpolate and useCurrentFrame().
- Separate entrance, main, and exit animations with clear timing windows.
- Use spring() or other easing functions for natural movement.
- Consider implementing progressive reveals of text or graphic elements.

IMPORTANT: Always return production-ready, styled TSX code that requires minimal editing.`
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

    // Extract the first tool call (should be the only one)
    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_remotion_component") {
      componentLogger.error(jobId, "Invalid response from OpenAI: No valid tool call", { type: "INVALID_RESPONSE" });
      throw new Error("No valid tool call returned from OpenAI");
    }
    
    // Parse the function arguments as JSON
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
      componentLogger.parse(jobId, "Successfully parsed LLM response");
    } catch (e) {
      componentLogger.error(jobId, `Failed to parse tool call arguments: ${e instanceof Error ? e.message : String(e)}`, { 
        type: "PARSE" 
      });
      throw new Error(`Failed to parse component code: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Extract component details
    const generatedComponentName = args.componentName || componentName;
    const componentCode = args.componentCode;
    const dependencies = args.dependencies || {};
    
    // Check if we have required data
    if (!componentCode) {
      componentLogger.error(jobId, "No component code returned from LLM", { type: "MISSING_CODE" });
      throw new Error("No component code returned from OpenAI");
    }
    
    // Log code length as a simple metric
    componentLogger.parse(jobId, `Generated ${componentCode.length} bytes of component code for "${generatedComponentName}"`, {
      codeLength: componentCode.length,
      componentName: generatedComponentName
    });
    
    // Process the code to fix common issues
    const processedCode = processGeneratedCode(componentCode, generatedComponentName);
    
    const totalDuration = Date.now() - startTime;
    componentLogger.complete(jobId, `Component generation complete in ${totalDuration}ms`, {
      duration: totalDuration,
      componentName: generatedComponentName
    });
    
    return {
      code: processedCode,
      dependencies
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
