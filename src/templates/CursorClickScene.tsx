import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import React from 'react';

const NewButton: React.FC<{
  opacity: number;
  scale: number;
}> = ({ opacity, scale }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        background: 'white',
        padding: '48px 64px',
        borderRadius: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        opacity,
        boxShadow: `
          0 8px 32px rgba(66, 153, 225, 0.15),
          0 0 0 1px rgba(66, 153, 225, 0.2),
          0 0 24px rgba(66, 153, 225, 0.1),
          0 0 48px rgba(66, 153, 225, 0.1),
          0 0 96px rgba(66, 153, 225, 0.1)
        `,
      }}
    >
      <span style={{ fontSize: '96px', color: '#000000' }}>+</span>
      <span
        style={{
          fontSize: '96px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 400,
          color: '#000000',
        }}
      >
        New
      </span>
    </div>
  );
};

const Cursor: React.FC<{
  x: number;
  y: number;
  scale: number;
  opacity: number;
}> = ({ x, y, scale, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: '200px',
        lineHeight: 1,
        transform: `translate(-50%, -50%) scale(${scale * 0.5})`,
        opacity,
      }}
    >
      👆
    </div>
  );
};

const CursorClickScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const buttonProgress = 1;

  // Faster arc movement: completes in 44 frames
  const progress = interpolate(frame, [0, 44], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  // Smooth arc path
  const startX = width + 100;
  const startY = height;
  const endX = width / 2 + 180;
  const endY = height / 2 + 60;
  const controlX = (startX + endX) / 2;
  const controlY = height / 2 - 100; // Creates smooth arc height

  // Quadratic Bézier approximation
  const bezier = (t: number, p0: number, p1: number, p2: number) =>
    (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

  const cursorX = bezier(progress, startX, controlX, endX);
  const cursorY = bezier(progress, startY, controlY, endY);

  const clickProgress = spring({
    frame: frame - 44,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const buttonScale = interpolate(clickProgress, [0, 1], [1, 0.95], {
    extrapolateRight: 'clamp',
  });

  const cursorScale = interpolate(clickProgress, [0, 1], [1, 0.8], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#F8F9FA' }}>
      <NewButton opacity={buttonProgress} scale={buttonScale} />
      <Cursor x={cursorX} y={cursorY} scale={cursorScale} opacity={1} />
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'cursor-click-scene',
  name: 'Cursor Click Scene',
  duration: 90,
  previewFrame: 45,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

const NewButton = ({ opacity, scale }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: \`translate(-50%, -50%) scale(\${scale})\`,
        background: 'white',
        padding: '48px 64px',
        borderRadius: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        opacity,
        boxShadow: \`
          0 8px 32px rgba(66, 153, 225, 0.15),
          0 0 0 1px rgba(66, 153, 225, 0.2),
          0 0 24px rgba(66, 153, 225, 0.1),
          0 0 48px rgba(66, 153, 225, 0.1),
          0 0 96px rgba(66, 153, 225, 0.1)
        \`,
      }}
    >
      <span style={{ fontSize: '96px', color: '#000000' }}>+</span>
      <span
        style={{
          fontSize: '96px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 400,
          color: '#000000',
        }}
      >
        New
      </span>
    </div>
  );
};

const Cursor = ({ x, y, scale, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: '200px',
        lineHeight: 1,
        transform: \`translate(-50%, -50%) scale(\${scale * 0.5})\`,
        opacity,
      }}
    >
      👆
    </div>
  );
};

export default function CursorClickScene() {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const buttonProgress = 1;

  // Faster arc movement: completes in 44 frames
  const progress = interpolate(frame, [0, 44], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  // Smooth arc path
  const startX = width + 100;
  const startY = height;
  const endX = width / 2 + 180;
  const endY = height / 2 + 60;
  const controlX = (startX + endX) / 2;
  const controlY = height / 2 - 100; // Creates smooth arc height

  // Quadratic Bézier approximation
  const bezier = (t, p0, p1, p2) =>
    (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

  const cursorX = bezier(progress, startX, controlX, endX);
  const cursorY = bezier(progress, startY, controlY, endY);

  const clickProgress = spring({
    frame: frame - 44,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const buttonScale = interpolate(clickProgress, [0, 1], [1, 0.95], {
    extrapolateRight: 'clamp',
  });

  const cursorScale = interpolate(clickProgress, [0, 1], [1, 0.8], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#F8F9FA' }}>
      <NewButton opacity={buttonProgress} scale={buttonScale} />
      <Cursor x={cursorX} y={cursorY} scale={cursorScale} opacity={1} />
    </AbsoluteFill>
  );
}`,
};

export default CursorClickScene; 