// src/server/services/animationDesigner.service.ts
import OpenAI from 'openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema'; 
import {
  animationDesignBriefSchema,
  type AnimationDesignBrief,
} from '~/lib/schemas/animationDesignBrief.schema'; 
import { env } from '~/env'; 
import { db } from '~/server/db';
import { animationDesignBriefs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import logger, { animationDesignerLogger } from '~/lib/logger';

// Define the OpenAI function schema directly rather than converting from Zod
// This ensures we have a proper schema that OpenAI can understand
const toolParametersJsonSchema = {
  type: "object",
  properties: {
    sceneId: {
      type: "string",
      description: "Unique identifier for the scene"
    },
    scenePurpose: {
      type: "string",
      description: "The purpose or description of the scene"
    },
    overallStyle: {
      type: "string",
      description: "The desired visual style for the animation"
    },
    durationInFrames: {
      type: "number",
      description: "Duration of the animation in frames"
    },
    dimensions: {
      type: "object",
      properties: {
        width: { type: "number" },
        height: { type: "number" }
      },
      required: ["width", "height"]
    },
    colorPalette: {
      type: "object",
      properties: {
        background: { type: "string" },
        primary: { type: "string" },
        secondary: { type: "string" },
        accent: { type: "string" },
        textPrimary: { type: "string" },
        textSecondary: { type: "string" },
        customColors: {
          type: "object",
          additionalProperties: { type: "string" }
        }
      },
      required: ["background"]
    },
    elements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          elementId: { type: "string" },
          elementType: { type: "string", enum: ["text", "image", "video", "shape", "audio", "customComponent"] },
          name: { type: "string" },
          content: { type: "string" },
          initialLayout: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              opacity: { type: "number" },
              rotation: { type: "number" },
              scale: { type: "number" },
              backgroundColor: { type: "string" }
            }
          },
          animations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                startFrame: { type: "number" },
                endFrame: { type: "number" },
                easing: { type: "string" }
              }
            }
          }
        },
        required: ["elementId", "elementType"]
      }
    },
    typography: {
      type: "object",
      properties: {
        defaultFontFamily: { type: "string" },
        heading1: { 
          type: "object",
          properties: {
            fontFamily: { type: "string" },
            fontSize: { type: "number" }
          }
        }
      }
    },
    audioTracks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          source: { type: "string" },
          startFrame: { type: "number" },
          endFrame: { type: "number" }
        }
      }
    },
    briefVersion: {
      type: "string",
      description: "Version of the brief schema"
    }
  },
  required: ["sceneId", "scenePurpose", "overallStyle", "durationInFrames", "dimensions", "colorPalette", "elements"]
};

// We know this schema is defined since we created it above 
// No need for a conditional check here

// Helper for validating UUIDs
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper for ensuring valid UUIDs
function ensureValidUuid(sceneId: string): string {
  if (isValidUuid(sceneId)) {
    return sceneId;
  }
  
  // Generate a deterministic UUID based on the original scene ID
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Namespace UUID (randomly chosen)
  const buffer = Buffer.from(namespace.replace(/-/g, '') + sceneId);
  
  // Create a simple hash of the input
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = ((hash << 5) - hash) + buffer[i]!; // Non-null assertion to fix TypeScript warning
    hash |= 0; // Convert to 32bit integer
  }
  
  // Generate a UUID-format string from the hash
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  
  // Format properly as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where y is 8,9,a,b for variant 1 UUID
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-${
    (parseInt(hex.slice(15, 16), 16) & 0x3 | 0x8).toString(16)}${hex.slice(16, 19)
  }-${hex.slice(19, 31)}`;
}

// Save the Animation Design Brief to the database
export async function saveAnimationDesignBrief(
  projectId: string,
  sceneId: string,
  brief: AnimationDesignBrief,
  llmModel: string,
  componentJobId?: string
): Promise<string> {
  try {
    // Create a DB record for the design brief
    const result = await db.insert(animationDesignBriefs).values({
      projectId,
      sceneId: ensureValidUuid(sceneId), // Ensure valid UUID format
      designBrief: brief as any, // Cast to any for DB storage
      status: 'complete',
      llmModel,
      componentJobId: componentJobId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: animationDesignBriefs.id });
    
    if (result && result.length > 0 && result[0]) {
      return result[0].id;
    }
    throw new Error('Failed to insert Animation Design Brief, no ID returned');
  } catch (error) {
    animationDesignerLogger.error(sceneId, `Error saving Animation Design Brief to DB: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to save Animation Design Brief: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create an empty design brief with minimal default values
