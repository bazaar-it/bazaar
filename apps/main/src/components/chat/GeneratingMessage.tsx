"use client";

import React, { useState, useEffect } from 'react';

interface GeneratingMessageProps {
  className?: string;
}

export function GeneratingMessage({ className = "" }: GeneratingMessageProps) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <style jsx>{`
        @keyframes subtleGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        .glow-text {
          animation: subtleGlow 2s ease-in-out infinite;
        }
      `}</style>
      <span className="text-gray-600 text-sm font-normal glow-text">
        Generating code<span className="inline-block w-12 text-left">{'.'.repeat(dots)}</span>
      </span>
    </span>
  );
}