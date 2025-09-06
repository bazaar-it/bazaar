"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import airbnbIcon from '@iconify-icons/logos/airbnb';

const AirbnbVideoPlayerMobile: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTimestamp = 0;
    const targetFPS = 15; // Reduced FPS for mobile performance
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (isPlaying && timestamp - lastTimestamp >= frameInterval) {
        setCurrentFrame(prev => (prev + 1) % 300); // Shorter animation (10 seconds at 15fps)
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
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Simplified interpolation function
  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    const progress = (frame - inputMin) / (inputMax - inputMin);
    return outputMin + progress * (outputMax - outputMin);
  };

  // Simplified mobile-optimized Airbnb app component
  const MobileAirbnbApp: React.FC = () => {
    const frame = currentFrame;
    
    // Show logo for shorter time on mobile
    if (frame < 30) { // 2 seconds instead of 3
      const logoScale = interpolate(
        frame,
        [0, 15],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      return (
        <div style={{
          width: '300px', // Smaller for mobile
          height: '650px',
          background: '#FF5A5F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: '20px',
          overflow: 'hidden'
        }}>
          <div style={{
            transform: `scale(${logoScale})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Icon 
              icon={airbnbIcon} 
              style={{ 
                fontSize: '80px',
                color: 'white',
                marginBottom: '16px',
                filter: 'brightness(0) invert(1)'
              }} 
            />
            <div style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Belong Anywhere
            </div>
          </div>
        </div>
      );
    }

    // Simplified property listing view
    const adjustedFrame = frame - 30;
    
    // Simple fade-in for property cards
    const propertyOpacity = interpolate(
      adjustedFrame,
      [0, 30],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Static property data (no complex animations)
    const property = {
      title: "Desert Oasis in Yucca Valley",
      price: "$782",
      rating: "4.97",
      image: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=400"
    };

    return (
      <div style={{
        width: '300px',
        height: '650px',
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative'
      }}>
        {/* Simplified header */}
        <div style={{
          padding: '20px 16px 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{
            background: '#f7f7f7',
            borderRadius: '20px',
            padding: '12px 16px',
            fontSize: '14px',
            color: '#717171'
          }}>
            Joshua Tree • Dec 11-14 • 2 guests
          </div>
        </div>

        {/* Property card with simple fade-in */}
        <div style={{
          padding: '16px',
          opacity: propertyOpacity
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              height: '200px',
              background: `url(${property.image}) center/cover`,
              position: 'relative'
            }}>
              {/* Guest favorite badge */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                Guest favorite
              </div>
              
              {/* Heart icon */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '24px',
                height: '24px'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
            </div>
            
            <div style={{ padding: '12px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#222',
                marginBottom: '4px'
              }}>
                {property.title}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                <span>★</span>
                <span style={{ fontWeight: '600' }}>{property.rating}</span>
                <span style={{ color: '#717171' }}>(156)</span>
              </div>
              
              <div style={{
                fontSize: '14px',
                color: '#222'
              }}>
                <span style={{ fontWeight: '600' }}>{property.price}</span>
                <span style={{ color: '#717171' }}> total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Simplified bottom navigation */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '60px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#FF385C', fontWeight: '600' }}>Explore</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#717171' }}>Wishlists</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#717171' }}>Trips</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#717171' }}>Profile</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '400px',
      padding: '20px',
      gap: '20px'
    }}>
      <MobileAirbnbApp />
      <button
        onClick={togglePlayPause}
        style={{
          background: '#FF5A5F',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {isPlaying ? '⏸️' : '▶️'}
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};

export default AirbnbVideoPlayerMobile;
