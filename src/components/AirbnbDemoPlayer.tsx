"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import { VideoPlayerErrorBoundary } from './VideoPlayerErrorBoundary';

// TypeScript interfaces for animation sequences
interface AnimationSequence {
  type: string;
  frames: number;
  start: number;
  end: number;
}

interface ScriptItem {
  type: string;
  frames: number;
}

// Image component with fallback support
const SafeImage = ({ src, fallback, style }: { src: string; fallback: string; style: React.CSSProperties }) => {
  const { Img } = window.Remotion;
  const [imageSrc, setImageSrc] = React.useState(src);
  
  return (
    <Img 
      src={imageSrc}
      style={style}
      onError={() => setImageSrc(fallback)}
    />
  );
};

// Remotion composition component using the provided code
const AirbnbDemo = () => {
  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = window.Remotion;

  const script_A8B9C2D3: ScriptItem[] = [
    { type: 'splash_bg', frames: 15 },
    { type: 'logo_and_tagline', frames: 15 },
    { type: 'transition', frames: 10 },
    { type: 'search_header', frames: 12 },
    { type: 'listing_image', frames: 15 },
    { type: 'guest_favorite', frames: 10 },
    { type: 'property_title', frames: 12 },
    { type: 'property_details', frames: 12 },
    { type: 'price', frames: 12 },
    { type: 'second_listing', frames: 15 },
    { type: 'bottom_nav', frames: 12 },
    { type: 'swipe_interaction', frames: 150 },
    { type: 'status_bar_animations', frames: 180 }
  ];


  let accumulatedFrames_A8B9C2D3 = 0;
  const sequences_A8B9C2D3: AnimationSequence[] = [];

  script_A8B9C2D3.forEach((item, index) => {
    sequences_A8B9C2D3.push({
      ...item,
      start: accumulatedFrames_A8B9C2D3,
      end: accumulatedFrames_A8B9C2D3 + item.frames
    });
    accumulatedFrames_A8B9C2D3 += item.frames;
  });

  // Load fonts safely
  if (typeof window !== 'undefined' && window.RemotionGoogleFonts) {
    try {
      window.RemotionGoogleFonts.loadFont("Inter");
    } catch (error) {
      // Ignore font loading errors
    }
  }
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Both logo and tagline scale up together from frame 0 - FASTER (15 frames instead of 30)
  const logoAndTaglineScale = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const searchHeaderY = interpolate(
    frame,
    [sequences_A8B9C2D3[3].start, sequences_A8B9C2D3[3].start + 10],
    [50, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const listingImageY = interpolate(
    frame,
    [sequences_A8B9C2D3[4].start, sequences_A8B9C2D3[4].start + 12],
    [100, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const guestFavoriteScale = interpolate(
    frame,
    [sequences_A8B9C2D3[5].start, sequences_A8B9C2D3[5].start + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleOpacity = interpolate(
    frame,
    [sequences_A8B9C2D3[6].start, sequences_A8B9C2D3[6].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const detailsOpacity = interpolate(
    frame,
    [sequences_A8B9C2D3[7].start, sequences_A8B9C2D3[7].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const priceScale = interpolate(
    frame,
    [sequences_A8B9C2D3[8].start, sequences_A8B9C2D3[8].start + 10],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const secondListingY = interpolate(
    frame,
    [sequences_A8B9C2D3[9].start, sequences_A8B9C2D3[9].start + 12],
    [150, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bottomNavY = interpolate(
    frame,
    [sequences_A8B9C2D3[10].start, sequences_A8B9C2D3[10].start + 10],
    [80, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Enhanced swipe interaction with longer pause between swipes
  const swipeStartFrame = sequences_A8B9C2D3[11].start;
  const swipeDuration = 50; // Increased from 40 to 50 frames for longer pause between swipes
  
  // Calculate which swipe we're in (0, 1, 2, or 3 - now 4 images total)
  const totalSwipeProgress = interpolate(
    frame,
    [swipeStartFrame, swipeStartFrame + 150],
    [0, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const currentSwipeIndex = Math.floor(totalSwipeProgress);
  const swipeLocalProgress = totalSwipeProgress % 1;
  
  // Smooth linear easing without bounce - using interpolate for consistent smoothness
  const swipeEasing = interpolate(
    frame - (swipeStartFrame + currentSwipeIndex * 50),
    [0, 50],
    [0, 1],
    { 
      extrapolateLeft: "clamp", 
      extrapolateRight: "clamp"
    }
  );
  
  // Four property images for cycling with fallback
  const propertyImages = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80",
    "https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?auto=format&fit=crop&w=2000&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80"
  ];

  // Fallback image (data URL for a simple placeholder)
  const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='20' fill='%239ca3af'%3EProperty Image%3C/text%3E%3C/svg%3E";
  
  // Calculate current and next image indices
  const currentImageIndex = currentSwipeIndex % propertyImages.length;
  const nextImageIndex = (currentSwipeIndex + 1) % propertyImages.length;
  
  // Swipe offset for smooth transition
  const swipeOffset = interpolate(swipeEasing, [0, 1], [0, -440]); // Width of image container (matches phoneWidth)
  
  // Enhanced status bar animations that cycle
  const statusStartFrame = sequences_A8B9C2D3[12].start;
  const statusDuration = 60; // 2 seconds per cycle
  
  // Cycle through different status bar states
  const statusCycleProgress = interpolate(
    frame - statusStartFrame,
    [0, 180],
    [0, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const currentStatusCycle = Math.floor(statusCycleProgress);
  const statusLocalProgress = statusCycleProgress % 1;
  
  // Different status bar configurations
  const signalBars = [
    { bars: [1, 1, 1, 0], carrier: "Verizon", time: "9:41" },
    { bars: [1, 1, 0, 0], carrier: "AT&T", time: "9:42" },
    { bars: [1, 1, 1, 1], carrier: "T-Mobile", time: "9:43" },
  ];
  
  const currentStatus = signalBars[currentStatusCycle % signalBars.length] || signalBars[0];
  
  // Create phone frame with dynamic content - made wider for better visibility
  const phoneWidth = 440; // Increased for better mobile/desktop visibility
  const phoneHeight = 920; // Increased proportionally
  
  const SearchPromptText = () => {
    const promptFrame = frame - 40;
    
    const typewriterText = "Create a demo video of the AirBnB app using these screenshots.";
    const typewriterProgress = interpolate(
      promptFrame,
      [0, 180],
      [0, typewriterText.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    
    const visibleText = typewriterText.slice(0, Math.floor(typewriterProgress));
    const showCursor = promptFrame >= 0 && promptFrame % 30 < 15;
    
    return (
      <div style={{
        position: "absolute",
        top: logoAndTaglineScale > 0 ? "120px" : "200px",
        left: "50%",
        transform: "translateX(-50%)",
        transition: "top 0.5s ease",
        width: "95%",
        maxWidth: "1100px",
        height: "80px",
        backgroundColor: "#ffffff",
        borderRadius: "50px",
        border: "2px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        paddingLeft: "24px",
        paddingRight: "24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        opacity: logoAndTaglineScale,
        zIndex: 10,
        fontSize: "18px",
        color: "#374151",
        fontWeight: "400",
        lineHeight: "1.4",
      }}>
        <div style={{ 
          marginRight: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          {/* Upload icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#6b7280" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          
          {/* Microphone icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#6b7280" }}>
            <path d="m12 1 0 22" />
            <path d="m17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        
        <span style={{ flex: 1 }}>
          {visibleText}
          {showCursor && <span style={{ opacity: 1 }}>|</span>}
        </span>
        
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}>
          {/* Send arrow */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: "#f9fafb" }}>
      {/* Background Illustration - Splash effect */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(ellipse at center top, 
          rgba(253, 230, 138, 0.4) 0%, 
          rgba(252, 211, 77, 0.3) 25%, 
          rgba(251, 191, 36, 0.2) 50%, 
          rgba(245, 158, 11, 0.1) 75%, 
          transparent 100%)`,
        transform: `scale(${logoAndTaglineScale * 1.2 + 0.8})`,
        opacity: logoAndTaglineScale * 0.6,
      }} />

      {/* Logo and tagline with coordinated animation */}
      <div style={{
        position: "absolute",
        top: "60px",
        left: "50%",
        transform: `translateX(-50%) scale(${logoAndTaglineScale})`,
        textAlign: "center",
        opacity: logoAndTaglineScale,
      }}>
        {/* Airbnb Logo */}
        <div style={{
          fontSize: "48px",
          fontWeight: "600",
          color: "#ff5a5f",
          marginBottom: "8px",
          fontFamily: "'Inter', sans-serif",
        }}>
          airbnb
        </div>
        
        {/* Tagline */}
        <div style={{
          fontSize: "16px",
          color: "#6b7280",
          fontWeight: "400",
          fontFamily: "'Inter', sans-serif",
        }}>
          Find your perfect stay
        </div>
      </div>

      {/* Search prompt with typewriter effect */}
      <SearchPromptText />

      {/* iPhone Frame */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translateX(-50%) translateY(-50%)",
        width: phoneWidth,
        height: phoneHeight,
        background: "#000000",
        borderRadius: "60px",
        padding: "8px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        zIndex: 5,
      }}>
        {/* Screen */}
        <div style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          borderRadius: "52px",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Status Bar with dynamic content */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "44px",
            background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: "24px",
            paddingRight: "24px",
            zIndex: 20,
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
          }}>
            {/* Time */}
            <div>{currentStatus.time}</div>
            
            {/* Signal and battery */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Signal bars */}
              {currentStatus.bars.map((active, i) => (
                <div key={i} style={{
                  width: "3px",
                  height: `${8 + i * 2}px`,
                  background: active ? "white" : "rgba(255,255,255,0.3)",
                  borderRadius: "1px",
                }} />
              ))}
              
              {/* Battery */}
              <div style={{
                width: "24px",
                height: "12px",
                border: "1px solid white",
                borderRadius: "2px",
                marginLeft: "6px",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: "1px",
                  left: "1px",
                  width: "60%",
                  height: "8px",
                  background: "white",
                  borderRadius: "1px",
                }} />
              </div>
            </div>
          </div>

          {/* Search Header */}
          <div style={{
            position: "absolute",
            top: searchHeaderY + 60,
            left: "24px",
            right: "24px",
            height: "56px",
            background: "white",
            borderRadius: "28px",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            paddingLeft: "20px",
            paddingRight: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: 15,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input 
              placeholder="Where to?"
              style={{
                marginLeft: "12px",
                border: "none",
                outline: "none",
                fontSize: "16px",
                color: "#374151",
                flex: 1,
                background: "transparent",
              }}
              readOnly
            />
          </div>

          {/* Main listing image with swipe transition */}
          <div style={{
            position: "absolute",
            top: listingImageY + 140,
            left: "24px",
            right: "24px",
            height: "240px",
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            zIndex: 10,
          }}>
            {/* Current image */}
            <SafeImage 
              src={propertyImages[currentImageIndex] || propertyImages[0]}
              fallback={fallbackImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${swipeOffset}px)`,
                borderRadius: "12px",
              }}
            />
            
            {/* Next image for smooth transition */}
            <SafeImage 
              src={propertyImages[nextImageIndex] || propertyImages[0]}
              fallback={fallbackImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${swipeOffset + 440}px)`,
                borderRadius: "12px",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
          </div>

          {/* Guest Favorite Badge */}
          <div style={{
            position: "absolute",
            top: listingImageY + 160,
            left: "44px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "8px 12px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#374151",
            transform: `scale(${guestFavoriteScale})`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 12,
          }}>
            Guest favorite
          </div>

          {/* Property Title */}
          <div style={{
            position: "absolute",
            top: listingImageY + 400,
            left: "24px",
            right: "24px",
            opacity: titleOpacity,
            zIndex: 10,
          }}>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
              lineHeight: "1.2",
            }}>
              Cozy Mountain Cabin
            </h3>
          </div>

          {/* Property Details */}
          <div style={{
            position: "absolute",
            top: listingImageY + 430,
            left: "24px",
            right: "24px",
            opacity: detailsOpacity,
            zIndex: 10,
          }}>
            <p style={{
              fontSize: "16px",
              color: "#6b7280",
              margin: 0,
              lineHeight: "1.3",
            }}>
              Entire cabin • 2 beds • Mountain view
            </p>
          </div>

          {/* Price */}
          <div style={{
            position: "absolute",
            top: listingImageY + 460,
            left: "24px",
            right: "24px",
            transform: `scale(${priceScale})`,
            transformOrigin: "left center",
            zIndex: 10,
          }}>
            <p style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}>
              <span style={{ fontSize: "16px", fontWeight: "400", color: "#6b7280" }}>from </span>
              $89
              <span style={{ fontSize: "16px", fontWeight: "400", color: "#6b7280" }}> / night</span>
            </p>
          </div>

          {/* Second listing preview */}
          <div style={{
            position: "absolute",
            top: secondListingY + 520,
            left: "24px",
            right: "24px",
            height: "120px",
            background: "#f9fafb",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            zIndex: 10,
          }}>
            <Img 
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=80"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "8px",
                objectFit: "cover",
              }}
            />
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                margin: 0,
                marginBottom: "4px",
              }}>
                Beach House Villa
              </h4>
              <p style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: 0,
                marginBottom: "8px",
              }}>
                Ocean view • 3 beds
              </p>
              <p style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                margin: 0,
              }}>
                $156 / night
              </p>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div style={{
            position: "absolute",
            bottom: bottomNavY + 20,
            left: 0,
            right: 0,
            height: "80px",
            background: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingBottom: "20px",
            zIndex: 15,
          }}>
            {[
              { icon: "🏠", label: "Explore", active: true },
              { icon: "💖", label: "Wishlists", active: false },
              { icon: "🧳", label: "Trips", active: false },
              { icon: "💬", label: "Inbox", active: false },
              { icon: "👤", label: "Profile", active: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                opacity: item.active ? 1 : 0.6,
              }}>
                <span style={{ fontSize: "20px" }}>{item.icon}</span>
                <span style={{
                  fontSize: "12px",
                  color: item.active ? "#ff5a5f" : "#6b7280",
                  fontWeight: item.active ? "600" : "400",
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default function AirbnbDemoPlayer() {
  return (
    <VideoPlayerErrorBoundary playerName="Airbnb Demo">
      <div style={{ 
        width: '100%', 
        aspectRatio: '16/9',
        background: '#f9fafb',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <Player
          component={AirbnbDemo}
          durationInFrames={470} // Total frames from script
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          loop={true}
          autoPlay={true}
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </VideoPlayerErrorBoundary>
  );
}