// /src/server/api/services/animationDesigner.service.ts
import OpenAI from 'openai';
import { z } from 'zod';
import {
  animationDesignBriefSchema,
  type AnimationDesignBrief,
} from '~/lib/schemas/animationDesignBrief.schema'; // Adjusted path
import { env } from '~/env'; // Adjusted path assuming env.ts is at src/env.ts

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const ANIMATION_BRIEF_TOOL_NAME = 'generate_animation_design_brief';

/**
 * Describes the input parameters for generating an Animation Design Brief.
 */
export interface AnimationBriefGenerationParams {
  sceneId: string;
  scenePurpose: string; // e.g., "Introduce Product X and its key benefit"
  sceneElementsDescription: string; // e.g., "A title text 'Product X', a subtitle 'Solves problem Y', an image of the product, and a small company logo."
  desiredDurationInFrames: number;
  dimensions: { // Added dimensions as it's part of the brief and LLM needs it
      width: number;
      height: number;
  };
  currentVideoContext?: string; // Optional: Broader context of the video, e.g., existing scenes, overall tone
  targetAudience?: string; // Optional: Who is this video for?
  brandGuidelines?: string; // Optional: Specific brand colors, fonts, or styles to adhere to
}

/**
 * Generates a detailed Animation Design Brief for a scene using an LLM.
 *
 * @param params Parameters for generating the animation brief.
 * @returns A promise that resolves to the validated AnimationDesignBrief.
 * @throws Throws an error if LLM interaction fails or validation is unsuccessful.
 */
export async function generateAnimationDesignBrief(
  params: AnimationBriefGenerationParams
): Promise<AnimationDesignBrief> {
  const {
    sceneId,
    scenePurpose,
    sceneElementsDescription,
    desiredDurationInFrames,
    dimensions, // Added
    currentVideoContext,
    targetAudience,
    brandGuidelines,
  } = params;

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

  try {
    console.log(`Requesting Animation Design Brief from LLM for sceneId: ${sceneId}...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Or your preferred model that supports extensive JSON output
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
            parameters: animationDesignBriefSchema.openapi('AnimationDesignBriefInput'),
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: ANIMATION_BRIEF_TOOL_NAME },
      },
      temperature: 0.5, // Slightly lower temperature for more predictable schema adherence
      response_format: { type: "json_object" }, // Request JSON output if model supports it explicitly
    });

    const toolCalls = response.choices[0]?.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      console.error('LLM response:', JSON.stringify(response, null, 2));
      throw new Error('LLM did not return the expected tool call for animation brief generation.');
    }

    const toolCall = toolCalls[0];
    if (toolCall?.function?.name !== ANIMATION_BRIEF_TOOL_NAME) {
      console.error('LLM response:', JSON.stringify(response, null, 2));
      throw new Error(`LLM returned an unexpected tool: ${toolCall?.function?.name}`);
    }

    const briefArguments = toolCall.function.arguments;
    let parsedBrief: unknown;
    try {
      parsedBrief = JSON.parse(briefArguments);
    } catch (jsonError: any) {
      console.error('Failed to parse LLM response as JSON:', briefArguments);
      console.error('JSON parsing error:', jsonError.message);
      throw new Error(`LLM response for animation brief was not valid JSON. Error: ${jsonError.message}`);
    }

    console.log('Validating Animation Design Brief...');
    const validationResult = animationDesignBriefSchema.safeParse(parsedBrief);

    if (!validationResult.success) {
      console.error('Animation Design Brief validation failed. Issues:', JSON.stringify(validationResult.error.flatten(), null, 2));
      console.error('Data received from LLM:', JSON.stringify(parsedBrief, null, 2));
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


    console.log(`Animation Design Brief for sceneId ${sceneId} generated and validated successfully.`);
    return validationResult.data as AnimationDesignBrief;

  } catch (error: any) {
    console.error(`Error generating Animation Design Brief for sceneId ${sceneId}:`, error.message);
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error details:', error.status, error.name, error.headers, error.error);
      throw new Error(`OpenAI API Error (${error.status} ${error.name}): ${error.message}`);
    }
    throw error; 
  }
}

// Example usage (for testing purposes - remove or adapt for actual use)
/*
async function testGenerateBrief() {
  try {
    const exampleParams: AnimationBriefGenerationParams = {
      sceneId: 'c272d8db-b86a-4f7a-9e97-7097e9a175b5', // Valid UUID
      scenePurpose: 'Introduce a new sustainable coffee brand called "EarthBean".',
      sceneElementsDescription: 'Show the EarthBean logo, a steaming coffee cup, a tagline "Taste the Planet, Love the Bean", and a background of lush coffee plants.',
      desiredDurationInFrames: 150, // 5 seconds at 30fps
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