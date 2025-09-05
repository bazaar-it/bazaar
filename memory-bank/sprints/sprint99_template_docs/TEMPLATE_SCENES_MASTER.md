# Template Scenes Master Document

This document contains all the requested template scenes from the production database with their IDs, names, and complete TSX code.

---

## 1. Corporate Credit Card
**ID:** `acdb2ab4-e40c-415d-a697-4d79f6d45cd3`  
**Name:** `Corporate Credit Card_axjz2xbo`

```tsx
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_a8f3d2e1 = [
  { type: "card-entrance", frames: 30 },
  { type: "feature-1", frames: 18 },
  { type: "feature-2", frames: 18 },
  { type: "feature-3", frames: 18 },
  { type: "feature-4", frames: 18 },
  { type: "feature-5", frames: 18 },
  { type: "feature-6", frames: 18 },
  { type: "feature-7", frames: 18 },
  { type: "feature-8", frames: 18 },
  { type: "hold", frames: 15 }
];

const sequences_a8f3d2e1 = [];
let accumulatedFrames_a8f3d2e1 = 0;

script_a8f3d2e1.forEach((segment, index) => {
  sequences_a8f3d2e1.push({
    ...segment,
    start: accumulatedFrames_a8f3d2e1,
    end: accumulatedFrames_a8f3d2e1 + segment.frames
  });
  accumulatedFrames_a8f3d2e1 += segment.frames;
});

const totalFrames_a8f3d2e1 = script_a8f3d2e1.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_a8f3d2e1 = totalFrames_a8f3d2e1;

export default function TemplateScene_d86c_49b3_9559_227311651f22() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame: frame - sequences_a8f3d2e1[0].start,
    fps,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 20
  });

  const cardOpacity = interpolate(
    frame - sequences_a8f3d2e1[0].start,
    [0, 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Animated diagonal overlay
  const diagonalAnimation = interpolate(
    frame - sequences_a8f3d2e1[0].start,
    [0, 40],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature1Slide = spring({
    frame: frame - sequences_a8f3d2e1[1].start,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 18
  });

  const feature1Opacity = interpolate(
    frame - sequences_a8f3d2e1[1].start,
    [0, 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature2Scale = spring({
    frame: frame - sequences_a8f3d2e1[2].start,
    fps,
    config: { damping: 10, stiffness: 140 },
    durationInFrames: 16
  });

  const feature2Opacity = interpolate(
    frame - sequences_a8f3d2e1[2].start,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature3Slide = spring({
    frame: frame - sequences_a8f3d2e1[3].start,
    fps,
    config: { damping: 14, stiffness: 110 },
    durationInFrames: 18
  });

  const feature3Opacity = interpolate(
    frame - sequences_a8f3d2e1[3].start,
    [0, 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature4Scale = spring({
    frame: frame - sequences_a8f3d2e1[4].start,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 18
  });

  const feature4Opacity = interpolate(
    frame - sequences_a8f3d2e1[4].start,
    [0, 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature5Slide = spring({
    frame: frame - sequences_a8f3d2e1[5].start,
    fps,
    config: { damping: 10, stiffness: 140 },
    durationInFrames: 16
  });

  const feature5Opacity = interpolate(
    frame - sequences_a8f3d2e1[5].start,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature6Scale = spring({
    frame: frame - sequences_a8f3d2e1[6].start,
    fps,
    config: { damping: 14, stiffness: 110 },
    durationInFrames: 18
  });

  const feature6Opacity = interpolate(
    frame - sequences_a8f3d2e1[6].start,
    [0, 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature7Slide = spring({
    frame: frame - sequences_a8f3d2e1[7].start,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 18
  });

  const feature7Opacity = interpolate(
    frame - sequences_a8f3d2e1[7].start,
    [0, 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const feature8Scale = spring({
    frame: frame - sequences_a8f3d2e1[8].start,
    fps,
    config: { damping: 10, stiffness: 140 },
    durationInFrames: 16
  });

  const feature8Opacity = interpolate(
    frame - sequences_a8f3d2e1[8].start,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f9fa" }}>
      {/* Main Ramp Credit Card */}
      {frame >= sequences_a8f3d2e1[0].start && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${cardScale})`,
            opacity: cardOpacity,
            width: "600px",
            height: "380px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            overflow: "hidden",
            position: "relative"
          }}
        >
          {/* Animated diagonal pattern overlay */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)",
              opacity: diagonalAnimation,
              transform: `translateX(${interpolate(diagonalAnimation, [0, 1], [-100, 0])}px)`,
              pointerEvents: "none"
            }}
          />
          
          {/* Ramp logo */}
          <Img
            src="https://cdn.brandfetch.io/idWQ_FWEk6/w/800/h/213/idB_fuD3sk.png?c=1bxid64Mup7aczewSAYMX&t=1661145054279"
            style={{
              position: "absolute",
              top: "40px",
              left: "40px",
              height: "42px",
              width: "auto",
              objectFit: "contain"
            }}
          />
          
          {/* Visa logo */}
          <Img
            src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
            style={{
              position: "absolute",
              top: "40px",
              right: "40px",
              height: "32px",
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)" // Make it white
            }}
          />
          
          {/* Credit Card Chip - positioned on bottom right */}
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              right: "60px",
              width: "50px",
              height: "40px",
              background: "linear-gradient(135deg, #f7fafc 0%, #e2e8f0 50%, #cbd5e0 100%)",
              borderRadius: "6px",
              border: "2px solid #a0aec0",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.2)",
              position: "relative"
            }}
          >
            {/* Chip contact lines - horizontal */}
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                right: "8px",
                bottom: "8px",
                background: "repeating-linear-gradient(0deg, #a0aec0 0px, #a0aec0 1px, transparent 1px, transparent 3px)",
                borderRadius: "2px"
              }}
            />
            {/* Chip contact lines - vertical */}
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                right: "8px",
                bottom: "8px",
                background: "repeating-linear-gradient(90deg, #a0aec0 0px, #a0aec0 1px, transparent 1px, transparent 3px)",
                borderRadius: "2px"
              }}
            />
          </div>
        </div>
      )}

      {/* Feature 1: Uber with green tick */}
      {frame >= sequences_a8f3d2e1[1].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "15%",
            transform: `translateX(${interpolate(feature1Slide, [0, 1], [-100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            opacity: feature1Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:check" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Uber
          </span>
        </div>
      )}

      {/* Feature 2: Meals with red X */}
      {frame >= sequences_a8f3d2e1[2].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "10%",
            transform: `scale(${feature2Scale})`,
            opacity: feature2Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:close" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Meals
          </span>
        </div>
      )}

      {/* Feature 3: SAAS Subscription with green tick */}
      {frame >= sequences_a8f3d2e1[3].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "65%",
            left: "20%",
            transform: `translateY(${interpolate(feature3Slide, [0, 1], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            opacity: feature3Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:check" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            SAAS Subscription
          </span>
        </div>
      )}

      {/* Feature 4: Office supplies with red X */}
      {frame >= sequences_a8f3d2e1[4].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "80%",
            left: "15%",
            transform: `scale(${feature4Scale})`,
            opacity: feature4Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:close" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Office supplies
          </span>
        </div>
      )}

      {/* Feature 5: Parking with red X */}
      {frame >= sequences_a8f3d2e1[5].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "15%",
            transform: `translateX(${interpolate(feature5Slide, [0, 1], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            opacity: feature5Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:close" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Parking
          </span>
        </div>
      )}

      {/* Feature 6: Alcohol with green tick */}
      {frame >= sequences_a8f3d2e1[6].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "10%",
            transform: `scale(${feature6Scale})`,
            opacity: feature6Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:check" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Alcohol
          </span>
        </div>
      )}

      {/* Feature 7: Pet supplies with green tick */}
      {frame >= sequences_a8f3d2e1[7].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "70%",
            right: "20%",
            transform: `translateY(${interpolate(feature7Slide, [0, 1], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            opacity: feature7Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:check" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Pet supplies
          </span>
        </div>
      )}

      {/* Feature 8: Charitable donations with red X */}
      {frame >= sequences_a8f3d2e1[8].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "25%",
            transform: `scale(${feature8Scale})`,
            opacity: feature8Opacity,
            background: "#ffffff",
            padding: "28px 40px",
            borderRadius: "20px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <window.IconifyIcon icon="mdi:close" style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "28px",
              color: "#2d3748"
            }}
          >
            Charitable donations
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
}
```

---

## 2. Message Notification
**ID:** `7bda89d2-fd1d-4f06-821c-997fcacbfeaf`  
**Name:** `Message notification _vo5hrbok`

```tsx
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A1B2C3D4 = [
  { type: "notification", frames: 90 } // 3 seconds at 30fps
];

const sequences_A1B2C3D4 = [];
let accumulatedFrames_A1B2C3D4 = 0;

script_A1B2C3D4.forEach((item, index) => {
  sequences_A1B2C3D4.push({
    ...item,
    startFrame: accumulatedFrames_A1B2C3D4,
    endFrame: accumulatedFrames_A1B2C3D4 + item.frames
  });
  accumulatedFrames_A1B2C3D4 += item.frames;
});

const totalFrames_A1B2C3D4 = script_A1B2C3D4.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_A1B2C3D4 = totalFrames_A1B2C3D4;

export default function MessageNotificationScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msToFrames = (ms) => Math.round((ms / 1000) * fps);

  // Animation timing in frames
  const bgStart = msToFrames(0);
  const bgEnd = msToFrames(180);
  const iconStart = msToFrames(40);
  const iconEnd = msToFrames(340);
  const senderStart = msToFrames(90);
  const senderEnd = msToFrames(290);
  const timestampStart = msToFrames(90);
  const timestampEnd = msToFrames(290);
  const previewStart = msToFrames(180);
  const previewEnd = msToFrames(380);
  const exitStart = msToFrames(2800);
  const exitEnd = msToFrames(3000);

  // Background animation
  const bgOpacity = interpolate(
    frame,
    [bgStart, bgEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bgScale = interpolate(
    frame,
    [bgStart, bgEnd],
    [0.96, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Icon animation
  const iconOpacity = interpolate(
    frame,
    [iconStart, iconEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const iconScale = spring({
    frame: frame - iconStart,
    fps,
    config: { damping: 8, stiffness: 120 },
    from: 0.6,
    to: 1.0
  });

  // Sender animation
  const senderOpacity = interpolate(
    frame,
    [senderStart, senderEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const senderY = interpolate(
    frame,
    [senderStart, senderEnd],
    [16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Timestamp animation
  const timestampOpacity = interpolate(
    frame,
    [timestampStart, timestampEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const timestampScale = spring({
    frame: frame - timestampStart,
    fps,
    config: { damping: 8, stiffness: 120 },
    from: 0.6,
    to: 1.0
  });

  // Preview animation
  const previewOpacity = interpolate(
    frame,
    [previewStart, previewEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const previewY = interpolate(
    frame,
    [previewStart, previewEnd],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Exit animation
  const exitOpacity = frame >= exitStart
    ? interpolate(
        frame,
        [exitStart, exitEnd],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  const exitScale = frame >= exitStart
    ? interpolate(
        frame,
        [exitStart, exitEnd],
        [1.0, 0.8],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${bgScale * exitScale})`,
          width: "1200px",
          height: "240px",
          borderRadius: "28px",
          background: "rgba(240, 240, 242, 0.92)",
          backdropFilter: "blur(20px)",
          padding: "36px",
          display: "flex",
          alignItems: "center",
          opacity: bgOpacity * exitOpacity,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        {/* App Icon */}
        <div
          style={{
            width: "160px",
            height: "160px",
            borderRadius: "43px",
            background: "linear-gradient(135deg, #34C759, #30D158)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: iconOpacity * exitOpacity,
            transform: `scale(${iconScale})`,
            flexShrink: 0
          }}
        >
          <window.IconifyIcon
            icon="material-symbols:chat-bubble-rounded"
            style={{ fontSize: "100px", color: "#FFFFFF" }}
          />
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            marginLeft: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: "24px"
          }}
        >
          {/* Sender */}
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: "56px",
              color: "#0B0B0F",
              opacity: senderOpacity * exitOpacity,
              transform: `translateY(${senderY}px)`,
              lineHeight: "1.2",
              marginBottom: "12px"
            }}
          >
            Bazaar Bot
          </div>

          {/* Message Preview */}
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: "500",
              fontSize: "56px",
              color: "#0B0B0F",
              opacity: previewOpacity * exitOpacity,
              transform: `translateY(${previewY}px)`,
              lineHeight: "1.2"
            }}
          >
            Yet another sick animation 💃
          </div>
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: "600",
            fontSize: "44px",
            color: "#8E8E93",
            opacity: timestampOpacity * exitOpacity,
            transform: `scale(${timestampScale})`,
            alignSelf: "flex-start",
            marginTop: "8px",
            paddingLeft: "12px"
          }}
        >
          now
        </div>
      </div>
    </AbsoluteFill>
  );
}
```

## 3. UI Data Visualization
**ID:** `6929100c-c7f5-4117-8148-117446ac2b7f`  
**Name:** `UI Data Visualisation _3u9bhd7z`

```tsx
const { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion; const script_A8B9C2D1 = [ { type: "simultaneous_animation", frames: 25 } ]; const sequences_A8B9C2D1 = []; let accumulatedFrames_A8B9C2D1 = 0; script_A8B9C2D1.forEach((segment, index) => { sequences_A8B9C2D1.push({ ...segment, start: accumulatedFrames_A8B9C2D1, end: accumulatedFrames_A8B9C2D1 + segment.frames }); accumulatedFrames_A8B9C2D1 += segment.frames; }); const totalFrames_A8B9C2D1 = script_A8B9C2D1.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_A8B9C2D1 = totalFrames_A8B9C2D1; export default function TemplateScene() { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); // Profile image scaling animation (80% to 100%) const profileScale = interpolate( frame, [0, 15], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t } ); // Total Revenue card sliding up from bottom - ease in ease out const revenueY = interpolate( frame, [0, 15], [200, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t } ); // Data Customer Profile sliding down from top - ease in ease out const dataY = interpolate( frame, [0, 15], [-150, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t } ); // Bar chart animation - bars growing and changing const bar1Height = interpolate( frame, [10, 20], [60, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const bar2Height = interpolate( frame, [12, 22], [90, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const bar3Height = interpolate( frame, [14, 24], [100, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const bar4Height = interpolate( frame, [16, 25], [70, 85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const bar5Height = interpolate( frame, [18, 25], [50, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); // Percentage values changing const percentage1 = Math.round(interpolate( frame, [10, 20], [57, 62], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } )); const percentage2 = Math.round(interpolate( frame, [12, 22], [69, 65], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } )); const percentage3 = Math.round(interpolate( frame, [14, 24], [79, 84], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } )); return ( <AbsoluteFill style={{ backgroundColor: "#F4E76E" }}> {/* Data Customer Profile Card - Behind, sliding down, moved more to the left */} <div style={{ position: "absolute", top: "50%", right: "30%", transform: `translate(0, calc(-50% + ${dataY}px))`, backgroundColor: "#2A2A2A", borderRadius: "24px", padding: "32px", width: "400px", height: "320px", zIndex: 1 }} > <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}> <div style={{ width: "32px", height: "32px", backgroundColor: "white", borderRadius: "8px", marginRight: "16px", display: "flex", alignItems: "center", justifyContent: "center" }} > <window.IconifyIcon icon="mdi:star-four-points" style={{ fontSize: "20px", color: "#2A2A2A" }} /> </div> <div> <div style={{ color: "white", fontSize: "24px", fontWeight: "700", fontFamily: "Inter" }}>DATA</div> <div style={{ color: "#888", fontSize: "18px", fontFamily: "Inter" }}>Customer Profile</div> </div> </div> {/* Bar Chart */} <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", height: "140px", marginBottom: "16px" }}> <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage1}%</div> <div style={{ width: "40px", height: `${bar1Height}px`, backgroundColor: "#F4E76E", borderRadius: "4px" }} /> <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>I-32</div> </div> <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage2}%</div> <div style={{ width: "40px", height: `${bar2Height}px`, backgroundColor: "white", borderRadius: "4px" }} /> <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>USA</div> </div> <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage3}%</div> <div style={{ width: "40px", height: `${bar3Height}px`, backgroundColor: "#F4E76E", borderRadius: "4px" }} /> <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>W</div> </div> <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>51%</div> <div style={{ width: "40px", height: `${bar4Height}px`, backgroundColor: "white", borderRadius: "4px" }} /> <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>M</div> </div> <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>41%</div> <div style={{ width: "40px", height: `${bar5Height}px`, backgroundColor: "white", borderRadius: "4px" }} /> <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>F</div> </div> </div> <div style={{ position: "absolute", bottom: "20px", right: "20px", width: "32px", height: "32px", border: "2px solid #666", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} > <window.IconifyIcon icon="mdi:plus" style={{ fontSize: "16px", color: "#666" }} /> </div> </div> {/* Total Revenue Card - Sliding up from bottom, moved further right */} <div style={{ position: "absolute", top: "65%", left: "32%", transform: `translate(0, calc(-50% + ${revenueY}px))`, backgroundColor: "#2A2A2A", borderRadius: "24px", padding: "40px", width: "380px", height: "200px", zIndex: 2 }} > <div style={{ color: "white", fontSize: "24px", fontWeight: "400", marginBottom: "16px", fontFamily: "Inter" }}> Total Revenue </div> <div style={{ color: "#F4E76E", fontSize: "72px", fontWeight: "700", fontFamily: "Inter" }}> $125K </div> </div> {/* Profile Avatar - Black man avatar, moved down and more to the right */} <div style={{ position: "absolute", top: "40%", left: "40%", transform: `translate(-50%, -50%) scale(${profileScale})`, zIndex: 3 }} > <div style={{ width: "200px", height: "200px", borderRadius: "50%", background: "linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }} > <Img src={window.BazaarAvatars['black-man']} style={{ width: "180px", height: "180px", borderRadius: "50%", objectFit: "cover" }} /> </div> </div> </AbsoluteFill> ); }

## 4. Home Screen Notifications
**ID:** `9f79c9f1-fde5-44d8-af31-f7ac6ba034a4`  
**Name:** `Home screen notifications_hrdmduof`

const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion; const script_A1B2C3D4 = [ { type: "notification", frames: 120 } // Extended to 4 seconds ]; const sequences_A1B2C3D4 = []; let accumulatedFrames_A1B2C3D4 = 0; script_A1B2C3D4.forEach((item, index) => { sequences_A1B2C3D4.push({ ...item, startFrame: accumulatedFrames_A1B2C3D4, endFrame: accumulatedFrames_A1B2C3D4 + item.frames }); accumulatedFrames_A1B2C3D4 += item.frames; }); const totalFrames_A1B2C3D4 = script_A1B2C3D4.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_A1B2C3D4 = totalFrames_A1B2C3D4; export default function TemplateScene() { const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const msToFrames = (ms) => Math.round((ms / 1000) * fps); // Animation timing in frames - restored independent animations const bgStart = msToFrames(0); const bgEnd = msToFrames(180); const iconStart = msToFrames(40); const iconEnd = msToFrames(340); const senderStart = msToFrames(90); const senderEnd = msToFrames(290); const timestampStart = msToFrames(90); const timestampEnd = msToFrames(290); const previewStart = msToFrames(180); const previewEnd = msToFrames(380); const exitStart = msToFrames(4800); // Extended by 1 second (1000ms) const exitEnd = msToFrames(5000); // Extended by 1 second (1000ms) // First notification slide-up animation - starts immediately and uses cubic easing const slideUpStart = 0; const slideUpEnd = msToFrames(600); // 600ms slide duration const notificationY = interpolate( frame, [slideUpStart, slideUpEnd], [200, 0], // Slide from 200px below to final position { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) // Cubic easing (smoothstep) } ); // Second notification animation - appears after first message slides up + 20 frame pause const secondNotifStart = slideUpEnd + 20; // Wait for slide to complete + 20 frame pause const secondNotifSlideEnd = secondNotifStart + msToFrames(600); const secondNotificationY = interpolate( frame, [secondNotifStart, secondNotifSlideEnd], [200, -120], // Slide from bottom to above first notification with padding { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) // Cubic easing (smoothstep) } ); // Third notification animation - appears after second notification slides up + 20 frame pause const thirdNotifStart = secondNotifSlideEnd + 20; // Wait for second slide to complete + 20 frame pause const thirdNotifSlideEnd = thirdNotifStart + msToFrames(600); const thirdNotificationY = interpolate( frame, [thirdNotifStart, thirdNotifSlideEnd], [200, -240], // Slide from bottom to above second notification with padding { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) // Cubic easing (smoothstep) } ); // Background animation - independent const bgOpacity = interpolate( frame, [bgStart, bgEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const bgScale = interpolate( frame, [bgStart, bgEnd], [0.96, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); // Icon animation - independent const iconOpacity = interpolate( frame, [iconStart, iconEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const iconScale = spring({ frame: frame - iconStart, fps, config: { damping: 8, stiffness: 120 }, from: 0.6, to: 1.0 }); // Sender animation - independent const senderOpacity = interpolate( frame, [senderStart, senderEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const senderY = interpolate( frame, [senderStart, senderEnd], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); // Timestamp animation - independent const timestampOpacity = interpolate( frame, [timestampStart, timestampEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const timestampScale = spring({ frame: frame - timestampStart, fps, config: { damping: 8, stiffness: 120 }, from: 0.6, to: 1.0 }); // Preview animation - independent const previewOpacity = interpolate( frame, [previewStart, previewEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); const previewY = interpolate( frame, [previewStart, previewEnd], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); // Exit animation - independent - updated timing const exitOpacity = frame >= exitStart ? interpolate( frame, [exitStart, exitEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ) : 1; const exitScale = frame >= exitStart ? interpolate( frame, [exitStart, exitEnd], [1.0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ) : 1; // NEW: Fade out animation for all messages over final 10 frames (110-120) const fadeOutOpacity = interpolate( frame, [110, 120], // Updated to final 10 frames of extended duration [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ); // iPhone dimensions and positioning - CENTERED HORIZONTALLY const phoneWidth = 375; // Fixed width as requested const phoneHeight = 812; // Fixed height as requested const phoneX = width * 0.5; // Changed from 0.75 to 0.5 for horizontal center const phoneY = height * 0.5; return ( <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}> {/* iPhone Container */} <div style={{ position: "absolute", left: phoneX, top: phoneY, transform: "translate(-50%, -50%)", width: phoneWidth, height: phoneHeight }}> {/* iPhone Frame */} <div style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#000", borderRadius: phoneWidth * 0.167, // Proportional border radius padding: phoneWidth * 0.027 // Proportional padding }}> {/* iPhone Screen */} <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: phoneWidth * 0.14, overflow: "hidden", background: "linear-gradient(135deg, #4A90E2 0%, #7B68EE 25%, #87CEEB 50%, #F4A460 75%, #32CD32 100%)" }}> {/* Dynamic Island - moved up more */} <div style={{ position: "absolute", top: phoneWidth * 0.035, // Changed from 0.04 to 0.035 to move up more left: "50%", transform: "translateX(-50%)", width: phoneWidth * 0.4, height: phoneWidth * 0.1, backgroundColor: "#000", borderRadius: phoneWidth * 0.05 }} /> {/* Status Bar */} <div style={{ position: "absolute", top: phoneWidth * 0.067, left: phoneWidth * 0.067, color: "#fff", fontSize: phoneWidth * 0.047, fontWeight: "600", fontFamily: "SF Pro Display" }}> T-mobile </div> <div style={{ position: "absolute", top: phoneWidth * 0.05, right: phoneWidth * 0.067, color: "#fff", fontSize: phoneWidth * 0.047, fontWeight: "600", display: "flex", gap: phoneWidth * 0.017, alignItems: "center" }}> <window.IconifyIcon icon="material-symbols:signal-cellular-4-bar" style={{ fontSize: phoneWidth * 0.053 }} /> <window.IconifyIcon icon="material-symbols:wifi" style={{ fontSize: phoneWidth * 0.053 }} /> <window.IconifyIcon icon="material-symbols:battery-full" style={{ fontSize: phoneWidth * 0.053 }} /> </div> {/* Time */} <div style={{ position: "absolute", top: phoneWidth * 0.37, left: "50%", transform: "translateX(-50%)", color: "#fff", fontSize: phoneWidth * 0.27, fontWeight: "600", textAlign: "center", lineHeight: "1", fontFamily: "Inter" }}> 9:41 </div> {/* Third notification (Elon Musk) - appears after second message slides up + 20 frame pause */} {frame >= thirdNotifStart && ( <div style={{ position: "absolute", bottom: "55px", left: "20px", right: "20px", transform: `scale(${bgScale * exitScale}) translateY(${thirdNotificationY}px)`, minHeight: "80px", borderRadius: "12px", background: "rgba(240, 240, 242, 0.92)", backdropFilter: "blur(20px)", padding: "16px", display: "flex", alignItems: "center", opacity: bgOpacity * exitOpacity * fadeOutOpacity, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)", zIndex: 3 }} > {/* App Icon - X (Twitter) */} <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", opacity: iconOpacity, transform: `scale(${iconScale})`, flexShrink: 0 }} > <window.IconifyIcon icon="simple-icons:x" style={{ fontSize: "24px", color: "#FFFFFF" }} /> </div> {/* Content Area */} <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }} > {/* Sender */} <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", opacity: senderOpacity, transform: `translateY(${senderY}px)`, lineHeight: "1.2", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} > Elon Musk </div> {/* Message Preview */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", opacity: previewOpacity, transform: `translateY(${previewY}px)`, lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} > I am god </div> </div> {/* Timestamp */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", opacity: timestampOpacity, transform: `scale(${timestampScale})`, alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px", flexShrink: 0 }} > now </div> </div> )} {/* Second notification (Mum) - appears after first message slides up + 20 frame pause */} {frame >= secondNotifStart && ( <div style={{ position: "absolute", bottom: "80px", left: "20px", right: "20px", transform: `scale(${bgScale * exitScale}) translateY(${secondNotificationY}px)`, minHeight: "80px", borderRadius: "12px", background: "rgba(240, 240, 242, 0.92)", backdropFilter: "blur(20px)", padding: "16px", display: "flex", alignItems: "center", opacity: bgOpacity * exitOpacity * fadeOutOpacity, // Added fadeOutOpacity boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)", zIndex: 2 }} > {/* App Icon - Changed to WhatsApp */} <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", opacity: iconOpacity, transform: `scale(${iconScale})`, flexShrink: 0 }} > <window.IconifyIcon icon="ic:baseline-whatsapp" style={{ fontSize: "32px", color: "#FFFFFF" }} /> </div> {/* Content Area */} <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }} > {/* Sender */} <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", opacity: senderOpacity, transform: `translateY(${senderY}px)`, lineHeight: "1.2", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} > Mum </div> {/* Message Preview */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", opacity: previewOpacity, transform: `translateY(${previewY}px)`, lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} > Come home and clean your room </div> </div> {/* Timestamp */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", opacity: timestampOpacity, transform: `scale(${timestampScale})`, alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px", flexShrink: 0 }} > now </div> </div> )} {/* First notification (Bazaar Bot) - stays in original position */} <div style={{ position: "absolute", bottom: "110px", left: "20px", right: "20px", transform: `scale(${bgScale * exitScale}) translateY(${notificationY}px)`, minHeight: "80px", borderRadius: "12px", background: "rgba(240, 240, 242, 0.92)", backdropFilter: "blur(20px)", padding: "16px", display: "flex", alignItems: "center", opacity: bgOpacity * exitOpacity * fadeOutOpacity, // Added fadeOutOpacity boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)", zIndex: 1 }} > {/* App Icon - independent animation */} <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #34C759, #30D158)", display: "flex", alignItems: "center", justifyContent: "center", opacity: iconOpacity, transform: `scale(${iconScale})`, flexShrink: 0 }} > <window.IconifyIcon icon="material-symbols:chat-bubble-rounded" style={{ fontSize: "24px", color: "#FFFFFF" }} /> </div> {/* Content Area */} <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 // Allows text to wrap properly }} > {/* Sender - independent animation */} <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", opacity: senderOpacity, transform: `translateY(${senderY}px)`, lineHeight: "1.2", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} > Bazaar Bot </div> {/* Message Preview - independent animation */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", opacity: previewOpacity, transform: `translateY(${previewY}px)`, lineHeight: "1.3", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} > Yet another sick animation 💃 </div> </div> {/* Timestamp - independent animation */} <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", opacity: timestampOpacity, transform: `scale(${timestampScale})`, alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px", flexShrink: 0 }} > now </div> </div> {/* Lock Screen Icons - Torch and Camera - repositioned with more spacing */} <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", width: "280px", // Increased width for more spacing display: "flex", justifyContent: "space-between", alignItems: "center", opacity: bgOpacity * exitOpacity }}> {/* Torch Icon - moved more left */} <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.3)" }}> <window.IconifyIcon icon="material-symbols:flashlight-on" style={{ fontSize: "24px", color: "#FFFFFF" }} /> </div> {/* Camera Icon - moved more right */} <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.3)" }}> <window.IconifyIcon icon="material-symbols:photo-camera" style={{ fontSize: "24px", color: "#FFFFFF" }} /> </div> </div> {/* iPhone Home Indicator Bar */} <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", width: "134px", height: "5px", backgroundColor: "rgba(255, 255, 255, 0.6)", borderRadius: "2.5px" }} /> </div> </div> </div> </AbsoluteFill> ); }

## 5. Testimonials
**ID:** `6f23a6a8-0eef-430e-a998-721606173f8c`  
**Name:** `Testimonials _hey9u57z`

const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion; const testimonials_8a7f2b3c = [ { text: "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.", name: "Saman Malik", role: "Customer Support Lead", avatar: window.BazaarAvatars['asian-woman'] }, { text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient.", name: "Zainab Hussain", role: "Project Manager", avatar: window.BazaarAvatars['middle-eastern-man'] }, { text: "Using this ERP, our online presence and conversions significantly improved, boosting business performance.", name: "Hassan Ali", role: "E-commerce Manager", avatar: window.BazaarAvatars['black-man'] }, { text: "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.", name: "Briana Patton", role: "Operations Manager", avatar: window.BazaarAvatars['white-woman'] }, { text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.", name: "Aliza Khan", role: "Business Analyst", avatar: window.BazaarAvatars['hispanic-man'] }, { text: "Our business functions improved with a user-friendly design and positive customer feedback.", name: "Farhan Siddiqui", role: "Marketing Director", avatar: window.BazaarAvatars['asian-woman'] } ]; const script_8a7f2b3c = [ { type: "header", frames: 360 }, { type: "testimonials", frames: 360 } ]; let accumulatedFrames_8a7f2b3c = 0; const sequences_8a7f2b3c = script_8a7f2b3c.map(item => { const sequence = { ...item, start: accumulatedFrames_8a7f2b3c }; accumulatedFrames_8a7f2b3c += item.frames; return sequence; }); const totalFrames_8a7f2b3c = script_8a7f2b3c.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_8a7f2b3c = totalFrames_8a7f2b3c; const TestimonialCard = ({ testimonial, delay, speed }) => { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } }); const translateY = interpolate( frame, [0, 600], [0, -2000], { extrapolateLeft: "clamp", extrapolateRight: "extend" } ) * speed; const opacity = interpolate(cardSpring, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); const scale = interpolate(cardSpring, [0, 1], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); return ( <div style={{ backgroundColor: "white", borderRadius: "24px", padding: "40px", marginBottom: "24px", maxWidth: "320px", width: "100%", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.05)", opacity, transform: `translateY(${translateY}px) scale(${scale})`, transformOrigin: "center" }} > <div style={{ fontSize: "16px", lineHeight: "1.5", color: "#374151", marginBottom: "20px", fontFamily: "Inter", fontWeight: "400" }} > {testimonial.text} </div> <div style={{ display: "flex", alignItems: "center", gap: "12px" }}> <img src={testimonial.avatar} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} /> <div> <div style={{ fontFamily: "Inter", fontWeight: "600", fontSize: "14px", color: "#111827", lineHeight: "1.2" }} > {testimonial.name} </div> <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "14px", color: "#6B7280", lineHeight: "1.2" }} > {testimonial.role} </div> </div> </div> </div> ); }; const TestimonialColumn = ({ testimonials, speed, delay }) => { return ( <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => ( <TestimonialCard key={index} testimonial={testimonial} delay={delay} speed={speed} /> ))} </div> ); }; export default function TemplateScene() { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const headerSequence = sequences_8a7f2b3c.find(s => s.type === "header"); const testimonialsSequence = sequences_8a7f2b3c.find(s => s.type === "testimonials"); return ( <AbsoluteFill style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", fontFamily: "Inter" }} > {/* Header Section */} {frame >= headerSequence.start && frame < headerSequence.start + headerSequence.frames && ( <div style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 10 }} > <h1 style={{ fontSize: "48px", fontWeight: "800", color: "#111827", marginBottom: "16px", fontFamily: "Inter", opacity: interpolate( spring({ frame: frame - headerSequence.start, fps, config: { damping: 12, stiffness: 100 } }), [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } ), transform: `translateY(${interpolate( spring({ frame: frame - headerSequence.start, fps, config: { damping: 12, stiffness: 100 } }), [0, 1], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" } )}px)` }} > What our users say </h1> </div> )} {/* Testimonials Columns */} {frame >= headerSequence.start && ( <div style={{ position: "absolute", top: "200px", left: "0", right: "0", display: "flex", justifyContent: "center", gap: "32px", overflow: "hidden", height: "calc(100vh - 200px)" }} > <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(0, 2)} speed={0.8} delay={headerSequence.start} /> <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(2, 4)} speed={1.0} delay={headerSequence.start} /> <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(4, 6)} speed={1.2} delay={headerSequence.start} /> </div> )} </AbsoluteFill> ); }

## 6. Google Sign In
**ID:** `2e0f1411-d452-4d79-a1a7-167f407ab96c`  
**Name:** `Google Sign In_rowq30p8`

1	const { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, } = window.Remotion; export default function GoogleSignIn() { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const fadeIn = spring({ frame, fps, config: { damping: 20, stiffness: 80, }, }); const buttonScale = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 200, }, }); const hover = spring({ frame: frame - 45, fps, config: { damping: 12, stiffness: 200, }, }); const shadowSize = interpolate(hover, [0, 1], [30, 45]); const pulse = Math.sin(frame / 30) * 0.1 + 0.9; return ( <AbsoluteFill style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10%', }} > <div style={{ position: 'absolute', top: '50%', left: '50%', width: '90%', height: '60%', transform: `translate(-50%, -50%) scale(${pulse})`, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%)', filter: 'blur(60px)', opacity: fadeIn, }} /> <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, background: 'white', color: '#1a1a1a', border: '2px solid #ccc', borderRadius: 100, padding: '40px 60px', fontSize: 48, fontFamily: 'Inter, sans-serif', fontWeight: 500, cursor: 'pointer', opacity: fadeIn, transform: `scale(${interpolate(buttonScale, [0, 1], [0.9, 1])})`, boxShadow: `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, 0.1)`, width: '50%', maxWidth: '50%', }} > <svg width="48" height="48" viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg" > <path d="M255.68 133.49c0-11.26-.93-22.07-2.67-32.52H130v61.55h70.68c-3.06 16.52-12.28 30.51-26.18 39.89v33.03h42.32c24.75-22.8 38.86-56.4 38.86-101.95z" fill="#4285F4" /> <path d="M130 262c35.1 0 64.56-11.66 86.08-31.6l-42.32-33.03c-11.78 7.9-26.88 12.56-43.76 12.56-33.64 0-62.15-22.71-72.34-53.2H14.59v33.59C36.2 230.82 79.91 262 130 262z" fill="#34A853" /> <path d="M57.66 156.73c-2.77-8.23-4.36-17-4.36-26s1.59-17.77 4.36-26V71.14H14.59C5.28 88.79 0 109.1 0 130s5.28 41.21 14.59 58.86l43.07-32.13z" fill="#FBBC05" /> <path d="M130 51.05c19.08 0 36.16 6.56 49.68 19.42l37.26-37.26C194.56 11.72 165.1 0 130 0 79.91 0 36.2 31.18 14.59 71.14l43.07 33.59C67.85 73.76 96.36 51.05 130 51.05z" fill="#EA4335" /> </svg> Sign in with Google </div> </AbsoluteFill> ); } export const durationInFrames_GoogleSignIn = 90;


## 7. Bar Charts
### Option 1: Pill Shaped Bar Chart
**ID:** `e9443f6e-5573-44cf-9a72-ec21f71673ea`  
**Name:** `Pill Shaped Bar Chart_h7zvil42`

const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion; const script_mer2yohf = [ { type: 'chart', text: 'Animated Histogram', frames: 120 }, { type: 'hold', text: 'Final Display', frames: 30 } ]; const sequences_mer2yohf = []; let accumulatedFrames_mer2yohf = 0; script_mer2yohf.forEach((segment, index) => { sequences_mer2yohf.push({ ...segment, start: accumulatedFrames_mer2yohf, end: accumulatedFrames_mer2yohf + segment.frames }); accumulatedFrames_mer2yohf += segment.frames; }); const totalFrames_mer2yohf = script_mer2yohf.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_mer2yohf = totalFrames_mer2yohf; export default function TemplateScene() { const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const histogramData = [ { label: '512', value: 512 }, { label: '240', value: 240, highlight: true }, { label: '480', value: 480 }, { label: '360', value: 360 }, { label: '440', value: 440, highlight: true }, { label: '640', value: 640 }, { label: '480', value: 480 }, { label: '360', value: 360, highlight: true } ]; function HistogramChart({ progress }) { const maxValue = Math.max(...histogramData.map(d => d.value)); const chartWidth = 600; const maxChartHeight = 500; // Increased for better spacing const chartX = (width - chartWidth) / 2; const chartY = (height - maxChartHeight) / 2; // Centered vertically const barWidth = (chartWidth - 80) / histogramData.length; const padding = 8; const visibleBars = Math.floor(progress * histogramData.length); return ( <div style={{ position: 'absolute', left: chartX, top: chartY, width: chartWidth, height: maxChartHeight, backgroundColor: '#f8f9fa', borderRadius: '16px', padding: '32px 24px', display: 'flex', flexDirection: 'column' }} > {/* Chart Title */} <div style={{ fontSize: '48px', fontWeight: '600', color: '#2d3748', marginBottom: '8px', fontFamily: 'Inter' }}> Pill Shaped Bar Chart </div> {/* Check Level Indicator */} <div style={{ display: 'flex', alignItems: 'center', marginBottom: '64px', // Increased padding between title and bars fontSize: '32px', fontFamily: 'Inter' }}> <div style={{ width: '24px', height: '24px', backgroundColor: '#ff6b35', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'white', fontWeight: 'bold' }}>✓</div> <span style={{ color: '#ff6b35', fontWeight: '500' }}>Check Something</span> </div> {/* Chart Container with Fixed Layout */} <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}> {/* Bars Container */} <div style={{ height: '280px', // Fixed height for bars area display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' // Fixed gap between bars and labels }}> {histogramData.map((data, index) => { const barHeight = interpolate( data.value, [0, maxValue], [20, 260] // Fixed max height within the bars container ); const animatedHeight = index < visibleBars ? spring({ frame: frame - (index * 6), fps, config: { damping: 12, stiffness: 100 } }) * barHeight : index === visibleBars ? interpolate( progress * histogramData.length - visibleBars, [0, 1], [0, barHeight] ) : 0; // Determine bar color - bars 2, 5, and 7 should be orange const isOrangeBar = index === 2 || index === 5 || index === 7; const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7'; return ( <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: barWidth - padding }}> {/* Bar with rounded pill shape */} <div style={{ width: barWidth - padding, height: Math.max(0, animatedHeight), backgroundColor: barColor, borderRadius: `${(barWidth - padding) / 2}px`, position: 'relative', transition: 'all 0.3s ease' }}> {/* White circle indicator inside orange bars */} {isOrangeBar && animatedHeight > 40 && ( <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%' }} /> )} </div> </div> ); })} </div> {/* X-axis labels - Fixed position container */} <div style={{ height: '30px', // Fixed height for labels display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> {histogramData.map((data, index) => ( <div key={index} style={{ fontSize: '16px', color: '#4a5568', fontFamily: 'Inter', fontWeight: '600', width: barWidth - padding, textAlign: 'center' }}> {data.label} </div> ))} </div> </div> </div> ); } const progress = Math.min(frame / 120, 1); return ( <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}> <HistogramChart progress={Math.max(0, progress)} /> </AbsoluteFill> ); }

### Option 2: Yellow Bar Chart
**ID:** `9360a385-8ae9-4daf-9297-c2049f72b086`  
**Name:** `Yellow Bar Chart_st249iaw`

const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion; const script_mer2yohf = [ { type: 'chart', text: 'Animated Histogram', frames: 120 }, { type: 'hold', text: 'Final Display', frames: 30 } ]; const sequences_mer2yohf = []; let accumulatedFrames_mer2yohf = 0; script_mer2yohf.forEach((segment, index) => { sequences_mer2yohf.push({ ...segment, start: accumulatedFrames_mer2yohf, end: accumulatedFrames_mer2yohf + segment.frames }); accumulatedFrames_mer2yohf += segment.frames; }); const totalFrames_mer2yohf = script_mer2yohf.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_mer2yohf = totalFrames_mer2yohf; export default function TemplateScene() { const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const histogramData = [ { label: '512', value: 512 }, { label: '240', value: 240, highlight: true }, { label: '480', value: 480 }, { label: '360', value: 360 }, { label: '440', value: 440, highlight: true }, { label: '640', value: 640 }, { label: '480', value: 480 }, { label: '360', value: 360, highlight: true } ]; function HistogramChart({ progress }) { const maxValue = Math.max(...histogramData.map(d => d.value)); const chartWidth = 600; const maxChartHeight = 500; // Increased for better spacing const chartX = (width - chartWidth) / 2; const chartY = (height - maxChartHeight) / 2; // Centered vertically const barWidth = (chartWidth - 80) / histogramData.length; const padding = 8; const visibleBars = Math.floor(progress * histogramData.length); return ( <div style= {{ position: 'absolute', left: chartX, top: chartY, width: chartWidth, height: maxChartHeight, backgroundColor: '#f8f9fa', borderRadius: '16px', padding: '32px 24px', display: 'flex', flexDirection: 'column' } } > {/* Chart Title */ } < div style = {{ fontSize: '48px', fontWeight: '600', color: '#2d3748', marginBottom: '8px', fontFamily: 'Inter' } }> Pill Shaped Bar Chart < /div> {/* Check Level Indicator */ } <div style={ { display: 'flex', alignItems: 'center', marginBottom: '64px', // Increased padding between title and bars fontSize: '32px', fontFamily: 'Inter' } }> <div style={ { width: '24px', height: '24px', backgroundColor: '#ff6b35', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'white', fontWeight: 'bold' } }>✓</div> < span style = {{ color: '#ff6b35', fontWeight: '500' }}> Highlight Something < /span> < /div> {/* Chart Container with Fixed Layout */ } <div style={ { flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' } }> {/* Bars Container */ } < div style = {{ height: '280px', // Fixed height for bars area display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' // Fixed gap between bars and labels }}> { histogramData.map((data, index) => { const barHeight = interpolate( data.value, [0, maxValue], [20, 260] // Fixed max height within the bars container ); const animatedHeight = index < visibleBars ? spring({ frame: frame - (index * 6), fps, config: { damping: 12, stiffness: 100 } }) * barHeight : index === visibleBars ? interpolate( progress * histogramData.length - visibleBars, [0, 1], [0, barHeight] ) : 0; // Determine bar color - bars 2, 5, and 7 should be orange const isOrangeBar = index === 2 || index === 5 || index === 7; const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7'; return ( <div key= { index } style = {{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: barWidth - padding } }> {/* Bar with rounded pill shape */ } < div style = {{ width: barWidth - padding, height: Math.max(0, animatedHeight), backgroundColor: barColor, borderRadius: `${(barWidth - padding) / 2}px`, position: 'relative', transition: 'all 0.3s ease' }} > {/* White circle indicator inside orange bars */ } { isOrangeBar && animatedHeight > 40 && ( <div style={ { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%' } } /> ) } </div> < /div> ); })} </div> {/* X-axis labels - Fixed position container */ } <div style={ { height: '30px', // Fixed height for labels display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }> { histogramData.map((data, index) => ( <div key= { index } style = {{ fontSize: '16px', color: '#4a5568', fontFamily: 'Inter', fontWeight: '600', width: barWidth - padding, textAlign: 'center' }} > { data.label } < /div> ))} </div> < /div> < /div> ); } const progress = Math.min(frame / 120, 1); return ( <AbsoluteFill style= {{ background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}> <HistogramChart progress={ Math.max(0, progress) } /> < /AbsoluteFill> ); }


### Option 3: Really Cool Bar Chart
**ID:** `97651087-3d1c-474d-8fea-e3b95bf232e0`  
**Name:** `Really Cool bar Chart`
1	const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion; const script_mepw1wc4 = [ { type: "title", text: "Performance Metrics", frames: 30 }, { type: "bars", text: "Bar Animation", frames: 120 }, { type: "hold", text: "Final Hold", frames: 30 } ]; let accumulatedFrames_mepw1wc4 = 0; const sequences_mepw1wc4 = script_mepw1wc4.map(item => { const sequence = { ...item, start: accumulatedFrames_mepw1wc4 }; accumulatedFrames_mepw1wc4 += item.frames; return sequence; }); const totalFrames_mepw1wc4 = script_mepw1wc4.reduce((sum, s) => sum + s.frames, 0); export const durationInFrames_mepw1wc4 = totalFrames_mepw1wc4; // Auto-generated defaults for undefined variables const padding = 16; const margin = 8; const gap = 12; export default function Scene_mepw1wc4() { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const cameraProgress = spring({ frame: frame - 30, fps, config: { damping: 100, stiffness: 200, mass: 0.5, }, }); const bars = [ { label: "Revenue", value: 92, color: "#ff6b6b" }, { label: "Growth", value: 156, color: "#4ecdc4" }, { label: "Users", value: 78, color: "#45b7d1" }, { label: "Profit", value: 134, color: "#96ceb4" }, { label: "Market", value: 189, color: "#feca57" }, ]; return ( <AbsoluteFill style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Inter", color: "#fff", padding: "6vh 0 8vh 0", }} > <div style={{ height: "20vh", display: "flex", alignItems: "center", justifyContent: "center" }}> <h1 style={{ fontSize: "6vw", fontWeight: "700", margin: "0", opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", }), textAlign: "center", lineHeight: "1.1", fontFamily: "Inter", background: "linear-gradient(45deg, #fff, #f0f0f0)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 4px 20px rgba(255,255,255,0.3)", }} > Performance Metrics </h1> </div> <div style={{ height: "45vh", display: "flex", alignItems: "flex-end", justifyContent: "center", width: "100%", marginBottom: "2vh", marginTop: "2vh", position: "relative", }} > <div style={{ display: "flex", alignItems: "end", gap: "24px", height: "100%", transform: `scale(${cameraProgress})`, transformOrigin: "bottom center", }} > {bars.map((bar, index) => { const barHeight = interpolate( frame, [60 + index * 12, 90 + index * 12], [0, (bar.value / 200) * 320], { extrapolateLeft: "clamp", extrapolateRight: "clamp", } ); const valueOpacity = interpolate( frame, [90 + index * 12, 120 + index * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", } ); const barScale = spring({ frame: frame - (60 + index * 12), fps, config: { damping: 15, stiffness: 150, }, }); return ( <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", }} > <div style={{ fontSize: "28px", fontWeight: "700", opacity: valueOpacity, fontFamily: "Inter", textShadow: "0 2px 10px rgba(0,0,0,0.3)", }} > {bar.value} </div> <div style={{ width: "70px", height: `${barHeight}px`, background: `linear-gradient(180deg, ${bar.color}, ${bar.color}dd)`, borderRadius: "8px 8px 0 0", boxShadow: `0 0 40px ${bar.color}60, 0 8px 32px rgba(0,0,0,0.3)`, transform: `scaleY(${barScale})`, transformOrigin: "bottom", border: `2px solid ${bar.color}`, }} /> </div> ); })} </div> <div style={{ position: "absolute", bottom: "-80px", display: "flex", alignItems: "center", gap: "24px", left: "50%", transform: "translateX(-50%)", }} > {bars.map((bar, index) => ( <div key={index} style={{ width: "70px", display: "flex", justifyContent: "center", fontSize: "20px", fontWeight: "600", opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", }), fontFamily: "Inter", textShadow: "0 2px 8px rgba(0,0,0,0.4)", }} > {bar.label} </div> ))} </div> </div> </AbsoluteFill> ); }