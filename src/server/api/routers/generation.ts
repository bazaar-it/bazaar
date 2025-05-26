// src/server/api/routers/generation.ts
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { projects, scenes, scenePlans, messages } from "~/server/db/schema";
import { openai } from "~/server/lib/openai";
import { generateObject } from "ai";

// Import animation templates for LLM guidance
const animationTemplateExamples = `
**Available Animation Templates:**

**Bubble Expand & Explode** (expand):
Bubble that expands smoothly then explodes with particles
Default props: {"primaryColor": "rgba(255,87,51,0.5)", "secondaryColor": "rgba(255,255,255,0.3)", "maxScale": 2.5, "explosionFrame": 30}
Usage: Perfect for bubble animations, expanding logos, or explosion effects

**Logo Reveal** (reveal):
Logo appears with scaling and fade effect
Default props: {"logoText": "LOGO", "revealFrame": 20, "primaryColor": "#ffffff", "scale": 1.2}
Usage: Great for brand reveals, title cards, or logo animations

**Slide In** (slide):
Element slides in from specified direction
Default props: {"direction": "left", "distance": 200, "duration": 30, "easing": "ease-out"}
Usage: Perfect for text reveals, image entrances, or UI element animations
`;

// Helper function to parse duration from user prompt
function parsePromptForDuration(userPrompt: string): number | null {
  const prompt = userPrompt.toLowerCase();
  
  // Look for explicit duration mentions
  const patterns = [
    /(\d+)\s*seconds?/,
    /(\d+)\s*secs?/,
    /(\d+)\s*s\b/,
    /(\d+)\s*minutes?/,
    /(\d+)\s*mins?/,
    /(\d+)\s*m\b/
  ];
  
    for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const value = parseInt(match[1]);
      // Convert minutes to seconds
      if (pattern.source.includes('minute') || pattern.source.includes('min') || pattern.source.includes('m\\\\b')) {
        return value * 60;
      }
      return value;
    }
  }
  
  return null;
}

// Helper function to calculate scene duration with user intent
function calculateSceneDuration(userPrompt: string, sceneCount: number, suggestedDuration?: number): number {
  const requestedSeconds = parsePromptForDuration(userPrompt);
  
  if (requestedSeconds) {
    // User specified duration - respect it but keep reasonable bounds
    const totalFrames = Math.round(requestedSeconds * 30); // 30fps
    const framesPerScene = Math.round(totalFrames / sceneCount);
    // Clamp between 30 frames (1s) and 450 frames (15s) per scene
    return Math.max(30, Math.min(450, framesPerScene));
  }
  
  // No explicit duration - use suggested or default to 45 frames (1.5s)
  if (suggestedDuration && suggestedDuration >= 30 && suggestedDuration <= 450) {
    return suggestedDuration;
  }
  
  return 45; // Default 1.5 seconds for smooth playback
}

// Scene schema for validation
const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string(),
  start: z.number(),
  duration: z.number(),
  props: z.record(z.any()),
  metadata: z.object({
    description: z.string(),
    prompt: z.string(),
  }),
});

// Video style schema - simplified to match client expectations
const VideoStyleSchema = z.object({
  colorPalette: z.array(z.string()),
  fontPrimary: z.string(),
  fontSecondary: z.string(),
  mood: z.string(),
  visualStyle: z.string(),
  pacing: z.string(),
});

// Asset schema
const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'video', 'audio', 'icon']),
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  metadata: z.record(z.any()),
});

// Helper function for upserting scenes with race-safe order handling
async function upsertScene(
  projectId: string,
  sceneId: string | undefined,
  sceneData: {
    name: string;
    order: number;
    tsxCode: string;
    duration: number;
    props: any;
  }
) {
  if (sceneId) {
    // Update existing scene
    await db.update(scenes)
      .set({
        ...sceneData,
        updatedAt: new Date(),
      })
      .where(and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)));
    return sceneId;
  } else {
    // Create new scene with race-safe order
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
      .from(scenes)
      .where(eq(scenes.projectId, projectId));
    
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
    
    const [newScene] = await db.insert(scenes)
      .values({
        projectId,
        ...sceneData,
        order: nextOrder,
      })
      .returning({ id: scenes.id });
    
    return newScene!.id;
  }
}

