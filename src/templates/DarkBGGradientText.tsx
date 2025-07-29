import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function DarkBGGradientText() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive font sizing
  const baseFontSize = Math.min(width, height) * 0.12;
  const fontSize = isPortrait ? baseFontSize * 0.8 : isSquare ? baseFontSize * 0.9 : baseFontSize;
  
  const gradientPosition = interpolate(
    frame,
    [0, fps * 4],
    [-width, width * 2],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  const textScale = interpolate(
    frame,
    [0, 8],
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  // Split text into words for individual animation
  const words = "Welcome to Bazaar".split(" ");
  
  return (
    <AbsoluteFill
      style={{
        background: "black",
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
          transform: `translate(-50%, -50%) scale(${textScale})`,
          fontSize: `${fontSize}px`,
          fontFamily: "Inter, sans-serif",
          fontWeight: "800",
          textAlign: "center",
          whiteSpace: isPortrait ? "normal" : "nowrap",
          display: "flex",
          gap: "0.3em",
          flexDirection: isPortrait ? "column" : "row",
          lineHeight: 1.1
        }}
      >
        {words.map((word, index) => {
          // Stagger each word by 8 frames (faster)
          const wordStartFrame = index * 8;
          const wordEndFrame = wordStartFrame + 15;
          
          // Slide up animation for each word
          const wordY = interpolate(
            frame,
            [wordStartFrame, wordEndFrame],
            [100, 0],
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
          
          return (
            <div
              key={index}
              style={{
                position: "relative",
                transform: `translateY(${wordY}px)`,
                opacity: wordOpacity
              }}
            >
              {/* Base text layer */}
              <div
                style={{
                  color: index < 2 ? "white" : "transparent",
                  userSelect: "none"
                }}
              >
                {word}
              </div>
              
              {/* Gradient overlay for "Bazaar" */}
              {index === 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    background: `linear-gradient(90deg, #ff5f6d 0%, #ffc371 25%, #a18cd1 50%, #fbc2eb 75%, #ff5f6d 100%) ${gradientPosition}px 0 / ${width * 2}px 100%`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  {word}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'dark-bg-gradient-text',
  name: 'Dark BG Gradient Text',
  duration: 60, // 2 seconds
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function DarkBGGradientText() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["800"] });
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive font sizing
  const baseFontSize = Math.min(width, height) * 0.12;
  const fontSize = isPortrait ? baseFontSize * 0.8 : isSquare ? baseFontSize * 0.9 : baseFontSize;
  
  const gradientPosition = interpolate(
    frame,
    [0, fps * 4],
    [-width, width * 2],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  const textScale = interpolate(
    frame,
    [0, 8],
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  // Split text into words for individual animation
  const words = "Welcome to Bazaar".split(" ");
  
  return (
    <AbsoluteFill
      style={{
        background: "black",
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
          transform: \`translate(-50%, -50%) scale(\${textScale})\`,
          fontSize: \`\${fontSize}px\`,
          fontFamily: "Inter",
          fontWeight: "800",
          textAlign: "center",
          whiteSpace: isPortrait ? "normal" : "nowrap",
          display: "flex",
          gap: "0.3em",
          flexDirection: isPortrait ? "column" : "row",
          lineHeight: 1.1
        }}
      >
        {words.map((word, index) => {
          // Stagger each word by 8 frames (faster)
          const wordStartFrame = index * 8;
          const wordEndFrame = wordStartFrame + 15;
          
          // Slide up animation for each word
          const wordY = interpolate(
            frame,
            [wordStartFrame, wordEndFrame],
            [100, 0],
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
          
          return (
            <div
              key={index}
              style={{
                position: "relative",
                transform: \`translateY(\${wordY}px)\`,
                opacity: wordOpacity
              }}
            >
              <div
                style={{
                  color: index < 2 ? "white" : "transparent",
                  userSelect: "none"
                }}
              >
                {word}
              </div>
              
              {index === 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    background: \`linear-gradient(90deg, #ff5f6d 0%, #ffc371 25%, #a18cd1 50%, #fbc2eb 75%, #ff5f6d 100%) \${gradientPosition}px 0 / \${width * 2}px 100%\`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  {word}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}`
}; 