// Evaluation Output
// Prompt: Analyze Image Then Create
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:39:03.699Z
// Latency: 216876ms
// Cost: $0.0056
// Input: analyze this design in detail and recreate it with particle effects

export default function Scene1_mbqke0cn() {
  const {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} = window.Remotion;
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // Animation: Card entrance
  const cardSpring = spring({
    frame,
    fps,
    from: 60,
    to: 0,
    config: {damping: 200, mass: 1, stiffness: 120},
    durationInFrames: fps * 0.8,
  });
  const cardOpacity = interpolate(frame, [0, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardTranslateY = interpolate(cardSpring, [0, 1], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animation: Title fade/slide in
  const titleOpacity = interpolate(frame, [fps * 0.1, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleTranslateY = interpolate(frame, [fps * 0.1, fps * 0.5], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animation: Subtitle fade/slide in
  const subtitleOpacity = interpolate(frame, [fps * 0.25, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleTranslateY = interpolate(frame, [fps * 0.25, fps * 0.7], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animation: Value fade/slide in
  const valueOpacity = interpolate(frame, [fps * 0.35, fps * 0.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const valueTranslateY = interpolate(frame, [fps * 0.35, fps * 0.85], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Graph line points (normalized to 400x120 area)
  const graphWidth = 400;
  const graphHeight = 120;
  const graphLeft = 28;
  const graphTop = 78;
  const graphPoints = [
    0, 110, 10, 112, 20, 115, 30, 112, 40, 110, 50, 108, 60, 112, 70, 100, 80, 90, 90, 110, 100, 80, 110, 60, 120, 100,
    130, 80, 140, 110, 150, 50, 160, 90, 170, 100, 180, 60, 190, 110, 200, 40, 210, 100, 220, 90, 230, 70, 240, 110, 250, 80,
    260, 50, 270, 100, 280, 60, 290, 110, 300, 90, 310, 80, 320, 100, 330, 60, 340, 110, 350, 80, 360, 50, 370, 100, 380, 60, 390, 110, 400, 90
  ];

  // Animate graph line draw
  const graphDraw = interpolate(frame, [fps * 0.5, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const totalGraphLength = graphPoints.length / 2;
  const animatedPoints = Math.floor(totalGraphLength * graphDraw);

  // Y axis labels fade in
  const yLabelOpacity = interpolate(frame, [fps * 0.7, fps * 1.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // X axis labels fade in
  const xLabelOpacity = interpolate(frame, [fps * 0.8, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Particle effect (subtle floating dots)
  const particleCount = 18;
  const particles = Array.from({length: particleCount}).map((_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 170 + 10 * Math.sin(frame / 40 + i);
    const x = graphLeft + graphWidth / 2 + Math.cos(angle + frame / 80 + i) * radius;
    const y = graphTop + graphHeight / 2 + Math.sin(angle + frame / 80 + i) * radius * 0.5;
    const size = 2.5 + 1.5 * Math.sin(frame / 30 + i * 2);
    const opacity = 0.12 + 0.14 * Math.abs(Math.sin(frame / 60 + i));
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: "#4ADE80",
          opacity,
          pointerEvents: "none",
          filter: "blur(0.5px)",
        }}
      />
    );
  });

  // Card shadow
  const cardShadow = "0 2px 24px 0 rgba(0,0,0,0.48)";

  // Colors
  const cardBg = "#18181B";
  const borderColor = "#27272A";
  const textColor = "#F4F4F5";
  const subTextColor = "#A1A1AA";
  const accentColor = "#4ADE80";
  const gridColor = "#27272A";

  // Font
  const fontFamily = "Inter, Arial, sans-serif";

  // SVG Graph Path
  let pathD = "";
  for (let i = 0; i < animatedPoints - 1; i++) {
    const x1 = graphPoints[i * 2];
    const y1 = graphPoints[i * 2 + 1];
    const x2 = graphPoints[(i + 1) * 2];
    const y2 = graphPoints[(i + 1) * 2 + 1];
    if (i === 0) {
      pathD += `M${x1},${y1}`;
    }
    pathD += ` L${x2},${y2}`;
  }

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "440px",
          height: "240px",
          background: cardBg,
          borderRadius: "16px",
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
          overflow: "hidden",
          opacity: cardOpacity,
          transform: `translateY(${cardTranslateY}px)`,
          transition: "box-shadow 0.2s",
        }}
      >
        {/* Particles */}
        {particles}

        {/* Title */}
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "20px",
            color: textColor,
            fontFamily,
            fontWeight: "600",
            fontSize: "1.02rem",
            letterSpacing: "0.01em",
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            transition: "opacity 0.3s",
            lineHeight: "1.2",
            textShadow: "0 1px 2px rgba(0,0,0,0.12)",
          }}
        >
          Edge Requests
        </div>
        {/* Subtitle */}
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "46px",
            color: subTextColor,
            fontFamily,
            fontWeight: "400",
            fontSize: "0.97rem",
            letterSpacing: "0.01em",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
            transition: "opacity 0.3s",
            lineHeight: "1.2",
          }}
        >
          Invocations
        </div>
        {/* Value */}
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "66px",
            color: accentColor,
            fontFamily,
            fontWeight: "700",
            fontSize: "1.22rem",
            letterSpacing: "0.01em",
            opacity: valueOpacity,
            transform: `translateY(${valueTranslateY}px)`,
            transition: "opacity 0.3s",
            lineHeight: "1.2",
            textShadow: "0 1px 2px rgba(0,0,0,0.10)",
          }}
        >
          2K
        </div>
        {/* Graph */}
        <svg
          width={graphWidth}
          height={graphHeight}
          style={{
            position: "absolute",
            left: `${graphLeft}px`,
            top: `${graphTop}px`,
            zIndex: 2,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {/* Grid lines */}
          <line x1="0" y1="20" x2={graphWidth} y2="20" stroke={gridColor} strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="60" x2={graphWidth} y2="60" stroke={gridColor} strokeWidth="1" opacity="0.5" />
          <line x1="0" y1="100" x2={graphWidth} y2="100" stroke={gridColor} strokeWidth="1" opacity="0.3" />

          {/* Graph line */}
          <path
            d={pathD}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(74,222,128,0.15))",
              transition: "stroke-dashoffset 0.3s",
            }}
          />

          {/* Idle pulse on graph line */}
          <circle
            cx={graphPoints[(animatedPoints - 1) * 2] || 0}
            cy={graphPoints[(animatedPoints - 1) * 2 + 1] || 0}
            r={4 + Math.sin(frame / 10) * 1.5}
            fill={accentColor}
            opacity="0.7"
            style={{
              filter: "blur(0.5px)",
              transition: "r 0.2s",
            }}
          />
        </svg>
        {/* Y axis labels */}
        <div
          style={{
            position: "absolute",
            left: "10px",
            top: `${graphTop + 8}px`,
            color: subTextColor,
            fontFamily,
            fontWeight: "500",
            fontSize: "0.85rem",
            opacity: yLabelOpacity,
            letterSpacing: "0.01em",
            textAlign: "right",
            width: "18px",
            lineHeight: "1",
          }}
        >
          100
        </div>
        <div
          style={{
            position: "absolute",
            left: "10px",
            top: `${graphTop + 48}px`,
            color: subTextColor,
            fontFamily,
            fontWeight: "500",
            fontSize: "0.85rem",
            opacity: yLabelOpacity,
            letterSpacing: "0.01em",
            textAlign: "right",
            width: "18px",
            lineHeight: "1",
          }}
        >
          50
        </div>
        <div
          style={{
            position: "absolute",
            left: "10px",
            top: `${graphTop + 88}px`,
            color: subTextColor,
            fontFamily,
            fontWeight: "500",
            fontSize: "0.85rem",
            opacity: yLabelOpacity,
            letterSpacing: "0.01em",
            textAlign: "right",
            width: "18px",
            lineHeight: "1",
          }}
        >
          0
        </div>
        {/* X axis labels */}
        <div
          style={{
            position: "absolute",
            left: `${graphLeft + 2}px`,
            top: `${graphTop + graphHeight + 4}px`,
            color: subTextColor,
            fontFamily,
            fontWeight: "500",
            fontSize: "0.85rem",
            opacity: xLabelOpacity,
            letterSpacing: "0.01em",
            textAlign: "left",
            width: "60px",
            lineHeight: "1",
          }}
        >
          12 hours ago
        </div>
        <div
          style={{
            position: "absolute",
            right: "24px",
            top: `${graphTop + graphHeight + 4}px`,
            color: subTextColor,
            fontFamily,
            fontWeight: "500",
            fontSize: "0.85rem",
            opacity: xLabelOpacity,
            letterSpacing: "0.01em",
            textAlign: "right",
            width: "40px",
            lineHeight: "1",
          }}
        >
          Now
        </div>
        {/* Chevron icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{
            position: "absolute",
            right: "18px",
            top: "18px",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          <path
            d="M7.5 6.5L10.5 9L7.5 11.5"
            stroke="#A1A1AA"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
}