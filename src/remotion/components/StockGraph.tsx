import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import "@fontsource/inter/700.css";

// Props interface for the StockGraph component
interface StockGraphProps {
  prices: number[];
  dates: string[];
  companyName: string;
  symbol?: string;
  highest?: number;
  lowest?: number;
}

const Line: React.FC<{
  points: { x: number; y: number; value: number }[];
  progress: number;
}> = ({ points, progress }) => {
  // Calculate visible points based on progress with high-resolution interpolation
  const totalPoints = points.length * 30; // 30 sub-points between each data point for smoother animation
  const visiblePoints = Math.floor(totalPoints * progress);
  
  // Generate interpolated points with cubic bezier interpolation
  const interpolatedPoints = React.useMemo(() => {
    const result = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      // Skip if either point is undefined
      if (!current || !next) continue;
      
      for (let j = 0; j < 30; j++) {
        const t = j / 30;
        // Cubic bezier interpolation for smoother curves
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        
        result.push({
          x: current.x * mt3 + 3 * (current.x + 50) * mt2 * t + 3 * (next.x - 50) * mt * t2 + next.x * t3,
          y: current.y * mt3 + 3 * current.y * mt2 * t + 3 * next.y * mt * t2 + next.y * t3,
          value: current.value + (next.value - current.value) * t,
        });
      }
    }
    
    // Add the final point if it exists
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      result.push(lastPoint);
    }
    
    return result;
  }, [points]);

  const currentPoints = interpolatedPoints.slice(0, visiblePoints + 1);

  // Create SVG path from points with smooth curve
  const path = currentPoints
    .map((point, i, arr) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      
      // Calculate control points for smooth curve
      const prev = arr[i - 1];
      if (!prev) return '';
      
      const tension = 0.2; // Reduced tension for smoother curves
      
      const cp1x = prev.x + (point.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = prev.x + (point.x - prev.x) * (1 - tension);
      const cp2y = point.y;
      
      return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    })
    .join(" ");

  // Current value indicator
  const currentPoint = currentPoints[currentPoints.length - 1];

  return (
    <>
      {/* Main line */}
      <path
        d={path}
        stroke="url(#lineGradient)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 20px rgba(255, 0, 0, 0.3))",
        }}
      />
      
      {/* Area fill under the line */}
      <path
        d={`${path} L ${currentPoint?.x ?? 0} 980 L ${points[0]?.x ?? 0} 980 Z`}
        fill="url(#areaGradient)"
        opacity={0.2}
      />

      {/* Current value indicator */}
      {currentPoint && (
        <g>
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="8"
            fill="#FF0000"
            style={{
              filter: "drop-shadow(0 0 10px rgba(255, 0, 0, 0.5))",
            }}
          />
          <text
            x={currentPoint.x}
            y={currentPoint.y - 20}
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontFamily="Inter, sans-serif"
            fontWeight="bold"
          >
            ${currentPoint.value.toFixed(2)}
          </text>
        </g>
      )}
    </>
  );
};

const Grid: React.FC<{
  opacity: number;
  minPrice: number;
  maxPrice: number;
  dataLength: number;
}> = ({ opacity, minPrice, maxPrice, dataLength }) => {
  // Generate price points for y-axis with proper formatting
  const pricePoints = Array.from({ length: 11 }, (_, i) => {
    const price = minPrice + (maxPrice - minPrice) * (i / 10);
    return price.toFixed(2);
  });

  // Calculate number of vertical grid lines based on data points
  // Limit the maximum number of lines to avoid overcrowding
  const gridLineCount = Math.min(Math.max(5, Math.floor(dataLength / 5)), 15);
  
  return (
    <g opacity={opacity}>
      {/* Vertical grid lines */}
      {Array.from({ length: gridLineCount + 1 }).map((_, i) => (
        <line
          key={`v-${i}`}
          x1={160 + (i * 1660) / gridLineCount}
          y1={100}
          x2={160 + (i * 1660) / gridLineCount}
          y2={980}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeDasharray="4 4"
        />
      ))}
      
      {/* Horizontal grid lines and price labels */}
      {pricePoints.reverse().map((price, i) => (
        <React.Fragment key={`h-${i}`}>
          <line
            x1={160}
            y1={100 + (i * 880) / 10}
            x2={1820}
            y2={100 + (i * 880) / 10}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeDasharray="4 4"
          />
          <text
            x={140}
            y={100 + (i * 880) / 10}
            textAnchor="end"
            alignmentBaseline="middle"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="16"
            fontFamily="Inter, sans-serif"
          >
            ${price}
          </text>
        </React.Fragment>
      ))}
    </g>
  );
};

