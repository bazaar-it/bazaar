// src/templates/KnowsCode.tsx
import { AbsoluteFill, interpolate, useCurrentFrame, spring } from 'remotion';

export default function KnowsCode() {
  const frame = useCurrentFrame();

  const BRACE_START = 1;
  const TEXT_START = 5;

  const braceScale = spring({
    frame: frame - BRACE_START,
    fps: 30,
    config: {
      damping: 12,
    },
  });

  const GradientBrace = ({ isLeft, scale }: { isLeft: boolean; scale: number }) => {
    return (
      <div
        style={{
          fontSize: '140px',
          lineHeight: '140px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          background: 'linear-gradient(180deg, #FF8DC7 0%, #86A8E7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: `scale(${scale})`,
        }}
      >
        {isLeft ? '{' : '}'}
      </div>
    );
  };

  const TypewriterText = ({ text, startFrame }: { text: string; startFrame: number }) => {
    const charCount = Math.floor(
      interpolate(Math.max(0, frame - startFrame), [0, 30], [0, text.length], {
        extrapolateRight: 'clamp',
      })
    );

    const cursorVisible = Math.floor((frame - startFrame) / 15) % 2 === 0;

    return (
      <div
        style={{
          fontSize: '70px',
          lineHeight: '70px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          fontWeight: 'bold',
        }}
      >
        {text.slice(0, charCount)}
        <span
          style={{
            opacity: cursorVisible ? 1 : 0,
            borderRight: '4px solid black',
            marginLeft: '4px',
            height: '70px',
            display: 'inline-block',
          }}
        />
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          width: '80%',
          justifyContent: 'center',
        }}
      >
        <GradientBrace isLeft={true} scale={braceScale} />
        <TypewriterText text="Software is eating the world" startFrame={TEXT_START} />
        <GradientBrace isLeft={false} scale={braceScale} />
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'knowscode',
  name: 'Knows Code',
  duration: 60, // 2 seconds - animation completes at frame 35
  previewFrame: 30,
  getCode: () => `// src/templates/KnowsCode.tsx
const { AbsoluteFill, interpolate, useCurrentFrame, spring } = window.Remotion;

export default function KnowsCode() {
  const frame = useCurrentFrame();

  const BRACE_START = 1;
  const TEXT_START = 5;

  const braceScale = spring({
    frame: frame - BRACE_START,
    fps: 30,
    config: {
      damping: 12,
    },
  });

  const GradientBrace = ({ isLeft, scale }) => {
    return (
      <div
        style={{
          fontSize: '140px',
          lineHeight: '140px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          background: 'linear-gradient(180deg, #FF8DC7 0%, #86A8E7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: \`scale(\${scale})\`,
        }}
      >
        {isLeft ? '{' : '}'}
      </div>
    );
  };

  const TypewriterText = ({ text, startFrame }) => {
    const charCount = Math.floor(
      interpolate(Math.max(0, frame - startFrame), [0, 30], [0, text.length], {
        extrapolateRight: 'clamp',
      })
    );

    const cursorVisible = Math.floor((frame - startFrame) / 15) % 2 === 0;

    return (
      <div
        style={{
          fontSize: '70px',
          lineHeight: '70px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          fontWeight: 'bold',
        }}
      >
        {text.slice(0, charCount)}
        <span
          style={{
            opacity: cursorVisible ? 1 : 0,
            borderRight: '4px solid black',
            marginLeft: '4px',
            height: '70px',
            display: 'inline-block',
          }}
        />
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          width: '80%',
          justifyContent: 'center',
        }}
      >
        <GradientBrace isLeft={true} scale={braceScale} />
        <TypewriterText text="Software is eating the world" startFrame={TEXT_START} />
        <GradientBrace isLeft={false} scale={braceScale} />
      </div>
    </AbsoluteFill>
  );
}`
};