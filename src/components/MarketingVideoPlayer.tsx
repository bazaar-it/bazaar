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
    
    const text = "Create a demo video of my app using the attached screenshots";
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
    const baseHeight = 550; // Increased further from 450 to 550 to prevent icon overlap
    const imageHeight = imageDropped ? 100 + 24 : 0; // Larger image area (100px) + gap (24px) for 80% sizing
    const boxHeight = baseHeight + imageHeight;

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
            background: boxBackground, // Restored background for text box visibility
            borderRadius: "25px",
            padding: "24px",
            paddingBottom: "24px", // Reduced padding since we have more height now
            paddingTop: "24px",
            opacity,
            boxShadow: "none",
            position: "relative",
            transition: "height 0.6s ease", // Removed background and transform transitions
            display: "flex",
            flexDirection: "column",
            // Removed transform scale animation
            overflow: "hidden", // Prevent any content from spilling outside
          }}
        >
          {/* Image previews when dropped - properly positioned at top with 80% sizing */}
          {imageDropped && (
            <div
              style={{
                display: "flex",
                gap: "12px", // Comfortable gap for larger images
                marginTop: "0px", // Top alignment
                marginBottom: "16px", // Space between images and text
                opacity: imageOpacity, // Smooth fade-in
                zIndex: 3,
                alignItems: "center", // Center align the images vertically
                justifyContent: "flex-start", // Left align the images
                minHeight: "50px", // Reserve minimum space for images
              }}
            >
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  style={{
                    width: "50px", // 80% of original 60px
                    height: "50px", // 80% of original 60px
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: "6px", // 80% of original 8px
                    border: "2px solid #1976D2", // Slighter thicker border for visibility
                    opacity: imageOpacity, // Individual opacity for each image
                    transform: dropInProgress ? `scale(${Math.min(1, (frame - dropFrame) / 10)})` : "scale(1)", // Quick scale animation
                    transition: "transform 0.2s ease", // Smooth transform
                  }}
                />
              ))}
            </div>
          )}

          {/* Text input area */}
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            flex: 1,
            marginTop: imageDropped ? "0px" : "20px", // Adjust spacing based on image presence
          }}>
            <div style={{ 
              flex: 1, 
              fontSize: "20px", 
              color: "#333",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "400",
              lineHeight: "1.4",
              minHeight: "60px", // Reserve space for text
              display: "flex",
              alignItems: "center",
            }}>
              {text.slice(0, charCount)}
              {charCount < text.length && cursorVisible && (
                <span style={{ color: "#333", fontSize: "20px" }}>|</span>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "16px", // Space above the action bar
            borderTop: imageDropped ? "1px solid #E0E0E0" : "none", // Optional visual separator when images are present
            marginTop: "auto", // Push to bottom
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              opacity: iconProgress,
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                backgroundColor: "#F0F0F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: "16px",
              }}>
                <IconifyIcon icon="material-symbols:image-outline" />
              </div>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                backgroundColor: "#F0F0F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: "16px",
              }}>
                <IconifyIcon icon="material-symbols:mic-outline" />
              </div>
            </div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              backgroundColor: "#2196F3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px",
              opacity: iconProgress,
            }}>
              <IconifyIcon icon="material-symbols:send" />
            </div>
          </div>
        </div>

        {/* Cursor with pointer icon - only show when in progress */}
        {frame >= cursorStartFrame && frame < dropFrame && (
          <div
            style={{
              position: "absolute",
              left: `${cursorX * 0.5}px`, // Scale down cursor position
              top: `${cursorY * 0.5}px`, // Scale down cursor position
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              fontSize: "24px", // Slightly smaller for web
              color: "#333",
              filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))",
              pointerEvents: "none",
            }}
          >
            <IconifyIcon icon="tabler:pointer" />
          </div>
        )}
      </div>
    );
  };

  const PromptUI: React.FC = () => {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '600px', // Fixed height for consistent display
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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