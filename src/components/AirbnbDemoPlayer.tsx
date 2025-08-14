"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';

// Remotion composition component using the provided code
const AirbnbDemo = () => {
  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = window.Remotion;

  const script_A8B9C2D3 = [
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
  const sequences_A8B9C2D3 = [];

  script_A8B9C2D3.forEach((item, index) => {
    sequences_A8B9C2D3.push({
      ...item,
      start: accumulatedFrames_A8B9C2D3,
      end: accumulatedFrames_A8B9C2D3 + item.frames
    });
    accumulatedFrames_A8B9C2D3 += item.frames;
  });

  window.RemotionGoogleFonts.loadFont("Inter", { 
    weights: ["400", "600"], // Only load necessary weights
    ignoreTooManyRequestsWarning: true 
  });
  
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
      extrapolateRight: "clamp",
      easing: (t) => {
        // Custom smooth easing curve - no bounce, just smooth acceleration and deceleration
        return t * t * (3 - 2 * t); // Smoothstep function for natural feel
      }
    }
  );
  
  // Apply easing only during active swipe transitions
  const isInTransition = swipeLocalProgress > 0 && swipeLocalProgress < 1;
  const easedProgress = isInTransition ? swipeEasing : (swipeLocalProgress >= 1 ? 1 : 0);
  
  // Main image position with smooth easing
  const mainImageOffset = interpolate(
    easedProgress,
    [0, 1],
    [0, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  // Incoming image with subtle parallax effect - starts slightly behind, then catches up
  const parallaxDelay = 0.1; // Reduced delay for smoother feel
  const incomingImageProgress = interpolate(
    easedProgress,
    [0, parallaxDelay, 1],
    [0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const incomingImageOffset = interpolate(
    incomingImageProgress,
    [0, 1],
    [100, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const currentImageIndex = currentSwipeIndex % 4; // Now 4 images
  const nextImageIndex = (currentSwipeIndex + 1) % 4;

  // Status bar animations during extended period
  const statusBarAnimationStart = sequences_A8B9C2D3[12].start;
  
  // Time animation - cycles through different times
  const timeProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const times = ["9:41", "9:42", "9:43", "9:44"];
  const currentTimeIndex = Math.floor(timeProgress * 3);
  const currentTime = times[Math.min(currentTimeIndex, 3)];
  
  // Signal strength animation - varies between 2-4 bars
  const signalProgress = interpolate(
    frame,
    [statusBarAnimationStart + 30, statusBarAnimationStart + 120],
    [0, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const signalCycle = Math.sin(signalProgress) * 0.5 + 0.5; // Oscillate between 0-1
  const signalBars = Math.floor(signalCycle * 3) + 2; // 2-4 bars
  
  // Battery animation - drains slightly
  const batteryProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 180],
    [1, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Calculate responsive phone dimensions to fill screen
  const phoneWidth = Math.min(width, height * 0.46); // iPhone aspect ratio
  const phoneHeight = phoneWidth * 2.16; // iPhone aspect ratio
  const phoneScaleFactor = Math.min(width / 375, height / 812);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Splash Screen Background */}
      {frame >= sequences_A8B9C2D3[0].start && frame < sequences_A8B9C2D3[2].end && (
        <AbsoluteFill style={{ backgroundColor: "#FF385C", borderRadius: "20px" }} />
      )}

      {/* Airbnb Logo - White on Pink Background */}
      {frame >= 0 && frame < sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoAndTaglineScale})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80%"
        }}>
          {/* Airbnb Logo from Iconify - White Fill */}
          <window.IconifyIcon 
            icon="simple-icons:airbnb" 
            style={{
              fontSize: `${width * 0.25}px`,
              color: "white"
            }}
          />
        </div>
      )}

      {/* Tagline - Scales with Logo */}
      {frame >= 0 && frame < sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoAndTaglineScale})`,
          color: "white",
          fontSize: `${width * 0.08}px`,
          fontFamily: "Inter",
          fontWeight: "400",
          width: "80%",
          textAlign: "center"
        }}>
          Belong Anywhere
        </div>
      )}

      {/* iPhone Frame - Full Screen with Frame - Always visible after splash */}
      {frame >= sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${phoneScaleFactor})`,
          width: "375px",
          height: "812px",
          backgroundColor: "#000000",
          borderRadius: "40px",
          padding: "8px"
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: "32px",
            overflow: "hidden",
            position: "relative"
          }}>
            
            {/* Status Bar - Always visible after splash with animations */}
            <div style={{
              position: "absolute",
              top: "0px",
              left: "0px",
              right: "0px",
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: "20px",
              paddingRight: "20px",
              zIndex: 10
            }}>
              <div style={{
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600",
                color: "#000000"
              }}>
                {frame >= statusBarAnimationStart ? currentTime : "9:41"}
              </div>
              <div style={{
                width: "120px",
                height: "30px",
                backgroundColor: "#000000",
                borderRadius: "15px"
              }} />
              <div style={{
                display: "flex",
                gap: "5px",
                alignItems: "center"
              }}>
                <window.IconifyIcon icon="mdi--signal" style={{ fontSize: "16px", color: "#000000" }} />
                <window.IconifyIcon icon="material-symbols:wifi" style={{ fontSize: "16px", color: "#000000" }} />
                <div style={{
                  position: "relative",
                  width: "24px",
                  height: "12px",
                  border: "1px solid #000000",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <div style={{
                    width: `${batteryProgress * 100}%`,
                    height: "8px",
                    backgroundColor: batteryProgress > 0.2 ? "#34C759" : "#FF3B30",
                    borderRadius: "1px",
                    margin: "1px"
                  }} />
                  <div style={{
                    position: "absolute",
                    right: "-3px",
                    top: "3px",
                    width: "2px",
                    height: "6px",
                    backgroundColor: "#000000",
                    borderRadius: "0 1px 1px 0"
                  }} />
                </div>
              </div>
            </div>

            {/* Search Header - Pill shaped */}
            {frame >= sequences_A8B9C2D3[3].start && (
              <div style={{
                position: "absolute",
                top: "60px",
                left: "20px",
                right: "20px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transform: `translateY(${searchHeaderY}px)`
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  backgroundColor: "#F5F5F5",
                  padding: "12px 16px",
                  borderRadius: "50px",
                  flex: 1,
                  marginRight: "15px"
                }}>
                  <window.IconifyIcon icon="material-symbols:search" style={{ fontSize: "20px", color: "#666666" }} />
                  <div>
                    <div style={{
                      fontSize: "18px",
                      fontFamily: "Inter",
                      fontWeight: "600",
                      color: "#000000"
                    }}>
                      Joshua Tree
                    </div>
                    <div style={{
                      fontSize: "14px",
                      fontFamily: "Inter",
                      fontWeight: "400",
                      color: "#666666"
                    }}>
                      Dec 11 - 14 • 2 guests
                    </div>
                  </div>
                </div>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "20px",
                  border: "1px solid #DDDDDD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <window.IconifyIcon icon="material-symbols:tune" style={{ fontSize: "20px", color: "#666666" }} />
                </div>
              </div>
            )}

            {/* Main Listing Image - With Enhanced Swipe Interaction */}
            {frame >= sequences_A8B9C2D3[4].start && (
              <div style={{
                position: "absolute",
                top: "160px",
                left: "20px",
                right: "20px",
                height: "300px",
                borderRadius: "12px",
                overflow: "hidden",
                transform: `translateY(${listingImageY}px)`
              }}>
                {/* Image Container with Enhanced Swipe Effect */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden"
                }}>
                  {/* Enhanced swipe interaction - now includes original image as first in sequence */}
                  <>
                    {/* Current Image */}
                    <Img 
                      src={swipeImages[currentImageIndex]}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `translateX(${mainImageOffset}%)`
                      }}
                    />
                    
                    {/* Incoming Image with Parallax Effect */}
                    {isInTransition && (
                      <Img 
                        src={swipeImages[nextImageIndex]}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: `translateX(${incomingImageOffset}%)`
                        }}
                      />
                    )}
                  </>
                </div>
                
                {/* Guest Favorite Badge - Only show on first image (index 0) */}
                {frame >= sequences_A8B9C2D3[5].start && currentImageIndex === 0 && (
                  <div style={{
                    position: "absolute",
                    top: "15px",
                    left: "15px",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "8px 12px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                    color: "#000000",
                    transform: `scale(${guestFavoriteScale})`
                  }}>
                    Guest favorite
                  </div>
                )}

                {/* Heart Icon */}
                <div style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <window.IconifyIcon icon="material-symbols:favorite-outline" style={{ fontSize: "16px", color: "white" }} />
                </div>

                {/* Image Dots - Updated to show current image during swipe (4 images total) */}
                <div style={{
                  position: "absolute",
                  bottom: "15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "6px"
                }}>
                  {/* 4 images with smooth transitions */}
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "3px",
                      backgroundColor: i === currentImageIndex ? "#FFFFFF" : "rgba(255,255,255,0.5)"
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Property Title */}
            {frame >= sequences_A8B9C2D3[6].start && (
              <div style={{
                position: "absolute",
                top: "480px",
                left: "20px",
                right: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                opacity: titleOpacity
              }}>
                <div style={{
                  fontSize: "18px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  color: "#000000"
                }}>
                  Home in Yucca Valley
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <window.IconifyIcon icon="material-symbols:star" style={{ fontSize: "14px", color: "#FFD700" }} />
                  <span style={{
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                    color: "#000000"
                  }}>
                    4.97 (156)
                  </span>
                </div>
              </div>
            )}

            {/* Property Details */}
            {frame >= sequences_A8B9C2D3[7].start && (
              <div style={{
                position: "absolute",
                top: "510px",
                left: "20px",
                right: "20px",
                opacity: detailsOpacity
              }}>
                <div style={{
                  fontSize: "16px",
                  fontFamily: "Inter",
                  fontWeight: "400",
                  color: "#666666",
                  marginBottom: "4px"
                }}>
                  Desert dream oasis with spa
                </div>
                <div style={{
                  fontSize: "16px",
                  fontFamily: "Inter",
                  fontWeight: "400",
                  color: "#666666"
                }}>
                  2 beds
                </div>
              </div>
            )}

            {/* Price */}
            {frame >= sequences_A8B9C2D3[8].start && (
              <div style={{
                position: "absolute",
                top: "560px",
                left: "20px",
                transform: `scale(${priceScale})`,
                transformOrigin: "left center"
              }}>
                <span style={{
                  fontSize: "18px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  color: "#000000",
                  textDecoration: "underline"
                }}>
                  $782
                </span>
                <span style={{
                  fontSize: "16px",
                  fontFamily: "Inter",
                  fontWeight: "400",
                  color: "#666666",
                  marginLeft: "4px"
                }}>
                  total before taxes
                </span>
              </div>
            )}

            {/* Second Listing Preview - Beautiful Home */}
            {frame >= sequences_A8B9C2D3[9].start && (
              <div style={{
                position: "absolute",
                top: "620px",
                left: "20px",
                right: "20px",
                height: "120px",
                borderRadius: "12px",
                transform: `translateY(${secondListingY}px)`,
                overflow: "hidden"
              }}>
                <Img 
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2075&q=80"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "15px"
                }}>
                  <window.IconifyIcon icon="material-symbols:favorite-outline" style={{ fontSize: "16px", color: "white" }} />
                </div>
              </div>
            )}

            {/* Bottom Navigation */}
            {frame >= sequences_A8B9C2D3[10].start && (
              <div style={{
                position: "absolute",
                bottom: "0px",
                left: "0px",
                right: "0px",
                height: "80px",
                backgroundColor: "#FFFFFF",
                borderTop: "1px solid #EEEEEE",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                transform: `translateY(${bottomNavY}px)`
              }}>
                {[
                  { icon: "material-symbols:search", label: "Explore", active: true },
                  { icon: "material-symbols:favorite-outline", label: "Wishlists", active: false },
                  { icon: "material-symbols:home-outline", label: "Trips", active: false },
                  { icon: "material-symbols:chat-outline", label: "Inbox", active: false },
                  { icon: "material-symbols:person-outline", label: "Profile", active: false }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <window.IconifyIcon icon={item.icon} style={{ fontSize: "20px", color: item.active ? "#FF5A8A" : "#999999" }} />
                    <div style={{
                      fontSize: "12px",
                      fontFamily: "Inter",
                      fontWeight: "400",
                      color: item.active ? "#FF5A8A" : "#999999"
                    }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Calculate total frames
const script_A8B9C2D3 = [
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

const totalFrames_A8B9C2D3 = script_A8B9C2D3.reduce((sum, item) => sum + item.frames, 0);

// Define swipeImages outside the component so it's accessible
const swipeImages = [
  `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75`,
  `https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75`,
  `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75`,
  `https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=75`
];

export default function AirbnbDemoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 250, height: 540 });
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const playerRef = useRef<any>(null);

  // Simplified loading - don't wait for images
  useEffect(() => {
    // Just a small delay for component initialization
    const timer = setTimeout(() => {
      setIsLoaded(true);
      setImagesPreloaded(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Calculate responsive dimensions based on viewport
    const calculateDimensions = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // For mobile (width < 768px)
      if (vw < 768) {
        const width = Math.min(vw * 0.85, 320); // 85% of viewport width, max 320px
        const height = Math.min(width * 2.165, vh * 0.7); // Maintain aspect ratio but cap at 70% viewport height
        setDimensions({ width, height });
      } else {
        // Desktop default
        setDimensions({ width: 250, height: 540 });
      }
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, []);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading Airbnb Demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-transparent mx-auto" style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}>
      {/* Video Player */}
      {typeof window !== 'undefined' && window.Remotion ? (
        <Player
          ref={playerRef}
          component={AirbnbDemo}
          durationInFrames={totalFrames_A8B9C2D3}
          compositionWidth={375}
          compositionHeight={812}
          fps={30}
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
          controls={false}
          loop={true}
          autoPlay={true}
          showVolumeControls={false}
          allowFullscreen={false}
          clickToPlay={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onFrame={setCurrentFrame}
        />
      ) : (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full">
          <p className="text-gray-600 text-sm">Loading player...</p>
        </div>
      )}
    </div>
  );
} 