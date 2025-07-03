import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { TransitionPresentationComponentProps } from '@remotion/transitions';

type PixelateTransitionProps = {
  maxPixelSize?: number;
  colorShift?: boolean;
  pattern?: 'random' | 'wave' | 'center' | 'corners';
};

export const PixelateTransitionPresentation: React.FC<
  TransitionPresentationComponentProps<PixelateTransitionProps>
> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const frame = useCurrentFrame();
  const {
    maxPixelSize = 40,
    colorShift = true,
    pattern = 'random',
  } = passedProps;

  // Calculate pixelation size based on progress
  const pixelSize = interpolate(
    presentationProgress,
    [0, 0.5, 1],
    [1, maxPixelSize, 1]
  );

  // Generate pixelation effect using CSS
  const pixelationStyle: React.CSSProperties = {
    imageRendering: 'pixelated',
    filter: `
      contrast(${interpolate(presentationProgress, [0, 0.5, 1], [1, 1.2, 1])})
      ${colorShift ? `hue-rotate(${interpolate(presentationProgress, [0, 0.5, 1], [0, 30, 0])}deg)` : ''}
    `,
    transform: `scale(${1 / pixelSize})`,
    transformOrigin: 'top left',
  };

  const containerStyle: React.CSSProperties = {
    transform: `scale(${pixelSize})`,
    transformOrigin: 'top left',
    overflow: 'hidden',
  };

  // Generate pixel grid overlay for additional effect
  const generatePixelGrid = () => {
    const gridSize = Math.ceil(100 / pixelSize);
    const pixels = [];
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const index = y * gridSize + x;
        let delay = 0;
        
        switch (pattern) {
          case 'wave':
            delay = (x + y) / (gridSize * 2);
            break;
          case 'center':
            const dx = x - gridSize / 2;
            const dy = y - gridSize / 2;
            delay = Math.sqrt(dx * dx + dy * dy) / gridSize;
            break;
          case 'corners':
            const cornerDist = Math.min(
              Math.sqrt(x * x + y * y),
              Math.sqrt((gridSize - x) * (gridSize - x) + y * y),
              Math.sqrt(x * x + (gridSize - y) * (gridSize - y)),
              Math.sqrt((gridSize - x) * (gridSize - x) + (gridSize - y) * (gridSize - y))
            );
            delay = cornerDist / gridSize;
            break;
          default:
            delay = random(`pixel-${index}`) * 0.5;
        }
        
        const pixelProgress = Math.max(0, Math.min(1, (presentationProgress - delay) / (1 - delay)));
        const opacity = interpolate(pixelProgress, [0, 0.5, 1], [0, 0.2, 0]);
        
        if (opacity > 0.01) {
          pixels.push(
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${x * pixelSize}%`,
                top: `${y * pixelSize}%`,
                width: `${pixelSize}%`,
                height: `${pixelSize}%`,
                backgroundColor: colorShift 
                  ? `hsl(${(x + y) * 10 + frame}, 70%, 50%)`
                  : 'rgba(255, 255, 255, 0.1)',
                opacity,
                border: '1px solid rgba(0, 0, 0, 0.1)',
              }}
            />
          );
        }
      }
    }
    
    return pixels;
  };

  const exitingOpacity = interpolate(presentationProgress, [0.7, 1], [1, 0]);
  const enteringOpacity = interpolate(presentationProgress, [0, 0.3], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Exiting scene with pixelation */}
      {presentationDirection === 'exiting' && (
        <AbsoluteFill style={{ opacity: exitingOpacity }}>
          <AbsoluteFill style={containerStyle}>
            <AbsoluteFill style={pixelationStyle}>
              {children}
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* Pixel grid overlay */}
      {pixelSize > 5 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {generatePixelGrid()}
        </AbsoluteFill>
      )}

      {/* Entering scene with pixelation */}
      {presentationDirection === 'entering' && (
        <AbsoluteFill style={{ opacity: enteringOpacity }}>
          <AbsoluteFill style={containerStyle}>
            <AbsoluteFill style={pixelationStyle}>
              {children}
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const pixelateTransition = (
  props?: PixelateTransitionProps
) => {
  return {
    component: PixelateTransitionPresentation,
    props: props || {},
  };
};