"use client";

import React from 'react';
import { Player } from '@remotion/player';
import { DemoTimeline } from '../../remotion/compositions/DemoTimeline';
import { defaultDemoProps } from '../../types/remotion-constants';

export default function RemotionDemoPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8">
      <h1 className="text-3xl font-bold mb-6">Remotion Demo Player</h1>
      <div className="w-full max-w-5xl border border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <Player
          component={DemoTimeline}
          inputProps={defaultDemoProps}
          durationInFrames={150}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          controls
          autoPlay
          loop
          style={{
            width: '100%',
          }}
        />
      </div>
      <div className="mt-6 text-lg">
        <p className="mb-2">This demo shows:</p>
        <ul className="list-disc list-inside">
          <li>A title card with fade-in animation</li>
          <li>Cross-fade transition to an image with scale animation</li>
          <li>Outro text with fade-in animation</li>
        </ul>
      </div>
    </div>
  );
} 