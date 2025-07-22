"use client";
import React, { useEffect, useRef, useState } from 'react';

const MarketingElementPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 180); // 6 second loop at 30fps
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const ElementAnimation: React.FC = () => {
    const frame = currentFrame;
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number]) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      const progress = Math.max(0, Math.min(1, (frame - inputMin) / (inputMax - inputMin)));
      return outputMin + progress * (outputRange[1] - outputRange[0]);
    };

    const spring = (frame: number, delay: number = 0) => {
      const adjustedFrame = Math.max(0, frame - delay);
      if (adjustedFrame <= 0) return 0;
      const progress = Math.min(1, adjustedFrame / 30);
      return 1 - Math.exp(-progress * 6) * Math.cos(progress * 12);
    };
    
    return (
      <div
        style={{
          background: "#F9FAFB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          minHeight: "400px",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "700px",
            height: "400px",
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              opacity: interpolate(frame, [10, 30], [0, 1]),
              transform: `translateY(${interpolate(frame, [10, 30], [20, 0])}px)`,
            }}
          >
            Modern UI Elements
          </div>
          
          {/* Button Row */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            {/* Primary Button */}
            <div
              style={{
                transform: `scale(${spring(frame, 40)}) translateY(${interpolate(frame, [40, 60], [30, 0])}px)`,
                opacity: interpolate(frame, [40, 60], [0, 1]),
              }}
            >
              <button
                style={{
                  background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
                  cursor: "pointer",
                }}
              >
                Get Started
              </button>
            </div>
            
            {/* Secondary Button */}
            <div
              style={{
                transform: `scale(${spring(frame, 50)}) translateY(${interpolate(frame, [50, 70], [30, 0])}px)`,
                opacity: interpolate(frame, [50, 70], [0, 1]),
              }}
            >
              <button
                style={{
                  background: "transparent",
                  color: "#6B7280",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "2px solid #E5E7EB",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Learn More
              </button>
            </div>
          </div>
          
          {/* Input Field */}
          <div
            style={{
              transform: `translateX(${interpolate(frame, [60, 80], [-50, 0])}px)`,
              opacity: interpolate(frame, [60, 80], [0, 1]),
            }}
          >
            <div
              style={{
                position: "relative",
                width: "400px",
              }}
            >
              <input
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #E5E7EB",
                  borderRadius: "12px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                  background: "#FFFFFF",
                }}
                placeholder="Enter your email address"
                readOnly
              />
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "8px",
                  height: "8px",
                  background: "#10B981",
                  borderRadius: "50%",
                  opacity: interpolate(frame, [100, 120], [0, 1]),
                }}
              />
            </div>
          </div>
          
          {/* Card Elements */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: "140px",
                  height: "100px",
                  background: `linear-gradient(135deg, ${
                    index === 0 ? '#FF6B6B, #FF8E8E' :
                    index === 1 ? '#4ECDC4, #71E5DC' :
                    '#FFE66D, #FFE89A'
                  })`,
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transform: `scale(${spring(frame, 90 + index * 10)}) rotateY(${interpolate(frame, [90 + index * 10, 110 + index * 10], [90, 0])}deg)`,
                  opacity: interpolate(frame, [90 + index * 10, 110 + index * 10], [0, 1]),
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    background: "rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                  }}
                />
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {index === 0 ? 'Analytics' : index === 1 ? 'Users' : 'Revenue'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        aspectRatio: '16/9',
        background: '#F9FAFB',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}
    >
      <ElementAnimation />
    </div>
  );
};

export default MarketingElementPlayer; 