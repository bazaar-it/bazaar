// Evaluation Output
// Prompt: Analyze Image Then Create
// Model Pack: openai-pack
// Generated: 2025-06-10T13:42:15.292Z
// Latency: 190659ms
// Cost: $0.0053
// Input: analyze this design in detail and recreate it with particle effects

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

function Particle({x, y, delay}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const float = Math.sin((frame + delay) * 0.07) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x + "px",
        top: (y + float) + "px",
        width: "3px",
        height: "3px",
        borderRadius: "50%",
        background: "#2AE1FF",
        opacity: interpolate(appear, [0, 1], [0, 0.45], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
        pointerEvents: "none",
        boxShadow: "0 0 6px 2px #2AE1FF55",
      }}
    />
  );
}

function ChartLine({points, color, delay}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [delay, delay + fps * 1], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const pathData = [];
  for (let i = 0; i < points.length; i++) {
    if (i / points.length > progress) break;
    const [x, y] = points[i];
    pathData.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
  }
  return (
    <svg width="340" height="110" style={{position: "absolute", left: "30px", top: "60px", overflow: "visible"}}>
      <path
        d={pathData.join(" ")}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        style={{
          filter: "drop-shadow(0px 0px 4px #2AE1FF66)",
        }}
      />
    </svg>
  );
}

export default function Scene1_mbqkiwb6() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const fadeIn = interpolate(frame, [0, fps * 0.7], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const slideUp = interpolate(frame, [0, fps * 0.7], [30, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  // Chart points (approximate from image)
  const chartPoints = [
    [0, 100],[10, 98],[20, 102],[30, 99],[40, 105],[50, 110],[60, 107],[70, 95],[80, 97],[90, 90],
    [100, 93],[110, 85],[120, 88],[130, 70],[140, 80],[150, 60],[160, 100],[170, 50],[180, 110],[190, 60],
    [200, 100],[210, 80],[220, 90],[230, 55],[240, 105],[250, 70],[260, 80],[270, 90],[280, 60],[290, 80],
    [300, 70],[310, 100],[320, 60],[330, 80],[340, 70]
  ];

  // Particle effect: randomly scatter some particles along the chart area
  const particles = Array.from({length: 16}).map((_, i) => {
    const x = 30 + Math.random() * 340;
    const y = 60 + Math.random() * 110;
    return <Particle key={i} x={x} y={y} delay={i * 4} />;
  });

  return (
    <AbsoluteFill
      style={{
        background: "#111214",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <div
        style={{
          width: "400px",
          height: "210px",
          borderRadius: "16px",
          background: "#18191C",
          boxShadow: "0px 2px 24px 0px #00000080",
          position: "relative",
          overflow: "hidden",
          opacity: fadeIn,
          transform: `translateY(${slideUp}px)`,
          border: "1px solid #232427",
        }}
      >
        {/* Title and arrow */}
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              color: "#F6F6F7",
              fontFamily: "Inter, Arial, sans-serif",
              fontWeight: "600",
              fontSize: "1.02rem",
              letterSpacing: "0.01em",
              lineHeight: "1.2",
              userSelect: "none",
            }}
          >
            Edge Requests
          </span>
        </div>
        {/* Chevron */}
        <div
          style={{
            position: "absolute",
            right: "18px",
            top: "22px",
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.7,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polyline
              points="6,5 10,8 6,11"
              fill="none"
              stroke="#F6F6F7"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* Subtitle */}
        <span
          style={{
            position: "absolute",
            left: "24px",
            top: "45px",
            color: "#B5B6B7",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.92rem",
            letterSpacing: "0.01em",
            opacity: interpolate(frame, [fps * 0.1, fps * 0.7], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
            transition: "opacity 0.3s",
            userSelect: "none",
          }}
        >
          Invocations
        </span>
        {/* 2K Value */}
        <span
          style={{
            position: "absolute",
            left: "24px",
            top: "70px",
            color: "#F6F6F7",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "700",
            fontSize: "1.35rem",
            letterSpacing: "0.01em",
            opacity: interpolate(frame, [fps * 0.2, fps * 0.8], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
            transition: "opacity 0.3s",
            userSelect: "none",
          }}
        >
          2K
        </span>
        {/* Chart Y labels */}
        <span
          style={{
            position: "absolute",
            left: "30px",
            top: "52px",
            color: "#6C6D70",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.82rem",
            letterSpacing: "0.01em",
            userSelect: "none",
          }}
        >
          100
        </span>
        <span
          style={{
            position: "absolute",
            left: "30px",
            top: "107px",
            color: "#6C6D70",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.82rem",
            letterSpacing: "0.01em",
            userSelect: "none",
          }}
        >
          50
        </span>
        <span
          style={{
            position: "absolute",
            left: "30px",
            top: "165px",
            color: "#6C6D70",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.82rem",
            letterSpacing: "0.01em",
            userSelect: "none",
          }}
        >
          0
        </span>
        {/* Chart X labels */}
        <span
          style={{
            position: "absolute",
            left: "30px",
            top: "180px",
            color: "#6C6D70",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.82rem",
            letterSpacing: "0.01em",
            userSelect: "none",
          }}
        >
          12 hours ago
        </span>
        <span
          style={{
            position: "absolute",
            right: "32px",
            top: "180px",
            color: "#6C6D70",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.82rem",
            letterSpacing: "0.01em",
            userSelect: "none",
          }}
        >
          Now
        </span>
        {/* Chart grid lines */}
        <svg width="340" height="110" style={{position: "absolute", left: "30px", top: "60px"}}>
          <line x1="0" y1="0" x2="340" y2="0" stroke="#232427" strokeWidth="1"/>
          <line x1="0" y1="55" x2="340" y2="55" stroke="#232427" strokeWidth="1"/>
          <line x1="0" y1="110" x2="340" y2="110" stroke="#232427" strokeWidth="1"/>
        </svg>
        {/* Chart line */}
        <ChartLine points={chartPoints} color="#2AE1FF" delay={fps * 0.3} />
        {/* Particle Effects */}
        {particles}
      </div>
    </AbsoluteFill>
  );
}