const { AbsoluteFill } = window.Remotion;

export default function TestFonts() {
  const fonts = [
    { name: "Default", family: "sans-serif" },
    { name: "Inter", family: "'Inter', sans-serif" },
    { name: "Roboto", family: "'Roboto', sans-serif" },
    { name: "System", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  ];

  return (
    <AbsoluteFill style={{ padding: 40, backgroundColor: "#f0f0f0" }}>
      {fonts.map((font, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ 
            fontFamily: font.family, 
            fontSize: 32,
            marginBottom: 5 
          }}>
            {font.name}: The quick brown fox jumps
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            fontFamily: {font.family}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

export const durationInFrames = 150;