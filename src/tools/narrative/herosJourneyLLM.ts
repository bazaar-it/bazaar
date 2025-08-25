/**
 * Hero's Journey Motion Graphics Generator with LLM
 * Uses comprehensive brand extraction to create narrative video via LLM
 */

import { codeGenerator } from '../add/add_helpers/CodeGeneratorNEW';
import type { ExtractedBrandDataV4 } from '../webAnalysis/WebAnalysisAgentV4';

export class HeroJourneyLLM {
  
  /**
   * Generate Hero's Journey motion graphics using LLM with full brand context
   */
  async generateHeroJourney(
    extraction: ExtractedBrandDataV4,
    projectId: string,
    functionName: string
  ): Promise<{ code: string; name: string; duration: number; reasoning: string }> {
    
    // Build comprehensive prompt with ALL extracted data
    const prompt = this.buildHeroJourneyPrompt(extraction);
    
    // Use the code generator with the hero's journey prompt
    const result = await codeGenerator.generateCode({
      userPrompt: prompt,
      layoutJson: null, // No layout for hero's journey
      functionName,
      projectId,
      projectFormat: {
        format: 'landscape',
        width: 1920,
        height: 1080
      }
    });
    
    return result;
  }
  
  private selectNarrativeStructureForBrand(extraction: ExtractedBrandDataV4) {
    const narrativeStructures = [
      {
        name: "Classic Hero's Journey",
        acts: ["The Problem", "The Discovery", "The Transformation", "The Triumph", "The Call to Action"],
        style: "dramatic and transformative"
      },
      {
        name: "Rising Action",
        acts: ["The Hook", "Building Tension", "The Crescendo", "Peak Moment", "Resolution"],
        style: "building energy and excitement"
      },
      {
        name: "Emotional Rollercoaster",
        acts: ["Initial Excitement", "The Challenge", "Moment of Doubt", "The Breakthrough", "Celebration"],
        style: "emotional ups and downs"
      },
      {
        name: "Product Demo Flow",
        acts: ["Pain Point", "Solution Introduction", "Feature Showcase", "Benefits Realized", "Get Started"],
        style: "practical and benefit-focused"
      },
      {
        name: "Brand Story Arc",
        acts: ["Our Heritage", "The Innovation", "Making Impact", "Future Vision", "Join Us"],
        style: "brand-centric storytelling"
      },
      {
        name: "Customer Success Story",
        acts: ["Before", "The Search", "Finding Us", "The Experience", "Life After"],
        style: "customer perspective"
      },
      {
        name: "Problem-Agitate-Solve",
        acts: ["The Problem", "Why It Matters", "Failed Attempts", "Our Solution", "Your Success"],
        style: "persuasive and solution-oriented"
      }
    ];
    
    // Analyze brand personality to choose best narrative structure
    let selectedStructure;
    
    // Check brand attributes to intelligently select narrative
    const brandName = extraction.brand?.identity?.name?.toLowerCase() || '';
    const tagline = extraction.brand?.identity?.tagline?.toLowerCase() || '';
    const problem = extraction.product?.problem?.toLowerCase() || '';
    
    // Smart selection based on brand characteristics
    if (problem.includes('pain') || problem.includes('frustrat') || problem.includes('problem')) {
      // Strong problem focus → Problem-Agitate-Solve
      selectedStructure = narrativeStructures.find(s => s.name === "Problem-Agitate-Solve");
    } else if (brandName.includes('tech') || brandName.includes('ai') || tagline.includes('innovat')) {
      // Tech/Innovation brand → Product Demo Flow
      selectedStructure = narrativeStructures.find(s => s.name === "Product Demo Flow");
    } else if (extraction.brand?.identity?.mission?.includes('customer') || tagline.includes('you')) {
      // Customer-focused → Customer Success Story
      selectedStructure = narrativeStructures.find(s => s.name === "Customer Success Story");
    } else if (extraction.brand?.identity?.values?.includes('heritage') || extraction.brand?.identity?.values?.includes('tradition')) {
      // Heritage brand → Brand Story Arc
      selectedStructure = narrativeStructures.find(s => s.name === "Brand Story Arc");
    } else {
      // Random selection for variety
      const randomOptions = [
        narrativeStructures.find(s => s.name === "Classic Hero's Journey"),
        narrativeStructures.find(s => s.name === "Rising Action"),
        narrativeStructures.find(s => s.name === "Emotional Rollercoaster")
      ].filter(Boolean);
      selectedStructure = randomOptions[Math.floor(Math.random() * randomOptions.length)];
    }
    
    // Fallback to random if no match
    if (!selectedStructure) {
      selectedStructure = narrativeStructures[Math.floor(Math.random() * narrativeStructures.length)];
    }
    
    console.log(`🎭 [HERO JOURNEY LLM] Selected "${selectedStructure.name}" based on brand: ${brandName || 'unknown'}`);
    return selectedStructure;
  }
  
