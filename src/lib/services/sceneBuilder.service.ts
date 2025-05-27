import { openai } from "~/server/lib/openai";
import { SceneSpec, enhanceSceneSpec, type SceneSpec as SceneSpecType } from "~/lib/types/storyboard";

export interface SceneBuilderInput {
  userMessage: string;
  userContext: Record<string, unknown>;
  storyboardSoFar: SceneSpecType[];
  projectId: string;
  userId: string;
}

export interface SceneBuilderOutput {
  sceneSpec: SceneSpecType;
  reasoning: string;
  debug: {
    prompt: { system: string; user: string };
    response: string;
    parsed: any;
  };
}

/**
 * SceneBuilder service - converts user intent into structured SceneSpec JSON
 * Uses GPT-4o for high-quality creative scene planning
 */
export class SceneBuilderService {
  private readonly model = "gpt-4o";
  private readonly temperature = 0.3; // Balanced creativity vs consistency
  
  async buildScene(input: SceneBuilderInput): Promise<SceneBuilderOutput> {
    const prompt = this.buildScenePrompt(input);
    
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user", 
            content: prompt.user,
          },
        ],
        response_format: { type: "json_object" },
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from SceneBuilder LLM");
      }
      
      // Add safeguard for non-JSON responses
      if (!rawOutput.trim().startsWith('{')) {
        throw new Error(`SceneBuilder returned non-JSON response: ${rawOutput.substring(0, 100)}...`);
      }
      
      const parsed = JSON.parse(rawOutput);
      
      // Validate and enhance the SceneSpec with error recovery
      let sceneSpec;
      try {
        sceneSpec = SceneSpec.parse(parsed.sceneSpec);
      } catch (validationError) {
        console.warn('[SceneBuilder] Validation failed, attempting recovery:', validationError);
        
        // Try to fix common validation issues
        const fixedSceneSpec = this.fixSceneSpecValidation(parsed.sceneSpec);
        sceneSpec = SceneSpec.parse(fixedSceneSpec);
      }
      
      const enhancedSpec = enhanceSceneSpec(sceneSpec);
      
      // DEBUG LOGGING - Essential info only
      console.log(`[SceneBuilder] Generated scene: ${enhancedSpec.components.length} components, ${enhancedSpec.motion.length} animations, ${enhancedSpec.duration}s`);
      
      return {
        sceneSpec: enhancedSpec,
        reasoning: parsed.reasoning || "Scene generated successfully",
        debug: {
          prompt,
          response: rawOutput,
          parsed,
        },
      };
    } catch (error) {
      console.error("[SceneBuilder] Error:", error);
      throw new Error(`SceneBuilder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private buildScenePrompt(input: SceneBuilderInput) {
    const { userMessage, userContext, storyboardSoFar } = input;
    
    const system = `You are an expert Remotion scene planner. Your job is to convert user requests into structured SceneSpec JSON.

CRITICAL: You MUST respond with valid JSON in this exact format:
{
  "sceneSpec": { /* SceneSpec object */ },
  "reasoning": "Brief explanation of design decisions"
}

SCENESPEC SCHEMA:
A SceneSpec has 4 core elements:
1. components: UI elements (Flowbite, HTML, custom)
2. style: Visual design (colors, typography, background)  
3. text: Content with semantic slots
4. motion: Animations with timing

COMPONENT LIBRARIES:
- "flowbite": Atomic components (direct Flowbite React imports)
- "flowbite-layout": Layout templates (complex Flowbite compositions)
- "html": Basic HTML elements (div, input, button, etc.)
- "custom": Special elements (MouseCursor, Camera, etc.)
- "bazaar": Custom Bazaar components

FLOWBITE ATOMIC COMPONENTS (use lib:"flowbite"):

FORM INPUT COMPONENTS:
  - TextInput, FileInput, SearchInput, NumberInput, PhoneInput
  - Select, Textarea, Timepicker, Checkbox, Radio, Toggle, Range
  - FloatingLabel, Label

GENERAL UI COMPONENTS:
  - Alert, Accordion, Avatar, Badge, Banner, BottomNavigation
  - Breadcrumb, Button, ButtonGroup

CONTENT CONTAINERS:
  - Card, Carousel, ChatBubble, Clipboard, Datepicker, DeviceMockup
  - Drawer, Dropdown, Footer, Gallery, Indicator, Jumbotron
  - KBD, ListGroup, MegaMenu

INTERACTIVE ELEMENTS:
  - Modal, Navbar, Pagination, Popover, Progress, Rating
  - Sidebar, Skeleton, SpeedDial, Spinner, Stepper, Table
  - Tabs, Timeline, Toast, Tooltip, Typography, Video

FLOWBITE LAYOUT TEMPLATES (use lib:"flowbite-layout"):
**IMPORTANT**: These are mapped to actual Flowbite components automatically:

NAVIGATION LAYOUTS:
  - ApplicationShellWithSidebarAndNavbar → Sidebar component
  - SideNavigationDefault → Sidebar component  
  - NavbarDefault → Navbar component

TABLE LAYOUTS:
  - TableDefault → Table component
  - TableHeaderDefault → Table component
  - TableHeaderWithButton → Table component
  - TableFooter → Pagination component

HERO SECTIONS:
  - HeroDefault → Jumbotron component
  - HeroWithImage → Card component

MODAL LAYOUTS:
  - UpdateModalDefault → Modal component
  - CreateModalDefault → Modal component
  - ReadModalDefault → Modal component
  - DeleteConfirmationModal → Modal component

DRAWER LAYOUTS:
  - DrawerDefault → Drawer component
  - ReadDrawer → Drawer component
  - UpdateDrawer → Drawer component

FORM LAYOUTS:
  - CreateForm → Card component
  - UpdateForm → Card component

DASHBOARD LAYOUTS:
  - CrudLayoutDefault → Card component
  - DashboardFooterDefault → Footer component

SEARCH & FILTER LAYOUTS:
  - DropdownFilterDefault → Dropdown component
  - FacetedSearchModal → Modal component
  - FacetedSearchDrawer → Drawer component

MESSAGE LAYOUTS:
  - SuccessMessageDefault → Alert component

**USAGE GUIDANCE**:
- Layout templates provide semantic meaning (e.g., "TableDefault" = data table)
- They automatically map to real Flowbite components during code generation
- Use layout templates for complex sections (dashboard, table, navigation)
- Use atomic components for individual UI elements (buttons, inputs, cards)
- All components render as proper Flowbite React components with full styling

COMPONENT SELECTION RULES:
1. Pick *one* layout template when user asks for a full section (e.g. "admin CRUD page")
2. Otherwise compose atomic components for specific UI elements
3. Never mix two layout templates in one scene without asking for clarification
4. Use relative positioning (0-1) for responsive layouts

LAYOUT COORDINATES:
- Use relative coordinates (0-1) for x, y, width, height
- x: 0.5 = center horizontally, y: 0.5 = center vertically
- zIndex for layering (higher = front)

MOTION FUNCTIONS (expanded set for creative freedom):

ENTRANCE ANIMATIONS:
- Basic: fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight
- Slides: slideInLeft, slideInRight, slideInUp, slideInDown, slideInTopLeft, slideInTopRight, slideInBottomLeft, slideInBottomRight  
- Scaling: scaleIn, scaleInX, scaleInY
- Bounces: bounceIn, bounceInUp, bounceInDown
- Rotations: flipInX, flipInY, rotateIn, rotateInUpLeft, rotateInUpRight, rollIn
- Special: lightSpeedIn, jackInTheBox, backInUp, backInDown

EXIT ANIMATIONS:
- Basic: fadeOut, fadeOutUp, fadeOutDown, fadeOutLeft, fadeOutRight
- Slides: slideOutLeft, slideOutRight, slideOutUp, slideOutDown
- Scaling: scaleOut, scaleOutX, scaleOutY  
- Bounces: bounceOut, bounceOutUp, bounceOutDown
- Rotations: flipOutX, flipOutY, rotateOut, rotateOutUpLeft, rotateOutUpRight, rollOut
- Special: lightSpeedOut, backOutUp, backOutDown

CONTINUOUS/ATTENTION ANIMATIONS:
- Basic: pulse, bounce, shake, shakeX, shakeY, wobble, swing, float, bob
- Rotations: rotate, rotateClockwise, rotateCounterClockwise
- Effects: heartbeat, flash, rubberBand, jello, tada, headShake

CAMERA/VIEWPORT MOVEMENTS:
- Zoom: zoomIn, zoomOut, zoomInUp, zoomInDown, zoomInLeft, zoomInRight, zoomOutUp, zoomOutDown, zoomOutLeft, zoomOutRight
- Pan: panLeft, panRight, panUp, panDown

SPECIAL EFFECTS:
- Text: typewriter
- Visual: glitch, neon, glow, sparkle, shimmer, blur, focus, pixelate
- Physics: wave, ripple, explode, implode, shatter, crumble, melt, burn, freeze
- Energy: electric

INTERACTION ANIMATIONS:
- User Actions: click, hover, press, release, drag, drop, swipe, pinch, stretch, squeeze
- Transformations: morph, transform

CUSTOM: Use "custom" with params.type for any unique animations not listed above

EXAMPLES:
- For clicking effect: {"fn": "click", "duration": 0.2}
- For shattering glass: {"fn": "shatter", "duration": 1.0, "params": {"pieces": 20}}
- For typewriter text: {"fn": "typewriter", "duration": 2.0, "params": {"speed": 15}}
- For neon glow: {"fn": "neon", "duration": 0.5, "iterations": "infinite"}

CRITICAL: ONLY use these exact function names. Never invent new function names.

TIMING RULES:
- duration: primary timing control (seconds)
- delay: when to start (seconds)
- iterations: number or "infinite" for loops
- Auto-compute scene duration from longest motion + 1s buffer
- Frame ranges computed automatically from duration + fps

DESIGN PRINCIPLES:
- Use Tailwind classes for styling
- Relative positioning for responsive design
- Semantic text slots (headline, caption, cta)
- Smooth animation timing with proper delays
- Consider visual hierarchy and user flow

EXAMPLE SCENE STRUCTURE:
{
  "components": [
    {
      "lib": "flowbite-layout",
      "name": "HeroDefault", 
      "id": "hero-section",
      "layout": { "x": 0, "y": 0, "width": 1, "height": 1 },
      "props": { 
        "headline": "Welcome to Our Platform",
        "subtext": "Create amazing experiences",
        "primaryCta": "Get Started",
        "secondaryCta": "Learn More"
      }
    }
  ],
  "style": {
    "palette": ["#000000", "#ffffff", "#8b5cf6"],
    "classes": ["bg-black", "text-white", "font-inter"],
    "background": { "type": "solid", "value": "#000000" }
  },
  "text": [
    {
      "slot": "headline",
      "content": "Your text here",
      "animation": { "reveal": "typewriter", "speed": 15 }
    }
  ],
  "motion": [
    {
      "target": "hero-section",
      "fn": "fadeIn", 
      "duration": 0.8,
      "delay": 0
    }
  ]
}

STYLE SPECIFICATION:
- palette: Array of hex colors for the scene
- classes: Global Tailwind CSS utility classes  
- background: ONLY use these types: "solid", "gradient", "image", "video"
  - solid: Single color (e.g., "#1e1b4b")
  - gradient: CSS gradient (e.g., "linear-gradient(45deg, #667eea 0%, #764ba2 100%)")
- typography: Font settings (fontFamily, fontSize, fontWeight, lineHeight)

CRITICAL: For particle effects, animated backgrounds, or special effects, use "gradient" type with appropriate CSS gradient values. NEVER use "particle", "animated", "effect", or other invalid background types.

Respond with valid JSON only.`;

    const contextInfo = Object.keys(userContext).length > 0 
      ? `\nUSER CONTEXT: ${JSON.stringify(userContext, null, 2)}`
      : "";
      
    const storyboardInfo = storyboardSoFar.length > 0
      ? `\nEXISTING SCENES: ${storyboardSoFar.length} scenes already created`
      : "\nFIRST SCENE: This is the first scene in the project";

    const user = `USER REQUEST: "${userMessage}"${contextInfo}${storyboardInfo}

Create a SceneSpec that fulfills this request. Focus on:
1. Accurate component selection (atomic vs layout templates)
2. Appropriate animations with good timing
3. Visual design that matches the request
4. Semantic text organization
5. Responsive relative positioning

Respond with valid JSON only.`;

    return { system, user };
  }

  private fixSceneSpecValidation(sceneSpec: any): any {
    // Create a deep copy to avoid mutating the original
    const fixed = JSON.parse(JSON.stringify(sceneSpec));
    
    // Valid motion function names - expanded set
    const validMotionFunctions = [
      // === ENTRANCE ANIMATIONS ===
      "fadeIn", "fadeInUp", "fadeInDown", "fadeInLeft", "fadeInRight",
      "slideInLeft", "slideInRight", "slideInUp", "slideInDown", 
      "slideInTopLeft", "slideInTopRight", "slideInBottomLeft", "slideInBottomRight",
      "scaleIn", "scaleInX", "scaleInY", "bounceIn", "bounceInUp", "bounceInDown",
      "flipInX", "flipInY", "rotateIn", "rotateInUpLeft", "rotateInUpRight",
      "rollIn", "lightSpeedIn", "jackInTheBox", "backInUp", "backInDown",
      
      // === EXIT ANIMATIONS ===
      "fadeOut", "fadeOutUp", "fadeOutDown", "fadeOutLeft", "fadeOutRight",
      "slideOutLeft", "slideOutRight", "slideOutUp", "slideOutDown",
      "scaleOut", "scaleOutX", "scaleOutY", "bounceOut", "bounceOutUp", "bounceOutDown",
      "flipOutX", "flipOutY", "rotateOut", "rotateOutUpLeft", "rotateOutUpRight",
      "rollOut", "lightSpeedOut", "backOutUp", "backOutDown",
      
      // === CONTINUOUS/ATTENTION ANIMATIONS ===
      "pulse", "bounce", "shake", "shakeX", "shakeY", "wobble", "swing",
      "rotate", "rotateClockwise", "rotateCounterClockwise", "float", "bob",
      "heartbeat", "flash", "rubberBand", "jello", "tada", "headShake",
      
      // === CAMERA/VIEWPORT MOVEMENTS ===
      "zoomIn", "zoomOut", "zoomInUp", "zoomInDown", "zoomInLeft", "zoomInRight",
      "zoomOutUp", "zoomOutDown", "zoomOutLeft", "zoomOutRight",
      "panLeft", "panRight", "panUp", "panDown",
      
      // === SPECIAL EFFECTS ===
      "typewriter", "glitch", "neon", "glow", "sparkle", "shimmer",
      "blur", "focus", "pixelate", "wave", "ripple", "explode", "implode",
      "shatter", "crumble", "melt", "burn", "freeze", "electric",
      
      // === INTERACTION ANIMATIONS ===
      "click", "hover", "press", "release", "drag", "drop", "swipe",
      "pinch", "stretch", "squeeze", "morph", "transform",
      
      // === CUSTOM ===
      "custom"
    ];
    
    // Valid background types
    const validBackgroundTypes = ["solid", "gradient", "image", "video"];
    
    // Fix component layout coordinates that exceed the 0-1 range
    if (fixed.components && Array.isArray(fixed.components)) {
      fixed.components = fixed.components.map((component: any) => {
        if (component.layout) {
          const layout = { ...component.layout };
          
          // Normalize coordinates that exceed reasonable bounds
          if (typeof layout.x === 'number' && layout.x > 1) {
            console.warn(`[SceneBuilder] Normalizing x coordinate from ${layout.x} to ${Math.min(layout.x / 100, 1)}`);
            layout.x = Math.min(layout.x / 100, 1); // Assume it was meant to be a percentage
          }
          
          if (typeof layout.y === 'number' && layout.y > 1) {
            console.warn(`[SceneBuilder] Normalizing y coordinate from ${layout.y} to ${Math.min(layout.y / 100, 1)}`);
            layout.y = Math.min(layout.y / 100, 1);
          }
          
          if (typeof layout.width === 'number' && layout.width > 1) {
            console.warn(`[SceneBuilder] Normalizing width from ${layout.width} to ${Math.min(layout.width / 100, 1)}`);
            layout.width = Math.min(layout.width / 100, 1);
          }
          
          if (typeof layout.height === 'number' && layout.height > 1) {
            console.warn(`[SceneBuilder] Normalizing height from ${layout.height} to ${Math.min(layout.height / 100, 1)}`);
            layout.height = Math.min(layout.height / 100, 1);
          }
          
          // Ensure coordinates are within bounds
          if (typeof layout.x === 'number') layout.x = Math.max(0, Math.min(1, layout.x));
          if (typeof layout.y === 'number') layout.y = Math.max(0, Math.min(1, layout.y));
          if (typeof layout.width === 'number') layout.width = Math.max(0, Math.min(1, layout.width));
          if (typeof layout.height === 'number') layout.height = Math.max(0, Math.min(1, layout.height));
          
          component.layout = layout;
        }
        return component;
      });
    }
    
    // Fix invalid motion functions
    if (fixed.motion && Array.isArray(fixed.motion)) {
      fixed.motion = fixed.motion.map((motion: any) => {
        if (!validMotionFunctions.includes(motion.fn)) {
          console.warn(`[SceneBuilder] Invalid motion function "${motion.fn}", converting to "custom"`);
          
          // Convert invalid functions to custom with original name in params
          return {
            ...motion,
            fn: 'custom',
            params: {
              ...motion.params,
              type: motion.fn, // Preserve original function name
            }
          };
        }
        return motion;
      });
    }
    
    // Fix invalid background types
    if (fixed.style?.background?.type && !validBackgroundTypes.includes(fixed.style.background.type)) {
      const invalidType = fixed.style.background.type;
      console.warn(`[SceneBuilder] Invalid background type "${invalidType}", converting to appropriate alternative`);
      
      // Map invalid background types to valid ones
      const backgroundTypeMapping: Record<string, string> = {
        'particle': 'gradient', // Particle effects → gradient background
        'animated': 'gradient',
        'dynamic': 'gradient',
        'effect': 'gradient',
        'texture': 'image',
        'pattern': 'image',
        'noise': 'gradient',
        'plasma': 'gradient',
        'fractal': 'gradient',
      };
      
      const newType = backgroundTypeMapping[invalidType] || 'solid';
      fixed.style.background.type = newType;
      
      // Adjust the value based on the new type
      if (newType === 'gradient' && invalidType === 'particle') {
        // Convert particle background to a gradient that suggests particles
        fixed.style.background.value = 'radial-gradient(circle, rgba(147, 51, 234, 0.8) 0%, rgba(79, 70, 229, 0.6) 50%, rgba(30, 27, 75, 1) 100%)';
      } else if (newType === 'solid') {
        // Fallback to a solid color
        fixed.style.background.value = '#1e1b4b'; // Deep purple
      }
    }
    
    // Remove any motion entries that are still invalid after fixing
    if (fixed.motion) {
      fixed.motion = fixed.motion.filter((motion: any) => 
        validMotionFunctions.includes(motion.fn)
      );
    }
    
    return fixed;
  }

  /**
   * Generate React/Remotion code directly with enriched context from Brain LLM
   * Intelligence-first approach: trust the LLM to generate working code with strategic guidance
   */
  async generateDirectCode(input: {
    userPrompt: string;
    projectId: string;
    sceneNumber?: number;
    brainContext?: {
      userIntent: string;
      technicalRecommendations: string[];
      uiLibraryGuidance: string;
      animationStrategy: string;
      previousContext?: string;
      focusAreas: string[];
    };
  }): Promise<{
    code: string;
    name: string;
    duration: number;
    reasoning: string;
    debug: any;
  }> {
    const { brainContext } = input;
    
    // Simplified, focused prompt to avoid token limits
    const systemPrompt = `You are an expert React/Remotion code generator.

USER REQUEST: "${input.userPrompt}"

${brainContext ? `
STRATEGIC GUIDANCE:
- Intent: ${brainContext.userIntent}
- UI: ${brainContext.uiLibraryGuidance}
- Animation: ${brainContext.animationStrategy}
- Focus: ${brainContext.focusAreas.join(', ')}
` : ''}

REQUIREMENTS:
- Use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;
- Export: export default function ComponentName() { ... }
- Animations: Use interpolate() for smooth transitions
- Styling: Tailwind classes and inline styles only
- NO external imports (no GSAP, no CSS files)

RESPONSE FORMAT (JSON):
{
  "code": "// Complete working React/Remotion component",
  "name": "ComponentName",
  "duration": 180,
  "reasoning": "Brief implementation explanation"
}

Generate complete, working code that implements the request.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 10000, // Increased token limit
        response_format: { type: "json_object" },
      });

      let content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Check for incomplete JSON (common issue with token limits)
      const trimmedContent = content.trim();
      if (!trimmedContent.startsWith('{') || !trimmedContent.endsWith('}')) {
        console.warn("[SceneBuilder] Incomplete JSON detected, attempting to fix...");
        
        // Try to fix incomplete JSON by ensuring it ends properly
        let fixedContent = trimmedContent;
        if (!fixedContent.endsWith('}')) {
          // Count open braces vs close braces
          const openBraces = (fixedContent.match(/\{/g) || []).length;
          const closeBraces = (fixedContent.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            fixedContent += '}".repeat(missingBraces)';
            console.log(`[SceneBuilder] Added ${missingBraces} missing closing braces`);
          }
        }
        
        // If still can't fix, throw error to trigger fallback
        if (!fixedContent.startsWith('{') || !fixedContent.endsWith('}')) {
          throw new Error(`Invalid JSON structure: ${trimmedContent.substring(0, 100)}...`);
        }
        
        content = fixedContent;
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      
      // Validate required fields
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 10) {
        throw new Error(`Invalid or empty code field: ${parsed.code}`);
      }
      
      const debug = {
        prompt: { system: systemPrompt, user: input.userPrompt },
        response: content,
        parsed
      };

      return {
        code: parsed.code,
        name: parsed.name || "Generated Scene",
        duration: parsed.duration || 180,
        reasoning: parsed.reasoning || "Direct code generation",
        debug
      };

    } catch (error) {
      console.error("SceneBuilder direct code generation error:", error);
      
      // Enhanced fallback with user prompt context
      const fallbackCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function GeneratedScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill className="bg-white text-black flex items-center justify-center p-8">
      <div style={{ opacity: fadeIn, fontSize: '32px', fontFamily: 'Inter', textAlign: 'center' }}>
        <h1 className="text-4xl font-bold mb-4">Scene Generation</h1>
        <p className="text-lg text-gray-600">
          Request: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Fallback scene - please try again
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

      return {
        code: fallbackCode,
        name: "Fallback Scene",
        duration: 90,
        reasoning: "Fallback due to generation error",
        debug: { error: String(error) }
      };
    }
  }
}

// Export singleton instance
export const sceneBuilderService = new SceneBuilderService(); 