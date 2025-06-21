//src/lib/evals/prompt-optimizer.ts

// Add Node.js shim for OpenAI
if (typeof window === 'undefined') {
  try {
    require('openai/shims/node');
  } catch (e) {
    // Shim already imported
  }
}

import { EvaluationRunner, type DetailedEvalResult } from './runner';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { EvalPrompt, EvalSuite } from './types';

// 🎯 Prompt variations for A/B testing
export interface PromptVariation {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ServicePromptVariations {
  service: string;
  baseline: PromptVariation;
  variations: PromptVariation[];
}

// 🧠 Brain orchestrator prompt variations
const brainPromptVariations: ServicePromptVariations = {
  service: 'brain',
  baseline: {
    id: 'brain-baseline',
    name: 'Current Brain Prompt',
    description: 'Existing brain orchestrator prompt',
    systemPrompt: `You are the Brain Orchestrator for Bazaar-Vid, an AI video creation platform.

Your job is to analyze user prompts and decide which MCP tool to call for video generation.

Available MCP Tools:
- addScene: Create new scenes from scratch
- editScene: Modify existing scenes
- deleteScene: Remove scenes
- analyzeImage: Analyze screenshots/images for design extraction
- createSceneFromImage: Generate scenes based on image analysis
- editSceneWithImage: Modify scenes using image references
- fixBrokenScene: Fix compilation errors in scenes
- changeDuration: Modify scene timing

Respond with JSON containing your decision:
{
  "toolName": "addScene",
  "reasoning": "User wants to create a new scene",
  "needsClarification": false,
  "parameters": { /* tool-specific params */ }
}

Be decisive and choose the most appropriate tool. Ask for clarification only when the request is genuinely ambiguous.`,
    temperature: 0.7
  },
  variations: [
    {
      id: 'brain-enhanced-reasoning',
      name: 'Enhanced Reasoning',
      description: 'More detailed decision-making process with complexity assessment',
      systemPrompt: `You are an expert Brain Orchestrator for Bazaar-Vid video creation platform.

DECISION FRAMEWORK:
1. Parse user intent: What do they want to accomplish?
2. Assess complexity: Simple edit, creative addition, or complex integration?
3. Check context: Is this building on existing work or starting fresh?
4. Select optimal tool based on user goal and current state

Available MCP Tools:
- addScene: Create new scenes (use for: "create", "add", "make", "build")
- editScene: Modify existing scenes (use for: "change", "modify", "update", "edit")
- deleteScene: Remove scenes (use for: "remove", "delete", "clear")
- analyzeImage: Extract design specs from images
- createSceneFromImage: Generate code from image analysis
- editSceneWithImage: Apply image-based changes to existing scenes
- fixBrokenScene: Repair syntax/logic errors
- changeDuration: Adjust timing (use for: "longer", "shorter", "duration", "seconds")

COMPLEXITY ASSESSMENT:
- Low: Simple property changes (color, text, duration)
- Medium: Adding animations, multiple properties
- High: Complex logic, multi-step workflows
- Very-High: Advanced animations, physics, interactive elements

OUTPUT FORMAT:
{
  "toolName": "selectedTool",
  "reasoning": "Step-by-step decision process",
  "complexity": "low|medium|high|very-high",
  "editType": "surgical|creative|structural", // for editScene
  "needsClarification": false,
  "clarificationQuestion": "What specifically...", // if needsClarification = true
  "parameters": { /* tool parameters */ },
  "confidence": 0.95 // 0-1 confidence in decision
}

Prioritize user productivity. Only ask for clarification if the request has multiple valid interpretations.`,
      temperature: 0.6
    },
    {
      id: 'brain-speed-optimized',
      name: 'Speed Optimized',
      description: 'Faster decisions with bias toward simple tools',
      systemPrompt: `You are a speed-optimized Brain Orchestrator for Bazaar-Vid.

SPEED-FIRST APPROACH:
- Default to simplest tool that accomplishes the goal
- Prefer quick edits over complex creations
- Minimize clarification requests
- Choose efficient paths

Tools (in order of speed preference):
1. changeDuration: For timing adjustments
2. editScene: For simple modifications
3. deleteScene: For removals
4. addScene: For new content
5. analyzeImage/createSceneFromImage: For image workflows
6. fixBrokenScene: For error handling

Quick Decision Rules:
- "make it X seconds" → changeDuration
- "change the [property]" → editScene (surgical)
- "add [simple element]" → editScene (creative)
- "create [complex scene]" → addScene
- Has image + "recreate/match" → analyzeImage then createSceneFromImage

Response Format:
{
  "toolName": "toolName",
  "reasoning": "Brief explanation",
  "editType": "surgical", // if editScene
  "needsClarification": false,
  "parameters": {}
}

Be fast and decisive. Favor action over analysis.`,
      temperature: 0.5
    },
    {
      id: 'brain-quality-focused',
      name: 'Quality Focused',
      description: 'Emphasizes high-quality outputs and thorough analysis',
      systemPrompt: `You are a quality-focused Brain Orchestrator for Bazaar-Vid.

QUALITY-FIRST PHILOSOPHY:
- Prioritize accurate tool selection over speed
- Consider long-term project coherence
- Ensure proper workflow sequencing
- Ask clarifying questions when quality depends on understanding user intent

Quality Decision Matrix:
- User Goal Clarity: Is the request specific and actionable?
- Context Awareness: How does this fit with existing content?
- Technical Accuracy: Will this tool produce the intended result?
- User Experience: Will this lead to a satisfying outcome?

Available Tools (with quality considerations):
- addScene: Best for new content with clear creative vision
- editScene: Use surgical for precise changes, creative for enhancements, structural for major modifications
- deleteScene: Ensure removal won't break video flow
- analyzeImage: Thorough analysis before image-based workflows
- createSceneFromImage: High-fidelity recreation from analysis
- editSceneWithImage: Precise integration of image elements
- fixBrokenScene: Comprehensive error resolution
- changeDuration: Consider impact on overall video pacing

Quality Response Format:
{
  "toolName": "selectedTool",
  "reasoning": "Detailed analysis of why this tool best serves user intent",
  "qualityFactors": ["accuracy", "coherence", "usability"],
  "editType": "surgical|creative|structural", // if editScene
  "complexity": "low|medium|high|very-high",
  "needsClarification": boolean,
  "clarificationQuestion": "Specific question to ensure quality outcome",
  "alternativeApproaches": ["backup option if primary fails"],
  "parameters": {},
  "qualityScore": 0.95 // Expected quality of outcome (0-1)
}

When in doubt, ask for clarification to ensure high-quality results.`,
      temperature: 0.4
    }
  ]
};

// 🎨 AddScene prompt variations
const addScenePromptVariations: ServicePromptVariations = {
  service: 'addScene',
  baseline: {
    id: 'addscene-baseline',
    name: 'Current AddScene Prompt',
    description: 'Existing addScene creativity prompt',
    systemPrompt: `You are a creative scene generator for Bazaar-Vid videos.

Create engaging, animated scenes based on user descriptions. Focus on:
- Rich visual storytelling
- Smooth animations and transitions
- Professional, modern aesthetics
- Multiple visual elements working together

Generate scenes with proper timing, animations, and visual hierarchy.
Use the available scene types: text, image, background-color, shape, gradient, particles, text-animation, split-screen, zoom-pan, svg-animation, custom.

Return JSON patches that add the new scene to the video timeline.`,
    temperature: 0.5
  },
  variations: [
    {
      id: 'addscene-animation-focused',
      name: 'Animation Focused',
      description: 'Emphasizes dynamic animations and movement',
      systemPrompt: `You are an animation-specialist scene creator for Bazaar-Vid.

ANIMATION-FIRST DESIGN:
- Every element should have purposeful movement
- Use spring animations for natural, engaging motion
- Layer multiple animation types for rich visual experiences
- Create visual rhythms that guide viewer attention

Animation Principles:
1. Timing: Use varying speeds to create visual interest
2. Easing: Prefer spring animations over linear
3. Staging: Direct attention through motion
4. Appeal: Make animations feel alive and engaging

Scene Types (prioritized for animation):
- text-animation: typewriter, fadeLetters, slideUp, bounce, wavy
- shape: pulse, rotate, bounce, scale animations
- svg-animation: draw, scale, rotate, fade, moveIn
- gradient: animated color transitions
- particles: dynamic particle systems
- zoom-pan: cinematic camera movements

ANIMATION GUIDELINES:
- Minimum 3-second scenes for proper animation development
- Layer 2-3 animation types per scene for richness
- Use transitions between scenes for flow
- Consider animation physics and natural movement

Create scenes that feel alive and engaging through motion.`,
      temperature: 0.6
    },
    {
      id: 'addscene-brand-storytelling',
      name: 'Brand Storytelling',
      description: 'Professional brand-focused scene creation',
      systemPrompt: `You are a brand storytelling specialist for Bazaar-Vid professional videos.

BRAND STORYTELLING FRAMEWORK:
- Understand the brand personality from user input
- Create scenes that align with brand values
- Use professional color schemes and typography
- Build narrative progression across scenes

Brand Categories to Recognize:
- Tech/SaaS: Clean, modern, innovative (blues, whites, geometric shapes)
- Finance: Trust, stability, growth (blues, greens, upward motion)
- Creative/Agency: Bold, artistic, dynamic (vibrant colors, artistic elements)
- Healthcare: Care, precision, trust (soft blues, clean design)
- Education: Knowledge, growth, accessibility (warm colors, progress indicators)
- Enterprise: Professional, reliable, scalable (corporate blues, structured layouts)

Professional Scene Elements:
- Typography hierarchy (large headers, readable body text)
- Professional color palettes
- Subtle, purposeful animations
- Brand-appropriate imagery and graphics
- Clear information architecture

QUALITY STANDARDS:
- Use proper font families (Inter, Roboto, Open Sans for tech; Serif for traditional)
- Implement proper spacing and visual hierarchy
- Choose animations that enhance rather than distract
- Ensure accessibility with good contrast ratios

Create scenes that elevate brand perception and communicate professionally.`,
      temperature: 0.4
    },
    {
      id: 'addscene-creative-experimental',
      name: 'Creative Experimental',
      description: 'Pushing creative boundaries with unique visual approaches',
      systemPrompt: `You are a creative experimental designer for Bazaar-Vid cutting-edge videos.

EXPERIMENTAL DESIGN PHILOSOPHY:
- Push visual boundaries while maintaining usability
- Combine unexpected elements for unique experiences
- Use advanced animation techniques and layering
- Create memorable, distinctive visual experiences

Creative Techniques:
1. Visual Layering: Combine multiple scene types (gradient + particles + text)
2. Dynamic Color Systems: Color transitions that respond to content
3. Asymmetric Layouts: Break traditional grids for visual interest
4. Particle Systems: Use particles creatively (not just decoration)
5. Mixed Media: Combine shapes, text, and images in unexpected ways
6. Temporal Storytelling: Use timing to create narrative

Advanced Scene Combinations:
- Gradient background + animated particles + text overlay
- Split-screen with different animation styles per side
- SVG animations integrated with particle effects
- Zoom-pan on abstract shapes rather than just images
- Text animations that interact with background elements

CREATIVE CONSTRAINTS:
- Maintain readability and usability
- Ensure animations serve the content
- Balance creativity with professionalism
- Create cohesive visual language

EXPERIMENTAL ELEMENTS:
- Unconventional color combinations that work
- Unique timing patterns and rhythms
- Surprising but logical element interactions
- Fresh takes on common design patterns

Push creative boundaries while serving user goals effectively.`,
      temperature: 0.7
    }
  ]
};

// 🔧 EditScene prompt variations
const editScenePromptVariations: ServicePromptVariations = {
  service: 'editScene',
  baseline: {
    id: 'editscene-baseline',
    name: 'Current EditScene Prompt',
    description: 'Existing editScene modification prompt',
    systemPrompt: `You are a scene editor for Bazaar-Vid videos.

Modify existing scenes based on user requests. Categories:
- Surgical: Precise, minimal changes (color, text, single property)
- Creative: Adding elements, animations, visual enhancements
- Structural: Major layout changes, component restructuring

Analyze the existing code and make targeted modifications that achieve the user's goal while preserving scene quality and functionality.`,
    temperature: 0.3
  },
  variations: [
    {
      id: 'editscene-precision-surgical',
      name: 'Precision Surgical',
      description: 'Ultra-precise edits with minimal impact',
      systemPrompt: `You are a precision surgical editor for Bazaar-Vid scenes.

SURGICAL EDITING PRINCIPLES:
1. Minimal Change: Modify only what's necessary
2. Preserve Integrity: Keep existing animations and structure intact
3. Maintain Performance: Don't add unnecessary complexity
4. Exact Targeting: Change specific properties without side effects

Surgical Edit Categories:
- Text Content: Change words, phrases, labels
- Color Values: Modify specific colors (background, text, elements)
- Numeric Values: Adjust size, position, duration, opacity
- Simple Properties: Toggle visibility, change alignment, basic styling

SURGICAL APPROACH:
1. Identify the exact element to modify
2. Determine minimal change needed
3. Preserve all existing functionality
4. Maintain visual coherence
5. Test that change doesn't break animations

PRECISION GUIDELINES:
- Change only the requested property
- Keep existing variable names and structure
- Preserve timing and animation logic
- Maintain responsive behavior
- Don't refactor unless absolutely necessary

Example Surgical Edits:
- "change text to X" → modify only text content
- "make it blue" → change only color value
- "smaller font" → adjust only fontSize
- "move it left" → modify only position

Use surgical precision to implement exact user requests efficiently.`,
      temperature: 0.2
    },
    {
      id: 'editscene-enhancement-creative',
      name: 'Enhancement Creative',
      description: 'Creative improvements and additions while editing',
      systemPrompt: `You are a creative enhancement editor for Bazaar-Vid scenes.

CREATIVE ENHANCEMENT PHILOSOPHY:
- Improve scenes beyond the minimum requested change
- Add thoughtful animations and visual polish
- Enhance user experience while fulfilling their request
- Maintain scene performance and coherence

Enhancement Strategies:
1. Animation Upgrades: Add spring animations, easing transitions
2. Visual Polish: Improve spacing, typography, color harmony
3. Interactive Elements: Add hover states, micro-interactions
4. Layered Experiences: Combine multiple visual elements
5. Responsive Improvements: Better scaling and layout

CREATIVE EDIT TYPES:
- Property Enhancement: Not just change color, but add gradients/transitions
- Animation Addition: Add motion to static elements
- Visual Hierarchy: Improve information organization
- Polish Details: Add shadows, borders, refined spacing
- Performance Optimization: Cleaner code while adding features

ENHANCEMENT GUIDELINES:
- Fulfill user request as primary goal
- Add 1-2 creative improvements that align with request
- Don't overcomplicate or change core functionality
- Maintain visual consistency with existing design
- Consider user's apparent skill level and preferences

Example Creative Enhancements:
- "make text bigger" → increase size + add fade-in animation
- "change background" → new color + subtle gradient + transition
- "add button" → create button + hover effects + proper positioning
- "fix spacing" → improve spacing + better visual hierarchy

Enhance user requests with thoughtful creative improvements.`,
      temperature: 0.5
    },
    {
      id: 'editscene-comprehensive-structural',
      name: 'Comprehensive Structural',
      description: 'Major structural changes and complete redesigns',
      systemPrompt: `You are a structural redesign specialist for Bazaar-Vid scenes.

STRUCTURAL TRANSFORMATION APPROACH:
- Completely reimagine layout and organization
- Restructure component hierarchy for better functionality
- Implement advanced patterns and best practices
- Create scalable, maintainable code structure

Structural Edit Categories:
1. Layout Restructuring: Flexbox to Grid, positioning changes
2. Component Architecture: Breaking into smaller components
3. Animation Systems: Implementing complex animation sequences
4. Data Flow: Improving how information flows through components
5. Performance Optimization: Restructuring for better rendering

COMPREHENSIVE CHANGES:
- Responsive Design: Mobile-first, adaptive layouts
- Advanced Animations: Complex sequences, chained effects
- Accessibility: ARIA labels, semantic HTML, keyboard navigation
- Visual Systems: Consistent spacing, typography scales
- Modular Design: Reusable patterns and components

STRUCTURAL GUIDELINES:
- Analyze existing architecture and identify improvement opportunities
- Implement modern best practices and patterns
- Ensure backward compatibility where possible
- Document complex changes with comments
- Test that restructuring doesn't break existing functionality

Advanced Techniques:
- CSS Grid for complex layouts
- Custom React hooks for reusable logic
- Advanced animation libraries integration
- State management improvements
- Performance optimization patterns

When structural changes are needed, create comprehensive, well-architected solutions.`,
      temperature: 0.4
    }
  ]
};

// 📊 All prompt variations registry
export const PROMPT_VARIATIONS: ServicePromptVariations[] = [
  brainPromptVariations,
  addScenePromptVariations,
  editScenePromptVariations
];

// 🎯 Prompt optimization result
export interface PromptOptimizationResult extends DetailedEvalResult {
  promptVariationId: string;
  promptVariationName: string;
  service: string;
  baselineComparison?: {
    latencyDiff: number;  // positive = slower than baseline
    costDiff: number;     // positive = more expensive than baseline
    qualityDiff: number;  // positive = better than baseline
  };
}

// 🧪 Prompt Optimization Runner
export class PromptOptimizationRunner extends EvaluationRunner {
  private outputDir: string;
  private sessionId: string;

