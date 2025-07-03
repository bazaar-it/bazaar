import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type ParticleDissolveProps = {
  particleCount?: number;
  particleSize?: number;
  spread?: number;
  colors?: string[];
};

export const ParticleDissolvePresentation: React.FC<
  TransitionPresentationComponentProps<ParticleDissolveProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const frame = useCurrentFrame();
  const {
    particleCount = 80,
    particleSize = 4,
    spread = 100,
    colors = ['#ffffff', '#cccccc', '#999999'],
  } = passedProps;

  // Generate stable random positions for particles
  const particles = React.useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      x: random(`particle-x-${i}`) * 100,
      y: random(`particle-y-${i}`) * 100,
      delay: random(`particle-delay-${i}`) * 0.3,
      speed: 0.5 + random(`particle-speed-${i}`) * 0.5,
      color: colors[Math.floor(random(`particle-color-${i}`) * colors.length)],
      size: particleSize * (0.5 + random(`particle-size-${i}`) * 0.5),
    }));
  }, [particleCount, particleSize, colors]);

  const exitingOpacity = interpolate(presentationProgress, [0, 0.6], [1, 0]);
  const enteringOpacity = interpolate(presentationProgress, [0.4, 1], [0, 1]);

  const particleOpacity = interpolate(
    presentationProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0]
  );

  return (
    <AbsoluteFill>
      {/* Exiting scene with dissolve effect */}
      {presentationDirection === 'exiting' && (
        <AbsoluteFill style={{ opacity: exitingOpacity }}>
          {children}
        </AbsoluteFill>
      )}

      {/* Particle layer */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {particles.map((particle, i) => {
          const progress = Math.max(0, presentationProgress - particle.delay);
          const scale = interpolate(
            progress,
            [0, 0.5, 1],
            [0, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          const xOffset = interpolate(
            progress,
            [0, 1],
            [0, (particle.x - 50) * spread * particle.speed]
          );

          const yOffset = interpolate(
            progress,
            [0, 1],
            [0, (particle.y - 50) * spread * particle.speed]
          );

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: '50%',
                opacity: particleOpacity,
                transform: `translate(${xOffset}px, ${yOffset}px) scale(${scale})`,
                filter: 'blur(0.5px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* Entering scene */}
      {presentationDirection === 'entering' && (
        <AbsoluteFill style={{ opacity: enteringOpacity }}>
          {children}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const particleDissolve = (
  props?: ParticleDissolveProps
) => {
  return {
    component: ParticleDissolvePresentation,
    props: props || {},
  };
};