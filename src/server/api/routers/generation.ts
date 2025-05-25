// src/server/api/routers/generation.ts
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { projects, scenes, scenePlans } from "~/server/db/schema";
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
    props: any;
  }
) {
  if (sceneId) {
    // Update existing scene - preserve the original name
    await db.update(scenes)
      .set({
        tsxCode: sceneData.tsxCode,
        props: sceneData.props,
        updatedAt: new Date(),
        // Note: Intentionally NOT updating name to preserve original scene name
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

// Helper function to generate unique component names
function generateUniqueComponentName(userPrompt: string, existingNames: Set<string>): string {
  // Extract meaningful words from the prompt
  const words = userPrompt
    .replace(/@scene\([^)]+\)\s*/, '') // Remove scene tags
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'many', 'then', 'them', 'well', 'were', 'make', 'create', 'add', 'show', 'with', 'that', 'this', 'have', 'will', 'want', 'need'].includes(word.toLowerCase()))
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  // Generate base name
  let baseName = words.length > 0 ? words.join('') : 'Scene';
  if (!baseName.endsWith('Scene')) {
    baseName += 'Scene';
  }

  // Sanitize to ensure valid JavaScript identifier
  baseName = baseName.replace(/[^a-zA-Z0-9]/g, '');
  if (!/^[a-zA-Z]/.test(baseName)) {
    baseName = 'Scene' + baseName;
  }

  // Ensure uniqueness
  let uniqueName = baseName;
  let counter = 1;
  while (existingNames.has(uniqueName)) {
    uniqueName = `${baseName}${counter}`;
    counter++;
  }

  return uniqueName;
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

         return {
           code: generatedCode.trim(),
           sceneId: scene.id,
           template: scene.template
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
          template: scene.template
        };
      }
    }),

  // NEW: Scene-first generation with prompt analysis and template snippets
  generateSceneCode: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      userPrompt: z.string(),
      sceneId: z.string().optional(), // For editing existing scenes
      sceneName: z.string().default("Scene"),
      sceneOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, userPrompt, sceneId, sceneName } = input;
      
      try {
        // Step 1: Check for @scene(id) edit pattern
        const editMatch = /^@scene\(([^)]+)\)\s+([\s\S]*)$/.exec(userPrompt);
        let isEditMode = false;
        let editSceneId: string | undefined;
        let editInstruction: string = userPrompt;
        let existingCode: string | undefined;
        let existingSceneName: string | undefined;
        
        if (editMatch) {
          isEditMode = true;
          editSceneId = editMatch[1]!;
          editInstruction = editMatch[2]!;
          
          // Fetch existing scene code and name
          const existingScene = await db.query.scenes.findFirst({
            where: and(eq(scenes.id, editSceneId), eq(scenes.projectId, projectId)),
          });
          
          if (!existingScene) {
            throw new Error(`Scene with ID ${editSceneId} not found`);
          }
          
          existingCode = existingScene.tsxCode;
          existingSceneName = existingScene.name; // Preserve the original scene name
        }

        // Step 1.5: Fetch existing component names to ensure uniqueness
        const existingScenes = await db.query.scenes.findMany({
          where: eq(scenes.projectId, projectId),
          columns: { tsxCode: true },
        });

        const existingComponentNames = new Set<string>();
        existingScenes.forEach(scene => {
          if (scene.tsxCode) {
            // Extract component name from existing code
            const componentNameMatch = scene.tsxCode.match(/export\s+default\s+function\s+(\w+)/);
            if (componentNameMatch?.[1]) {
              existingComponentNames.add(componentNameMatch[1]);
            }
          }
        });

        // Generate unique component name for new scenes
        const uniqueComponentName = isEditMode 
          ? null // Keep existing name for edits
          : generateUniqueComponentName(userPrompt, existingComponentNames);

        // Step 2: Build simple, clean prompt for LLM
        let systemPrompt: string;
        let userMessage: string;
        
        if (isEditMode) {
          systemPrompt = `You are editing an existing Remotion component. Apply ONLY the requested change while preserving the existing structure and functionality.

EXISTING COMPONENT CODE:
\`\`\`tsx
${existingCode}
\`\`\`

Apply the requested change while maintaining all existing functionality. Return only the modified component code, no explanations.`;

          userMessage = `Apply this change to the component: "${editInstruction}"

Keep all existing animations and structure intact. Only modify what's specifically requested.`;
        } else {
          systemPrompt = `You are a Remotion animation specialist. Create visually engaging animated components using standard Remotion imports.

REQUIRED FORMAT:
\`\`\`tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export default function ${uniqueComponentName}() {
  const frame = useCurrentFrame();
  // Create smooth animations using interpolate, spring, etc.
  
  return (
    <AbsoluteFill>
      {/* Your animated content */}
    </AbsoluteFill>
  );
}
\`\`\`

IMPORTANT: The component MUST be named exactly "${uniqueComponentName}" to avoid naming conflicts.

ANIMATION GUIDELINES:
- Use interpolate for smooth transitions: interpolate(frame, [0, 30], [startValue, endValue])
- NEVER use identical input ranges: interpolate(frame, [45, 45], ...) ❌
- Use spring for natural motion: spring({ frame, fps, config: { damping: 10, stiffness: 100 } })
- Create visual effects with scaling, rotation, opacity, position changes

Return only the component code, no explanations.`;

          userMessage = `Create an animated component named "${uniqueComponentName}" for: "${userPrompt}"

Focus on creating smooth, visually engaging animations that bring the concept to life.`;
        }

        // Step 3: Generate component code
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        // Step 4: Extract and clean code
        const codeMatch = /```(?:tsx?|javascript|jsx?)?\n([\s\S]*?)\n```/.exec(content);
        let generatedCode = codeMatch?.[1] ?? content;

        // Basic cleanup - ensure proper structure
        if (!/export\s+default\s+function/.test(generatedCode)) {
          console.warn('⚠️ Generated code missing export default, fixing...');
          
          const functionMatch = /function\s+(\w+)\s*\(/;
          const match = functionMatch.exec(generatedCode);
          
          if (match) {
            generatedCode = generatedCode.replace(functionMatch, 'export default function $1(');
          } else {
            const fallbackName = uniqueComponentName || 'GeneratedComponent';
            generatedCode = `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export default function ${fallbackName}() {
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

        // Ensure the component name is correct for new scenes
        if (!isEditMode && uniqueComponentName) {
          // Replace any component name with our unique one
          const componentNameRegex = /export\s+default\s+function\s+(\w+)/;
          const currentMatch = generatedCode.match(componentNameRegex);
          if (currentMatch && currentMatch[1] !== uniqueComponentName) {
            console.log(`🔄 Replacing component name "${currentMatch[1]}" with unique name "${uniqueComponentName}"`);
            generatedCode = generatedCode.replace(componentNameRegex, `export default function ${uniqueComponentName}`);
          }
        }

        // Step 5: Persist to database
        const sceneDataToSave = {
          name: isEditMode ? existingSceneName! : (uniqueComponentName || sceneName), // Preserve original name for edits
          order: 0,
          tsxCode: generatedCode.trim(),
          props: {
            userPrompt: isEditMode ? editInstruction : userPrompt,
            isEdit: isEditMode,
          },
        };

        const persistedSceneId = await upsertScene(
          projectId,
          isEditMode ? editSceneId : sceneId,
          sceneDataToSave
        );

        return {
          code: generatedCode.trim(),
          sceneId: persistedSceneId,
          insight: { specificity: 'high' as const },
          isEdit: isEditMode,
        };
      } catch (error) {
        console.error('Error generating scene code:', error);
        
        // Generate a unique fallback name
        const existingScenes = await db.query.scenes.findMany({
          where: eq(scenes.projectId, projectId),
          columns: { tsxCode: true },
        });

        const existingComponentNames = new Set<string>();
        existingScenes.forEach(scene => {
          if (scene.tsxCode) {
            const componentNameMatch = scene.tsxCode.match(/export\s+default\s+function\s+(\w+)/);
            if (componentNameMatch?.[1]) {
              existingComponentNames.add(componentNameMatch[1]);
            }
          }
        });

        const fallbackComponentName = generateUniqueComponentName('Error Scene', existingComponentNames);
        
        // Return simple fallback
        const fallbackCode = `import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export default function ${fallbackComponentName}() {
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
        Error generating scene
      </div>
    </AbsoluteFill>
  );
}`;

        return {
          code: fallbackCode,
          sceneId: sceneId || 'fallback',
          insight: { specificity: 'low' as const },
          isEdit: false,
        };
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
}); 