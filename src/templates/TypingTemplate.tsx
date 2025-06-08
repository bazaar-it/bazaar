// src/templates/TypingTemplate.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function TypingTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Terminal text that types out
  const fullText = "$ npm install @remotion/cli\n$ npx remotion preview\n✓ Server ready at http://localhost:3000";
  
  // Calculate how much text to show based on frame
  const charactersPerSecond = 8;
  const totalCharacters = Math.floor((frame / fps) * charactersPerSecond);
  const displayText = fullText.substring(0, totalCharacters);
  
  // Cursor blink animation
  const cursorOpacity = interpolate(frame % 30, [0, 15, 30], [1, 0, 1]);
  
  // Terminal window fade in
  const windowOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Monaco, 'Courier New', monospace"
      }}
    >
      {/* Terminal Window */}
      <div 
        style={{
          backgroundColor: "#2d2d2d",
          borderRadius: "8px",
          padding: "20px",
          minWidth: "500px",
          minHeight: "200px",
          opacity: windowOpacity,
          boxShadow: "0 10px 50px rgba(0,0,0,0.5)"
        }}
      >
        {/* Terminal Header */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #444"
        }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ff5f56" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffbd2e" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#27ca3f" }}></div>
        </div>
        
        {/* Terminal Content */}
        <div style={{
          color: "#00ff00",
          fontSize: "16px",
          lineHeight: "24px",
          whiteSpace: "pre-wrap"
        }}>
          {displayText}
          <span style={{ opacity: cursorOpacity }}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'typing',
  name: 'Terminal Typing',
  duration: 300, // 10 seconds
  previewFrame: 30,
  getCode: () => `// src/templates/TypingTemplate.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function TypingTemplate() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Terminal text that types out
const fullText = "$ npm install @remotion/cli\\n$ npx remotion preview\\n✓ Server ready at http://localhost:3000";

// Calculate how much text to show based on frame
const charactersPerSecond = 8;
const totalCharacters = Math.floor((frame / fps) * charactersPerSecond);
const displayText = fullText.substring(0, totalCharacters);

// Cursor blink animation
const cursorOpacity = interpolate(frame % 30, [0, 15, 30], [1, 0, 1]);

// Terminal window fade in
const windowOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

return (
  <AbsoluteFill 
    style={{
      backgroundColor: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Monaco, 'Courier New', monospace"
    }}
  >
    <div 
      style={{
        backgroundColor: "#2d2d2d",
        borderRadius: "8px",
        padding: "20px",
        minWidth: "500px",
        minHeight: "200px",
        opacity: windowOpacity,
        boxShadow: "0 10px 50px rgba(0,0,0,0.5)"
      }}
    >
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px",
        paddingBottom: "8px",
        borderBottom: "1px solid #444"
      }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ff5f56" }}></div>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffbd2e" }}></div>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#27ca3f" }}></div>
      </div>
      <div style={{
        color: "#00ff00",
        fontSize: "16px",
        lineHeight: "24px",
        whiteSpace: "pre-wrap"
      }}>
        {displayText}
        <span style={{ opacity: cursorOpacity }}>|</span>
      </div>
    </div>
  </AbsoluteFill>
);
}`
}; 