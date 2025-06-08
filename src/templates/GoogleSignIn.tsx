// src/templates/GoogleSignIn.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';

export default function GoogleSignIn() {
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

  const buttonScale = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  const hover = spring({
    frame: frame - 45,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  const shadowSize = interpolate(hover, [0, 1], [20, 30]);
  const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 600,
          height: 200,
          transform: `translate(-50%, -50%) scale(${pulse})`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
          opacity: fadeIn,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'white',
          color: '#1a1a1a',
          border: '1px solid #ccc',
          borderRadius: 100,
          padding: '24px 120px',
          fontSize: 32,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
          opacity: fadeIn,
          transform: `scale(${interpolate(buttonScale, [0, 1], [0.9, 1])})`,
          boxShadow: `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, 0.1)`,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 256 262"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M255.68 133.49c0-11.26-.93-22.07-2.67-32.52H130v61.55h70.68c-3.06 16.52-12.28 30.51-26.18 39.89v33.03h42.32c24.75-22.8 38.86-56.4 38.86-101.95z"
            fill="#4285F4"
          />
          <path
            d="M130 262c35.1 0 64.56-11.66 86.08-31.6l-42.32-33.03c-11.78 7.9-26.88 12.56-43.76 12.56-33.64 0-62.15-22.71-72.34-53.2H14.59v33.59C36.2 230.82 79.91 262 130 262z"
            fill="#34A853"
          />
          <path
            d="M57.66 156.73c-2.77-8.23-4.36-17-4.36-26s1.59-17.77 4.36-26V71.14H14.59C5.28 88.79 0 109.1 0 130s5.28 41.21 14.59 58.86l43.07-32.13z"
            fill="#FBBC05"
          />
          <path
            d="M130 51.05c19.08 0 36.16 6.56 49.68 19.42l37.26-37.26C194.56 11.72 165.1 0 130 0 79.91 0 36.2 31.18 14.59 71.14l43.07 33.59C67.85 73.76 96.36 51.05 130 51.05z"
            fill="#EA4335"
          />
        </svg>
        &nbsp;Sign in with Google
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'google-signin',
  name: 'Google Sign In',
  duration: 120, // 4 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
spring,
interpolate,
} = window.Remotion;

export default function GoogleSignIn() {
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
        transform: \`translate(-50%, -50%) scale(\${pulse})\`,
        background: "radial-gradient(ellipse at center, rgba(66,133,244,0.1) 0%, transparent 70%)",
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
        background: "white",
        color: "#3c4043",
        border: "1px solid #dadce0",
        borderRadius: "100px",
        padding: "24px 120px",
        fontSize: "32px",
        fontFamily: "Google Sans, -apple-system, system-ui, sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        opacity: fadeIn,
        transform: \`scale(\${interpolate(scaleIn, [0, 1], [0.9, 1])})\`,
        boxShadow: \`0 24px 48px rgba(0, 0, 0, 0.15)\`,
      }}
    >
      <svg viewBox="0 0 24 24" width="32" height="32">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  </AbsoluteFill>
);
}`
};