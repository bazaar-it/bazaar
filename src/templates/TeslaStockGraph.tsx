import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';
import React from 'react';

const Graph: React.FC<{
  progress: number;
}> = ({ progress }) => {
  const { width, height } = useVideoConfig();
  
  const stockData = [
    { date: 'Apr 1', price: 267.41 },
    { date: 'Apr 2', price: 275.93 },
    { date: 'Apr 3', price: 269.79 },
    { date: 'Apr 4', price: 262.15 },
    { date: 'Apr 7', price: 258.89 },
    { date: 'Apr 8', price: 260.38 },
    { date: 'Apr 9', price: 271.61 },
    { date: 'Apr 10', price: 267.96 },
    { date: 'Apr 11', price: 278.93 },
    { date: 'Apr 14', price: 274.44 },
    { date: 'Apr 15', price: 282.96 },
    { date: 'Apr 16', price: 277.48 },
    { date: 'Apr 17', price: 285.00 },
    { date: 'Apr 21', price: 279.51 },
    { date: 'Apr 22', price: 290.38 },
    { date: 'Apr 23', price: 292.03 },
  ];

  const maxPrice = Math.max(...stockData.map(d => d.price));
  const minPrice = Math.min(...stockData.map(d => d.price));
  const paddedMaxPrice = maxPrice + (maxPrice - minPrice) * 0.05;
  const paddedMinPrice = minPrice - (maxPrice - minPrice) * 0.05;

  const points = stockData.map((data, i) => ({
    x: interpolate(i, [0, stockData.length - 1], [width * 0.1, width * 0.9]),
    y: interpolate(data.price, [paddedMinPrice, paddedMaxPrice], [height * 0.85, height * 0.15]),
    price: data.price,
  }));

  const numSegments = points.length - 1;
  const currentSegment = progress * numSegments;
  const segmentIndex = Math.floor(currentSegment);
  const segmentProgress = currentSegment - segmentIndex;

  const currentPoint = points[Math.min(segmentIndex, points.length - 1)]!;
  const nextPoint = points[Math.min(segmentIndex + 1, points.length - 1)]!;

  const currentX = interpolate(segmentProgress, [0, 1], [currentPoint.x, nextPoint.x]);
  const currentY = interpolate(segmentProgress, [0, 1], [currentPoint.y, nextPoint.y]);
  const currentPrice = interpolate(segmentProgress, [0, 1], [currentPoint.price, nextPoint.price]);

  const visiblePoints = [
    ...points.slice(0, segmentIndex + 1),
    { x: currentX, y: currentY, price: currentPrice }
  ];

  function createSmoothPath(points: Array<{x: number, y: number, price: number}>) {
    if (points.length < 2) return '';
    let path = `M ${points[0]?.x || 0} ${points[0]?.y || 0}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (!prev || !curr) continue;
      const c1x = prev.x + (curr.x - prev.x) * 0.5;
      const c1y = prev.y;
      const c2x = curr.x - (curr.x - prev.x) * 0.5;
      const c2y = curr.y;
      path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  }

  const pathD = createSmoothPath(visiblePoints);

  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`grid-${i}`}
          x1={width * 0.1}
          y1={height * 0.15 + i * (height * 0.7) / 7}
          x2={width * 0.9}
          y2={height * 0.15 + i * (height * 0.7) / 7}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const price = interpolate(i, [0, 7], [paddedMaxPrice, paddedMinPrice]);
        return (
          <text
            key={`price-${i}`}
            x={width * 0.08}
            y={height * 0.15 + i * (height * 0.7) / 7}
            fill="white"
            fontSize="14"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            ${price.toFixed(2)}
          </text>
        );
      })}
      {stockData.map((data, i) => (
        <text
          key={`date-${i}`}
          x={interpolate(i, [0, stockData.length - 1], [width * 0.1, width * 0.9])}
          y={height * 0.9}
          fill="white"
          fontSize="14"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          textAnchor="middle"
        >
          {data.date}
        </text>
      ))}
      <path
        d={pathD}
        fill="none"
        stroke="#FF3B30"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.3))' }}
      />
      {progress > 0 && (
        <g>
          <circle
            cx={currentX}
            cy={currentY}
            r="6"
            fill="#FF3B30"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.5))' }}
          />
          <text
            x={currentX}
            y={currentY - 20}
            fill="white"
            fontSize="16"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            fontWeight="500"
            textAnchor="middle"
          >
            ${currentPrice.toFixed(2)}
          </text>
        </g>
      )}
    </>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const opacity = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 }
  });
  
  return (
    <text
      x={width / 2}
      y={height * 0.07}
      fill="white"
      fontSize="32"
      fontFamily="Inter, system-ui, -apple-system, sans-serif"
      fontWeight="700"
      textAnchor="middle"
      opacity={opacity}
    >
      Tesla Stock Price - April 2025
    </text>
  );
};

const TeslaStockGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const progress = Math.min(frame / 150, 1);

  return (
    <AbsoluteFill style={{ background: '#1C1C1E' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <Title />
        <Graph progress={progress} />
      </svg>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'tesla-stock-graph',
  name: 'Tesla Stock Graph',
  duration: 180,
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

export default function TeslaStockGraph() {
  const stockData = [
    { date: 'Apr 1', price: 267.41 },
    { date: 'Apr 2', price: 275.93 },
    { date: 'Apr 3', price: 269.79 },
    { date: 'Apr 4', price: 262.15 },
    { date: 'Apr 7', price: 258.89 },
    { date: 'Apr 8', price: 260.38 },
    { date: 'Apr 9', price: 271.61 },
    { date: 'Apr 10', price: 267.96 },
    { date: 'Apr 11', price: 278.93 },
    { date: 'Apr 14', price: 274.44 },
    { date: 'Apr 15', price: 282.96 },
    { date: 'Apr 16', price: 277.48 },
    { date: 'Apr 17', price: 285.00 },
    { date: 'Apr 21', price: 279.51 },
    { date: 'Apr 22', price: 290.38 },
    { date: 'Apr 23', price: 292.03 },
  ];

  const { width, height } = useVideoConfig();

  function Graph({ progress }) {
    const maxPrice = Math.max(...stockData.map(d => d.price));
    const minPrice = Math.min(...stockData.map(d => d.price));
    const paddedMaxPrice = maxPrice + (maxPrice - minPrice) * 0.05;
    const paddedMinPrice = minPrice - (maxPrice - minPrice) * 0.05;

    const points = stockData.map((data, i) => ({
      x: interpolate(i, [0, stockData.length - 1], [width * 0.1, width * 0.9]),
      y: interpolate(data.price, [paddedMinPrice, paddedMaxPrice], [height * 0.85, height * 0.15]),
      price: data.price,
    }));

    const numSegments = points.length - 1;
    const currentSegment = progress * numSegments;
    const segmentIndex = Math.floor(currentSegment);
    const segmentProgress = currentSegment - segmentIndex;

    const currentPoint = points[Math.min(segmentIndex, points.length - 1)]!;
    const nextPoint = points[Math.min(segmentIndex + 1, points.length - 1)]!;

    const currentX = interpolate(segmentProgress, [0, 1], [currentPoint.x, nextPoint.x]);
    const currentY = interpolate(segmentProgress, [0, 1], [currentPoint.y, nextPoint.y]);
    const currentPrice = interpolate(segmentProgress, [0, 1], [currentPoint.price, nextPoint.price]);

    const visiblePoints = [
      ...points.slice(0, segmentIndex + 1),
      { x: currentX, y: currentY, price: currentPrice }
    ];

    function createSmoothPath(points) {
      if (points.length < 2) return '';
      let path = \`M \${points[0]?.x || 0} \${points[0]?.y || 0}\`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        if (!prev || !curr) continue;
        const c1x = prev.x + (curr.x - prev.x) * 0.5;
        const c1y = prev.y;
        const c2x = curr.x - (curr.x - prev.x) * 0.5;
        const c2y = curr.y;
        path += \` C \${c1x} \${c1y}, \${c2x} \${c2y}, \${curr.x} \${curr.y}\`;
      }
      return path;
    }

    const pathD = createSmoothPath(visiblePoints);

    return (
      <>
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={\`grid-\${i}\`}
            x1={width * 0.1}
            y1={height * 0.15 + i * (height * 0.7) / 7}
            x2={width * 0.9}
            y2={height * 0.15 + i * (height * 0.7) / 7}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => {
          const price = interpolate(i, [0, 7], [paddedMaxPrice, paddedMinPrice]);
          return (
            <text
              key={\`price-\${i}\`}
              x={width * 0.08}
              y={height * 0.15 + i * (height * 0.7) / 7}
              fill="white"
              fontSize="14"
              fontFamily="Inter, system-ui, -apple-system, sans-serif"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              \${price.toFixed(2)}
            </text>
          );
        })}
        {stockData.map((data, i) => (
          <text
            key={\`date-\${i}\`}
            x={interpolate(i, [0, stockData.length - 1], [width * 0.1, width * 0.9])}
            y={height * 0.9}
            fill="white"
            fontSize="14"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            textAnchor="middle"
          >
            {data.date}
          </text>
        ))}
        <path
          d={pathD}
          fill="none"
          stroke="#FF3B30"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.3))' }}
        />
        {progress > 0 && (
          <g>
            <circle
              cx={currentX}
              cy={currentY}
              r="6"
              fill="#FF3B30"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.5))' }}
            />
            <text
              x={currentX}
              y={currentY - 20}
              fill="white"
              fontSize="16"
              fontFamily="Inter, system-ui, -apple-system, sans-serif"
              fontWeight="500"
              textAnchor="middle"
            >
              \${currentPrice.toFixed(2)}
            </text>
          </g>
        )}
      </>
    );
  }

  function Title() {
    const frame = useCurrentFrame();
    const opacity = spring({
      frame,
      fps: 30,
      config: { damping: 12, stiffness: 100 }
    });
    return (
      <text
        x={width / 2}
        y={height * 0.07}
        fill="white"
        fontSize="32"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="700"
        textAnchor="middle"
        opacity={opacity}
      >
        Tesla Stock Price - April 2025
      </text>
    );
  }

  const frame = useCurrentFrame();
  const progress = Math.min(frame / 150, 1);

  return (
    <AbsoluteFill style={{ background: '#1C1C1E' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <Title />
        <Graph progress={progress} />
      </svg>
    </AbsoluteFill>
  );
}`,
};

export default TeslaStockGraph; 