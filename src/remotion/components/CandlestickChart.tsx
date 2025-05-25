import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";

// Props interface for the CandlestickChart component
interface CandlestickChartProps {
  ohlc: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    dates: string[];
  };
  companyName: string;
  symbol: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  ohlc,
  companyName,
  symbol
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  
  // Extract the data
  const { open, high, low, close, dates } = ohlc;
  
  // Calculate min and max price for scaling
  const minPrice = Math.min(...low) * 0.95; // Add a little padding
  const maxPrice = Math.max(...high) * 1.05;
  const priceRange = maxPrice - minPrice;
  
  // Calculate dimensions and margins
  const margin = {
    top: 120,
    right: 80,
    bottom: 120,
    left: 80,
  };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;
  
  // Calculate animation progress
  const animationProgress = interpolate(
    frame,
    [0, durationInFrames * 0.7],
    [0, 1],
    {
      extrapolateRight: "clamp",
    }
  );
  
  // Calculate the number of candles to show based on animation progress
  const candlesToShow = Math.ceil(open.length * animationProgress);
  
  // Slice the data based on animation progress
  const visibleOpen = open.slice(0, candlesToShow);
  const visibleHigh = high.slice(0, candlesToShow);
  const visibleLow = low.slice(0, candlesToShow);
  const visibleClose = close.slice(0, candlesToShow);
  const visibleDates = dates.slice(0, candlesToShow);
  
  // Title animation
  const titleOpacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    {
      extrapolateRight: "clamp",
    }
  );
  
  // Helper function to calculate Y position (inverted)
  const getYPosition = (price: number) => {
    return graphHeight - ((price - minPrice) / priceRange) * graphHeight;
  };
  
  // Helper function to check if candle is bullish (close > open)
  const isBullish = (openPrice: number, closePrice: number) => {
    return closePrice >= openPrice;
  };
  
  // Safe access to first and last dates with fallbacks
  const firstDate = visibleDates.length > 0 ? visibleDates[0] : '';
  const lastDate = visibleDates.length > 0 ? visibleDates[visibleDates.length - 1] : '';
  
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: margin.top / 2,
          left: 0,
          width: "100%",
          textAlign: "center",
          opacity: titleOpacity,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 48, margin: 0 }}>
          {companyName} ({symbol}) - {firstDate} to {lastDate}
        </h1>
      </div>
      
      {/* Graph */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height }}>
        <svg width={width} height={height}>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Y-axis lines and labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = graphHeight - graphHeight * ratio;
              const price = minPrice + priceRange * ratio;
              
              // Animate grid lines and labels
              const lineOpacity = interpolate(
                frame,
                [5 + ratio * 10, 15 + ratio * 10],
                [0, 0.2],
                {
                  extrapolateRight: "clamp",
                }
              );
              
              const textOpacity = interpolate(
                frame,
                [10 + ratio * 10, 20 + ratio * 10],
                [0, 0.7],
                {
                  extrapolateRight: "clamp",
                }
              );
              
              return (
                <React.Fragment key={`y-${ratio}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={graphWidth}
                    y2={y}
                    stroke="#ccc"
                    strokeDasharray="5,5"
                    opacity={lineOpacity}
                  />
                  <text
                    x={-10}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="#666"
                    fontSize={18}
                    opacity={textOpacity}
                  >
                    ${price.toFixed(2)}
                  </text>
                </React.Fragment>
              );
            })}
            
            {/* X-axis labels (dates) */}
            {visibleDates.filter((_, i) => i % Math.ceil(dates.length / 5) === 0 || i === dates.length - 1).map((date, i, filteredDates) => {
              const index = dates.indexOf(date);
              const x = (index / (dates.length - 1)) * graphWidth;
              
              // Animate date labels with a slight delay based on index
              const textOpacity = interpolate(
                frame,
                [30 + i * 5, 40 + i * 5],
                [0, 0.7],
                {
                  extrapolateRight: "clamp",
                }
              );
              
              return (
                <React.Fragment key={`x-${date}`}>
                  <line
                    x1={x}
                    y1={graphHeight}
                    x2={x}
                    y2={graphHeight + 5}
                    stroke="#666"
                    opacity={textOpacity}
                  />
                  <text
                    x={x}
                    y={graphHeight + 25}
                    textAnchor="middle"
                    fill="#666"
                    fontSize={18}
                    opacity={textOpacity}
                  >
                    {date}
                  </text>
                </React.Fragment>
              );
            })}
            
            {/* Candlesticks */}
            {visibleOpen.map((openPrice, i) => {
              // Safely access values with nullish coalescing to provide defaults
              const closePrice = visibleClose[i] ?? openPrice;
              const highPrice = visibleHigh[i] ?? Math.max(openPrice, closePrice);
              const lowPrice = visibleLow[i] ?? Math.min(openPrice, closePrice);
              const bullish = isBullish(openPrice, closePrice);
              
              // Calculate positions
              const x = (i / Math.max(open.length - 1, 1)) * graphWidth;
              const candleWidth = Math.min(graphWidth / open.length * 0.7, 16);
              
              const openY = getYPosition(openPrice);
              const closeY = getYPosition(closePrice);
              const highY = getYPosition(highPrice);
              const lowY = getYPosition(lowPrice);
              
              // Get candle body dimensions
              const candleTop = Math.min(openY, closeY);
              const candleBottom = Math.max(openY, closeY);
              const candleHeight = Math.max(Math.abs(closeY - openY), 1); // Ensure at least 1px height
              
              // Animate candle appearance
              const candleOpacity = interpolate(
                frame,
                [i * 2, i * 2 + 10],
                [0, 1],
                {
                  extrapolateRight: "clamp",
                }
              );
              
              return (
                <g key={i} opacity={candleOpacity}>
                  {/* Wick (high to low line) */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={bullish ? "#34D399" : "#F87171"}
                    strokeWidth={1}
                  />
                  
                  {/* Candle Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={candleTop}
                    width={candleWidth}
                    height={candleHeight}
                    fill={bullish ? "#34D399" : "#F87171"}
                    stroke={bullish ? "#34D399" : "#F87171"}
                    strokeWidth={1}
                  />
                </g>
              );
            })}
            
            {/* Volume Bars (subtle, at the bottom) */}
            {visibleOpen.map((openPrice, i) => {
              // Safely access values with nullish coalescing
              const closePrice = visibleClose[i] ?? openPrice;
              const bullish = isBullish(openPrice, closePrice);
              
              // Calculate position and dimensions
              const x = (i / Math.max(open.length - 1, 1)) * graphWidth;
              const barWidth = Math.min(graphWidth / open.length * 0.7, 16);
              
              // Normalize volume for display (use bottom 10% of graph)
              const maxVolume = Math.max(...ohlc.close.filter(v => v !== undefined) as number[]);
              const volumeHeight = ((closePrice || 0) / maxVolume) * (graphHeight * 0.1);
              
              // Animate volume bar appearance
              const volumeOpacity = interpolate(
                frame,
                [i * 2, i * 2 + 10],
                [0, 0.3],
                {
                  extrapolateRight: "clamp",
                }
              );
              
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barWidth / 2}
                  y={graphHeight - volumeHeight}
                  width={barWidth}
                  height={volumeHeight}
                  fill={bullish ? "#34D399" : "#F87171"}
                  opacity={volumeOpacity}
                />
              );
            })}
            
            {/* Legend */}
            <g transform={`translate(${graphWidth - 150}, 30)`}>
              <rect
                x={0}
                y={0}
                width={140}
                height={75}
                fill="white"
                fillOpacity={0.8}
                stroke="#ccc"
                strokeWidth={1}
                rx={4}
                ry={4}
                opacity={interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" })}
              />
              
              {/* Bullish sample */}
              <g transform="translate(10, 20)" opacity={interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" })}>
                <line x1={7} y1={0} x2={7} y2={30} stroke="#34D399" strokeWidth={1} />
                <rect x={0} y={10} width={14} height={14} fill="#34D399" />
                <text x={20} y={21} fill="#333" fontSize={16}>Bullish</text>
              </g>
              
              {/* Bearish sample */}
              <g transform="translate(80, 20)" opacity={interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" })}>
                <line x1={7} y1={0} x2={7} y2={30} stroke="#F87171" strokeWidth={1} />
                <rect x={0} y={10} width={14} height={14} fill="#F87171" />
                <text x={20} y={21} fill="#333" fontSize={16}>Bearish</text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
}; 