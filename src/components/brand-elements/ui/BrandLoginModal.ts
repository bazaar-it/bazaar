/**
 * Brand Login UI Component Generator
 * 
 * Creates a login interface component that:
 * - Uses brand colors, typography, and logos
 * - Adapts positioning based on canvas dimensions and component count
 * - Shows authentication options with brand styling
 * - Uses CSS-based icons instead of emojis (more reliable in Remotion)
 * - Works as a UI element in motion graphics (no modal overlay)
 */

export interface BrandLoginModalProps {
  brandData: any;
  size?: 'small' | 'medium' | 'large';
  canvasFormat?: 'portrait' | 'square' | 'landscape';
  totalComponents?: number;
  componentIndex?: number;
}

export function generateBrandLoginModal(props: BrandLoginModalProps): string {
  const {
    brandData,
    size = 'medium',
    canvasFormat = 'landscape',
    totalComponents = 1,
    componentIndex = 0
  } = props;

  // 🎨 COMPLETE V4 BRAND EXTRACTION
  const visual = brandData?.brand?.visual || {};
  const colors = visual?.colors || brandData?.colors || {};
  
  // Core brand colors
  const primary = colors.primary || '#000000';
  const secondary = colors.secondary || '#FFFFFF';
  const accent = colors.accent || '#007bff';
  const accents = colors.accents || ['#6F00FF', '#FF007A', '#FFD700', '#00FF66'];
  
  // Semantic colors for UI states
  const semantic = colors.semantic || {};
  const successColor = semantic.success || '#28a745';
  const warningColor = semantic.warning || '#ffc107';
  const errorColor = semantic.error || '#dc3545';
  const infoColor = semantic.info || '#17a2b8';
  
  // Rich color palette with usage context
  const colorPalette = colors.palette || [];
  const highFrequencyColors = colorPalette
    .filter((p: any) => p.frequency > 0.1)
    .map((p: any) => p.hex) || [primary, secondary];
  
  // Actual brand gradients
  const gradients = colors.gradients || [];
  const primaryGradient = gradients[0] ? 
    `linear-gradient(${gradients[0].angle}deg, ${gradients[0].stops.join(', ')})` :
    `linear-gradient(135deg, ${primary}, ${accent})`;
  
  // 🖋️ COMPLETE TYPOGRAPHY SYSTEM
  const typography = visual?.typography || brandData?.typography || {};
  const fontStack = typography?.stack || {};
  
  const primaryFont = fontStack?.primary?.[0] || typography?.fonts?.[0]?.family || 'Inter';
  const headingFont = fontStack?.headings?.[0] || primaryFont;
  const bodyFont = fontStack?.body?.[0] || primaryFont;
  
  // Font scale hierarchy
  const scale = typography?.scale || {};
  const fontSize = {
    h1: scale?.h1?.size || '3rem',
    h2: scale?.h2?.size || '2.5rem',
    h3: scale?.h3?.size || '2rem',
    body: scale?.body?.size || '1rem',
    small: scale?.caption?.size || '0.875rem'
  };
  
  // 🎭 VISUAL EFFECTS SYSTEM
  const shadows = visual?.shadows || {};
  const borders = visual?.borders || {};
  
  const boxShadow = {
    sm: shadows?.sm || '0 1px 2px rgba(0,0,0,0.05)',
    md: shadows?.md || '0 4px 6px rgba(0,0,0,0.07)',
    lg: shadows?.lg || '0 10px 15px rgba(0,0,0,0.1)'
  };
  
  const borderRadius = {
    button: borders?.radius?.button || '0.5rem',
    card: borders?.radius?.card || '0.75rem',
    container: borders?.radius?.container || '1rem'
  };
  
  // 🎯 BRAND IDENTITY & PSYCHOLOGY
  const identity = brandData?.brand?.identity || {};
  const voice = brandData?.brand?.voice || {};
  const psychology = brandData?.brand?.psychology || {};
  
  const brandName = identity?.name || brandData?.page?.title?.split(' - ')[0] || 'Brand';
  const tagline = identity?.tagline || voice?.taglines?.[0] || 'Welcome back';
  const mission = identity?.mission || '';
  
  // Voice & personality for adaptive messaging
  const voiceTone = voice?.tone || brandData?.content?.voice?.tone || 'professional';
  const personality = voice?.personality || 'confident';
  
  // Emotional triggers & psychology
  const emotionalTriggers = psychology?.emotionalTriggers || [];
  const trustSignals = psychology?.trustSignals || [];
  const urgencySignals = psychology?.urgency || [];
  
  // 💼 BUSINESS INTELLIGENCE
  const product = brandData?.product || {};
  const valueProps = product?.value_prop || {};
  const features = product?.features || [];
  
  const headline = valueProps?.headline || brandData?.content?.hero?.headline || `Welcome to ${brandName}`;
  const subheadline = valueProps?.subhead || brandData?.content?.hero?.subheadline || tagline;
  
  // 📊 SOCIAL PROOF & METRICS
  const socialProof = brandData?.socialProof || brandData?.social_proof || {};
  const metrics = brandData?.metrics || {};
  
  const userCount = metrics?.users || socialProof?.stats?.users;
  const rating = metrics?.rating || socialProof?.stats?.rating;
  const awards = socialProof?.awards || [];
  
  // 🔄 CALL-TO-ACTIONS
  const ctas = brandData?.content?.ctas || brandData?.ctas || [];
  const primaryCTA = ctas.find((c: any) => c.type === 'primary') || ctas[0] || { label: 'Get Started' };

  // Base sizing - Smart positioning system will override width/height
  const getSizeConfig = () => {
    const configs = {
      portrait: { 
        borderRadius: '3vw',
        logoSize: '8vw',
        titleSize: '4.5vw',
        bodySize: '2.8vw',
        buttonHeight: '8vh',
        buttonFontSize: '2.8vw'
      },
      square: { 
        borderRadius: '2.5vw',
        logoSize: '7vw',
        titleSize: '4vw',
        bodySize: '2.5vw',
        buttonHeight: '7vh',
        buttonFontSize: '2.5vw'
      },
      landscape: { 
        borderRadius: '1.5vw',
        logoSize: '5vw',
        titleSize: '2.8vw',
        bodySize: '1.6vw',
        buttonHeight: '5vh',
        buttonFontSize: '1.6vw'
      }
    };
    
    return {
      width: '35vw',  // Base size - smart positioning will override
      height: '50vh', // Base size - smart positioning will override
      ...configs[canvasFormat]
    };
  };

  const sizeConfig = getSizeConfig();

  // Adaptive copy based on brand voice
  const getPersonalizedCopy = (baseCopy: string) => {
    if (voiceTone === 'casual') {
      return baseCopy.replace(/Welcome Back/g, 'Hey there!').replace(/Continue/g, 'Jump in');
    } else if (voiceTone === 'friendly') {
      return '👋 ' + baseCopy;
    }
    return baseCopy;
  };

  return `
// Brand Login UI Component - ${brandName}
const { useCurrentFrame, useVideoConfig, spring, interpolate } = window.Remotion;

export default function BrandLoginModal_${componentIndex}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Smart positioning scale factor
  const componentScale = 1;
  
  // 🧠 PSYCHOLOGY-DRIVEN ANIMATIONS
  // Animation personality based on brand psychology
  const getAnimationConfig = () => {
    if ('${personality}' === 'energetic') {
      return { damping: 12, stiffness: 150, mass: 0.8 };
    } else if ('${personality}' === 'professional') {
      return { damping: 20, stiffness: 80, mass: 1.2 };
    } else if ('${personality}' === 'playful') {
      return { damping: 15, stiffness: 120, mass: 0.9 };
    }
    return { damping: 15, stiffness: 100, mass: 1 };
  };
  
  const animConfig = getAnimationConfig();
  
  // Trust-based entrance timing (more trust signals = faster entrance)
  const trustDelay = ${trustSignals.length} > 3 ? 5 : 15;
  
  // Component entrance with brand personality
  const componentEntranceScale = spring({
    frame: frame - trustDelay,
    fps,
    config: animConfig
  });
  
  const componentOpacity = spring({
    frame: frame - (trustDelay - 5),
    fps,
    config: { damping: 15, stiffness: 120 }
  });
  
  // Urgency-based micro-interactions
  const urgencyScale = ${urgencySignals.length} > 0 ? 
    1 + Math.sin(frame / 15) * 0.03 : 1;
  
  // Staggered button animations with personality
  const button1Scale = spring({
    frame: frame - 30,
    fps,
    config: animConfig
  });
  
  const button2Scale = spring({
    frame: frame - 40,
    fps,
    config: animConfig
  });
  
  const button3Scale = spring({
    frame: frame - 50,
    fps,
    config: animConfig
  });
  
  const skipScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 25, stiffness: 60 } // Always subtle for skip
  });

  // Brand-aware floating animation
  const logoFloat = '${personality}' === 'playful' ? 
    Math.sin(frame / 30) * 3 : Math.sin(frame / 60) * 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: \`translate(-50%, -50%) scale(\${componentEntranceScale * (componentScale || 1) * urgencyScale}) translateY(\${logoFloat}px)\`,
        width: '35vw',
        height: '50vh',
        background: '${primaryGradient}',
        borderRadius: '${borderRadius.container}',
        boxShadow: '${boxShadow.lg}',
        border: \`2px solid \${accent}40\`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5%',
        fontFamily: '${primaryFont}',
        zIndex: 10,
        opacity: componentOpacity,
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          width: '${sizeConfig.logoSize}',
          height: '${sizeConfig.logoSize}',
          background: '${primary}',
          borderRadius: '20%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8%',
          transform: \`translateY(\${logoFloat}px)\`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            width: '60%',
            height: '60%',
            background: '${secondary}',
            borderRadius: '50%',
            position: 'relative'
          }}
        >
          {/* Simple brand mark - stylized "R" */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              top: '20%',
              width: '50%',
              height: '60%',
              background: '${primary}',
              borderRadius: '25% 25% 25% 0'
            }}
          />
        </div>
      </div>

      {/* 🎯 BRAND-AWARE WELCOME */}
      <h1
        style={{
          fontSize: '${fontSize.h2}',
          fontWeight: '700',
          color: '${primary}',
          margin: '0 0 3% 0',
          textAlign: 'center',
          lineHeight: 1.2,
          fontFamily: '${headingFont}'
        }}
      >
        ${getPersonalizedCopy(headline || 'Welcome Back')}
      </h1>

      {/* Brand tagline/mission */}
      <p
        style={{
          fontSize: '${fontSize.body}',
          color: '${primary}',
          opacity: 0.8,
          margin: '0 0 6% 0',
          textAlign: 'center',
          lineHeight: 1.4,
          fontFamily: '${bodyFont}',
          maxWidth: '90%'
        }}
      >
        ${getPersonalizedCopy(subheadline || 'Enter your credentials to access your account.')}
      </p>
      
      ${userCount || rating ? `
      {/* 📊 SOCIAL PROOF */}
      <div style={{
        display: 'flex',
        gap: '4%',
        marginBottom: '5%',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        ${userCount ? `
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '${fontSize.h3}',
            fontWeight: '700',
            color: '${successColor}'
          }}>
            ${userCount}
          </div>
          <div style={{
            fontSize: '${fontSize.small}',
            opacity: 0.7,
            color: '${primary}'
          }}>
            Users
          </div>
        </div>
        ` : ''}
        
        ${rating ? `
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '${fontSize.h3}',
            fontWeight: '700',
            color: '${warningColor}'
          }}>
            ${rating}⭐
          </div>
          <div style={{
            fontSize: '${fontSize.small}',
            opacity: 0.7,
            color: '${primary}'
          }}>
            Rating
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      {/* Login Buttons */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '4%',
          marginBottom: '8%'
        }}
      >
        {/* 🔴 GOOGLE BUTTON - Preserve Google branding */}
        <div
          style={{
            transform: \`scale(\${button1Scale})\`,
            width: '100%',
            height: '${sizeConfig.buttonHeight}',
            background: '#ffffff',
            border: '2px solid #dadce0',
            borderRadius: '${borderRadius.button}',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3c4043',
            fontSize: '${fontSize.body}',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '${boxShadow.sm}',
            gap: '8px',
            fontFamily: '${bodyFont}',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Google "G" logo - preserve authentic Google colors */}
          <div
            style={{
              width: '18px',
              height: '18px',
              background: 'linear-gradient(45deg, #4285f4 25%, #34a853 25%, #34a853 50%, #fbbc05 50%, #fbbc05 75%, #ea4335 75%)',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            G
          </div>
          ${getPersonalizedCopy('Continue with Google')}
        </div>

        {/* OR Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4%',
            margin: '2% 0'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#E0E0E0' }} />
          <span style={{ 
            fontSize: '${fontSize.body}', 
            color: '${primary}',
            opacity: 0.6,
            fontWeight: '500'
          }}>
            OR
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E0E0E0' }} />
        </div>

        {/* 📧 EMAIL BUTTON - Brand-aware but recognizable */}
        <div
          style={{
            transform: \`scale(\${button2Scale})\`,
            width: '100%',
            height: '${sizeConfig.buttonHeight}',
            background: '${accent}15',
            border: \`2px solid \${accent}40\`,
            borderRadius: '${borderRadius.button}',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '${accent}',
            fontSize: '${fontSize.body}',
            fontWeight: '500',
            cursor: 'pointer',
            gap: '8px',
            fontFamily: '${bodyFont}',
            boxShadow: '${boxShadow.sm}',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Email Icon - brand color but recognizable */}
          <div
            style={{
              width: '16px',
              height: '12px',
              border: \`2px solid \${accent}\`,
              borderRadius: '2px',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                height: '0',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: \`4px solid \${accent}\`
              }}
            />
          </div>
          ${getPersonalizedCopy('Continue with Email')}
        </div>

        {/* 🐙 GITHUB BUTTON - Preserve GitHub's black branding */}
        <div
          style={{
            transform: \`scale(\${button3Scale})\`,
            width: '100%',
            height: '${sizeConfig.buttonHeight}',
            background: '#24292e',
            border: '2px solid #24292e',
            borderRadius: '${borderRadius.button}',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '${fontSize.body}',
            fontWeight: '500',
            cursor: 'pointer',
            gap: '8px',
            fontFamily: '${bodyFont}',
            boxShadow: '${boxShadow.sm}',
            transition: 'all 0.2s ease'
          }}
        >
          {/* GitHub Octocat - preserve authentic GitHub styling */}
          <div
            style={{
              width: '16px',
              height: '16px',
              background: '#ffffff',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#24292e',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            GH
          </div>
          ${getPersonalizedCopy('Continue with GitHub')}
        </div>
      </div>

      {/* 🎯 BRAND CTA OR SKIP */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '3%',
        width: '100%'
      }}>
        {/* Primary brand CTA if available */}
        ${primaryCTA && primaryCTA.label !== 'Get Started' ? `
        <div
          style={{
            transform: \`scale(\${button1Scale})\`,
            padding: '4% 6%',
            background: '${accent}',
            border: 'none',
            borderRadius: '${borderRadius.button}',
            color: '${secondary}',
            fontSize: '${fontSize.body}',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'center',
            fontFamily: '${primaryFont}',
            boxShadow: '${boxShadow.md}'
          }}
        >
          ${getPersonalizedCopy(primaryCTA.label)}
        </div>
        ` : ''}
        
        {/* Skip option */}
        <div
          style={{
            transform: \`scale(\${skipScale})\`,
            padding: '3% 6%',
            background: 'transparent',
            border: \`1px solid \${primary}30\`,
            borderRadius: '${borderRadius.button}',
            color: '${primary}',
            opacity: 0.7,
            fontSize: '${fontSize.small}',
            fontWeight: '400',
            cursor: 'pointer',
            textAlign: 'center',
            fontFamily: '${bodyFont}'
          }}
        >
          ${getPersonalizedCopy('Skip for now')}
        </div>
      </div>
      
      ${trustSignals.length > 0 ? `
      {/* 🔒 TRUST SIGNALS */}
      <div style={{
        marginTop: '4%',
        display: 'flex',
        justifyContent: 'center',
        gap: '4%',
        flexWrap: 'wrap',
        opacity: 0.6
      }}>
        ${trustSignals.slice(0, 3).map((signal: any) => `
        <span style={{
          fontSize: '${fontSize.small}',
          color: '${successColor}',
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          🔒 ${signal}
        </span>
        `).join('')}
      </div>
      ` : ''}
      
      ${awards.length > 0 ? `
      {/* 🏆 AWARDS */}
      <div style={{
        marginTop: '3%',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <span style={{
          fontSize: '${fontSize.small}',
          color: '${infoColor}',
          fontWeight: '500'
        }}>
          🏆 ${awards[0]}
        </span>
      </div>
      ` : ''}
    </div>
  );
}`;
}

export default generateBrandLoginModal;
