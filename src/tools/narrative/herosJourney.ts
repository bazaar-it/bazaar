/**
 * Hero's Journey Motion Graphics Generator
 * Takes extracted brand data and creates a narrative video structure
 */

export interface HeroJourneyScene {
  title: string;
  duration: number; // frames
  narrative: string;
  visualElements: string[];
  brandElements: {
    colors: string[];
    typography: string;
    motion: string;
  };
  emotionalBeat: 'problem' | 'tension' | 'discovery' | 'transformation' | 'triumph' | 'invitation';
}

export class HeroJourneyGenerator {
  
  /**
   * Generate a hero's journey narrative from brand extraction
   * Example: Revolut - "Change the way you money"
   */
  generateNarrative(extraction: any): HeroJourneyScene[] {
    const scenes: HeroJourneyScene[] = [];
    
    // ACT 1: THE PROBLEM (0-3 seconds)
    scenes.push({
      title: "The Old World",
      duration: 90, // 3 seconds at 30fps
      narrative: extraction.product.problem || "The status quo is broken",
      visualElements: [
        "Dark, muted colors transitioning",
        "Traditional bank imagery fading/cracking",
        "Person looking frustrated at phone",
        "Red X marks, barriers, walls"
      ],
      brandElements: {
        colors: [extraction.brand.colors.neutrals[1], "#FF0000"], // Dark + warning red
        typography: "Heavy, slow text reveal",
        motion: "Slow, restrictive movements"
      },
      emotionalBeat: 'problem'
    });
    
    // ACT 2: THE CALL TO ADVENTURE (3-5 seconds)
    scenes.push({
      title: "The Discovery",
      duration: 60, // 2 seconds
      narrative: extraction.product.value_prop.headline,
      visualElements: [
        "Logo appears with light burst",
        "Color injection into grayscale world",
        `"${extraction.product.value_prop.headline}" animates in`,
        "Phone/app interface materializes"
      ],
      brandElements: {
        colors: [extraction.brand.colors.primary, extraction.brand.colors.accents[0]], // Brand colors emerge
        typography: "Bold headline with gradient",
        motion: "Energetic entrance, spring animations"
      },
      emotionalBeat: 'discovery'
    });
    
    // ACT 3: THE TRANSFORMATION (5-10 seconds)
    scenes.push({
      title: "The New Powers",
      duration: 150, // 5 seconds
      narrative: "Unlock features that transform your financial life",
      visualElements: [
        // Feature 1: Cards
        "3D card rotating, multiple cards fanning out",
        `"${extraction.product.features[0].title}" with icon`,
        
        // Feature 2: Savings
        "Money growing animation, percentage counter",
        `"${extraction.product.features[1].desc}"`,
        
        // Feature 3: Global
        "World map with connection lines",
        "Currency symbols morphing",
        
        // Feature 4: Security
        "Shield animation, lock icons",
        "24/7 badge appearing"
      ],
      brandElements: {
        colors: extraction.brand.colors.accents, // Full color palette
        typography: "Dynamic, varied sizes",
        motion: "Quick cuts, parallax layers, smooth transitions"
      },
      emotionalBeat: 'transformation'
    });
    
    // ACT 4: THE TRIUMPH (10-13 seconds)
    scenes.push({
      title: "The Success",
      duration: 90, // 3 seconds
      narrative: "Join millions who've already transformed their finances",
      visualElements: [
        `"${extraction.social_proof.stats.users}" counter animation`,
        "Trust badges appearing",
        "Award icons sliding in",
        `"${extraction.social_proof.stats.rating}" stars filling`,
        "Happy user testimonials or avatars"
      ],
      brandElements: {
        colors: [extraction.brand.colors.accents[2], extraction.brand.colors.primary], // Gold/success colors
        typography: "Celebratory, confident",
        motion: "Triumphant, upward movements"
      },
      emotionalBeat: 'triumph'
    });
    
    // ACT 5: THE INVITATION (13-15 seconds)
    scenes.push({
      title: "Your Journey Begins",
      duration: 60, // 2 seconds
      narrative: extraction.product.value_prop.subhead,
      visualElements: [
        "CTA button pulsing",
        `"${extraction.ctas[0].label}" text`,
        "App store badges",
        "QR code or download link",
        "Tagline as final message"
      ],
      brandElements: {
        colors: [extraction.brand.colors.primary, extraction.brand.colors.secondary],
        typography: "Clear CTA style",
        motion: "Inviting pulse, gentle bounce"
      },
      emotionalBeat: 'invitation'
    });
    
    return scenes;
  }
  
