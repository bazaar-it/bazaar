import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type GlitchTransitionProps = {
  intensity?: number;
  sliceCount?: number;
  colorShift?: boolean;
};

export const GlitchTransitionPresentation: React.FC<
  TransitionPresentationComponentProps<GlitchTransitionProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const frame = useCurrentFrame();
  const {
    intensity = 20,
    sliceCount = 8,
    colorShift = true,
  } = passedProps;

  // Generate glitch slices
  const slices = React.useMemo(() => {
    return Array.from({ length: sliceCount }, (_, i) => ({
      height: 100 / sliceCount,
      offset: random(`slice-${i}`) * intensity,
      delay: random(`delay-${i}`) * 0.3,
      speed: 0.5 + random(`speed-${i}`) * 0.5,
    }));
  }, [sliceCount, intensity]);

  const glitchIntensity = interpolate(
    presentationProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0]
  );

  const exitingOpacity = interpolate(presentationProgress, [0, 0.5], [1, 0]);
  const enteringOpacity = interpolate(presentationProgress, [0.5, 1], [0, 1]);

  const renderGlitchedContent = (content: React.ReactNode, isEntering: boolean) => (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {slices.map((slice, i) => {
        const progress = Math.max(0, presentationProgress - slice.delay);
        const xOffset = Math.sin(frame * slice.speed) * slice.offset * glitchIntensity;
        
        const clipPath = `inset(${slice.height * i}% 0 ${100 - slice.height * (i + 1)}% 0)`;
        
        return (
          <AbsoluteFill
            key={i}
            style={{
              clipPath,
              transform: `translateX(${xOffset}px)`,
            }}
          >
            {content}
          </AbsoluteFill>
        );
      })}

      {/* Color channel shifts */}
      {colorShift && glitchIntensity > 0 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: 'screen',
              opacity: glitchIntensity * 0.5,
              transform: `translateX(${glitchIntensity * 5}px)`,
              filter: 'hue-rotate(180deg)',
            }}
          >
            {content}
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              mixBlendMode: 'screen',
              opacity: glitchIntensity * 0.3,
              transform: `translateX(${-glitchIntensity * 3}px)`,
              filter: 'hue-rotate(90deg)',
            }}
          >
            {content}
          </AbsoluteFill>
        </>
      )}

      {/* Noise overlay */}
      <AbsoluteFill
        style={{
          opacity: glitchIntensity * 0.1,
          mixBlendMode: 'overlay',
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.03) 2px,
            rgba(255, 255, 255, 0.03) 4px
          )`,
        }}
      />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill>
      {presentationDirection === 'exiting' && (
        <AbsoluteFill style={{ opacity: exitingOpacity }}>
          {renderGlitchedContent(children, false)}
        </AbsoluteFill>
      )}
      
      {presentationDirection === 'entering' && (
        <AbsoluteFill style={{ opacity: enteringOpacity }}>
          {renderGlitchedContent(children, true)}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const glitchTransition = (
  props?: GlitchTransitionProps
) => {
  return {
    component: GlitchTransitionPresentation,
    props: props || {},
  };
};