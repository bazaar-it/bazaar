import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';

const Square: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Continuous rotation animation
  const rotation = frame * 2;

  return (
    <div
      style={{
        width: "160px", // Reduced from 200px
        height: "160px", // Reduced from 200px
        background: "black",
        borderRadius: "15px",
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
};

const Soundwaves: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Generate bars with more realistic wave patterns
  const bars = Array.from({ length: 40 }, (_, i) => {
    // Combine multiple sine waves for more natural movement
    const wave1 = Math.sin((frame + i * 8) / 10) * 40;
    const wave2 = Math.sin((frame + i * 12) / 15) * 30;
    const wave3 = Math.sin((frame + i * 5) / 8) * 20;
    
    // Add random pauses
    const pause = Math.sin(frame / 30 + i) < -0.7 ? 0.2 : 1;
    
    const height = Math.abs((wave1 + wave2 + wave3) * pause);

    return (
      <div
        key={i}
        style={{
          width: "8px",
          height: `${height}px`,
          background: "black",
          borderRadius: "4px",
        }}
      />
    );
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
        height: "160px",
        width: "600px",
      }}
    >
      {bars}
    </div>
  );
};

const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Calculate minutes and seconds
  const totalSeconds = Math.floor(frame / 30); // 30 fps
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // Format time as MM:SS
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        fontSize: "64px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "black",
      }}
    >
      {timeString}
    </div>
  );
};

export default function AudioAnimation() {
  return (
    <AbsoluteFill
      style={{
        background: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px", // Reduced from 64px to make spacing equal between elements
      }}
    >
      <Square />
      <Soundwaves />
      <Counter />
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'audio-animation',
  name: 'Audio Animation',
  duration: 180, // 6 seconds
  previewFrame: 90,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

const Square = () => {
  const frame = useCurrentFrame();
  
  // Continuous rotation animation
  const rotation = frame * 2;

  return (
    <div
      style={{
        width: "160px",
        height: "160px",
        background: "black",
        borderRadius: "15px",
        transform: \`rotate(\${rotation}deg)\`,
      }}
    />
  );
};

const Soundwaves = () => {
  const frame = useCurrentFrame();
  
  // Generate bars with more realistic wave patterns
  const bars = Array.from({ length: 40 }, (_, i) => {
    // Combine multiple sine waves for more natural movement
    const wave1 = Math.sin((frame + i * 8) / 10) * 40;
    const wave2 = Math.sin((frame + i * 12) / 15) * 30;
    const wave3 = Math.sin((frame + i * 5) / 8) * 20;
    
    // Add random pauses
    const pause = Math.sin(frame / 30 + i) < -0.7 ? 0.2 : 1;
    
    const height = Math.abs((wave1 + wave2 + wave3) * pause);

    return (
      <div
        key={i}
        style={{
          width: "8px",
          height: \`\${height}px\`,
          background: "black",
          borderRadius: "4px",
        }}
      />
    );
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
        height: "160px",
        width: "600px",
      }}
    >
      {bars}
    </div>
  );
};

const Counter = () => {
  const frame = useCurrentFrame();
  
  // Calculate minutes and seconds
  const totalSeconds = Math.floor(frame / 30); // 30 fps
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // Format time as MM:SS
  const timeString = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;

  return (
    <div
      style={{
        fontSize: "64px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "black",
      }}
    >
      {timeString}
    </div>
  );
};

export default function AudioAnimation() {
  return (
    <AbsoluteFill
      style={{
        background: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
      }}
    >
      <Square />
      <Soundwaves />
      <Counter />
    </AbsoluteFill>
  );
}`,
};