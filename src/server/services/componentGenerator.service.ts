// src/server/services/componentGenerator.service.ts
import { customComponentJobs, db } from "~/server/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { processComponentJob } from "~/server/workers/generateComponentCode";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { type AnimationDesignBrief } from "~/lib/schemas/animationDesignBrief.schema";

// Type for the database instance
type DB = typeof db;

/**
 * Component metadata returned from generation process
 */
interface ComponentMetadata {
    durationInFrames?: number;
    fps?: number;
    width?: number;
    height?: number;
    complexity?: number;
}

/**
 * Result of component generation
 */
interface ComponentGenerationResult {
    jobId: string;
    effect: string;
    componentMetadata: ComponentMetadata;
}

/**
 * Generates a Remotion component based on a description and registers it in the database
 * 
 * @param projectId - The project ID the component belongs to
 * @param brief - Animation design brief
 * @param assistantMessageId - ID of the assistant message for status updates
 * @param durationInSeconds - Duration in seconds (default: 6)
 * @param fps - Frames per second (default: 30)
 * @param sceneId - Optional scene ID if part of a scene plan
 * @param userId - The user who initiated the request
 * @param animationDesignBriefId - Optional ID of the animation design brief
 * @returns Component generation result with job ID, effect name, and metadata
 */