  private buildHeroJourneyPrompt(extraction: ExtractedBrandDataV4): string {
    const selectedStructure = this.selectNarrativeStructureForBrand(extraction);
    
    return `
🎬 CREATE A UNIQUE ${selectedStructure.name.toUpperCase()} MOTION GRAPHICS VIDEO

You are creating a 15-second narrative motion graphics video that tells the brand's story.
This is NOT a website mockup - it's a cinematic motion graphics piece that brings the brand to life.

⚡ IMPORTANT: Create a UNIQUE narrative using the "${selectedStructure.name}" structure.
The narrative should feel ${selectedStructure.style}.

YOUR 5 ACTS MUST BE:
${selectedStructure.acts.map((act, i) => `ACT ${i + 1}: ${act}`).join('\n')}

CRITICAL: 
- DO NOT use generic hero's journey beats
- DO NOT repeat the same visual metaphors
- BE CREATIVE with transitions and visual storytelling
- MATCH the brand's personality and voice

====================
🎯 BRAND EXTRACTION DATA
====================

📍 WEBSITE: ${extraction.metadata?.url || 'N/A'}
📄 TITLE: ${extraction.brand?.identity?.name || 'Untitled'}

🎨 VISUAL IDENTITY
------------------
PRIMARY COLOR: ${extraction.brand?.visual?.colors?.primary || '#2563eb'}
SECONDARY COLOR: ${extraction.brand?.visual?.colors?.secondary || '#ffffff'}
ACCENT COLOR: ${extraction.brand?.visual?.colors?.accent || '#10b981'}
${extraction.brand?.visual?.colors?.gradients?.length ? `
GRADIENTS:
${extraction.brand.visual.colors.gradients.map((g: any) => 
  `- ${g.type}-gradient(${g.angle || 0}deg, ${g.stops?.join(' → ') || ''})`
).join('\n')}` : ''}

📝 TYPOGRAPHY
-------------
FONTS: ${extraction.brand?.visual?.typography?.stack?.primary?.join(', ') || 'Inter, sans-serif'}
🎯 DESIGN TOKENS
----------------
BUTTON RADIUS: ${extraction.brand?.visual?.borders?.radius?.button || '8px'}
CARD RADIUS: ${extraction.brand?.visual?.borders?.radius?.card || '12px'}

SHADOWS:
- Small: ${extraction.brand?.visual?.shadows?.sm || '0 1px 2px rgba(0,0,0,0.1)'}
- Medium: ${extraction.brand?.visual?.shadows?.md || '0 4px 6px rgba(0,0,0,0.1)'}
- Large: ${extraction.brand?.visual?.shadows?.lg || '0 10px 15px rgba(0,0,0,0.1)'}

💬 PRODUCT NARRATIVE
--------------------
HEADLINE: "${extraction.product?.value_prop?.headline || 'Transform Your Business'}"
SUBHEAD: "${extraction.product?.value_prop?.subhead || 'Professional solutions for modern needs'}"

PROBLEM: ${extraction.product?.problem || 'Status quo challenges'}
SOLUTION: ${extraction.product?.solution || 'Innovative approach'}

KEY FEATURES:
${extraction.product?.features?.slice(0, 5).map((f: any) => 
  `• ${f.title || f.name}: ${f.description || f.desc || ''}`
).join('\n') || '• Professional features'}

USE CASES: ${extraction.product?.useCases?.map((u: any) => u.title).join(', ') || 'Multiple use cases'}

BENEFITS:
${extraction.product?.benefits?.map((b: any) => 
  `• ${b.label || b.title || 'Benefit'}: ${b.metric || b.description || ''}`
).join('\n') || '• Key benefits'}

🏆 SOCIAL PROOF
---------------
${extraction.metrics?.users ? `USERS: ${extraction.metrics.users}` : ''}
${extraction.metrics?.rating ? `RATING: ${extraction.metrics.rating}` : ''}
${extraction.socialProof ? `
TESTIMONIALS: ${extraction.socialProof.testimonials?.length || 0}
CUSTOMER LOGOS: ${extraction.socialProof.customerLogos?.length || 0}
STATS: ${extraction.socialProof.stats?.length || 0}
` : ''}

🔘 CALL-TO-ACTIONS
------------------
${extraction.content?.ctas?.map((cta: any) => 
  `${(cta.type || 'button').toUpperCase()}: "${cta.label}"`
).join('\n') || 'PRIMARY: "Get Started"'}

====================
🎭 HERO'S JOURNEY STRUCTURE
====================

Create a 15-second (450 frames at 30fps) motion graphics video with these 5 acts:

ACT 1 - THE PROBLEM (0-3 seconds, frames 0-90)
------------------------------------------------
• Start with the problem: "${extraction.product?.problem || 'Status quo challenges'}"
• Use darker, muted versions of brand colors
• Show frustration, barriers, limitations
• Slow, restricted animations
• Build tension with the old way of doing things

ACT 2 - THE DISCOVERY (3-5 seconds, frames 90-150)
----------------------------------------------------
• Introduce the solution: "${extraction.product?.value_prop?.headline || 'Transform Your Business'}"
• Brand colors emerge and brighten
• Logo appears with energy
• Hope and possibility enter the scene
• Use spring animations for excitement

ACT 3 - THE TRANSFORMATION (5-10 seconds, frames 150-300)
----------------------------------------------------------
• Showcase 3-4 key features with motion graphics
• Each feature gets ~1-2 seconds of spotlight
• Use brand's accent colors for highlights
• Dynamic transitions between features
• Show the product in action (cards, interfaces, benefits)
• Build momentum with faster cuts

ACT 4 - THE TRIUMPH (10-13 seconds, frames 300-390)
-----------------------------------------------------
• Display social proof: "${extraction.socialProof.stats.users || 'Thousands of users'}"
• Show success metrics and achievements
• Use golden/success colors from brand palette
• Celebratory animations and effects
• Peak emotional moment

ACT 5 - THE INVITATION (13-15 seconds, frames 390-450)
-------------------------------------------------------
• Clear call-to-action: "${extraction.content?.ctas?.[0]?.label || 'Get Started'}"
• Tagline: "${extraction.brand?.identity?.tagline || ''}"
• Button with exact brand styling
• Inviting, forward-looking energy
• End on brand's primary color

====================
🎯 REQUIREMENTS
====================

1. Use ONLY the extracted brand colors - no generic colors
2. Use ONLY the extracted fonts or fallback to system fonts
3. Apply the exact shadows, border radius, and spacing from the brand
4. Create smooth transitions between acts using the brand's easing
5. Each act should flow naturally into the next
6. Use motion graphics techniques: parallax, morphing, reveals, particles
7. Include at least 3 different types of animations per act
8. Ensure text is readable with proper contrast
9. Use the brand's visual style 
10. Match the brand voice and tone

====================
🚀 TECHNICAL SPECS
====================

- Total duration: 450 frames (15 seconds at 30fps)
- Format: Landscape (1920x1080)
- Use Remotion's spring() for organic animations
- Use interpolate() for smooth transitions
- Include Sequence components for each act
- Export with proper duration marker

Create a compelling, cinematic motion graphics piece that tells this brand's story through visual narrative, not just static slides. Make it feel like a movie trailer for the product!`;
  }
}

export const heroJourneyLLM = new HeroJourneyLLM();