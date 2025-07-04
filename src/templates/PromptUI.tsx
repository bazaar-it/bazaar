import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'prompt-ui',
  name: 'Prompt UI',
  duration: 180, // 6 seconds
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const SearchBar = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Detect format based on aspect ratio
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;
  const isLandscape = aspectRatio > 1.5;
  
  // Adaptive sizing based on format
  const boxWidth = isPortrait ? width * 0.85 : isSquare ? width * 0.8 : width * 0.83;
  const fontSize = isPortrait ? width * 0.045 : isSquare ? width * 0.05 : width * 0.034;
  const iconSize = isPortrait ? width * 0.06 : isSquare ? width * 0.065 : width * 0.037;
  const padding = isPortrait ? width * 0.04 : width * 0.025;
  const borderRadius = width * 0.026;
  
  // Adaptive text based on format
  const line1 = isPortrait ? "Start creating by adding" : "Start creating by adding a detailed prompt";
  const line2 = isPortrait ? "a prompt and image." : "and uploading an image.";
  
  const line1CharCount = Math.floor(
    interpolate(
      frame,
      [30, 90],
      [0, line1.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const line2CharCount = Math.floor(
    interpolate(
      frame,
      [90, 150],
      [0, line2.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showLine2 = frame >= 90;
  const showCursorOnLine2 = frame >= 90 && frame <= 150;
  const iconProgress = 1;
  const boxHeight = isPortrait 
    ? (showLine2 ? height * 0.3 : height * 0.25)
    : (showLine2 ? height * 0.37 : height * 0.3);

  return (
    <>
      <div
        style={{
          width: boxWidth,
          height: boxHeight,
          background: "#F5F5F5",
          borderRadius: borderRadius,
          padding: padding,
          opacity,
          boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
          position: "relative",
          transition: "height 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            fontFamily: "Inter, sans-serif",
            color: "#000000",
            opacity: 0.8,
            display: "flex",
            flexDirection: "column",
            gap: fontSize * 0.12,
            marginBottom: padding * 0.83,
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {line1.slice(0, line1CharCount)}
            {cursorVisible && frame <= 90 && (
              <span
                style={{
                  width: fontSize * 0.1,
                  height: fontSize * 0.74,
                  background: "#000000",
                  display: "inline-block",
                  marginLeft: fontSize * 0.06,
                }}
              />
            )}
          </div>
          {showLine2 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {line2.slice(0, line2CharCount)}
              {cursorVisible && showCursorOnLine2 && (
                <span
                  style={{
                    width: fontSize * 0.1,
                    height: fontSize * 0.74,
                    background: "#000000",
                    display: "inline-block",
                    marginLeft: fontSize * 0.06,
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            left: padding,
            display: "flex",
            gap: iconSize * 0.44,
            alignItems: "center",
            opacity: iconProgress,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="akar-icons:image"
              style={{
                fontSize: iconSize,
                color: "#666666",
              }}
            />
          </div>
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: iconSize,
                color: "#666666",
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            right: padding,
            opacity: iconProgress,
          }}
        >
          <div
            style={{
              width: iconSize * 1.67,
              height: iconSize * 1.67,
              borderRadius: "50%",
              background: "#333333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <window.IconifyIcon
              icon="quill:send"
              style={{
                fontSize: iconSize * 0.83,
                color: "#FFFFFF",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default function PromptUI() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame: frame > 5 ? frame : 0,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SearchBar opacity={mainProgress} />
    </AbsoluteFill>
  );
}`
};

const SearchBar = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Detect format based on aspect ratio
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;
  const isLandscape = aspectRatio > 1.5;
  
  // Adaptive sizing based on format
  const boxWidth = isPortrait ? width * 0.85 : isSquare ? width * 0.8 : width * 0.83;
  const fontSize = isPortrait ? width * 0.045 : isSquare ? width * 0.05 : width * 0.034;
  const iconSize = isPortrait ? width * 0.06 : isSquare ? width * 0.065 : width * 0.037;
  const padding = isPortrait ? width * 0.04 : width * 0.025;
  const borderRadius = width * 0.026;
  
  // Adaptive text based on format
  const line1 = isPortrait ? "Start creating by adding" : "Start creating by adding a detailed prompt";
  const line2 = isPortrait ? "a prompt and image." : "and uploading an image.";
  
  const line1CharCount = Math.floor(
    interpolate(
      frame,
      [30, 90],
      [0, line1.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const line2CharCount = Math.floor(
    interpolate(
      frame,
      [90, 150],
      [0, line2.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showLine2 = frame >= 90;
  const showCursorOnLine2 = frame >= 90 && frame <= 150;
  const iconProgress = 1;
  const boxHeight = isPortrait 
    ? (showLine2 ? height * 0.3 : height * 0.25)
    : (showLine2 ? height * 0.37 : height * 0.3);

  return (
    <>
      <div
        style={{
          width: boxWidth,
          height: boxHeight,
          background: "#F5F5F5",
          borderRadius: borderRadius,
          padding: padding,
          opacity,
          boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
          position: "relative",
          transition: "height 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            fontFamily: "Inter, sans-serif",
            color: "#000000",
            opacity: 0.8,
            display: "flex",
            flexDirection: "column",
            gap: fontSize * 0.12,
            marginBottom: padding * 0.83,
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {line1.slice(0, line1CharCount)}
            {cursorVisible && frame <= 90 && (
              <span
                style={{
                  width: fontSize * 0.1,
                  height: fontSize * 0.74,
                  background: "#000000",
                  display: "inline-block",
                  marginLeft: fontSize * 0.06,
                }}
              />
            )}
          </div>
          {showLine2 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {line2.slice(0, line2CharCount)}
              {cursorVisible && showCursorOnLine2 && (
                <span
                  style={{
                    width: fontSize * 0.1,
                    height: fontSize * 0.74,
                    background: "#000000",
                    display: "inline-block",
                    marginLeft: fontSize * 0.06,
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            left: padding,
            display: "flex",
            gap: iconSize * 0.44,
            alignItems: "center",
            opacity: iconProgress,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="akar-icons:image"
              style={{
                fontSize: iconSize,
                color: "#666666",
              }}
            />
          </div>
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: iconSize,
                color: "#666666",
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            right: padding,
            opacity: iconProgress,
          }}
        >
          <div
            style={{
              width: iconSize * 1.67,
              height: iconSize * 1.67,
              borderRadius: "50%",
              background: "#333333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <window.IconifyIcon
              icon="quill:send"
              style={{
                fontSize: iconSize * 0.83,
                color: "#FFFFFF",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default function PromptUI() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame: frame > 5 ? frame : 0,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SearchBar opacity={mainProgress} />
    </AbsoluteFill>
  );
}