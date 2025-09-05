// src/templates/GradientText.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function GradientText() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;

  // Fixed sizing (not responsive)
  const svgWidth = Math.min(width * 0.9, isPortrait ? width * 0.95 : 1400);
  const svgHeight = isPortrait ? height * 0.4 : 200;
  const fontSize = 120; // Fixed large font size

  const loopDuration = fps * 2;
  const hueShift = (frame % loopDuration) * (360 / loopDuration) * 1.5;

  // Split text into words for portrait animation
  const words = "Create without Limits".split(" ");

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
            
            // Generate blue gradient for middle word
            const gradientStyle = index === 1 ? {
              background: `linear-gradient(${360 - hueShift}deg, hsl(200, 100%, 60%) 0%, hsl(210, 100%, 60%) 20%, hsl(220, 100%, 60%) 40%, hsl(230, 100%, 60%) 60%, hsl(240, 100%, 60%) 80%, hsl(200, 100%, 60%) 100%)`,
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
        display: "flex"
      }}
    >
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: '90%', height: 'auto' }}
      >
        <defs>
          <linearGradient
            id="blue-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
            gradientTransform={`rotate(${360 - hueShift}, 0.5, 0.5)`}
          >
            <stop offset="0%" stopColor="hsl(200, 100%, 60%)" />
            <stop offset="20%" stopColor="hsl(210, 100%, 60%)" />
            <stop offset="40%" stopColor="hsl(220, 100%, 60%)" />
            <stop offset="60%" stopColor="hsl(230, 100%, 60%)" />
            <stop offset="80%" stopColor="hsl(240, 100%, 60%)" />
            <stop offset="100%" stopColor="hsl(200, 100%, 60%)" />
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
          Create
        </text>

        <text
          x={svgWidth * 0.5}
          y={svgHeight * 0.65}
          fill="url(#blue-gradient)"
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
  name: 'Create without Limits',
  duration: 90,
  previewFrame: 15,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function BlueGradientText_me44xgz7() {
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Format detection for responsive sizing
const aspectRatio = width / height;
const isPortrait = aspectRatio < 1;
const isSquare = Math.abs(aspectRatio - 1) < 0.2;

// Fixed sizing (not responsive)
const svgWidth = Math.min(width * 0.9, isPortrait ? width * 0.95 : 1400);
const svgHeight = isPortrait ? height * 0.4 : 200;
const fontSize = 120; // Fixed large font size

const loopDuration = fps * 2;
const hueShift = (frame % loopDuration) * (360 / loopDuration) * 1.5;

// Split text into words for portrait animation
const words = "Create without Limits".split(" ");

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
          
          // Generate blue gradient for middle word
          const gradientStyle = index === 1 ? {
            background: \`linear-gradient(\${360 - hueShift}deg, hsl(200, 100%, 60%) 0%, hsl(210, 100%, 60%) 20%, hsl(220, 100%, 60%) 40%, hsl(230, 100%, 60%) 60%, hsl(240, 100%, 60%) 80%, hsl(200, 100%, 60%) 100%)\`,
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
        <linearGradient
          id="blue-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          gradientTransform={\`rotate(\${360 - hueShift}, 0.5, 0.5)\`}
        >
          <stop offset="0%" stopColor="hsl(200, 100%, 60%)" />
          <stop offset="20%" stopColor="hsl(210, 100%, 60%)" />
          <stop offset="40%" stopColor="hsl(220, 100%, 60%)" />
          <stop offset="60%" stopColor="hsl(230, 100%, 60%)" />
          <stop offset="80%" stopColor="hsl(240, 100%, 60%)" />
          <stop offset="100%" stopColor="hsl(200, 100%, 60%)" />
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
        Create
      </text>

      <text
        x={svgWidth * 0.5}
        y={svgHeight * 0.65}
        fill="url(#blue-gradient)"
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