// Helper function to validate generated code before database save
async function validateGeneratedCode(code: string): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // 1. Basic structure validation
    if (!code || code.trim().length === 0) {
      errors.push('Generated code is empty');
      return { isValid: false, errors };
    }
    
    // 2. Check for required export default function
    if (!/export\s+default\s+function/.test(code)) {
      errors.push('Missing export default function');
    }
    
    // 3. Check for basic React/Remotion imports or usage
    const hasRemotionImports = /import.*from.*['"]remotion['"]/.test(code) || 
                              /const\s*{\s*[^}]*}\s*=\s*window\.Remotion/.test(code);
    if (!hasRemotionImports) {
      errors.push('Missing Remotion imports or window.Remotion usage');
    }
    
    // 4. Check for basic React patterns
    const hasReactPatterns = /import.*React/.test(code) || 
                            /React\.createElement/.test(code) ||
                            /<[A-Z]/.test(code); // JSX component usage
    if (!hasReactPatterns) {
      errors.push('Missing React patterns or JSX');
    }
    
    // 5. Try basic syntax validation with Sucrase
    try {
      const { transform } = await import('sucrase');
      transform(code, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false
      });
    } catch (sucraseError) {
      errors.push(`Syntax error: ${sucraseError instanceof Error ? sucraseError.message : 'Unknown syntax error'}`);
    }
    
    // 6. Check for dangerous patterns that could crash the video state
    const dangerousPatterns = [
      { pattern: /while\s*\(\s*true\s*\)/, message: 'Infinite while loop detected' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/, message: 'Infinite for loop detected' },
      { pattern: /throw\s+new\s+Error/, message: 'Explicit error throwing detected' },
      { pattern: /process\.exit/, message: 'Process exit call detected' },
      { pattern: /window\.location/, message: 'Window location manipulation detected' }
    ];
    
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }
    
    // 7. Check for minimum component structure
    const hasComponentStructure = /function\s+\w+\s*\([^)]*\)\s*{/.test(code) &&
                                 /return\s*\(/.test(code) || /return\s*</.test(code);
    if (!hasComponentStructure) {
      errors.push('Missing proper React component structure');
    }
    
    return { isValid: errors.length === 0, errors };
    
  } catch (error) {
    console.error('Error during code validation:', error);
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
    return { isValid: false, errors };
  }
}

