"use client";
import { useEffect, useRef, useState } from "react";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";

export default function RevolutClean() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate progress based on scroll
  const progress = Math.min(Math.max(scrollY / (window.innerHeight * 0.8), 0), 1);
  
  // Animation values
  const heroOpacity = 1 - progress;
  const maskScale = progress * 50; // Expand mask
  const videoScale = 1 - (progress * 0.5); // Scale down to 50%
  const videoY = progress * 200; // Move down
  const contentY = Math.max(0, 50 - (progress * 50)); // Move content up

  return (
    <div ref={containerRef} className="relative">
      {/* Dark Hero Background - Fades out */}
      <div 
        ref={heroRef}
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"
        style={{
          opacity: heroOpacity,
          pointerEvents: progress > 0.5 ? 'none' : 'auto',
        }}
      />

      {/* White mask that expands */}
      <div
        ref={maskRef}
        className="fixed inset-0 bg-white"
        style={{
          clipPath: `circle(${maskScale}% at 50% 50%)`,
          WebkitClipPath: `circle(${maskScale}% at 50% 50%)`,
        }}
      />

      {/* Hero Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 z-10">
        <div 
          className="text-center mb-8"
          style={{
            opacity: 1 - (progress * 2),
            transform: `translateY(${-progress * 100}px)`,
          }}
        >
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                V2
              </span>
              <span className="text-white text-sm">AI-Powered Demo Videos</span>
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            <span className="relative inline-block px-4 py-2 border-2 border-dashed border-white/40 rounded-lg">
              Screenshot
            </span>
          </h1>
          <h2 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
            to Demo Video
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mt-4">
            Transform your static designs into stunning video presentations with AI
          </p>
        </div>

        {/* CTA Button */}
        <div 
          className="mb-12"
          style={{
            opacity: 1 - (progress * 3),
            transform: `translateY(${-progress * 80}px)`,
          }}
        >
          <button className="bg-white text-purple-900 px-10 py-4 rounded-full text-lg font-semibold shadow-2xl">
            Start Creating — It's Free
          </button>
          <p className="text-white/60 text-sm mt-3 text-center">No credit card required</p>
        </div>
      </div>

      {/* Video that scales and moves */}
      <div 
        ref={videoRef}
        className="fixed bottom-0 left-1/2 w-full max-w-4xl px-4 z-20"
        style={{
          transform: `translateX(-50%) scale(${videoScale}) translateY(${videoY}px)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div className="rounded-t-2xl overflow-hidden shadow-2xl">
          <MarketingVideoPlayer />
        </div>
      </div>

      {/* New content that appears */}
      <div 
        ref={contentRef}
        className="relative min-h-screen flex items-center justify-center px-4 z-30"
        style={{
          opacity: progress,
          transform: `translateY(${contentY}px)`,
        }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Create Videos in 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500"> Seconds</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Choose your preferred way to create stunning demo videos
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Upload Screenshots</h3>
              <p className="text-gray-600 text-sm">Turn static images into dynamic videos</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">AI Enhancement</h3>
              <p className="text-gray-600 text-sm">Let AI add animations and transitions</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Export Anywhere</h3>
              <p className="text-gray-600 text-sm">Perfect for any social platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for additional content */}
      <div className="h-screen" />
    </div>
  );
}