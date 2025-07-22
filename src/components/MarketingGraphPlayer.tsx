"use client";
import React, { useEffect, useRef, useState } from 'react';

const MarketingGraphPlayer: React.FC = () => {
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

  const GraphAnimation: React.FC = () => {
    const frame = currentFrame;
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number]) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      const progress = Math.max(0, Math.min(1, (frame - inputMin) / (inputMax - inputMin)));
      return outputMin + progress * (outputMax - outputMin);
    };

    // Data points for the graph
    const dataPoints = [20, 45, 35, 80, 60, 95, 75, 90];
    const maxValue = Math.max(...dataPoints);
    
    return (
      <div
        style={{
          background: "#FFFFFF",
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
            width: "600px",
            height: "300px",
            background: "#F8F9FA",
            borderRadius: "16px",
            padding: "30px",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
            position: "relative",
          }}
        >
          {/* Graph Title */}
          <div
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: "20px",
              opacity: interpolate(frame, [10, 30], [0, 1]),
            }}
          >
            Revenue Growth
          </div>
          
          {/* Y-axis labels */}
          <div
            style={{
              position: "absolute",
              left: "10px",
              top: "70px",
              height: "200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#6B7280",
              opacity: interpolate(frame, [20, 40], [0, 1]),
            }}
          >
            <span>100k</span>
            <span>75k</span>
            <span>50k</span>
            <span>25k</span>
            <span>0</span>
          </div>
          
          {/* Graph bars */}
          <div
            style={{
              display: "flex",
              alignItems: "end",
              height: "200px",
              marginLeft: "40px",
              marginTop: "10px",
              gap: "12px",
            }}
          >
            {dataPoints.map((value, index) => {
              const animationDelay = 40 + index * 10;
              const barHeight = interpolate(frame, [animationDelay, animationDelay + 20], [0, (value / maxValue) * 180]);
              
              return (
                <div
                  key={index}
                  style={{
                    width: "40px",
                    height: `${barHeight}px`,
                    background: `linear-gradient(to top, #3B82F6, #60A5FA)`,
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease",
                    position: "relative",
                  }}
                >
                  {/* Value label on top */}
                  {barHeight > 10 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-25px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "11px",
                        color: "#374151",
                        fontWeight: "500",
                        opacity: interpolate(frame, [animationDelay + 15, animationDelay + 25], [0, 1]),
                      }}
                    >
                      {value}k
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels */}
          <div
            style={{
              display: "flex",
              marginLeft: "40px",
              marginTop: "10px",
              gap: "12px",
              opacity: interpolate(frame, [30, 50], [0, 1]),
            }}
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month, index) => (
              <div
                key={index}
                style={{
                  width: "40px",
                  fontSize: "11px",
                  color: "#6B7280",
                  textAlign: "center",
                }}
              >
                {month}
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
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}
    >
      <GraphAnimation />
    </div>
  );
};

export default MarketingGraphPlayer; 