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

// Generate JSON Schema for the AnimationDesignBrief once at module level
const toolParametersJsonSchema = zodToJsonSchema(animationDesignBriefSchema, "AnimationDesignBriefToolParams");

if (!toolParametersJsonSchema) {
  throw new Error('Could not generate JSON schema for AnimationDesignBriefParams. Check schema definition.');
}

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const ANIMATION_BRIEF_TOOL_NAME = 'create_animation_design_brief';

/**
 * Describes the input parameters for generating an Animation Design Brief.
 */
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

/**
 * Saves an Animation Design Brief to the database.
 * 
 * @param projectId The ID of the project this design brief belongs to
 * @param sceneId The ID of the scene this design brief is for
 * @param brief The validated Animation Design Brief to save
 * @param llmModel The LLM model used to generate the brief
 * @param componentJobId Optional ID of the component job this brief is associated with
 * @returns The ID of the newly created design brief record
 */
export async function saveAnimationDesignBrief(
  projectId: string,
  sceneId: string,
  brief: AnimationDesignBrief,
  llmModel: string,
  componentJobId?: string
): Promise<string> {
  try {
    console.log(`Saving Animation Design Brief for sceneId ${sceneId} to database...`);
    
    const result = await db.insert(animationDesignBriefs).values({
      projectId,
      sceneId,
      designBrief: brief,
      llmModel,
      status: 'complete',
      componentJobId,
    }).returning({ id: animationDesignBriefs.id });
    
    if (!result || result.length === 0 || !result[0] || !result[0].id) {
      throw new Error('Failed to insert Animation Design Brief, no ID returned');
    }
    
    console.log(`Animation Design Brief saved with ID: ${result[0].id}`);
    return result[0].id;
  } catch (error: any) {
    console.error(`Error saving Animation Design Brief to database:`, error.message);
    throw new Error(`Failed to save Animation Design Brief: ${error.message}`);
  }
}

// Complete initialLayout object with all required properties and their defaults
const createEmptyDesignBrief = (sceneId: string, dimensions: { width: number, height: number }): AnimationDesignBrief => ({
  briefVersion: '1.0.0',
  sceneId: sceneId,
  scenePurpose: 'Pending brief generation...',
  overallStyle: 'Pending...',
  durationInFrames: 0,
  dimensions: dimensions,
  colorPalette: {
    background: '#000000',
  },
  elements: [{
    elementId: '00000000-0000-0000-0000-000000000000',
    elementType: 'text',
    name: 'Placeholder',
    content: 'Loading...',
    initialLayout: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1,
      rotation: 0,
      scale: 1,
      backgroundColor: '#ffffff',
    },
    animations: [],
  }],
  audioTracks: [],
  typography: {
    defaultFontFamily: 'Arial'
  }
});

/**
 * Generates a detailed Animation Design Brief for a scene using an LLM.
 *
 * @param params Parameters for generating the animation brief.
 * @returns A promise that resolves to the validated AnimationDesignBrief.
 * @throws Throws an error if LLM interaction fails or validation is unsuccessful.
 */
