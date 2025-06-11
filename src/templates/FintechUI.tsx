// src/templates/FintechUI.tsx
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';

const ChatMessage = ({ text, isUser, delay }: { text: string; isUser: boolean; delay: number }) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "16px 20px",
          borderRadius: 20,
          background: isUser ? "#007AFF" : "#E9ECEF",
          color: isUser ? "white" : "#212529",
          fontFamily: "sans-serif",
          fontSize: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const InputBar = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const text = "These Bazaar animations are pretty sick, right?!";
  const charCount = Math.floor(interpolate(frame, [0, 150], [0, text.length], { extrapolateRight: "clamp" }));

  return (
    <div
      style={{
        minHeight: 100,
        background: "white",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        opacity,
        transform: `translateY(${interpolate(opacity, [0, 1], [20, 0])}px)`,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
        border: "1px solid #E5E5E5",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          color: "#212529",
          fontFamily: "sans-serif",
          fontSize: 16,
          lineHeight: 1.5,
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 4,
        }}
      >
        <span>{text.slice(0, charCount)}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          style={{
            background: "#000000",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "sans-serif",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

const AnimatedValue = ({ start, end, prefix = "", suffix = "", delay = 0 }: { start: number; end: number; prefix?: string; suffix?: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const value = Math.floor(interpolate(frame - delay, [0, 60], [start, end], { extrapolateRight: "clamp" }));
  return <span style={{ fontWeight: "bold", fontFamily: "sans-serif", color: "#00FF9D" }}>{prefix}{value.toLocaleString()}{suffix}</span>;
};

const StockGraph = () => {
  const frame = useCurrentFrame();
  const points = React.useMemo(() => Array.from({ length: 100 }, (_, i) => ({ x: i * 10, y: Math.sin(i / 10) * 30 + Math.sin(i / 5 + frame / 30) * 10 + 100 })), [frame]);
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prevPoint = points[i - 1];
    if (!prevPoint) return acc;
    return `${acc} C ${prevPoint.x + (p.x - prevPoint.x) / 3} ${prevPoint.y}, ${p.x - (p.x - prevPoint.x) / 3} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 200">
      <defs>
        <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3F64F3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3F64F3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${points[points.length - 1]?.x ?? 0} 200 L ${points[0]?.x ?? 0} 200 Z`} fill="url(#graphGradient)" />
      <path d={pathD} stroke="#3F64F3" strokeWidth="2" fill="none" />
    </svg>
  );
};

const PreviewPanel = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const anim = (delay: number) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

  return (
    <div style={{ 
      flex: 1, 
      background: "linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%)", 
      borderRadius: 16, 
      opacity, 
      position: "relative", 
      overflow: "hidden", 
      padding: 24,
      color: "white", 
      fontFamily: "sans-serif",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "space-between"
    }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ 
          fontSize: 56,
          marginBottom: 16,
          opacity: anim(0), 
          textAlign: "center", 
          fontWeight: 700,
          lineHeight: 1.1
        }}>
          AI Financial Insights
        </h1>
        <p style={{ 
          fontSize: 22,
          marginBottom: 24, 
          color: "#AAA", 
          opacity: anim(15), 
          textAlign: "center",
          lineHeight: 1.4
        }}>
          Make smarter investments with predictive analytics.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button style={{ 
            background: "#3F64F3", 
            color: "white", 
            border: "none", 
            borderRadius: 12, 
            padding: "16px 40px",
            fontSize: 20,
            fontWeight: "bold", 
            cursor: "pointer", 
            opacity: anim(30),
            boxShadow: "0 4px 20px rgba(63, 100, 243, 0.3)"
          }}>
            Let's Go 🚀
          </button>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        marginBottom: 20
      }}>
        <div style={{ 
          borderRadius: 12, 
          padding: 20,
          background: "rgba(255,255,255,0.05)", 
          opacity: anim(45),
          flex: 1,
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ 
            fontSize: 20,
            marginBottom: 16,
            fontWeight: 600 
          }}>
            Portfolio Performance
          </h3>
          <div style={{ flex: 1 }}>
            <StockGraph />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 'auto' }}>
        <div style={{ 
          flex: 1, 
          background: "rgba(255,255,255,0.05)", 
          padding: 16,
          borderRadius: 12, 
          opacity: anim(60),
          textAlign: "center"
        }}>
          <h4 style={{ 
            fontSize: 16, 
            marginBottom: 8, 
            color: "#AAA",
            fontWeight: 500
          }}>
            Total Assets
          </h4>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            <AnimatedValue start={100000} end={125000} prefix="$" delay={60} />
          </div>
        </div>
        <div style={{ 
          flex: 1, 
          background: "rgba(255,255,255,0.05)", 
          padding: 16,
          borderRadius: 12, 
          opacity: anim(75),
          textAlign: "center"
        }}>
          <h4 style={{ 
            fontSize: 16, 
            marginBottom: 8, 
            color: "#AAA",
            fontWeight: 500
          }}>
            AI ROI
          </h4>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            <AnimatedValue start={65} end={89} suffix="% ROI" delay={75} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FintechUI() {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 20, stiffness: 80 } });
  const messages = [
    { text: "I need help designing a landing page for my AI fintech startup.", isUser: true, delay: 0 },
    { text: "Sure! What's the core message you want to highlight?", isUser: false, delay: 15 },
    { text: "AI + Finance. We want it to feel smart but friendly.", isUser: true, delay: 30 },
    { text: "Here's a layout with bold headlines and a dashboard.", isUser: false, delay: 45 },
    { text: "This is 🔥🔥🔥", isUser: true, delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ background: "#F8F9FA" }}>
      <div style={{ display: "flex", height: "100%", padding: 32, gap: 32 }}>
        <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 20 }}>
            {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
          </div>
          <InputBar opacity={progress} />
        </div>
        <div style={{ width: "70%" }}>
          <PreviewPanel opacity={progress} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'fintech-ui',
  name: 'Fintech UI',
  duration: 240, // 8 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
interpolate,
useCurrentFrame,
spring,
} = window.Remotion;

