"use client";
import React from 'react';
import { Player } from '@remotion/player';
import { AirbnbComposition } from './AirbnbVideoPlayerProper';

export function RemotionPlayer() {
  return (
    <div className="relative w-full aspect-[9/16] bg-white rounded-lg overflow-hidden shadow-lg">
      <Player
        component={AirbnbComposition}
        durationInFrames={600}
        fps={30}
        compositionWidth={390}
        compositionHeight={844}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls={false}
        autoPlay
        loop
      />
    </div>
  );
}