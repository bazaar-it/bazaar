// src/templates/BubbleZoom.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function BubbleZoom() {
  const frame = useCurrentFrame();

  const codeLines = [
    { text: "export const Animation: React.FC = () => {", indent: 0, delay: 0 },
    { text: "const frame = useCurrentFrame();", indent: 1, delay: 10 },
    { text: "return (", indent: 1, delay: 20 },
    { text: "<Series>", indent: 2, delay: 30 },
    { text: "<Series.Sequence durationInFrames={60}>", indent: 3, delay: 40 },
    { text: "<FadeIn>", indent: 4, delay: 50 },
    { text: "const progress = interpolate(", indent: 5, delay: 60 },
    { text: "frame,", indent: 6, delay: 70 },
    { text: "[0, 30],", indent: 6, delay: 80 },
    { text: "[0, 1],", indent: 6, delay: 90 },
    { text: ");", indent: 5, delay: 100 },
    { text: "</FadeIn>", indent: 4, delay: 110 },
    { text: "</Series.Sequence>", indent: 3, delay: 120 },
    { text: "</Series>", indent: 2, delay: 130 },
    { text: ");", indent: 1, delay: 140 },
    { text: "}", indent: 0, delay: 145 },
  ];

  const containerOpacity = interpolate(
    frame,
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  function CodeLine({ text, delay, indent }: { text: string; delay: number; indent: number }) {
    const charCount = Math.floor(
      interpolate(frame - delay, [0, 20], [0, text.length], {
        extrapolateRight: "clamp",
      })
    );

    const opacity = interpolate(frame - delay, [0, 5], [0, 1], {
      extrapolateRight: "clamp",
    });

    const colorizeToken = (token: string) => {
      if (token.match(/^(Sequence|Series|interpolate|useCurrentFrame|spring)$/)) {
        return "#FF92FF";
      } else if (token.match(/^[A-Z]\w+/)) {
        return "#00FFFF";
      } else if (token.match(/^['"].*['"]$/)) {
        return "#50FA7B";
      } else if (token.match(/^[{}\[\](),;]$/)) {
        return "#F8F8F2";
      } else if (token.match(/^\d+$/)) {
        return "#FF79C6";
      } else if (token.match(/^[\w]+(?=\()/)) {
        return "#00B4FF";
      } else if (token.match(/^\.[\w]+/)) {
        return "#BD93F9";
      }
      return "#F8F8F2";
    };

    return (
      <div
        style={{
          fontFamily: "SF Mono, monospace",
          fontSize: "24px",
          marginLeft: `${indent * 24}px`,
          opacity,
          height: "36px",
          display: "flex",
          alignItems: "center",
          color: "#F8F8F2",
        }}
      >
        {text.slice(0, charCount).split(/([{}\[\](),;.]|\s+)/).map((token: string, i: number) => {
          if (token.trim() === "") return token;
          const color = colorizeToken(token);
          return (
            <span key={i} style={{ color }}>
              {token}
            </span>
          );
        })}
        {frame >= delay && frame < delay + 20 && (
          <span
            style={{
              width: "2px",
              height: "24px",
              background: "#00FFFF",
              display: "inline-block",
              marginLeft: "2px",
              boxShadow: "0 0 8px rgba(0, 255, 255, 0.8)",
            }}
          />
        )}
      </div>
    );
  }

  function CodeContainer({ children, opacity }: { children: React.ReactNode; opacity: number }) {
    return (
      <div
        style={{
          background: "#2A2A2A",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          opacity,
          width: "800px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            opacity: 0.2,
          }}
        />
        {children}
      </div>
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CodeContainer opacity={containerOpacity}>
        {codeLines.map((line, i) => (
          <CodeLine
            key={i}
            text={line.text}
            delay={line.delay}
            indent={line.indent}
          />
        ))}
      </CodeContainer>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'bubble-zoom',
  name: 'Bubble Zoom',
  duration: 240, // 8 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function BubbleZoom() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const bubbles = Array.from({ length: 8 }, (_, i) => {
  const delay = i * 10;
  const scale = interpolate(
    frame - delay,
    [0, fps * 1.5],
    [0, 2 + Math.random() * 1.5],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  const opacity = interpolate(
    frame - delay,
    [0, fps * 0.5, fps * 1.5],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  
  const x = 50 + (Math.sin(i * 1.5) * 30);
  const y = 50 + (Math.cos(i * 1.5) * 30);
  const color = \`hsl(\${(i * 45) % 360}, 80%, 70%)\`;
  
  return { scale, opacity, x, y, color, size: 60 + i * 15 };
});

const zoomEffect = interpolate(
  frame,
  [fps * 1.5, fps * 2.5],
  [1, 1.2],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  }
);

return (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle, #1a1a2e 0%, #16213e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: \`scale(\${zoomEffect})\`,
    }}
  >
    {bubbles.map((bubble, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: \`\${bubble.x}%\`,
          top: \`\${bubble.y}%\`,
          width: \`\${bubble.size}px\`,
          height: \`\${bubble.size}px\`,
          borderRadius: "50%",
          background: \`radial-gradient(circle at 30% 30%, white, \${bubble.color})\`,
          transform: \`translate(-50%, -50%) scale(\${bubble.scale})\`,
          opacity: bubble.opacity,
          boxShadow: \`0 0 30px \${bubble.color}\`,
        }}
      />
    ))}
    
    <h1 
      style={{
        fontSize: "48px",
        color: "#ffffff",
        fontWeight: "900",
        zIndex: 10,
        opacity: interpolate(frame, [fps * 2, fps * 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        }),
      }}
    >
      BUBBLE UNIVERSE
    </h1>
  </AbsoluteFill>
);
}`
};