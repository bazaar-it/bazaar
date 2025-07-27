import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
} from 'remotion';

export default function Keyboard() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive scaling for different formats
  const keyboardScale = isPortrait ? 0.6 : isSquare ? 0.8 : 1.0;

  // Script for typing "Animated Keyboard" - 17 characters + initial keyboard appearance
  const script = [
    { type: 'keyboard', frames: 30 },
    { type: 'key-A', frames: 12 },
    { type: 'key-n', frames: 12 },
    { type: 'key-i', frames: 12 },
    { type: 'key-m', frames: 12 },
    { type: 'key-a', frames: 12 },
    { type: 'key-t', frames: 12 },
    { type: 'key-e', frames: 12 },
    { type: 'key-d', frames: 12 },
    { type: 'key-space', frames: 12 },
    { type: 'key-K', frames: 12 },
    { type: 'key-e2', frames: 12 }, // second 'e'
    { type: 'key-y', frames: 12 },
    { type: 'key-b', frames: 12 },
    { type: 'key-o', frames: 12 },
    { type: 'key-a2', frames: 12 }, // second 'a'
    { type: 'key-r', frames: 12 },
    { type: 'key-d2', frames: 12 } // second 'd'
  ];

  let accumulatedFrames = 0;
  const sequences: Array<{type: string, frames: number, start: number, end: number}> = [];

  script.forEach((item) => {
    sequences.push({
      ...item,
      start: accumulatedFrames,
      end: accumulatedFrames + item.frames
    });
    accumulatedFrames += item.frames;
  });

  const keyboardOpacity = interpolate(frame, [0, 20], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  const getKeyGlow = (keyFrame: string) => {
    const sequence = sequences.find(seq => seq.type === keyFrame);
    if (!sequence) return { opacity: 0, scale: 1 };
    
    const progress = interpolate(frame, [sequence.start, sequence.start + 6, sequence.end - 3, sequence.end], [0, 1, 1, 0], { 
      extrapolateLeft: "clamp", 
      extrapolateRight: "clamp" 
    });
    
    const scale = interpolate(
      frame, 
      [sequence.start, sequence.start + 3, sequence.end - 2, sequence.end], 
      [1.0, 1.2, 1.2, 1.0], 
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    
    return { opacity: progress, scale };
  };

  // Get glow data for all keys
  const keyGlows = {
    A: getKeyGlow('key-A'),
    n: getKeyGlow('key-n'),
    i: getKeyGlow('key-i'),
    m: getKeyGlow('key-m'),
    a: getKeyGlow('key-a'),
    t: getKeyGlow('key-t'),
    e: getKeyGlow('key-e'),
    d: getKeyGlow('key-d'),
    space: getKeyGlow('key-space'),
    K: getKeyGlow('key-K'),
    e2: getKeyGlow('key-e2'),
    y: getKeyGlow('key-y'),
    b: getKeyGlow('key-b'),
    o: getKeyGlow('key-o'),
    a2: getKeyGlow('key-a2'),
    r: getKeyGlow('key-r'),
    d2: getKeyGlow('key-d2')
  };

  const KeyButton = ({ 
    children, 
    style = {}, 
    isActive = false, 
    glowData = { opacity: 0, scale: 1 } 
  }: {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    isActive?: boolean;
    glowData?: { opacity: number; scale: number };
  }) => (
    <div style={{
      width: "72px",
      height: "72px",
      backgroundColor: "#f8f9fa",
      border: `2px solid ${isActive ? "#007bff" : "#e9ecef"}`,
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "21.6px",
      fontWeight: "500",
      color: "#495057",
      boxShadow: isActive ? `0 0 20px rgba(0, 123, 255, ${glowData.opacity * 0.6})` : "0 2px 4px rgba(0,0,0,0.1)",
      transform: `scale(${glowData.scale})`,
      transition: "all 0.1s ease",
      ...style
    }}>
      {children}
    </div>
  );

  // Build the typed text progressively
  const getTypedText = () => {
    const targetText = "Animated Keyboard";
    const characterTimings = [
      { char: 'A', startFrame: 30 },
      { char: 'n', startFrame: 42 },
      { char: 'i', startFrame: 54 },
      { char: 'm', startFrame: 66 },
      { char: 'a', startFrame: 78 },
      { char: 't', startFrame: 90 },
      { char: 'e', startFrame: 102 },
      { char: 'd', startFrame: 114 },
      { char: ' ', startFrame: 126 },
      { char: 'K', startFrame: 138 },
      { char: 'e', startFrame: 150 },
      { char: 'y', startFrame: 162 },
      { char: 'b', startFrame: 174 },
      { char: 'o', startFrame: 186 },
      { char: 'a', startFrame: 198 },
      { char: 'r', startFrame: 210 },
      { char: 'd', startFrame: 222 }
    ];

    let result = "";
    for (const timing of characterTimings) {
      if (frame >= timing.startFrame) {
        result += timing.char;
      }
    }
    return result;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#f5f5f5" }}>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${1.2 * keyboardScale})`,
        opacity: keyboardOpacity,
        width: "98%",
        maxWidth: "1200px"
      }}>
        {/* Function Row */}
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "96px" }}>esc</KeyButton>
          <KeyButton>☀️</KeyButton>
          <KeyButton>🔆</KeyButton>
          <KeyButton>⌨️</KeyButton>
          <KeyButton>🔍</KeyButton>
          <KeyButton>🎤</KeyButton>
          <KeyButton>🌙</KeyButton>
          <KeyButton>⏪</KeyButton>
          <KeyButton>⏸️</KeyButton>
          <KeyButton>⏩</KeyButton>
          <KeyButton>🔇</KeyButton>
          <KeyButton>🔉</KeyButton>
          <KeyButton>🔊</KeyButton>
        </div>

        {/* Number Row */}
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton>~</KeyButton>
          <KeyButton>1</KeyButton>
          <KeyButton>2</KeyButton>
          <KeyButton>3</KeyButton>
          <KeyButton>4</KeyButton>
          <KeyButton>5</KeyButton>
          <KeyButton>6</KeyButton>
          <KeyButton>7</KeyButton>
          <KeyButton>8</KeyButton>
          <KeyButton>9</KeyButton>
          <KeyButton>0</KeyButton>
          <KeyButton>-</KeyButton>
          <KeyButton>=</KeyButton>
        </div>

        {/* QWERTY Row */}
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "108px" }}>tab</KeyButton>
          <KeyButton>Q</KeyButton>
          <KeyButton>W</KeyButton>
          <KeyButton isActive={keyGlows.e.opacity > 0 || keyGlows.e2.opacity > 0} glowData={keyGlows.e.opacity > 0 ? keyGlows.e : keyGlows.e2}>E</KeyButton>
          <KeyButton isActive={keyGlows.r.opacity > 0} glowData={keyGlows.r}>R</KeyButton>
          <KeyButton isActive={keyGlows.t.opacity > 0} glowData={keyGlows.t}>T</KeyButton>
          <KeyButton isActive={keyGlows.y.opacity > 0} glowData={keyGlows.y}>Y</KeyButton>
          <KeyButton>U</KeyButton>
          <KeyButton isActive={keyGlows.i.opacity > 0} glowData={keyGlows.i}>I</KeyButton>
          <KeyButton isActive={keyGlows.o.opacity > 0} glowData={keyGlows.o}>O</KeyButton>
          <KeyButton>P</KeyButton>
          <KeyButton>[</KeyButton>
          <KeyButton>]</KeyButton>
        </div>

        {/* ASDF Row */}
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "120px" }}>caps lock</KeyButton>
          <KeyButton isActive={keyGlows.A.opacity > 0 || keyGlows.a.opacity > 0 || keyGlows.a2.opacity > 0} glowData={keyGlows.A.opacity > 0 ? keyGlows.A : (keyGlows.a.opacity > 0 ? keyGlows.a : keyGlows.a2)}>A</KeyButton>
          <KeyButton>S</KeyButton>
          <KeyButton isActive={keyGlows.d.opacity > 0 || keyGlows.d2.opacity > 0} glowData={keyGlows.d.opacity > 0 ? keyGlows.d : keyGlows.d2}>D</KeyButton>
          <KeyButton>F</KeyButton>
          <KeyButton>G</KeyButton>
          <KeyButton>H</KeyButton>
          <KeyButton>J</KeyButton>
          <KeyButton isActive={keyGlows.K.opacity > 0} glowData={keyGlows.K}>K</KeyButton>
          <KeyButton>L</KeyButton>
          <KeyButton>;</KeyButton>
          <KeyButton>'</KeyButton>
        </div>

        {/* ZXCV Row */}
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "144px" }}>shift</KeyButton>
          <KeyButton>Z</KeyButton>
          <KeyButton>X</KeyButton>
          <KeyButton>C</KeyButton>
          <KeyButton>V</KeyButton>
          <KeyButton isActive={keyGlows.b.opacity > 0} glowData={keyGlows.b}>B</KeyButton>
          <KeyButton isActive={keyGlows.n.opacity > 0} glowData={keyGlows.n}>N</KeyButton>
          <KeyButton isActive={keyGlows.m.opacity > 0} glowData={keyGlows.m}>M</KeyButton>
          <KeyButton>,</KeyButton>
          <KeyButton>.</KeyButton>
          <KeyButton>/</KeyButton>
        </div>

        {/* Bottom Row */}
        <div style={{ display: "flex", gap: "9.6px", justifyContent: "center", alignItems: "flex-end" }}>
          <KeyButton style={{ width: "72px", height: "48px" }}>fn</KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>⌃</KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>⌥</KeyButton>
          <KeyButton style={{ width: "96px", height: "48px" }}>⌘</KeyButton>
          <KeyButton 
            style={{ width: "360px", height: "48px" }} 
            isActive={keyGlows.space.opacity > 0} 
            glowData={keyGlows.space}
          ></KeyButton>
          <KeyButton style={{ width: "96px", height: "48px" }}>⌘</KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>⌥</KeyButton>
        </div>

        {/* Typing display */}
        {frame > 30 && (
          <div style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translate(-50%, 0)",
            fontSize: "56px",
            fontWeight: "500",
            color: "#007bff",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            whiteSpace: "nowrap",
            width: "max-content"
          }}>
            {getTypedText()}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'keyboard',
  name: 'Keyboard',
  duration: 240, // 8 seconds to accommodate all the typing
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } = window.Remotion;

