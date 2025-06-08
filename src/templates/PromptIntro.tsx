// src/templates/PromptIntro.tsx
import {
    AbsoluteFill,
    interpolate,
    useCurrentFrame,
    spring,
  } from "remotion";
  
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

    const cursorVisible = Math.floor(frame / 15) % 2 === 0;
    const buttonScale = spring({
      frame: frame - 45,
      fps: 30,
      config: {
        damping: 12,
        stiffness: 200,
      },
    });

    const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

    return (
      <AbsoluteFill
        style={{
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10%", // 10% padding on each side = 80% content width
        }}
      >
        {/* Glow Effect */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "90%",
            height: "60%",
            transform: `translate(-50%, -50%) scale(${pulse})`,
            background: `radial-gradient(
              ellipse at center,
              rgba(255, 140, 0, ${0.3 * glowIntensity}) 0%,
              rgba(255, 105, 180, ${0.2 * glowIntensity}) 50%,
              rgba(147, 112, 219, ${0.1 * glowIntensity}) 100%
            )`,
            filter: "blur(60px)",
            opacity: glowIntensity,
          }}
        />

        {/* Input Bar */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "96px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            padding: "0 48px",
            transform: `scale(${finalScale})`,
            opacity: interpolate(
              frame,
              [0, 5, CLICK_START + 15, CLICK_START + 30],
              [0, 1, 1, 0],
              { extrapolateRight: "clamp" }
            ),
            boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: "36px",
              fontFamily: "Inter, system-ui, sans-serif",
              color: text ? "#FFFFFF" : "#AAAAAA",
            }}
          >
            {text.slice(0, charCount) || "Ask Bazaar to create..."}
            {text.slice(0, charCount) && cursorVisible && (
              <span
                style={{
                  borderRight: "3px solid #FFFFFF",
                  marginLeft: "3px",
                  height: "36px",
                  display: "inline-block",
                }}
              />
            )}
          </div>
          {frame >= BUTTON_SHOW && (
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${buttonScale})`,
                cursor: "pointer",
                fontSize: "32px",
              }}
            >
              ✨
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'promptintro',
  name: 'Prompt Intro',
  duration: 180, // 6 seconds
  previewFrame: 30,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

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

  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const buttonScale = spring({
    frame: frame - 45,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 10%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "90%",
          height: "60%",
          transform: \`translate(-50%, -50%) scale(\${pulse})\`,
          background: \`radial-gradient(
            ellipse at center,
            rgba(255, 140, 0, \${0.3 * glowIntensity}) 0%,
            rgba(255, 105, 180, \${0.2 * glowIntensity}) 50%,
            rgba(147, 112, 219, \${0.1 * glowIntensity}) 100%
          )\`,
          filter: "blur(60px)",
          opacity: glowIntensity,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "96px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          padding: "0 48px",
          transform: \`scale(\${finalScale})\`,
          opacity: interpolate(
            frame,
            [0, 5, CLICK_START + 15, CLICK_START + 30],
            [0, 1, 1, 0],
            { extrapolateRight: "clamp" }
          ),
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: "32px",
            fontFamily: "Inter, system-ui, sans-serif",
            color: text ? "#FFFFFF" : "#AAAAAA",
          }}
        >
          {text.slice(0, charCount) || "Ask Bazaar to create..."}
          {text.slice(0, charCount) && cursorVisible && (
            <span
              style={{
                borderRight: "3px solid #FFFFFF",
                marginLeft: "3px",
                height: "36px",
                display: "inline-block",
              }}
            />
          )}
        </div>
        {frame >= BUTTON_SHOW && (
          <div
            style={{
              width: "60px",
              height: "60px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: \`scale(\${buttonScale})\`,
              cursor: "pointer",
              fontSize: "32px",
            }}
          >
            ✨
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}`
}; 