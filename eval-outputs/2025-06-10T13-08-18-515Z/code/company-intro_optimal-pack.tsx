// Evaluation Output
// Prompt: Company Intro Creation
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:10:14.799Z
// Latency: 115345ms
// Cost: $0.0052
// Input: generate an intro video for my company. its called Spinlio. we do cyber security. we have a new feature we want to showcase. its called cloud security with AI

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

function AnimatedGradientBackground({ colors, duration }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Animate gradient position left-to-right over duration
  const progress = interpolate(
    frame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const bgPos = 50 + 50 * progress; // from 50% to 100%
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
        backgroundPosition: `${bgPos}% 50%`,
        backgroundSize: "200% 200%",
        width: "100%",
        height: "100%",
        position: "absolute",
        top: "0",
        left: "0",
      }}
    />
  );
}

function FloatingParticles({ count, size, color, duration }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Generate deterministic random positions and drift per particle
  const particles = [];
  for (let i = 0; i < count; i++) {
    // Seeded random for reproducibility
    const angle = (i * 137.5) % 360;
    const baseX = (width * (0.1 + 0.8 * ((i * 23) % 100) / 100));
    const baseY = (height * (0.1 + 0.8 * ((i * 47) % 100) / 100));
    // Drift in a slow circle
    const t = frame / (fps * 8) + i;
    const driftX = Math.sin(t) * 40;
    const driftY = Math.cos(t) * 40;
    // Opacity oscillates between 0.1 and 0.5
    const opacity = interpolate(
      Math.sin(t * 1.2),
      [-1, 1],
      [0.1, 0.5],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    // Hexagon points
    const r = size;
    const points = Array.from({ length: 6 }).map((_, j) => {
      const a = Math.PI / 3 * j;
      return [
        r + r * Math.cos(a),
        r + r * Math.sin(a)
      ].join(",");
    }).join(" ");
    particles.push(
      <svg
        key={i}
        width={size * 2}
        height={size * 2}
        style={{
          position: "absolute",
          left: `${baseX + driftX}px`,
          top: `${baseY + driftY}px`,
          opacity: String(opacity),
          pointerEvents: "none",
        }}
      >
        <polygon
          points={points}
          fill={color}
        />
      </svg>
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles}
    </AbsoluteFill>
  );
}

function CompanyLogo({ src, alt, entrance, exit, widthPx, heightPx, offsetY, totalDuration }) {
  const frame = useCurrentFrame();
  // Entrance: fade-scale
  const entranceStart = entrance.delay;
  const entranceEnd = entrance.delay + entrance.duration;
  const scale = interpolate(
    frame,
    [entranceStart, entranceEnd],
    [entrance.scale[0], entrance.scale[1]],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacityIn = interpolate(
    frame,
    [entranceStart, entranceEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Exit: fade-out
  const exitStart = exit.delay;
  const exitEnd = exit.delay + exit.duration;
  const opacityOut = interpolate(
    frame,
    [exitStart, exitEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = opacityIn * opacityOut;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        display: "flex",
        pointerEvents: "none"
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          marginTop: `${offsetY}px`,
          opacity: String(opacity),
          transform: `translate(-50%, 0) scale(${scale})`,
          left: "50%",
          position: "absolute",
          top: "0",
          zIndex: 10,
          objectFit: "contain",
          boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
          borderRadius: "24px",
          background: "#fff"
        }}
      />
    </AbsoluteFill>
  );
}

function GradientText({ text, fontSize, fontWeight, gradient, offsetY, entrance }) {
  const frame = useCurrentFrame();
  // Slide-in from bottom
  const entranceStart = entrance.delay;
  const entranceEnd = entrance.delay + entrance.duration;
  const y = interpolate(
    frame,
    [entranceStart, entranceEnd],
    [60, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = interpolate(
    frame,
    [entranceStart, entranceEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        display: "flex",
        pointerEvents: "none"
      }}
    >
      <span
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight === "bold" ? "700" : "400",
          lineHeight: "1.1",
          marginTop: `${offsetY}px`,
          background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
          backgroundClip: "text",
          color: "transparent",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          display: "inline-block",
          opacity: String(opacity),
          transform: `translate(-50%, ${y}px)`,
          left: "50%",
          position: "absolute",
          top: "0",
          letterSpacing: "0.02em",
          zIndex: 11,
          textShadow: "0 2px 16px rgba(0,0,0,0.12)"
        }}
      >
        {text}
      </span>
    </AbsoluteFill>
  );
}

function TypewriterText({ text, fontSize, fontWeight, color, entrance, emphasis }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Typewriter effect
  const entranceStart = entrance.delay;
  const entranceEnd = entrance.delay + entrance.duration;
  const charsTotal = text.length;
  const progress = interpolate(
    frame,
    [entranceStart, entranceEnd],
    [0, charsTotal],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shown = Math.floor(progress);
  // Pulse emphasis after entrance
  let scale = 1;
  if (frame >= entranceEnd) {
    const pulsePhase = ((frame - entranceEnd) % emphasis.interval) / emphasis.duration;
    // Pulse between 1 and 1.08
    scale = 1 + 0.08 * Math.sin(Math.PI * pulsePhase);
  }
  // Fade in as it types
  const opacity = interpolate(
    frame,
    [entranceStart, entranceStart + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        pointerEvents: "none"
      }}
    >
      <span
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight === "medium" ? "500" : "400",
          color: color,
          letterSpacing: "0.01em",
          textShadow: "0 2px 12px rgba(0,0,0,0.16)",
          opacity: String(opacity),
          transform: `translate(-50%, -50%) scale(${scale})`,
          left: "50%",
          top: "50%",
          position: "absolute",
          zIndex: 12,
          whiteSpace: "pre"
        }}
      >
        {text.substring(0, shown)}
        <span style={{
          display: shown === charsTotal ? "none" : "inline-block",
          width: "1ch",
          color: color,
          opacity: "0.7",
          animation: "blink 1s steps(1) infinite"
        }}>|</span>
      </span>
      <style>
        {`
          @keyframes blink {
            0% { opacity: 0.7; }
            50% { opacity: 0; }
            100% { opacity: 0.7; }
          }
        `}
      </style>
    </AbsoluteFill>
  );
}

