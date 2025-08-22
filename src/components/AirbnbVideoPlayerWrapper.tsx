"use client";
import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import airbnbIcon from '@iconify-icons/logos/airbnb';
import dynamic from 'next/dynamic';

// Dynamically import the Player component with no SSR
const DynamicPlayer = dynamic(
  () => import('./RemotionPlayer').then(mod => mod.RemotionPlayer),
  { 
    ssr: false,
    loading: () => <LoadingState />
  }
);

function LoadingState() {
  return (
    <div className="relative w-full aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[195px] h-[422px] bg-black rounded-[20px] p-1 shadow-xl">
          <div className="w-full h-full bg-white rounded-[16px] overflow-hidden relative">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[63px] h-[19px] bg-black rounded-[10px] z-50" />
            <div className="pt-12 px-4">
              <Icon icon={airbnbIcon} className="w-8 h-8 text-[#FF5A5F] mb-4" />
              <div className="text-sm font-semibold mb-2">Find your perfect stay</div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 bg-[#FF5A5F] rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AirbnbVideoPlayerWrapper() {
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    // Only show player when Remotion is available
    if (typeof window !== 'undefined' && window.Remotion) {
      setShowPlayer(true);
    }
  }, []);

  if (!showPlayer) {
    return <LoadingState />;
  }

  return <DynamicPlayer />;
}