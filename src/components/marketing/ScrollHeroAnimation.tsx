"use client";

interface ScrollHeroAnimationProps {
  onAnimationComplete?: () => void;
}

export default function ScrollHeroAnimation({ onAnimationComplete }: ScrollHeroAnimationProps) {
  // Placeholder component to fix build
  if (onAnimationComplete) {
    setTimeout(onAnimationComplete, 100);
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Scroll Animation Demo
        </h1>
        <p className="text-lg text-gray-600">
          Transform your website into stunning motion graphics
        </p>
      </div>
    </div>
  );
}