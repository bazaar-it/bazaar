"use client";
import { useState } from "react";
import AirbnbVideoPlayer from "~/components/AirbnbVideoPlayerProper";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";

interface BazaarShowcasePlayerProps {
  className?: string;
}

export default function BazaarShowcasePlayer({ className }: BazaarShowcasePlayerProps) {
  // Video showcase data with different player types
  const showcaseVideos = [
    {
      id: 1,
      title: "Marketing Demo",
      description: "Professional marketing video showcase",
      type: "marketing",
      component: MarketingVideoPlayer
    },
    {
      id: 2,
      title: "Interactive Property Search",
      description: "Swipe through beautiful property listings",
      type: "airbnb",
      component: AirbnbVideoPlayer
    },
    {
      id: 3,
      title: "Interactive Demo",
      description: "Dynamic interactions and animations",
      type: "marketing",
      component: MarketingVideoPlayer
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
          {(() => {
            const VideoComponent = currentVideo.component;
            return <VideoComponent key={currentVideo.id} />;
          })()}
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

      {/* Video Info */}
      <div className="text-center mt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {currentVideo.title}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {currentVideo.description}
        </p>
        <div className="text-gray-500">
          <span className="text-sm">
            {currentVideoIndex + 1} of {showcaseVideos.length}
          </span>
        </div>
      </div>
    </div>
  );
} 