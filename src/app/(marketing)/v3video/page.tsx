"use client";
import React from "react";
import PortraitVideoPlayer from "~/components/PortraitVideoPlayer";
import { AirbnbComposition } from "~/components/AirbnbVideoPlayerProper";

export default function V3VideoPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '32px'
    }}>
      <div style={{
        width: '420px',
        height: '700px',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '15px', color: '#333' }}>V3 Video Player</h2>
        <div style={{ 
          flex: 1,
          backgroundColor: '#000',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <PortraitVideoPlayer
            composition={AirbnbComposition}
            durationInFrames={600}
            fps={30}
            controls={true}
            autoPlay={false}
            loop={false}
          />
        </div>
      </div>
    </div>
  );
} 