import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function CpuArchitecture() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timings - smoother with more frames
  const pathAnimationProgress = interpolate(frame, [0, 80], [100, 0], { extrapolateRight: 'clamp' });
  
  // Light orb positions - smoother animation over longer duration
  const lightProgress = interpolate(frame, [80, 170], [0, 1], { extrapolateLeft: 'clamp' });

  // Helper function to calculate exact path coordinates
  const getPathPoint = (pathSegments: Array<{x: number, y: number}>, progress: number) => {
    if (pathSegments.length === 0) return { x: 100, y: 50 }; // fallback to CPU center
    
    const totalSegments = pathSegments.length - 1;
    const segmentProgress = progress * totalSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const localProgress = segmentProgress - segmentIndex;
    
    if (segmentIndex >= totalSegments) {
      return pathSegments[pathSegments.length - 1];
    }
    
    const start = pathSegments[segmentIndex];
    const end = pathSegments[segmentIndex + 1];
    
    // Safety check for undefined values
    if (!start || !end) {
      return pathSegments[pathSegments.length - 1] || { x: 100, y: 50 };
    }
    
    return {
      x: start.x + (end.x - start.x) * localProgress,
      y: start.y + (end.y - start.y) * localProgress
    };
  };

  // Define exact path coordinates (END to START - toward CPU center)
  const pathCoordinates = {
    path1: [ // M 10 20 h 79.5 q 5 0 5 5 v 30 (REVERSED: end to start)
      { x: 94.5, y: 55 },   // End point (near CPU)
      { x: 94.5, y: 35 },   // Before vertical
      { x: 94.5, y: 25 },   // Curve end
      { x: 92, y: 22.5 },   // Curve middle
      { x: 89.5, y: 20 },   // Curve start
      { x: 50, y: 20 },     // Horizontal middle
      { x: 10, y: 20 }      // Start point
    ],
    path2: [ // M 180 10 h -69.7 q -5 0 -5 5 v 30 (REVERSED)
      { x: 105.3, y: 45 },  // End point (near CPU)
      { x: 105.3, y: 25 },  // Before vertical
      { x: 105.3, y: 15 },  // Curve end
      { x: 107.5, y: 12.5 }, // Curve middle
      { x: 110.3, y: 10 },  // Curve start
      { x: 145, y: 10 },    // Horizontal middle
      { x: 180, y: 10 }     // Start point
    ],
    path3: [ // M 130 20 v 21.8 q 0 5 -5 5 h -10 (REVERSED)
      { x: 115, y: 46.8 },  // End point (near CPU)
      { x: 120, y: 46.8 },  // Before horizontal
      { x: 125, y: 46.8 },  // Curve end
      { x: 127.5, y: 44 },  // Curve middle
      { x: 130, y: 41.8 },  // Curve start
      { x: 130, y: 30 },    // Vertical middle
      { x: 130, y: 20 }     // Start point
    ],
    path4: [ // M 170 80 v -21.8 q 0 -5 -5 -5 h -50 (REVERSED)
      { x: 115, y: 53.2 },  // End point (near CPU)
      { x: 140, y: 53.2 },  // Before horizontal
      { x: 165, y: 53.2 },  // Curve end
      { x: 167.5, y: 56 },  // Curve middle
      { x: 170, y: 58.2 },  // Curve start
      { x: 170, y: 69 },    // Vertical middle
      { x: 170, y: 80 }     // Start point
    ],
    path5: [ // M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20 (REVERSED)
      { x: 105.2, y: 60 },  // End point (near CPU)
      { x: 105.2, y: 70 },  // Before vertical
      { x: 105.2, y: 80 },  // Curve end
      { x: 107.5, y: 82.5 }, // Curve middle
      { x: 110.2, y: 85 },  // Curve start
      { x: 125, y: 85 },    // Horizontal
      { x: 145, y: 85 },    // Curve end
      { x: 147.5, y: 82.5 }, // Curve middle
      { x: 150, y: 80 },    // Curve start
      { x: 150, y: 72.5 },  // Vertical
      { x: 150, y: 70 },    // Curve end
      { x: 147.5, y: 67.5 }, // Curve middle
      { x: 145, y: 65 },    // Curve start
      { x: 140, y: 65 },    // Horizontal middle
      { x: 135, y: 65 }     // Start point
    ],
    path6: [ // M 94.8 95 v -36 (REVERSED - straight line)
      { x: 94.8, y: 59 },   // End point (near CPU)
      { x: 94.8, y: 70 },   // Middle points for smoother animation
      { x: 94.8, y: 80 },
      { x: 94.8, y: 90 },
      { x: 94.8, y: 95 }    // Start point
    ],
    path7: [ // M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14 (REVERSED)
      { x: 87, y: 53 },     // End point (near CPU)
      { x: 80, y: 53 },     // Before horizontal
      { x: 73, y: 53 },     // Curve end
      { x: 70.5, y: 55.5 }, // Curve middle
      { x: 68, y: 58 },     // Curve start
      { x: 68, y: 60 },     // Vertical
      { x: 68, y: 63 },     // Curve end
      { x: 70.5, y: 65.5 }, // Curve middle
      { x: 73, y: 68 },     // Curve start
      { x: 78, y: 68 },     // Horizontal
      { x: 83, y: 68 },     // Curve end
      { x: 85.5, y: 70.5 }, // Curve middle
      { x: 88, y: 73 },     // Curve start
      { x: 88, y: 80 },     // Vertical middle
      { x: 88, y: 88 }      // Start point
    ],
    path8: [ // M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20 (REVERSED)
      { x: 85, y: 46.5 },   // End point (near CPU)
      { x: 70, y: 46.5 },   // Before horizontal
      { x: 65, y: 46.5 },   // Curve end
      { x: 62.5, y: 44 },   // Curve middle
      { x: 60, y: 41.5 },   // Curve start
      { x: 60, y: 38 },     // Vertical
      { x: 60, y: 35 },     // Curve end
      { x: 57.5, y: 32.5 }, // Curve middle
      { x: 55, y: 30 },     // Curve start
      { x: 42.5, y: 30 },   // Horizontal middle
      { x: 30, y: 30 }      // Start point
    ]
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <svg
        width="90%"
        height="90%"
        viewBox="0 0 200 100"
        style={{ 
          filter: 'drop-shadow(0 0 20px rgba(0, 150, 255, 0.3))',
          maxWidth: '1200px',
          maxHeight: '600px',
        }}
      >
        {/* Animated Paths */}
        <g
          stroke="currentColor"
          fill="none"
          strokeWidth="0.3"
          style={{ color: '#444' }}
        >
          {/* Path 1 */}
          <path
            d="M 10 20 h 79.5 q 5 0 5 5 v 30"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 2 */}
          <path
            d="M 180 10 h -69.7 q -5 0 -5 5 v 30"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 3 */}
          <path
            d="M 130 20 v 21.8 q 0 5 -5 5 h -10"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 4 */}
          <path
            d="M 170 80 v -21.8 q 0 -5 -5 -5 h -50"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 5 */}
          <path
            d="M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -20"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 6 */}
          <path
            d="M 94.8 95 v -36"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 7 */}
          <path
            d="M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 14"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
          {/* Path 8 */}
          <path
            d="M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 20"
            strokeDasharray="100 100"
            strokeDashoffset={pathAnimationProgress}
            pathLength="100"
          />
        </g>

        {/* Traveling Light Orbs - Following EXACT mathematical coordinates from END to START */}
        {frame > 80 && (
          <>
            {/* Blue Light - Path 1 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path1, lightProgress);
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#blue-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t) // smooth ease in-out
                    }),
                  }}
                />
              );
            })()}
            
            {/* Yellow Light - Path 2 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path2, interpolate(lightProgress, [0, 1], [0.1, 1.1], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#yellow-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.1, 0.2, 0.8, 0.9], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* Pink Light - Path 3 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path3, interpolate(lightProgress, [0, 1], [0.2, 1.2], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#pink-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.2, 0.3, 0.7, 0.8], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* Green Light - Path 5 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path5, interpolate(lightProgress, [0, 1], [0.3, 1.3], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#green-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.3, 0.4, 0.6, 0.7], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* Orange Light - Path 6 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path6, interpolate(lightProgress, [0, 1], [0.4, 1.4], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#orange-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.4, 0.5, 0.6, 0.7], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* Cyan Light - Path 8 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path8, interpolate(lightProgress, [0, 1], [0.5, 1.5], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#cyan-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.5, 0.6, 0.8, 0.9], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* Purple Light - Path 7 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path7, interpolate(lightProgress, [0, 1], [0.6, 1.6], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#purple-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.6, 0.7, 0.9, 1], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}

            {/* White Light - Path 4 */}
            {(() => {
              const point = getPathPoint(pathCoordinates.path4, interpolate(lightProgress, [0, 1], [0.7, 1.7], { extrapolateRight: 'clamp' }));
              if (!point) return null;
              return (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="url(#white-gradient)"
                  style={{
                    filter: 'blur(1px)',
                    opacity: interpolate(lightProgress, [0.7, 0.8, 0.9, 1], [0, 1, 1, 0], {
                      easing: (t) => t * t * (3 - 2 * t)
                    }),
                  }}
                />
              );
            })()}
          </>
        )}

        {/* CPU Chip - Always visible */}
        <g>
          {/* CPU Connection Pins */}
          <g fill="#666">
            <rect x="93" y="37" width="2.5" height="5" rx="0.7" />
            <rect x="104" y="37" width="2.5" height="5" rx="0.7" />
            <rect x="116.3" y="44" width="2.5" height="5" rx="0.7" transform="rotate(90 117.55 46.5)" />
            <rect x="122.8" y="44" width="2.5" height="5" rx="0.7" transform="rotate(90 124.05 46.5)" />
            <rect x="104" y="58" width="2.5" height="5" rx="0.7" />
            <rect x="114.5" y="58" width="2.5" height="5" rx="0.7" />
            <rect x="80" y="44" width="2.5" height="5" rx="0.7" transform="rotate(270 81.25 46.5)" />
            <rect x="87" y="44" width="2.5" height="5" rx="0.7" transform="rotate(270 88.25 46.5)" />
          </g>

          {/* Main CPU Rectangle */}
          <rect
            x="85"
            y="40"
            width="30"
            height="20"
            rx="2"
            fill="#1a1a1a"
            stroke="#333"
            strokeWidth="0.5"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
            }}
          />

          {/* CPU Text */}
          <text
            x="100"
            y="52.5"
            fontSize="7"
            fill="white"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="0.05em"
          >
            CPU
          </text>
        </g>

        {/* Gradients */}
        <defs>
          <radialGradient id="blue-gradient">
            <stop offset="0%" stopColor="#00E8ED" />
            <stop offset="50%" stopColor="#0088FF" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="yellow-gradient">
            <stop offset="0%" stopColor="#FFD800" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="pink-gradient">
            <stop offset="0%" stopColor="#FF00AA" />
            <stop offset="50%" stopColor="#8800DD" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="green-gradient">
            <stop offset="0%" stopColor="#00FF88" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="orange-gradient">
            <stop offset="0%" stopColor="#FF8800" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="cyan-gradient">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0088CC" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="purple-gradient">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="white-gradient">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E5E7EB" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
    </AbsoluteFill>
  );
} 