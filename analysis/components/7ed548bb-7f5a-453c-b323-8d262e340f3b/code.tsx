function FireworksDisplay() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = ['#ff0045', '#00ff00', '#0045ff', '#ffff00', '#ff00ff'];

  // Calculate burst timing
  const burstInterval = 30; // Bursts every 30 frames
  const totalBursts = Math.floor(frame / burstInterval);

  // Generate firework bursts
  const fireworks = Array.from({ length: totalBursts }, (_, index) => {
    const burstFrame = index * burstInterval;
    const animationProgress = Math.min(1, (frame - burstFrame) / 30);
    const size = interpolate(animationProgress, [0, 1], [0, 300]);
    const color = colors[index % colors.length];

    return {
      size,
      color,
      opacity: interpolate(animationProgress, [0, 1], [0, 1]),
      positionX: spring({ frame: frame - burstFrame, fps, config: { damping: 200 } }),
      positionY: spring({ frame: frame - burstFrame, fps, config: { damping: 200 } }),
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Audio src="https://www.soundjay.com/fireworks/fireworks-explosion-1.mp3" volume={0.2} />
      {fireworks.map((firework, index) => (
        <div key={index} style={{
          position: 'absolute',
          left: `calc(50% + ${firework.positionX}px)`,
          top: `calc(50% + ${firework.positionY}px)`,
          width: firework.size,
          height: firework.size,
          backgroundColor: firework.color,
          borderRadius: '50%',
          opacity: firework.opacity,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}
    </AbsoluteFill>
  );
}

export default FireworksDisplay;