export default function Scene1_8a5d7e7d() {
  const { fps, durationInFrames, width, height } = useVideoConfig();
  // Background
  // Logo
  // Title
  // Feature highlight
  // Particles
  return (
    <AbsoluteFill style={{ background: "#001f3f", overflow: "hidden" }}>
      <AnimatedGradientBackground
        colors={["#001f3f", "#0074D9"]}
        duration={120}
      />
      <FloatingParticles
        count={50}
        size={3}
        color="#2ECC40"
        duration={120}
      />
      <CompanyLogo
        src="logo.png"
        alt="Spinlio Logo"
        entrance={{
          delay: 0,
          duration: 30,
          scale: [0.5, 1]
        }}
        exit={{
          delay: 90,
          duration: 30
        }}
        widthPx={150}
        heightPx={150}
        offsetY={50}
        totalDuration={120}
      />
      <GradientText
        text="Welcome to Spinlio"
        fontSize={48}
        fontWeight="bold"
        gradient={["#ffffff", "#39CCCC"]}
        offsetY={220}
        entrance={{
          delay: 30,
          duration: 45
        }}
      />
      <TypewriterText
        text="Introducing: Cloud Security with AI"
        fontSize={36}
        fontWeight="medium"
        color="#FFDC00"
        entrance={{
          delay: 75,
          duration: 60
        }}
        emphasis={{
          type: "pulse",
          interval: 30,
          duration: 15
        }}
      />
    </AbsoluteFill>
  );
}