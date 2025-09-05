export interface GeneratorMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildCodeGeneratorV4Messages(
  userRequest: string,
  includeExamples: boolean = true,
  format: { width: number; height: number; format: string }
): GeneratorMessage[] {
  
  const systemPrompt: GeneratorMessage = {
    role: 'system',
    content: `You are an expert motion graphics developer specializing in React-based animations using the Remotion framework.

VIDEO FORMAT: ${format.width}x${format.height} ${format.format}

TECHNICAL REQUIREMENTS:
- Always destructure Remotion at the top: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- Use unique 8-character IDs for all variables (e.g., _A7B9C2D4)
- Export the duration as: export const durationInFrames_[ID] = X;
- Name your component: const Scene_[ID] = () => { ... }
- For spring animations, always include the fps parameter
- Center elements using: position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"
- Icons available via window.IconifyIcon
- Use Google Fonts directly ("Inter", "Montserrat", "Roboto", etc.)

ANIMATION PRINCIPLES:
- Give elements space to breathe - avoid cramped layouts
- Use smooth, intentional timing - nothing should feel rushed
- Choose colors purposefully - maintain visual harmony
- Make text readable with proper hierarchy and sizing
- Layer elements to create depth without overwhelming

Focus on creating clean, professional animations that feel polished and intentional.`
  };

  if (!includeExamples) {
    return [systemPrompt, { role: 'user', content: userRequest }];
  }

  // Three balanced examples that demonstrate good taste without being overly prescriptive
  const exampleMessages: GeneratorMessage[] = [
    
    // Example 1: Clean Dashboard - Professional but not overdone
    {
      role: 'user',
      content: 'Create a modern data visualization dashboard with animated charts and metrics'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A8B9C2D1 = [
  { type: "simultaneous_animation", frames: 25 }
];

const sequences_A8B9C2D1 = [];
let accumulatedFrames_A8B9C2D1 = 0;

script_A8B9C2D1.forEach((segment, index) => {
  sequences_A8B9C2D1.push({
    ...segment,
    start: accumulatedFrames_A8B9C2D1,
    end: accumulatedFrames_A8B9C2D1 + segment.frames,
    sequenceIndex: index,
  });
  accumulatedFrames_A8B9C2D1 += segment.frames;
});

export const durationInFrames_A8B9C2D1 = accumulatedFrames_A8B9C2D1;

const Scene_A8B9C2D1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const segments = sequences_A8B9C2D1.map(seq => ({
    simultaneousAnimation: frame >= seq.start && frame < seq.end,
    active: frame >= seq.start && frame < seq.end,
    progress: seq.simultaneousAnimation 
      ? (frame - seq.start) / (seq.end - seq.start)
      : seq.active ? 1 : 0,
  }));

  const bgScale = interpolate(
    frame,
    [0, 20],
    [0.95, 1],
    { extrapolateRight: "clamp" }
  );

  const dashboardOpacity = spring({
    frame: frame - 5,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const metricsEntrance = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 90 },
  });

  const chartGrowth = spring({
    frame: frame - 15,
    fps,
    config: { damping: 25, stiffness: 85 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: \`radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)\`,
          transform: \`scale(\${bgScale})\`,
        }}
      />

      {/* Main Dashboard Container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "85%",
          height: "75%",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 24,
          padding: 48,
          boxShadow: "0 30px 60px rgba(0, 0, 0, 0.12)",
          opacity: dashboardOpacity,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <h1
            style={{
              fontFamily: "Inter",
              fontSize: 32,
              fontWeight: 700,
              color: "#1a1a2e",
              margin: 0,
            }}
          >
            Analytics Dashboard
          </h1>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: "#666",
              padding: "8px 16px",
              backgroundColor: "#f0f0f0",
              borderRadius: 20,
            }}
          >
            Last 30 Days
          </div>
        </div>

        {/* Metrics Row */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 40,
          }}
        >
          {[
            { label: "Revenue", value: "$128.5K", change: "+12.5%", color: "#667eea" },
            { label: "Users", value: "8,429", change: "+23.1%", color: "#764ba2" },
            { label: "Conversion", value: "3.24%", change: "+5.4%", color: "#f093fb" },
          ].map((metric, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: 24,
                backgroundColor: "#f8f9fa",
                borderRadius: 16,
                transform: \`translateY(\${(1 - metricsEntrance) * 30}px)\`,
                opacity: metricsEntrance,
              }}
            >
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 8,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: 8,
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  color: metric.color,
                  fontWeight: 600,
                }}
              >
                {metric.change}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div
          style={{
            height: 280,
            backgroundColor: "#f8f9fa",
            borderRadius: 16,
            padding: 24,
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1a2e",
              marginBottom: 20,
            }}
          >
            Revenue Trend
          </div>
          
          {/* Chart Bars */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              height: 200,
              gap: 16,
            }}
          >
            {[0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1, 0.85].map((height, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: \`\${height * 100 * chartGrowth}%\`,
                  background: \`linear-gradient(180deg, \${
                    i === 6 ? "#667eea" : "#e0e0e0"
                  } 0%, \${
                    i === 6 ? "#764ba2" : "#d0d0d0"
                  } 100%)\`,
                  borderRadius: "8px 8px 0 0",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default Scene_A8B9C2D1;`
    },

    // Example 2: Polished Notification - Smooth and refined
    {
      role: 'user',
      content: 'Show a message notification popping up with a smooth animation, like a chat app notification'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } = window.Remotion;

const script_B2C3D4E5 = [
  { type: "entrance_animation", frames: 20 }
];

const sequences_B2C3D4E5 = [];
let accumulatedFrames_B2C3D4E5 = 0;

script_B2C3D4E5.forEach((segment, index) => {
  sequences_B2C3D4E5.push({
    ...segment,
    start: accumulatedFrames_B2C3D4E5,
    end: accumulatedFrames_B2C3D4E5 + segment.frames,
    sequenceIndex: index,
  });
  accumulatedFrames_B2C3D4E5 += segment.frames;
});

export const durationInFrames_B2C3D4E5 = accumulatedFrames_B2C3D4E5;

const Scene_B2C3D4E5 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const notificationSpring = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 200,
    },
  });

  const contentSpring = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 18,
      stiffness: 150,
    },
  });

  const pulseScale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.02, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      }}
    >
      {/* Ambient Background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0.3,
          background: "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
        }}
      />

      {/* Notification Container */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 40,
          width: 380,
          backgroundColor: "white",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          transform: \`translateX(\${(1 - notificationSpring) * 420}px) scale(\${pulseScale})\`,
          opacity: notificationSpring,
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
          }}
        />

        <div style={{ padding: 20 }}>
          {/* Top Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 12,
              opacity: contentSpring,
              transform: \`translateY(\${(1 - contentSpring) * 10}px)\`,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "white",
                }}
              >
                SC
              </span>
            </div>

            {/* Name and Time */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  marginBottom: 2,
                }}
              >
                Sarah Chen
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  color: "#8892b0",
                }}
              >
                just now
              </div>
            </div>

            {/* Close Button */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: "#666",
                }}
              >
                ×
              </span>
            </div>
          </div>

          {/* Message Content */}
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: "#4a5568",
              lineHeight: 1.5,
              opacity: contentSpring,
              transform: \`translateY(\${(1 - contentSpring) * 10}px)\`,
            }}
          >
            Hey! Just reviewed the new designs. They look fantastic! The color scheme really brings everything together. 🎨
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              opacity: contentSpring,
              transform: \`translateY(\${(1 - contentSpring) * 10}px)\`,
            }}
          >
            <button
              style={{
                flex: 1,
                padding: "8px 16px",
                backgroundColor: "#4facfe",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontFamily: "Inter",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reply
            </button>
            <button
              style={{
                flex: 1,
                padding: "8px 16px",
                backgroundColor: "#f0f0f0",
                color: "#666",
                border: "none",
                borderRadius: 8,
                fontFamily: "Inter",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default Scene_B2C3D4E5;`
    },

    // Example 3: Dynamic Bar Chart - Engaging without being over the top
    {
      role: 'user',
      content: 'Create an animated bar chart showing data growing over time with smooth transitions'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } = window.Remotion;