export default function Keyboard() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500"] });
  
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive scaling for different formats
  const keyboardScale = isPortrait ? 0.6 : isSquare ? 0.8 : 1.0;

  const script = [
    { type: 'keyboard', frames: 30 },
    { type: 'key-A', frames: 12 },
    { type: 'key-n', frames: 12 },
    { type: 'key-i', frames: 12 },
    { type: 'key-m', frames: 12 },
    { type: 'key-a', frames: 12 },
    { type: 'key-t', frames: 12 },
    { type: 'key-e', frames: 12 },
    { type: 'key-d', frames: 12 },
    { type: 'key-space', frames: 12 },
    { type: 'key-K', frames: 12 },
    { type: 'key-e2', frames: 12 },
    { type: 'key-y', frames: 12 },
    { type: 'key-b', frames: 12 },
    { type: 'key-o', frames: 12 },
    { type: 'key-a2', frames: 12 },
    { type: 'key-r', frames: 12 },
    { type: 'key-d2', frames: 12 }
  ];

  let accumulatedFrames = 0;
  const sequences = [];

  script.forEach((item) => {
    sequences.push({
      ...item,
      start: accumulatedFrames,
      end: accumulatedFrames + item.frames
    });
    accumulatedFrames += item.frames;
  });

  const keyboardOpacity = interpolate(frame, [0, 20], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  const getKeyGlow = (keyFrame) => {
    const sequence = sequences.find(seq => seq.type === keyFrame);
    if (!sequence) return { opacity: 0, scale: 1 };
    
    const progress = interpolate(frame, [sequence.start, sequence.start + 6, sequence.end - 3, sequence.end], [0, 1, 1, 0], { 
      extrapolateLeft: "clamp", 
      extrapolateRight: "clamp" 
    });
    
    const scale = interpolate(
      frame, 
      [sequence.start, sequence.start + 3, sequence.end - 2, sequence.end], 
      [1.0, 1.2, 1.2, 1.0], 
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    
    return { opacity: progress, scale };
  };

  const keyGlows = {
    A: getKeyGlow('key-A'),
    n: getKeyGlow('key-n'),
    i: getKeyGlow('key-i'),
    m: getKeyGlow('key-m'),
    a: getKeyGlow('key-a'),
    t: getKeyGlow('key-t'),
    e: getKeyGlow('key-e'),
    d: getKeyGlow('key-d'),
    space: getKeyGlow('key-space'),
    K: getKeyGlow('key-K'),
    e2: getKeyGlow('key-e2'),
    y: getKeyGlow('key-y'),
    b: getKeyGlow('key-b'),
    o: getKeyGlow('key-o'),
    a2: getKeyGlow('key-a2'),
    r: getKeyGlow('key-r'),
    d2: getKeyGlow('key-d2')
  };

  const KeyButton = ({ children, style = {}, isActive = false, glowData = { opacity: 0, scale: 1 } }) => (
    <div style={{
      width: "72px",
      height: "72px",
      backgroundColor: "#f8f9fa",
      border: \`2px solid \${isActive ? "#007bff" : "#e9ecef"}\`,
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "21.6px",
      fontWeight: "500",
      color: "#495057",
      boxShadow: isActive ? \`0 0 20px rgba(0, 123, 255, \${glowData.opacity * 0.6})\` : "0 2px 4px rgba(0,0,0,0.1)",
      transform: \`scale(\${glowData.scale})\`,
      transition: "all 0.1s ease",
      ...style
    }}>
      {children}
    </div>
  );

  const getTypedText = () => {
    const characterTimings = [
      { char: 'A', startFrame: 30 },
      { char: 'n', startFrame: 42 },
      { char: 'i', startFrame: 54 },
      { char: 'm', startFrame: 66 },
      { char: 'a', startFrame: 78 },
      { char: 't', startFrame: 90 },
      { char: 'e', startFrame: 102 },
      { char: 'd', startFrame: 114 },
      { char: ' ', startFrame: 126 },
      { char: 'K', startFrame: 138 },
      { char: 'e', startFrame: 150 },
      { char: 'y', startFrame: 162 },
      { char: 'b', startFrame: 174 },
      { char: 'o', startFrame: 186 },
      { char: 'a', startFrame: 198 },
      { char: 'r', startFrame: 210 },
      { char: 'd', startFrame: 222 }
    ];

    let result = "";
    for (const timing of characterTimings) {
      if (frame >= timing.startFrame) {
        result += timing.char;
      }
    }
    return result;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#f5f5f5" }}>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: \`translate(-50%, -50%) scale(\${1.2 * keyboardScale})\`,
        opacity: keyboardOpacity,
        width: "98%",
        maxWidth: "1200px"
      }}>
        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "96px" }}>esc</KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:wb-sunny-outline" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:brightness-high" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:tab-outline" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:search" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:mic-outline" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:bedtime-outline" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:fast-rewind" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:pause" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:fast-forward" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:volume-mute" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:volume-down" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
          <KeyButton>
            <window.IconifyIcon icon="material-symbols:volume-up" style={{ fontSize: "24px", color: "#495057" }} />
          </KeyButton>
        </div>

        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton>~</KeyButton>
          <KeyButton>1</KeyButton>
          <KeyButton>2</KeyButton>
          <KeyButton>3</KeyButton>
          <KeyButton>4</KeyButton>
          <KeyButton>5</KeyButton>
          <KeyButton>6</KeyButton>
          <KeyButton>7</KeyButton>
          <KeyButton>8</KeyButton>
          <KeyButton>9</KeyButton>
          <KeyButton>0</KeyButton>
          <KeyButton>-</KeyButton>
          <KeyButton>=</KeyButton>
        </div>

        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "108px" }}>tab</KeyButton>
          <KeyButton>Q</KeyButton>
          <KeyButton>W</KeyButton>
          <KeyButton isActive={keyGlows.e.opacity > 0 || keyGlows.e2.opacity > 0} glowData={keyGlows.e.opacity > 0 ? keyGlows.e : keyGlows.e2}>E</KeyButton>
          <KeyButton isActive={keyGlows.r.opacity > 0} glowData={keyGlows.r}>R</KeyButton>
          <KeyButton isActive={keyGlows.t.opacity > 0} glowData={keyGlows.t}>T</KeyButton>
          <KeyButton isActive={keyGlows.y.opacity > 0} glowData={keyGlows.y}>Y</KeyButton>
          <KeyButton>U</KeyButton>
          <KeyButton isActive={keyGlows.i.opacity > 0} glowData={keyGlows.i}>I</KeyButton>
          <KeyButton isActive={keyGlows.o.opacity > 0} glowData={keyGlows.o}>O</KeyButton>
          <KeyButton>P</KeyButton>
          <KeyButton>[</KeyButton>
          <KeyButton>]</KeyButton>
        </div>

        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "120px" }}>caps lock</KeyButton>
          <KeyButton isActive={keyGlows.A.opacity > 0 || keyGlows.a.opacity > 0 || keyGlows.a2.opacity > 0} glowData={keyGlows.A.opacity > 0 ? keyGlows.A : (keyGlows.a.opacity > 0 ? keyGlows.a : keyGlows.a2)}>A</KeyButton>
          <KeyButton>S</KeyButton>
          <KeyButton isActive={keyGlows.d.opacity > 0 || keyGlows.d2.opacity > 0} glowData={keyGlows.d.opacity > 0 ? keyGlows.d : keyGlows.d2}>D</KeyButton>
          <KeyButton>F</KeyButton>
          <KeyButton>G</KeyButton>
          <KeyButton>H</KeyButton>
          <KeyButton>J</KeyButton>
          <KeyButton isActive={keyGlows.K.opacity > 0} glowData={keyGlows.K}>K</KeyButton>
          <KeyButton>L</KeyButton>
          <KeyButton>;</KeyButton>
          <KeyButton>'</KeyButton>
        </div>

        <div style={{ display: "flex", gap: "9.6px", marginBottom: "9.6px", justifyContent: "center" }}>
          <KeyButton style={{ width: "144px" }}>shift</KeyButton>
          <KeyButton>Z</KeyButton>
          <KeyButton>X</KeyButton>
          <KeyButton>C</KeyButton>
          <KeyButton>V</KeyButton>
          <KeyButton isActive={keyGlows.b.opacity > 0} glowData={keyGlows.b}>B</KeyButton>
          <KeyButton isActive={keyGlows.n.opacity > 0} glowData={keyGlows.n}>N</KeyButton>
          <KeyButton isActive={keyGlows.m.opacity > 0} glowData={keyGlows.m}>M</KeyButton>
          <KeyButton>,</KeyButton>
          <KeyButton>.</KeyButton>
          <KeyButton>/</KeyButton>
        </div>

        <div style={{ display: "flex", gap: "9.6px", justifyContent: "center", alignItems: "flex-end" }}>
          <KeyButton style={{ width: "72px", height: "48px" }}>fn</KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>
            <window.IconifyIcon icon="material-symbols--keyboard-control-key-rounded" style={{ fontSize: "19.2px", color: "#495057" }} />
          </KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>
            <window.IconifyIcon icon="material-symbols--keyboard-option-key-rounded" style={{ fontSize: "19.2px", color: "#495057" }} />
          </KeyButton>
          <KeyButton style={{ width: "96px", height: "48px" }}>
            <window.IconifyIcon icon="material-symbols--keyboard-command-key" style={{ fontSize: "19.2px", color: "#495057" }} />
          </KeyButton>
          <KeyButton 
            style={{ width: "360px", height: "48px" }} 
            isActive={keyGlows.space.opacity > 0} 
            glowData={keyGlows.space}
          ></KeyButton>
          <KeyButton style={{ width: "96px", height: "48px" }}>
            <window.IconifyIcon icon="material-symbols--keyboard-command-key" style={{ fontSize: "19.2px", color: "#495057" }} />
          </KeyButton>
          <KeyButton style={{ width: "72px", height: "48px" }}>
            <window.IconifyIcon icon="material-symbols--keyboard-option-key-rounded" style={{ fontSize: "19.2px", color: "#495057" }} />
          </KeyButton>
        </div>

        {frame > 30 && (
          <div style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translate(-50%, 0)",
            fontSize: "56px",
            fontWeight: "500",
            color: "#007bff",
            textAlign: "center",
            fontFamily: "Inter",
            whiteSpace: "nowrap",
            width: "max-content"
          }}>
            {getTypedText()}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}`
}; 