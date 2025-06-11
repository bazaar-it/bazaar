// Evaluation Output
// Prompt: Product Demo Creation
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:15:35.850Z
// Latency: 215736ms
// Cost: $0.0056
// Input: create a product demo scene showing our new dashboard. use modern colors and smooth animations. the product is called DataViz Pro

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

function AnimatedGradientBackground({ colors, duration }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Animate background position horizontally
  const progress = interpolate(
    frame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const bgPos = `${Math.round(progress * 100)}% 50%`;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
        backgroundPosition: bgPos,
        backgroundSize: "200% 100%",
        width: "100%",
        height: "100%",
        position: "absolute",
        top: "0",
        left: "0",
        zIndex: "0",
        transition: "background-position 0.3s linear"
      }}
    />
  );
}

function GradientText({ text, fontSize, fontWeight, gradient, textAlign, style, opacity, scale }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "14%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        textAlign: textAlign,
        background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        opacity: opacity,
        letterSpacing: "0.01em",
        lineHeight: "1.05",
        ...style
      }}
    >
      {text}
    </div>
  );
}

function DashboardImage({ src, width, borderRadius, boxShadow, opacity, translateY, scale }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "38%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`,
        width: width,
        height: "auto",
        borderRadius: `${borderRadius}px`,
        boxShadow: boxShadow,
        background: "#111827",
        opacity: opacity,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <img
        src={src}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: `${borderRadius}px`
        }}
        alt="DataViz Pro Dashboard"
        draggable={false}
      />
    </div>
  );
}

function FeatureList({ items, fontSize, fontWeight, color, lineHeight, revealCount }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "66%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "60%",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: color,
        lineHeight: String(lineHeight),
        textAlign: "center",
        letterSpacing: "0.01em",
        zIndex: "10"
      }}
    >
      <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
        {items.slice(0, revealCount).map((item, i) => (
          <li key={i} style={{
            marginBottom: i < items.length - 1 ? "0.7em" : "0",
            opacity: 1,
            transition: "opacity 0.3s"
          }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CTAButton({ text, fontSize, fontWeight, backgroundColor, color, padding, borderRadius, opacity, scale, glow }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "85%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: opacity,
        zIndex: "20"
      }}
    >
      <button
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          backgroundColor: backgroundColor,
          color: color,
          padding: padding,
          border: "none",
          borderRadius: `${borderRadius}px`,
          cursor: "pointer",
          boxShadow: glow ? `0 0 16px 4px ${glow}` : "0 2px 8px rgba(16, 185, 129, 0.18)",
          transition: "box-shadow 0.3s, transform 0.2s"
        }}
        tabIndex={-1}
      >
        {text}
      </button>
    </div>
  );
}

export default function Scene1_2417c9b4() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // --- Title Animation ---
  const titleInStart = 0;
  const titleInDur = 30;
  const titleOutStart = 90;
  const titleOutDur = 30;
  let titleOpacity = 1;
  if (frame < titleInStart) titleOpacity = 0;
  else if (frame < titleInStart + titleInDur) {
    titleOpacity = interpolate(
      frame,
      [titleInStart, titleInStart + titleInDur],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (frame >= titleOutStart) {
    titleOpacity = interpolate(
      frame,
      [titleOutStart, titleOutStart + titleOutDur],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  // --- Dashboard Image Animation ---
  const dashInStart = 30;
  const dashInDur = 45;
  let dashOpacity = 0;
  let dashTranslateY = 80;
  if (frame < dashInStart) {
    dashOpacity = 0;
    dashTranslateY = 80;
  } else if (frame < dashInStart + dashInDur) {
    dashOpacity = interpolate(
      frame,
      [dashInStart, dashInStart + dashInDur],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    dashTranslateY = interpolate(
      frame,
      [dashInStart, dashInStart + dashInDur],
      [80, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else {
    dashOpacity = 1;
    dashTranslateY = 0;
  }
  // Pulse focus effect (scale up/down)
  let dashScale = 1;
  const pulseStart = dashInStart + dashInDur;
  const pulseDur = 60;
  if (frame >= pulseStart && frame < pulseStart + pulseDur * 2) {
    // 2 pulses
    const pulsePhase = ((frame - pulseStart) % pulseDur) / pulseDur;
    dashScale = interpolate(
      pulsePhase,
      [0, 0.5, 1],
      [1, 1.05, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  // --- Feature List Animation (Typewriter) ---
  const featureStart = 75;
  const featureDur = 90;
  const featureItems = [
    "Real-time data visualization",
    "Customizable dashboards",
    "Advanced analytics tools"
  ];
  let featureReveal = 0;
  if (frame >= featureStart) {
    const progress = interpolate(
      frame,
      [featureStart, featureStart + featureDur],
      [0, featureItems.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    featureReveal = Math.min(featureItems.length, Math.floor(progress + 0.999));
  }

  // --- CTA Button Animation ---
  const ctaStart = 120;
  const ctaDur = 30;
  let ctaOpacity = 0;
  if (frame >= ctaStart && frame < ctaStart + ctaDur) {
    ctaOpacity = interpolate(
      frame,
      [ctaStart, ctaStart + ctaDur],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (frame >= ctaStart + ctaDur) {
    ctaOpacity = 1;
  }
  // CTA hover scale pulse (simulate hover animation after appearance)
  let ctaScale = 1;
  let ctaGlow = null;
  if (frame >= ctaStart + ctaDur) {
    const hoverPulseDur = 15;
    const hoverPhase = ((frame - (ctaStart + ctaDur)) % (hoverPulseDur * 2)) / hoverPulseDur;
    if (hoverPhase < 1) {
      ctaScale = interpolate(
        hoverPhase,
        [0, 1],
        [1, 1.1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      ctaGlow = "#6ee7b7";
    } else {
      ctaScale = interpolate(
        hoverPhase - 1,
        [0, 1],
        [1.1, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      ctaGlow = "#6ee7b7";
    }
  }

  return (
    <AbsoluteFill style={{ width: "100%", height: "100%", background: "#1e3a8a", overflow: "hidden" }}>
      <AnimatedGradientBackground
        colors={["#1e3a8a", "#2563eb"]}
        duration={120}
      />
      <GradientText
        text="Introducing DataViz Pro"
        fontSize={72}
        fontWeight="800"
        gradient={["#ffffff", "#34d399"]}
        textAlign="center"
        opacity={titleOpacity}
        scale={1}
      />
      <DashboardImage
        src="path/to/dashboard-image.png"
        width="80%"
        borderRadius={12}
        boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
        opacity={dashOpacity}
        translateY={dashTranslateY}
        scale={dashScale}
      />
      <FeatureList
        items={featureItems}
        fontSize={28}
        fontWeight="500"
        color="#e5e7eb"
        lineHeight={1.5}
        revealCount={featureReveal}
      />
      <CTAButton
        text="Learn More"
        fontSize={24}
        fontWeight="600"
        backgroundColor="#10b981"
        color="#ffffff"
        padding="12px 24px"
        borderRadius={8}
        opacity={ctaOpacity}
        scale={ctaScale}
        glow={ctaGlow}
      />
    </AbsoluteFill>
  );
}