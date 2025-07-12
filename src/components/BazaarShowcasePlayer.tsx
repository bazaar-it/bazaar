"use client";
import { useState } from "react";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";

interface BazaarShowcasePlayerProps {
  className?: string;
}

export default function BazaarShowcasePlayer({ className }: BazaarShowcasePlayerProps) {
  // Example video data - replace with actual videos later
  const showcaseVideos = [
    {
      id: 1,
      title: "SaaS Dashboard Demo",
      description: "Modern dashboard interface with smooth animations",
      // Using existing video for now
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations/aiCoding.mp4"
    },
    {
      id: 2,
      title: "Mobile App Showcase",
      description: "iOS app interface with interactive elements",
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations/Prompt%20input.mp4"
    },
    {
      id: 3,
      title: "E-commerce Product Demo",
      description: "Product showcase with cart animations",
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations/firework.mp4"
    }
  ];

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentVideoIndex((prev) => 
      prev === 0 ? showcaseVideos.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentVideoIndex((prev) => 
      prev === showcaseVideos.length - 1 ? 0 : prev + 1
    );
  };

  const currentVideo = showcaseVideos[currentVideoIndex];

  if (!currentVideo) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Video Player Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          className="absolute left-8 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Previous video"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-700"
          >
            <path 
              d="M15 18L9 12L15 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={goToNext}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Next video"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-700"
          >
            <path 
              d="M9 18L15 12L9 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Video Player */}
        <div className="w-full">
          <MarketingVideoPlayer key={currentVideo.id} />
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {showcaseVideos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentVideoIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentVideoIndex 
                ? 'bg-gray-800' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to video ${index + 1}`}
          />
        ))}
      </div>

      {/* Video Counter */}
      <div className="text-center mt-2 text-gray-600">
        <span className="text-sm">
          {currentVideoIndex + 1} of {showcaseVideos.length}
        </span>
      </div>
    </div>
  );
} 