  constructor() {
    super();
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = join(process.cwd(), 'eval-outputs', 'prompt-optimization', this.sessionId);
  }

  /**
   * 🎯 Run A/B testing for prompt variations
   */
  async runPromptOptimization(options: {
    service?: string;                    // Focus on specific service
    modelPack: string;                   // Model pack to test with
    testPrompts: EvalPrompt[];          // Test prompts to use
    includeBaseline?: boolean;          // Test baseline prompt
    maxVariations?: number;             // Limit number of variations
    saveOutputs?: boolean;              // Save detailed outputs
  }): Promise<{
    results: PromptOptimizationResult[];
    analysis: PromptOptimizationAnalysis;
    recommendations: PromptRecommendation[];
    outputDirectory: string;
  }> {
    console.log('\n🔬 Starting Prompt Optimization A/B Testing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Create output directory
    if (options.saveOutputs !== false) {
      this.createOutputDirectory();
      console.log(`📁 Output directory: ${this.outputDir}`);
    }

    // Filter services to test
    const servicesToTest = options.service 
      ? PROMPT_VARIATIONS.filter(s => s.service === options.service)
      : PROMPT_VARIATIONS;

    console.log(`🧪 Testing ${servicesToTest.length} services with ${options.testPrompts.length} prompts`);

    const results: PromptOptimizationResult[] = [];

    // Test each service
    for (const serviceVariations of servicesToTest) {
      console.log(`\n🎯 Testing Service: ${serviceVariations.service}`);

      // Get variations to test
      const variationsToTest = this.getVariationsToTest(serviceVariations, options);

      // Test each variation
      for (const variation of variationsToTest) {
        console.log(`   📝 Testing: ${variation.name}`);

        // Test each prompt with this variation
        for (const prompt of options.testPrompts) {
          try {
            const result = await this.runPromptVariation(
              prompt,
              variation,
              serviceVariations.service,
              options.modelPack
            );
            results.push(result);

            // Save outputs if requested
            if (options.saveOutputs !== false) {
              await this.savePromptOptimizationOutput(result, prompt, variation);
            }

            // Display quick summary
            this.displayPromptTestSummary(result);

          } catch (error) {
            console.error(`   ❌ Error testing ${variation.name}: ${error}`);
          }
        }
      }
    }

    // Generate analysis and recommendations
    const analysis = this.generatePromptOptimizationAnalysis(results);
    const recommendations = this.generatePromptRecommendations(results, analysis);

    // Save comprehensive report
    if (options.saveOutputs !== false) {
      this.generatePromptOptimizationReport(results, analysis, recommendations);
    }

    return {
      results,
      analysis,
      recommendations,
      outputDirectory: this.outputDir
    };
  }

  /**
   * 🎯 Get variations to test based on options
   */
  private getVariationsToTest(
    serviceVariations: ServicePromptVariations,
    options: any
  ): PromptVariation[] {
    const variations: PromptVariation[] = [];

    // Include baseline if requested
    if (options.includeBaseline !== false) {
      variations.push(serviceVariations.baseline);
    }

    // Add variations (limited by maxVariations)
    const maxVariations = options.maxVariations || serviceVariations.variations.length;
    variations.push(...serviceVariations.variations.slice(0, maxVariations));

    return variations;
  }

  /**
   * 🧪 Test a single prompt variation
   */
  private async runPromptVariation(
    prompt: EvalPrompt,
    variation: PromptVariation,
    service: string,
    modelPack: string
  ): Promise<PromptOptimizationResult> {
    const startTime = Date.now();

    // Temporarily override the system prompt for this service
    // This would need to be implemented in the actual service calls
    const overrideConfig = {
      systemPrompt: variation.systemPrompt,
      temperature: variation.temperature,
      maxTokens: variation.maxTokens
    };

    // Run the evaluation with prompt override
    const baseResult = await this.runSinglePrompt(prompt, modelPack, true, {
      promptOverride: { [service]: overrideConfig }
    });

    const result: PromptOptimizationResult = {
      ...baseResult,
      promptVariationId: variation.id,
      promptVariationName: variation.name,
      service
    };

    return result;
  }

  /**
   * 💾 Save prompt optimization outputs
   */
  private async savePromptOptimizationOutput(
    result: PromptOptimizationResult,
    prompt: EvalPrompt,
    variation: PromptVariation
  ): Promise<void> {
    const sanitizedIds = `${prompt.id}_${variation.id}`.replace(/[^a-z0-9-]/gi, '_');
    
    // Save variation test result
    const resultPath = join(this.outputDir, 'results', `${sanitizedIds}.json`);
    writeFileSync(resultPath, JSON.stringify({
      prompt: prompt,
      variation: variation,
      result: result,
      timestamp: new Date().toISOString()
    }, null, 2));

    // Save generated code if available
    if (result.codeOutput) {
      const codePath = join(this.outputDir, 'code', `${sanitizedIds}.tsx`);
      const codeWithHeader = `// Prompt Optimization Output
// Prompt: ${prompt.name}
// Variation: ${variation.name}
// Service: ${result.service}
// Generated: ${new Date().toISOString()}
// Latency: ${result.metrics.latency}ms
// Cost: $${result.metrics.cost?.toFixed(4) || '0'}

${result.codeOutput}`;
      writeFileSync(codePath, codeWithHeader);
    }
  }

  /**
   * 📊 Generate analysis from prompt optimization results
   */
  private generatePromptOptimizationAnalysis(results: PromptOptimizationResult[]): PromptOptimizationAnalysis {
    // Group results by service and variation
    const byService = new Map<string, PromptOptimizationResult[]>();
    const byVariation = new Map<string, PromptOptimizationResult[]>();

    results.forEach(result => {
      // Group by service
      if (!byService.has(result.service)) {
        byService.set(result.service, []);
      }
      byService.get(result.service)!.push(result);

      // Group by variation
      if (!byVariation.has(result.promptVariationId)) {
        byVariation.set(result.promptVariationId, []);
      }
      byVariation.get(result.promptVariationId)!.push(result);
    });

    // Calculate metrics for each variation
    const variationMetrics = new Map<string, VariationMetrics>();
    byVariation.forEach((results, variationId) => {
      const metrics = this.calculateVariationMetrics(results);
      variationMetrics.set(variationId, metrics);
    });

    // Find winners by category
    const winners = this.findPromptWinners(variationMetrics);

    return {
      totalTests: results.length,
      servicesAnalyzed: Array.from(byService.keys()),
      variationsAnalyzed: Array.from(byVariation.keys()),
      variationMetrics: Object.fromEntries(variationMetrics),
      winners,
      insights: this.generatePromptInsights(results, variationMetrics)
    };
  }

  /**
   * 📊 Calculate metrics for a variation
   */
  private calculateVariationMetrics(results: PromptOptimizationResult[]): VariationMetrics {
    const latencies = results.map(r => r.metrics.latency);
    const costs = results.map(r => r.metrics.cost || 0);
    const successRate = results.filter(r => r.success).length / results.length;

    return {
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      averageCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      successRate,
      totalTests: results.length,
      qualityScore: this.calculateQualityScore(results),
      consistency: this.calculateConsistency(results)
    };
  }

  /**
   * 🏆 Find winners by category
   */
  private findPromptWinners(variationMetrics: Map<string, VariationMetrics>): PromptWinners {
    const metrics = Array.from(variationMetrics.entries());
    
    return {
      fastest: this.findWinner(metrics, (m) => -m[1].averageLatency), // negative for min
      cheapest: this.findWinner(metrics, (m) => -m[1].averageCost),
      highestQuality: this.findWinner(metrics, (m) => m[1].qualityScore),
      mostConsistent: this.findWinner(metrics, (m) => m[1].consistency),
      bestOverall: this.findWinner(metrics, (m) => 
        (m[1].qualityScore * 0.4) + 
        (m[1].consistency * 0.3) + 
        ((1 - m[1].averageLatency / 10000) * 0.2) + // normalize latency
        ((1 - m[1].averageCost / 0.1) * 0.1) // normalize cost
      )
    };
  }

  private findWinner(metrics: [string, VariationMetrics][], scoreFn: (m: [string, VariationMetrics]) => number): string {
    return metrics.reduce((best, current) => 
      scoreFn(current) > scoreFn(best) ? current : best
    )[0];
  }

  /**
   * 💡 Generate insights from results
   */
  private generatePromptInsights(
    results: PromptOptimizationResult[],
    variationMetrics: Map<string, VariationMetrics>
  ): string[] {
    const insights: string[] = [];

    // Latency insights
    const latencies = Array.from(variationMetrics.values()).map(m => m.averageLatency);
    const latencyRange = Math.max(...latencies) - Math.min(...latencies);
    if (latencyRange > 1000) {
      insights.push(`Significant latency differences found (${latencyRange.toFixed(0)}ms range) - prompt optimization can reduce response time`);
    }

    // Cost insights
    const costs = Array.from(variationMetrics.values()).map(m => m.averageCost);
    const costRange = Math.max(...costs) - Math.min(...costs);
    if (costRange > 0.01) {
      insights.push(`Cost variations of $${costRange.toFixed(4)} found - prompt efficiency impacts token usage`);
    }

    // Quality insights
    const qualities = Array.from(variationMetrics.values()).map(m => m.qualityScore);
    const qualityRange = Math.max(...qualities) - Math.min(...qualities);
    if (qualityRange > 0.2) {
      insights.push(`Quality differences of ${(qualityRange * 100).toFixed(1)}% found - prompt design significantly impacts output quality`);
    }

    return insights;
  }

  /**
   * 🎯 Generate prompt recommendations
   */
  private generatePromptRecommendations(
    results: PromptOptimizationResult[],
    analysis: PromptOptimizationAnalysis
  ): PromptRecommendation[] {
    const recommendations: PromptRecommendation[] = [];

    // Recommend best overall performer
    recommendations.push({
      type: 'overall',
      priority: 'high',
      title: 'Switch to Best Overall Prompt',
      description: `${analysis.winners.bestOverall} shows the best balance of quality, speed, and cost`,
      impact: 'high',
      implementation: `Update system prompt for the service to use ${analysis.winners.bestOverall} configuration`
    });

    // Speed optimization recommendation
    if (analysis.winners.fastest !== analysis.winners.bestOverall) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Speed Optimization Option',
        description: `${analysis.winners.fastest} is fastest - consider for speed-critical workflows`,
        impact: 'medium',
        implementation: `Implement dynamic prompt selection based on user requirements`
      });
    }

