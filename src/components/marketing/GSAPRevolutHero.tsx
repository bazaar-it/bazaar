"use client";
import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";

// Register GSAP plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function GSAPRevolutHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const newContentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    
    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(maskRef.current, {
        scale: 0,
        transformOrigin: "center center",
      });
      
      gsap.set(newContentRef.current, {
        opacity: 0,
        y: 100,
      });

      // Create the main timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          pin: heroRef.current,
          pinSpacing: false,
        }
      });

      // Animate mask expansion
      tl.to(maskRef.current, {
        scale: 30,
        duration: 1,
        ease: "power2.inOut",
      }, 0);

      // Fade out hero content
      tl.to([titleRef.current, subtitleRef.current, ctaRef.current], {
        opacity: 0,
        y: -50,
        duration: 0.5,
        stagger: 0.1,
      }, 0);

      // Scale and move video
      tl.to(videoRef.current, {
        scale: 0.6,
        y: 100,
        duration: 1,
        ease: "power2.inOut",
      }, 0.2);

      // Fade in new content
      tl.to(newContentRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
      }, 0.5);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ height: "200vh" }}>
      {/* Hero Section */}
      <div 
        ref={heroRef}
        className="relative h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"
      >
        {/* White Mask */}
        <div
          ref={maskRef}
          className="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full"
          style={{
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        />

        {/* Hero Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 z-20">
          <div ref={titleRef} className="text-center mb-6">
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
          </div>

          <p ref={subtitleRef} className="text-xl text-white/80 max-w-2xl mx-auto text-center mb-8">
            Transform your static designs into stunning video presentations with AI
          </p>

          <div ref={ctaRef}>
            <button className="bg-white text-purple-900 px-10 py-4 rounded-full text-lg font-semibold shadow-2xl hover:scale-105 transition-transform">
              Start Creating — It's Free
            </button>
            <p className="text-white/60 text-sm mt-3 text-center">No credit card required</p>
          </div>
        </div>

        {/* Video */}
        <div 
          ref={videoRef}
          className="absolute bottom-0 left-1/2 w-full max-w-4xl px-4 z-30"
          style={{
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-t-2xl overflow-hidden shadow-2xl">
            <MarketingVideoPlayer />
          </div>
        </div>
      </div>

      {/* New Content Section */}
      <div 
        ref={newContentRef}
        className="absolute top-0 left-0 right-0 h-screen flex items-center justify-center px-4 pointer-events-none"
        style={{ zIndex: 5 }}
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
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Upload Screenshots</h3>
              <p className="text-gray-600 text-sm">Turn static images into dynamic videos</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Enhancement</h3>
              <p className="text-gray-600 text-sm">Let AI add animations and transitions</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Export Anywhere</h3>
              <p className="text-gray-600 text-sm">Perfect for any social platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}