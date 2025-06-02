//src/templates/GitHubSignIn.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export default function GithubSignIn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const scaleIn = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 200,
          transform: `translate(-50%, -50%) scale(${pulse})`,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: fadeIn,
        }}
      />

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
          fontFamily: "Inter, -apple-system, system-ui, sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          opacity: fadeIn,
          transform: `scale(${interpolate(scaleIn, [0, 1], [0.9, 1])})`,
          boxShadow: `0 24px 48px rgba(0, 0, 0, 0.15)`,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width={32}
          height={32}
        >
          <path d="M12 .5C5.65.5.5 5.66.5 12.05c0 5.1 3.29 9.42 7.86 10.96.58.11.8-.25.8-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.54-2.55-.3-5.23-1.28-5.23-5.7 0-1.26.46-2.3 1.2-3.11-.12-.3-.52-1.52.11-3.16 0 0 .98-.31 3.2 1.19a11.14 11.14 0 0 1 5.82 0c2.2-1.5 3.18-1.19 3.18-1.19.64 1.64.24 2.86.12 3.16.75.81 1.2 1.85 1.2 3.11 0 4.43-2.69 5.39-5.25 5.68.42.36.77 1.08.77 2.17 0 1.56-.02 2.82-.02 3.2 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12.05C23.5 5.66 18.34.5 12 .5Z" />
        </svg>
        Sign in with GitHub
      </button>
    </AbsoluteFill>
  );
} 