export async function generateComponent(
    projectId: string,
    brief: AnimationDesignBrief,
    assistantMessageId: string,
    durationInSeconds: number = 6,
    fps: number = 30,
    sceneId?: string,
    userId?: string,
    animationDesignBriefId?: string
): Promise<ComponentGenerationResult> {
    // Component name from brief, with fallback
    let componentName = brief.sceneName || 'CustomScene'; 
    if (!brief.sceneName || componentName === 'CustomScene' || componentName.length < 4) {
        const nameSuggestion = (brief.scenePurpose || "Unnamed Scene")
            .split(/\s+/)
            .slice(0, 3)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '');
        if (nameSuggestion && nameSuggestion.length >= 4) {
            componentName = nameSuggestion + 'Scene';
        } else {
            componentName = 'DefaultGeneratedScene'; // Ensure a valid fallback
        }
    }
    
    // Sanitize component name to ensure it's a valid JavaScript identifier
    componentName = sanitizeComponentName(componentName);
    
    // Estimate component complexity based on brief content
    const estimatedComplexity = Math.min(1.0, (brief.elements?.length || 1) * 0.05 + (brief.scenePurpose?.length || 0) * 0.002);
    
    // Values from brief, with fallbacks to parameters
    const actualDurationInFrames = brief.durationInFrames || Math.round(durationInSeconds * fps);
    const actualFps = fps; 
    const actualWidth = brief.dimensions.width;
    const actualHeight = brief.dimensions.height;
    
    // Construct Enhanced LLM Prompt from AnimationDesignBrief
    let enhancedDescriptionLines: string[] = [];

    // --- Role and High-Level Instructions ---
    enhancedDescriptionLines.push(`### ROLE: You are an Expert Remotion Developer and Senior React Engineer specializing in syntax-perfect TypeScript/JSX.`);
    enhancedDescriptionLines.push(`### TASK: Create a production-quality Remotion React functional component in TypeScript.`);
    enhancedDescriptionLines.push(`### COMPONENT NAME: '${componentName}'`);
    enhancedDescriptionLines.push(`### OBJECTIVE: Generate a component that precisely implements the provided AnimationDesignBrief with professional animations and visual effects.`);
    enhancedDescriptionLines.push(`### VIDEO CONFIG: Target video is ${actualWidth}x${actualHeight}px, ${actualDurationInFrames} frames total duration, at ${actualFps} FPS.`);
    
    // --- Critical Syntax Requirements ---
    enhancedDescriptionLines.push(`### SYNTAX REQUIREMENTS - FOLLOW EXACTLY:`);
    enhancedDescriptionLines.push(`- The FIRST line MUST be: // src/remotion/components/scenes/${componentName}.tsx`);
    enhancedDescriptionLines.push(`- NEVER declare the same variable twice (e.g., 'const frame = useCurrentFrame()' should appear only ONCE)`);
    enhancedDescriptionLines.push(`- ALWAYS properly close all JSX tags (use self-closing tags for elements like <img />, <path />, etc.)`);
    enhancedDescriptionLines.push(`- ESCAPE any HTML/XML inside string literals using &lt; and &gt; instead of < and >`);
    enhancedDescriptionLines.push(`- ENSURE the component has 'export default ${componentName}' at the end`);
    enhancedDescriptionLines.push(`- VERIFY all opening and closing brackets/braces match properly`);

    // --- Examples of Correct Syntax ---
    enhancedDescriptionLines.push(`### EXAMPLES OF PROPER SYNTAX:`);
    enhancedDescriptionLines.push(`// Correct - Single declaration of hooks at the beginning`);
    enhancedDescriptionLines.push(`const frame = useCurrentFrame();`);
    enhancedDescriptionLines.push(`const { width, height, fps, durationInFrames } = useVideoConfig();`);
    enhancedDescriptionLines.push(`// Correct - Properly escaped HTML in strings`);
    enhancedDescriptionLines.push(`const svgMarkup = "&lt;circle cx='50' cy='50' r='40'/&gt;";`);
    enhancedDescriptionLines.push(`// Correct - Properly closed JSX tags`);
    enhancedDescriptionLines.push(`return (`);
    enhancedDescriptionLines.push(`  <div>`);
    enhancedDescriptionLines.push(`    <circle cx={50} cy={50} r={40} />`);
    enhancedDescriptionLines.push(`  </div>`);
    enhancedDescriptionLines.push(`);`);

    // --- Common Errors to Avoid ---
    enhancedDescriptionLines.push(`### COMMON ERRORS TO AVOID:`);
    enhancedDescriptionLines.push(`// ERROR: Redeclaring frame variable`);
    enhancedDescriptionLines.push(`const frame = useCurrentFrame();`);
    enhancedDescriptionLines.push(`// Later in the code... DON'T DO THIS:`);
    enhancedDescriptionLines.push(`const frame = useCurrentFrame(); // Error: 'frame' already declared`);
    enhancedDescriptionLines.push(`// ERROR: Unescaped HTML in strings`);
    enhancedDescriptionLines.push(`const svgMarkup = "<circle cx='50' cy='50' r='40'/>"; // Use &lt; and &gt; instead`);
    enhancedDescriptionLines.push(`// ERROR: Unclosed JSX tags`);
    enhancedDescriptionLines.push(`return (`);
    enhancedDescriptionLines.push(`  <div>`);
    enhancedDescriptionLines.push(`    <circle cx={50} cy={50} r={40}> // Missing closing tag or self-close`);
    enhancedDescriptionLines.push(`  </div>`);
    enhancedDescriptionLines.push(`);`);

    // --- Original Mandatory Requirements ---
    enhancedDescriptionLines.push(`### MANDATORY REQUIREMENTS:`);
    enhancedDescriptionLines.push(`- The component MUST be a functional component using TypeScript (.tsx).`);
    enhancedDescriptionLines.push(`- ALWAYS use the Remotion hooks: useCurrentFrame() and useVideoConfig() for timing and dimensions.`);
    enhancedDescriptionLines.push(`- Component MUST accept props: { brief: AnimationDesignBrief } (assume this type is imported).`);
    enhancedDescriptionLines.push(`- Utilize appropriate Remotion animation functions based on each element's needs:`);
    enhancedDescriptionLines.push(`  * interpolate() - For smooth linear or eased transitions between values`);
    enhancedDescriptionLines.push(`  * spring() - For physics-based, bouncy animations`);
    enhancedDescriptionLines.push(`  * Easing module - For specifying animation curves (easeInOut, bezier, etc.)`);
    enhancedDescriptionLines.push(`- Use Remotion timing components when needed:`);
    enhancedDescriptionLines.push(`  * <Sequence from={startFrame} durationInFrames={duration}> - For sequential animations`);
    enhancedDescriptionLines.push(`  * <Series> - For orchestrating complex animation sequences`);
    enhancedDescriptionLines.push(`  * <Loop> - For repeating animations`);
    enhancedDescriptionLines.push(`- Apply absolute positioning based on initialLayout coordinates.`);
    
    // --- Boilerplate Structure Guide ---
    enhancedDescriptionLines.push(`\n### BOILERPLATE STRUCTURE (Follow this pattern):`);
    enhancedDescriptionLines.push(`\`\`\`typescript`);
    enhancedDescriptionLines.push(`// src/remotion/components/scenes/${componentName}.tsx`);
    enhancedDescriptionLines.push(`import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, Audio } from 'remotion';`);
    enhancedDescriptionLines.push(`import React from 'react';`);
    enhancedDescriptionLines.push(`// import { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';`);
    enhancedDescriptionLines.push(``);
    enhancedDescriptionLines.push(`export const ${componentName}: React.FC<{ brief: AnimationDesignBrief }> = ({ brief }) => {`);
    enhancedDescriptionLines.push(`  const frame = useCurrentFrame();`);
    enhancedDescriptionLines.push(`  const { fps, width, height, durationInFrames } = useVideoConfig();`);
    enhancedDescriptionLines.push(``);
    enhancedDescriptionLines.push(`  // Extract key brief properties`);
    enhancedDescriptionLines.push(`  const { elements, colorPalette, typography, overallStyle } = brief;`);
    enhancedDescriptionLines.push(``);
    enhancedDescriptionLines.push(`  // Define background color from brief`);
    enhancedDescriptionLines.push(`  const backgroundColor = colorPalette?.background || 'transparent';`);
    enhancedDescriptionLines.push(``);
    enhancedDescriptionLines.push(`  return (`);
    enhancedDescriptionLines.push(`    <AbsoluteFill style={{ backgroundColor }}>`);
    enhancedDescriptionLines.push(`      {/* Render each element with its animations */}`);
    enhancedDescriptionLines.push(`    </AbsoluteFill>`);
    enhancedDescriptionLines.push(`  );`);
    enhancedDescriptionLines.push(`};`);
    enhancedDescriptionLines.push(`\`\`\``);

    enhancedDescriptionLines.push("\n--- Scene Overview ---");
    enhancedDescriptionLines.push(`Scene Name: ${brief.sceneName || componentName}`);
    enhancedDescriptionLines.push(`Purpose: ${brief.scenePurpose || 'N/A'}`);
    enhancedDescriptionLines.push(`Overall Style: ${brief.overallStyle || 'N/A'}`);
    if (brief.notes) {
        enhancedDescriptionLines.push(`Designer Notes: ${brief.notes}`);
    }

    if (brief.colorPalette) {
        enhancedDescriptionLines.push("\n--- Color Palette ---");
        const { primary, secondary, accent, background, textPrimary, textSecondary, customColors } = brief.colorPalette;
        if (primary) enhancedDescriptionLines.push(`- Primary Color: ${primary}`);
        if (secondary) enhancedDescriptionLines.push(`- Secondary Color: ${secondary}`);
        if (accent) enhancedDescriptionLines.push(`- Accent Color: ${accent}`);
        if (background) enhancedDescriptionLines.push(`- Background Color: ${background}`);
        if (textPrimary) enhancedDescriptionLines.push(`- Text Primary Color: ${textPrimary}`);
        if (textSecondary) enhancedDescriptionLines.push(`- Text Secondary Color: ${textSecondary}`);
        if (customColors && typeof customColors === 'object' && Object.keys(customColors).length > 0) {
            enhancedDescriptionLines.push("- Custom Colors:");
            Object.entries(customColors).forEach(([name, value]: [string, string]) => enhancedDescriptionLines.push(`  - ${name}: ${value}`));
        }
    }

    if (brief.typography) {
        enhancedDescriptionLines.push("\n--- Typography ---");
        const { defaultFontFamily, heading1 } = brief.typography;
        if (defaultFontFamily) {
            enhancedDescriptionLines.push(`- Default Font Family: ${defaultFontFamily}`);
        }
        // Example for a specific style like heading1 - adapt for others if their schema path is known
        if (heading1 && typeof heading1 === 'object') {
            enhancedDescriptionLines.push("- Heading1 Style:");
            if (heading1.fontFamily) enhancedDescriptionLines.push(`  - Font Family: ${heading1.fontFamily}`);
            if (heading1.fontSize) enhancedDescriptionLines.push(`  - Font Size: ${heading1.fontSize}`);
            if (heading1.fontWeight) enhancedDescriptionLines.push(`  - Font Weight: ${heading1.fontWeight}`);
            if (heading1.lineHeight) enhancedDescriptionLines.push(`  - Line Height: ${heading1.lineHeight}`);
            if (heading1.letterSpacing) enhancedDescriptionLines.push(`  - Letter Spacing: ${heading1.letterSpacing}`);
            if (heading1.color) enhancedDescriptionLines.push(`  - Color: ${heading1.color}`);
        }
        // Add similar blocks for bodyText, captionText if their structure is known and needed
    }

    // --- Scene Elements & Animations Translation Guide ---
    enhancedDescriptionLines.push(`\n### ELEMENT-BY-ELEMENT IMPLEMENTATION GUIDE:`);
    enhancedDescriptionLines.push(`Each element from the AnimationDesignBrief must be translated into React/Remotion code following these guidelines:`);
    
    // Add important restriction about images
    enhancedDescriptionLines.push(`\n### IMPORTANT RESTRICTION - NO EXTERNAL ASSETS:`);
    enhancedDescriptionLines.push(`- DO NOT reference or try to load any external images, videos, or other media files`);
    enhancedDescriptionLines.push(`- DO NOT use the <Img> component from Remotion to load any image files`);
    enhancedDescriptionLines.push(`- If the AnimationDesignBrief mentions image elements, implement them as:`);
    enhancedDescriptionLines.push(`  * Colored rectangles or circles using <div> with backgroundColor and borderRadius`);
    enhancedDescriptionLines.push(`  * SVG graphics created programmatically (rectangles, circles, paths)`);
    enhancedDescriptionLines.push(`  * CSS gradients for more visual interest`);
    enhancedDescriptionLines.push(`- Focus ONLY on animations, shapes, text elements, and colors`);
    enhancedDescriptionLines.push(`- This temporary restriction ensures component reliability while asset management is being developed`);
    
    // ElementType to JSX/DOM Translation Guide
    enhancedDescriptionLines.push(`\n#### ELEMENT TYPE TRANSLATION:`);
    enhancedDescriptionLines.push(`- 'text' → Use a <div> or <h1>-<h6> with appropriate styling`);
    enhancedDescriptionLines.push(`- 'image' → DO NOT USE <Img>. Instead, use a <div> with solid background color or gradient`);
    enhancedDescriptionLines.push(`- 'video' → DO NOT USE <Video>. Instead, use animated <div> elements`);
    enhancedDescriptionLines.push(`- 'shape' → Use appropriate shape elements (div with border-radius for circles/rounded rectangles, SVG for complex shapes)`);
    enhancedDescriptionLines.push(`- 'container' → Use a positioned <div> that may contain child elements`);
    
    // Layout Translation Guide
    enhancedDescriptionLines.push(`\n#### INITIAL LAYOUT TRANSLATION:`);
    enhancedDescriptionLines.push(`All initialLayout properties MUST be translated to React inline styles:`);
    enhancedDescriptionLines.push(`- 'x', 'y' → style={{ position: 'absolute', left: x, top: y }}`); 
    enhancedDescriptionLines.push(`- 'width', 'height' → style={{ width, height }}`); 
    enhancedDescriptionLines.push(`- 'opacity' → style={{ opacity }}`); 
    enhancedDescriptionLines.push(`- 'rotation' → style={{ transform: \`rotate(\${rotation}deg)\` }}`); 
    enhancedDescriptionLines.push(`- 'scale' → style={{ transform: \`scale(\${scale})\` }}`); 
    enhancedDescriptionLines.push(`- 'zIndex' → style={{ zIndex }}`); 
    enhancedDescriptionLines.push(`- Multiple transforms should be combined: transform: \`rotate(\${rotation}deg) scale(\${scale})\``); 
    
    // Animation Translation Guide
    enhancedDescriptionLines.push(`\n#### ANIMATION IMPLEMENTATION:`);
    enhancedDescriptionLines.push(`For each animation, use this approach:`);
    enhancedDescriptionLines.push(`1. Calculate the active animation frames based on delayInFrames and durationInFrames:`);
    enhancedDescriptionLines.push(`   const animStartFrame = animation.delayInFrames || 0;`);
    enhancedDescriptionLines.push(`   const animEndFrame = animStartFrame + (animation.durationInFrames || 30);`);
    
    enhancedDescriptionLines.push(`2. Apply the appropriate Remotion animation function:`);
    enhancedDescriptionLines.push(`   - For 'spring' animations or when remotionFunctionHint is 'spring':`);
    enhancedDescriptionLines.push(`     const animatedValue = spring({`);
    enhancedDescriptionLines.push(`       frame: frame - animStartFrame,`);
    enhancedDescriptionLines.push(`       fps,`);
    enhancedDescriptionLines.push(`       from: property.from,`);
    enhancedDescriptionLines.push(`       to: property.to,`);
    enhancedDescriptionLines.push(`       config: property.springConfig || { damping: 10, mass: 1, stiffness: 100 }`);
    enhancedDescriptionLines.push(`     });`);
    
    enhancedDescriptionLines.push(`   - For most other animations, use interpolate:`);
    enhancedDescriptionLines.push(`     const animatedValue = interpolate(`);
    enhancedDescriptionLines.push(`       frame,`);
    enhancedDescriptionLines.push(`       [animStartFrame, animEndFrame],`);
    enhancedDescriptionLines.push(`       [property.from, property.to],`);
    enhancedDescriptionLines.push(`       {`);
    enhancedDescriptionLines.push(`         extrapolateLeft: 'clamp',`);
    enhancedDescriptionLines.push(`         extrapolateRight: 'clamp',`);
    enhancedDescriptionLines.push(`         easing: determineEasing(animation.easing)`);
    enhancedDescriptionLines.push(`       }`);
    enhancedDescriptionLines.push(`     );`);
    
    enhancedDescriptionLines.push(`3. Apply animated values to style properties:`);
    enhancedDescriptionLines.push(`   - For transform properties (e.g., 'transform.translateX', 'transform.scale'):`);
    enhancedDescriptionLines.push(`     Extract the specific transform type and apply with appropriate units.`);
    enhancedDescriptionLines.push(`   - For standard CSS properties (e.g., 'opacity'):`);
    enhancedDescriptionLines.push(`     Apply directly to the style object.`);
    enhancedDescriptionLines.push(`   - Example: style={{ opacity: animatedOpacity, transform: \`translateX(\${animatedX}px) scale(\${animatedScale})\` }}`);
    
    enhancedDescriptionLines.push(`4. For sequence-based timing (startAfter, startWith):`);
    enhancedDescriptionLines.push(`   - Wrap elements in <Sequence> components with appropriate 'from' and 'durationInFrames' props`);
    enhancedDescriptionLines.push(`   - Use 'from' attribute based on animation.delayInFrames`);
    enhancedDescriptionLines.push(`   - Example: <Sequence from={30} durationInFrames={60}>...</Sequence>`);
    
    // Actual Brief Elements Review
    enhancedDescriptionLines.push(`\n### SPECIFIC ELEMENTS TO IMPLEMENT:`);
    if (brief.elements && brief.elements.length > 0) {
        brief.elements.forEach((element, index) => {
            enhancedDescriptionLines.push(`\n#### ELEMENT ${index + 1}: ${element.elementId} (${element.elementType})`);
            
            // Content
            if (element.content) {
                const contentValue = typeof element.content === 'string' || typeof element.content === 'number' 
                    ? element.content 
                    : JSON.stringify(element.content);
                enhancedDescriptionLines.push(`- Content: ${contentValue}`);
            }
            
            // Layout
            if (element.initialLayout) {
                enhancedDescriptionLines.push(`- Initial Layout (CSS equivalent):`); 
                const layout = element.initialLayout;
                
                // Build a sample style object string to demonstrate correct implementation
                let styleObjectExample = 'style={{ ';
                const styleProperties: string[] = [];
                
                if (layout.x !== undefined) {
                    enhancedDescriptionLines.push(`  * x: ${layout.x}${typeof layout.x === 'number' ? 'px' : ''}`);
                    styleProperties.push(`position: 'absolute'`, `left: ${layout.x}${typeof layout.x === 'number' ? 'px' : ''}`);
                }
                
                if (layout.y !== undefined) {
                    enhancedDescriptionLines.push(`  * y: ${layout.y}${typeof layout.y === 'number' ? 'px' : ''}`);
                    if (!styleProperties.includes(`position: 'absolute'`)) {
                        styleProperties.push(`position: 'absolute'`);
                    }
                    styleProperties.push(`top: ${layout.y}${typeof layout.y === 'number' ? 'px' : ''}`);
                }
                
                if (layout.width !== undefined) {
                    enhancedDescriptionLines.push(`  * width: ${layout.width}${typeof layout.width === 'number' ? 'px' : ''}`);
                    styleProperties.push(`width: ${layout.width}${typeof layout.width === 'number' ? 'px' : ''}`);
                }
                
                if (layout.height !== undefined) {
                    enhancedDescriptionLines.push(`  * height: ${layout.height}${typeof layout.height === 'number' ? 'px' : ''}`);
                    styleProperties.push(`height: ${layout.height}${typeof layout.height === 'number' ? 'px' : ''}`);
                }
                
                if (layout.opacity !== undefined) {
                    enhancedDescriptionLines.push(`  * opacity: ${layout.opacity}`);
                    styleProperties.push(`opacity: ${layout.opacity}`);
                }
                
                // Handle transform properties
                // Explicitly type with string[] to avoid 'never' type inference
                const transformProps: string[] = [];
                if (layout.rotation !== undefined) {
                    enhancedDescriptionLines.push(`  * rotation: ${layout.rotation}deg`);
                    transformProps.push(`rotate(${layout.rotation}deg)`);
                }
                
                if (layout.scale !== undefined) {
                    enhancedDescriptionLines.push(`  * scale: ${layout.scale}`);
                    transformProps.push(`scale(${layout.scale})`);
                }
                
                if (transformProps.length > 0) {
                    styleProperties.push(`transform: '${transformProps.join(' ')}'`);
                }
                
                if (layout.zIndex !== undefined) {
                    enhancedDescriptionLines.push(`  * zIndex: ${layout.zIndex}`);
                    styleProperties.push(`zIndex: ${layout.zIndex}`);
                }
                
                if (layout.backgroundColor) {
                    enhancedDescriptionLines.push(`  * backgroundColor: ${layout.backgroundColor}`);
                    styleProperties.push(`backgroundColor: '${layout.backgroundColor}'`);
                }
                
                styleObjectExample += styleProperties.join(', ') + ' }}';
                enhancedDescriptionLines.push(`- React style equivalent: ${styleObjectExample}`);
            }
            
            // Animations with detailed implementation hints
            if (element.animations && element.animations.length > 0) {
                enhancedDescriptionLines.push(`\n- Animations for ${element.elementId}:`);
                element.animations.forEach((animation, animIndex) => {
                    enhancedDescriptionLines.push(`  * Animation ${animIndex + 1}: ${animation.animationType}`);
                    
                    // Duration and timing
                    const durationFrames = animation.durationInFrames || 30;
                    const delayFrames = animation.delayInFrames || 0;
                    
                    enhancedDescriptionLines.push(`    - Start frame: ${delayFrames}`);
                    enhancedDescriptionLines.push(`    - Duration: ${durationFrames} frames`);
                    enhancedDescriptionLines.push(`    - End frame: ${delayFrames + durationFrames}`);
                    
                    // Easing
                    if (animation.easing) {
                        let easingImplementation;
                        // Need to cast animation.easing to handle it properly without TypeScript errors
                        const easingValue = animation.easing;
                        
                        if (typeof easingValue === 'string') {
                            const normalizedEasing = easingValue.replace(/-/g, '');
                            easingImplementation = `Easing.${normalizedEasing}`;
                        } else if (Array.isArray(easingValue)) {
                            // Safely handle array type with proper casting
                            const easingArray = easingValue as number[];
                            if (easingArray.length === 4) {
                                easingImplementation = `Easing.bezier(${easingArray.join(', ')})`;
                            } else {
                                easingImplementation = 'Easing.linear';
                            }
                        } else {
                            easingImplementation = 'Easing.linear';
                        }
                        enhancedDescriptionLines.push(`    - Easing: ${animation.easing} → Implement as: ${easingImplementation}`);
                    }
                    
                    // Remotion function hint - using type guard for safety
                    if ('remotionFunctionHint' in animation && (animation as any).remotionFunctionHint) {
                        const functionHint = (animation as any).remotionFunctionHint;
                        enhancedDescriptionLines.push(`    - Suggested Remotion function: ${functionHint}`);
                        enhancedDescriptionLines.push(`    - IMPORTANT: Prioritize using this function when implementing this animation.`);
                    }
                    
                    // Animated properties with implementation hints
                    if (animation.propertiesAnimated && animation.propertiesAnimated.length > 0) {
                        enhancedDescriptionLines.push(`    - Properties to animate:`);
                        animation.propertiesAnimated.forEach(prop => {
                            enhancedDescriptionLines.push(`      • ${prop.property}: from ${JSON.stringify(prop.from)} to ${JSON.stringify(prop.to)}`);
                            
                            // Implementation hint based on property type and animation type
                            // Note: Using type guards and safe access to avoid TypeScript errors
                            // since these may be extensible properties not in the original schema
                            const animationTypeStr = animation.animationType || '';
                            const remotionHint = 'remotionFunctionHint' in animation ? 
                              (animation as any).remotionFunctionHint as string | undefined : undefined;
                            
                            const useSpring = 
                              (remotionHint?.toLowerCase()?.includes('spring')) || 
                              animationTypeStr.toLowerCase().includes('spring');
                            
                            let implementationHint;
                            if (useSpring) {
                                // Spring animation hint - safely construct spring config
                                // without assuming properties exist
                                const springConfigObj = 'springConfig' in prop ? (prop as any).springConfig : null;
                                const springConfig = springConfigObj ? 
                                  `{damping: ${(springConfigObj as any).damping || 10}, stiffness: ${(springConfigObj as any).stiffness || 100}, mass: ${(springConfigObj as any).mass || 1}}` :
                                  '{damping: 10, stiffness: 100, mass: 1}';
                                  
                                implementationHint = `const ${prop.property.replace('.', '')}Value = spring({ 
          frame: frame - ${delayFrames}, 
          fps, 
          from: ${JSON.stringify(prop.from)}, 
          to: ${JSON.stringify(prop.to)}, 
          config: ${springConfig} 
        })`;
                            } else {
                                // Interpolate animation hint
                                implementationHint = `const ${prop.property.replace('.', '')}Value = interpolate(
          frame, 
          [${delayFrames}, ${delayFrames + durationFrames}], 
          [${JSON.stringify(prop.from)}, ${JSON.stringify(prop.to)}], 
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ${animation.easing ? `Easing.${animation.easing.replace(/-/g, '')}` : 'Easing.linear'} }
        );`;
                            }
                            
                            enhancedDescriptionLines.push(`        Implementation: \`${implementationHint}\``);
                        });
                    }
                });
            }
        });
    } else {
        enhancedDescriptionLines.push(`No specific elements detailed in the brief. Create a visually appealing scene based on the purpose and style, using the boilerplate structure and Remotion best practices outlined above.`);
    }
    
    // --- Final Instructions and Best Practices ---
    enhancedDescriptionLines.push(`\n### SEQUENCE ORCHESTRATION & TIMING GUIDELINES:`);
    enhancedDescriptionLines.push(`When implementing multiple animations, carefully orchestrate them to match the design intent:`);
    enhancedDescriptionLines.push(`1. Use <Sequence> components for elements or animations that should start at specific frames.`);
    enhancedDescriptionLines.push(`   Example: <Sequence from={30} durationInFrames={60}><YourAnimatedElement /></Sequence>`);
    
    enhancedDescriptionLines.push(`2. For animation dependencies between elements (animations that must follow others):`);
    enhancedDescriptionLines.push(`   - Create a timing map that respects trigger values like 'afterPrevious' by calculating startFrames.`);
    enhancedDescriptionLines.push(`   - Example: const titleExitFrame = titleStartFrame + titleDuration;`);
    enhancedDescriptionLines.push(`             const subTitleStartFrame = titleExitFrame; // Starting after title exits`);
    
    if (brief.audioTracks && brief.audioTracks.length > 0) {
        enhancedDescriptionLines.push(`\n### AUDIO IMPLEMENTATION:`);
        enhancedDescriptionLines.push(`This scene includes the following audio track(s) to implement:`);
        
        brief.audioTracks.forEach((audio, index) => {
            // Use the correct property names based on the actual schema
            enhancedDescriptionLines.push(`- Audio ${index + 1}: ${audio.trackId || 'Background Audio'}`);
            if (audio.url) enhancedDescriptionLines.push(`  - Source: ${audio.url}`);
            if (audio.startAtFrame !== undefined) enhancedDescriptionLines.push(`  - Start at frame: ${audio.startAtFrame}`);
            // durationInFrames might not be available, so we don't check for it
            if (audio.loop) enhancedDescriptionLines.push(`  - Loop: ${audio.loop}`);
            if (audio.volume !== undefined) enhancedDescriptionLines.push(`  - Volume: ${audio.volume}`);
            enhancedDescriptionLines.push(`  - Implementation: <Audio src={${JSON.stringify(audio.url)}} startFrom={${audio.startAtFrame || 0}} volume={${audio.volume || 1}} ${audio.loop ? 'loop' : ''}/>`);
        });
    }
    
    // Add code quality, performance, and accessibility guidelines
    enhancedDescriptionLines.push(`\n### CODE QUALITY & PERFORMANCE GUIDELINES:`);
    enhancedDescriptionLines.push(`1. MODULARITY: For complex elements, consider creating sub-components.`);
    enhancedDescriptionLines.push(`2. PERFORMANCE: Minimize DOM nodes - prefer CSS transforms over creating new elements.`);
    enhancedDescriptionLines.push(`3. MEMOIZATION: Use React.useMemo() for computationally expensive calculations.`);
    enhancedDescriptionLines.push(`4. TYPING: Provide proper TypeScript types throughout, including for style objects.`);
    enhancedDescriptionLines.push(`5. COMMENTS: Add brief comments for complex animation logic or calculations.`);
    enhancedDescriptionLines.push(`6. ORGANIZATION: Group related animations and separate distinct animation phases.`);
    enhancedDescriptionLines.push(`7. ERROR HANDLING: Include defensive checks for potentially undefined values.`);

    // Most important reminder about using the exact brief values
    enhancedDescriptionLines.push(`\n### CRITICAL REMINDER:`);
    enhancedDescriptionLines.push(`- PRECISELY follow the AnimationDesignBrief's specifications.`);
    enhancedDescriptionLines.push(`- RESPECT the timing, durations, and easing specified in the brief.`);
    enhancedDescriptionLines.push(`- IMPLEMENT ALL elements and animations exactly as detailed above.`);
    enhancedDescriptionLines.push(`- START with the boilerplate structure provided earlier.`);
    enhancedDescriptionLines.push(`- REMEMBER the first line MUST be: // src/remotion/components/scenes/${componentName}.tsx`);

    const enhancedDescription = enhancedDescriptionLines.join('\n');

    // Generate unique ID for this job
    const jobId = uuidv4();
    
    // Add the job to the database
    const jobData = {
        prompt: enhancedDescription, 
        componentName,
        durationInFrames: actualDurationInFrames,
        fps: actualFps,
        width: actualWidth, 
        height: actualHeight, 
        projectId,
        sceneId: brief.sceneId, // Use sceneId from brief
        animationDesignBriefId: animationDesignBriefId, // Store brief ID
        // If we have a userId, include it for analytics/tracking
        userData: userId ? { userId } : undefined
    };

    console.log(`[ComponentGenerator] Job ${jobId} - Incoming brief/prompt for LLM:`, JSON.stringify(jobData.prompt, null, 2));

    // Insert the job record
    const [job] = await db.insert(customComponentJobs).values({
        id: jobId,
        projectId: projectId,
        effect: componentName,
        statusMessageId: assistantMessageId,
        status: "queued_for_generation",
        metadata: jobData
    }).returning();

    console.log(`Created component generation job: ${jobId} for ${componentName} with status 'queued_for_generation'`);

    // Start generating the code (don't await - this happens asynchronously)
    // This will update the job status when complete
    processComponentJob({
        id: jobId,
        name: componentName,
        prompt: enhancedDescription,
        // Convert brief to string if it exists to match the expected types
        variation: animationDesignBriefId ? JSON.stringify(brief) : undefined 
    })
        .catch(error => {
            console.error(`Error generating component code for job ${jobId}:`, error);
        });

    // Return immediately with the job ID and other metadata
    // This allows the chat experience to continue while generation happens in background
    return {
        jobId,
        effect: componentName,
        componentMetadata: {
            durationInFrames: actualDurationInFrames,
            fps: actualFps,
            width: actualWidth,
            height: actualHeight,
            complexity: estimatedComplexity
        }
    };
}

