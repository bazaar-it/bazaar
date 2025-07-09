"use client";
import React, { useEffect, useRef, useState } from 'react';

const MarketingComponentPlayer: React.FC = () => {
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

  const ComponentAnimation: React.FC = () => {
    const frame = currentFrame;
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number]) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      const progress = Math.max(0, Math.min(1, (frame - inputMin) / (inputMax - inputMin)));
      return outputMin + progress * (outputMax - outputMin);
    };

    const slideIn = (frame: number, delay: number, direction: 'left' | 'right' | 'top' | 'bottom' = 'left') => {
      const startFrame = delay;
      const endFrame = delay + 30;
      const progress = interpolate(frame, [startFrame, endFrame], [0, 1]);
      
      switch (direction) {
        case 'left': return { transform: `translateX(${interpolate(frame, [startFrame, endFrame], [-100, 0])}%)`, opacity: progress };
        case 'right': return { transform: `translateX(${interpolate(frame, [startFrame, endFrame], [100, 0])}%)`, opacity: progress };
        case 'top': return { transform: `translateY(${interpolate(frame, [startFrame, endFrame], [-100, 0])}%)`, opacity: progress };
        case 'bottom': return { transform: `translateY(${interpolate(frame, [startFrame, endFrame], [100, 0])}%)`, opacity: progress };
      }
    };
    
    return (
      <div
        style={{
          background: "#F3F4F6",
          display: "flex",
          width: "100%",
          height: "100%",
          minHeight: "400px",
          position: "relative",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "240px",
            background: "#1F2937",
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            ...slideIn(frame, 10, 'left'),
          }}
        >
          {/* Logo */}
          <div
            style={{
              color: "white",
              fontSize: "20px",
              fontWeight: "700",
              marginBottom: "32px",
              opacity: interpolate(frame, [30, 50], [0, 1]),
            }}
          >
            Dashboard
          </div>
          
          {/* Navigation Items */}
          {['Overview', 'Analytics', 'Users', 'Settings'].map((item, index) => (
            <div
              key={item}
              style={{
                color: index === 0 ? "#60A5FA" : "#9CA3AF",
                fontSize: "16px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: index === 0 ? "rgba(96, 165, 250, 0.1)" : "transparent",
                marginBottom: "8px",
                ...slideIn(frame, 40 + index * 10, 'left'),
              }}
            >
              {item}
            </div>
          ))}
        </div>
        
        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
          }}
        >
          {/* Header */}
          <div
            style={{
              height: "80px",
              background: "#FFFFFF",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px",
              ...slideIn(frame, 20, 'top'),
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
                opacity: interpolate(frame, [50, 70], [0, 1]),
              }}
            >
              Welcome back, John
            </div>
            
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                opacity: interpolate(frame, [60, 80], [0, 1]),
                transform: `scale(${interpolate(frame, [60, 80], [0.5, 1])})`,
              }}
            />
          </div>
          
          {/* Content Area */}
          <div
            style={{
              flex: 1,
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Stats Cards */}
            <div
              style={{
                display: "flex",
                gap: "20px",
              }}
            >
              {[
                { title: "Total Users", value: "2,847", color: "#3B82F6" },
                { title: "Revenue", value: "$12,847", color: "#10B981" },
                { title: "Growth", value: "+23%", color: "#F59E0B" },
              ].map((stat, index) => (
                <div
                  key={stat.title}
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    padding: "24px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #E5E7EB",
                    ...slideIn(frame, 80 + index * 15, 'bottom'),
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6B7280",
                      marginBottom: "8px",
                      opacity: interpolate(frame, [100 + index * 15, 120 + index * 15], [0, 1]),
                    }}
                  >
                    {stat.title}
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: stat.color,
                      opacity: interpolate(frame, [110 + index * 15, 130 + index * 15], [0, 1]),
                      transform: `translateY(${interpolate(frame, [110 + index * 15, 130 + index * 15], [20, 0])}px)`,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Modal Overlay */}
            {frame > 140 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: interpolate(frame, [140, 160], [0, 1]),
                }}
              >
                <div
                  style={{
                    width: "400px",
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "32px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                    transform: `scale(${interpolate(frame, [140, 160], [0.8, 1])}) translateY(${interpolate(frame, [140, 160], [50, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "16px",
                    }}
                  >
                    New Feature Available!
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#6B7280",
                      marginBottom: "24px",
                    }}
                  >
                    Check out our latest dashboard improvements.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        background: "transparent",
                        color: "#6B7280",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Later
                    </button>
                    <button
                      style={{
                        padding: "8px 16px",
                        background: "#3B82F6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Show Me
                    </button>
                  </div>
                </div>
              </div>
            )}
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
        background: '#F3F4F6',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}
    >
      <ComponentAnimation />
    </div>
  );
};

export default MarketingComponentPlayer; 