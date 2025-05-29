import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface WelcomeSceneProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const WelcomeScene: React.FC<WelcomeSceneProps> = ({
  title = "Welcome to Bazaar",
  subtitle = "Start creating your video by describing what you want to see",
  backgroundColor = "#0f0f23",
  textColor = "#ffffff"
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation timings
  const titleStart = 0;
  const titleDuration = fps * 1.5; // 1.5 seconds
  const subtitleStart = fps * 0.8; // Start 0.8 seconds in
  const subtitleDuration = fps * 2; // 2 seconds
  const pulseStart = fps * 2; // Start pulsing after 2 seconds

  // Title animation - fade in and scale
  const titleOpacity = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleScale = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtitle animation - fade in with slight delay
  const subtitleOpacity = interpolate(
    frame,
    [subtitleStart, subtitleStart + subtitleDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subtitleTranslateY = interpolate(
    frame,
    [subtitleStart, subtitleStart + subtitleDuration],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Gentle pulsing effect for the entire scene
  const pulseScale = interpolate(
    frame,
    [pulseStart, pulseStart + fps * 2, pulseStart + fps * 4],
    [1, 1.02, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "extend" }
  );

  // Gradient background animation
  const gradientRotation = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Call to action opacity
  const ctaOpacity = interpolate(
    frame,
    [fps * 3, fps * 4.5],
    [0, 0.6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(${gradientRotation}deg, ${backgroundColor}, #1a1a3a, ${backgroundColor})`,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.1,
        }}
      >
        {[...Array(20)].map((_, i) => {
          const particleDelay = i * 0.2;
          const particleOpacity = interpolate(
            frame,
            [fps * particleDelay, fps * (particleDelay + 2)],
            [0, 0.3],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          
          const particleY = interpolate(
            frame,
            [0, durationInFrames],
            [Math.random() * 100, Math.random() * 100 - 20],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: `${particleY}%`,
                width: "4px",
                height: "4px",
                backgroundColor: textColor,
                borderRadius: "50%",
                opacity: particleOpacity,
              }}
            />
          );
        })}
      </div>

      {/* Main content container */}
      <div
        style={{
          transform: `scale(${pulseScale})`,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: "700",
            color: textColor,
            margin: "0 0 1rem 0",
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            background: `linear-gradient(45deg, ${textColor}, #a855f7, #3b82f6)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%",
            animation: `gradient-shift 3s ease-in-out infinite`,
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "1.5rem",
            color: textColor,
            opacity: subtitleOpacity * 0.8,
            transform: `translateY(${subtitleTranslateY}px)`,
            margin: "0",
            maxWidth: "600px",
            lineHeight: "1.6",
          }}
        >
          {subtitle}
        </p>

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(
              frame,
              [fps * 2.5, fps * 4],
              [0, 200],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${textColor}, transparent)`,
            margin: "2rem auto",
            opacity: 0.6,
          }}
        />

        {/* Call to action */}
        <div
          style={{
            fontSize: "1rem",
            color: textColor,
            opacity: ctaOpacity,
            marginTop: "1rem",
          }}
        >
          Type your first prompt to begin...
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>
        {`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}
      </style>
    </div>
  );
}; 