const createEmptyDesignBrief = (sceneId: string, dimensions: { width: number, height: number }): AnimationDesignBrief => ({
  briefVersion: '1.0.0',
  sceneId,
  scenePurpose: "Basic animation for scene",
  overallStyle: "Simple, clean design",
  durationInFrames: 60, // 2 seconds at 30fps
  dimensions,
  colorPalette: {
    background: "#ffffff",
    primary: "#4285F4",
    secondary: "#34A853",
    accent: "#FBBC05",
    textPrimary: "#000000"
  },
  elements: [
    {
      elementId: randomUUID(), // Generate a valid UUID for the element
      elementType: "text",
      name: "Default text",
      content: "Scene content placeholder",
      initialLayout: {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
        width: dimensions.width * 0.8,
        height: 80,
        opacity: 1,
        rotation: 0,
        scale: 1,
        backgroundColor: "#ffffff"
      },
      animations: []
    }
  ],
  audioTracks: [],
  typography: {
    defaultFontFamily: "Inter"
  }
});

// Helper function to recursively fix UUIDs in an object
function fixUuidsInObject(obj: any, sceneId?: string): any {
  if (!obj) return obj;
  
  const result: any = Array.isArray(obj) ? [] : {};
  
  // Process each property in the object
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const value = obj[key];
    
    if (key.toLowerCase().endsWith('id') && typeof value === 'string' && !isValidUuid(value)) {
      // Convert to a valid UUID if it's not already one
      result[key] = ensureValidUuid(value);
      if (sceneId) {
        animationDesignerLogger.data(sceneId, `Converted ${key}: ${value} to UUID: ${result[key]}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      result[key] = fixUuidsInObject(value, sceneId);
    } else {
      // Copy the value as is
      result[key] = value;
    }
  }
  
  return result;
}

// Helper function to create a useful fallback brief based on partial data
function createFallbackBrief(
  sceneId: string, 
  dimensions: { width: number, height: number },
  partialBrief?: Record<string, any>
): AnimationDesignBrief {
  const emptyBrief = createEmptyDesignBrief(sceneId, dimensions);
  
  // If no partial data, just return the empty brief
  if (!partialBrief) return emptyBrief;
  
  // Extract whatever useful info we can from the partial brief
  return {
    ...emptyBrief,
    // Use overrides from partial brief where available
    scenePurpose: partialBrief.scenePurpose || emptyBrief.scenePurpose,
    overallStyle: partialBrief.overallStyle || emptyBrief.overallStyle,
    durationInFrames: partialBrief.durationInFrames || emptyBrief.durationInFrames,
    colorPalette: partialBrief.colorPalette || emptyBrief.colorPalette,
    // We know elements array is required, so keep at least one element
    elements: Array.isArray(partialBrief.elements) && partialBrief.elements.length > 0
      ? partialBrief.elements.map((el: any) => ({
          ...el,
          elementId: el.elementId && isValidUuid(el.elementId) 
            ? el.elementId 
            : randomUUID(),
          // Ensure we have animations array (even if empty)
          animations: Array.isArray(el.animations) ? el.animations : []
        }))
      : emptyBrief.elements,
  };
}

// Main function to generate an Animation Design Brief
export async function generateAnimationDesignBrief(
  params: AnimationBriefGenerationParams
): Promise<{ brief: AnimationDesignBrief; briefId: string }> {
  const startTime = Date.now();
  const { 
    projectId, 
    sceneId, 
    scenePurpose, 
    sceneElementsDescription, 
    desiredDurationInFrames,
    dimensions, 
    componentJobId 
  } = params;
  
  animationDesignerLogger.start(sceneId, "Starting Animation Design Brief generation", {
    projectId,
    durationInFrames: desiredDurationInFrames,
    dimensions
  });

  try {
    // Basic validation of inputs
    if (!projectId || !sceneId || !scenePurpose) {
      animationDesignerLogger.error(sceneId, "Missing required parameters for Animation Design Brief", {
        missingParams: {
          projectId: !projectId,
          sceneId: !sceneId,
          scenePurpose: !scenePurpose
        }
      });
      throw new Error("Missing required parameters for Animation Design Brief");
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Create a clean, descriptive prompt for the LLM
    const messagesForLLM = [
      {
        role: 'system' as const,
        content: `You are an expert animation and video designer specializing in creating detailed design briefs for animated scenes.

Your task is to create a comprehensive Animation Design Brief for a single scene in a video. The brief should include:
- A color palette that enhances the scene's purpose
- Detailed element specifications (text, images, shapes)
- Animation details with proper timing in frames
- Appropriate layout and positioning

Follow these technical requirements:
1. Every element must have a unique elementId
2. Elements should have sensible positioning via initialLayout
3. Animation timings must fit within the total durationInFrames
4. Each animation needs startFrame and endFrame values
5. Include at least one entrance and one exit animation for important elements
6. For text elements, provide actual content that fits the purpose
7. Use proper color values (hex format preferred)
8. Ensure all required properties are present in your JSON output

Ensure your output is valid JSON and matches the required schema.`
      },
      {
        role: 'user' as const, 
        content: `Create an Animation Design Brief for a scene with the following details:

Scene Purpose: ${scenePurpose}
Scene Description: ${sceneElementsDescription || 'Create a visually engaging scene'}
Duration: ${desiredDurationInFrames} frames
Dimensions: Width: ${dimensions.width}px, Height: ${dimensions.height}px

Please design a complete Animation Design Brief with appropriate elements and animations.`
      }
    ];

    animationDesignerLogger.data(sceneId, "Sending request to OpenAI", { 
      promptLength: messagesForLLM[1]?.content?.length || 0,
      duration: desiredDurationInFrames
    });

    // Call OpenAI with function calling
    const llmStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "o4-mini", // OpenAI model
      messages: messagesForLLM,
      tools: [{
        type: "function",
        function: {
          name: "generate_animation_design_brief",
          description: "Generate a detailed animation design brief for a scene",
          parameters: toolParametersJsonSchema
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_animation_design_brief" } }
    });
    
    const llmDuration = Date.now() - llmStartTime;
    animationDesignerLogger.data(sceneId, `LLM response received in ${llmDuration}ms`, { duration: llmDuration });

    // Extract the tool call from the OpenAI response
    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_animation_design_brief") {
      animationDesignerLogger.error(sceneId, "Invalid response from OpenAI", { 
        responseChoices: response.choices.length,
        toolCallPresent: !!toolCall,
        toolName: toolCall?.function.name || "undefined"
      });
      // Attempt to recover with a fallback brief
      const fallbackBrief = createFallbackBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, "fallback", componentJobId);
      
      animationDesignerLogger.error(sceneId, "Using fallback brief due to invalid OpenAI response", { 
        briefId: fallbackBriefId 
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }
    
    // Parse the generated brief
    let generatedBrief: Record<string, any>;
    try {
      generatedBrief = JSON.parse(toolCall.function.arguments);
      animationDesignerLogger.data(sceneId, "Successfully parsed Animation Design Brief from LLM response", {
        briefSize: toolCall.function.arguments.length,
        elementsCount: generatedBrief.elements?.length || 0
      });
    } catch (parseError) {
      animationDesignerLogger.error(sceneId, "Error parsing JSON from LLM response", { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        argumentsLength: toolCall.function.arguments.length
      });
      
      // Attempt to recover with a fallback brief
      const fallbackBrief = createFallbackBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, "fallback", componentJobId);
      
      animationDesignerLogger.error(sceneId, "Using fallback brief due to JSON parse error", { 
        briefId: fallbackBriefId 
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }

    // Ensure the brief has the required structure
    try {
      // Add missing required fields
      if (!generatedBrief.briefVersion) {
        generatedBrief.briefVersion = '1.0.0';
      }

      // Validate and clean before returning
      animationDesignerLogger.validation(sceneId, "Validating Animation Design Brief schema");
      
      // Fix UUIDs in the brief
      const cleanedBrief = fixUuidsInObject(generatedBrief, sceneId);

      // Attempt to parse with the Zod schema
      const validationResult = animationDesignBriefSchema.safeParse(cleanedBrief);
      
      if (!validationResult.success) {
        // Detailed validation error logging
        const formattedErrors = validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        // Safe access to filter with null checks
        const elementIssues = formattedErrors ? formattedErrors.filter(e => e.path.includes('elements')) : [];
        const animationIssues = formattedErrors ? formattedErrors.filter(e => e.path.includes('animations')) : [];
        const otherIssues = formattedErrors ? formattedErrors.filter(e => !e.path.includes('elements') && !e.path.includes('animations')) : [];
        
        animationDesignerLogger.error(sceneId, "Animation Design Brief validation failed", {
          errorCount: formattedErrors.length,
          elementIssues: elementIssues.length > 0 ? elementIssues : undefined,
          animationIssues: animationIssues.length > 0 ? animationIssues : undefined,
          otherIssues: otherIssues.length > 0 ? otherIssues : undefined,
          providedBrief: cleanedBrief ? JSON.stringify(cleanedBrief).substring(0, 500) + '...' : 'undefined brief'
        });
        
        // Create a fallback with the partial brief to recover as much as possible
        const fallbackBrief = createFallbackBrief(sceneId, dimensions, cleanedBrief);
        const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, "fallback+partial", componentJobId);
        
        animationDesignerLogger.error(sceneId, "Using fallback brief with partial data from LLM due to validation errors", {
          briefId: fallbackBriefId
        });
        
        return { 
          brief: fallbackBrief, 
          briefId: fallbackBriefId 
        };
      }
      
      // Successfully validated the brief
      const validBrief = validationResult.data;
      
      // Save to database
      const briefId = await saveAnimationDesignBrief(
        projectId,
        sceneId,
        validBrief,
        "o4-mini", // Record which model generated the brief
        componentJobId
      );
      
      const totalDuration = Date.now() - startTime;
      animationDesignerLogger.complete(sceneId, `Animation Design Brief generated successfully in ${totalDuration}ms`, {
        duration: totalDuration,
        briefId,
        elementsCount: validBrief.elements?.length
      });
      
      return {
        brief: validBrief,
        briefId
      };
    } catch (validationError) {
      animationDesignerLogger.error(sceneId, "Error during Animation Design Brief validation/processing", {
        error: validationError instanceof Error ? validationError.message : String(validationError)
      });
      
      // Create a complete fallback brief
      const fallbackBrief = createFallbackBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, "error-fallback", componentJobId);
      
      animationDesignerLogger.error(sceneId, "Using complete fallback brief due to processing error", {
        briefId: fallbackBriefId
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }
  } catch (error) {
    // Handle any unexpected errors
    animationDesignerLogger.error(sceneId, "Unexpected error in Animation Design Brief generation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Create a minimal fallback brief
    const fallbackBrief = createEmptyDesignBrief(sceneId, dimensions);
    const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, "error-minimal", componentJobId);
    
    return { 
      brief: fallbackBrief, 
      briefId: fallbackBriefId 
    };
  }
}

export interface AnimationBriefGenerationParams {
  projectId: string; 
  sceneId: string;
  scenePurpose: string; 
  sceneElementsDescription: string; 
  desiredDurationInFrames: number;
  dimensions: { 
      width: number;
      height: number;
  };
  currentVideoContext?: string; 
  targetAudience?: string; 
  brandGuidelines?: string; 
  componentJobId?: string; 
}

/*
// Example test function - uncomment if needed
// async function testGenerateBrief() {
//   try {
//     const exampleParams: AnimationBriefGenerationParams = {
//       sceneId: 'test-scene-id',
//       projectId: 'test-project-id',
//       scenePurpose: 'Test animation',
//       sceneElementsDescription: 'A simple test scene',
//       desiredDurationInFrames: 60,
//       dimensions: { width: 1920, height: 1080 },
//     };
//     const brief = await generateAnimationDesignBrief(exampleParams);
//     console.log('Generated brief:', brief);
//   } catch (error) {
//     console.error('Test error:', error);
//   }
// }
*/