const Axis: React.FC<{
  opacity: number;
  dates: string[];
}> = ({ opacity, dates }) => {
  const totalDates = dates.length;

  // Smart date distribution:
  // For small datasets (< 10), show all dates
  // For medium datasets (10-30), show every nth date
  // For large datasets (> 30), show only key dates (start, middle, end)
  const labelCount = totalDates <= 10 ? totalDates : 
                    totalDates <= 30 ? Math.min(10, Math.floor(totalDates / 3)) : 
                    Math.min(7, Math.floor(totalDates / 10));
  
  // Calculate which indices to show
  const uniqueIndices = React.useMemo(() => {
    if (totalDates <= 1) return [0];
    
    if (totalDates <= 10) {
      // For small datasets, show all dates
      return Array.from({ length: totalDates }, (_, i) => i);
    } else if (labelCount === 2) {
      // Show only first and last for extremely large datasets
      return [0, totalDates - 1];
    } else {
      // Show evenly distributed labels
      return Array.from({ length: labelCount }, (_, i) => 
        Math.round(i * (totalDates - 1) / (labelCount - 1))
      );
    }
  }, [totalDates, labelCount]);

  return (
    <g opacity={opacity}>
      {/* X-axis labels */}
      {uniqueIndices.map((index) => (
        <text
          key={`x-${index}`}
          x={160 + (index * 1660) / Math.max(1, totalDates - 1)}
          y={1020}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="16"
          fontFamily="Inter, sans-serif"
        >
          {dates[index]}
        </text>
      ))}
    </g>
  );
};

export const StockGraph: React.FC<StockGraphProps> = ({ 
  prices, 
  dates, 
  companyName,
  symbol,
  highest: propHighest,
  lowest: propLowest
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Validate data to prevent errors
  const validPrices = prices?.length > 0 ? prices : [100];
  const validDates = dates?.length > 0 ? dates : ["No Data"];

  // Calculate price range with padding
  const minPrice = propLowest ?? Math.min(...validPrices) * 0.95;
  const maxPrice = propHighest ?? Math.max(...validPrices) * 1.05;
  const priceRange = maxPrice - minPrice;

  // Calculate percentage change
  const firstPrice = validPrices[0] || 0;
  const lastPrice = validPrices[validPrices.length - 1] || 0;
  const percentChange = ((lastPrice - firstPrice) / Math.max(0.01, firstPrice)) * 100;
  
  // Convert stock data to points - now dynamically scaling across the full width
  const points = React.useMemo(() => {
    // Calculate the horizontal spacing based on data length
    const dataLength = validPrices.length;
    const horizontalSpacing = 1660 / Math.max(1, dataLength - 1); // Distribute points evenly, prevent division by zero
    
    return validPrices.map((price, i) => ({
      x: 160 + i * horizontalSpacing,
      y: 980 - ((price - minPrice) / priceRange * 880),
      value: price
    }));
  }, [validPrices, minPrice, priceRange]);

  // Animation progress with custom easing for consistent speed
  const progress = interpolate(
    frame,
    [0, durationInFrames * 0.8],
    [0, 1],
    {
      extrapolateRight: "clamp",
      easing: (t) => {
        // Custom easing: slow start, constant middle, smooth end
        return t < 0.1 ? 0 :
               t > 0.9 ? 1 :
               (t - 0.1) / 0.8;
      }
    }
  );

  // Elements fade in
  const fadeIn = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  // Stats animation
  const statsOpacity = interpolate(
    frame,
    [durationInFrames * 0.7, durationInFrames * 0.8],
    [0, 1],
    {
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "32px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            opacity: fadeIn,
            textAlign: "center",
            width: "100%",
            zIndex: 10,
          }}
        >
          {companyName} {symbol ? `(${symbol})` : ""} Stock Price
          <div style={{ 
            fontSize: "24px", 
            marginTop: "8px",
            color: percentChange >= 0 ? "#34D399" : "#F87171" 
          }}>
            {percentChange >= 0 ? "+" : ""}{percentChange.toFixed(2)}%
          </div>
        </div>

        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1920 1080" 
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF0000" />
              <stop offset="100%" stopColor="#FF4444" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF0000" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
            </linearGradient>
          </defs>

          <Grid opacity={fadeIn} minPrice={minPrice} maxPrice={maxPrice} dataLength={validPrices.length} />
          <Axis opacity={fadeIn} dates={validDates} />
          <Line points={points} progress={progress} />
        </svg>
        
        {/* Stats at the bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 60,
            opacity: statsOpacity,
            fontFamily: "Inter, sans-serif",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.6)", marginBottom: 4 }}>
              Opening Price
            </div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
              ${firstPrice.toFixed(2)}
            </div>
          </div>
          
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.6)", marginBottom: 4 }}>
              Current Price
            </div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: "bold",
              color: percentChange >= 0 ? "#34D399" : "#F87171"
            }}>
              ${lastPrice.toFixed(2)}
            </div>
          </div>
          
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.6)", marginBottom: 4 }}>
              Highest Price
            </div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
              ${maxPrice.toFixed(2)}
            </div>
          </div>
          
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.6)", marginBottom: 4 }}>
              Lowest Price
            </div>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
              ${minPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}; 