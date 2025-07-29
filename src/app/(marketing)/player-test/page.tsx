"use client";
import React from "react";
import { Player } from '@remotion/player';
import { AirbnbComposition } from "~/components/AirbnbVideoPlayerProper";

export default function PlayerTestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '400px',
        height: '600px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Player Test</h1>
        <div style={{ width: '100%', height: '500px', backgroundColor: '#000' }}>
          <Player
            component={AirbnbComposition}
            durationInFrames={600}
            compositionWidth={390}
            compositionHeight={844}
            fps={30}
            controls={true}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
} 