// src/templates/FastText.tsx
import {
  AbsoluteFill,
  Sequence,
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const script_A7B9C2D4 = [
  { text: "This is a fast typography scene.", frames: 45, pause: 40 },
  { text: "It breaks long sentences down into chunks", frames: 50, pause: 40 },
  { text: "and combines multiple text effects", frames: 40, pause: 40 },
  { text: "to make an engaging video.", frames: 40, pause: 40 },
  { text: "Try it by pasting in your script.", frames: 45, pause: 50 }
];

let accumulatedFrames_A7B9C2D4 = 0;
let sequences_A7B9C2D4: any[] = [];

script_A7B9C2D4.forEach((item, index) => {
  sequences_A7B9C2D4.push({
    ...item,
    startFrame: accumulatedFrames_A7B9C2D4,
    endFrame: accumulatedFrames_A7B9C2D4 + item.frames + item.pause
  });
  accumulatedFrames_A7B9C2D4 += item.frames + item.pause;
});

const totalFrames_A7B9C2D4 = script_A7B9C2D4.reduce((sum, item) => sum + item.frames + item.pause, 0);

function TextReveal({ text, animationType, width, height, animationFrames, pauseFrames }: {
  text: string;
  animationType: number;
  width: number;
  height: number;
  animationFrames: number;
  pauseFrames: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const wordCount = words.length;
  const charCount = text.length;
  
  // Increased font size calculation - made significantly bigger
  let fontSize = Math.min(width, height) * 0.12; // Increased from 0.08 to 0.12 (50% bigger)
  
  // Adjust for text length - less aggressive scaling to keep text bigger
  if (charCount > 30) {
    fontSize *= 0.8; // Increased from 0.7 to 0.8
  } else if (charCount > 20) {
    fontSize *= 0.9; // Increased from 0.85 to 0.9
  }
  
  // Ensure minimum readable size - increased minimum
  fontSize = Math.max(fontSize, width * 0.045); // Increased from 0.03 to 0.045

  // Dynamic timing based on allocated animation frames
  const revealDuration = Math.max(6, animationFrames * 0.15); // Scale reveal duration with animation frames
  const holdStart = revealDuration + 3;

  // Text stays visible during animation phase and pause phase
  const containerOpacity = interpolate(
    frame,
    [0, 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Function to break text into lines if needed
  const breakTextIntoLines = (text: string) => {
    const words = text.split(" ");
    if (words.length <= 4) return [text]; // Short sentences stay on one line
    
    const lines: string[] = [];
    let currentLine = "";
    
    words.forEach((word, index) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Estimate if line would be too long (rough character count)
      if (testLine.length > 25 && currentLine !== "") {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const textLines = breakTextIntoLines(text);
  const isMultiLine = textLines.length > 1;

  const renderWords = () => {
    if (animationType === 3) {
      // Typewriter effect - scale timing with animation frames
      const typewriterDuration = animationFrames * 0.8; // Use 80% of animation frames for typing
      const charsToShow = Math.floor(interpolate(
        frame,
        [0, typewriterDuration],
        [0, text.length],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ));
      
      // Show cursor only during animation phase, not during pause
      const showCursor = frame < animationFrames && frame % 20 < 10;
      
      return (
        <div style={{ textAlign: "center" }}>
          {textLines.map((line, lineIndex) => {
            const lineStart = textLines.slice(0, lineIndex).join(" ").length + (lineIndex > 0 ? lineIndex : 0);
            const lineEnd = lineStart + line.length;
            const lineCharsToShow = Math.max(0, Math.min(line.length, charsToShow - lineStart));
            
            return (
              <div key={lineIndex} style={{ minHeight: "1.2em" }}>
                {line.substring(0, lineCharsToShow)}
                {lineCharsToShow < line.length && lineCharsToShow > 0 && showCursor && (
                  <span style={{ opacity: 1 }}>|</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // For other animation types, render each line separately with dynamic timing
    return (
      <div style={{ textAlign: "center" }}>
        {textLines.map((line, lineIndex) => {
          const lineWords = line.split(" ");
          
          return (
            <div key={lineIndex} style={{ minHeight: "1.2em", marginBottom: isMultiLine ? "0.2em" : "0" }}>
              {lineWords.map((word, wordIndex) => {
                const globalWordIndex = textLines.slice(0, lineIndex).reduce((acc, prevLine) => acc + prevLine.split(" ").length, 0) + wordIndex;
                const totalWords = text.split(" ").length;
                
                // Dynamic word timing based on animation frames
                const wordDelay = (animationFrames * 0.7) / totalWords; // Spread words across 70% of animation time
                
                switch (animationType) {
                  case 0: // Slide from right
                    const wordStart = globalWordIndex * wordDelay;
                    const wordOpacity = interpolate(
                      frame,
                      [wordStart, wordStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordX = interpolate(
                      frame,
                      [wordStart, wordStart + revealDuration],
                      [50, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: wordOpacity,
                          transform: `translateX(${wordX}px)`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  case 1: // Cascade from left
                    const cascadeStart = globalWordIndex * wordDelay;
                    const cascadeOpacity = interpolate(
                      frame,
                      [cascadeStart, cascadeStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordY = interpolate(
                      frame,
                      [cascadeStart, cascadeStart + revealDuration],
                      [-30, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: cascadeOpacity,
                          transform: `translateY(${wordY}px)`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  case 2: // Scale reveal
                    const scaleStart = globalWordIndex * wordDelay;
                    const scaleOpacity = interpolate(
                      frame,
                      [scaleStart, scaleStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordScale = interpolate(
                      frame,
                      [scaleStart, scaleStart + revealDuration],
                      [0.3, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: scaleOpacity,
                          transform: `scale(${wordScale})`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  default:
                    return (
                      <span key={wordIndex} style={{ marginRight: "0.3em" }}>
                        {word}
                      </span>
                    );
                }
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: "Inter, sans-serif",
        fontWeight: "700",
        color: "#ffffff",
        textAlign: "center",
        lineHeight: "1.2",
        wordSpacing: "0.05em",
        opacity: containerOpacity,
        maxWidth: "85%",
        padding: "0 2rem",
        wordWrap: "break-word",
        overflowWrap: "break-word"
      }}
    >
      {renderWords()}
    </div>
  );
}

export default function FastText() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const gradientOffset = interpolate(
    frame,
    [0, totalFrames_A7B9C2D4],
    [0, 360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const backgroundStyle = {
    background: `linear-gradient(45deg, 
      hsl(${280 + Math.sin(gradientOffset * Math.PI / 180) * 20}, 80%, 60%), 
      hsl(${30 + Math.cos(gradientOffset * Math.PI / 180) * 15}, 85%, 65%))`
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      {sequences_A7B9C2D4.map((seq, index) => (
        <Sequence
          key={index}
          from={seq.startFrame}
          durationInFrames={seq.frames + seq.pause}
        >
          <AbsoluteFill
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <TextReveal 
              text={seq.text} 
              animationType={index % 4} 
              width={width} 
              height={height} 
              animationFrames={seq.frames} 
              pauseFrames={seq.pause} 
            />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'fast-text',
  name: 'Fast Text',
  duration: totalFrames_A7B9C2D4, // Dynamic duration based on script
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

const script_A7B9C2D4 = [
  { text: "This is a fast typography scene.", frames: 45, pause: 40 },
  { text: "It breaks long sentences down into chunks", frames: 50, pause: 40 },
  { text: "and combines multiple text effects", frames: 40, pause: 40 },
  { text: "to make an engaging video.", frames: 40, pause: 40 },
  { text: "Try it by pasting in your script.", frames: 45, pause: 50 }
];

let accumulatedFrames_A7B9C2D4 = 0;
let sequences_A7B9C2D4 = [];

script_A7B9C2D4.forEach((item, index) => {
  sequences_A7B9C2D4.push({
    ...item,
    startFrame: accumulatedFrames_A7B9C2D4,
    endFrame: accumulatedFrames_A7B9C2D4 + item.frames + item.pause
  });
  accumulatedFrames_A7B9C2D4 += item.frames + item.pause;
});

const totalFrames_A7B9C2D4 = script_A7B9C2D4.reduce((sum, item) => sum + item.frames + item.pause, 0);
export const durationInFrames_A7B9C2D4 = totalFrames_A7B9C2D4;

export default function Scene_A7B9C2D4() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["700"] });
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const gradientOffset = interpolate(
    frame,
    [0, totalFrames_A7B9C2D4],
    [0, 360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const backgroundStyle = {
    background: \`linear-gradient(45deg, 
      hsl(\${280 + Math.sin(gradientOffset * Math.PI / 180) * 20}, 80%, 60%), 
      hsl(\${30 + Math.cos(gradientOffset * Math.PI / 180) * 15}, 85%, 65%))\`
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      {sequences_A7B9C2D4.map((seq, index) => (
        <Sequence
          key={index}
          from={seq.startFrame}
          durationInFrames={seq.frames + seq.pause}
        >
          <AbsoluteFill
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <TextReveal text={seq.text} animationType={index % 4} width={width} height={height} animationFrames={seq.frames} pauseFrames={seq.pause} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function TextReveal({ text, animationType, width, height, animationFrames, pauseFrames }) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const wordCount = words.length;
  const charCount = text.length;
  
  // Increased font size calculation - made significantly bigger
  let fontSize = Math.min(width, height) * 0.12; // Increased from 0.08 to 0.12 (50% bigger)
  
  // Adjust for text length - less aggressive scaling to keep text bigger
  if (charCount > 30) {
    fontSize *= 0.8; // Increased from 0.7 to 0.8
  } else if (charCount > 20) {
    fontSize *= 0.9; // Increased from 0.85 to 0.9
  }
  
  // Ensure minimum readable size - increased minimum
  fontSize = Math.max(fontSize, width * 0.045); // Increased from 0.03 to 0.045

  // Dynamic timing based on allocated animation frames
  const revealDuration = Math.max(6, animationFrames * 0.15); // Scale reveal duration with animation frames
  const holdStart = revealDuration + 3;

  // Text stays visible during animation phase and pause phase
  const containerOpacity = interpolate(
    frame,
    [0, 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Function to break text into lines if needed
  const breakTextIntoLines = (text) => {
    const words = text.split(" ");
    if (words.length <= 4) return [text]; // Short sentences stay on one line
    
    const lines = [];
    let currentLine = "";
    
    words.forEach((word, index) => {
      const testLine = currentLine ? \`\${currentLine} \${word}\` : word;
      
      // Estimate if line would be too long (rough character count)
      if (testLine.length > 25 && currentLine !== "") {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const textLines = breakTextIntoLines(text);
  const isMultiLine = textLines.length > 1;

  const renderWords = () => {
    if (animationType === 3) {
      // Typewriter effect - scale timing with animation frames
      const typewriterDuration = animationFrames * 0.8; // Use 80% of animation frames for typing
      const charsToShow = Math.floor(interpolate(
        frame,
        [0, typewriterDuration],
        [0, text.length],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      ));
      
      // Show cursor only during animation phase, not during pause
      const showCursor = frame < animationFrames && frame % 20 < 10;
      
      return (
        <div style={{ textAlign: "center" }}>
          {textLines.map((line, lineIndex) => {
            const lineStart = textLines.slice(0, lineIndex).join(" ").length + (lineIndex > 0 ? lineIndex : 0);
            const lineEnd = lineStart + line.length;
            const lineCharsToShow = Math.max(0, Math.min(line.length, charsToShow - lineStart));
            
            return (
              <div key={lineIndex} style={{ minHeight: "1.2em" }}>
                {line.substring(0, lineCharsToShow)}
                {lineCharsToShow < line.length && lineCharsToShow > 0 && showCursor && (
                  <span style={{ opacity: 1 }}>|</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // For other animation types, render each line separately with dynamic timing
    return (
      <div style={{ textAlign: "center" }}>
        {textLines.map((line, lineIndex) => {
          const lineWords = line.split(" ");
          
          return (
            <div key={lineIndex} style={{ minHeight: "1.2em", marginBottom: isMultiLine ? "0.2em" : "0" }}>
              {lineWords.map((word, wordIndex) => {
                const globalWordIndex = textLines.slice(0, lineIndex).reduce((acc, prevLine) => acc + prevLine.split(" ").length, 0) + wordIndex;
                const totalWords = text.split(" ").length;
                
                // Dynamic word timing based on animation frames
                const wordDelay = (animationFrames * 0.7) / totalWords; // Spread words across 70% of animation time
                
                switch (animationType) {
                  case 0: // Slide from right
                    const wordStart = globalWordIndex * wordDelay;
                    const wordOpacity = interpolate(
                      frame,
                      [wordStart, wordStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordX = interpolate(
                      frame,
                      [wordStart, wordStart + revealDuration],
                      [50, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: wordOpacity,
                          transform: \`translateX(\${wordX}px)\`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  case 1: // Cascade from left
                    const cascadeStart = globalWordIndex * wordDelay;
                    const cascadeOpacity = interpolate(
                      frame,
                      [cascadeStart, cascadeStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordY = interpolate(
                      frame,
                      [cascadeStart, cascadeStart + revealDuration],
                      [-30, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: cascadeOpacity,
                          transform: \`translateY(\${wordY}px)\`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  case 2: // Scale reveal
                    const scaleStart = globalWordIndex * wordDelay;
                    const scaleOpacity = interpolate(
                      frame,
                      [scaleStart, scaleStart + revealDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    const wordScale = interpolate(
                      frame,
                      [scaleStart, scaleStart + revealDuration],
                      [0.3, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    );
                    
                    return (
                      <span
                        key={wordIndex}
                        style={{
                          opacity: scaleOpacity,
                          transform: \`scale(\${wordScale})\`,
                          marginRight: "0.3em",
                          display: "inline-block"
                        }}
                      >
                        {word}
                      </span>
                    );

                  default:
                    return (
                      <span key={wordIndex} style={{ marginRight: "0.3em" }}>
                        {word}
                      </span>
                    );
                }
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        fontSize: \`\${fontSize}px\`,
        fontFamily: "Inter",
        fontWeight: "700",
        color: "#ffffff",
        textAlign: "center",
        lineHeight: "1.2",
        wordSpacing: "0.05em",
        opacity: containerOpacity,
        maxWidth: "85%",
        padding: "0 2rem",
        wordWrap: "break-word",
        overflowWrap: "break-word"
      }}
    >
      {renderWords()}
    </div>
  );
}`
}; 