const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

const script_mfjob2us = [
  { type: 'entrance', frames: 20 },
  { type: 'avatars_cascade', frames: 40 },
  { type: 'hold', frames: 20 },
  { type: 'downie_zoom', frames: 30 }
];

const sequences_mfjob2us = [];
let accumulatedFrames_mfjob2us = 0;

script_mfjob2us.forEach((segment, index) => {
  sequences_mfjob2us.push({
    ...segment,
    start: accumulatedFrames_mfjob2us,
    end: accumulatedFrames_mfjob2us + segment.frames
  });
  accumulatedFrames_mfjob2us += segment.frames;
});

const totalFrames_mfjob2us = script_mfjob2us.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_mfjob2us = totalFrames_mfjob2us;

export default function Scene_mfjob2us() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Fixed avatar list with direct URL mapping for Lambda compatibility
  const avatarData = [
    { name: 'asian-woman', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/asian-woman.png' },
    { name: 'black-man', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/black-man.png' },
    { name: 'hispanic-man', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/hispanic-man.png' },
    { name: 'middle-eastern-man', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/middle-eastern-man.png' },
    { name: 'white-woman', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/white-woman.png' },
    { name: 'jackatar', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/Jackatar.png' },
    { name: 'markatar', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/Markatar.png' },
    { name: 'downie', url: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/downie.png' }
  ];

  // Find downie index
  const downieIndex = avatarData.findIndex(avatar => avatar.name === 'downie');
  const zoomStartFrame = 80; // Start zoom at frame 80 (after hold phase)

  // Title entrance animation
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 }
  });

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Title fade out during zoom
  const titleFadeOut = interpolate(frame, [zoomStartFrame, zoomStartFrame + 15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Avatar positions in a circular arrangement
  const getAvatarPosition = (index) => {
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2; // Start from top
    const radius = 280;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  // Downie zoom effect
  const downieZoomScale = interpolate(
    frame,
    [zoomStartFrame, zoomStartFrame + 25],
    [1, 4],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      }
    }
  );

  const downieZoomOpacity = interpolate(
    frame,
    [zoomStartFrame, zoomStartFrame + 5],
    [1, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  // Other avatars fade out during zoom
  const otherAvatarsFadeOut = interpolate(
    frame,
    [zoomStartFrame, zoomStartFrame + 15],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #4a2c7a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* Central title */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${titleScale})`,
        opacity: titleOpacity * titleFadeOut,
        textAlign: "center",
        zIndex: 10
      }}>
        <h1 style={{
          fontFamily: "Inter",
          fontWeight: "600",
          fontSize: "64px",
          color: "white",
          margin: "0",
          textShadow: "0 0 30px rgba(139, 92, 246, 0.8)"
        }}>
          Our Team
        </h1>
      </div>

      {/* Avatar circle */}
      {avatarData.map((avatar, index) => {
        const position = getAvatarPosition(index);
        const startFrame = 20 + (index * 5); // Staggered entrance
        const isDownie = index === downieIndex;

        const avatarScale = spring({
          frame: Math.max(0, frame - startFrame),
          fps,
          config: { damping: 15, stiffness: 120 }
        });

        const avatarOpacity = interpolate(
          frame,
          [startFrame, startFrame + 10],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );

        const floatY = interpolate(
          frame,
          [startFrame + 20, startFrame + 80],
          [0, -10],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );

        // Apply zoom effect only to downie
        const finalScale = isDownie ? avatarScale * downieZoomScale : avatarScale;
        const finalOpacity = isDownie ? avatarOpacity * downieZoomOpacity : avatarOpacity * otherAvatarsFadeOut;

        // Move downie to center during zoom
        const downieX = isDownie ? interpolate(
          frame,
          [zoomStartFrame, zoomStartFrame + 20],
          [position.x, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        ) : position.x;

        const downieY = isDownie ? interpolate(
          frame,
          [zoomStartFrame, zoomStartFrame + 20],
          [position.y + floatY, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        ) : position.y + floatY;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(${downieX}px, ${downieY}px) translate(-50%, -50%) scale(${finalScale})`,
              opacity: finalOpacity,
              zIndex: isDownie ? 20 : 5
            }}
          >
            {/* Glowing border */}
            <div style={{
              position: "relative",
              padding: "6px",
              background: "linear-gradient(45deg, #8b5cf6, #a855f7, #c084fc)",
              borderRadius: "50%",
              boxShadow: isDownie && frame >= zoomStartFrame ? "0 0 50px rgba(139, 92, 246, 0.9)" : "0 0 25px rgba(139, 92, 246, 0.6)"
            }}>
              <img
                src={avatar.url}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Connecting lines between avatars */}
      {avatarData.map((_, index) => {
        const startPos = getAvatarPosition(index);
        const endPos = getAvatarPosition((index + 1) % 8);
        const startFrame = 40 + (index * 3);

        const lineOpacity = interpolate(
          frame,
          [startFrame, startFrame + 15],
          [0, 0.3],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );

        // Fade out lines during zoom
        const lineFadeOut = interpolate(
          frame,
          [zoomStartFrame, zoomStartFrame + 10],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );

        const lineLength = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
        );
        const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);

        return (
          <div
            key={`line-${index}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(${startPos.x}px, ${startPos.y}px) rotate(${angle}rad)`,
              transformOrigin: "0 0",
              width: `${lineLength}px`,
              height: "2px",
              background: "linear-gradient(90deg, rgba(139, 92, 246, 0.4), rgba(168, 85, 247, 0.2))",
              opacity: lineOpacity * lineFadeOut
            }}
          />
        );
      })}

      {/* Central glow effect */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        opacity: interpolate(frame, [30, 50], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        }) * otherAvatarsFadeOut
      }} />

      {/* CPO Label for downie */}
      {frame >= zoomStartFrame + 15 && (
        <div style={{
          position: "absolute",
          top: "70%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: interpolate(
            frame,
            [zoomStartFrame + 15, zoomStartFrame + 25],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            }
          ),
          zIndex: 25
        }}>
          <h2 style={{
            fontFamily: "Inter",
            fontWeight: "600",
            fontSize: "48px",
            color: "white",
            margin: "0",
            textAlign: "center",
            textShadow: "0 0 20px rgba(139, 92, 246, 0.8)"
          }}>
            CPO
          </h2>
        </div>
      )}
    </AbsoluteFill>
  );
}