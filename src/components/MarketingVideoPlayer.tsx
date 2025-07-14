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

const MarketingVideoPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTimestamp = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastTimestamp >= frameInterval) {
        setCurrentFrame(prev => (prev + 1) % 420); // Set to 420 frames (14 seconds at 30fps) - 4 second pause after animation completes
        lastTimestamp = timestamp;
      }
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
        case 'cursor-pointer':
          return (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none">
              <path d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86c-.32-.31-.85-.1-.85.35z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
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
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string; easing?: string }) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      
      if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
      if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
      
      let progress = (frame - inputMin) / (inputMax - inputMin);
      
      // Apply easing if specified
      if (options?.easing === "easeInOut") {
        progress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      } else if (options?.easing === "easeOut") {
        progress = 1 - Math.pow(1 - progress, 3);
      }
      
      return outputMin + progress * (outputMax - outputMin);
    };
    
    const text = "Create a demo video of my app";
    
    // Perfectly consistent typewriter - map each frame to exact character
    const startFrame = 40;
    const endFrame = 160;
    const totalFrames = endFrame - startFrame; // 120 frames
    const totalChars = text.length; // 29 characters
    
    let charCount = 0;
    if (frame >= startFrame && frame < endFrame) {
      // Use precise linear interpolation for consistent timing
      const progress = (frame - startFrame) / totalFrames;
      charCount = Math.min(Math.floor(progress * totalChars), totalChars - 1);
    } else if (frame >= endFrame) {
      charCount = totalChars;
    }
    
    // More realistic cursor blinking - faster blink while typing, slower when done
    const isTyping = frame >= 40 && frame <= 160;
    const blinkSpeed = isTyping ? 15 : 25; // Faster blink while typing
    const cursorVisible = Math.floor(frame / blinkSpeed) % 2 === 0;

    // Icons fade in smoothly at the start
    const iconProgress = interpolate(
      frame,
      [0, 30],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    // Cursor animation - coordinated with text timing
    const cursorStartFrame = 170; // Start after text completes
    const cursorEndFrame = 280; // Smoother timing for drag animation
    const cursorProgress = interpolate(
      frame,
      [cursorStartFrame, cursorEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeInOut" }
    );

    // Natural arc path for cursor - enters from right side and crosses 75% of screen
    const containerWidth = 700; // Current search bar width
    const containerHeight = 190; // Updated to match new baseHeight
    const screenWidth = 1200; // Approximate visible screen width
    const startX = screenWidth; // Start from right edge of screen
    const endX = screenWidth * 0.25; // End at 25% from left (75% across screen)
    const startY = containerHeight * 0.2; // Start at 20% down in container
    const endY = containerHeight * 0.4; // Land at 40% down in container (text area)
    const arcHeight = -60; // Gentle arc for realistic drag

    const cursorX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const cursorY = interpolate(cursorProgress, [0, 1], [startY, endY]) + 
      Math.sin(cursorProgress * Math.PI) * arcHeight;

    // Image drop animation - coordinated with cursor end
    const dropFrame = 280; // Start image drop when cursor ends
    const dropCompleteFrame = 300; // Drop animation completes 20 frames after start
    const imageDropped = frame >= dropFrame;
    const dropInProgress = frame >= dropFrame && frame < dropCompleteFrame;
    
    // Smoother image appearance with drop animation
    const imageOpacity = imageDropped ? 
      interpolate(
        frame,
        [dropFrame, dropCompleteFrame],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
      ) : 0;
    
    // Calculate dynamic box height based on content with proper spacing
    const baseHeight = imageDropped ? 220 : 190; // Increased for better initial visibility
    const imageAreaHeight = imageDropped ? 120 : 0; // Space for images when dropped
    const boxHeight = baseHeight + imageAreaHeight;
    
    // Keep consistent image size throughout
    const imageHeight = 80;

    // Check if image is over the drop zone - updated for new coordinate system
    const searchBarLeft = 200; // Left edge of search bar in screen coordinates
    const searchBarTop = 0; // Top of search bar in container coordinates  
    const searchBarBottom = 190; // Bottom of search bar (matches new height)
    const searchBarRight = 900; // Right edge of search bar in screen coordinates
    
    const isOverDropZone = frame >= cursorStartFrame && frame < dropFrame &&
      cursorX >= searchBarLeft && cursorX <= searchBarRight &&
      cursorY >= searchBarTop && cursorY <= searchBarBottom;
    
    // Only turn blue when images are actually over the drop zone
    const isDragging = frame >= cursorStartFrame && frame < dropFrame;
    const boxBackground = isOverDropZone ? "#E3F2FD" : "#F5F5F5";

    // Image URLs
    const imageUrls = [
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/Browse.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/reviews.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/listing.png"
    ];

    // Image natural sizes (simulate, or fetch if needed)
    const imageHeights = [60, 60, 60]; // Use 60px as a base height for all
    const imageWidths = [90, 90, 90]; // Use 90px as a base width for all

    // Dragging state - using container coordinate system
    const imageDraggedX = cursorX; // Use the same coordinates as cursor
    const imageDraggedY = cursorY; // Use the same coordinates as cursor

    // Increase image size
    const droppedImageHeight = 100;
    const draggedImageHeight = 80;

    return (
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '10px'
      }}>
        <div
          style={{
            width: "700px", // Reduced from 800px to fit better in container with padding
            height: `${boxHeight * 0.7}px`, // Increased scaling from 0.5 to 0.7 for better visibility
            background: boxBackground,
            borderRadius: "25px",
            padding: "24px",
            paddingBottom: "24px",
            paddingTop: "24px",
            opacity,
            boxShadow: "none",
            position: "relative",
            transition: "height 0.6s ease",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Image previews when dropped - consistent size */}
          {imageDropped && (
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "0px",
                marginBottom: "20px",
                opacity: imageOpacity,
                zIndex: 3,
                alignItems: "flex-end",
                justifyContent: "flex-start",
                minHeight: `${imageHeight}px`,
              }}
            >
              {imageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Preview ${index + 1}`}
                  style={{
                    height: `${imageHeight}px`,
                    width: "auto",
                    borderRadius: "12px",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    objectFit: "contain",
                    margin: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* Dragging images with cursor - consistent size */}
          {isDragging && (
            <div
              style={{
                position: "absolute",
                left: `${imageDraggedX}px`, // Direct positioning - no scaling needed
                top: `${imageDraggedY}px`, // Direct positioning - no scaling needed
                transform: "translate(-50%, -50%)",
                zIndex: 20,
                display: "flex",
                gap: "20px",
                pointerEvents: "none",
              }}
            >
              {imageUrls.map((url, index) => (
                <div key={index} style={{ position: "relative", display: "inline-block" }}>
                  <img
                    src={url}
                    alt={`Dragged ${index + 1}`}
                    style={{
                      height: `${imageHeight}px`,
                      width: "auto",
                      borderRadius: "12px",
                      background: "#fff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      objectFit: "contain",
                    }}
                  />
                  {/* Add cursor on the rightmost image */}
                  {index === imageUrls.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-8px",
                        right: "-8px",
                        color: "#333",
                        fontSize: "20px",
                        zIndex: 25,
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                        transform: "rotate(-15deg)", // Rotate to point like a normal cursor
                      }}
                    >
                      <IconifyIcon icon="cursor-pointer" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text input area - aligned to top initially, then positioned after images */}
          <div style={{ 
            display: "flex", 
            alignItems: "flex-start",
            marginTop: imageDropped ? "0px" : "0px", // Remove top margin to align text to top
            marginBottom: "10px", // Reduce bottom margin to bring icons closer
            justifyContent: "flex-start",
          }}>
            <div style={{ 
              flex: 1, 
              fontSize: "32px", 
              color: "#333",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "400",
              lineHeight: "1.3",
              minHeight: "50px", // Reduced from 80px to 50px to decrease spacing
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              paddingTop: imageDropped ? "0px" : "0px", // Start at very top initially
            }}>
              {text.slice(0, charCount)}
              {charCount < text.length && cursorVisible && (
                <span style={{ color: "#333", fontSize: "32px" }}>|</span>
              )}
            </div>
          </div>

          {/* Bottom action bar - no white background on icons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "5px", // Keep top padding minimal
            paddingBottom: "12px", // Add bottom padding for breathing room
            borderTop: "none",
            background: "transparent",
            borderRadius: "0 0 20px 20px",
            boxShadow: "none",
            minHeight: "50px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: iconProgress,
            }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: "28px",
              }}>
                <IconifyIcon icon="material-symbols:image-outline" />
              </div>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: "28px",
              }}>
                <IconifyIcon icon="material-symbols:mic-outline" />
              </div>
            </div>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              opacity: iconProgress,
              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}>
              <IconifyIcon icon="material-symbols:send" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PromptUI: React.FC = () => {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '600px', // Increased to 600px to ensure full visibility
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px',
        overflow: 'visible', // Changed from hidden to visible to prevent cutoff
        padding: '10px', // Reduced padding to minimize spacing
      }}>
        <SearchBar opacity={1} />
      </div>
    );
  };

  return <PromptUI />;
};

export default MarketingVideoPlayer; 