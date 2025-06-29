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
  
  const line1 = "Start creating by adding a detailed prompt";
  const line2 = "and uploading an image.";
  
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
  const boxHeight = showLine2 ? "400px" : "320px";

  return (
    <>
      <div
        style={{
          width: "1600px",
          height: boxHeight,
          background: "#F5F5F5",
          borderRadius: "50px",
          padding: "48px",
          opacity,
          boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
          position: "relative",
          transition: "height 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: "65px",
            fontFamily: "Inter, sans-serif",
            color: "#000000",
            opacity: 0.8,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "40px",
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {line1.slice(0, line1CharCount)}
            {cursorVisible && frame <= 90 && (
              <span
                style={{
                  width: "6px",
                  height: "48px",
                  background: "#000000",
                  display: "inline-block",
                  marginLeft: "4px",
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
                    width: "6px",
                    height: "48px",
                    background: "#000000",
                    display: "inline-block",
                    marginLeft: "4px",
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "48px",
            display: "flex",
            gap: "32px",
            alignItems: "center",
            opacity: iconProgress,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: "72px",
              color: "#666666",
              cursor: "pointer",
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: "12px",
            }}
          >
            <window.IconifyIcon
              icon="akar-icons:image"
              style={{
                fontSize: "72px",
                color: "#666666",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "72px",
              color: "#666666",
              cursor: "pointer",
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: "12px",
            }}
          >
            <window.IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: "72px",
                color: "#666666",
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "48px",
            opacity: iconProgress,
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
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
                fontSize: "60px",
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
  
  const line1 = "Start creating by adding a detailed prompt";
  const line2 = "and uploading an image.";
  
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
  const boxHeight = showLine2 ? "400px" : "320px";

  return (
    <>
      <div
        style={{
          width: "1600px",
          height: boxHeight,
          background: "#F5F5F5",
          borderRadius: "50px",
          padding: "48px",
          opacity,
          boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
          position: "relative",
          transition: "height 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: "65px",
            fontFamily: "Inter, sans-serif",
            color: "#000000",
            opacity: 0.8,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "40px",
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {line1.slice(0, line1CharCount)}
            {cursorVisible && frame <= 90 && (
              <span
                style={{
                  width: "6px",
                  height: "48px",
                  background: "#000000",
                  display: "inline-block",
                  marginLeft: "4px",
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
                    width: "6px",
                    height: "48px",
                    background: "#000000",
                    display: "inline-block",
                    marginLeft: "4px",
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "48px",
            display: "flex",
            gap: "32px",
            alignItems: "center",
            opacity: iconProgress,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: "72px",
              color: "#666666",
              cursor: "pointer",
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: "12px",
            }}
          >
            <window.IconifyIcon
              icon="akar-icons:image"
              style={{
                fontSize: "72px",
                color: "#666666",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "72px",
              color: "#666666",
              cursor: "pointer",
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: "12px",
            }}
          >
            <window.IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: "72px",
                color: "#666666",
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "48px",
            opacity: iconProgress,
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
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
                fontSize: "60px",
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