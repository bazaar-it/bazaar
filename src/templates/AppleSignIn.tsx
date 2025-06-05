// src/templates/AppleSignIn.tsx
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    spring,
    useVideoConfig,
} from 'remotion';
  
  export default function AppleSignIn() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
  
    const fadeIn = spring({
      frame,
      fps,
      config: { damping: 20, stiffness: 80 },
    });
  
    const buttonScale = spring({
      frame: frame - 15,
      fps,
      config: { damping: 12, stiffness: 200 },
    });
  
    const hover = spring({
      frame: frame - 45,
      fps,
      config: { damping: 12, stiffness: 200 },
    });
  
    const shadowSize = interpolate(hover, [0, 1], [20, 30]);
  
    const pulse = Math.sin(frame / 30) * 0.1 + 0.9;
  
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "600px",
            height: "200px",
            transform: `translate(-50%, -50%) scale(${pulse})`,
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
            opacity: fadeIn,
          }}
        />
  
        {/* Apple Button */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: "100px",
            padding: "24px 120px",
            fontSize: "32px",
            fontWeight: 500,
            cursor: "pointer",
            opacity: fadeIn,
            transform: `scale(${interpolate(buttonScale, [0, 1], [0.9, 1])})`,
            boxShadow: `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, 0.1)`,
            transition: "box-shadow 0.3s ease",
          }}
        >
          <svg viewBox="0 0 384 512" width="32" height="32" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          Sign in with Apple
        </button>
      </AbsoluteFill>
    );
  } 