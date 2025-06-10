// Evaluation Output
// Prompt: Create Scene from Image
// Model Pack: openai-pack
// Generated: 2025-06-10T13:35:25.928Z
// Latency: 214771ms
// Cost: $0.0048
// Input: create this design with smooth motion graphics animations

export default function Scene1_mbqk8bi3() {
  const {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} = window.Remotion;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Animations
  const fadeIn = interpolate(frame, [0, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const slideUp = interpolate(frame, [0, fps * 0.7], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Staggered animations
  const titleIn = interpolate(frame, [fps * 0.1, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const subtitleIn = interpolate(frame, [fps * 0.3, fps * 1.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const valueIn = interpolate(frame, [fps * 0.5, fps * 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const chartIn = interpolate(frame, [fps * 0.8, fps * 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Idle float for chart
  const float = Math.sin(frame / 30) * 2;

  // Chart data (approximate from image)
  const chartData = [
    2,3,4,2,1,2,3,5,6,5,7,10,8,15,8,7,6,12,18,10,8,12,15,10,8,7,10,20,15,20,18,22,25,30,28,32,30,28,40,38,35,30,28,25,22,20,18,15,12,10,8,7,6,5,12,20,18,25,28,22,20,18,15,12,10,8,7,6,5,10,15,20,18,22,25,28,30,32,35,38,40,38,35,32,30,28,25,22,20,18,15,12,10,8,7,6,5,4,3,2
  ];

  // Chart dimensions
  const chartWidth = 340;
  const chartHeight = 90;
  const chartLeft = 24;
  const chartTop = 70;

  // Y axis scale
  const maxY = 100;
  const minY = 0;

  // Generate SVG points
  const points = chartData.map((y, i) => {
    const x = (i / (chartData.length - 1)) * chartWidth;
    const yVal = chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;
    return `${x},${yVal}`;
  }).join(" ");

  return (
    <AbsoluteFill style={{
      backgroundColor: "#18191C",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        width: "400px",
        height: "200px",
        background: "#18191C",
        borderRadius: "16px",
        boxShadow: "0 2px 16px 0 rgba(0,0,0,0.44)",
        border: "1px solid #232428",
        position: "relative",
        overflow: "hidden",
        opacity: fadeIn,
        transform: `translateY(${slideUp}px)`
      }}>
        {/* Title Row */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 0 24px"
        }}>
          <div style={{
            opacity: titleIn,
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "500",
            fontSize: "1.05rem",
            color: "#F3F4F6",
            letterSpacing: "0.01em"
          }}>
            Edge Requests
          </div>
          <div style={{
            opacity: subtitleIn,
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "1.1rem",
            color: "#A1A1AA",
            letterSpacing: "0.01em",
            display: "flex",
            alignItems: "center"
          }}>
            <svg width="16" height="16" style={{marginRight: "4px"}}><polygon points="12,6 16,8 12,10" fill="#A1A1AA" /></svg>
          </div>
        </div>
        {/* Invocations */}
        <div style={{
          position: "absolute",
          top: "48px",
          left: "24px",
          opacity: valueIn,
          fontFamily: "Inter, Arial, sans-serif",
          fontWeight: "600",
          fontSize: "1.25rem",
          color: "#F3F4F6",
          letterSpacing: "-0.01em"
        }}>
          Invocations
          <span style={{
            display: "block",
            fontWeight: "700",
            fontSize: "1.45rem",
            color: "#F3F4F6",
            marginTop: "2px"
          }}>2K</span>
        </div>
        {/* Chart */}
        <div style={{
          position: "absolute",
          left: `${chartLeft}px`,
          top: `${chartTop + float}px`,
          opacity: chartIn,
        }}>
          <svg width={chartWidth} height={chartHeight}>
            <polyline
              fill="none"
              stroke="#21F3A6"
              strokeWidth="2"
              points={points}
              style={{
                filter: "drop-shadow(0 0 4px #21F3A6AA)"
              }}
            />
            {/* Y axis lines */}
            <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#232428" strokeWidth="1"/>
            <line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="#232428" strokeWidth="1"/>
            <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#232428" strokeWidth="1"/>
          </svg>
          {/* X axis labels */}
          <div style={{
            position: "absolute",
            left: "0",
            top: `${chartHeight + 4}px`,
            width: `${chartWidth}px`,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            fontFamily: "Inter, Arial, sans-serif",
            fontWeight: "400",
            fontSize: "0.85rem",
            color: "#A1A1AA",
            letterSpacing: "0.01em"
          }}>
            <span>12 hours ago</span>
            <span>Now</span>
          </div>
        </div>
        {/* Y axis labels */}
        <div style={{
          position: "absolute",
          left: "0",
          top: `${chartTop - 7}px`,
          height: `${chartHeight + 16}px`,
          width: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontFamily: "Inter, Arial, sans-serif",
          fontWeight: "400",
          fontSize: "0.85rem",
          color: "#A1A1AA",
          letterSpacing: "0.01em",
          opacity: chartIn
        }}>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}