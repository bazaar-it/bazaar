"use client";
import React from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

// The actual Remotion composition
export const MarketingComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F5F5' }}>
      {/* Phone screens sequence */}
      <Sequence from={0} durationInFrames={fps * 10}>
        <PhoneScreensAnimation />
      </Sequence>
      
      {/* Search bar animation */}
      <Sequence from={fps * 2} durationInFrames={fps * 8}>
        <SearchBarAnimation />
      </Sequence>
    </AbsoluteFill>
  );
};

const PhoneScreensAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Smooth spring animations for phone entrance
  const phone1Spring = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 }
  });
  
  const phone2Spring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 100, stiffness: 200 }
  });
  
  const phone3Spring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 100, stiffness: 200 }
  });
  
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Phone 1 */}
        <div style={{
          width: 180,
          height: 380,
          backgroundColor: '#000',
          borderRadius: 30,
          padding: 8,
          transform: `translateY(${interpolate(phone1Spring, [0, 1], [100, 0])}px) scale(${interpolate(phone1Spring, [0, 1], [0.8, 1])})`,
          opacity: phone1Spring,
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            borderRadius: 22,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt="Screen 1"
            />
          </div>
        </div>
        
        {/* Phone 2 (center, bigger) */}
        <div style={{
          width: 220,
          height: 460,
          backgroundColor: '#000',
          borderRadius: 36,
          padding: 10,
          transform: `translateY(${interpolate(phone2Spring, [0, 1], [100, 0])}px) scale(${interpolate(phone2Spring, [0, 1], [0.8, 1])})`,
          opacity: phone2Spring,
          zIndex: 2,
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            borderRadius: 26,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}>
            <div style={{
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 10,
              opacity: interpolate(frame, [fps * 1, fps * 1.5], [0, 1], { extrapolateRight: 'clamp' })
            }}>
              4.97
            </div>
            <div style={{ 
              fontSize: 16, 
              color: '#666',
              opacity: interpolate(frame, [fps * 1.5, fps * 2], [0, 1], { extrapolateRight: 'clamp' })
            }}>
              Average Rating
            </div>
          </div>
        </div>
        
        {/* Phone 3 */}
        <div style={{
          width: 180,
          height: 380,
          backgroundColor: '#000',
          borderRadius: 30,
          padding: 8,
          transform: `translateY(${interpolate(phone3Spring, [0, 1], [100, 0])}px) scale(${interpolate(phone3Spring, [0, 1], [0.8, 1])})`,
          opacity: phone3Spring,
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            borderRadius: 22,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="https://images.unsplash.com/photo-1517292987719-0369a794ec0f?w=400"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt="Screen 3"
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SearchBarAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const searchBarScale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 400 }
  });
  
  const cursorBlink = frame % fps < fps / 2 ? 1 : 0;
  const textProgress = interpolate(frame, [fps * 0.5, fps * 3], [0, 1], { extrapolateRight: 'clamp' });
  const fullText = "Create a demo video of my app using the attached screenshots";
  const displayText = fullText.slice(0, Math.floor(textProgress * fullText.length));
  
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 700,
        height: 100,
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 24,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        transform: `scale(${searchBarScale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Search icon */}
        <div style={{ opacity: 0.5 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        
        {/* Typing text */}
        <div style={{ 
          fontSize: 18, 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          flex: 1,
        }}>
          {displayText}
          <span style={{ opacity: cursorBlink }}>|</span>
        </div>
        
        {/* Send button */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: interpolate(frame, [fps * 3, fps * 3.5], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `scale(${interpolate(frame, [fps * 3, fps * 3.5], [0.8, 1], { extrapolateRight: 'clamp' })})`,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M3 20v-6l8-2-8-2V4l19 8-19 8z" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Player wrapper component
export default function MarketingVideoPlayerRemotion() {
  return (
    <div className="w-full h-full">
      <Player
        component={MarketingComposition}
        durationInFrames={420} // 14 seconds at 30fps
        compositionWidth={1920}
        compositionHeight={600}
        fps={30}
        loop
        autoPlay
        controls={false}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}