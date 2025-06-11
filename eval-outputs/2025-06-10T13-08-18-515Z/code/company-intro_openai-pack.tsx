// Evaluation Output
// Prompt: Company Intro Creation
// Model Pack: openai-pack
// Generated: 2025-06-10T13:11:59.033Z
// Latency: 103252ms
// Cost: $0.0065
// Input: generate an intro video for my company. its called Spinlio. we do cyber security. we have a new feature we want to showcase. its called cloud security with AI

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

function GradientBackground({ colors, duration }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Animate gradient angle from 120deg to 240deg over duration
  const angle = interpolate(
    frame,
    [0, duration],
    [120, 240],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`,
        width: "100%",
        height: "100%",
        position: "absolute",
      }}
    />
  );
}

function FloatingParticles({ count, size, opacityRange, staggerDelay }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Deterministic, but "random" enough for particles
  function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  const particles = [];
  for (let i = 0; i < count; i++) {
    // Spread start time for staggered opacity
    const appearFrame = i * staggerDelay;
    const particleOpacity = interpolate(
      frame,
      [appearFrame, appearFrame + 20],
      [opacityRange[0], opacityRange[1]],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    // Use seededRandom for position and float direction
    const x = seededRandom(i + 1) * width;
    const baseY = seededRandom(i + 2) * height;
    // Slow float up and down
    const floatY =
      baseY +
      Math.sin((frame + i * 10) / (fps * 2) + i) * 30;
    // Optional: gentle left-right drift
    const floatX =
      x + Math.cos((frame + i * 20) / (fps * 3) + i) * 20;
    particles.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${floatX}px`,
          top: `${floatY}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: "#fff",
          opacity: particleOpacity,
          pointerEvents: "none",
        }}
      />
    );
  }
  return <>{particles}</>;
}

function ShieldLockIcon({ size, color }) {
  // Simple SVG shield-lock icon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: "block" }}
    >
      <path
        d="M32 6L10 16v14c0 15.464 13.333 23.333 22 28 8.667-4.667 22-12.536 22-28V16L32 6z"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      <rect
        x="24"
        y="32"
        width="16"
        height="14"
        rx="4"
        fill={color}
        opacity="0.7"
      />
      <circle
        cx="32"
        cy="39"
        r="2"
        fill="#fff"
      />
      <rect
        x="31"
        y="41"
        width="2"
        height="4"
        rx="1"
        fill="#fff"
      />
    </svg>
  );
}

function BrainIcon({ size, color }) {
  // Simple SVG brain icon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: "block" }}
    >
      <ellipse
        cx="20"
        cy="32"
        rx="14"
        ry="18"
        fill={color}
        opacity="0.7"
      />
      <ellipse
        cx="44"
        cy="32"
        rx="14"
        ry="18"
        fill={color}
        opacity="0.7"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="12"
        ry="18"
        fill="#fff"
        opacity="0.3"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="8"
        ry="10"
        fill={color}
        opacity="0.5"
      />
    </svg>
  );
}

function GradientText({ text, fontSize, fontWeight, gradient }) {
  // Use background-clip: text for gradient text
  return (
    <div
      style={{
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        textAlign: "center",
        lineHeight: "1.1",
        letterSpacing: "0.01em",
        margin: "0",
        padding: "0",
      }}
    >
      {text}
    </div>
  );
}

function TypewriterText({ text, fontSize, fontWeight, color, startFrame, duration }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);
  // Ease out for the typewriter (simulate "ease-out" by using sqrt)
  const progress = Math.min(1, localFrame / duration);
  const eased = Math.sqrt(progress);
  const charsToShow = Math.floor(eased * text.length);
  return (
    <div
      style={{
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: color,
        textAlign: "center",
        margin: "0",
        padding: "0",
        letterSpacing: "0.01em",
        lineHeight: "1.1",
        minHeight: `${fontSize * 1.2}px`,
      }}
    >
      {text.slice(0, charsToShow)}
      <span style={{ opacity: charsToShow < text.length && localFrame % 20 < 10 ? 1 : 0 }}>|</span>
    </div>
  );
}

export default function Scene1_a7eb1ca4() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Company logo animation (fade-in)
  const logoFade = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Company name animation (slide-in from bottom)
  const nameStart = 10;
  const nameDuration = 40;
  const nameSlide = interpolate(
    frame,
    [nameStart, nameStart + nameDuration],
    [80, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const nameOpacity = interpolate(
    frame,
    [nameStart, nameStart + nameDuration / 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Feature announcement (typewriter)
  const featureStart = 60;
  const featureDuration = 50;

  // Cyber security icon (bounce in)
  const shieldStart = 30;
  const shieldDuration = 40;
  const shieldProgress = Math.min(1, Math.max(0, (frame - shieldStart) / shieldDuration));
  const shieldBounce = spring({
    fps,
    frame: (frame - shieldStart) < 0 ? 0 : (frame - shieldStart),
    config: {
      damping: 7,
      mass: 0.8,
      stiffness: 120,
    }
  });
  const shieldScale = interpolate(
    shieldBounce,
    [0, 1],
    [0.5, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shieldOpacity = interpolate(
    frame,
    [shieldStart, shieldStart + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // AI icon (bounce in, slightly delayed)
  const aiStart = 35;
  const aiDuration = 40;
  const aiProgress = Math.min(1, Math.max(0, (frame - aiStart) / aiDuration));
  const aiBounce = spring({
    fps,
    frame: (frame - aiStart) < 0 ? 0 : (frame - aiStart),
    config: {
      damping: 7,
      mass: 0.8,
      stiffness: 120,
    }
  });
  const aiScale = interpolate(
    aiBounce,
    [0, 1],
    [0.5, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const aiOpacity = interpolate(
    frame,
    [aiStart, aiStart + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "transparent", overflow: "hidden" }}>
      <GradientBackground
        colors={["#001f3f", "#0074D9"]}
        duration={120}
      />
      <FloatingParticles
        count={50}
        size={3}
        opacityRange={[0, 0.2]}
        staggerDelay={5}
      />
      {/* Company Logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20px",
          width: "120px",
          height: "120px",
          transform: "translate(-50%, 0)",
          opacity: logoFade,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="assets/logo.png"
          alt="Spinlio Logo"
          style={{
            width: "120px",
            height: "120px",
            objectFit: "contain",
            borderRadius: "24px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            background: "#fff",
          }}
        />
      </div>
      {/* Company Name */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "170px",
          width: "100%",
          transform: `translate(-50%, 0) translateY(${nameSlide}px)`,
          opacity: nameOpacity,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <GradientText
          text="Welcome to Spinlio"
          fontSize={48}
          fontWeight={700}
          gradient={["#ffffff", "#39CCCC"]}
        />
      </div>
      {/* Cyber Security Icon (left-center) */}
      <div
        style={{
          position: "absolute",
          left: "40px",
          top: "50%",
          transform: `translateY(-50%) scale(${shieldScale})`,
          opacity: shieldOpacity,
          zIndex: 2,
        }}
      >
        <ShieldLockIcon size={80} color="#FF4136" />
      </div>
      {/* AI Icon (right-center) */}
      <div
        style={{
          position: "absolute",
          right: "40px",
          top: "50%",
          transform: `translateY(-50%) scale(${aiScale})`,
          opacity: aiOpacity,
          zIndex: 2,
        }}
      >
        <BrainIcon size={80} color="#2ECC40" />
      </div>
      {/* Feature Announcement (typewriter) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "calc(50% + 90px)",
          width: "100%",
          transform: "translate(-50%, 0)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <TypewriterText
          text="Introducing: Cloud Security with AI"
          fontSize={36}
          fontWeight={600}
          color="#FFDC00"
          startFrame={featureStart}
          duration={featureDuration}
        />
      </div>
    </AbsoluteFill>
  );
}