"use client";
import React, { useEffect, useRef, useState } from 'react';

const HomePageTextAnimation: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mobile detection for responsive aspect ratio like MarketingComponentPlayer
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Optimized animation for mobile - lower FPS and total duration
    const targetFPS = 20; // Reduced from 30fps
    const frameInterval = 1000 / targetFPS;
    let lastTimestamp = 0;
    
    // Total duration: 90 frames animation + 30 frames pause = 120 frames (6 seconds at 20fps)
    const totalDuration = 120; // frames
    
    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      const deltaTime = timestamp - lastTimestamp;
      
      if (deltaTime >= frameInterval) {
        setCurrentFrame(prev => {
          const next = prev + 1;
          // Complete cycle: 90 frames animation + 30 frames pause = 120 total frames
          if (next >= totalDuration) {
            return 0; // Reset to start
          }
          return next;
        });
        lastTimestamp = timestamp;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // No more scaling - CSS handles responsiveness

  // Simplified interpolation function for mobile
  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    const progress = (frame - inputMin) / (inputMax - inputMin);
    return outputMin + progress * (outputMax - outputMin);
  };

  // Simple icon component with minimal SVG
  const SimpleIcon: React.FC<{ type: 'image' | 'mic' | 'send' }> = ({ type }) => {
    const getIconSVG = (iconType: string) => {
      switch (iconType) {
        case 'image':
          return (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
              <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21H5Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13l-3 4Z" fill="currentColor"/>
            </svg>
          );
        case 'mic':
          return (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
              <path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325Q5 13.625 5 11h2q0 2.075 1.463 3.537Q9.925 16 12 16t3.538-1.463Q17 13.075 17 11h2q0 2.625-1.7 4.6Q15.6 17.575 13 17.925V21h-2Z" fill="currentColor"/>
            </svg>
          );
        case 'send':
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
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {getIconSVG(type)}
      </div>
    );
  };

  const MobileTextAnimation: React.FC = () => {
    const frame = currentFrame;
    
    // Original text from MarketingVideoPlayer
    const text = "Create a demo video of the AirBnB app using these screenshots.";
    
    // Mobile-optimized typewriter animation - longer but smooth
    const startFrame = 3;
    const endFrame = 60; // Adjusted duration
    const totalFrames = endFrame - startFrame;
    const totalChars = text.length;
    
    let charCount = 0;
    if (frame >= startFrame && frame < endFrame) {
      const progress = (frame - startFrame) / totalFrames;
      charCount = Math.min(Math.floor(progress * totalChars), totalChars);
    } else if (frame >= endFrame) {
      charCount = totalChars;
    }

    // Icons fade in
    const iconProgress = interpolate(
      frame,
      [0, 20],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Cursor animation - mobile optimized drag/drop
    const animationWord = "screenshots";
    const animationIndex = text.toLowerCase().indexOf(animationWord);
    const animationEndIndex = animationIndex === -1 ? Math.floor(totalChars * 0.8) : animationIndex + animationWord.length;
    const frameAtAnimation = startFrame + Math.floor((animationEndIndex / totalChars) * totalFrames);
    const cursorStartFrame = frameAtAnimation;
    const cursorEndFrame = cursorStartFrame + 25; // Faster for mobile
    
    const cursorProgress = interpolate(
      frame,
      [cursorStartFrame, cursorEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Simplified positioning for aspect ratio container
    
    // Drag animation coordinates - simplified for aspect ratio container
    const startX = typeof window !== 'undefined' ? window.innerWidth + 50 : 818; // Start outside viewport
    const endX = typeof window !== 'undefined' ? (window.innerWidth * 0.4) : 300; // End position
    const startY = 100; // Fixed position
    const endY = 100;
    
    const cursorX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const cursorY = startY;

    // Image drop logic
    const dropFrame = cursorEndFrame;
    const dropCompleteFrame = dropFrame + 15; // Faster drop for mobile
    const imageDropped = frame >= dropFrame;
    const isDragging = frame >= cursorStartFrame && frame < dropFrame;
    
    const imageOpacity = imageDropped ? 
      interpolate(
        frame,
        [dropFrame, dropCompleteFrame],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ) : 0;

    // Dynamic height calculation - expand when images are dropped
    const baseHeight = 320;
    const imageAreaHeight = imageDropped ? 150 : 0; // Increased extra height for images
    
    // Smooth height transition
    const heightProgress = imageDropped ? 
      interpolate(
        frame,
        [dropFrame, dropCompleteFrame],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ) : 0;
    
    const boxHeight = baseHeight + (imageAreaHeight * heightProgress);

    // Background color change when dragging over drop zone
    const isOverDropZone = frame >= cursorStartFrame && frame < dropFrame && cursorProgress > 0.3;
    const boxBackground = isOverDropZone ? "#E3F2FD" : "#F5F5F5";

    // Image URLs
    const imageUrls = [
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/Browse.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/reviews.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/listing.png"
    ];

    return (
      <div style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        minHeight: "200px"
      }}>
        <div
          className="homepage-text-animation-container"
          style={{
            width: "100%",
            maxWidth: "800px", // Match MarketingComponentPlayer exactly
            height: `${boxHeight * 0.5}px`, // Scaled down like MarketingComponentPlayer, now dynamic
            background: boxBackground,
            borderRadius: "25px", // Match MarketingComponentPlayer
            paddingBottom: "20px", // Minimal bottom padding
            position: "relative",
            transition: "height 0.4s ease, background-color 0.3s ease", // Smooth transitions for height and background
            margin: "0 auto", // Center the container like MarketingComponentPlayer
            boxShadow: "none" // Removed shadow like MarketingComponentPlayer
          }}
        >
          {/* Dropped image previews */}
          {imageDropped && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "12px",
                opacity: imageOpacity,
                zIndex: 3,
                alignItems: "flex-end",
                justifyContent: "flex-start"
              }}
            >
              {imageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Preview ${index + 1}`}
                  style={{
                    height: "50px",
                    width: "auto",
                    borderRadius: "8px",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    objectFit: "contain"
                  }}
                />
              ))}
            </div>
          )}

          {/* Dragging images with cursor */}
          {isDragging && (
            <div
              style={{
                position: "absolute",
                left: `${cursorX}px`,
                top: `${cursorY}px`,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
                display: "flex",
                gap: "12px",
                pointerEvents: "none"
              }}
            >
              {imageUrls.map((url, index) => (
                <div key={index} style={{ position: "relative", display: "inline-block" }}>
                  <img
                    src={url}
                    alt={`Dragged ${index + 1}`}
                    style={{
                      height: "40px",
                      width: "auto",
                      borderRadius: "8px",
                      background: "#fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      objectFit: "contain"
                    }}
                  />
                  {/* Cursor pointer on the last image */}
                  {index === imageUrls.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-4px",
                        right: "-4px",
                        color: "#333",
                        fontSize: "16px",
                        zIndex: 25,
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                        transform: "rotate(-15deg)"
                      }}
                    >
                      <div style={{ 
                        width: '1em', 
                        height: '1em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
                          <path d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86c-.32-.31-.85-.1-.85.35z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text input area */}
          <div 
            className="homepage-text-animation-text"
            style={{ 
              flex: 1,
              color: "#333",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "400",
              lineHeight: "1.4",
              marginBottom: "30px", // Further increased margin to accommodate image space
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              wordWrap: "break-word",
              whiteSpace: "normal",
              maxHeight: "150px", // Limit height to prevent overlap
              paddingTop: imageDropped ? "10px" : "0px", // Reduced padding when images are present
              transition: "padding-top 0.3s ease" // Smooth transition
            }}>
            {text.slice(0, charCount)}
          </div>

          {/* Left-aligned icons - visible from beginning */}
          <div
            style={{
              position: "absolute",
              bottom: "10px", // Lowered to align with submit button
              left: "24px", // Aligned with submit button positioning
              display: "flex",
              gap: "16px", // Scaled down from 32px
              alignItems: "center",
              opacity: iconProgress,
              zIndex: 2,
            }}
          >
            <div className="homepage-text-animation-icon" style={{ color: "#666666", cursor: "pointer" }}>
              <SimpleIcon type="image" />
            </div>
            <div className="homepage-text-animation-icon" style={{ color: "#666666", cursor: "pointer" }}>
              <SimpleIcon type="mic" />
            </div>
          </div>
          
          {/* Right-aligned send button - visible from beginning */}
          <div
            style={{
              position: "absolute",
              bottom: "12px", // Further reduced bottom gap
              right: "24px", // Scaled down from 48px
              opacity: iconProgress,
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#333333",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <div 
                className="homepage-text-animation-send-icon" 
                style={{ 
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%"
                }}
              >
                <SimpleIcon type="send" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Using aspect ratio like MarketingComponentPlayer - no fixed height calculations needed

  return (
    <div ref={containerRef}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .homepage-text-animation-text {
            font-size: 28px;
          }
          
          .homepage-text-animation-icon {
            font-size: 36px;
          }
          
          .homepage-text-animation-send-icon {
            font-size: 25px;
          }
          
          .homepage-text-animation-container {
            padding: 24px !important;
          }
          
          @media (max-width: 768px) {
            .homepage-text-animation-text {
              font-size: 18px !important;
            }
            
            .homepage-text-animation-icon {
              font-size: 24px !important;
            }
            
            .homepage-text-animation-send-icon {
              font-size: 25px !important;
            }
            
            .homepage-text-animation-container {
              padding: 16px !important;
            }
          }
        `
      }} />
      <div style={{
        width: '100%',
        aspectRatio: isMobile ? '1.6/1' : '3/1', // Match MarketingComponentPlayer exactly
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'none',
        position: 'relative'
      }}>
        <MobileTextAnimation />
      </div>
    </div>
  );
};

export default React.memo(HomePageTextAnimation);
