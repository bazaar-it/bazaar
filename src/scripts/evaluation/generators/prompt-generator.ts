// @ts-nocheck
// src/scripts/evaluation/generators/prompt-generator.ts
import { type AnimationDesignBrief } from "../../../lib/schemas/animationDesignBrief.schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents the metadata for a test case
 */
export interface TestCaseMetadata {
  id: string;
  category: string;
  complexity: number;
  edgeCases: string[];
  createdAt: Date;
}

/**
 * Options for generating test cases
 */
export interface TestGenerationOptions {
  category?: string;
  complexity?: number;
  includeEdgeCases?: boolean;
}

// Animation categories with example prompts
const ANIMATION_CATEGORIES = {
  "Text Animations": [
    "Create a text reveal animation where each letter appears with a fade-in effect",
    "Build a typing effect for the text 'Welcome to Bazaar-Vid'",
    "Design a word-by-word animation where each word flies in from a different direction"
  ],
  "Shape Animations": [
    "Create a morphing shape that transforms from a circle to a square to a triangle",
    "Design spinning geometric objects that rotate at different speeds",
    "Build a pattern formation where small circles arrange into a larger circular pattern"
  ],
  "Transition Effects": [
    "Create a smooth page transition with a slide and fade effect",
    "Build a 3D cube rotation transition between scenes",
    "Design a pixel dissolve transition effect"
  ],
  "Data Visualization": [
    "Create an animated bar chart that grows from bottom to top",
    "Design a pie chart that reveals each slice with a sweep animation",
    "Build a line graph that draws itself from left to right"
  ],
  "Particle Effects": [
    "Create a confetti explosion effect with multicolored particles",
    "Design a spiral particle effect that forms a tornado shape",
    "Build a particle wave that flows across the screen"
  ],
  "Character Animations": [
    "Create a simple walking animation for a stick figure character",
    "Design a bouncing ball character with squash and stretch effects",
    "Build a character with blinking eyes and a breathing animation"
  ]
};

// Edge case types for testing challenging scenarios
const EDGE_CASES = [
  "Long Text",         // Components with unusually long text content
  "Special Characters", // Unicode, emojis, and special symbols
  "High Element Count", // Components with many elements (stress test)
  "Complex Timing",     // Multiple overlapping animation sequences
  "Unusual Dimensions", // Non-standard aspect ratios or sizes
  "Complex Math",       // Animations requiring complex calculations
  "External Assets",    // Components requiring external images/fonts
  "API Integration",    // Components that simulate API usage patterns
  "Complex State"       // Components with complex internal state management
];

/**
 * Generates a set of test prompts for component evaluation
 * @param count Number of test prompts to generate
 * @param options Options for test generation
 * @returns Array of test prompts with metadata
 */
export async function generateTestPrompts(
  count: number,
  options: TestGenerationOptions = {}
): Promise<Array<{ prompt: string; metadata: TestCaseMetadata }>> {
  const testCases = [];
  
  for (let i = 0; i < count; i++) {
    // Select random category or use provided one
    const category = options.category || 
      Object.keys(ANIMATION_CATEGORIES)[Math.floor(Math.random() * Object.keys(ANIMATION_CATEGORIES).length)];
    
    // Select random complexity or use provided one
    const complexity = options.complexity || Math.floor(Math.random() * 5) + 1;
    
    // Select random prompt from category
    const basePrompts = ANIMATION_CATEGORIES[category];
    const basePrompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];
    
    // Add complexity details to prompt
    const prompt = enhancePromptWithComplexity(basePrompt, complexity);
    
    // Add edge cases if requested
    const edgeCases = options.includeEdgeCases ? selectRandomEdgeCases() : [];
    
    // Create test case metadata
    const metadata: TestCaseMetadata = {
      id: uuidv4(),
      category,
      complexity,
      edgeCases,
      createdAt: new Date()
    };
    
    testCases.push({ prompt, metadata });
  }
  
  return testCases;
}

/**
 * Enhances a base prompt with complexity-appropriate details
 */
