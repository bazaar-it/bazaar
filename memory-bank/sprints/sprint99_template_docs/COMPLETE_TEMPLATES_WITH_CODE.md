# Complete Template Scenes with Full TSX Code

This document contains all template scenes with their complete TSX code.

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

## SQL Commands to Get Other Templates

To get the complete TSX code for the remaining templates, run these SQL queries:

### 2. Message Notification
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '7bda89d2-fd1d-4f06-821c-997fcacbfeaf';
```

### 3. UI Data Visualization
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '6929100c-c7f5-4117-8148-117446ac2b7f';
```

### 4. Home Screen Notifications
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '9f79c9f1-fde5-44d8-af31-f7ac6ba034a4';
```

### 5. Testimonials
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '6f23a6a8-0eef-430e-a998-721606173f8c';
```

### 6. Google Sign In
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '2e0f1411-d452-4d79-a1a7-167f407ab96c';
```

### 7. Pill Shaped Bar Chart
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = 'e9443f6e-5573-44cf-9a72-ec21f71673ea';
```

### 8. Yellow Bar Chart
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '9360a385-8ae9-4daf-9297-c2049f72b086';
```

### 9. Really Cool Bar Chart
```sql
SELECT s."tsxCode" FROM "bazaar-vid_scene" s WHERE s.id = '97651087-3d1c-474d-8fea-e3b95bf232e0';
```