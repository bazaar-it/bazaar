import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type CircularRevealProps = {
  direction?: 'in' | 'out';
  center?: { x: number; y: number };
  smoothness?: number;
  rotation?: boolean;
};

export const CircularRevealPresentation: React.FC<
  TransitionPresentationComponentProps<CircularRevealProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const {
    direction = 'in',
    center = { x: 50, y: 50 },
    smoothness = 1,
    rotation = false,
  } = passedProps;

  // Calculate the maximum radius needed to cover the entire screen
  const maxRadius = Math.sqrt(
    Math.pow(width, 2) + Math.pow(height, 2)
  ) / Math.min(width, height) * 100;

  const springConfig = {
    damping: 100 * smoothness,
    mass: 0.5,
    stiffness: 200,
    overshootClamping: false,
  };

  const progress = spring({
    fps,
    frame: presentationProgress * 30,
    config: springConfig,
  });

  const radius = direction === 'in'
    ? interpolate(progress, [0, 1], [0, maxRadius])
    : interpolate(progress, [0, 1], [maxRadius, 0]);

  const rotationAngle = rotation
    ? interpolate(presentationProgress, [0, 1], [0, 180])
    : 0;

  const exitingOpacity = presentationDirection === 'exiting'
    ? interpolate(presentationProgress, [0.8, 1], [1, 0])
    : 1;

  const enteringOpacity = presentationDirection === 'entering'
    ? interpolate(presentationProgress, [0, 0.2], [0, 1])
    : 1;

  const clipPath = `circle(${radius}% at ${center.x}% ${center.y}%)`;

  return (
    <AbsoluteFill>
      {/* Exiting scene */}
      {presentationDirection === 'exiting' && (
        <AbsoluteFill
          style={{
            opacity: exitingOpacity,
            transform: rotation ? `rotate(${-rotationAngle}deg)` : undefined,
          }}
        >
          {children}
        </AbsoluteFill>
      )}

      {/* Entering scene with circular reveal */}
      {presentationDirection === 'entering' && (
        <AbsoluteFill
          style={{
            clipPath,
            opacity: enteringOpacity,
            transform: rotation ? `rotate(${rotationAngle}deg)` : undefined,
            transformOrigin: `${center.x}% ${center.y}%`,
          }}
        >
          {children}
        </AbsoluteFill>
      )}

      {/* Optional decorative ring */}
      {presentationProgress > 0.1 && presentationProgress < 0.9 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${center.x}%`,
              top: `${center.y}%`,
              transform: 'translate(-50%, -50%)',
              width: `${radius * 2}%`,
              height: `${radius * 2}%`,
              borderRadius: '50%',
              border: `2px solid rgba(255, 255, 255, ${interpolate(
                presentationProgress,
                [0.1, 0.5, 0.9],
                [0, 0.3, 0]
              )})`,
              boxShadow: `0 0 20px rgba(255, 255, 255, ${interpolate(
                presentationProgress,
                [0.1, 0.5, 0.9],
                [0, 0.5, 0]
              )})`,
            }}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const circularReveal = (
  props?: CircularRevealProps
) => {
  return {
    component: CircularRevealPresentation,
    props: props || {},
  };
};