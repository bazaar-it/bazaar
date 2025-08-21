/**
 * Hero's Journey Motion Graphics Generator with LLM
 * Uses comprehensive brand extraction to create narrative video via LLM
 */

import { codeGenerator } from '../add/add_helpers/CodeGeneratorNEW';
import type { ExtractedBrandData } from '../webAnalysis/WebAnalysisAgentV2';

export class HeroJourneyLLM {
  
  /**
   * Generate Hero's Journey motion graphics using LLM with full brand context
   */
  async generateHeroJourney(
    extraction: ExtractedBrandData,
    projectId: string,
    functionName: string
  ): Promise<{ code: string; name: string; duration: number; reasoning: string }> {
    
    // Build comprehensive prompt with ALL extracted data
    const prompt = this.buildHeroJourneyPrompt(extraction);
    
    // Use the code generator with the hero's journey prompt
    const result = await codeGenerator.generateCode({
      userPrompt: prompt,
      functionName,
      projectId,
      projectFormat: 'landscape',
      requestedDurationFrames: 450, // 15 seconds at 30fps
    });
    
    return result;
  }
  
  private buildHeroJourneyPrompt(extraction: ExtractedBrandData): string {
    return `
🎬 CREATE A HERO'S JOURNEY MOTION GRAPHICS VIDEO

You are creating a 15-second narrative motion graphics video that tells the brand's story through 5 acts.
This is NOT a website mockup - it's a cinematic motion graphics piece that brings the brand to life.

====================
🎯 BRAND EXTRACTION DATA
====================

📍 WEBSITE: ${extraction.page.url}
📄 TITLE: ${extraction.page.title}

🎨 VISUAL IDENTITY
------------------
PRIMARY COLOR: ${extraction.brand.colors.primary}
SECONDARY COLOR: ${extraction.brand.colors.secondary}
ACCENT COLORS: ${extraction.brand.colors.accents.join(', ')}
NEUTRAL COLORS: ${extraction.brand.colors.neutrals.join(', ')}
${extraction.brand.colors.gradients.length > 0 ? `
GRADIENTS:
${extraction.brand.colors.gradients.map(g => 
  `- ${g.type}-gradient(${g.angle || 0}deg, ${g.stops.join(' → ')})`
).join('\n')}` : ''}

📝 TYPOGRAPHY
-------------
FONTS: ${extraction.brand.typography.fonts.map(f => `${f.family} (weights: ${f.weights.join(', ')})`).join(', ')}
H1: ${JSON.stringify(extraction.brand.typography.scale.h1)}
H2: ${JSON.stringify(extraction.brand.typography.scale.h2)}
H3: ${JSON.stringify(extraction.brand.typography.scale.h3)}
BODY: ${JSON.stringify(extraction.brand.typography.scale.body)}

🎯 DESIGN TOKENS
----------------
BUTTON RADIUS: ${extraction.brand.buttons.radius}
BUTTON PADDING: ${extraction.brand.buttons.padding}
BUTTON SHADOW: ${extraction.brand.buttons.shadow}

SHADOWS:
- Small: ${extraction.brand.shadows.sm}
- Medium: ${extraction.brand.shadows.md}
- Large: ${extraction.brand.shadows.lg}
- XL: ${extraction.brand.shadows.xl}

BORDER RADIUS:
- Small: ${extraction.brand.borderRadius.sm}
- Medium: ${extraction.brand.borderRadius.md}
- Large: ${extraction.brand.borderRadius.lg}

🎨 BRAND STYLE
--------------
ICON STYLE: ${extraction.brand.iconStyle}
IMAGERY: ${extraction.brand.imageryStyle.join(', ')}
EFFECTS: ${extraction.brand.backgroundEffects.join(', ')}
VOICE: ${extraction.brand.voice.adjectives.join(', ')}
TAGLINES: ${extraction.brand.voice.taglines.join(' | ')}

💬 PRODUCT NARRATIVE
--------------------
HEADLINE: "${extraction.product.value_prop.headline}"
SUBHEAD: "${extraction.product.value_prop.subhead}"

PROBLEM: ${extraction.product.problem}
SOLUTION: ${extraction.product.solution}

KEY FEATURES:
${extraction.product.features.slice(0, 5).map(f => 
  `• ${f.title}: ${f.desc}`
).join('\n')}

USE CASES: ${extraction.product.useCases.join(', ')}

BENEFITS:
${extraction.product.benefits.map(b => 
  `• ${b.label}: ${b.metric}`
).join('\n')}

METRICS/CLAIMS: ${extraction.product.metrics.join(' | ')}

🏆 SOCIAL PROOF
---------------
${extraction.socialProof.stats.users ? `USERS: ${extraction.socialProof.stats.users}` : ''}
${extraction.socialProof.stats.rating ? `RATING: ${extraction.socialProof.stats.rating}` : ''}
AWARDS: ${extraction.socialProof.awards.join(', ')}
TRUSTED BY: ${extraction.socialProof.logos.join(', ')}

${extraction.socialProof.testimonials.length > 0 ? `
TESTIMONIALS:
${extraction.socialProof.testimonials.slice(0, 2).map(t => 
  `"${t.quote}" - ${t.name}, ${t.role}`
).join('\n')}` : ''}

🎬 MOTION & LAYOUT
------------------
COMPONENTS: ${extraction.layoutMotion.componentInventory.join(', ')}
TRANSITIONS: ${extraction.layoutMotion.transitions.join(', ')}
EASING: ${extraction.layoutMotion.easingHints.join(', ')}
HAS VIDEO: ${extraction.layoutMotion.hasVideo}
HAS ANIMATION: ${extraction.layoutMotion.hasAnimation}

🔘 CALL-TO-ACTIONS
------------------
${extraction.ctas.map(cta => 
  `${cta.type.toUpperCase()}: "${cta.label}"`
).join('\n')}

====================
🎭 HERO'S JOURNEY STRUCTURE
====================

Create a 15-second (450 frames at 30fps) motion graphics video with these 5 acts:

ACT 1 - THE PROBLEM (0-3 seconds, frames 0-90)
------------------------------------------------
• Start with the problem: "${extraction.product.problem}"
• Use darker, muted versions of brand colors
• Show frustration, barriers, limitations
• Slow, restricted animations
• Build tension with the old way of doing things

ACT 2 - THE DISCOVERY (3-5 seconds, frames 90-150)
----------------------------------------------------
• Introduce the solution: "${extraction.product.value_prop.headline}"
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
• Clear call-to-action: "${extraction.ctas[0]?.label || 'Get Started'}"
• Tagline: "${extraction.brand.voice.taglines[0]}"
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
9. Use the brand's imagery style (${extraction.brand.imageryStyle.join(', ')})
10. Match the brand voice: ${extraction.brand.voice.adjectives.join(', ')}

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