const ChatMessage = ({ text, isUser, delay }) => {
const frame = useCurrentFrame();
const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

return (
  <div
    style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      opacity: progress,
      transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
      marginBottom: 24,
    }}
  >
    <div
      style={{
        maxWidth: "80%",
        padding: "16px 20px",
        borderRadius: 20,
        background: isUser ? "#007AFF" : "#E9ECEF",
        color: isUser ? "white" : "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  </div>
);
};

const InputBar = ({ opacity }) => {
const frame = useCurrentFrame();
const text = "These Bazaar animations are pretty sick, right?!";
const charCount = Math.floor(interpolate(frame, [0, 150], [0, text.length], { extrapolateRight: "clamp" }));

return (
  <div
    style={{
      minHeight: 100,
      background: "white",
      borderRadius: 20,
      display: "flex",
      flexDirection: "column",
      padding: 16,
      opacity,
      transform: \`translateY(\${interpolate(opacity, [0, 1], [20, 0])}px)\`,
      boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
      border: "1px solid #E5E5E5",
      position: "relative",
    }}
  >
    <div
      style={{
        flex: 1,
        color: "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        lineHeight: 1.5,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 4,
      }}
    >
      <span>{text.slice(0, charCount)}</span>
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 8,
      }}
    >
      <button
        style={{
          background: "#000000",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "sans-serif",
        }}
      >
        Send
      </button>
    </div>
  </div>
);
};

const AnimatedValue = ({ start, end, prefix = "", suffix = "", delay = 0 }) => {
const frame = useCurrentFrame();
const value = Math.floor(interpolate(frame - delay, [0, 60], [start, end], { extrapolateRight: "clamp" }));
return <span style={{ fontWeight: "bold", fontFamily: "sans-serif", color: "#00FF9D" }}>{prefix}{value.toLocaleString()}{suffix}</span>;
};

const StockGraph = () => {
const frame = useCurrentFrame();
const points = Array.from({ length: 100 }, (_, i) => ({ x: i * 10, y: Math.sin(i / 10) * 30 + Math.sin(i / 5 + frame / 30) * 10 + 100 }));
const pathD = points.reduce((acc, p, i) => {
  if (i === 0) return \`M \${p.x} \${p.y}\`;
  const prevPoint = points[i - 1];
  if (!prevPoint) return acc;
  return \`\${acc} C \${prevPoint.x + (p.x - prevPoint.x) / 3} \${prevPoint.y}, \${p.x - (p.x - prevPoint.x) / 3} \${p.y}, \${p.x} \${p.y}\`;
}, "");

return (
  <svg width="100%" height="100%" viewBox="0 0 1000 200">
    <defs>
      <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3F64F3" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#3F64F3" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={\`\${pathD} L \${points[points.length - 1]?.x ?? 0} 200 L \${points[0]?.x ?? 0} 200 Z\`} fill="url(#graphGradient)" />
    <path d={pathD} stroke="#3F64F3" strokeWidth="2" fill="none" />
  </svg>
);
};

const PreviewPanel = ({ opacity }) => {
const frame = useCurrentFrame();
const anim = (delay) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

return (
  <div style={{ 
    flex: 1, 
    background: "linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%)", 
    borderRadius: 16, 
    opacity, 
    position: "relative", 
    overflow: "hidden", 
    padding: 24,
    color: "white", 
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between"
  }}>
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <h1 style={{ 
        fontSize: 56,
        marginBottom: 16,
        opacity: anim(0), 
        textAlign: "center", 
        fontWeight: 700,
        lineHeight: 1.1
      }}>
        AI Financial Insights
      </h1>
      <p style={{ 
        fontSize: 22,
        marginBottom: 24, 
        color: "#AAA", 
        opacity: anim(15), 
        textAlign: "center",
        lineHeight: 1.4
      }}>
        Make smarter investments with predictive analytics.
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button style={{ 
          background: "#3F64F3", 
          color: "white", 
          border: "none", 
          borderRadius: 12, 
          padding: "16px 40px",
          fontSize: 20,
          fontWeight: "bold", 
          cursor: "pointer", 
          opacity: anim(30),
          boxShadow: "0 4px 20px rgba(63, 100, 243, 0.3)"
        }}>
          Let's Go 🚀
        </button>
      </div>
    </div>

    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      marginBottom: 20
    }}>
      <div style={{ 
        borderRadius: 12, 
        padding: 20,
        background: "rgba(255,255,255,0.05)", 
        opacity: anim(45),
        flex: 1,
        display: "flex",
        flexDirection: "column"
      }}>
        <h3 style={{ 
          fontSize: 20,
          marginBottom: 16,
          fontWeight: 600 
        }}>
          Portfolio Performance
        </h3>
        <div style={{ flex: 1 }}>
          <StockGraph />
        </div>
      </div>
    </div>

    <div style={{ display: "flex", gap: 24, marginTop: 'auto' }}>
      <div style={{ 
        flex: 1, 
        background: "rgba(255,255,255,0.05)", 
        padding: 16,
        borderRadius: 12, 
        opacity: anim(60),
        textAlign: "center"
      }}>
        <h4 style={{ 
          fontSize: 16, 
          marginBottom: 8, 
          color: "#AAA",
          fontWeight: 500
        }}>
          Total Assets
        </h4>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>
          <AnimatedValue start={100000} end={125000} prefix="$" delay={60} />
        </div>
      </div>
      <div style={{ 
        flex: 1, 
        background: "rgba(255,255,255,0.05)", 
        padding: 16,
        borderRadius: 12, 
        opacity: anim(75),
        textAlign: "center"
      }}>
        <h4 style={{ 
          fontSize: 16, 
          marginBottom: 8, 
          color: "#AAA",
          fontWeight: 500
        }}>
          AI ROI
        </h4>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>
          <AnimatedValue start={65} end={89} suffix="% ROI" delay={75} />
        </div>
      </div>
    </div>
  </div>
);
};

export default function FintechUI() {
const frame = useCurrentFrame();
const progress = spring({ frame, fps: 30, config: { damping: 20, stiffness: 80 } });
const messages = [
  { text: "I need help designing a landing page for my AI fintech startup.", isUser: true, delay: 0 },
  { text: "Sure! What's the core message you want to highlight?", isUser: false, delay: 15 },
  { text: "AI + Finance. We want it to feel smart but friendly.", isUser: true, delay: 30 },
  { text: "Here's a layout with bold headlines and a dashboard.", isUser: false, delay: 45 },
  { text: "This is 🔥🔥🔥", isUser: true, delay: 60 },
];

return (
  <AbsoluteFill style={{ background: "#F8F9FA" }}>
    <div style={{ display: "flex", height: "100%", padding: 32, gap: 32 }}>
      <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 20 }}>
          {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
        </div>
        <InputBar opacity={progress} />
      </div>
      <div style={{ width: "70%" }}>
        <PreviewPanel opacity={progress} />
      </div>
    </div>
  </AbsoluteFill>
);
}`
}; 