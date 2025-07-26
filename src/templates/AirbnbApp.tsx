// src/templates/AirbnbApp.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
} from 'remotion';

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

// High quality premium home images for Yucca Valley
const swipeImages = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
];

let accumulatedFrames_A8B9C2D3 = 0;
const sequences_A8B9C2D3: any[] = [];

script_A8B9C2D3.forEach((item, index) => {
  sequences_A8B9C2D3.push({
    ...item,
    start: accumulatedFrames_A8B9C2D3,
    end: accumulatedFrames_A8B9C2D3 + item.frames
  });
  accumulatedFrames_A8B9C2D3 += item.frames;
});

const totalFrames_A8B9C2D3 = script_A8B9C2D3.reduce((sum, item) => sum + item.frames, 0);

export default function AirbnbApp() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Both logo and tagline scale up together from frame 0
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

  // Enhanced swipe interaction
  const swipeStartFrame = sequences_A8B9C2D3[11].start;
  const swipeDuration = 50;
  
  const totalSwipeProgress = interpolate(
    frame,
    [swipeStartFrame, swipeStartFrame + 150],
    [0, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const currentSwipeIndex = Math.floor(totalSwipeProgress);
  const swipeLocalProgress = totalSwipeProgress % 1;
  
  const swipeEasing = interpolate(
    frame - (swipeStartFrame + currentSwipeIndex * 50),
    [0, 50],
    [0, 1],
    { 
      extrapolateLeft: "clamp", 
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t)
    }
  );
  
  const isInTransition = swipeLocalProgress > 0 && swipeLocalProgress < 1;
  const easedProgress = isInTransition ? swipeEasing : (swipeLocalProgress >= 1 ? 1 : 0);
  
  const mainImageOffset = interpolate(
    easedProgress,
    [0, 1],
    [0, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const parallaxDelay = 0.1;
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
  
  const currentImageIndex = currentSwipeIndex % 4;
  const nextImageIndex = (currentSwipeIndex + 1) % 4;

  // Status bar animations
  const statusBarAnimationStart = sequences_A8B9C2D3[12].start;
  
  const timeProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const times = ["9:41", "9:42", "9:43", "9:44"];
  const currentTimeIndex = Math.floor(timeProgress * 3);
  const currentTime = times[Math.min(currentTimeIndex, 3)];
  
  const batteryProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 180],
    [1, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Calculate responsive phone dimensions
  const phoneWidth = Math.min(width, height * 0.46);
  const phoneHeight = phoneWidth * 2.16;
  const phoneScaleFactor = Math.min(width / 375, height / 812);

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive logo sizing based on format
  const logoSize = isPortrait ? width * 0.15 : isSquare ? width * 0.18 : width * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Splash Screen Background */}
      {frame >= sequences_A8B9C2D3[0].start && frame < sequences_A8B9C2D3[2].end && (
        <AbsoluteFill style={{ backgroundColor: "#FF385C", borderRadius: "20px" }} />
      )}

      {/* Airbnb Logo */}
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
          {/* Use proper Airbnb logo with responsive sizing */}
          {typeof window !== 'undefined' && window.IconifyIcon ? (
            <window.IconifyIcon 
              icon="simple-icons:airbnb" 
              style={{
                fontSize: `${logoSize}px`,
                color: "white"
              }}
            />
          ) : (
            // Fallback for cases where IconifyIcon isn't available
            <div style={{
              fontSize: `${logoSize}px`,
              color: "white",
              fontWeight: "bold",
              fontFamily: "Arial, sans-serif"
            }}>
              airbnb
            </div>
          )}
        </div>
      )}

      {/* Tagline */}
      {frame >= 0 && frame < sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoAndTaglineScale})`,
          color: "white",
          fontSize: `${width * 0.08}px`,
          fontFamily: "Inter, sans-serif",
          fontWeight: "400",
          width: "80%",
          textAlign: "center"
        }}>
          Belong Anywhere
        </div>
      )}

      {/* iPhone Frame */}
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
            
            {/* Status Bar */}
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
                fontFamily: "Inter, sans-serif",
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
                </div>
              </div>
            </div>

            {/* Search Header */}
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
                  <div>
                    <div style={{
                      fontSize: "18px",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "600",
                      color: "#000000"
                    }}>
                      Joshua Tree
                    </div>
                    <div style={{
                      fontSize: "14px",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "400",
                      color: "#666666"
                    }}>
                      Dec 11 - 14 • 2 guests
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Listing Image */}
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
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden"
                }}>
                  {/* Current Image */}
                  <Img 
                    src={swipeImages[currentImageIndex] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
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
                  
                  {/* Incoming Image */}
                  {isInTransition && (
                    <Img 
                      src={swipeImages[nextImageIndex] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
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
                </div>
                
                {/* Guest Favorite Badge */}
                {frame >= sequences_A8B9C2D3[5].start && currentImageIndex === 0 && (
                  <div style={{
                    position: "absolute",
                    top: "15px",
                    left: "15px",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "8px 12px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "500",
                    color: "#000000",
                    transform: `scale(${guestFavoriteScale})`
                  }}>
                    Guest favorite
                  </div>
                )}

                {/* Image Dots */}
                <div style={{
                  position: "absolute",
                  bottom: "15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "6px"
                }}>
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
                  fontFamily: "Inter, sans-serif",
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
                  <div style={{ fontSize: "14px", color: "#FFD700" }}>★</div>
                  <span style={{
                    fontSize: "14px",
                    fontFamily: "Inter, sans-serif",
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
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "400",
                  color: "#666666",
                  marginBottom: "4px"
                }}>
                  Desert dream oasis with spa
                </div>
                <div style={{
                  fontSize: "16px",
                  fontFamily: "Inter, sans-serif",
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
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "600",
                  color: "#000000",
                  textDecoration: "underline"
                }}>
                  $782
                </span>
                <span style={{
                  fontSize: "16px",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "400",
                  color: "#666666",
                  marginLeft: "4px"
                }}>
                  total before taxes
                </span>
              </div>
            )}

            {/* Second Listing Preview */}
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
                  { label: "Explore", icon: "material-symbols:search", active: true },
                  { label: "Wishlists", icon: "material-symbols:favorite-outline", active: false },
                  { label: "Trips", icon: "material-symbols:home-outline", active: false },
                  { label: "Inbox", icon: "material-symbols:chat-outline", active: false },
                  { label: "Profile", icon: "material-symbols:person-outline", active: false }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {typeof window !== 'undefined' && window.IconifyIcon ? (
                      <window.IconifyIcon 
                        icon={item.icon} 
                        style={{ 
                          fontSize: "20px", 
                          color: item.active ? "#FF5A8A" : "#999999" 
                        }} 
                      />
                    ) : (
                      <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: item.active ? "#FF5A8A" : "#999999",
                        borderRadius: "2px"
                      }} />
                    )}
                    <div style={{
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
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
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'airbnb-app',
  name: 'Airbnb App',
  duration: totalFrames_A8B9C2D3, // Dynamic duration based on script
  previewFrame: 180, // Show during the main listing phase
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img } = window.Remotion;

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

const swipeImages = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
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

const totalFrames_A8B9C2D3 = script_A8B9C2D3.reduce((sum, item) => sum + item.frames, 0);

export default function AirbnbApp() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600"] });
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

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

  const swipeStartFrame = sequences_A8B9C2D3[11].start;
  const totalSwipeProgress = interpolate(
    frame,
    [swipeStartFrame, swipeStartFrame + 150],
    [0, 3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const currentSwipeIndex = Math.floor(totalSwipeProgress);
  const swipeLocalProgress = totalSwipeProgress % 1;
  
  const swipeEasing = interpolate(
    frame - (swipeStartFrame + currentSwipeIndex * 50),
    [0, 50],
    [0, 1],
    { 
      extrapolateLeft: "clamp", 
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t)
    }
  );
  
  const isInTransition = swipeLocalProgress > 0 && swipeLocalProgress < 1;
  const easedProgress = isInTransition ? swipeEasing : (swipeLocalProgress >= 1 ? 1 : 0);
  
  const mainImageOffset = interpolate(
    easedProgress,
    [0, 1],
    [0, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const parallaxDelay = 0.1;
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
  
  const currentImageIndex = currentSwipeIndex % 4;
  const nextImageIndex = (currentSwipeIndex + 1) % 4;

  const statusBarAnimationStart = sequences_A8B9C2D3[12].start;
  const timeProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const times = ["9:41", "9:42", "9:43", "9:44"];
  const currentTimeIndex = Math.floor(timeProgress * 3);
  const currentTime = times[Math.min(currentTimeIndex, 3)];
  
  const batteryProgress = interpolate(
    frame,
    [statusBarAnimationStart, statusBarAnimationStart + 180],
    [1, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const phoneWidth = Math.min(width, height * 0.46);
  const phoneHeight = phoneWidth * 2.16;
  const phoneScaleFactor = Math.min(width / 375, height / 812);

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive logo sizing based on format
  const logoSize = isPortrait ? width * 0.15 : isSquare ? width * 0.18 : width * 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {frame >= sequences_A8B9C2D3[0].start && frame < sequences_A8B9C2D3[2].end && (
        <AbsoluteFill style={{ backgroundColor: "#FF385C", borderRadius: "20px" }} />
      )}

      {frame >= 0 && frame < sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: \`translate(-50%, -50%) scale(\${logoAndTaglineScale})\`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80%"
        }}>
          <window.IconifyIcon 
            icon="simple-icons:airbnb" 
            style={{
              fontSize: \`\${logoSize}px\`,
              color: "white"
            }}
          />
        </div>
      )}

      {frame >= 0 && frame < sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: \`translate(-50%, -50%) scale(\${logoAndTaglineScale})\`,
          color: "white",
          fontSize: \`\${width * 0.08}px\`,
          fontFamily: "Inter",
          fontWeight: "400",
          width: "80%",
          textAlign: "center"
        }}>
          Belong Anywhere
        </div>
      )}

      {frame >= sequences_A8B9C2D3[2].end && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: \`translate(-50%, -50%) scale(\${phoneScaleFactor})\`,
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
                    width: \`\${batteryProgress * 100}%\`,
                    height: "8px",
                    backgroundColor: batteryProgress > 0.2 ? "#34C759" : "#FF3B30",
                    borderRadius: "1px",
                    margin: "1px"
                  }} />
                </div>
              </div>
            </div>

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
                transform: \`translateY(\${searchHeaderY}px)\`
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
              </div>
            )}

            {frame >= sequences_A8B9C2D3[4].start && (
              <div style={{
                position: "absolute",
                top: "160px",
                left: "20px",
                right: "20px",
                height: "300px",
                borderRadius: "12px",
                overflow: "hidden",
                transform: \`translateY(\${listingImageY}px)\`
              }}>
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden"
                }}>
                  <Img 
                    src={swipeImages[currentImageIndex]}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: \`translateX(\${mainImageOffset}%)\`
                    }}
                  />
                  
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
                        transform: \`translateX(\${incomingImageOffset}%)\`
                      }}
                    />
                  )}
                </div>
                
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
                    transform: \`scale(\${guestFavoriteScale})\`
                  }}>
                    Guest favorite
                  </div>
                )}

                <div style={{
                  position: "absolute",
                  bottom: "15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "6px"
                }}>
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

            {frame >= sequences_A8B9C2D3[8].start && (
              <div style={{
                position: "absolute",
                top: "560px",
                left: "20px",
                transform: \`scale(\${priceScale})\`,
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

            {frame >= sequences_A8B9C2D3[9].start && (
              <div style={{
                position: "absolute",
                top: "620px",
                left: "20px",
                right: "20px",
                height: "120px",
                borderRadius: "12px",
                transform: \`translateY(\${secondListingY}px)\`,
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
              </div>
            )}

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
                transform: \`translateY(\${bottomNavY}px)\`
              }}>
                {[
                  { label: "Explore", icon: "material-symbols:search", active: true },
                  { label: "Wishlists", icon: "material-symbols:favorite-outline", active: false },
                  { label: "Trips", icon: "material-symbols:home-outline", active: false },
                  { label: "Inbox", icon: "material-symbols:chat-outline", active: false },
                  { label: "Profile", icon: "material-symbols:person-outline", active: false }
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
}`
}; 