// src/server/workers/generateComponentCode.ts
import { openai } from "~/server/lib/openai";
import { TRPCError } from "@trpc/server";
import fs from "fs/promises";
import path from "path";

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
  // Find all export default statements
  const defaultExportRegex = /export\s+default\s+([A-Za-z0-9_]+)\s*;?/g;
  const matches = Array.from(code.matchAll(defaultExportRegex));
  
  // If we have multiple default exports
  if (matches.length > 1) {
    console.log(`[COMPONENT GEN] Found ${matches.length} default exports, keeping only the first one`);
    
    // Keep only the first export default statement
    const firstMatch = matches[0];
    const otherMatches = matches.slice(1);
    
    // Replace other export default statements with simple variable declarations
    let sanitizedCode = code;
    for (const match of otherMatches) {
      const fullMatch = match[0]; // The full "export default Component;" string
      const componentName = match[1]; // Just the component name
      sanitizedCode = sanitizedCode.replace(fullMatch, `// Removed duplicate export: ${fullMatch}`);
    }
    
    return sanitizedCode;
  }
  
  // If there's only one or zero export default, return the original code
  return code;
}

/**
 * Generates TSX code for a custom Remotion component based on the user's description
 * using OpenAI's function calling capabilities
 * 
 * @param description User's description of the desired visual effect
 * @returns Generated effect name and TSX code
 */
export async function generateComponentCode(description: string): Promise<{
  effect: string;
  tsxCode: string;
}> {
  try {
    console.log("[COMPONENT GENERATOR] Starting component generation for:", description);
    
    // Load Remotion prompt from file with error handling
    let remotionPrompt = "";
    try {
      const promptPath = path.join(process.cwd(), "src/server/prompts/remotion-prompt.txt");
      console.log("[COMPONENT GENERATOR] Loading prompt from:", promptPath);
      remotionPrompt = await fs.readFile(promptPath, "utf8");
      console.log("[COMPONENT GENERATOR] Successfully loaded prompt file");
    } catch (err) {
      console.error("[COMPONENT GENERATOR] Error loading prompt file:", err);
      // Fallback to a basic prompt if file can't be loaded
      remotionPrompt = "Create React components using Remotion. Use AbsoluteFill for positioning. Use useCurrentFrame and interpolate for animations.";
    }
    
    console.log("[COMPONENT GENERATOR] Calling OpenAI API with function calling...");
    
    // Call OpenAI with function calling enabled
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are an expert at creating Remotion components in React and TypeScript. 
Your job is to create custom visual effects for videos based on user descriptions.
Follow these guidelines for creating Remotion components:

${remotionPrompt}

Additional requirements:
1. Ensure the component works with Remotion and React dependencies injected globally
2. IMPORTANT: Include ONLY ONE default export in your code - multiple default exports will cause build failures
3. Provide proper TypeScript typing for all parameters and return values
4. Include detailed comments explaining any complex animations or calculations
5. Focus on creating visually appealing and performant animations
6. Name your main component clearly based on the effect it creates
7. If you create helper components, do not export them as default - only the main component should be exported as default`
        },
        {
          role: "user",
          content: `Create a custom visual effect for my video that does the following: ${description}`,
        },
      ],
      functions: [generateCustomComponentFunctionDef],
      function_call: { name: "generateCustomComponent" },
    });
    
    console.log("[COMPONENT GENERATOR] Received response from OpenAI");
    
    // Extract the function call data
    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      console.error("[COMPONENT GENERATOR] No function call in response:", JSON.stringify(response.choices));
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate component code - OpenAI did not return a function call",
      });
    }
    
    // Parse the function arguments
    console.log("[COMPONENT GENERATOR] Parsing function arguments...");
    const args = JSON.parse(functionCall.arguments);
    
    // Validate the response
    if (!args.effect || !args.tsxCode) {
      console.error("[COMPONENT GENERATOR] Missing required fields in response:", args);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Generated component is missing required fields",
      });
    }
    
    console.log(`[COMPONENT GENERATOR] Successfully generated component for "${args.effect}"`);
    
    // --- POST-PROCESSING: Ensure all required imports are present ---
    function ensureImports(code: string): string {
      const importMap = [
        { symbol: "React", source: "react" },
        { symbol: "AbsoluteFill", source: "remotion" },
        { symbol: "Sequence", source: "remotion" },
        { symbol: "useCurrentFrame", source: "remotion" },
        { symbol: "interpolate", source: "remotion" },
        { symbol: "random", source: "remotion" },
        { symbol: "useVideoConfig", source: "remotion" },
      ];
      let processed = code;
      for (const { symbol, source } of importMap) {
        const alreadyImported = new RegExp(`import.*\b${symbol}\b.*from ['"]${source}['"]`).test(processed);
        const used = new RegExp(`\b${symbol}\b`).test(processed);
        if (used && !alreadyImported) {
          // Add import at the top (group remotion imports together)
          if (source === "remotion") {
            // Try to merge with existing remotion import
            const remotionImport = processed.match(/import\s*\{([^}]*)\}\s*from ['"]remotion['"]/);
            if (remotionImport && remotionImport[1]) {
              // Add symbol if not already present
              if (!remotionImport[1].split(',').map(s => s.trim()).includes(symbol)) {
                processed = processed.replace(
                  remotionImport[0],
                  `import {${remotionImport[1].trim()}, ${symbol}} from "remotion"`
                );
              }
            } else {
              processed = `import { ${symbol} } from "remotion";\n` + processed;
            }
          } else {
            processed = `import ${symbol} from "${source}";\n` + processed;
          }
        }
      }
      return processed;
    }

    const fixedTsxCode = ensureImports(args.tsxCode);
    // --- END POST-PROCESSING ---

    // Sanitize the code to remove duplicate exports
    const sanitizedTsxCode = sanitizeDefaultExports(fixedTsxCode);

    // Ensure proper imports are included
    const ensuredTsxCode = ensureImports(sanitizedTsxCode);

    return {
      effect: args.effect,
      tsxCode: ensuredTsxCode,
    };

  } catch (error) {
    console.error("[COMPONENT GENERATOR] Error:", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate component code: " + (error instanceof Error ? error.message : String(error)),
    });
  }
}
