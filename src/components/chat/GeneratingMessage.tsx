"use client";

import React, { useState, useEffect } from 'react';

interface GeneratingMessageProps {
  className?: string;
  phase?: 'thinking' | 'generating';
}

export function GeneratingMessage({ className = "", phase = 'thinking' }: GeneratingMessageProps) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  // Different messages based on phase
  const getMessage = () => {
    switch (phase) {
      case 'thinking':
        return 'Thinking';
      case 'generating':
        return 'Generating';
      default:
        return 'Thinking';
    }
  };

  // Use shimmer effect for thinking, pulse for generating
  const getAnimationStyle = () => {
    if (phase === 'thinking') {
      // Shimmer effect
      return {
        background: 'linear-gradient(90deg, #64748b 25%, #94a3b8 50%, #64748b 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    } else {
      // Regular pulse for generating
      return {
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      };
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `
      }} />
      <span className={`inline-flex items-baseline ${className}`}>
        <span 
          className={`text-sm font-normal ${phase === 'thinking' ? '' : 'text-gray-600 animate-pulse'}`}
          style={getAnimationStyle()}
        >
          {getMessage()}<span className="inline-block w-12 text-left">{'.'.repeat(dots)}</span>
        </span>
      </span>
    </>
  );
}