// src/templates/GradientText.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function GradientText() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive sizing
  const svgWidth = Math.min(width * 0.9, isPortrait ? width * 0.95 : 1400);
  const svgHeight = isPortrait ? height * 0.4 : 200;
  const baseFontSize = Math.min(svgWidth, svgHeight) * 0.2;
  const fontSize = isPortrait ? baseFontSize * 0.8 : baseFontSize;

  const loopDuration = fps * 2;
  const hueBase = (frame % loopDuration) * (360 / loopDuration);
  const getHue = (offset: number) => `hsl(${(hueBase + offset) % 360}, 100%, 60%)`;

  // Split text into words for portrait animation
  const words = "Design without Limits".split(" ");

  if (isPortrait) {
    // Use word-by-word animation for portrait like dark-bg-gradient-text
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: `${fontSize}px`,
            fontFamily: "Inter, sans-serif",
            fontWeight: "700",
            textAlign: "center",
            display: "flex",
            gap: "0.4em",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            lineHeight: 1.2,
            maxWidth: "90%"
          }}
        >
          {words.map((word, index) => {
            // Stagger each word by 10 frames
            const wordStartFrame = index * 10;
            const wordEndFrame = wordStartFrame + 20;
            
            // Slide up animation for each word
            const wordY = interpolate(
              frame,
              [wordStartFrame, wordEndFrame],
              [50, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }
            );
            
            // Opacity animation for each word
            const wordOpacity = interpolate(
              frame,
              [wordStartFrame, wordEndFrame],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }
            );
            
            // Generate gradient for middle word
            const gradientStyle = index === 1 ? {
              background: `linear-gradient(90deg, ${getHue(0)} 0%, ${getHue(60)} 20%, ${getHue(120)} 40%, ${getHue(180)} 60%, ${getHue(240)} 80%, ${getHue(300)} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent"
            } : { color: "#000" };
            
            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  transform: `translateY(${wordY}px)`,
                  opacity: wordOpacity,
                  ...gradientStyle
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: '90%', height: 'auto' }}
      >
        <defs>
          <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getHue(0)} />
            <stop offset="20%" stopColor={getHue(60)} />
            <stop offset="40%" stopColor={getHue(120)} />
            <stop offset="60%" stopColor={getHue(180)} />
            <stop offset="80%" stopColor={getHue(240)} />
            <stop offset="100%" stopColor={getHue(300)} />
          </linearGradient>
        </defs>

        <text
          x={svgWidth * 0.15}
          y={svgHeight * 0.65}
          fill="#000"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize={fontSize}
          textAnchor="middle"
        >
          Design
        </text>

        <text
          x={svgWidth * 0.5}
          y={svgHeight * 0.65}
          fill="url(#text-gradient)"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize={fontSize}
          textAnchor="middle"
        >
          without
        </text>

        <text
          x={svgWidth * 0.85}
          y={svgHeight * 0.65}
          fill="#000"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize={fontSize}
          textAnchor="middle"
        >
          Limits
        </text>
      </svg>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'gradient-text',
  name: 'Gradient Text',
  duration: 60,
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function GradientText() {
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Format detection for responsive sizing
const aspectRatio = width / height;
const isPortrait = aspectRatio < 1;
const isSquare = Math.abs(aspectRatio - 1) < 0.2;

// Responsive sizing
const svgWidth = Math.min(width * 0.9, isPortrait ? width * 0.95 : 1400);
const svgHeight = isPortrait ? height * 0.4 : 200;
const baseFontSize = Math.min(svgWidth, svgHeight) * 0.2;
const fontSize = isPortrait ? baseFontSize * 0.8 : baseFontSize;

const loopDuration = fps * 2;
const hueBase = (frame % loopDuration) * (360 / loopDuration);
const getHue = (offset) => \`hsl(\${(hueBase + offset) % 360}, 100%, 60%)\`;

// Split text into words for portrait animation
const words = "Design without Limits".split(" ");

if (isPortrait) {
  // Use word-by-word animation for portrait like dark-bg-gradient-text
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: \`\${fontSize}px\`,
          fontFamily: "Inter, sans-serif",
          fontWeight: "700",
          textAlign: "center",
          display: "flex",
          gap: "0.4em",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          lineHeight: 1.2,
          maxWidth: "90%"
        }}
      >
        {words.map((word, index) => {
          // Stagger each word by 10 frames
          const wordStartFrame = index * 10;
          const wordEndFrame = wordStartFrame + 20;
          
          // Slide up animation for each word
          const wordY = interpolate(
            frame,
            [wordStartFrame, wordEndFrame],
            [50, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            }
          );
          
          // Opacity animation for each word
          const wordOpacity = interpolate(
            frame,
            [wordStartFrame, wordEndFrame],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            }
          );
          
          // Generate gradient for middle word
          const gradientStyle = index === 1 ? {
            background: \`linear-gradient(90deg, \${getHue(0)} 0%, \${getHue(60)} 20%, \${getHue(120)} 40%, \${getHue(180)} 60%, \${getHue(240)} 80%, \${getHue(300)} 100%)\`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent"
          } : { color: "#000" };
          
          return (
            <div
              key={index}
              style={{
                position: "relative",
                transform: \`translateY(\${wordY}px)\`,
                opacity: wordOpacity,
                ...gradientStyle
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      display: "flex",
    }}
  >
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      viewBox={\`0 0 \${svgWidth} \${svgHeight}\`}
      style={{ maxWidth: '90%', height: 'auto' }}
    >
      <defs>
        <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={getHue(0)} />
          <stop offset="20%" stopColor={getHue(60)} />
          <stop offset="40%" stopColor={getHue(120)} />
          <stop offset="60%" stopColor={getHue(180)} />
          <stop offset="80%" stopColor={getHue(240)} />
          <stop offset="100%" stopColor={getHue(300)} />
        </linearGradient>
      </defs>

      <text
        x={svgWidth * 0.15}
        y={svgHeight * 0.65}
        fill="#000"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        textAnchor="middle"
      >
        Design
      </text>

      <text
        x={svgWidth * 0.5}
        y={svgHeight * 0.65}
        fill="url(#text-gradient)"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        textAnchor="middle"
      >
        without
      </text>

      <text
        x={svgWidth * 0.85}
        y={svgHeight * 0.65}
        fill="#000"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        textAnchor="middle"
      >
        Limits
      </text>
    </svg>
  </AbsoluteFill>
);
}`
}; 