    // Cost optimization recommendation
    if (analysis.winners.cheapest !== analysis.winners.bestOverall) {
      recommendations.push({
        type: 'cost',
        priority: 'low',
        title: 'Cost Optimization Opportunity',
        description: `${analysis.winners.cheapest} is most cost-effective - consider for high-volume operations`,
        impact: 'medium',
        implementation: `Use for simple, high-frequency operations`
      });
    }

    return recommendations;
  }

  /**
   * 📊 Display test summary
   */
  private displayPromptTestSummary(result: PromptOptimizationResult): void {
    const status = result.success ? '✅' : '❌';
    const latency = result.metrics.latency;
    const cost = result.metrics.cost?.toFixed(4) || '0';

    console.log(`   ${status} ${latency}ms | $${cost} | Quality: ${(this.calculateQualityScore([result]) * 100).toFixed(1)}%`);
  }

  /**
   * 🏆 Calculate quality score
   */
  private calculateQualityScore(results: PromptOptimizationResult[]): number {
    // Placeholder quality calculation - would need actual quality metrics
    const successRate = results.filter(r => r.success).length / results.length;
    return successRate; // Simplified quality score based on success rate
  }

  /**
   * 📊 Calculate consistency score
   */
  private calculateConsistency(results: PromptOptimizationResult[]): number {
    const latencies = results.map(r => r.metrics.latency);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);
    
    // Return consistency as 1 - (coefficient of variation)
    return Math.max(0, 1 - (stdDev / mean));
  }

  /**
   * 📁 Create output directory structure
   */
  private createOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    const subdirs = ['results', 'code', 'reports'];
    subdirs.forEach(dir => {
      const path = join(this.outputDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }

  /**
   * 📊 Generate comprehensive report
   */
  private generatePromptOptimizationReport(
    results: PromptOptimizationResult[],
    analysis: PromptOptimizationAnalysis,
    recommendations: PromptRecommendation[]
  ): void {
    const reportPath = join(this.outputDir, 'reports', 'prompt_optimization_report.md');

    let report = `# Prompt Optimization A/B Testing Report
Generated: ${new Date().toISOString()}
Session ID: ${this.sessionId}

## Executive Summary
- **Total Tests**: ${analysis.totalTests}
- **Services Analyzed**: ${analysis.servicesAnalyzed.join(', ')}
- **Variations Tested**: ${analysis.variationsAnalyzed.length}

## 🏆 Winners by Category
- **🥇 Best Overall**: ${analysis.winners.bestOverall}
- **⚡ Fastest**: ${analysis.winners.fastest}
- **💰 Cheapest**: ${analysis.winners.cheapest}
- **🎯 Highest Quality**: ${analysis.winners.highestQuality}
- **📊 Most Consistent**: ${analysis.winners.mostConsistent}

## 📊 Detailed Metrics

| Variation | Avg Latency | Avg Cost | Success Rate | Quality Score | Consistency |
|-----------|-------------|----------|--------------|---------------|-------------|
`;

    // Add metrics table
    Object.entries(analysis.variationMetrics).forEach(([id, metrics]) => {
      report += `| ${id} | ${metrics.averageLatency.toFixed(0)}ms | $${metrics.averageCost.toFixed(4)} | ${(metrics.successRate * 100).toFixed(1)}% | ${(metrics.qualityScore * 100).toFixed(1)}% | ${(metrics.consistency * 100).toFixed(1)}% |\n`;
    });

    report += `\n## 💡 Key Insights\n`;
    analysis.insights.forEach(insight => {
      report += `- ${insight}\n`;
    });

    report += `\n## 🎯 Recommendations\n`;
    recommendations.forEach(rec => {
      report += `### ${rec.title} (${rec.priority} priority)
**Impact**: ${rec.impact}
**Description**: ${rec.description}
**Implementation**: ${rec.implementation}

`;
    });

    writeFileSync(reportPath, report);
    console.log(`\n📊 Comprehensive report saved: ${reportPath}`);
  }
}

// 📊 Types for analysis
export interface VariationMetrics {
  averageLatency: number;
  averageCost: number;
  successRate: number;
  totalTests: number;
  qualityScore: number;
  consistency: number;
}

export interface PromptWinners {
  fastest: string;
  cheapest: string;
  highestQuality: string;
  mostConsistent: string;
  bestOverall: string;
}

export interface PromptOptimizationAnalysis {
  totalTests: number;
  servicesAnalyzed: string[];
  variationsAnalyzed: string[];
  variationMetrics: Record<string, VariationMetrics>;
  winners: PromptWinners;
  insights: string[];
}

export interface PromptRecommendation {
  type: 'overall' | 'performance' | 'cost' | 'quality';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
}

// Export the runner
export const promptOptimizationRunner = new PromptOptimizationRunner();