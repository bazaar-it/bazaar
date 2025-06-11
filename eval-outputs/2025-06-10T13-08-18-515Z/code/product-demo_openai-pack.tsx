// Evaluation Output
// Prompt: Product Demo Creation
// Model Pack: openai-pack
// Generated: 2025-06-10T13:17:49.586Z
// Latency: 132891ms
// Cost: $0.0053
// Input: create a product demo scene showing our new dashboard. use modern colors and smooth animations. the product is called DataViz Pro

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

function AnimatedGradientBackground({ colors, duration }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Animate background position from 0% to 100% over duration
  const progress = interpolate(
    frame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const bgPos = 100 * progress;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(120deg, ${colors[0]}, ${colors[1]})`,
        backgroundPosition: `${bgPos}% 50%`,
        backgroundSize: "200% 200%",
        width: "100%",
        height: "100%",
        position: "absolute"
      }}
    />
  );
}

function GradientText({ text, fontSize, fontWeight, gradient }) {
  return (
    <div
      style={{
        fontFamily: '"Inter", "Arial", sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight === "bold" ? "700" : "400",
        background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        lineHeight: "1.1",
        letterSpacing: "0.01em"
      }}
    >
      {text}
    </div>
  );
}

function DashboardImage({ src, width, height, borderRadius, style }) {
  return (
    <img
      src={src}
      alt="Dashboard"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${borderRadius}px`,
        objectFit: "cover",
        boxShadow: "0 8px 32px rgba(30,58,138,0.18)",
        background: "#1e293b",
        ...style
      }}
    />
  );
}

function TypewriterText({ text, fontSize, fontWeight, color, delay, duration }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = delay;
  const end = delay + duration;
  const localFrame = Math.max(0, frame - start);
  const charsToShow = Math.floor(
    interpolate(
      localFrame,
      [0, duration],
      [0, text.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )
  );
  return (
    <div
      style={{
        fontFamily: '"Inter", "Arial", sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight === "medium" ? "500" : "400",
        color: color,
        letterSpacing: "0.01em",
        lineHeight: "1.3",
        whiteSpace: "pre-line",
        textShadow: "0 2px 8px rgba(30,58,138,0.10)"
      }}
    >
      {text.slice(0, charsToShow)}
      <span style={{ opacity: (frame % 40) < 20 ? 1 : 0 }}>|</span>
    </div>
  );
}

function FloatingParticles({ count, size, opacityRange }) {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const particles = [];
  for (let i = 0; i < count; i++) {
    // Seeded randomness for repeatability
    const rand = (seed) => {
      let x = Math.sin(seed * 999) * 10000;
      return x - Math.floor(x);
    };
    const angle = rand(i + 1) * 2 * Math.PI;
    const radius = rand(i + 2) * 0.4 + 0.3; // 0.3-0.7
    const baseX = width / 2 + Math.cos(angle) * width * radius * 0.4;
    const baseY = height / 2 + Math.sin(angle) * height * radius * 0.35;
    // Gentle drift
    const driftX = Math.sin(frame / (80 + i * 2)) * 16 * rand(i + 3);
    const driftY = Math.cos(frame / (90 + i * 3)) * 16 * rand(i + 4);
    // Animate opacity in/out at start/end
    const appear = interpolate(
      frame,
      [0, 20],
      [opacityRange[0], opacityRange[1]],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const disappear = interpolate(
      frame,
      [durationInFrames - 20, durationInFrames],
      [opacityRange[1], opacityRange[0]],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const opacity = Math.min(appear, disappear);
    particles.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${baseX + driftX}px`,
          top: `${baseY + driftY}px`,
          width: `${size * 2}px`,
          height: `${size * 2}px`,
          borderRadius: "50%",
          background: "rgba(224,242,254,0.8)",
          boxShadow: "0 0 8px 2px #60a5fa55",
          opacity: opacity,
          pointerEvents: "none"
        }}
      />
    );
  }
  return <AbsoluteFill>{particles}</AbsoluteFill>;
}

export default function Scene1_9d34f6e0() {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Title entrance animation (slide-in from top)
  const titleStart = 0;
  const titleDuration = 30;
  const titleOpacity = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const titleY = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [-80, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dashboard image fade-scale entrance
  const imgStart = 30;
  const imgDuration = 45;
  const imgOpacity = interpolate(
    frame,
    [imgStart, imgStart + imgDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const imgScale = interpolate(
    frame,
    [imgStart, imgStart + imgDuration],
    [0.9, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Feature highlight typewriter entrance
  const featStart = 75;
  const featDuration = 60;
  const featOpacity = interpolate(
    frame,
    [featStart, featStart + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", width: "100%", height: "100%" }}>
      <AnimatedGradientBackground
        colors={["#1e3a8a", "#3b82f6"]}
        duration={120}
      />
      <FloatingParticles
        count={30}
        size={3}
        opacityRange={[0, 0.2]}
      />
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "50%",
          transform: `translate(-50%, 0)`,
          opacity: titleOpacity,
          zIndex: 10,
          pointerEvents: "none"
        }}
      >
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
          }}
        >
          <GradientText
            text="Introducing DataViz Pro"
            fontSize={48}
            fontWeight="bold"
            gradient={["#ffffff", "#60a5fa"]}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: "36%",
          left: "50%",
          transform: `translate(-50%, 0) scale(${imgScale})`,
          opacity: imgOpacity,
          zIndex: 8,
          transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)"
        }}
      >
        <DashboardImage
          src="path/to/dashboard-image.png"
          width={800}
          height={450}
          borderRadius={12}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: "77%",
          left: "50%",
          transform: "translate(-50%, 0)",
          opacity: featOpacity,
          zIndex: 12,
          width: "70%",
          textAlign: "center"
        }}
      >
        <TypewriterText
          text="Experience seamless data visualization with cutting-edge tools."
          fontSize={24}
          fontWeight="medium"
          color="#e0f2fe"
          delay={75}
          duration={60}
        />
      </div>
    </AbsoluteFill>
  );
}