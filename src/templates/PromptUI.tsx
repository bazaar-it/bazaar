// src/templates/PromptUI.tsx
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';

const Title: React.FC<{
  opacity: number;
}> = ({ opacity }) => {
  return (
    <div
      style={{
        fontSize: "64px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "#FFFFFF",
        marginBottom: "48px",
        opacity,
      }}
    >
      What can I help you ship?
    </div>
  );
};

const SearchBar: React.FC<{
  opacity: number;
}> = ({ opacity }) => {
  const frame = useCurrentFrame();
  
  // Typing animation with slower speed
  const text = "Create an animation of three dwarfs chasing a frog through a pond";
  const charCount = Math.floor(
    interpolate(
      frame,
      [30, 90],
      [0, text.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  // Cursor blink animation
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        width: "1000px",
        height: "160px", // Increased height
        background: "#1A1A1A",
        borderRadius: "25px",
        padding: "24px",
        opacity,
        boxShadow: "0 4px 32px rgba(0, 0, 0, 0.2)",
        marginBottom: "48px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontFamily: "Inter, sans-serif",
          color: "#FFFFFF",
          opacity: 0.8,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {text.slice(0, charCount)}
        {cursorVisible && (
          <span
            style={{
              width: "3px",
              height: "24px",
              background: "#FFFFFF",
              display: "inline-block",
            }}
          />
        )}
      </div>
    </div>
  );
};

const QuickAction: React.FC<{
  icon: string;
  label: string;
  delay: number;
}> = ({ icon, label, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 32px",
        background: "#1A1A1A",
        borderRadius: "25px",
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.9, 1])})`,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: "24px" }}>{icon}</div>
      <div
        style={{
          fontSize: "16px",
          fontFamily: "Inter, sans-serif",
          color: "#FFFFFF",
          opacity: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default function PromptUI() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame: frame > 5 ? frame : 0,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const quickActions = [
    { icon: "📸", label: "Animate a screenshot", delay: 30 },
    { icon: "🎨", label: "Import from Figma", delay: 35 },
    { icon: "📤", label: "Upload an image", delay: 40 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Title opacity={mainProgress} />
      <SearchBar opacity={mainProgress} />
      
      <div
        style={{
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          width: "1000px",
        }}
      >
        {quickActions.map((action, i) => (
          <QuickAction key={i} {...action} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'prompt-ui',
  name: 'Prompt UI',
  duration: 180, // 6 seconds
  previewFrame: 45,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

const Title = ({ opacity }) => {
  return (
    <div
      style={{
        fontSize: "64px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "#FFFFFF",
        marginBottom: "48px",
        opacity,
      }}
    >
      What can I help you ship?
    </div>
  );
};

const SearchBar = ({ opacity }) => {
  const frame = useCurrentFrame();
  
  const text = "Create an animation of three dwarfs chasing a frog through a pond";
  const charCount = Math.floor(
    interpolate(
      frame,
      [30, 90],
      [0, text.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        width: "1000px",
        height: "160px",
        background: "#1A1A1A",
        borderRadius: "25px",
        padding: "24px",
        opacity,
        boxShadow: "0 4px 32px rgba(0, 0, 0, 0.2)",
        marginBottom: "48px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontFamily: "Inter, sans-serif",
          color: "#FFFFFF",
          opacity: 0.8,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {text.slice(0, charCount)}
        {cursorVisible && (
          <span
            style={{
              width: "3px",
              height: "24px",
              background: "#FFFFFF",
              display: "inline-block",
            }}
          />
        )}
      </div>
    </div>
  );
};

const QuickAction = ({ icon, label, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 32px",
        background: "#1A1A1A",
        borderRadius: "25px",
        opacity: progress,
        transform: \`scale(\${interpolate(progress, [0, 1], [0.9, 1])})\`,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: "24px" }}>{icon}</div>
      <div
        style={{
          fontSize: "16px",
          fontFamily: "Inter, sans-serif",
          color: "#FFFFFF",
          opacity: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default function PromptUI() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame: frame > 5 ? frame : 0,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const quickActions = [
    { icon: "📸", label: "Animate a screenshot", delay: 30 },
    { icon: "🎨", label: "Import from Figma", delay: 35 },
    { icon: "📤", label: "Upload an image", delay: 40 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Title opacity={mainProgress} />
      <SearchBar opacity={mainProgress} />
      
      <div
        style={{
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          width: "1000px",
        }}
      >
        {quickActions.map((action, i) => (
          <QuickAction key={i} {...action} />
        ))}
      </div>
    </AbsoluteFill>
  );
}`,
};
