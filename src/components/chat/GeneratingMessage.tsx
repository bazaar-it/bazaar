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
      <span 
        className="text-gray-600 text-sm font-normal animate-pulse"
        style={{
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      >
        Generating code<span className="inline-block w-12 text-left">{'.'.repeat(dots)}</span>
      </span>
    </span>
  );
}