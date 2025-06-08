// src/templates/FloatingParticles.tsx
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  random,
} from 'remotion';

// Static color array (safe for SSR)
const colors = ['#FF8DC7', '#86A8E7', '#FF69B4', '#9B6DFF'];

export default function ParticleFlow() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const progress = frame / 90;

  // Generate particles deterministically using Remotion's random function
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    baseOffset: random(`baseOffset-${i}`) * Math.PI * 2,
    radius: random(`radius-${i}`) * 100 + 300,
    size: random(`size-${i}`) * 12 + 6,
    color: colors[Math.floor(random(`color-${i}`) * colors.length)] || colors[0],
    speed: random(`speed-${i}`) * 0.3 + 0.2,
    clockwise: random(`clockwise-${i}`) > 0.5,
  }));

  const particleStyles = particles.map((p) => {
    const angle =
      (progress * p.speed + p.baseOffset) *
      (p.clockwise ? 1 : -1) *
      Math.PI *
      2;

    const x = width / 2 + Math.cos(angle) * p.radius;
    const y = height / 2 + Math.sin(angle) * p.radius;

    const opacity = interpolate(Math.sin(progress * Math.PI * 2), [-1, 1], [0.4, 1]);

    return {
      transform: `translate(${x}px, ${y}px)`,
      opacity,
      width: p.size,
      height: p.size,
      background: p.color,
      position: 'absolute' as const,
      borderRadius: '50%',
      boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
    };
  });

  const textOpacity = interpolate(frame, [0, 15, 60, 75], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(45deg, #000000, #1a1a1a)',
        overflow: 'visible', // allow particles outside the box
        position: 'relative',
      }}
    >
      {particleStyles.map((style, i) => (
        <div key={particles[i]?.id || i} style={style} />
      ))}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.85)',
          opacity: textOpacity,
          color: 'white',
          fontSize: 56,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '0 0 20px rgba(255,255,255,0.5)',
        }}
      >
        AI - Powered
        <br />
        <span
          style={{
            fontSize: 60,
            background: 'linear-gradient(90deg, #FF8DC7, #86A8E7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          Motion Graphics
        </span>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'floating-particles',
  name: 'Floating Particles',
  duration: 300, // 10 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function FloatingParticles() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const particles = Array.from({ length: 50 }, (_, i) => {
  const x = (i * 123) % 100;
  const y = (i * 456) % 100;
  const speed = 0.5 + (i % 3) * 0.3;
  const size = 2 + (i % 4);
  
  const animatedY = (y + (frame * speed)) % 120;
  const opacity = interpolate(animatedY, [0, 20, 100, 120], [0, 1, 1, 0]);
  
  return { x, y: animatedY, size, opacity };
});

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#0a0a0a",
      overflow: "hidden",
    }}
  >
    {particles.map((particle, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: \`\${particle.x}%\`,
          top: \`\${particle.y}%\`,
          width: \`\${particle.size}px\`,
          height: \`\${particle.size}px\`,
          borderRadius: "50%",
          backgroundColor: "#fff",
          opacity: particle.opacity,
          boxShadow: \`0 0 \${particle.size * 2}px #fff\`,
        }}
      />
    ))}
    
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "#fff",
        fontSize: "48px",
        fontWeight: "bold",
        textAlign: "center",
        textShadow: "0 0 20px #fff",
      }}
    >
      FLOATING
      <br />
      PARTICLES
    </div>
  </AbsoluteFill>
);
}`
};