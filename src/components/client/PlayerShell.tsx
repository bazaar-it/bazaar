// src/components/client/PlayerShell.tsx
"use client";

import React from 'react';
import { Player } from '@remotion/player';
import { Main } from '~/remotion/MyComp/Main';
export function PlayerShell() {
  return (
    <div className="flex flex-col h-full bg-gray-200">
      <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
      
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Player
          component={Main}
          durationInFrames={150}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          inputProps={{ title: "Bazaar-Vid" }}
          style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
          controls
        />
      </div>
    </div>
  );
} 