const script_C3D4E5F6 = [
  { type: "sequential_animation", frames: 30 }
];

const sequences_C3D4E5F6 = [];
let accumulatedFrames_C3D4E5F6 = 0;

script_C3D4E5F6.forEach((segment, index) => {
  sequences_C3D4E5F6.push({
    ...segment,
    start: accumulatedFrames_C3D4E5F6,
    end: accumulatedFrames_C3D4E5F6 + segment.frames,
    sequenceIndex: index,
  });
  accumulatedFrames_C3D4E5F6 += segment.frames;
});

export const durationInFrames_C3D4E5F6 = accumulatedFrames_C3D4E5F6;

const Scene_C3D4E5F6 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const titleSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const barData = [
    { month: "Jan", value: 65, color: "#FF6B6B", delay: 8 },
    { month: "Feb", value: 78, color: "#4ECDC4", delay: 10 },
    { month: "Mar", value: 92, color: "#45B7D1", delay: 12 },
    { month: "Apr", value: 58, color: "#FFA07A", delay: 14 },
    { month: "May", value: 87, color: "#98D8C8", delay: 16 },
    { month: "Jun", value: 95, color: "#667EEA", delay: 18 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
      }}
    >
      {/* Grid Pattern */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: \`
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          \`,
          backgroundSize: "50px 50px",
          opacity: containerSpring,
        }}
      />

      {/* Chart Container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: \`translate(-50%, -50%) scale(\${containerSpring})\`,
          width: "80%",
          maxWidth: 800,
          height: 500,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Title */}
        <div
          style={{
            marginBottom: 40,
            opacity: titleSpring,
            transform: \`translateY(\${(1 - titleSpring) * 20}px)\`,
          }}
        >
          <h2
            style={{
              fontFamily: "Montserrat",
              fontSize: 28,
              fontWeight: 700,
              color: "white",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Monthly Performance
          </h2>
          <p
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0,
            }}
          >
            Revenue growth over the last 6 months
          </p>
        </div>

        {/* Chart */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            height: 300,
            gap: 20,
          }}
        >
          {barData.map((item, index) => {
            const barSpring = spring({
              frame: frame - item.delay,
              fps,
              config: { damping: 15, stiffness: 100 },
            });

            const labelSpring = spring({
              frame: frame - item.delay - 5,
              fps,
              config: { damping: 20, stiffness: 80 },
            });

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Bar */}
                <div
                  style={{
                    width: "100%",
                    height: \`\${item.value * barSpring}%\`,
                    backgroundColor: item.color,
                    borderRadius: "8px 8px 0 0",
                    position: "relative",
                    boxShadow: \`0 0 20px \${item.color}33\`,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 12,
                  }}
                >
                  {/* Value Label */}
                  <span
                    style={{
                      fontFamily: "Inter",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "white",
                      opacity: labelSpring,
                    }}
                  >
                    {Math.round(item.value * barSpring)}%
                  </span>
                </div>

                {/* Month Label */}
                <span
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.7)",
                    opacity: labelSpring,
                  }}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            justifyContent: "center",
            gap: 24,
            opacity: interpolate(frame, [25, 30], [0, 1]),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: "#667EEA",
              }}
            />
            <span
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              Best Performance
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: "#FFA07A",
              }}
            />
            <span
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              Needs Attention
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default Scene_C3D4E5F6;`
    }
  ];

  return [
    systemPrompt,
    ...exampleMessages,
    { role: 'user', content: userRequest }
  ];
}