  /**
   * Generate Remotion code for the hero's journey
   */
  generateMotionGraphicsCode(scenes: HeroJourneyScene[], extraction: any): string {
    return `
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Brand Design System from ${extraction.page.url}
const COLORS = {
  primary: '${extraction.brand.colors.primary}',
  secondary: '${extraction.brand.colors.secondary}',
  accent1: '${extraction.brand.colors.accents[0]}',
  accent2: '${extraction.brand.colors.accents[1]}',
  accent3: '${extraction.brand.colors.accents[2]}',
  dark: '${extraction.brand.colors.neutrals[1]}',
  light: '${extraction.brand.colors.neutrals[0]}'
};

const FONTS = {
  primary: '${extraction.brand.typography.fonts[0].family}',
  h1Size: '${extraction.brand.typography.scale.h1.size}',
  h2Size: '${extraction.brand.typography.scale.h2.size}',
  bodySize: '${extraction.brand.typography.scale.body.size}'
};

export const ${extraction.page.title.replace(/\s+/g, '')}HeroJourney: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.secondary }}>
      
      {/* ACT 1: THE PROBLEM (frames 0-90) */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{
          background: \`linear-gradient(135deg, \${COLORS.dark} 0%, #333 100%)\`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: FONTS.h1Size,
            fontFamily: FONTS.primary,
            fontWeight: 700,
            color: '#666',
            opacity: interpolate(frame, [0, 30], [0, 1]),
            transform: \`translateY(\${interpolate(frame, [0, 30], [20, 0])}px)\`
          }}>
            Traditional banking
          </div>
          <div style={{
            fontSize: FONTS.h2Size,
            fontFamily: FONTS.primary,
            color: '#999',
            marginTop: 20,
            opacity: interpolate(frame, [20, 50], [0, 1])
          }}>
            is slow, expensive, restrictive
          </div>
          
          {/* Visual metaphor: chains/barriers */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: 2,
            backgroundColor: '#FF0000',
            top: '50%',
            opacity: interpolate(frame, [40, 70], [0, 0.5]),
            transform: \`scaleX(\${interpolate(frame, [40, 70], [0, 1])})\`
          }} />
        </AbsoluteFill>
      </Sequence>
      
      {/* ACT 2: THE DISCOVERY (frames 90-150) */}
      <Sequence from={90} durationInFrames={60}>
        <AbsoluteFill style={{
          background: \`radial-gradient(circle at center, \${COLORS.accent1}20 0%, \${COLORS.secondary} 70%)\`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '72px',
            fontFamily: FONTS.primary,
            fontWeight: 700,
            background: \`linear-gradient(135deg, \${COLORS.accent1}, \${COLORS.accent2})\`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: spring({
              frame: frame - 90,
              fps,
              config: { damping: 10, stiffness: 100 }
            }),
            transform: \`scale(\${spring({
              frame: frame - 90,
              fps,
              config: { damping: 10, stiffness: 100 }
            })})\`
          }}>
            ${extraction.product.value_prop.headline}
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* ACT 3: THE TRANSFORMATION - Features showcase (frames 150-300) */}
      <Sequence from={150} durationInFrames={150}>
        <AbsoluteFill style={{
          background: COLORS.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Feature cards animating in */}
          ${scenes[2].visualElements.map((element, i) => `
          <div style={{
            position: 'absolute',
            left: \${100 + i * 200}px,
            top: 200,
            padding: 20,
            backgroundColor: COLORS.light,
            borderRadius: '${extraction.brand.buttons.radius}',
            boxShadow: '${extraction.brand.buttons.shadow || '0 4px 12px rgba(0,0,0,0.1)'}',
            opacity: interpolate(
              frame - 150,
              [${i * 20}, ${i * 20 + 30}],
              [0, 1]
            ),
            transform: \`translateY(\${interpolate(
              frame - 150,
              [${i * 20}, ${i * 20 + 30}],
              [50, 0]
            )}px)\`
          }}>
            <div style={{
              fontSize: FONTS.h2Size,
              fontFamily: FONTS.primary,
              fontWeight: 600,
              color: COLORS.primary
            }}>
              Feature ${i + 1}
            </div>
          </div>`).join('')}
        </AbsoluteFill>
      </Sequence>
      
      {/* ACT 4: THE TRIUMPH - Social proof (frames 300-390) */}
      <Sequence from={300} durationInFrames={90}>
        <AbsoluteFill style={{
          background: \`linear-gradient(135deg, \${COLORS.accent3}20 0%, \${COLORS.secondary} 100%)\`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '96px',
            fontFamily: FONTS.primary,
            fontWeight: 700,
            color: COLORS.accent3,
            opacity: interpolate(frame - 300, [0, 30], [0, 1])
          }}>
            ${extraction.social_proof.stats.users}
          </div>
          <div style={{
            fontSize: FONTS.h2Size,
            fontFamily: FONTS.primary,
            color: COLORS.primary,
            marginTop: 20
          }}>
            users trust ${extraction.brand.voice.taglines[0]}
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* ACT 5: THE INVITATION - CTA (frames 390-450) */}
      <Sequence from={390} durationInFrames={60}>
        <AbsoluteFill style={{
          background: COLORS.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '${extraction.brand.buttons.padding || '16px 32px'}',
            backgroundColor: COLORS.secondary,
            color: COLORS.primary,
            borderRadius: '${extraction.brand.buttons.radius}',
            fontSize: '24px',
            fontFamily: FONTS.primary,
            fontWeight: 600,
            cursor: 'pointer',
            transform: \`scale(\${spring({
              frame: frame - 390,
              fps,
              config: { damping: 10, stiffness: 200 }
            })})\`
          }}>
            ${extraction.ctas[0].label}
          </div>
          <div style={{
            fontSize: FONTS.bodySize,
            fontFamily: FONTS.primary,
            color: COLORS.secondary,
            marginTop: 30,
            opacity: interpolate(frame - 390, [20, 40], [0, 1])
          }}>
            ${extraction.product.value_prop.subhead}
          </div>
        </AbsoluteFill>
      </Sequence>
      
    </AbsoluteFill>
  );
};

// Total duration: 450 frames (15 seconds at 30fps)
export const VIDEO_DURATION = 450;
`;
  }
}