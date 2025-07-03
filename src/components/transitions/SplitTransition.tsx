import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type SplitTransitionProps = {
  direction?: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
  splits?: number;
  stagger?: boolean;
  reverse?: boolean;
};

export const SplitTransitionPresentation: React.FC<
  TransitionPresentationComponentProps<SplitTransitionProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { fps } = useVideoConfig();
  const {
    direction = 'vertical',
    splits = 5,
    stagger = true,
    reverse = false,
  } = passedProps;

  const springConfig = {
    damping: 100,
    stiffness: 200,
    mass: 0.5,
  };

  // Generate split segments
  const segments = React.useMemo(() => {
    return Array.from({ length: splits }, (_, i) => {
      const staggerDelay = stagger ? (i / splits) * 0.3 : 0;
      const reverseDelay = reverse ? (1 - i / splits) * 0.3 : 0;
      const delay = stagger ? (reverse ? reverseDelay : staggerDelay) : 0;
      
      return {
        index: i,
        delay,
        progress: Math.max(0, Math.min(1, (presentationProgress - delay) / (1 - delay))),
      };
    });
  }, [splits, stagger, reverse, presentationProgress]);

  const getClipPath = (index: number, progress: number) => {
    const segmentSize = 100 / splits;
    const start = index * segmentSize;
    const end = (index + 1) * segmentSize;
    
    switch (direction) {
      case 'horizontal':
        const yOffset = interpolate(progress, [0, 1], [-100, 0]);
        return `polygon(
          0% ${start + yOffset}%,
          100% ${start + yOffset}%,
          100% ${end + yOffset}%,
          0% ${end + yOffset}%
        )`;
        
      case 'vertical':
        const xOffset = interpolate(progress, [0, 1], [-100, 0]);
        return `polygon(
          ${start + xOffset}% 0%,
          ${end + xOffset}% 0%,
          ${end + xOffset}% 100%,
          ${start + xOffset}% 100%
        )`;
        
      case 'diagonal':
        const diagOffset = interpolate(progress, [0, 1], [-141, 0]);
        return `polygon(
          ${start + diagOffset}% 0%,
          ${end + diagOffset}% 0%,
          ${end + diagOffset + 100}% 100%,
          ${start + diagOffset + 100}% 100%
        )`;
        
      case 'radial':
        const angle = (index / splits) * 360;
        const nextAngle = ((index + 1) / splits) * 360;
        const radius = interpolate(progress, [0, 1], [0, 100]);
        return `polygon(
          50% 50%,
          ${50 + radius * Math.cos(angle * Math.PI / 180)}% ${50 + radius * Math.sin(angle * Math.PI / 180)}%,
          ${50 + radius * Math.cos(nextAngle * Math.PI / 180)}% ${50 + radius * Math.sin(nextAngle * Math.PI / 180)}%
        )`;
        
      default:
        return 'none';
    }
  };

  const exitingOpacity = interpolate(presentationProgress, [0.7, 1], [1, 0]);
  const enteringBaseOpacity = interpolate(presentationProgress, [0, 0.3], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Exiting scene */}
      {presentationDirection === 'exiting' && (
        <AbsoluteFill style={{ opacity: exitingOpacity }}>
          {children}
        </AbsoluteFill>
      )}

      {/* Entering scene with split segments */}
      {presentationDirection === 'entering' && (
        <AbsoluteFill>
          {segments.map((segment) => {
            const springProgress = spring({
              fps,
              frame: segment.progress * 30,
              config: springConfig,
            });

            return (
              <AbsoluteFill
                key={segment.index}
                style={{
                  clipPath: getClipPath(segment.index, springProgress),
                  opacity: enteringBaseOpacity,
                }}
              >
                {children}
              </AbsoluteFill>
            );
          })}

          {/* Edge glow effect */}
          {segments.map((segment) => {
            if (segment.progress > 0.1 && segment.progress < 0.9) {
              return (
                <AbsoluteFill
                  key={`glow-${segment.index}`}
                  style={{
                    clipPath: getClipPath(segment.index, segment.progress),
                    opacity: interpolate(
                      segment.progress,
                      [0.1, 0.5, 0.9],
                      [0, 0.3, 0]
                    ),
                    filter: 'blur(10px)',
                    transform: 'scale(1.02)',
                  }}
                >
                  <AbsoluteFill
                    style={{
                      background: 'linear-gradient(45deg, #fff, transparent)',
                    }}
                  />
                </AbsoluteFill>
              );
            }
            return null;
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const splitTransition = (
  props?: SplitTransitionProps
) => {
  return {
    component: SplitTransitionPresentation,
    props: props || {},
  };
};