export async function generateAnimationDesignBrief(
  params: AnimationBriefGenerationParams
): Promise<{ brief: AnimationDesignBrief; briefId: string }> {
  const {
    projectId,
    sceneId,
    scenePurpose,
    sceneElementsDescription,
    desiredDurationInFrames,
    dimensions,
    currentVideoContext,
    targetAudience,
    brandGuidelines,
    componentJobId,
  } = params;

  // Create a type-safe empty brief
  const emptyBrief = createEmptyDesignBrief(sceneId, dimensions);
  
  const systemPrompt = `You are an expert animation designer tasked with creating a detailed Animation Design Brief for a video scene.
    The brief must strictly adhere to the provided JSON schema. Your goal is to translate the user's requirements into a comprehensive, actionable design.

    Scene ID to use: ${sceneId}
    Target duration: ${desiredDurationInFrames} frames.
    Canvas dimensions: ${dimensions.width}x${dimensions.height} pixels.

    Key information to incorporate:
    - Scene Purpose: ${scenePurpose}
    - Elements to include: ${sceneElementsDescription}
    ${currentVideoContext ? `- Broader Video Context: ${currentVideoContext}` : ''}
    ${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
    ${brandGuidelines ? `- Brand Guidelines: ${brandGuidelines}` : ''}

    Ensure all required fields in the schema are populated, including generating unique IDs (UUIDs) for elements and animations where specified.
    Be creative with animation types, easing, and visual styling, but keep it appropriate for the scene's purpose.
    Provide specific values for layout (x, y, opacity, scale, rotation), colors, fonts, and animation properties (from, to values).
    The "sceneId", "durationInFrames", and "dimensions" in the output brief MUST EXACTLY MATCH the values provided above.
    All UUIDs generated must be valid UUIDs.
    All URLs must be valid placeholder URLs if actual assets are not provided (e.g. https://picsum.photos/seed/elementId/width/height for images).`;

  const userPrompt = `Generate the Animation Design Brief for the scene described above. Ensure the output is a single JSON object that perfectly matches the tool's schema.`;

  const llmModel = 'gpt-4-turbo-preview'; 

  try {
    console.log(`Requesting Animation Design Brief from LLM for sceneId: ${sceneId}...`);
    
    // Create a pending record in the database
    const result = await db.insert(animationDesignBriefs).values({
      projectId,
      sceneId,
      designBrief: emptyBrief, 
      llmModel,
      status: 'pending',
      componentJobId,
    }).returning({ id: animationDesignBriefs.id });
    
    if (!result || result.length === 0 || !result[0] || !result[0].id) {
      throw new Error('Failed to create pending Animation Design Brief record');
    }
    
    const pendingRecordId = result[0].id;
    console.log(`Created pending Animation Design Brief record with ID: ${pendingRecordId}`);

    const response = await openai.chat.completions.create({
      model: llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: ANIMATION_BRIEF_TOOL_NAME,
            description: 'Generates a detailed animation design brief for a video scene, adhering to a specific JSON schema.',
            parameters: toolParametersJsonSchema, 
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: ANIMATION_BRIEF_TOOL_NAME },
      },
      temperature: 0.5, 
      response_format: { type: "json_object" }, 
    });

    const toolCalls = response.choices[0]?.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      console.error('LLM response:', JSON.stringify(response, null, 2));
      
      // Update the database record with error status
      await db.update(animationDesignBriefs)
        .set({ 
          status: 'error',
          errorMessage: 'LLM did not return the expected tool call for animation brief generation.'
        })
        .where(eq(animationDesignBriefs.id, pendingRecordId));
        
      throw new Error('LLM did not return the expected tool call for animation brief generation.');
    }

    const toolCall = toolCalls[0];
    if (toolCall?.function?.name !== ANIMATION_BRIEF_TOOL_NAME) {
      console.error('LLM response:', JSON.stringify(response, null, 2));
      
      // Update the database record with error status
      await db.update(animationDesignBriefs)
        .set({ 
          status: 'error',
          errorMessage: `LLM returned an unexpected tool: ${toolCall?.function?.name}`
        })
        .where(eq(animationDesignBriefs.id, pendingRecordId));
        
      throw new Error(`LLM returned an unexpected tool: ${toolCall?.function?.name}`);
    }

    const briefArguments = toolCall.function.arguments;
    let parsedBrief: unknown;
    try {
      parsedBrief = JSON.parse(briefArguments);
    } catch (jsonError: any) {
      console.error('Failed to parse LLM response as JSON:', briefArguments);
      console.error('JSON parsing error:', jsonError.message);
      
      // Update the database record with error status
      await db.update(animationDesignBriefs)
        .set({ 
          status: 'error',
          errorMessage: `LLM response was not valid JSON: ${jsonError.message}`
        })
        .where(eq(animationDesignBriefs.id, pendingRecordId));
        
      throw new Error(`LLM response for animation brief was not valid JSON. Error: ${jsonError.message}`);
    }

    console.log('Validating Animation Design Brief...');
    const validationResult = animationDesignBriefSchema.safeParse(parsedBrief);

    if (!validationResult.success) {
      console.error('Animation Design Brief validation failed. Issues:', JSON.stringify(validationResult.error.flatten(), null, 2));
      console.error('Data received from LLM:', JSON.stringify(parsedBrief, null, 2));
      
      // Update the database record with error status
      await db.update(animationDesignBriefs)
        .set({ 
          status: 'error',
          errorMessage: `Validation error: ${validationResult.error.message}`,
          designBrief: emptyBrief
        })
        .where(eq(animationDesignBriefs.id, pendingRecordId));
        
      throw new Error(`Generated Animation Design Brief failed validation: ${validationResult.error.message}`);
    }
    
    // Strict checks for critical fields that LLM must respect from input
    if (validationResult.data.sceneId !== sceneId) {
        console.warn(`LLM generated brief with sceneId ${validationResult.data.sceneId}, but expected ${sceneId}. Correcting.`);
        validationResult.data.sceneId = sceneId;
    }
    if (validationResult.data.durationInFrames !== desiredDurationInFrames) {
        console.warn(`LLM generated brief with duration ${validationResult.data.durationInFrames} frames, but expected ${desiredDurationInFrames}. Correcting.`);
        validationResult.data.durationInFrames = desiredDurationInFrames;
    }
    if (validationResult.data.dimensions.width !== dimensions.width || validationResult.data.dimensions.height !== dimensions.height) {
        console.warn(`LLM generated brief with dimensions ${validationResult.data.dimensions.width}x${validationResult.data.dimensions.height}, but expected ${dimensions.width}x${dimensions.height}. Correcting.`);
        validationResult.data.dimensions = { width: dimensions.width, height: dimensions.height };
    }

    // Update the database record with the validated brief
    await db.update(animationDesignBriefs)
      .set({ 
        status: 'complete',
        designBrief: validationResult.data
      })
      .where(eq(animationDesignBriefs.id, pendingRecordId));

    console.log(`Animation Design Brief for sceneId ${sceneId} generated, validated, and saved successfully.`);
    return { 
      brief: validationResult.data as AnimationDesignBrief,
      briefId: pendingRecordId 
    };

  } catch (error: any) {
    console.error(`Error generating Animation Design Brief for sceneId ${sceneId}:`, error.message);
    
    // Handle database error update if pendingRecord exists
    // Note: This is a fallback in case the error handling in the specific error cases above fails
    try {
      await db
        .update(animationDesignBriefs)
        .set({ 
          status: 'error',
          errorMessage: `Error: ${error.message}`
        })
        .where(eq(animationDesignBriefs.sceneId, sceneId));
    } catch (dbError) {
      console.error('Failed to update error status in database:', dbError);
    }
    
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error details:', error.status, error.name, error.headers, error.error);
      throw new Error(`OpenAI API Error (${error.status} ${error.name}): ${error.message}`);
    }
    throw error; 
  }
}

/*
// Example usage (for testing purposes - remove or adapt for actual use)
async function testGenerateBrief() {
  try {
    const exampleParams: AnimationBriefGenerationParams = {
      sceneId: 'c272d8db-b86a-4f7a-9e97-7097e9a175b5', 
      scenePurpose: 'Introduce a new sustainable coffee brand called "EarthBean".',
      sceneElementsDescription: 'Show the EarthBean logo, a steaming coffee cup, a tagline "Taste the Planet, Love the Bean", and a background of lush coffee plants.',
      desiredDurationInFrames: 150, 
      dimensions: { width: 1920, height: 1080 },
      targetAudience: 'Eco-conscious coffee drinkers, aged 25-55.',
      brandGuidelines: 'Colors: earthy browns, deep greens, cream. Font: Avenir Next. Style: organic, warm, inviting.'
    };
    const brief = await generateAnimationDesignBrief(exampleParams);
    console.log('Generated Brief:', JSON.stringify(brief, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Ensure OPENAI_API_KEY is in your .env file for this test to run
// To run: node -r ts-node/register --env-file=.env src/server/api/services/animationDesigner.service.ts 
// (Adjust path and execution method as per your project setup)
// if (require.main === module) {
//   testGenerateBrief();
// }
*/