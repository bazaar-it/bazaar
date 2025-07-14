"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Icon } from '@iconify/react';
import airbnbIcon from '@iconify-icons/logos/airbnb';

// Main component for the video player wrapper
export default function AirbnbVideoPlayer() {
  return (
    <div className="relative w-full h-full bg-white rounded-lg overflow-hidden shadow-lg">
      <div className="absolute inset-0">
        <AirbnbComposition />
      </div>
    </div>
  );
}

// The actual Remotion composition
export const AirbnbComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Scene transitions
  const isSearchScene = frame < fps * 7; // 0-7 seconds
  const isDetailsScene = frame >= fps * 7 && frame < fps * 14; // 7-14 seconds
  const isBookingScene = frame >= fps * 14; // 14-20 seconds
  
  return (
    <AbsoluteFill className="bg-white">
      {/* Phone frame */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[390px] h-[844px] bg-black rounded-[40px] p-2 shadow-2xl">
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[19px] z-50" />
            
            {/* Animated scenes */}
            {isSearchScene && <SearchScene frame={frame} fps={fps} />}
            {isDetailsScene && <DetailsScene frame={frame - fps * 7} fps={fps} />}
            {isBookingScene && <BookingScene frame={frame - fps * 14} fps={fps} />}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Search Scene Component
const SearchScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 }
  });
  
  const headerOpacity = interpolate(frame, [0, fps * 0.5], [0, 1]);
  const searchScale = interpolate(frame, [fps * 0.5, fps * 1], [0.95, 1]);
  const listOpacity = interpolate(frame, [fps * 1, fps * 1.5], [0, 1]);
  
  return (
    <AbsoluteFill className="bg-white">
      {/* Header */}
      <div 
        className="h-16 px-6 flex items-center justify-between"
        style={{ opacity: headerOpacity }}
      >
        <Icon icon={airbnbIcon} className="w-8 h-8 text-[#FF385C]" />
        <div className="flex gap-4">
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div 
        className="mx-6 mt-4 p-4 bg-gray-100 rounded-2xl shadow-sm"
        style={{ transform: `scale(${searchScale})` }}
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Where to?"
            className="flex-1 bg-transparent outline-none text-lg"
            value={frame > fps * 2 ? "Les Gets, France" : ""}
            readOnly
          />
        </div>
      </div>
      
      {/* Search Results */}
      <div 
        className="mt-6 px-6"
        style={{ opacity: listOpacity }}
      >
        <h3 className="text-lg font-semibold mb-4">Recent searches</h3>
        <div className="space-y-4">
          {['Les Gets, France', 'Chamonix, France', 'Zermatt, Switzerland'].map((location, index) => (
            <div 
              key={location} 
              className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg"
              style={{
                opacity: interpolate(
                  frame,
                  [fps * (1.5 + index * 0.2), fps * (1.8 + index * 0.2)],
                  [0, 1]
                )
              }}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="font-medium">{location}</div>
                <div className="text-sm text-gray-500">Any week • Add guests</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Details Scene Component
const DetailsScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const scrollY = interpolate(frame, [0, fps * 3], [0, -200], {
    extrapolateRight: 'clamp'
  });
  
  const imageScale = interpolate(frame, [0, fps * 0.5], [0.9, 1]);
  const contentOpacity = interpolate(frame, [fps * 0.5, fps * 1], [0, 1]);
  
  return (
    <AbsoluteFill className="bg-white">
      <div style={{ transform: `translateY(${scrollY}px)` }}>
        {/* Hero Image */}
        <div 
          className="h-96 bg-gradient-to-b from-gray-200 to-gray-300 relative"
          style={{ transform: `scale(${imageScale})` }}
        >
          <img 
            src="https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800"
            alt="Apartment"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-medium">
            1 / 12
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="p-6"
          style={{ opacity: contentOpacity }}
        >
          <h1 className="text-2xl font-bold mb-2">
            Apartment Les Gets, 1 bedroom, 4 pers.
          </h1>
          <div className="text-gray-600 mb-4">Les Gets, Auvergne-Rhône-Alpes, France</div>
          
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-1">
              <span className="text-lg font-semibold">4.97</span>
              <span className="text-yellow-500">★</span>
            </div>
            <div className="text-gray-600">156 reviews</div>
            <div className="flex items-center gap-1 text-red-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="text-sm">Superhost</span>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gray-300 rounded-full" />
              <div>
                <div className="font-semibold text-lg">Hosted by Jessica</div>
                <div className="text-gray-600">Superhost • 2 years hosting</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Booking Scene Component
const BookingScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1]);
  const buttonScale = spring({
    frame: frame - fps * 2,
    fps,
    config: { damping: 100, stiffness: 400 }
  });
  
  return (
    <AbsoluteFill className="bg-white">
      <div className="h-full flex flex-col" style={{ opacity: fadeIn }}>
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold text-center">Review and pay</h1>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Property Card */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="w-20 h-20 bg-gray-300 rounded-lg" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Apartment Les Gets</h3>
              <div className="text-sm text-gray-600">1 bedroom • 4 guests</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm font-medium">4.97</span>
                <span className="text-yellow-500 text-sm">★</span>
                <span className="text-sm text-gray-600">(156 reviews)</span>
              </div>
            </div>
          </div>
          
          {/* Trip Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Trip details</h3>
            <div className="space-y-2 text-gray-700">
              <div>Jul 18 – 28, 2025</div>
              <div>4 guests</div>
            </div>
          </div>
          
          {/* Price */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Total price</h3>
            <div className="text-2xl font-bold">€962.00</div>
            <div className="text-sm text-gray-600 mt-1">Including taxes and fees</div>
          </div>
        </div>
        
        {/* Bottom Button */}
        <div className="px-6 pb-8 pt-4 border-t">
          <button 
            className="w-full bg-gradient-to-r from-[#FF385C] to-[#DD1162] text-white py-4 rounded-xl font-semibold text-lg shadow-lg"
            style={{ transform: `scale(${buttonScale})` }}
          >
            Confirm and pay
          </button>
        </div>
      </div>
    </AbsoluteFill>
  );
};