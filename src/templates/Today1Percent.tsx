import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export default function Today1Percent() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Grid configuration - centered on canvas with extra columns
  const gridCols = 10; // Increased from 8 to 10 (2 extra columns)
  const gridRows = 6;
  const spacing = 200;
  
  // Center the grid on the canvas based on the focus circle position
  const focusCircleX = width / 2;
  const focusCircleY = height / 2;
  
  // Calculate grid start position so focus circle aligns with grid center
  const gridCenterCol = Math.floor(gridCols / 2);
  const gridCenterRow = Math.floor(gridRows / 2);
  const startX = focusCircleX - (gridCenterCol * spacing);
  const startY = focusCircleY - (gridCenterRow * spacing);

  // Base color palette - similar but with slight variations
  const baseColors = [
    { h1: 285, h2: 30, s1: 78, s2: 82, l1: 58, l2: 62 }, // Purple-orange
    { h1: 290, h2: 25, s1: 75, s2: 85, l1: 60, l2: 58 }, // Magenta-orange
    { h1: 280, h2: 35, s1: 80, s2: 80, l1: 57, l2: 63 }, // Violet-orange
    { h1: 295, h2: 20, s1: 77, s2: 88, l1: 59, l2: 61 }, // Pink-red
    { h1: 275, h2: 40, s1: 82, s2: 78, l1: 61, l2: 59 }, // Blue-purple-yellow
    { h1: 300, h2: 15, s1: 76, s2: 84, l1: 58, l2: 64 }, // Magenta-red
  ];

  // Generate animated gradients for each circle with color variations
  const generateAnimatedGradient = (index: number) => {
    // Select base color with some variation
    const colorIndex = index % baseColors.length;
    const baseColor = baseColors[colorIndex] || { h1: 285, h2: 30, s1: 78, s2: 82, l1: 58, l2: 62 };
    
    // Add slight random variations to each circle
    const hueVariation1 = (index * 3) % 15 - 7; // ±7 degrees
    const hueVariation2 = (index * 5) % 12 - 6; // ±6 degrees
    const satVariation1 = (index * 2) % 8 - 4; // ±4%
    const satVariation2 = (index * 4) % 6 - 3; // ±3%
    const lightVariation1 = (index * 1) % 6 - 3; // ±3%
    const lightVariation2 = (index * 7) % 4 - 2; // ±2%
    
    // Animate hue with variations - twice as fast
    const hue1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.h1 + hueVariation1, baseColor.h1 + hueVariation1 + 10],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.h2 + hueVariation2, baseColor.h2 + hueVariation2 + 8],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate saturation with variations - twice as fast
    const sat1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.s1 + satVariation1, baseColor.s1 + satVariation1 + 5],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const sat2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.s2 + satVariation2, baseColor.s2 + satVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate lightness with variations - twice as fast
    const light1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.l1 + lightVariation1, baseColor.l1 + lightVariation1 + 4],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const light2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.l2 + lightVariation2, baseColor.l2 + lightVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate gradient angle with slight variations - twice as fast
    const angleVariation = (index * 11) % 20 - 10; // ±10 degrees
    const angle = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [135 + angleVariation, 135 + angleVariation + 15],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return `linear-gradient(${angle}deg, hsl(${hue1}, ${sat1}%, ${light1}%), hsl(${hue2}, ${sat2}%, ${light2}%), transparent)`;
  };

  // Generate circles in a perfect grid pattern
  const circles = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      // Skip the center position for the focus circle
      if (row === gridCenterRow && col === gridCenterCol) {
        continue;
      }
      
      circles.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        index: row * gridCols + col
      });
    }
  }

  // Focus circle - positioned at exact center of screen
  const focusCircle = { 
    x: focusCircleX, 
    y: focusCircleY
  };
  
  // Generate animated gradient for focus circle - twice as fast
  const focusGradient = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [25, 35],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const angle = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [125, 145],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return `linear-gradient(${angle}deg, hsl(${hue1}, 80%, 60%), hsl(${hue2}, 85%, 62%))`;
  })();
  
  // Get animated colors for icon
  const iconColor1 = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45],
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    return `hsl(${hue1}, 80%, 60%)`;
  })();
  
  // Zoom animation - twice as fast, immediate after fade in
  const zoomScale = interpolate(
    frame,
    [15, 30], // Half the original duration (30-60 -> 15-30)
    [1, 3],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  // Text opacity - starts fading in when zoom begins
  const textOpacity = interpolate(
    frame,
    [15, 45], // Changed from [30, 60] to [15, 45] to start with zoom
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Other circles fade out after frame 60 (2 seconds at 30fps)
  const otherCirclesOpacity = interpolate(
    frame,
    [60, 75], // Quick fade out over 15 frames (0.5 seconds)
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Icon opacity - fades in during transition (overlapping with hello fade out)
  const iconOpacity = interpolate(
    frame,
    [60, 75], // Changed from [75, 90] to [60, 75] to overlap with hello fade out
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Today text opacity - disappears when circle becomes transparent (when icon appears)
  const todayOpacity = interpolate(
    frame,
    [60, 75], // Same timing as when the circle becomes transparent
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // New text animations - "Less than 1%" and "of the world" - now appear with icon
  const leftTextOpacity = interpolate(
    frame,
    [60, 75], // Changed from [90, 105] to match icon timing
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const rightTextOpacity = interpolate(
    frame,
    [60, 75], // Changed from [105, 120] to match icon timing
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Text slide-in animations - now synchronized with icon
  const leftTextX = interpolate(
    frame,
    [60, 75], // Changed from [90, 105] to match icon timing
    [-50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  const rightTextX = interpolate(
    frame,
    [60, 75], // Changed from [105, 120] to match icon timing
    [50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  // Define text spacing and icon size for positioning
  const textSpacing = 250; // Space between text and center
  const iconSize = 100; // Size of the world icon

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #F8F9FA, #E5E7EB)',
      overflow: 'hidden'
    }}>
      <div style={{
        transform: `scale(${zoomScale})`,
        transformOrigin: `${focusCircle.x}px ${focusCircle.y}px`,
        width: '100%',
        height: '100%',
        position: 'relative'
      }}>
        {circles.map((circle, index) => {
          const scale = spring({
            frame: frame,
            fps,
            config: {
              damping: 15,
              stiffness: 200,
              mass: 1
            }
          });

          const opacity = interpolate(
            frame,
            [0, 5], // Half the original duration (10 -> 5)
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp'
            }
          );

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${circle.x}px`,
                top: `${circle.y}px`,
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: generateAnimatedGradient(circle.index),
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: opacity * otherCirclesOpacity,
                filter: 'blur(0.5px)'
              }}
            />
          );
        })}
        
        {/* Focus circle - now positioned at exact center of screen */}
        <div
          style={{
            position: 'absolute',
            left: `${focusCircle.x}px`,
            top: `${focusCircle.y}px`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: iconOpacity > 0 ? 'transparent' : focusGradient, // Transparent when icon is visible
            transform: `translate(-50%, -50%)`,
            opacity: interpolate(
              frame,
              [0, 5], // Half the original duration (10 -> 5)
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              }
            ),
            filter: 'blur(0.5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Today text with opacity transition - now tied to circle transparency */}
          <span style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            opacity: textOpacity * todayOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            position: 'absolute'
          }}>
            Today
          </span>

          {/* World icon - using inline SVG for React component */}
          <div style={{
            opacity: iconOpacity,
            position: 'absolute'
          }}>
            <svg
              style={{
                width: '100px',
                height: '100px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
              viewBox="0 0 24 24"
              fill={iconColor1}
            >
              <path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Left text: "Less than 1%" */}
      <div style={{
        position: 'absolute',
        left: `${width / 2 - textSpacing - 150}px`,
        top: `${height / 2}px`,
        transform: `translate(${leftTextX}px, -50%)`,
        opacity: leftTextOpacity,
        fontSize: '100px',
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',
        color: '#2D3748',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}>
        Less than 1%
      </div>

      {/* Right text: "of the world" */}
      <div style={{
        position: 'absolute',
        left: `${width / 2 + iconSize + 60}px`,
        top: `${height / 2}px`,
        transform: `translate(${rightTextX}px, -50%)`,
        opacity: rightTextOpacity,
        fontSize: '100px',
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',
        color: '#2D3748',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}>
        of the world
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'today-1-percent',
  name: 'Today, 1%',
  duration: 135, // 4.5 seconds at 30fps
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function Today1Percent() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Grid configuration - centered on canvas with extra columns
  const gridCols = 10; // Increased from 8 to 10 (2 extra columns)
  const gridRows = 6;
  const spacing = 200;
  
  // Center the grid on the canvas based on the focus circle position
  const focusCircleX = width / 2;
  const focusCircleY = height / 2;
  
  // Calculate grid start position so focus circle aligns with grid center
  const gridCenterCol = Math.floor(gridCols / 2);
  const gridCenterRow = Math.floor(gridRows / 2);
  const startX = focusCircleX - (gridCenterCol * spacing);
  const startY = focusCircleY - (gridCenterRow * spacing);

  // Base color palette - similar but with slight variations
  const baseColors = [
    { h1: 285, h2: 30, s1: 78, s2: 82, l1: 58, l2: 62 }, // Purple-orange
    { h1: 290, h2: 25, s1: 75, s2: 85, l1: 60, l2: 58 }, // Magenta-orange
    { h1: 280, h2: 35, s1: 80, s2: 80, l1: 57, l2: 63 }, // Violet-orange
    { h1: 295, h2: 20, s1: 77, s2: 88, l1: 59, l2: 61 }, // Pink-red
    { h1: 275, h2: 40, s1: 82, s2: 78, l1: 61, l2: 59 }, // Blue-purple-yellow
    { h1: 300, h2: 15, s1: 76, s2: 84, l1: 58, l2: 64 }, // Magenta-red
  ];

  // Generate animated gradients for each circle with color variations
  const generateAnimatedGradient = (index) => {
    // Select base color with some variation
    const colorIndex = index % baseColors.length;
    const baseColor = baseColors[colorIndex];
    
    // Add slight random variations to each circle
    const hueVariation1 = (index * 3) % 15 - 7; // ±7 degrees
    const hueVariation2 = (index * 5) % 12 - 6; // ±6 degrees
    const satVariation1 = (index * 2) % 8 - 4; // ±4%
    const satVariation2 = (index * 4) % 6 - 3; // ±3%
    const lightVariation1 = (index * 1) % 6 - 3; // ±3%
    const lightVariation2 = (index * 7) % 4 - 2; // ±2%
    
    // Animate hue with variations - twice as fast
    const hue1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.h1 + hueVariation1, baseColor.h1 + hueVariation1 + 10],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.h2 + hueVariation2, baseColor.h2 + hueVariation2 + 8],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate saturation with variations - twice as fast
    const sat1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.s1 + satVariation1, baseColor.s1 + satVariation1 + 5],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const sat2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.s2 + satVariation2, baseColor.s2 + satVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate lightness with variations - twice as fast
    const light1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.l1 + lightVariation1, baseColor.l1 + lightVariation1 + 4],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const light2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [baseColor.l2 + lightVariation2, baseColor.l2 + lightVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate gradient angle with slight variations - twice as fast
    const angleVariation = (index * 11) % 20 - 10; // ±10 degrees
    const angle = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [135 + angleVariation, 135 + angleVariation + 15],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return \`linear-gradient(\${angle}deg, hsl(\${hue1}, \${sat1}%, \${light1}%), hsl(\${hue2}, \${sat2}%, \${light2}%), transparent)\`;
  };

  // Generate circles in a perfect grid pattern
  const circles = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      // Skip the center position for the focus circle
      if (row === gridCenterRow && col === gridCenterCol) {
        continue;
      }
      
      circles.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        index: row * gridCols + col
      });
    }
  }

  // Focus circle - positioned at exact center of screen
  const focusCircle = { 
    x: focusCircleX, 
    y: focusCircleY
  };
  
  // Generate animated gradient for focus circle - twice as fast
  const focusGradient = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [25, 35],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const angle = interpolate(
      frame,
      [0, 45], // Half the original duration (90 -> 45)
      [125, 145],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return \`linear-gradient(\${angle}deg, hsl(\${hue1}, 80%, 60%), hsl(\${hue2}, 85%, 62%))\`;
  })();
  
  // Get animated colors for icon
  const iconColor1 = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45],
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    return \`hsl(\${hue1}, 80%, 60%)\`;
  })();
  
  // Zoom animation - twice as fast, immediate after fade in
  const zoomScale = interpolate(
    frame,
    [15, 30], // Half the original duration (30-60 -> 15-30)
    [1, 3],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  // Text opacity - starts fading in when zoom begins
  const textOpacity = interpolate(
    frame,
    [15, 45], // Changed from [30, 60] to [15, 45] to start with zoom
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Other circles fade out after frame 60 (2 seconds at 30fps)
  const otherCirclesOpacity = interpolate(
    frame,
    [60, 75], // Quick fade out over 15 frames (0.5 seconds)
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Icon opacity - fades in during transition (overlapping with hello fade out)
  const iconOpacity = interpolate(
    frame,
    [60, 75], // Changed from [75, 90] to [60, 75] to overlap with hello fade out
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Today text opacity - disappears when circle becomes transparent (when icon appears)
  const todayOpacity = interpolate(
    frame,
    [60, 75], // Same timing as when the circle becomes transparent
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // New text animations - "Less than 1%" and "of the world" - now appear with icon
  const leftTextOpacity = interpolate(
    frame,
    [60, 75], // Changed from [90, 105] to match icon timing
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const rightTextOpacity = interpolate(
    frame,
    [60, 75], // Changed from [105, 120] to match icon timing
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Text slide-in animations - now synchronized with icon
  const leftTextX = interpolate(
    frame,
    [60, 75], // Changed from [90, 105] to match icon timing
    [-50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  const rightTextX = interpolate(
    frame,
    [60, 75], // Changed from [105, 120] to match icon timing
    [50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    }
  );

  // Define text spacing and icon size for positioning
  const textSpacing = 250; // Space between text and center
  const iconSize = 100; // Size of the world icon

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #F8F9FA, #E5E7EB)',
      overflow: 'hidden'
    }}>
      <div style={{
        transform: \`scale(\${zoomScale})\`,
        transformOrigin: \`\${focusCircle.x}px \${focusCircle.y}px\`,
        width: '100%',
        height: '100%',
        position: 'relative'
      }}>
        {circles.map((circle, index) => {
          const scale = spring({
            frame: frame,
            fps,
            config: {
              damping: 15,
              stiffness: 200,
              mass: 1
            }
          });

          const opacity = interpolate(
            frame,
            [0, 5], // Half the original duration (10 -> 5)
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp'
            }
          );

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: \`\${circle.x}px\`,
                top: \`\${circle.y}px\`,
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: generateAnimatedGradient(circle.index),
                transform: \`translate(-50%, -50%) scale(\${scale})\`,
                opacity: opacity * otherCirclesOpacity,
                filter: 'blur(0.5px)'
              }}
            />
          );
        })}
        
        {/* Focus circle - now positioned at exact center of screen */}
        <div
          style={{
            position: 'absolute',
            left: \`\${focusCircle.x}px\`,
            top: \`\${focusCircle.y}px\`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: iconOpacity > 0 ? 'transparent' : focusGradient, // Transparent when icon is visible
            transform: \`translate(-50%, -50%)\`,
            opacity: interpolate(
              frame,
              [0, 5], // Half the original duration (10 -> 5)
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              }
            ),
            filter: 'blur(0.5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Today text with opacity transition - now tied to circle transparency */}
          <span style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: '600',
            fontFamily: 'Arial, sans-serif',
            opacity: textOpacity * todayOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            position: 'absolute'
          }}>
            Today
          </span>

          {/* World icon with solid color instead of gradient */}
          <div style={{
            opacity: iconOpacity,
            position: 'absolute'
          }}>
            <window.IconifyIcon 
              icon="mdi:earth" 
              style={{
                fontSize: '100px',
                color: iconColor1,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          </div>
        </div>
      </div>

      {/* Left text: "Less than 1%" */}
      <div style={{
        position: 'absolute',
        left: \`\${width / 2 - 850}px\`,
        top: \`\${height / 2}px\`,
        transform: \`translate(\${leftTextX}px, -50%)\`,
        opacity: leftTextOpacity,
        fontSize: '100px',
        fontWeight: '700',
        fontFamily: 'Arial, sans-serif',
        color: '#2D3748',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}>
        Less than 1%
      </div>

      {/* Right text: "of the world" */}
      <div style={{
        position: 'absolute',
        left: \`\${width / 2 + 200}px\`,
        top: \`\${height / 2}px\`,
        transform: \`translate(\${rightTextX}px, -50%)\`,
        opacity: rightTextOpacity,
        fontSize: '100px',
        fontWeight: '700',
        fontFamily: 'Arial, sans-serif',
        color: '#2D3748',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}>
        of the world
      </div>
    </AbsoluteFill>
  );
}`
}; 