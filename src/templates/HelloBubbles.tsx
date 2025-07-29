import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export default function HelloBubbles() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Grid configuration - centered on canvas with extra columns
  const gridCols = 10;
  const gridRows = 6;
  const spacing = 200;
  
  // Focus circle (center of grid) - exactly at screen center
  const focusCircle = { 
    x: width / 2, 
    y: height / 2
  };
  
  // Calculate grid start position so focus circle is at screen center
  const centerCol = Math.floor(gridCols / 2);
  const centerRow = Math.floor(gridRows / 2);
  const startX = focusCircle.x - (centerCol * spacing);
  const startY = focusCircle.y - (centerRow * spacing);

  // Updated color palette with different gradient combinations
  const baseColors = [
    { h1: 200, h2: 180, s1: 85, s2: 90, l1: 60, l2: 70 }, // Blue to cyan
    { h1: 120, h2: 80, s1: 75, s2: 85, l1: 50, l2: 65 },  // Green to lime
    { h1: 320, h2: 280, s1: 80, s2: 75, l1: 65, l2: 55 }, // Pink to purple
    { h1: 25, h2: 0, s1: 90, s2: 85, l1: 60, l2: 50 },    // Orange to red
    { h1: 180, h2: 220, s1: 70, s2: 80, l1: 55, l2: 60 }, // Teal to blue
    { h1: 60, h2: 40, s1: 95, s2: 90, l1: 70, l2: 65 },   // Yellow to orange
    { h1: 260, h2: 240, s1: 85, s2: 80, l1: 50, l2: 60 }, // Purple to blue
    { h1: 350, h2: 330, s1: 90, s2: 85, l1: 65, l2: 70 }, // Red to pink
  ];

  // Generate animated gradients for each circle with color variations
  const generateAnimatedGradient = (index: number) => {
    // Select base color with some variation
    const colorIndex = index % baseColors.length;
    const baseColor = baseColors[colorIndex] || { h1: 200, h2: 180, s1: 85, s2: 90, l1: 60, l2: 70 };
    
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
      [0, 45],
      [baseColor.h1 + hueVariation1, baseColor.h1 + hueVariation1 + 10],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45],
      [baseColor.h2 + hueVariation2, baseColor.h2 + hueVariation2 + 8],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate saturation with variations - twice as fast
    const sat1 = interpolate(
      frame,
      [0, 45],
      [baseColor.s1 + satVariation1, baseColor.s1 + satVariation1 + 5],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const sat2 = interpolate(
      frame,
      [0, 45],
      [baseColor.s2 + satVariation2, baseColor.s2 + satVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate lightness with variations - twice as fast
    const light1 = interpolate(
      frame,
      [0, 45],
      [baseColor.l1 + lightVariation1, baseColor.l1 + lightVariation1 + 4],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const light2 = interpolate(
      frame,
      [0, 45],
      [baseColor.l2 + lightVariation2, baseColor.l2 + lightVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate gradient angle with slight variations - twice as fast
    const angleVariation = (index * 11) % 20 - 10; // ±10 degrees
    const angle = interpolate(
      frame,
      [0, 45],
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
      if (row === Math.floor(gridRows / 2) && col === Math.floor(gridCols / 2)) {
        continue;
      }
      
      circles.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        index: row * gridCols + col
      });
    }
  }

  // Generate animated gradient for focus circle - twice as fast
  const focusGradient = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45],
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45],
      [25, 35],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const angle = interpolate(
      frame,
      [0, 45],
      [125, 145],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return `linear-gradient(${angle}deg, hsl(${hue1}, 80%, 60%), hsl(${hue2}, 85%, 62%))`;
  })();
  
  // Zoom animation - twice as fast, immediate after fade in
  const zoomScale = interpolate(
    frame,
    [15, 30],
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
    [15, 45],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #F8F9FA, #E5E7EB)',
      overflow: 'hidden'
    }}>
      <div style={{
        transform: `scale(${zoomScale})`,
        transformOrigin: `${width / 2}px ${height / 2}px`,
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
            [0, 5],
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
                opacity: opacity,
                filter: 'blur(0.5px)'
              }}
            />
          );
        })}
        
        {/* Focus circle with "Hello" text */}
        <div
          style={{
            position: 'absolute',
            left: `${focusCircle.x}px`,
            top: `${focusCircle.y}px`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: focusGradient,
            transform: 'translate(-50%, -50%)',
            opacity: interpolate(
              frame,
              [0, 5],
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
          <span style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            fontFamily: 'Arial, sans-serif',
            opacity: textOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Hello
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'hello-bubbles',
  name: 'Hello Bubbles',
  duration: 60, // 2 seconds
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function HelloBubbles() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Grid configuration - centered on canvas with extra columns
  const gridCols = 10;
  const gridRows = 6;
  const spacing = 200;
  
  // Focus circle (center of grid) - exactly at screen center
  const focusCircle = { 
    x: width / 2, 
    y: height / 2
  };
  
  // Calculate grid start position so focus circle is at screen center
  const centerCol = Math.floor(gridCols / 2);
  const centerRow = Math.floor(gridRows / 2);
  const startX = focusCircle.x - (centerCol * spacing);
  const startY = focusCircle.y - (centerRow * spacing);

  // Updated color palette with different gradient combinations
  const baseColors = [
    { h1: 200, h2: 180, s1: 85, s2: 90, l1: 60, l2: 70 }, // Blue to cyan
    { h1: 120, h2: 80, s1: 75, s2: 85, l1: 50, l2: 65 },  // Green to lime
    { h1: 320, h2: 280, s1: 80, s2: 75, l1: 65, l2: 55 }, // Pink to purple
    { h1: 25, h2: 0, s1: 90, s2: 85, l1: 60, l2: 50 },    // Orange to red
    { h1: 180, h2: 220, s1: 70, s2: 80, l1: 55, l2: 60 }, // Teal to blue
    { h1: 60, h2: 40, s1: 95, s2: 90, l1: 70, l2: 65 },   // Yellow to orange
    { h1: 260, h2: 240, s1: 85, s2: 80, l1: 50, l2: 60 }, // Purple to blue
    { h1: 350, h2: 330, s1: 90, s2: 85, l1: 65, l2: 70 }, // Red to pink
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
      [0, 45],
      [baseColor.h1 + hueVariation1, baseColor.h1 + hueVariation1 + 10],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45],
      [baseColor.h2 + hueVariation2, baseColor.h2 + hueVariation2 + 8],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate saturation with variations - twice as fast
    const sat1 = interpolate(
      frame,
      [0, 45],
      [baseColor.s1 + satVariation1, baseColor.s1 + satVariation1 + 5],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const sat2 = interpolate(
      frame,
      [0, 45],
      [baseColor.s2 + satVariation2, baseColor.s2 + satVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate lightness with variations - twice as fast
    const light1 = interpolate(
      frame,
      [0, 45],
      [baseColor.l1 + lightVariation1, baseColor.l1 + lightVariation1 + 4],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const light2 = interpolate(
      frame,
      [0, 45],
      [baseColor.l2 + lightVariation2, baseColor.l2 + lightVariation2 + 3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Animate gradient angle with slight variations - twice as fast
    const angleVariation = (index * 11) % 20 - 10; // ±10 degrees
    const angle = interpolate(
      frame,
      [0, 45],
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
      if (row === Math.floor(gridRows / 2) && col === Math.floor(gridCols / 2)) {
        continue;
      }
      
      circles.push({
        x: startX + col * spacing,
        y: startY + row * spacing,
        index: row * gridCols + col
      });
    }
     }

   // Generate animated gradient for focus circle - twice as fast
  const focusGradient = (() => {
    const hue1 = interpolate(
      frame,
      [0, 45],
      [280, 310],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const hue2 = interpolate(
      frame,
      [0, 45],
      [25, 35],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    const angle = interpolate(
      frame,
      [0, 45],
      [125, 145],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return \`linear-gradient(\${angle}deg, hsl(\${hue1}, 80%, 60%), hsl(\${hue2}, 85%, 62%))\`;
  })();
  
  // Zoom animation - twice as fast, immediate after fade in
  const zoomScale = interpolate(
    frame,
    [15, 30],
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
    [15, 45],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #F8F9FA, #E5E7EB)',
      overflow: 'hidden'
    }}>
             <div style={{
         transform: \`scale(\${zoomScale})\`,
         transformOrigin: \`\${width / 2}px \${height / 2}px\`,
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
            [0, 5],
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
                opacity: opacity,
                filter: 'blur(0.5px)'
              }}
            />
          );
        })}
        
        <div
          style={{
            position: 'absolute',
            left: \`\${focusCircle.x}px\`,
            top: \`\${focusCircle.y}px\`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: focusGradient,
            transform: 'translate(-50%, -50%)',
            opacity: interpolate(
              frame,
              [0, 5],
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
          <span style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            fontFamily: 'Arial, sans-serif',
            opacity: textOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Hello
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}`
}; 