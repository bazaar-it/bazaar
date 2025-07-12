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
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 720); // Extended to 720 frames (24 seconds at 30fps) to show final state longer
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
    
    const text = "Create a demo video of my app";
    const charCount = Math.floor(
      interpolate(
        frame,
        [60, 200], // Slower typing animation - extended from [30, 120] to [40, 180]
        [0, text.length],
        { extrapolateLeft: "clamp" }
      )
    );
    
    const cursorVisible = Math.floor(frame / 20) % 2 === 0; // Slower cursor blink

    // Icons visible from the beginning
    const iconProgress = 1;

    // Cursor animation - much slower timing
    const cursorStartFrame = 190; // Start much later
    const cursorEndFrame = 305; // End 15 frames earlier (0.5 seconds) and within input box
    const cursorProgress = interpolate(
      frame,
      [cursorStartFrame, cursorEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Natural arc path for cursor - ensure it lands within input box bounds
    const paddingOffset = 20;
    const startX = width + 100;
    const searchBarLeft = (width - 1600) / 2 + paddingOffset;
    const endX = searchBarLeft + 400; // Land more centrally within the input box (was + 48 - 20)
    const startY = height / 2 - 200;
    const endY = height / 2 - 80; // Land higher within the input box (was + (320 / 2) - 40 - 30)
    const arcHeight = -160;

    const cursorX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const cursorY = interpolate(cursorProgress, [0, 1], [startY, endY]) + 
      Math.sin(cursorProgress * Math.PI) * arcHeight;

    // Image drop animation - earlier timing
    const dropFrame = 305; // Start image drop 15 frames earlier (0.5 seconds)
    const dropCompleteFrame = 325; // Drop animation completes 20 frames after start
    const imageDropped = frame >= dropFrame;
    const dropInProgress = frame >= dropFrame && frame < dropCompleteFrame;
    
    // Smoother image appearance with drop animation
    const imageOpacity = imageDropped ? 
      Math.min(1, (frame - dropFrame) / 20) : 0; // 20 frame fade-in for crisp appearance
    
    // Calculate dynamic box height based on content with proper spacing
    const baseHeight = imageDropped ? 380 : 320; // Increased slightly to show bottom icons
    const imageAreaHeight = imageDropped ? 100 : 0; // Space for images when dropped
    const boxHeight = baseHeight + imageAreaHeight;
    
    // Keep consistent image size throughout
    const imageHeight = 80;

    // Check if image is over the drop zone - adjust for new timing and position
    const searchBarTop = height / 2 - 160;
    const searchBarBottom = height / 2 + 160;
    const searchBarRight = searchBarLeft + 1600 - (paddingOffset * 2);
    
    const isOverDropZone = frame >= cursorStartFrame && frame < dropFrame &&
      cursorX >= searchBarLeft && cursorX <= searchBarRight &&
      cursorY >= searchBarTop && cursorY <= searchBarBottom;
    
    // Turn blue as soon as images are being dragged (starting from cursorStartFrame)
    const isDragging = frame >= cursorStartFrame && frame < dropFrame;
    const boxBackground = isDragging ? "#E3F2FD" : "#F5F5F5";

    // Image URLs
    const imageUrls = [
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/Browse.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/reviews.png",
      "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/listing.png"
    ];

    // Image natural sizes (simulate, or fetch if needed)
    const imageHeights = [60, 60, 60]; // Use 60px as a base height for all
    const imageWidths = [90, 90, 90]; // Use 90px as a base width for all

    // Dragging state
    const imageDraggedX = interpolate(cursorProgress, [0, 1], [startX, endX]);
    const imageDraggedY = interpolate(cursorProgress, [0, 1], [startY, endY]) + Math.sin(cursorProgress * Math.PI) * arcHeight;

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
        padding: '20px'
      }}>
        <div
          style={{
            width: "800px",
            height: `${boxHeight * 0.5}px`,
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
                left: `${imageDraggedX * 0.5}px`,
                top: `${imageDraggedY * 0.5}px`,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
                display: "flex",
                gap: "20px",
                pointerEvents: "none",
              }}
            >
              {imageUrls.map((url, index) => (
                <img
                  key={index}
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
              ))}
            </div>
          )}

          {/* Text input area - consistent size and left-aligned */}
          <div style={{ 
            display: "flex", 
            alignItems: "flex-start",
            flex: 1,
            marginTop: imageDropped ? "0px" : "20px",
          }}>
            <div style={{ 
              flex: 1, 
              fontSize: "32px", 
              color: "#333",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "400",
              lineHeight: "1.3",
              minHeight: "80px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
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
            paddingTop: "16px",
            borderTop: "none",
            marginTop: "auto",
            background: "transparent",
            borderRadius: "0 0 20px 20px",
            boxShadow: "none",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              opacity: iconProgress,
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: "24px",
              }}>
                <IconifyIcon icon="material-symbols:image-outline" />
              </div>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: "24px",
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
        height: '400px', // Reduced from 600px to make it more compact
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        <SearchBar opacity={1} />
      </div>
    );
  };

  return <PromptUI />;
};

export default MarketingVideoPlayer; 