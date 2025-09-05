import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export default function ProductHuntWelcome() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Spring animations for smooth entrance
  const logoScale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });
  
  const textOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  const textSlide = interpolate(frame, [15, 35], [20, 0], {
    extrapolateRight: 'clamp',
  });
  
  // Subtle breathing animation for the logo
  const breathe = Math.sin(frame * 0.05) * 0.02 + 1;
  
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE5D9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '800px',
        }}
      >
        {/* Logo container */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            backgroundColor: 'white',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            transform: `scale(${logoScale * breathe})`,
            marginBottom: '40px',
          }}
        >
          {/* Product Hunt P logo */}
          <svg
            width="60"
            height="60"
            viewBox="0 0 40 40"
            fill="none"
            style={{
              transform: `scale(${interpolate(frame, [5, 20], [0.8, 1], {
                extrapolateRight: 'clamp',
              })})`,
            }}
          >
            <path
              d="M22 10H14V18H22C24.21 18 26 16.21 26 14C26 11.79 24.21 10 22 10Z"
              fill="#DA552F"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M20 40C31.0457 40 40 31.0457 40 20C40 8.95431 31.0457 0 20 0C8.95431 0 0 8.95431 0 20C0 31.0457 8.95431 40 20 40ZM14 10V18V22V30H10V10H14H22C24.21 10 26 11.79 26 14C26 16.21 24.21 18 22 18H14V22H22C26.42 22 30 18.42 30 14C30 9.58 26.42 6 22 6H10C8.89543 6 8 6.89543 8 8V32C8 33.1046 8.89543 34 10 34H14C15.1046 34 16 33.1046 16 32V22H14V30Z"
              fill="#DA552F"
              fillOpacity="0"
            />
            <rect
              x="10"
              y="10"
              width="4"
              height="20"
              fill="#DA552F"
            />
            <rect
              x="10"
              y="18"
              width="12"
              height="4"
              fill="#DA552F"
            />
          </svg>
        </div>
        
        {/* Welcome text */}
        <h1
          style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#2B2B2B',
            margin: '0 0 20px 0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            opacity: textOpacity,
            transform: `translateY(${textSlide}px)`,
          }}
        >
          Welcome to Product Hunt!
        </h1>
        
        {/* Tagline */}
        <p
          style={{
            fontSize: '24px',
            color: '#6B6B6B',
            margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            opacity: interpolate(frame, [25, 45], [0, 1], {
              extrapolateRight: 'clamp',
            }),
            transform: `translateY(${interpolate(frame, [25, 45], [20, 0], {
              extrapolateRight: 'clamp',
            })}px)`,
            lineHeight: 1.4,
          }}
        >
          The place to launch and discover new products
        </p>
        
        {/* Animated decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            right: '10%',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6154, #FF9049)',
            opacity: 0.1,
            transform: `translateY(${Math.sin(frame * 0.02) * 10}px)`,
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '8%',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #DA552F, #FF6154)',
            opacity: 0.08,
            transform: `translateY(${Math.sin(frame * 0.03 + 1) * 8}px)`,
          }}
        />
        
        {/* Subtle particles */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${20 + i * 30}%`,
              top: `${30 + i * 15}%`,
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#DA552F',
              opacity: interpolate(
                frame,
                [30 + i * 10, 40 + i * 10, 80 + i * 10, 90 + i * 10],
                [0, 0.3, 0.3, 0],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }
              ),
              transform: `translateY(${interpolate(
                frame,
                [30 + i * 10, 90 + i * 10],
                [0, -30],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }
              )}px)`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'product-hunt-welcome',
  name: 'Product Hunt Welcome',
  duration: 120, // 4 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
interpolate,
spring,
useCurrentFrame,
useVideoConfig,
} = window.Remotion;

export default function ProductHuntWelcome() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Spring animations for smooth entrance
const logoScale = spring({
  frame,
  fps,
  from: 0,
  to: 1,
  config: {
    damping: 20,
    stiffness: 100,
  },
});

const textOpacity = interpolate(frame, [15, 35], [0, 1], {
  extrapolateRight: 'clamp',
});

const textSlide = interpolate(frame, [15, 35], [20, 0], {
  extrapolateRight: 'clamp',
});

// Subtle breathing animation for the logo
const breathe = Math.sin(frame * 0.05) * 0.02 + 1;

return (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE5D9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        padding: '40px',
        maxWidth: '800px',
      }}
    >
      {/* Logo container */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          transform: \`scale(\${logoScale * breathe})\`,
          marginBottom: '40px',
        }}
      >
        {/* Product Hunt P logo */}
        <svg
          width="60"
          height="60"
          viewBox="0 0 40 40"
          fill="none"
          style={{
            transform: \`scale(\${interpolate(frame, [5, 20], [0.8, 1], {
              extrapolateRight: 'clamp',
            })})\`,
          }}
        >
          <path
            d="M22 10H14V18H22C24.21 18 26 16.21 26 14C26 11.79 24.21 10 22 10Z"
            fill="#DA552F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20 40C31.0457 40 40 31.0457 40 20C40 8.95431 31.0457 0 20 0C8.95431 0 0 8.95431 0 20C0 31.0457 8.95431 40 20 40ZM14 10V18V22V30H10V10H14H22C24.21 10 26 11.79 26 14C26 16.21 24.21 18 22 18H14V22H22C26.42 22 30 18.42 30 14C30 9.58 26.42 6 22 6H10C8.89543 6 8 6.89543 8 8V32C8 33.1046 8.89543 34 10 34H14C15.1046 34 16 33.1046 16 32V22H14V30Z"
            fill="#DA552F"
            fillOpacity="0"
          />
          <rect
            x="10"
            y="10"
            width="4"
            height="20"
            fill="#DA552F"
          />
          <rect
            x="10"
            y="18"
            width="12"
            height="4"
            fill="#DA552F"
          />
        </svg>
      </div>
      
      {/* Welcome text */}
      <h1
        style={{
          fontSize: '48px',
          fontWeight: '700',
          color: '#2B2B2B',
          margin: '0 0 20px 0',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          opacity: textOpacity,
          transform: \`translateY(\${textSlide}px)\`,
        }}
      >
        Welcome to Product Hunt!
      </h1>
      
      {/* Tagline */}
      <p
        style={{
          fontSize: '24px',
          color: '#6B6B6B',
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          opacity: interpolate(frame, [25, 45], [0, 1], {
            extrapolateRight: 'clamp',
          }),
          transform: \`translateY(\${interpolate(frame, [25, 45], [20, 0], {
            extrapolateRight: 'clamp',
          })}px)\`,
          lineHeight: 1.4,
        }}
      >
        The place to launch and discover new products
      </p>
      
      {/* Animated decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6154, #FF9049)',
          opacity: 0.1,
          transform: \`translateY(\${Math.sin(frame * 0.02) * 10}px)\`,
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '8%',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #DA552F, #FF6154)',
          opacity: 0.08,
          transform: \`translateY(\${Math.sin(frame * 0.03 + 1) * 8}px)\`,
        }}
      />
      
      {/* Subtle particles */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: \`\${20 + i * 30}%\`,
            top: \`\${30 + i * 15}%\`,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#DA552F',
            opacity: interpolate(
              frame,
              [30 + i * 10, 40 + i * 10, 80 + i * 10, 90 + i * 10],
              [0, 0.3, 0.3, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }
            ),
            transform: \`translateY(\${interpolate(
              frame,
              [30 + i * 10, 90 + i * 10],
              [0, -30],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }
            )}px)\`,
          }}
        />
      ))}
    </div>
  </AbsoluteFill>
);
}`
};