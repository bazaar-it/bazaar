"use client";
import { useEffect, useRef, useState } from "react";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";

interface NativeScrollHeroProps {
  children?: React.ReactNode;
}

export default function NativeScrollHero({ children }: NativeScrollHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const whiteOverlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;

    const updateAnimations = () => {
      if (!containerRef.current || !heroRef.current) return;

      const scrollY = window.scrollY;
      const heroHeight = heroRef.current.offsetHeight;
      const progress = Math.min(Math.max(scrollY / heroHeight, 0), 1);

      // Only trigger animation once when scrolling down past threshold
      if (!hasTriggered && scrollY > 50 && scrollY > lastScrollY) {
        setHasTriggered(true);
        setIsAnimating(true);
      }

      if (isAnimating || hasTriggered) {
        setScrollProgress(progress);

        // Apply transformations based on scroll progress
        if (whiteOverlayRef.current) {
          const scale = progress * 15; // Scale from 0 to 15
          whiteOverlayRef.current.style.transform = `scale(${scale})`;
        }

        if (titleRef.current) {
          const opacity = Math.max(0, 1 - progress * 2);
          const translateY = progress * -50;
          titleRef.current.style.opacity = `${opacity}`;
          titleRef.current.style.transform = `translateY(${translateY}px)`;
        }

        if (ctaRef.current) {
          const opacity = Math.max(0, 1 - progress * 2);
          const translateY = progress * -30;
          ctaRef.current.style.opacity = `${opacity}`;
          ctaRef.current.style.transform = `translateY(${translateY}px)`;
        }

        if (videoRef.current) {
          const scale = 1 - progress * 0.3; // Scale from 1 to 0.7
          const translateY = progress * 100;
          videoRef.current.style.transform = `scale(${scale}) translateY(${translateY}px) translate3d(0,0,0)`;
        }
      }

      lastScrollY = scrollY;
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateAnimations);
        ticking = true;
      }
    };

    const handleScroll = () => {
      requestTick();
    };

    // Use Intersection Observer for efficient scroll detection
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.addEventListener("scroll", handleScroll, { passive: true });
          } else {
            window.removeEventListener("scroll", handleScroll);
          }
        });
      },
      { threshold: [0, 0.1, 0.5, 0.9, 1] }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [hasTriggered, isAnimating]);

  return (
    <div ref={containerRef} className="relative">
      {/* Hero Section */}
      <div
        ref={heroRef}
        className="relative min-h-screen overflow-hidden"
        style={{
          background: hasTriggered
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : "white",
          transition: "background 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* White Overlay for Expansion Effect */}
        <div
          ref={whiteOverlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "white",
            borderRadius: "50%",
            transform: "scale(0)",
            transformOrigin: "50% 50%",
            transition: hasTriggered
              ? "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              : "none",
            willChange: "transform",
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          {/* Title Section */}
          <div
            ref={titleRef}
            className="text-center mb-8"
            style={{
              transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform, opacity",
            }}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm py-2 px-4 rounded-full">
                <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  V2 is Live!
                </span>
                <span className="text-white text-sm font-medium">Watch the video</span>
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-white">
              <span className="relative inline-block px-3 py-2 border-2 border-dashed border-white/60 rounded">
                Screenshot
              </span>
              <span className="block mt-2">to Demo Video — in seconds</span>
            </h1>
            <p className="text-xl text-white/90">
              Bazaar is an AI video generator for creating software demo videos.
            </p>
          </div>

          {/* CTA Button */}
          <div
            ref={ctaRef}
            className="mb-12"
            style={{
              transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform, opacity",
            }}
          >
            <button className="bg-white text-purple-700 px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-xl">
              Start Creating Now
            </button>
            <p className="text-white/80 text-sm mt-2 text-center">
              No credit card required
            </p>
          </div>

          {/* Main Video */}
          <div
            ref={videoRef}
            className="w-full max-w-5xl"
            style={{
              transition: hasTriggered
                ? "transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                : "none",
              willChange: "transform",
              transform: "translate3d(0,0,0)",
            }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-black/10">
              <MarketingVideoPlayer />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        {!hasTriggered && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="flex flex-col items-center text-white/60">
              <span className="text-sm mb-2">Scroll to explore</span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Rest of Page Content */}
      <div className="relative bg-white">{children}</div>
    </div>
  );
}