import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type MorphTransitionProps = {
  morphType?: 'liquid' | 'geometric' | 'organic';
  color?: string;
  segments?: number;
};

export const MorphTransitionPresentation: React.FC<
  TransitionPresentationComponentProps<MorphTransitionProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const {
    morphType = 'liquid',
    color = '#000000',
    segments = 5,
  } = passedProps;

  const springValue = spring({
    fps,
    frame: presentationProgress * 30,
    config: {
      damping: 50,
      stiffness: 100,
      mass: 1,
    },
  });

  // Generate morph path based on type
  const generateMorphPath = () => {
    const progress = springValue;
    
    switch (morphType) {
      case 'liquid': {
        const points = Array.from({ length: segments }, (_, i) => {
          const angle = (i / segments) * Math.PI * 2;
          const radius = 50 + Math.sin(frame * 0.1 + i) * 10 * (1 - progress);
          const x = 50 + Math.cos(angle) * radius * progress;
          const y = 50 + Math.sin(angle) * radius * progress;
          return `${x}% ${y}%`;
        });
        return `polygon(${points.join(', ')})`;
      }
      
      case 'geometric': {
        const size = interpolate(progress, [0, 1], [0, 150]);
        const rotation = interpolate(progress, [0, 1], [0, 45]);
        return `polygon(
          ${50 - size/2}% ${50 - size/2}%,
          ${50 + size/2}% ${50 - size/2}%,
          ${50 + size/2}% ${50 + size/2}%,
          ${50 - size/2}% ${50 + size/2}%
        )`;
      }
      
      case 'organic': {
        const t = progress;
        const x1 = 50 + Math.sin(frame * 0.05) * 10 * (1 - t);
        const y1 = interpolate(t, [0, 1], [100, 0]);
        const x2 = interpolate(t, [0, 1], [0, 100]);
        const y2 = 50 + Math.cos(frame * 0.05) * 10 * (1 - t);
        const x3 = 50 + Math.sin(frame * 0.05 + Math.PI) * 10 * (1 - t);
        const y3 = interpolate(t, [0, 1], [0, 100]);
        const x4 = interpolate(t, [0, 1], [100, 0]);
        const y4 = 50 + Math.cos(frame * 0.05 + Math.PI) * 10 * (1 - t);
        
        return `polygon(
          ${x1}% ${y1}%,
          ${x2}% ${y2}%,
          ${x3}% ${y3}%,
          ${x4}% ${y4}%
        )`;
      }
      
      default:
        return 'circle(50% at 50% 50%)';
    }
  };

  const exitingOpacity = interpolate(presentationProgress, [0.6, 1], [1, 0]);
  const enteringOpacity = interpolate(presentationProgress, [0, 0.4], [0, 1]);
  const morphOpacity = interpolate(
    presentationProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0]
  );

  const morphPath = generateMorphPath();
  const blurAmount = interpolate(
    presentationProgress,
    [0, 0.5, 1],
    [0, 5, 0]
  );

  return (
    <AbsoluteFill>
      {/* Exiting scene */}
      {presentationDirection === 'exiting' && (
        <AbsoluteFill style={{ opacity: exitingOpacity }}>
          {children}
        </AbsoluteFill>
      )}

      {/* Morph layer */}
      <AbsoluteFill
        style={{
          backgroundColor: color,
          opacity: morphOpacity,
          clipPath: morphPath,
          filter: `blur(${blurAmount}px)`,
          transform: morphType === 'geometric' 
            ? `rotate(${interpolate(presentationProgress, [0, 1], [0, 45])}deg)`
            : undefined,
        }}
      />

      {/* Additional organic layers for liquid effect */}
      {morphType === 'liquid' && (
        <>
          {[...Array(3)].map((_, i) => (
            <AbsoluteFill
              key={i}
              style={{
                backgroundColor: color,
                opacity: morphOpacity * 0.3,
                clipPath: generateMorphPath(),
                filter: `blur(${blurAmount * (i + 1)}px)`,
                transform: `scale(${1 + i * 0.1}) rotate(${i * 120}deg)`,
              }}
            />
          ))}
        </>
      )}

      {/* Entering scene */}
      {presentationDirection === 'entering' && (
        <AbsoluteFill
          style={{
            opacity: enteringOpacity,
            clipPath: morphPath,
          }}
        >
          {children}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const morphTransition = (
  props?: MorphTransitionProps
) => {
  return {
    component: MorphTransitionPresentation,
    props: props || {},
  };
};