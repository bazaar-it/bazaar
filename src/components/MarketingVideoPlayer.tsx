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
    const targetFPS = 30; // Reduced from 60 to 30 for smoother performance
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastTimestamp >= frameInterval) {
        setCurrentFrame(prev => {
          const next = prev + 1;
          // Reset after 340 frames total (including 1.5s pause)
          if (next >= 340) {
            return 0; // Reset
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
    
    const text = "Create an animation of the AirBnB app using the attached screenshots. Show a user swiping thru 4 images.";
    
    // Perfectly consistent typewriter - map each frame to exact character
    const startFrame = 5; // Start almost immediately
    const endFrame = 165; // Adjusted for faster overall timing
    const totalFrames = endFrame - startFrame; // 160 frames total duration
    const totalChars = text.length; // Much longer text now
    
    let charCount = 0;
    if (frame >= startFrame && frame < endFrame) {
      // Use precise linear interpolation for consistent timing
      const progress = (frame - startFrame) / totalFrames;
      charCount = Math.min(Math.floor(progress * totalChars), totalChars - 1);
    } else if (frame >= endFrame) {
      charCount = totalChars;
    }
    
    // More realistic cursor blinking - faster blink while typing, slower when done
    // REMOVED: Cursor blinking logic for cleaner text animation
    // const isTyping = frame >= 40 && frame <= 200;
    // const blinkSpeed = isTyping ? 15 : 25; // Faster blink while typing
    // const cursorVisible = Math.floor(frame / blinkSpeed) % 2 === 0;

    // Icons fade in smoothly at the start
    const iconProgress = interpolate(
      frame,
      [0, 30],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    // Cursor animation - start immediately when text completes
    const cursorStartFrame = 165; // Start exactly when text completes (hardcoded to ensure timing)
    const cursorEndFrame = 275; // End after 110 frames of dragging
    const cursorProgress = interpolate(
      frame,
      [cursorStartFrame, cursorEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeInOut" }
    );

    // Natural straight path for cursor - enters from right side of container
    const containerWidth = 700; // Current search bar width
    const containerHeight = 190; // Updated to match new baseHeight
    const startX = containerWidth + 100; // Start further outside the right edge
    const endX = containerWidth * 0.5; // End at center of container (350px)
    const startY = containerHeight * 0.5; // Start at middle height
    const endY = containerHeight * 0.5; // End at same height (straight line)

    const cursorX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const cursorY = startY; // Keep Y constant for straight horizontal movement

    // Image drop animation - coordinated with cursor end
    const dropFrame = 275; // Start image drop when cursor ends (hardcoded)
    const dropCompleteFrame = 295; // Drop animation completes 20 frames after start (hardcoded)
    
    // End pause - 2.5 seconds (75 frames) after drop completes
    const pauseStartFrame = dropCompleteFrame;
    const videoEndFrame = pauseStartFrame + 75; // 2.5 seconds at 30fps
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
    
    // Calculate dynamic box height - keep consistent during dragging
    const baseHeight = 300; // Optimized height for better proportions
    const imageAreaHeight = imageDropped ? 100 : 0; // Reduced image area for better balance
    const boxHeight = baseHeight + imageAreaHeight;
    
    // Keep consistent image size throughout
    const imageHeight = 80; // Same size for dragging and dropped states

    // Check if image is over the drop zone - corrected coordinates
    const searchBarLeft = 50; // Left edge of text area in container
    const searchBarTop = 50; // Top of text area in container  
    const searchBarBottom = 140; // Bottom of text area in container
    const searchBarRight = 650; // Right edge of text area in container
    
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

    // Dragging state - using container coordinate system
    const imageDraggedX = cursorX; // Use the same coordinates as cursor
    const imageDraggedY = cursorY; // Use the same coordinates as cursor

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
            height: `${boxHeight * 0.85}px`, // Increased scaling to ensure submit button is fully visible
            background: boxBackground,
            borderRadius: "25px",
            padding: "16px",
            paddingBottom: "16px",
            paddingTop: "16px",
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

          {/* Dragging images with cursor - fixed size */}
          {isDragging && (
            <div
              style={{
                position: "absolute",
                left: `${imageDraggedX}px`,
                top: `${imageDraggedY}px`,
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
                      height: "80px", // Fixed size to prevent scaling
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
              fontSize: "28px", // Reduced from 32px to match MarketingComponentPlayer
              color: "#333",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "400",
              lineHeight: "1.4", // Increased line height for better multi-line readability
              minHeight: "120px", // Further increased for multi-line text
              maxHeight: "160px", // Set max height to prevent overflow
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              paddingTop: imageDropped ? "0px" : "0px", // Start at very top initially
              paddingBottom: "20px", // Add bottom padding to separate from icons
              wordWrap: "break-word", // Allow text to wrap
              whiteSpace: "normal", // Allow normal text wrapping
              overflow: "hidden", // Hide any text overflow
            }}>
              {text.slice(0, charCount)}
              {/* REMOVED: Blinking cursor for cleaner animation */}
            </div>
          </div>

          {/* Bottom action bar - no white background on icons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "15px", // Increased top padding for better separation
            paddingBottom: "20px", // Increased bottom padding for better visibility
            borderTop: "none",
            background: "transparent",
            borderRadius: "0 0 20px 20px",
            boxShadow: "none",
            minHeight: "60px", // Increased min height for better icon visibility
            marginTop: "auto", // Push to bottom of container
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
                fontSize: "36px", // Increased from 28px to match MarketingComponentPlayer
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
                fontSize: "36px", // Increased from 28px to match MarketingComponentPlayer
              }}>
                <IconifyIcon icon="material-symbols:mic-outline" />
              </div>
            </div>
            <div style={{
              width: "60px", // Increased from 44px to match MarketingComponentPlayer
              height: "60px", // Increased from 44px to match MarketingComponentPlayer
              borderRadius: "50%",
              backgroundColor: "#222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "29px", // Reduced by 20% from 36px
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
        height: '400px', // Reduced height to minimize spacing
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px',
        overflow: 'visible',
        padding: '0px', // Removed all padding
        margin: '0px', // Removed all margin
      }}>
        <SearchBar opacity={1} />
      </div>
    );
  };

  return <PromptUI />;
};

export default MarketingVideoPlayer; 