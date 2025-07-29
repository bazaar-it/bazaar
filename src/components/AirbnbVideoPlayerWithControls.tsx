"use client";
import React from 'react';
import { Player } from '@remotion/player';
import { AirbnbComposition } from './AirbnbVideoPlayerProper';

// Player wrapper component with controls and transparent background
export default function AirbnbVideoPlayerWithControls() {
  React.useEffect(() => {
    const applyStyles = () => {
      // Add hover-specific styles to remove dark overlay on hover
      const style = document.createElement('style');
      style.setAttribute('data-component', 'airbnb-video-player-hover-override');
      style.textContent = `
        /* Remove all hover effects and dark overlays */
        .remotion-player:hover,
        .remotion-player:hover *,
        .remotion-player:hover div,
        .remotion-player:hover canvas,
        .remotion-player:hover::before,
        .remotion-player:hover::after,
        .remotion-player:hover *::before,
        .remotion-player:hover *::after {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
        
        /* Target hover state controls specifically */
        .remotion-player:hover .remotion-player-controls,
        .remotion-player:hover .remotion-player-controls-overlay,
        .remotion-player:hover [data-testid="player-controls"],
        .remotion-player:hover [class*="control"],
        .remotion-player:hover [class*="overlay"],
        .remotion-player:hover [class*="backdrop"] {
          background: rgba(255, 255, 255, 0.1) !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Remove any dark hover overlays */
        .remotion-player:hover [style*="rgba(0,0,0"],
        .remotion-player:hover [style*="rgb(0,0,0"],
        .remotion-player:hover [style*="background: black"],
        .remotion-player:hover [style*="background-color: black"] {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Ultra-aggressive targeting of all elements (non-hover) */
        .remotion-player,
        .remotion-player *,
        .remotion-player div,
        .remotion-player canvas,
        .remotion-player::before,
        .remotion-player::after,
        .remotion-player *::before,
        .remotion-player *::after {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
        
        /* Target all possible control and overlay elements with max specificity */
        .remotion-player .remotion-player-controls,
        .remotion-player .remotion-player-controls-overlay,
        .remotion-player [data-testid="player-controls"],
        .remotion-player [class*="control"],
        .remotion-player [class*="overlay"],
        .remotion-player [class*="backdrop"],
        .remotion-player > div,
        .remotion-player > div > div {
          background: transparent !important;
          background-color: transparent !important;
          backdrop-filter: none !important;
          border: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }
        
        /* Target any element with inline styles that could add dark backgrounds */
        .remotion-player [style*="background"],
        .remotion-player [style*="rgba(0,0,0"],
        .remotion-player [style*="rgb(0,0,0"],
        .remotion-player [style*="black"],
        .remotion-player [style*="linear-gradient"],
        .remotion-player [style*="radial-gradient"] {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
        
        /* Remove any possible overlays with absolute positioning */
        .remotion-player [style*="position: absolute"],
        .remotion-player [style*="position:absolute"] {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Target the specific container holding the video player */
        .transparent-player,
        .transparent-player *,
        .transparent-player:hover,
        .transparent-player:hover * {
          background: transparent !important;
          background-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
      
      return style;
    };

    // Apply immediately
    const style1 = applyStyles();
    
    // Apply again after a delay to override any late-loading Remotion styles
    const timeout = setTimeout(() => {
      applyStyles();
    }, 100);

    return () => {
      if (style1.parentNode) {
        style1.parentNode.removeChild(style1);
      }
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="w-full h-full" style={{ background: 'transparent' }}>
      <Player
        component={AirbnbComposition}
        durationInFrames={660} // 22 seconds at 30fps
        compositionWidth={390}
        compositionHeight={844}
        fps={30}
        loop
        autoPlay={false}
        controls={true}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
          borderRadius: '0px',
          overflow: 'visible',
          boxShadow: 'none',
        }}
        className="transparent-player"
        clickToPlay={true}
        doubleClickToFullscreen={true}
        showVolumeControls={false}
        allowFullscreen={true}
        spaceKeyToPlayOrPause={true}
        numberOfSharedAudioTags={0}
      />
    </div>
  );
} 