function enhancePromptWithComplexity(basePrompt: string, complexity: number): string {
  // Start with the base prompt
  let enhancedPrompt = basePrompt;
  
  // Add complexity-specific enhancements
  switch (complexity) {
    case 1: // Simple
      enhancedPrompt += ". Keep it very simple with minimal elements and basic animation.";
      break;
    case 2: // Moderate
      enhancedPrompt += ". Include 3-5 elements with smooth animations and transitions.";
      break;
    case 3: // Complex
      enhancedPrompt += ". Make it visually interesting with 6+ elements and coordinated animations.";
      break;
    case 4: // Advanced
      enhancedPrompt += ". Create multiple animation sequences with precise timing dependencies.";
      break;
    case 5: // Expert
      enhancedPrompt += ". Design an intricate animation with multiple techniques, precise choreography, and interactive elements.";
      break;
    default:
      break;
  }
  
  return enhancedPrompt;
}

/**
 * Selects 1-2 random edge cases to include in a test
 */
function selectRandomEdgeCases(): string[] {
  const count = Math.random() > 0.5 ? 1 : 2;
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const edgeCase = EDGE_CASES[Math.floor(Math.random() * EDGE_CASES.length)];
    if (!selected.includes(edgeCase)) {
      selected.push(edgeCase);
    }
  }
  
  return selected;
}

/**
 * Generates structured AnimationDesignBriefs for testing
 * @param count Number of design briefs to generate
 * @param options Test generation options
 * @returns Array of design briefs with metadata
 */
export async function generateAnimationDesignBriefs(
  count: number,
  options: TestGenerationOptions = {}
): Promise<Array<{ brief: AnimationDesignBrief; metadata: TestCaseMetadata }>> {
  // Generate test prompts first to get categories and complexity
  const testPrompts = await generateTestPrompts(count, options);
  const results = [];
  
  for (const { prompt, metadata } of testPrompts) {
    // Create a basic design brief using the generated prompt
    // This is a simplified version - in practice, you'd use a more
    // sophisticated brief generation based on the AnimationDesignBrief schema
    const brief: AnimationDesignBrief = {
      sceneName: `Test ${metadata.category} (complexity: ${metadata.complexity})`,
      description: prompt,
      elements: [],
      animations: [],
      layout: {
        width: 1920,
        height: 1080,
        backgroundColor: "#ffffff",
        arrangement: "default"
      },
      colorPalette: {
        primary: "#3498db",
        secondary: "#2ecc71",
        accent: "#e74c3c",
        background: "#ffffff",
        text: "#333333"
      },
      typography: {
        heading: {
          fontFamily: "Inter",
          fontSize: 48,
          fontWeight: "bold",
          color: "#333333"
        },
        body: {
          fontFamily: "Inter",
          fontSize: 16,
          fontWeight: "normal",
          color: "#333333"
        }
      },
      audioTracks: []
    };
    
    // Add some basic elements based on category
    if (metadata.category === "Text Animations") {
      brief.elements.push({
        id: "text1",
        type: "text",
        content: "Animated Text",
        position: { x: 960, y: 540 },
        style: {
          fontFamily: "Inter",
          fontSize: 64,
          fontWeight: "bold",
          color: brief.colorPalette.primary,
          opacity: 1
        }
      });
    } else if (metadata.category === "Shape Animations") {
      brief.elements.push({
        id: "shape1",
        type: "shape",
        shapeType: "circle",
        position: { x: 960, y: 540 },
        size: { width: 200, height: 200 },
        style: {
          fill: brief.colorPalette.primary,
          stroke: brief.colorPalette.secondary,
          strokeWidth: 4,
          opacity: 1
        }
      });
    }
    
    // Add a basic animation based on complexity
    const animationDuration = 1000 * metadata.complexity;
    brief.animations.push({
      targetId: brief.elements[0]?.id || "unknown",
      type: metadata.category.includes("Text") ? "fade" : "scale",
      duration: animationDuration,
      easing: "easeInOut",
      delay: 0,
      from: metadata.category.includes("Text") ? { opacity: 0 } : { scale: 0 },
      to: metadata.category.includes("Text") ? { opacity: 1 } : { scale: 1 }
    });
    
    results.push({ brief, metadata });
  }
  
  return results;
}
