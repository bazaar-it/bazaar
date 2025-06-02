import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

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