/**
 * Updates the status of a component generation job
 * 
 * @param jobId - ID of the job to update
 * @param status - New status value
 * @param db - Database connection
 * @param outputUrl - Optional URL to the compiled output
 * @param errorMessage - Optional error message if status is 'error'
 */
export async function updateComponentStatus(
    jobId: string,
    status: 'pending' | 'building' | 'success' | 'error',
    dbInstance: DB = db,
    outputUrl?: string,
    errorMessage?: string
): Promise<void> {
    await dbInstance.update(customComponentJobs)
        .set({ 
            status,
            ...(outputUrl ? { outputUrl } : {}),
            ...(errorMessage ? { errorMessage } : {}),
            updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, jobId));
}

/**
 * Sanitizes a component name to ensure it's a valid JavaScript identifier
 * - Cannot start with a number
 * - Can only contain letters, numbers, $ and _
 */
function sanitizeComponentName(name: string): string {
    if (!name) return 'CustomScene';
    
    // Remove any invalid characters
    let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, '');
    
    // If it starts with a number, prefix with "Scene"
    if (/^[0-9]/.test(sanitized)) {
        sanitized = `Scene${sanitized}`;
    }
    
    // Ensure it's not empty
    if (!sanitized) {
        sanitized = 'CustomScene';
    }
    
    return sanitized;
} 