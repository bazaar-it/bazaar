"use client";
import React, { useEffect, useRef, useState } from 'react';

const MarketingComponentPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 360); // Extended to 360 frames (12 seconds) to accommodate longer text timing
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Remotion-like interpolation function for web
  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    const progress = (frame - inputMin) / (inputMax - inputMin);
    return outputMin + progress * (outputMax - outputMin);
  };

  // Spring animation helper
  const spring = (options: { frame: number; fps: number; config: { damping: number; stiffness: number } }) => {
    const { frame, config } = options;
    const { damping, stiffness } = config;
    
    if (frame <= 0) return 0;
    
    const dampingRatio = damping / (2 * Math.sqrt(stiffness));
    const angularFreq = Math.sqrt(stiffness);
    
    if (dampingRatio >= 1) {
      return 1 - Math.exp(-angularFreq * frame / 30) * (1 + angularFreq * frame / 30);
    } else {
      const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
      return 1 - Math.exp(-dampingRatio * angularFreq * frame / 30) * 
             Math.cos(dampedFreq * frame / 30);
    }
  };

  const SearchBar = ({ opacity }: { opacity: number }) => {
    const frame = currentFrame;
    const width = 1920;
    const height = 1080;
    
    const text = "Add, edit, trim or delete scenes - all with simple prompts";
    const charCount = Math.floor(
      interpolate(
        frame,
        [30, 120], // Slower animation - extended from 90 to 120
        [0, text.length],
        { extrapolateLeft: "clamp" }
      )
    );
    

    
    // Remove blinking cursor entirely
    const cursorVisible = false;

    // Icons visible from the beginning
    const iconProgress = 1; // Always visible

    const boxHeight = 320; // Fixed height, no longer resizes for image

    // Simple icon component with SVG fallbacks
    const IconifyIcon = ({ icon, style }: { icon: string; style?: React.CSSProperties }) => {
      const getIconSVG = (iconName: string) => {
        switch (iconName) {
          case 'material-symbols:image-outline':
            return (
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21H5Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13l-3 4Z" fill="currentColor"/>
              </svg>
            );
          case 'material-symbols:mic-outline':
            return (
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                <path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325Q5 13.625 5 11h2q0 2.075 1.463 3.537Q9.925 16 12 16t3.538-1.463Q17 13.075 17 11h2q0 2.625-1.7 4.6Q15.6 17.575 13 17.925V21h-2Z" fill="currentColor"/>
              </svg>
            );
          case 'material-symbols:send':
            return (
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                <path d="M3 20v-6l8-2-8-2V4l19 8-19 8Z" fill="currentColor"/>
              </svg>
            );
          default:
            return <div>?</div>;
        }
      };

      return (
        <div style={{ ...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {getIconSVG(icon)}
        </div>
      );
    };

    const searchBarLeft = (width - 1600) / 2; // Reduced by 360px (180px on each side)
    
    return (
      <>
        <div
          style={{
            width: "800px", // Scaled down for web (was 1600px)
            height: `${boxHeight * 0.5}px`, // Scaled down
            background: "#F5F5F5",
            borderRadius: "25px", // Scaled down from 50px
            padding: "24px", // Scaled down from 48px
            paddingBottom: "80px", // Extra bottom padding to prevent overlap with icons
            opacity,
            boxShadow: "none", // Removed shadow
            position: "relative",
            transition: "height 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: "28px", // Reduced from 32px to fit better
              fontFamily: "Inter, sans-serif",
              color: "#000000",
              opacity: 0.8,
              display: "flex",
              alignItems: "flex-start", // Changed to flex-start
              gap: "12px", // Scaled down from 24px
              marginBottom: "20px", // Scaled down from 40px
              zIndex: 1,
              position: "relative",
              flexWrap: "wrap",
              lineHeight: "1.3", // Better line spacing
              maxHeight: "120px", // Limit height to prevent overlap
              overflow: "hidden", // Hide overflow
            }}
          >
            {text.slice(0, charCount)}
          </div>
          
          {/* Left-aligned icons - visible from beginning */}
          <div
            style={{
              position: "absolute",
              bottom: "20px", // Scaled down from 40px
              left: "24px", // Scaled down from 48px
              display: "flex",
              gap: "16px", // Scaled down from 32px
              alignItems: "center",
              opacity: iconProgress,
              zIndex: 2,
            }}
          >
            <IconifyIcon
              icon="material-symbols:image-outline"
              style={{
                fontSize: "36px", // Scaled down from 72px
                color: "#666666",
                cursor: "pointer",
              }}
            />
            <IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: "36px", // Scaled down from 72px
                color: "#666666",
                cursor: "pointer",
              }}
            />
          </div>
          
          {/* Right-aligned send button - visible from beginning */}
          <div
            style={{
              position: "absolute",
              bottom: "20px", // Scaled down from 40px
              right: "24px", // Scaled down from 48px
              opacity: iconProgress,
            }}
          >
            <div
              style={{
                width: "60px", // Scaled down from 120px
                height: "60px", // Scaled down from 120px
                borderRadius: "50%",
                background: "#333333",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IconifyIcon
                icon="material-symbols:send"
                style={{
                  fontSize: "30px", // Scaled down from 60px
                  color: "#FFFFFF",
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  };

  const PromptUI = () => {
    const frame = currentFrame;
    
    // Remove spring animation for smoother looping
    const mainProgress = 1; // Always fully visible

    return (
      <div
        style={{
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          minHeight: "200px", // Further reduced to better fit the text input box
        }}
      >
        <SearchBar opacity={mainProgress} />
      </div>
    );
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        aspectRatio: '3/1', // Changed to an even more compact ratio
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'none', // Removed shadow
        position: 'relative'
      }}
    >
      <PromptUI />
    </div>
  );
};

export default MarketingComponentPlayer; 