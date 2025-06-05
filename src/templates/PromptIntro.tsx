// src/templates/PromptIntro.tsx
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    spring,
  } from "remotion";
  
  const InputBar: React.FC<{
    text: string;
    placeholder: string;
    showButton: boolean;
    scale: number;
    opacity: number;
  }> = ({ text, placeholder, showButton, scale, opacity }) => {
    const frame = useCurrentFrame();
    const cursorVisible = Math.floor(frame / 15) % 2 === 0;
    const buttonScale = spring({
      frame: frame - 45,
      fps: 30,
      config: {
        damping: 12,
        stiffness: 200,
      },
    });
  
    return (
      <div
        style={{
          position: "relative",
          width: "800px",
          height: "64px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          transform: `scale(${scale})`,
          opacity,
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: "24px",
            fontFamily: "Inter, system-ui, sans-serif",
            color: text ? "#FFFFFF" : "#AAAAAA",
          }}
        >
          {text || placeholder}
          {text && cursorVisible && (
            <span
              style={{
                borderRight: "2px solid #FFFFFF",
                marginLeft: "2px",
                height: "24px",
                display: "inline-block",
              }}
            />
          )}
        </div>
        {showButton && (
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${buttonScale})`,
              cursor: "pointer",
            }}
          >
            ✨
          </div>
        )}
      </div>
    );
  };
  
  const GlowEffect: React.FC<{
    intensity: number;
  }> = ({ intensity }) => {
    const frame = useCurrentFrame();
    const pulse = Math.sin(frame / 30) * 0.1 + 0.9;
  
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "900px",
          height: "200px",
          transform: `translate(-50%, -50%) scale(${pulse})`,
          background: `radial-gradient(
            ellipse at center,
            rgba(255, 140, 0, ${0.3 * intensity}) 0%,
            rgba(255, 105, 180, ${0.2 * intensity}) 50%,
            rgba(147, 112, 219, ${0.1 * intensity}) 100%
          )`,
          filter: "blur(40px)",
          opacity: intensity,
        }}
      />
    );
  };
  
  export default function PromptIntro() {
    const frame = useCurrentFrame();
    const text = "Create incredible motion graphics for your app with Bazaar";
    const TYPING_START = 0;
    const TYPING_DURATION = 45;
    const BUTTON_SHOW = 45;
    const CLICK_START = 60;
  
    const charCount = Math.floor(
      interpolate(
        frame - TYPING_START,
        [0, TYPING_DURATION],
        [0, text.length],
        { extrapolateRight: "clamp" }
      )
    );
  
    const scale = spring({
      frame: frame - CLICK_START,
      fps: 30,
      config: {
        damping: 15,
        stiffness: 80,
      },
    });
  
    const finalScale = interpolate(scale, [0, 1], [1, 0.6]);
  
    const glowIntensity = interpolate(
      frame,
      [0, 5, CLICK_START, CLICK_START + 15],
      [0, 1, 1, 0],
      { extrapolateRight: "clamp" }
    );
  
    return (
      <AbsoluteFill
        style={{
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlowEffect intensity={glowIntensity} />
        <InputBar
          text={text.slice(0, charCount)}
          placeholder="Ask Bazaar to create..."
          showButton={frame >= BUTTON_SHOW}
          scale={finalScale}
          opacity={interpolate(
            frame,
            [0, 5, CLICK_START + 15, CLICK_START + 30],
            [0, 1, 1, 0],
            { extrapolateRight: "clamp" }
          )}
        />
      </AbsoluteFill>
    );
  } 