export const generationRouter = createTRPCRouter({
  // Scene planning agent
  planScenes: protectedProcedure
    .input(z.object({
      userPrompt: z.string(),
      additionalInstructions: z.string().optional(),
      maxScenes: z.number().default(5),
    }))
    .mutation(async ({ input }) => {
      const { userPrompt, additionalInstructions, maxScenes } = input;
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are a video storyboard planner specializing in animated content. Break down the user's video idea into scenes that match their intent.

For each scene, determine:
1. A descriptive name that captures the visual concept
2. The appropriate template (TitleScene, ContentScene, SplitScene, ListScene, QuoteScene, ImageScene, OutroScene)
3. Duration in frames (at 30fps, keep scenes ≤45 frames for smooth playback)
4. Props that support ANIMATION rather than just text display

Scene props should contain ANIMATION PARAMETERS when possible:
- animationType: "expand", "rotate", "fade", "slide", "bounce", "explode", "reveal"
- colors: primary, secondary, accent colors for animations
- timing: keyframe timings and animation speeds  
- scale: size changes and transformations
- effects: special visual effects needed
- text: only when user specifically requests text content

Output JSON structure:
{
  "scenes": [
    {
      "id": "unique-scene-id",
      "name": "Visual concept name",
      "template": "TemplateName", 
      "start": number,
      "duration": number (≤45 frames for smooth playback),
      "props": {
        "animationType": "expand|rotate|fade|slide|bounce|explode|reveal",
        "primaryColor": "#hex",
        "secondaryColor": "#hex", 
        "text": "Only if user wants text",
        "logoText": "For branding",
        "scale": 1.5,
        "timing": "fast|medium|slow"
      },
      "metadata": {
        "description": "Visual concept description",
        "prompt": "Original prompt text",
        "visualConcept": "What the user will see animated"
      }
    }
  ]
}

Guidelines:
- **Match user intent**: Animation-focused prompts → visual effects, Text-focused prompts → appropriate text
- TitleScene/OutroScene may include text titles and CTAs
- Keep scenes ≤45 frames (1.5s) for smooth 30fps playback
- Focus on visual concepts that can be animated
- Avoid generic placeholder text in props
- Scene IDs should be unique and descriptive`
          },
          {
            role: 'user' as const,
            content: `Plan a sequence of scenes for a video with the prompt: "${userPrompt}"${
              additionalInstructions ? `\n\nAdditional instructions: ${additionalInstructions}` : ''
            }\n\nPlease limit your response to a maximum of ${maxScenes} scenes.`
          }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(content);
        const scenes = Array.isArray(parsed) ? parsed : parsed.scenes;
        
        if (!Array.isArray(scenes)) {
          throw new Error('Expected scenes to be an array');
        }

        // Validate and normalize scenes
        let previousEnd = 0;
        const normalizedScenes = scenes.slice(0, maxScenes).map((scene, index) => {
          // Create consistent scene ID format
          const sceneNumber = String(index + 1).padStart(3, '0');
          const sceneName = scene.name ? scene.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'scene';
          const sceneId = scene.id || `scene-${sceneNumber}-${sceneName}`;
          
          const normalized = {
            id: sceneId,
            name: scene.name || `Scene ${index + 1}`,
            template: scene.template || (index === 0 ? 'TitleScene' : index === scenes.length - 1 ? 'OutroScene' : 'ContentScene'),
            start: previousEnd,
            duration: calculateSceneDuration(userPrompt, maxScenes, scene.duration),
            props: scene.props || {},
            metadata: scene.metadata || {
              description: `Scene ${index + 1}`,
              prompt: userPrompt
            }
          };
          
          previousEnd = normalized.start + normalized.duration;
          return normalized;
        });

        return normalizedScenes;
      } catch (error) {
        console.error('Error planning scenes:', error);
        
        // Return fallback scenes
        return [
          {
            id: 'scene-001-title',
            name: 'Title',
            template: 'TitleScene',
            start: 0,
            duration: 150,
            props: {
              title: 'Video Title',
              text: userPrompt.slice(0, 100)
            },
            metadata: {
              description: 'Title scene',
              prompt: userPrompt
            }
          }
        ];
      }
    }),

  // Style generation agent
  generateStyle: protectedProcedure
    .input(z.object({
      userPrompt: z.string(),
      scenes: z.array(SceneSchema),
    }))
    .mutation(async ({ input }) => {
      const { userPrompt, scenes } = input;
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are a video style designer. Based on the user's prompt and planned scenes, create a consistent visual style for the video.

Output a JSON object with this structure:
{
  "theme": "modern|classic|playful|professional|minimal|bold",
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "typography": {
    "fontFamily": "font name",
    "fontSize": {
      "title": number,
      "subtitle": number,
      "body": number
    },
    "fontWeight": {
      "title": number,
      "subtitle": number,
      "body": number
    }
  },
  "animations": {
    "transitions": "smooth|sharp|bouncy|elegant",
    "timing": "fast|medium|slow",
    "easing": "ease-in-out|ease-in|ease-out|linear"
  },
  "layout": {
    "spacing": number,
    "padding": number,
    "borderRadius": number
  }
}`
          },
          {
            role: 'user' as const,
            content: `Create a visual style for a video with prompt: "${userPrompt}"

Scenes: ${scenes.map(s => `${s.name} (${s.template})`).join(', ')}

Consider the tone and content when choosing colors, fonts, and animations.`
          }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        const style = JSON.parse(content);
        
                 // Convert to the expected client-side format
         const clientStyle = {
           colorPalette: [
             style.colorPalette?.primary || '#3B82F6',
             style.colorPalette?.secondary || '#8B5CF6', 
             style.colorPalette?.accent || '#F59E0B',
             style.colorPalette?.background || '#FFFFFF',
             style.colorPalette?.text || '#1F2937'
           ],
           fontPrimary: style.typography?.fontFamily || 'Inter',
           fontSecondary: style.typography?.fontFamily || 'Inter',
           mood: style.theme || 'modern',
           visualStyle: 'modern',
           pacing: style.animations?.timing || 'medium'
         };
         
         return clientStyle;
      } catch (error) {
        console.error('Error generating style:', error);
        
                 // Return fallback style in client format
         return {
           colorPalette: ['#3B82F6', '#8B5CF6', '#F59E0B', '#FFFFFF', '#1F2937'],
           fontPrimary: 'Inter',
           fontSecondary: 'Inter',
           mood: 'modern',
           visualStyle: 'modern',
           pacing: 'medium'
         };
      }
    }),

  // Asset identification agent
  identifyAssets: protectedProcedure
    .input(z.object({
      userPrompt: z.string(),
      scenes: z.array(SceneSchema),
    }))
    .mutation(async ({ input }) => {
      const { userPrompt, scenes } = input;
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are an asset manager for video production. Analyze the scenes and identify what assets (images, videos, audio, icons) are needed.

Output a JSON object with an "assets" array:
{
  "assets": [
    {
      "id": "unique-asset-id",
      "type": "image|video|audio|icon",
      "name": "Asset name",
      "description": "What this asset is for",
      "metadata": {
        "sceneId": "which scene uses this",
        "purpose": "background|foreground|decoration|functional",
        "style": "description of visual style needed"
      }
    }
  ]
}

Focus on assets that would enhance the video but don't require complex licensing.`
          },
          {
            role: 'user' as const,
            content: `Identify assets needed for a video with prompt: "${userPrompt}"

Scenes: ${scenes.map(s => `${s.id}: ${s.name} (${s.template}) - ${JSON.stringify(s.props)}`).join('\n')}

What images, videos, audio, or icons would enhance these scenes?`
          }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(content);
        const assets = Array.isArray(parsed) ? parsed : parsed.assets;
        
        if (!Array.isArray(assets)) {
          return [];
        }

        // Validate assets
        const validatedAssets = assets.map((asset, index) => ({
          id: asset.id || `asset-${index + 1}`,
          type: ['image', 'video', 'audio', 'icon'].includes(asset.type) ? asset.type : 'image',
          name: asset.name || `Asset ${index + 1}`,
          description: asset.description || 'Asset description',
          metadata: asset.metadata || {}
        }));

        return validatedAssets;
      } catch (error) {
        console.error('Error identifying assets:', error);
        return [];
      }
    }),

  // Component code generation agent
  generateComponentCode: protectedProcedure
    .input(z.object({
      scene: SceneSchema,
      style: VideoStyleSchema,
      userPrompt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { scene, style, userPrompt } = input;
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are a Remotion code generator.

HARD RULES (never break):
1. **No import/require** – Remotion is on window.
2. Start with: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
3. Exactly one component: export default function ComponentName(props) { ... }
4. Nothing else in response – no markdown, no commentary.

If user asks for text, animate its opacity/position. Otherwise build visual animation.

Example:
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function PyramidAnimation(props) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 45], [0.1, 3.0]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: 200,
        height: 200,
        backgroundColor: 'rgba(255, 87, 51, 0.6)',
        transform: \`scale(\${scale})\`,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
      }} />
    </AbsoluteFill>
  );
}`
          },
          {
            role: 'user' as const,
            content: `Generate a ${scene.template} component for scene "${scene.name}".

Scene props: ${JSON.stringify(scene.props, null, 2)}
Style: ${JSON.stringify(style, null, 2)}
Duration: ${scene.duration} frames
Original prompt: "${userPrompt}"

Create an engaging, animated component that fits the scene requirements.`
          }
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

                 // Extract code from markdown if present
         const codeMatch = /```(?:tsx?|javascript|jsx?)?\n([\s\S]*?)\n```/.exec(content);
         let generatedCode = codeMatch?.[1] ?? content;

         // Validate and fix ESM patterns
         if (/import\s+React/.test(generatedCode)) {
           console.warn('⚠️ Generated code contains forbidden React import, fixing...');
           generatedCode = generatedCode.replace(/import\s+React[^;]*;?\s*/g, '');
         }
         
         if (/import\s+.*from\s+['"]remotion['"]/.test(generatedCode)) {
           console.warn('⚠️ Generated code contains forbidden Remotion import, fixing...');
           generatedCode = generatedCode.replace(/import\s+.*from\s+['"]remotion['"];?\s*/g, '');
         }
         
         // Guard against require('remotion') from stack overflow code
         if (/require\s*\(\s*['"]remotion['"]\s*\)/.test(generatedCode)) {
           console.warn('⚠️ Generated code contains forbidden require("remotion"), fixing...');
           generatedCode = generatedCode.replace(/require\s*\(\s*['"]remotion['"]\s*\)/g, 'window.Remotion');
         }
         
         if (!generatedCode.includes('window.Remotion')) {
           console.warn('⚠️ Generated code missing window.Remotion pattern, adding...');
           const destructurePattern = 'const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;\n\n';
           generatedCode = generatedCode.replace(/export default function/, destructurePattern + 'export default function');
         }

         // CRITICAL FIX: Ensure export default is present
         if (!/export\s+default\s+function/.test(generatedCode)) {
           console.warn('⚠️ Generated code missing export default, fixing...');
           
           // Check if it's using arrow function syntax like: const ComponentName = () => {}
           const arrowFunctionMatch = /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/;
           const match = arrowFunctionMatch.exec(generatedCode);
           
           if (match) {
             const [fullMatch, componentName, params] = match;
             // Convert arrow function to export default function
             generatedCode = generatedCode.replace(
               arrowFunctionMatch,
               `export default function ${componentName}(${params}) {`
             );
             // Remove any trailing semicolon after the closing brace
             generatedCode = generatedCode.replace(/}\s*;?\s*$/, '}');
           } else {
             // If no arrow function found, try to find any function and make it export default
             const functionMatch = /function\s+(\w+)\s*\(/;
             const funcMatch = functionMatch.exec(generatedCode);
             
             if (funcMatch) {
               generatedCode = generatedCode.replace(functionMatch, 'export default function $1(');
             } else {
               // Last resort: wrap the entire code in an export default function
               console.warn('⚠️ Could not find function to export, wrapping code...');
               generatedCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function GeneratedComponent(props) {
  ${generatedCode}
}`;
             }
           }
         }

         // Ensure the code ends properly
         if (!generatedCode.trim().endsWith('}')) {
           generatedCode = generatedCode.trim() + '\n}';
         }

         // Validate generated code
         const validationResult = await validateGeneratedCode(generatedCode);
         
         if (!validationResult.isValid) {
           console.warn('⚠️ Generated code failed validation:', validationResult.errors);
         }

         return {
           code: generatedCode.trim(),
           sceneId: scene.id,
           template: scene.template,
           validationResult
         };
      } catch (error) {
        console.error('Error generating component code:', error);
        
        // Return fallback component
        return {
          code: `// Fallback component due to generation error
const { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } = window.Remotion;

export default function ${scene.template}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '${style.colorPalette[3] || '#FFFFFF'}',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '20px',
      color: '${style.colorPalette[4] || '#1F2937'}',
      fontFamily: '${style.fontPrimary || 'Inter'}'
    }}>
      <div>
        <h1 style={{ fontSize: 48 }}>
          Error: Could not generate component for scene: ${scene.props.title || scene.name}
        </h1>
        <p style={{ fontSize: 24 }}>Please try modifying your prompt or regenerating.</p>
      </div>
    </AbsoluteFill>
  );
}`,
          sceneId: scene.id,
          template: scene.template,
          validationResult: { isValid: false, errors: ['Generation error'] }
        };
      }
    }),

  // NEW: Unified scene generation with chat persistence (OPTIMIZATION #1)
  generateSceneWithChat: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      userMessage: z.string(),
      sceneId: z.string().optional(), // For editing existing scenes
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, userMessage, sceneId } = input;
      
      let assistantMessageRow: any = null;
      
      try {
        // Helper function to get scene number by ID
        const getSceneNumber = async (sceneId: string): Promise<number | null> => {
          const projectScenes = await db.query.scenes.findMany({
            where: eq(scenes.projectId, projectId),
            orderBy: [scenes.order, scenes.createdAt],
          });
          const index = projectScenes.findIndex(scene => scene.id === sceneId);
          return index >= 0 ? index + 1 : null;
        };

        // Helper function to convert scene IDs to user-friendly numbers in messages
        const convertSceneIdToNumber = async (msg: string): Promise<string> => {
          // Replace @scene(uuid) with @scene(number) for display
          const sceneIdPattern = /@scene\(([^)]+)\)/g;
          let result = msg;
          let match;
          
          while ((match = sceneIdPattern.exec(msg)) !== null) {
            const sceneId = match[1];
            if (sceneId) {
              const sceneNumber = await getSceneNumber(sceneId);
              if (sceneNumber) {
                result = result.replace(match[0], `@scene(${sceneNumber})`);
              }
            }
          }
          
          return result;
        };

        // Helper function to detect scene removal commands
        const isRemovalCommand = (msg: string): { isRemoval: boolean; sceneId?: string } => {
          const editMatch = /^@scene\(([^)]+)\)\s+([\s\S]*)$/.exec(msg);
          if (!editMatch || !editMatch[1] || !editMatch[2]) return { isRemoval: false };
          
          const sceneId = editMatch[1];
          const instruction = editMatch[2].trim().toLowerCase();
          
          const removalPatterns = [
            /(?:remove|delete|del)/i,
          ];
          
          const isRemoval = removalPatterns.some(pattern => pattern.test(instruction));
          return { isRemoval, sceneId: isRemoval ? sceneId : undefined };
        };

        // Step 1: Check if this is a scene removal command
        const removalCheck = isRemovalCommand(userMessage);
        
        if (removalCheck.isRemoval && removalCheck.sceneId) {
          console.log(`[generateSceneWithChat] Processing scene removal for scene ID: ${removalCheck.sceneId}`);
          
          // Get scene number for user-friendly messages
          const sceneNumber = await getSceneNumber(removalCheck.sceneId);
          
          // Create user message with user-friendly display
          const displayMessage = await convertSceneIdToNumber(userMessage);
          const userMessageResults = await db.insert(messages).values({
            projectId,
            content: displayMessage,
            role: 'user',
            status: 'success'
          }).returning();
          
          const userMessageRow = userMessageResults[0];
          if (!userMessageRow) {
            throw new Error('Failed to create user message');
          }
          
          try {
            // Verify the scene exists and belongs to the project
            const scene = await db.query.scenes.findFirst({
              where: and(eq(scenes.id, removalCheck.sceneId), eq(scenes.projectId, projectId)),
            });
            
            if (!scene) {
              throw new Error(`Scene ${sceneNumber || removalCheck.sceneId} not found`);
            }
            
            // Delete the scene (we know sceneId is defined from the if condition)
            await db.delete(scenes)
              .where(and(eq(scenes.id, removalCheck.sceneId!), eq(scenes.projectId, projectId)));
            
            console.log(`[generateSceneWithChat] Successfully removed scene ${removalCheck.sceneId}`);
            
            // Create success assistant message
            const successAssistantMessages = await db.insert(messages).values({
              projectId,
              content: `Scene ${sceneNumber || '?'} removed successfully ✅`,
              role: 'assistant',
              status: 'success'
            }).returning();
            
            const successAssistantMessage = successAssistantMessages[0];
            if (!successAssistantMessage) {
              throw new Error('Failed to create success message');
            }
            
            return {
              scene: null, // No scene created for removal
              assistantMessage: {
                id: successAssistantMessage.id,
                content: `Scene ${sceneNumber || '?'} removed successfully ✅`,
                status: 'success'
              },
              isEdit: false,
              isRemoval: true
            };
            
          } catch (error) {
            console.error('[generateSceneWithChat] Scene removal error:', error);
            
            // Create error assistant message
            const errorAssistantMessages = await db.insert(messages).values({
              projectId,
              content: `Failed to remove scene ${sceneNumber || '?'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              role: 'assistant',
              status: 'error'
            }).returning();
            
            throw error;
          }
        }

        // Step 2: Parse edit pattern and determine operation type (existing logic)
        const editMatch = /^@scene\(([^)]+)\)\s+([\s\S]*)$/.exec(userMessage);
        const isEditMode = !!editMatch;
        const editSceneId = editMatch?.[1];
        const editInstruction = editMatch?.[2] || userMessage;
        
        // Step 3: Create user message in DB with user-friendly display
        const displayMessage = await convertSceneIdToNumber(userMessage);
        const [userMessageRow] = await db.insert(messages).values({
          projectId,
          content: displayMessage,
          role: 'user',
          status: 'success'
        }).returning();
        
        // Step 4: Create placeholder assistant message
        [assistantMessageRow] = await db.insert(messages).values({
          projectId,
          content: 'Generating scene...',
          role: 'assistant',
          status: 'pending'
        }).returning();
        
        // Step 5: Generate scene code using existing logic
        const targetSceneId = isEditMode ? editSceneId : sceneId;
        const promptToUse = isEditMode ? editInstruction : userMessage;
        
        // Parse duration from user prompt
        const requestedDuration = parsePromptForDuration(userMessage);
        const sceneDuration = requestedDuration ? Math.round(requestedDuration * 30) : 150; // Convert seconds to frames, default 5s
        
        console.log(`[generateSceneWithChat] Parsed duration: ${requestedDuration} seconds = ${sceneDuration} frames`);
        
        // Generate scene code directly (reuse existing generateSceneCode logic)
        let existingCode: string | undefined;
        if (isEditMode && editSceneId) {
          const existingScene = await db.query.scenes.findFirst({
            where: and(eq(scenes.id, editSceneId), eq(scenes.projectId, projectId)),
          });
          if (!existingScene) {
            throw new Error(`Scene with ID ${editSceneId} not found`);
          }
          existingCode = existingScene.tsxCode;
        }
        
        // Build LLM prompts
        const systemPrompt = isEditMode 
          ? `You are editing an existing Remotion component. Apply ONLY the requested change while preserving the existing structure and functionality.

EXISTING COMPONENT CODE:
\`\`\`tsx
${existingCode}
\`\`\`

CRITICAL RULES:
1. Use standard Remotion imports: import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
1.5 NEVER use other imports (e.g. from other libraries), or logos or images. everything has to be created by you.
2. Apply the requested change while maintaining all existing functionality
3. Preserve all existing animations and structure
4. Return only the modified component code, no explanations
5. Ensure export default function ComponentName() format
6. ALWAYS ensure interpolate inputRange and outputRange have identical lengths`
          : `You are a Remotion animation specialist creating visually stunning motion graphics. Create professional, engaging animated components using Tailwind CSS and the BazAnimations library.

REQUIRED FORMAT:
\`\`\`tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export default function ComponentName() {
  const frame = useCurrentFrame();
  const { fadeInUp, scaleIn, pulseGlow, colorPalettes } = window.BazAnimations;
  
  // Create smooth animations using interpolate, spring, and BazAnimations
  const titleAnimation = fadeInUp(frame, 0, 30);
  const buttonAnimation = scaleIn(frame, 20, 25);
  
  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 
          className="text-6xl font-bold text-white drop-shadow-lg"
          style={titleAnimation}
        >
          Your Content
        </h1>
        <button 
          className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          style={buttonAnimation}
        >
          Call to Action
        </button>
      </div>
    </AbsoluteFill>
  );
}
\`\`\`

TAILWIND CSS GUIDELINES:
- Use comprehensive Tailwind classes for styling: bg-*, text-*, p-*, m-*, flex, grid, etc.
- Leverage gradients: bg-gradient-to-r, bg-gradient-to-br, from-*, via-*, to-*
- Apply modern effects: shadow-*, rounded-*, backdrop-blur-*, drop-shadow-*
- Use responsive spacing: space-y-*, space-x-*, gap-*
- Typography: text-*, font-*, leading-*, tracking-*
- Colors: Use semantic color scales (blue-500, purple-600, etc.)

BAZANIMATIONS LIBRARY:
Available via window.BazAnimations:
- Entrance: fadeInUp, slideInLeft, scaleIn, bounceIn
- Continuous: pulseGlow, float, rotate, gradientShift  
- Exit: fadeOutDown, scaleOut
- Layout: glassMorphism, neumorphism, zLayers
- Colors: colorPalettes (ocean, sunset, forest, midnight)
- Composition: stagger, sequence, combineStyles

ANIMATION BEST PRACTICES:
- Use interpolate for smooth transitions: interpolate(frame, [0, 30], [startValue, endValue])
- CRITICAL: inputRange and outputRange MUST have the same length
  ✅ CORRECT: interpolate(frame, [0, 30], [0, 1]) - 2 inputs, 2 outputs
  ✅ CORRECT: interpolate(frame, [0, 15, 30], [1, 1.2, 1]) - 3 inputs, 3 outputs  
  ❌ WRONG: interpolate(frame, [0, 30], [1, 1.2, 1]) - 2 inputs, 3 outputs = ERROR
- Combine BazAnimations with Tailwind for maximum visual impact
- Layer animations: stagger multiple elements with different delays
- Use spring for natural, bouncy motion
- Apply glassMorphism for modern UI elements
- Leverage colorPalettes for consistent theming

VISUAL QUALITY REQUIREMENTS:
- Create engaging, professional motion graphics
- Use modern design patterns (glassmorphism, gradients, shadows)
- Ensure smooth, natural animations
- Apply consistent color schemes
- Add visual hierarchy with typography and spacing
- Include interactive elements (buttons, cards, etc.)
- Focus on visual storytelling and brand appeal

CRITICAL RULES:
1. Use standard Remotion imports only
2. Access BazAnimations via window.BazAnimations destructuring
3. Combine Tailwind classes with animation styles
4. Export default function ComponentName() format required
5. Return only the component code, no explanations
6. Create engaging animations that bring concepts to life
7. ALWAYS ensure interpolate inputRange and outputRange have identical lengths
8. Use Tailwind for ALL styling - avoid inline styles except for animations`;
        
        const userPrompt = isEditMode 
          ? `Apply this change to the component: "${editInstruction}"\n\nKeep all existing animations and structure intact. Only modify what's specifically requested.`
          : `Create a visually stunning animated component for: "${userMessage}"\n\nUse Tailwind CSS for modern styling and BazAnimations for smooth motion. Focus on creating professional motion graphics that are engaging and visually appealing. Make it dynamic, colorful, and interesting to watch.`;
        
        // Call LLM
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }
        
        // Extract and clean code
        const codeMatch = /```(?:tsx?|javascript|jsx?)?\n([\s\S]*?)\n```/.exec(content);
        let generatedCode = codeMatch?.[1] ?? content;
        
        // Enhanced code cleanup
        if (/import\s+React/.test(generatedCode)) {
          generatedCode = generatedCode.replace(/import\s+React[^;]*;?\s*/g, '');
        }
        
        if (!/import\s+.*from\s+['"]remotion['"]/.test(generatedCode)) {
          const importStatement = "import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';\n\n";
          generatedCode = importStatement + generatedCode;
        }
        
        if (/window\.Remotion/.test(generatedCode)) {
          generatedCode = generatedCode.replace(/const\s*{\s*[^}]*}\s*=\s*window\.Remotion;\s*/g, '');
        }
        
        // Ensure proper export default function
        if (!/export\s+default\s+function/.test(generatedCode)) {
          const arrowFunctionMatch = /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/;
          const match = arrowFunctionMatch.exec(generatedCode);
          
          if (match) {
            const [fullMatch, componentName, params] = match;
            generatedCode = generatedCode.replace(
              arrowFunctionMatch,
              `export default function ${componentName}(${params}) {`
            );
            generatedCode = generatedCode.replace(/}\s*;?\s*$/, '}');
          } else {
            const functionMatch = /function\s+(\w+)\s*\(/;
            const funcMatch = functionMatch.exec(generatedCode);
            
            if (funcMatch) {
              generatedCode = generatedCode.replace(functionMatch, 'export default function $1(');
            } else {
              generatedCode = `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function GeneratedComponent() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      opacity 
    }}>
      <div style={{ color: '#fff', fontSize: 48 }}>
        Generated Scene
      </div>
    </AbsoluteFill>
  );
}`;
            }
          }
        }
        
        if (!generatedCode.trim().endsWith('}')) {
          generatedCode = generatedCode.trim() + '\n}';
        }
        
        // Validate generated code
        const validation = await validateGeneratedCode(generatedCode.trim());
        if (!validation.isValid) {
          throw new Error(`Generated code validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Upsert scene
        const sceneDataToSave = {
          name: isEditMode ? `Edited Scene` : `Generated Scene`,
          order: 0,
          tsxCode: generatedCode.trim(),
          duration: sceneDuration, // Store the parsed duration
          props: {
            userPrompt: isEditMode ? editInstruction : userMessage,
            isEdit: isEditMode,
            validationPassed: true,
            generatedAt: new Date().toISOString(),
            model: 'gpt-4o-mini',
            requestedDuration: requestedDuration, // Store original requested duration for reference
          },
        };
        
        const persistedSceneId = await upsertScene(
          projectId,
          isEditMode ? editSceneId : targetSceneId,
          sceneDataToSave
        );
        
        // Fetch the complete scene object for client
        const [completeScene] = await db.select().from(scenes).where(eq(scenes.id, persistedSceneId));
        
        // Step 6: Update assistant message with success
        const assistantContent = `Scene ${isEditMode ? 'updated' : 'generated'}: ${promptToUse.slice(0, 50)}${promptToUse.length > 50 ? '...' : ''} ✅`;
        
        await db.update(messages)
          .set({
            content: assistantContent,
            status: 'success',
            updatedAt: new Date()
          })
          .where(eq(messages.id, assistantMessageRow.id));
        
        return {
          scene: completeScene,
          assistantMessage: {
            id: assistantMessageRow.id,
            content: assistantContent,
            status: 'success'
          },
          isEdit: isEditMode
        };
        
      } catch (error) {
        console.error('[generateSceneWithChat] Error:', error);
        
        // Update assistant message with error if it was created
        if (assistantMessageRow?.id) {
          await db.update(messages)
            .set({
              content: `Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'error',
              updatedAt: new Date()
            })
            .where(eq(messages.id, assistantMessageRow.id))
            .catch(console.error); // Don't throw on cleanup errors
        }
        
        throw error;
      }
    }),

  // Get scenes for a project
  getProjectScenes: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const { projectId } = input;
      
      try {
        const projectScenes = await db.query.scenes.findMany({
          where: eq(scenes.projectId, projectId),
          orderBy: [scenes.order, scenes.createdAt],
        });
        
        return projectScenes;
      } catch (error) {
        console.error('Error fetching project scenes:', error);
        return [];
      }
    }),

  // BAZAAR-303: Publish scene to R2 storage
  publishScene: protectedProcedure
    .input(z.object({
      sceneId: z.string().uuid(),
      scope: z.enum(['scene']).default('scene'), // MVP: Only 'scene' scope allowed
    }))
    .mutation(async ({ input, ctx }) => {
      const { sceneId, scope } = input;
      const userId = ctx.session.user.id;
      
      try {
        // Import the publish queue functions
        const { addPublishJob } = await import('~/queues/publish');
        
        // Add job to the publishing queue
        const job = await addPublishJob({
          sceneId,
          userId,
          scope,
        });
        
        return {
          jobId: job.id,
          status: 'queued',
          message: `Scene publishing job ${job.id} has been queued`,
        };
      } catch (error) {
        console.error('Error publishing scene:', error);
        throw new Error(`Failed to publish scene: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // BAZAAR-303: Get publishing job status
  publishStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ input }) => {
      const { jobId } = input;
      
      try {
        // Import the publish queue functions
        const { getJobStatus } = await import('~/queues/publish');
        
        const status = await getJobStatus(jobId);
        
        if (!status) {
          throw new Error(`Job ${jobId} not found`);
        }
        
        return {
          jobId,
          status: status.status,
          progress: status.progress,
          result: status.result,
          error: status.error,
        };
      } catch (error) {
        console.error('Error getting publish status:', error);
        throw new Error(`Failed to get publish status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // Remove scene by ID
  removeScene: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      sceneId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, sceneId } = input;
      const userId = ctx.session.user.id;
      
      try {
        // Verify the project belongs to the user
        const project = await db.query.projects.findFirst({
          where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
        });
        
        if (!project) {
          throw new Error('Project not found or access denied');
        }
        
        // Verify the scene exists and belongs to the project
        const scene = await db.query.scenes.findFirst({
          where: and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)),
        });
        
        if (!scene) {
          throw new Error('Scene not found');
        }
        
        // Delete the scene
        await db.delete(scenes)
          .where(and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)));
        
        console.log(`[removeScene] Successfully removed scene ${sceneId} from project ${projectId}`);
        
        return {
          success: true,
          removedSceneId: sceneId,
          message: 'Scene removed successfully'
        };
        
      } catch (error) {
        console.error('[removeScene] Error:', error);
        throw new Error(`Failed to remove scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
}); 