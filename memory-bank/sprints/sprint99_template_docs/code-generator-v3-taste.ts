/**
 * Code Generator V3 - Taste-Focused Edition
 * 
 * Philosophy: Quality over quantity. Three carefully selected examples that
 * demonstrate exceptional motion graphics taste and professional standards.
 * 
 * Each example teaches:
 * - Sophisticated animation timing
 * - Premium visual design
 * - Professional color and typography
 * - Thoughtful composition and spacing
 */

export interface GeneratorMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build messages with 3 high-taste examples
 */
export function buildCodeGeneratorV3Messages(
  userRequest: string,
  includeExamples: boolean = true,
  format: { width: number; height: number; format: string } = { width: 1920, height: 1080, format: 'LANDSCAPE' }
): GeneratorMessage[] {
  
  const systemPrompt: GeneratorMessage = {
    role: 'system',
    content: `You are a world-class motion graphics designer creating premium animations for high-end software products.

QUALITY STANDARDS:
- Every animation should feel worth $10,000
- Use generous spacing and breathing room
- Implement sophisticated easing and timing
- Choose colors like a designer, not a developer
- Typography should be intentional and hierarchical
- Animations should tell a story, not just move

VIDEO FORMAT: ${format.width}x${format.height} ${format.format}

TECHNICAL EXCELLENCE:
- Destructure Remotion at top: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- Use unique 8-character IDs (e.g., _A7B9C2D4)
- Export durationInFrames_[ID] 
- Name component Scene_[ID]()
- Spring animations always include fps
- Center elements: position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"
- Icons: window.IconifyIcon
- Fonts: Direct Google Fonts ("Inter", "Montserrat", etc.)

DESIGN PRINCIPLES:
- Less is more - don't overwhelm
- Timing is everything - let things breathe
- Color with purpose - every hue should mean something
- Scale generously - go big or go home
- Layer thoughtfully - create depth without clutter`
  };

  if (!includeExamples) {
    return [systemPrompt, { role: 'user', content: userRequest }];
  }

  // Three examples that set the taste bar HIGH
  const exampleMessages: GeneratorMessage[] = [
    
    // Example 1: Sophisticated Dashboard - Layered, Refined, Premium
    {
      role: 'user',
      content: 'Create a data dashboard with revenue metrics and customer profiles, make it feel premium'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A8B9C2D1 = [
  { type: "simultaneous_animation", frames: 25 }
];

const sequences_A8B9C2D1 = [];
let accumulatedFrames_A8B9C2D1 = 0;

script_A8B9C2D1.forEach((segment, index) => {
  sequences_A8B9C2D1.push({
    ...segment,
    start: accumulatedFrames_A8B9C2D1,
    end: accumulatedFrames_A8B9C2D1 + segment.frames
  });
  accumulatedFrames_A8B9C2D1 += segment.frames;
});

const totalFrames_A8B9C2D1 = script_A8B9C2D1.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_A8B9C2D1 = totalFrames_A8B9C2D1;

export default function Scene_A8B9C2D1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sophisticated easing for premium feel
  const easing = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // Profile avatar scales with restraint
  const profileScale = interpolate(
    frame,
    [0, 15],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }
  );

  // Cards slide with different origins for depth
  const revenueY = interpolate(
    frame,
    [0, 15],
    [200, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }
  );

  const dataY = interpolate(
    frame,
    [0, 15],
    [-150, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }
  );

  // Dynamic bar heights for data viz
  const bar1Height = interpolate(frame, [10, 20], [60, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar2Height = interpolate(frame, [12, 22], [90, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar3Height = interpolate(frame, [14, 24], [100, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar4Height = interpolate(frame, [16, 25], [70, 85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar5Height = interpolate(frame, [18, 25], [50, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const percentage1 = Math.round(interpolate(frame, [10, 20], [57, 62], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const percentage2 = Math.round(interpolate(frame, [12, 22], [69, 65], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const percentage3 = Math.round(interpolate(frame, [14, 24], [79, 84], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#F4E76E" }}>
      {/* Dark card sliding down - sophisticated layering */}
      <div style={{
        position: "absolute",
        top: "50%",
        right: "30%",
        transform: \`translate(0, calc(-50% + \${dataY}px))\`,
        backgroundColor: "#2A2A2A",
        borderRadius: "24px",
        padding: "32px",
        width: "400px",
        height: "320px",
        zIndex: 1
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            backgroundColor: "white",
            borderRadius: "8px",
            marginRight: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <window.IconifyIcon icon="mdi:star-four-points" style={{ fontSize: "20px", color: "#2A2A2A" }} />
          </div>
          <div>
            <div style={{ color: "white", fontSize: "24px", fontWeight: "700", fontFamily: "Inter" }}>DATA</div>
            <div style={{ color: "#888", fontSize: "18px", fontFamily: "Inter" }}>Customer Profile</div>
          </div>
        </div>

        {/* Clean data visualization */}
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", height: "140px", marginBottom: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage1}%</div>
            <div style={{ width: "40px", height: \`\${bar1Height}px\`, backgroundColor: "#F4E76E", borderRadius: "4px" }} />
            <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>I-32</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage2}%</div>
            <div style={{ width: "40px", height: \`\${bar2Height}px\`, backgroundColor: "white", borderRadius: "4px" }} />
            <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>USA</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>{percentage3}%</div>
            <div style={{ width: "40px", height: \`\${bar3Height}px\`, backgroundColor: "#F4E76E", borderRadius: "4px" }} />
            <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>W</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>51%</div>
            <div style={{ width: "40px", height: \`\${bar4Height}px\`, backgroundColor: "white", borderRadius: "4px" }} />
            <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>M</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px", fontFamily: "Inter" }}>41%</div>
            <div style={{ width: "40px", height: \`\${bar5Height}px\`, backgroundColor: "white", borderRadius: "4px" }} />
            <div style={{ color: "#888", fontSize: "12px", marginTop: "8px", fontFamily: "Inter" }}>F</div>
          </div>
        </div>
      </div>

      {/* Revenue card with confident sizing */}
      <div style={{
        position: "absolute",
        top: "65%",
        left: "32%",
        transform: \`translate(0, calc(-50% + \${revenueY}px))\`,
        backgroundColor: "#2A2A2A",
        borderRadius: "24px",
        padding: "40px",
        width: "380px",
        height: "200px",
        zIndex: 2
      }}>
        <div style={{ color: "white", fontSize: "24px", fontWeight: "400", marginBottom: "16px", fontFamily: "Inter" }}>
          Total Revenue
        </div>
        <div style={{ color: "#F4E76E", fontSize: "72px", fontWeight: "700", fontFamily: "Inter" }}>
          $125K
        </div>
      </div>

      {/* Avatar with gradient ring - premium touch */}
      <div style={{
        position: "absolute",
        top: "40%",
        left: "40%",
        transform: \`translate(-50%, -50%) scale(\${profileScale})\`,
        zIndex: 3
      }}>
        <div style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)",
          padding: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Img
            src={window.BazaarAvatars['black-man']}
            style={{
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}`
    },
    
    // Example 2: Apple-Quality Notification - Clean, Spacious, Refined
    {
      role: 'user',
      content: 'Create a message notification that feels like it belongs in iOS, premium and polished'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

const script_A1B2C3D4 = [
  { type: "notification", frames: 90 }
];

const totalFrames_A1B2C3D4 = 90;
export const durationInFrames_A1B2C3D4 = totalFrames_A1B2C3D4;

export default function Scene_A1B2C3D4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msToFrames = (ms) => Math.round((ms / 1000) * fps);

  // Orchestrated timing - everything has its moment
  const bgStart = msToFrames(0);
  const bgEnd = msToFrames(180);
  const iconStart = msToFrames(40);
  const iconEnd = msToFrames(340);
  const senderStart = msToFrames(90);
  const senderEnd = msToFrames(290);
  const previewStart = msToFrames(180);
  const previewEnd = msToFrames(380);
  const exitStart = msToFrames(2800);
  const exitEnd = msToFrames(3000);

  // Background scales subtly
  const bgOpacity = interpolate(frame, [bgStart, bgEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [bgStart, bgEnd], [0.96, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Icon bounces in with personality
  const iconScale = spring({
    frame: frame - iconStart,
    fps,
    config: { damping: 8, stiffness: 120 },
    from: 0.6,
    to: 1.0
  });

  // Text slides in with subtle offset
  const senderOpacity = interpolate(frame, [senderStart, senderEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const senderY = interpolate(frame, [senderStart, senderEnd], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const previewOpacity = interpolate(frame, [previewStart, previewEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const previewY = interpolate(frame, [previewStart, previewEnd], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Exit animation
  const exitOpacity = frame >= exitStart 
    ? interpolate(frame, [exitStart, exitEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const exitScale = frame >= exitStart 
    ? interpolate(frame, [exitStart, exitEnd], [1.0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* Large, confident notification - no apologies for taking space */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: \`translate(-50%, -50%) scale(\${bgScale * exitScale})\`,
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
      }}>
        {/* Icon with gradient - modern touch */}
        <div style={{
          width: "160px",
          height: "160px",
          borderRadius: "43px",
          background: "linear-gradient(135deg, #34C759, #30D158)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: \`scale(\${iconScale})\`,
          flexShrink: 0
        }}>
          <window.IconifyIcon icon="material-symbols:chat-bubble-rounded" style={{ fontSize: "100px", color: "#FFFFFF" }} />
        </div>

        {/* Content with generous spacing */}
        <div style={{
          flex: 1,
          marginLeft: "36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: "24px"
        }}>
          {/* Sender name with weight hierarchy */}
          <div style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: "56px",
            color: "#0B0B0F",
            opacity: senderOpacity,
            transform: \`translateY(\${senderY}px)\`,
            lineHeight: "1.2",
            marginBottom: "12px"
          }}>
            Bazaar Bot
          </div>

          {/* Message with personality */}
          <div style={{
            fontFamily: "Inter",
            fontWeight: "500",
            fontSize: "56px",
            color: "#0B0B0F",
            opacity: previewOpacity,
            transform: \`translateY(\${previewY}px)\`,
            lineHeight: "1.2"
          }}>
            Yet another sick animation 💃
          </div>
        </div>

        {/* Timestamp - subtle but present */}
        <div style={{
          fontFamily: "Inter",
          fontWeight: "600",
          fontSize: "44px",
          color: "#8E8E93",
          alignSelf: "flex-start",
          marginTop: "8px",
          paddingLeft: "12px"
        }}>
          now
        </div>
      </div>
    </AbsoluteFill>
  );
}`
    },
    
    // Example 3: Cinematic Bar Chart - Bold, Dramatic, Professional
    {
      role: 'user',
      content: 'Create a performance metrics bar chart that feels cinematic and impressive'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const script_mepw1wc4 = [
  { type: "title", text: "Performance Metrics", frames: 30 },
  { type: "bars", text: "Bar Animation", frames: 120 },
  { type: "hold", text: "Final Hold", frames: 30 }
];

let accumulatedFrames_mepw1wc4 = 0;
const sequences_mepw1wc4 = script_mepw1wc4.map(item => {
  const sequence = { ...item, start: accumulatedFrames_mepw1wc4 };
  accumulatedFrames_mepw1wc4 += item.frames;
  return sequence;
});

const totalFrames_mepw1wc4 = script_mepw1wc4.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_mepw1wc4 = totalFrames_mepw1wc4;

export default function Scene_mepw1wc4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera-like zoom effect
  const cameraProgress = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5
    }
  });

  // Rich color palette - each bar has meaning
  const bars = [
    { label: "Revenue", value: 92, color: "#ff6b6b" },
    { label: "Growth", value: 156, color: "#4ecdc4" },
    { label: "Users", value: 78, color: "#45b7d1" },
    { label: "Profit", value: 134, color: "#96ceb4" },
    { label: "Market", value: 189, color: "#feca57" }
  ];

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "Inter",
      color: "#fff",
      padding: "6vh 0 8vh 0"
    }}>
      {/* Title with gradient text effect */}
      <div style={{
        height: "20vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <h1 style={{
          fontSize: "6vw",
          fontWeight: "700",
          margin: "0",
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }),
          textAlign: "center",
          lineHeight: "1.1",
          fontFamily: "Inter",
          background: "linear-gradient(45deg, #fff, #f0f0f0)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 4px 20px rgba(255,255,255,0.3)"
        }}>
          Performance Metrics
        </h1>
      </div>

      {/* Bars with cinematic entrance */}
      <div style={{
        height: "45vh",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        width: "100%",
        marginBottom: "2vh",
        marginTop: "2vh",
        position: "relative"
      }}>
        <div style={{
          display: "flex",
          alignItems: "end",
          gap: "24px",
          height: "100%",
          transform: \`scale(\${cameraProgress})\`,
          transformOrigin: "bottom center"
        }}>
          {bars.map((bar, index) => {
            // Staggered animation for drama
            const barHeight = interpolate(
              frame,
              [60 + index * 12, 90 + index * 12],
              [0, (bar.value / 200) * 320],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const valueOpacity = interpolate(
              frame,
              [90 + index * 12, 120 + index * 12],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const barScale = spring({
              frame: frame - (60 + index * 12),
              fps,
              config: { damping: 15, stiffness: 150 }
            });

            return (
              <div key={index} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px"
              }}>
                {/* Value appears above bar */}
                <div style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  opacity: valueOpacity,
                  fontFamily: "Inter",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)"
                }}>
                  {bar.value}
                </div>
                
                {/* Bar with glow effect */}
                <div style={{
                  width: "70px",
                  height: \`\${barHeight}px\`,
                  background: \`linear-gradient(180deg, \${bar.color}, \${bar.color}dd)\`,
                  borderRadius: "8px 8px 0 0",
                  boxShadow: \`0 0 40px \${bar.color}60, 0 8px 32px rgba(0,0,0,0.3)\`,
                  transform: \`scaleY(\${barScale})\`,
                  transformOrigin: "bottom",
                  border: \`2px solid \${bar.color}\`
                }} />
              </div>
            );
          })}
        </div>

        {/* Labels with delayed entrance */}
        <div style={{
          position: "absolute",
          bottom: "-80px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          left: "50%",
          transform: "translateX(-50%)"
        }}>
          {bars.map((bar, index) => (
            <div key={index} style={{
              width: "70px",
              display: "flex",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "600",
              opacity: interpolate(frame, [30, 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }),
              fontFamily: "Inter",
              textShadow: "0 2px 8px rgba(0,0,0,0.4)"
            }}>
              {bar.label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}`
    }
  ];

  return [
    systemPrompt,
    ...exampleMessages,
    { role: 'user', content: userRequest }
  ];
}

/**
 * Export configurations for testing
 */
export const CODE_GENERATOR_V3_CONFIGS = {
  WITH_TASTE_EXAMPLES: (userRequest: string, format?: any) => 
    buildCodeGeneratorV3Messages(userRequest, true, format),
  
  NO_EXAMPLES: (userRequest: string, format?: any) => 
    buildCodeGeneratorV3Messages(userRequest, false, format),
};

/**
 * Key Taste Principles Demonstrated:
 * 
 * 1. SPACING & BREATHING ROOM
 *    - 1200px notification width (confident!)
 *    - 36px padding (generous!)
 *    - Clear visual hierarchy
 * 
 * 2. ANIMATION SOPHISTICATION
 *    - Custom easing curves
 *    - Orchestrated timing
 *    - Spring physics with purpose
 * 
 * 3. COLOR & DEPTH
 *    - Layered compositions
 *    - Meaningful color choices
 *    - Gradient accents (not overdone)
 * 
 * 4. TYPOGRAPHY
 *    - 56px for important text
 *    - Weight hierarchy (700/500/400)
 *    - Consistent font families
 * 
 * 5. PROFESSIONAL POLISH
 *    - Backdrop filters
 *    - Subtle shadows
 *    - Refined border radii
 */