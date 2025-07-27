import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function AppJiggle() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Detect format based on aspect ratio
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 0.8;
  const isLandscape = aspectRatio > 1.3;
  const isSquare = !isPortrait && !isLandscape;

  const apps = [
    // Row 1
    { name: "FaceTime", icon: "ic:round-videocam", color: "#00C853" },
    { name: "Calendar", icon: "material-symbols:calendar-today", color: "#FF3B30" },
    { name: "Photos", icon: "material-symbols:photo-library", color: "#007AFF" },
    { name: "Camera", icon: "material-symbols:photo-camera", color: "#8E8E93" },

    // Row 2
    { name: "Weather", icon: "material-symbols:wb-sunny", color: "#007AFF" },
    { name: "Clock", icon: "material-symbols:schedule", color: "#000000" },
    { name: "Maps", icon: "material-symbols:map", color: "#007AFF" },
    { name: "Reminders", icon: "material-symbols:checklist", color: "#FF3B30" },

    // Row 3
    { name: "Notes", icon: "material-symbols:note", color: "#FFCC02" },
    { name: "Stocks", icon: "material-symbols:trending-up", color: "#000000" },
    { name: "Wallet", icon: "material-symbols:account-balance-wallet", color: "#000000" },
    { name: "Health", icon: "material-symbols:favorite", color: "#FF3B30" },

    // Row 4
    { name: "Home", icon: "material-symbols:home", color: "#FF9500" },
    { name: "Podcasts", icon: "material-symbols:podcasts", color: "#8E44AD" },
    { name: "TV", icon: "material-symbols:tv", color: "#000000" },
    { name: "Music", icon: "material-symbols:music-note", color: "#FF3B30" },

    // Row 5
    { name: "Books", icon: "material-symbols:menu-book", color: "#FF9500" },
    { name: "App Store", icon: "material-symbols:store", color: "#007AFF" },
    { name: "Messages", icon: "material-symbols:sms", color: "#00C853" },
    { name: "IKEA", icon: "simple-icons:ikea", color: "#FFDA00" }
  ];

  const dockApps = [
    { name: "Wallet", icon: "material-symbols:account-balance-wallet", color: "#000000" },
    { name: "Safari", icon: "material-symbols:language", color: "#007AFF" },
    { name: "Settings", icon: "material-symbols:settings", color: "#8E8E93" },
    { name: "Compass", icon: "material-symbols:explore", color: "#FF3B30" }
  ];

  // iPhone dimensions - always maintain iPhone aspect ratio (portrait orientation)
  const getPhoneDimensions = () => {
    // Always maintain iPhone aspect ratio regardless of video format
    return { phoneWidth: 375, phoneHeight: 812 };
  };

  const { phoneWidth, phoneHeight } = getPhoneDimensions();

  // Scale to fit 98% of height while maintaining aspect ratio
  const scale = (height * 0.98) / phoneHeight;

  // Animation phases
  const deleteOpacity = frame >= 30 && frame < 45 ?
    interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    frame >= 45 ? 1 : 0;

  // Jiggle animation function
  const getJiggleRotation = (index: number, currentFrame: number) => {
    if (currentFrame < 45) return 0;

    const jiggleFrame = currentFrame - 45;
    const phaseOffset = index * 0.3;
    const cycle = (jiggleFrame + phaseOffset * 10) * 0.8;

    return Math.sin(cycle) * 3; // ±3 degrees
  };

  const AppIcon = ({ 
    app, 
    index, 
    x, 
    y, 
    isDock = false 
  }: { 
    app: any; 
    index: number; 
    x: number; 
    y: number; 
    isDock?: boolean; 
  }) => {
    const isIkeaApp = !isDock && index === 19;
    const rotation = isIkeaApp ? 0 : getJiggleRotation(index, frame);

    // Responsive icon sizing
    const iconSize = isSquare ? 55 : 64; // Same for portrait and landscape
    const cornerRadius = iconSize * 0.2;

    return (
      <div
        style={{
          position: isDock ? "relative" : "absolute",
          left: isDock ? "0" : `${x}px`,
          top: isDock ? "0" : `${y}px`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* App Icon Background */}
        <div
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            backgroundColor: app.color,
            borderRadius: `${cornerRadius}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            background: `linear-gradient(145deg, ${app.color}, ${app.color}dd)`,
            flexShrink: 0,
            aspectRatio: "1 / 1"
          }}
        >
          {typeof window !== 'undefined' && window.IconifyIcon ? (
            <window.IconifyIcon 
              icon={app.icon}
              style={{
                fontSize: `${iconSize * 0.5}px`,
                color: app.name === "IKEA" ? "#0051BA" : "#FFFFFF",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                display: "block"
              }}
            />
          ) : (
            <span
              style={{
                fontSize: `${iconSize * 0.4}px`,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                display: "block",
                color: "#FFFFFF"
              }}
            >
              {app.name.charAt(0)}
            </span>
          )}

          {/* Delete Icon */}
          {deleteOpacity > 0 && !isIkeaApp && (
            <div
              style={{
                position: "absolute",
                top: "-6px",
                left: "-6px",
                width: "20px",
                height: "20px",
                backgroundColor: "#FF3B30",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: deleteOpacity,
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              <span style={{ fontSize: "12px", color: "white", fontWeight: "bold" }}>×</span>
            </div>
          )}
        </div>

        {/* App Label */}
        {!isDock && (
          <div
            style={{
              position: "absolute",
              bottom: "-18px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: isSquare ? "10px" : "11px",
              color: "white",
              textAlign: "center",
              fontFamily: "Inter, sans-serif",
              fontWeight: "400",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              lineHeight: "1.2",
              maxWidth: "70px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {app.name}
          </div>
        )}
      </div>
    );
  };

  const getGridLayout = () => {
    if (isSquare) {
      return {
        topOffset: 60,
        leftOffset: 30,
        rightOffset: 30,
        bottomOffset: 100,
        rows: 5,
        cols: 4,
        iconSpacing: 85
      };
    } else {
      // Same layout for both portrait and landscape (landscape just rotates the whole phone)
      return {
        topOffset: 80,
        leftOffset: 24,
        rightOffset: 24,
        bottomOffset: 150,
        rows: 5,
        cols: 4,
        iconSpacing: 92
      };
    }
  };

  const layout = getGridLayout();

  return (
    <AbsoluteFill
      style={{
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* Phone Frame */}
      <div
        style={{
          width: `${phoneWidth}px`,
          height: `${phoneHeight}px`,
          backgroundColor: "#1E3A8A",
          borderRadius: isSquare ? "25px" : "40px",
          padding: "8px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative",
          transform: `scale(${scale})`,
          transformOrigin: "center center"
        }}
      >
        {/* Screen */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
            borderRadius: isSquare ? "17px" : "32px",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Dynamic Island/Status Bar Area */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "126px",
              height: "37px",
              backgroundColor: "#000000",
              borderRadius: "19px"
            }}
          />

          {/* App Grid */}
          <div
            style={{
              position: "absolute",
              top: `${layout.topOffset}px`,
              left: `${layout.leftOffset}px`,
              right: `${layout.rightOffset}px`,
              bottom: `${layout.bottomOffset}px`
            }}
          >
            {/* Main Grid Apps */}
            {apps.map((app, index) => {
              const row = Math.floor(index / layout.cols);
              const col = index % layout.cols;
              const availableWidth = phoneWidth - layout.leftOffset - layout.rightOffset;
              const iconSpacing = availableWidth / layout.cols;
              const iconSize = isSquare ? 55 : 64; // Same size for portrait and landscape
              const x = col * iconSpacing + (iconSpacing - iconSize) / 2;
              const y = row * layout.iconSpacing;

              return (
                <AppIcon
                  key={index}
                  app={app}
                  index={index}
                  x={x}
                  y={y}
                />
              );
            })}
          </div>

          {/* Dock */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: `${layout.leftOffset}px`,
              right: `${layout.rightOffset}px`,
              height: "90px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: isSquare ? "15px" : "20px",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-evenly",
              padding: "0 15px"
            }}
          >
            {dockApps.map((app, index) => (
              <AppIcon
                key={`dock-${index}`}
                app={app}
                index={apps.length + index}
                x={0}
                y={0}
                isDock={true}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'app-jiggle',
  name: 'App Jiggle',
  duration: 90, // 3 seconds
  previewFrame: 60,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } = window.Remotion;

export default function AppJiggle() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500"] });

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const apps = [
    // Row 1
    { name: "FaceTime", icon: "ic:round-videocam", color: "#00C853" },
    { name: "Calendar", icon: "material-symbols:calendar-today", color: "#FF3B30" },
    { name: "Photos", icon: "material-symbols:photo-library", color: "#007AFF" },
    { name: "Camera", icon: "material-symbols:photo-camera", color: "#8E8E93" },

    // Row 2
    { name: "Weather", icon: "material-symbols:wb-sunny", color: "#007AFF" },
    { name: "Clock", icon: "material-symbols:schedule", color: "#000000" },
    { name: "Maps", icon: "material-symbols:map", color: "#007AFF" },
    { name: "Reminders", icon: "material-symbols:checklist", color: "#FF3B30" },

    // Row 3
    { name: "Notes", icon: "material-symbols:note", color: "#FFCC02" },
    { name: "Stocks", icon: "material-symbols:trending-up", color: "#000000" },
    { name: "Wallet", icon: "material-symbols:account-balance-wallet", color: "#000000" },
    { name: "Health", icon: "material-symbols:favorite", color: "#FF3B30" },

    // Row 4
    { name: "Home", icon: "material-symbols:home", color: "#FF9500" },
    { name: "Podcasts", icon: "material-symbols:podcasts", color: "#8E44AD" },
    { name: "TV", icon: "material-symbols:tv", color: "#000000" },
    { name: "Music", icon: "material-symbols:music-note", color: "#FF3B30" },

    // Row 5
    { name: "Books", icon: "material-symbols:menu-book", color: "#FF9500" },
    { name: "App Store", icon: "material-symbols:store", color: "#007AFF" },
    { name: "Messages", icon: "material-symbols:sms", color: "#00C853" },
    { name: "IKEA", icon: "simple-icons:ikea", color: "#FFDA00" }
  ];

  const dockApps = [
    { name: "Wallet", icon: "material-symbols:account-balance-wallet", color: "#000000" },
    { name: "Safari", icon: "material-symbols:language", color: "#007AFF" },
    { name: "Settings", icon: "material-symbols:settings", color: "#8E8E93" },
    { name: "Compass", icon: "material-symbols:explore", color: "#FF3B30" }
  ];

  // Detect format based on aspect ratio
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 0.8;
  const isLandscape = aspectRatio > 1.3;
  const isSquare = !isPortrait && !isLandscape;

  // iPhone dimensions - always maintain iPhone aspect ratio (portrait orientation)
  const getPhoneDimensions = () => {
    // Always maintain iPhone aspect ratio regardless of video format
    return { phoneWidth: 375, phoneHeight: 812 };
  };

  const { phoneWidth, phoneHeight } = getPhoneDimensions();

  // Scale to fit 98% of height while maintaining aspect ratio
  const scale = (height * 0.98) / phoneHeight;

  // Delete mode visibility
  const deleteOpacity = frame >= 30 && frame < 45 ?
    interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    frame >= 45 ? 1 : 0;

  // Jiggle animation function
  const getJiggleRotation = (index, currentFrame) => {
    if (currentFrame < 45) return 0;

    const jiggleFrame = currentFrame - 45;
    const phaseOffset = index * 0.3;
    const cycle = (jiggleFrame + phaseOffset * 10) * 0.8;

    return Math.sin(cycle) * 3; // ±3 degrees
  };

  const AppIcon = ({ app, index, x, y, isDock = false }) => {
    const isIkeaApp = !isDock && index === 19;
    const rotation = isIkeaApp ? 0 : getJiggleRotation(index, frame);

    // Responsive icon sizing
    const iconSize = isSquare ? 55 : 64; // Same for portrait and landscape
    const cornerRadius = iconSize * 0.2;

    return (
      <div
        style={{
          position: isDock ? "relative" : "absolute",
          left: isDock ? "0" : \`\${x}px\`,
          top: isDock ? "0" : \`\${y}px\`,
          width: \`\${iconSize}px\`,
          height: \`\${iconSize}px\`,
          transform: \`rotate(\${rotation}deg)\`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: \`\${iconSize}px\`,
            height: \`\${iconSize}px\`,
            backgroundColor: app.color,
            borderRadius: \`\${cornerRadius}px\`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            background: \`linear-gradient(145deg, \${app.color}, \${app.color}dd)\`,
            flexShrink: 0,
            aspectRatio: "1 / 1"
          }}
        >
          <window.IconifyIcon 
            icon={app.icon}
            style={{
              fontSize: \`\${iconSize * 0.5}px\`,
              color: app.name === "IKEA" ? "#0051BA" : "#FFFFFF",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              display: "block"
            }}
          />

          {deleteOpacity > 0 && !isIkeaApp && (
            <div
              style={{
                position: "absolute",
                top: "-6px",
                left: "-6px",
                width: "20px",
                height: "20px",
                backgroundColor: "#FF3B30",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: deleteOpacity,
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              <window.IconifyIcon 
                icon="material-symbols:remove"
                style={{
                  fontSize: "12px",
                  color: "white",
                  fontWeight: "bold"
                }}
              />
            </div>
          )}
        </div>

        {!isDock && (
          <div
            style={{
              position: "absolute",
              bottom: "-18px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: isSquare ? "10px" : "11px",
              color: "white",
              textAlign: "center",
              fontFamily: "Inter",
              fontWeight: "400",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              lineHeight: "1.2",
              maxWidth: "70px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {app.name}
          </div>
        )}
      </div>
    );
  };

  const getGridLayout = () => {
    if (isSquare) {
      return {
        topOffset: 60,
        leftOffset: 30,
        rightOffset: 30,
        bottomOffset: 100,
        cols: 4,
        iconSpacing: 85
      };
    } else {
      // Same layout for both portrait and landscape (landscape just rotates the whole phone)
      return {
        topOffset: 80,
        leftOffset: 24,
        rightOffset: 24,
        bottomOffset: 150,
        cols: 4,
        iconSpacing: 92
      };
    }
  };

  const layout = getGridLayout();

  return (
    <AbsoluteFill
      style={{
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: \`\${phoneWidth}px\`,
          height: \`\${phoneHeight}px\`,
          backgroundColor: "#1E3A8A",
          borderRadius: isSquare ? "25px" : "40px",
          padding: "8px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative",
          transform: \`scale(\${scale})\`,
          transformOrigin: "center center"
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
            borderRadius: isSquare ? "17px" : "32px",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "126px",
              height: "37px",
              backgroundColor: "#000000",
              borderRadius: "19px"
            }}
          />

          {/* Status Bar */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "0",
              right: "0",
              height: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingLeft: "30px",
              paddingRight: "30px",
              color: "white",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            <span>9:41</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <window.IconifyIcon icon="material-symbols:signal-cellular-4-bar" style={{ fontSize: "16px" }} />
              <window.IconifyIcon icon="material-symbols:wifi" style={{ fontSize: "16px" }} />
              <window.IconifyIcon icon="material-symbols:battery-full" style={{ fontSize: "16px" }} />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: \`\${layout.topOffset}px\`,
              left: \`\${layout.leftOffset}px\`,
              right: \`\${layout.rightOffset}px\`,
              bottom: \`\${layout.bottomOffset}px\`
            }}
          >
            {apps.map((app, index) => {
              const row = Math.floor(index / layout.cols);
              const col = index % layout.cols;
              const availableWidth = phoneWidth - layout.leftOffset - layout.rightOffset;
              const iconSpacing = availableWidth / layout.cols;
              const iconSize = isSquare ? 55 : 64; // Same size for portrait and landscape
              const x = col * iconSpacing + (iconSpacing - iconSize) / 2;
              const y = row * layout.iconSpacing;

              return (
                <AppIcon
                  key={index}
                  app={app}
                  index={index}
                  x={x}
                  y={y}
                />
              );
            })}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: \`\${layout.leftOffset}px\`,
              right: \`\${layout.rightOffset}px\`,
              height: "90px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: isSquare ? "15px" : "20px",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-evenly",
              padding: "0 15px"
            }}
          >
            {dockApps.map((app, index) => (
              <AppIcon
                key={\`dock-\${index}\`}
                app={app}
                index={apps.length + index}
                x={0}
                y={0}
                isDock={true}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}`
}; 