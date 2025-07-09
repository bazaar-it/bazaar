"use client";
import React, { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  opacity: number;
}

// Add IconifyIcon interface for TypeScript
interface IconifyIconProps {
  icon: string;
  style?: React.CSSProperties;
}

const RemotionVideoPlayerFixed: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 300); // Loop every 300 frames (10 seconds at 30fps)
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Simple icon component with SVG fallbacks
  const IconifyIcon: React.FC<IconifyIconProps> = ({ icon, style }) => {
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
        case 'tabler:pointer':
          return (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
              <path d="M7.904 17.563a1.2 1.2 0 0 0 2.228.308l2.09-3.093l4.907 4.907a1.067 1.067 0 0 0 1.509 0l1.047-1.047a1.067 1.067 0 0 0 0-1.509l-4.907-4.907l3.113-2.09a1.2 1.2 0 0 0-.309-2.228L4 4l3.904 13.563Z" stroke="currentColor" strokeWidth="2" fill="none"/>
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

  const SearchBar: React.FC<SearchBarProps> = ({ opacity }) => {
    const frame = currentFrame;
    const width = 1920;
    const height = 1080;
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      
      if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
      if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
      
      const progress = (frame - inputMin) / (inputMax - inputMin);
      return outputMin + progress * (outputMax - outputMin);
    };
    
    const text = "Create a demo video of my app using the attached screenshots";
    const charCount = Math.floor(
      interpolate(
        frame,
        [30, 120], // Slower animation - extended from 90 to 120
        [0, text.length],
        { extrapolateLeft: "clamp" }
      )
    );
    
    const cursorVisible = Math.floor(frame / 15) % 2 === 0;

    // Icons visible from the beginning
    const iconProgress = 1;

    // Cursor animation - slower timing
    const cursorStartFrame = 130; // Start later
    const cursorEndFrame = 200; // End later for slower movement
    const cursorProgress = interpolate(
      frame,
      [cursorStartFrame, cursorEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Natural arc path for cursor - add 20px padding to calculations
    const paddingOffset = 20;
    const startX = width + 100;
    const searchBarLeft = (width - 1600) / 2 + paddingOffset; // Add padding offset
    const endX = searchBarLeft + 48 - 20;
    const startY = height / 2 - 200;
    const endY = height / 2 + (320 / 2) - 40 - 30;
    const arcHeight = -160;

    const cursorX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const cursorY = interpolate(cursorProgress, [0, 1], [startY, endY]) + 
      Math.sin(cursorProgress * Math.PI) * arcHeight;

    // Image drop animation - slower timing
    const dropFrame = 200; // Match the cursor end frame for slower timing
    const imageDropped = frame >= dropFrame;
    
    // Remove spring animation for image stability - use simple opacity transition
    const imageOpacity = imageDropped ? 1 : 0;
    
    // Calculate dynamic box height based on content
    const baseHeight = 320;
    const imageHeight = imageDropped ? 64 + 20 : 0; // Image height (64px) + gap (20px)
    const boxHeight = baseHeight + imageHeight;

    // Check if image is over the drop zone - adjust for padding
    const searchBarTop = height / 2 - 160;
    const searchBarBottom = height / 2 + 160;
    const searchBarRight = searchBarLeft + 1600 - (paddingOffset * 2); // Account for both sides
    
    const isOverDropZone = frame >= cursorStartFrame && frame < dropFrame &&
      cursorX >= searchBarLeft && cursorX <= searchBarRight &&
      cursorY >= searchBarTop && cursorY <= searchBarBottom;
      
    const boxBackground = isOverDropZone ? "#E3F2FD" : "#F5F5F5";

    // Image URLs
    const imageUrls = [
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/Browse.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/reviews.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/listing.png"
    ];

    return (
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px' // Add 20px padding around the entire container
      }}>
        <div
          style={{
            width: "800px", // Scaled down for web
            height: `${boxHeight * 0.5}px`, // Scaled down with dynamic height
            background: boxBackground,
            borderRadius: "25px",
            padding: "24px",
            opacity,
            boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
            position: "relative",
            transition: "height 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: "32px", // Scaled down
              fontFamily: "Inter, sans-serif",
              color: "#000000",
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
              zIndex: 1,
              position: "relative",
              flexWrap: "wrap",
            }}
          >
            {text.slice(0, charCount)}
            {cursorVisible && (
              <span
                style={{
                  width: "3px",
                  height: "24px",
                  background: "#000000",
                  display: "inline-block",
                }}
              />
            )}
          </div>
          
          {/* Image previews when dropped - now showing 3 images in a row, aligned to top */}
          {imageDropped && (
            <div
              style={{
                display: "flex",
                gap: "8px", // Reduced gap
                marginTop: "0px", // Align to top instead of negative margin
                marginBottom: "16px", // Reduced bottom margin
                opacity: imageOpacity, // Use simple opacity instead of spring animation
                zIndex: 3,
                position: "relative",
                alignItems: "flex-start", // Ensure top alignment
              }}
            >
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  style={{
                    width: "64px", // 20% smaller (was 80px, now 64px)
                    borderRadius: "15px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    flexShrink: 0, // Prevent shrinking
                  }}
                >
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "auto", // Maintain aspect ratio
                      display: "block",
                      objectFit: "cover", // Ensure proper scaling
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Left-aligned icons - using IconifyIcon */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "24px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
              opacity: iconProgress,
              zIndex: 2,
            }}
          >
            <IconifyIcon 
              icon="material-symbols:image-outline" 
              style={{ fontSize: "36px", color: "#666666", cursor: "pointer" }} 
            />
            <IconifyIcon 
              icon="material-symbols:mic-outline" 
              style={{ fontSize: "36px", color: "#666666", cursor: "pointer" }} 
            />
          </div>
          
          {/* Right-aligned send button - using IconifyIcon */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              right: "24px",
              opacity: iconProgress,
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
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
                style={{ fontSize: "30px", color: "#FFFFFF" }} 
              />
            </div>
          </div>
        </div>
        
        {/* Animated cursor - now dragging 3 images */}
        {frame >= cursorStartFrame && frame <= dropFrame && (
          <div
            style={{
              position: "absolute",
              left: `${(cursorX / width) * 100}%`,
              top: `${(cursorY / height) * 100}%`,
              pointerEvents: "none",
              zIndex: 1000,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Dragged images - 3 in a row */}
            <div
              style={{
                position: "absolute",
                top: "-50px",
                left: "-72px", // Adjusted for smaller images
                display: "flex",
                gap: "6px", // Reduced gap
                opacity: 0.8,
                zIndex: 1001,
              }}
            >
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  style={{
                    width: "48px", // 20% smaller (was 60px, now 48px)
                    borderRadius: "15px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                    flexShrink: 0, // Prevent shrinking
                  }}
                >
                  <img
                    src={url}
                    alt={`Dragged ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "auto", // Maintain aspect ratio
                      display: "block",
                      objectFit: "cover", // Ensure proper scaling
                    }}
                  />
                </div>
              ))}
            </div>
            <IconifyIcon 
              icon="tabler:pointer" 
              style={{ fontSize: "72px", color: "#333333" }} 
            />
          </div>
        )}
      </div>
    );
  };

  const PromptUI: React.FC = () => {
    const frame = currentFrame;
    
    const mainProgress = frame > 5 ? 
      Math.min(1, (frame - 5) / 30) : 0; // Simple easing

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
          minHeight: "500px",
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
        aspectRatio: '16/9',
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}
    >
      <PromptUI />
    </div>
  );
};

export default RemotionVideoPlayerFixed; 