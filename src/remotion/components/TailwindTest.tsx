import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const TailwindTest: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Animate opacity
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Animate scale
  const scale = interpolate(frame, [0, 60], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-blue-500 flex items-center justify-center">
      <div 
        className="bg-white rounded-lg shadow-lg p-8 transform transition-transform"
        style={{ 
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Tailwind Test
        </h1>
        <p className="text-gray-700 text-lg">
          Frame: {frame}
        </p>
        <div className="mt-4 flex space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </AbsoluteFill>
  );
}; 