import {
  AbsoluteFill,
  Sequence,
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Video
} from 'remotion';

const script_e54e7158_v2 = [
  { type: 'search-bar', frames: 180 }
];

let accumulatedFrames_e54e7158_v2 = 0;
const sequences_e54e7158_v2: any[] = [];

script_e54e7158_v2.forEach((item, index) => {
  sequences_e54e7158_v2.push({
    ...item,
    start: accumulatedFrames_e54e7158_v2,
    id: index
  });
  accumulatedFrames_e54e7158_v2 += item.frames;
});

const totalFrames_e54e7158_v2 = script_e54e7158_v2.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_e54e7158 = totalFrames_e54e7158_v2;

export default function GoogleSearch() {
  // Load fonts for preview/template rendering
  if (typeof window !== 'undefined' && (window as any).RemotionGoogleFonts) {
    (window as any).RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600"] });
    (window as any).RemotionGoogleFonts.loadFont("Roboto", { weights: ["400"] });
  }
  
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const searchBarScale = interpolate(frame, [20, 35], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const logoScale = interpolate(frame, [0, 25], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const searchBarOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

  // Typewriter effect for search text
  const searchText = "Campervan spots in the French alps that have good views of sunrise and sunset and there's toilets/water nearby but no people.";
  const typewriterStartFrame = 45;
  const typewriterSpeed = 2; // characters per frame
  const charactersToShow = Math.max(0, Math.floor((frame - typewriterStartFrame) * typewriterSpeed));
  const displayedText = searchText.slice(0, charactersToShow);
  
  // Reverted width to smaller, more standard size
  const searchBarWidth = Math.min(width * 0.6, 600);
  
  // Calculate number of lines based on text length and container width
  const charsPerLine = Math.floor(searchBarWidth / 12); // More accurate calculation based on actual width
  const numberOfLines = Math.max(1, Math.ceil(displayedText.length / charsPerLine));
  
  // Increased base height and dynamic height calculation
  const baseHeight = 60; // Increased from 44 to 60
  const lineHeight = 28;
  const twoLineHeight = baseHeight + lineHeight + 8; // Height for exactly 2 lines
  const dynamicHeight = baseHeight + (numberOfLines - 1) * lineHeight + 8;
  
  // Animate height change - but at frame 96 keep two lines of height
  const targetHeight = frame >= 96 ? twoLineHeight : dynamicHeight;
  const searchBarHeight = interpolate(
    frame,
    [typewriterStartFrame, typewriterStartFrame + 30],
    [baseHeight, targetHeight],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dynamic border radius - pill shaped for single line, 15px for multi-line
  const isMultiLine = numberOfLines > 1;
  const borderRadius = isMultiLine ? "15px" : "50px";

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Google Logo */}
      <div style={{
        position: "absolute",
        top: "calc(35% - 50px)",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${logoScale})`,
        opacity: logoOpacity
      }}>
        <div style={{
          fontSize: "90px",
          fontFamily: "Roboto",
          fontWeight: "400",
          letterSpacing: "-2px"
        }}>
          <span style={{ color: "#4285f4" }}>G</span>
          <span style={{ color: "#ea4335" }}>o</span>
          <span style={{ color: "#fbbc05" }}>o</span>
          <span style={{ color: "#4285f4" }}>g</span>
          <span style={{ color: "#34a853" }}>l</span>
          <span style={{ color: "#ea4335" }}>e</span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        position: "absolute",
        top: "55%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${searchBarScale})`,
        opacity: searchBarOpacity,
        width: `${searchBarWidth}px`,
        height: `${searchBarHeight}px`,
        border: "2px solid transparent",
        borderRadius: borderRadius,
        background: `
          linear-gradient(#1F1F1F, #1F1F1F) padding-box,
          linear-gradient(90deg, #66B2FF, #ADFF00, #FF4D4D, #66B2FF) border-box
        `,
        boxShadow: "0 0 30px rgba(102,178,255,.5), 0 0 60px rgba(173,255,0,.3), 0 0 90px rgba(255,77,77,.2)",
        display: "flex",
        alignItems: "flex-start",
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingTop: "12px",
        paddingBottom: "12px",
        transition: "height 0.3s ease",
        position: "relative"
      }}>
        {/* Main Content Container */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          minHeight: "36px"
        }}>
          {/* Search Input with Typewriter Text */}
          <div style={{
            flex: 1,
            fontSize: "16px",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            color: "#e8eaed",
            fontWeight: "400",
            lineHeight: "24px",
            textAlign: "left",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            paddingTop: "6px"
          }}>
            {displayedText}
            {frame >= typewriterStartFrame && charactersToShow < searchText.length && (
              <span style={{
                opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
                color: "#e8eaed"
              }}>|</span>
            )}
          </div>
        </div>

        {/* Right Side Icons Container - Positioned at bottom */}
        <div style={{
          position: "absolute",
          bottom: "12px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0
        }}>
          {/* Microphone Icon */}
          <div style={{
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#9aa0a6">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          </div>

          {/* Blue Submit Button */}
          <div style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#4285f4",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" transform="rotate(180 12 12)"/>
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration
export const templateConfig = {
  id: 'google-search',
  name: 'Google Search',
  duration: 180, // 6 seconds
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img, Video } = window.Remotion;

const script_e54e7158_v2 = [
  { type: 'search-bar', frames: 180 }
];

let accumulatedFrames_e54e7158_v2 = 0;
const sequences_e54e7158_v2 = [];

script_e54e7158_v2.forEach((item, index) => {
  sequences_e54e7158_v2.push({
    ...item,
    start: accumulatedFrames_e54e7158_v2,
    id: index
  });
  accumulatedFrames_e54e7158_v2 += item.frames;
});

const totalFrames_e54e7158_v2 = script_e54e7158_v2.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_e54e7158 = totalFrames_e54e7158_v2;

export default function TemplateScene() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600"] });
  window.RemotionGoogleFonts.loadFont("Roboto", { weights: ["400"] });
  
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const searchBarScale = interpolate(frame, [20, 35], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const logoScale = interpolate(frame, [0, 25], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const searchBarOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

  // Typewriter effect for search text
  const searchText = "Campervan spots in the French alps that have good views of sunrise and sunset and there's toilets/water nearby but no people.";
  const typewriterStartFrame = 45;
  const typewriterSpeed = 2; // characters per frame
  const charactersToShow = Math.max(0, Math.floor((frame - typewriterStartFrame) * typewriterSpeed));
  const displayedText = searchText.slice(0, charactersToShow);
  
  // Reverted width to smaller, more standard size
  const searchBarWidth = Math.min(width * 0.6, 600);
  
  // Calculate number of lines based on text length and container width
  const charsPerLine = Math.floor(searchBarWidth / 12); // More accurate calculation based on actual width
  const numberOfLines = Math.max(1, Math.ceil(displayedText.length / charsPerLine));
  
  // Increased base height and dynamic height calculation
  const baseHeight = 60; // Increased from 44 to 60
  const lineHeight = 28;
  const twoLineHeight = baseHeight + lineHeight + 8; // Height for exactly 2 lines
  const dynamicHeight = baseHeight + (numberOfLines - 1) * lineHeight + 8;
  
  // Animate height change - but at frame 96 keep two lines of height
  const targetHeight = frame >= 96 ? twoLineHeight : dynamicHeight;
  const searchBarHeight = interpolate(
    frame,
    [typewriterStartFrame, typewriterStartFrame + 30],
    [baseHeight, targetHeight],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dynamic border radius - pill shaped for single line, 15px for multi-line
  const isMultiLine = numberOfLines > 1;
  const borderRadius = isMultiLine ? "15px" : "50px";

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Google Logo */}
      <div style={{
        position: "absolute",
        top: "calc(35% - 50px)",
        left: "50%",
        transform: \`translate(-50%, -50%) scale(\${logoScale})\`,
        opacity: logoOpacity
      }}>
        <div style={{
          fontSize: "90px",
          fontFamily: "Roboto",
          fontWeight: "400",
          letterSpacing: "-2px"
        }}>
          <span style={{ color: "#4285f4" }}>G</span>
          <span style={{ color: "#ea4335" }}>o</span>
          <span style={{ color: "#fbbc05" }}>o</span>
          <span style={{ color: "#4285f4" }}>g</span>
          <span style={{ color: "#34a853" }}>l</span>
          <span style={{ color: "#ea4335" }}>e</span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        position: "absolute",
        top: "55%",
        left: "50%",
        transform: \`translate(-50%, -50%) scale(\${searchBarScale})\`,
        opacity: searchBarOpacity,
        width: \`\${searchBarWidth}px\`,
        height: \`\${searchBarHeight}px\`,
        border: "2px solid transparent",
        borderRadius: borderRadius,
        background: \`
          linear-gradient(#1F1F1F, #1F1F1F) padding-box,
          linear-gradient(90deg, #66B2FF, #ADFF00, #FF4D4D, #66B2FF) border-box
        \`,
        boxShadow: "0 0 30px rgba(102,178,255,.5), 0 0 60px rgba(173,255,0,.3), 0 0 90px rgba(255,77,77,.2)",
        display: "flex",
        alignItems: "flex-start",
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingTop: "12px",
        paddingBottom: "12px",
        transition: "height 0.3s ease",
        position: "relative"
      }}>
        {/* Main Content Container */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          minHeight: "36px"
        }}>
          {/* Search Input with Typewriter Text */}
          <div style={{
            flex: 1,
            fontSize: "16px",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            color: "#e8eaed",
            fontWeight: "400",
            lineHeight: "24px",
            textAlign: "left",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            paddingTop: "6px"
          }}>
            {displayedText}
            {frame >= typewriterStartFrame && charactersToShow < searchText.length && (
              <span style={{
                opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
                color: "#e8eaed"
              }}>|</span>
            )}
          </div>
        </div>

        {/* Right Side Icons Container - Positioned at bottom */}
        <div style={{
          position: "absolute",
          bottom: "12px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0
        }}>
          {/* Microphone Icon */}
          <window.IconifyIcon 
            icon="material-symbols:mic" 
            style={{
              fontSize: "20px",
              color: "#9aa0a6"
            }} 
          />

          {/* Blue Submit Button */}
          <div style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#4285f4",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}>
            <window.IconifyIcon 
              icon="material-symbols:arrow-upward" 
              style={{
                fontSize: "18px",
                color: "#ffffff"
              }} 
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}`,
  supportedFormats: ['landscape', 'portrait', 'square'] as const,
  category: 'interface' as const,
  tags: ['google', 'search', 'interface', 'typing', 'animation'] as const,
};
