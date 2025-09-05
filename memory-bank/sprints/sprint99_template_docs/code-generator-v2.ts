/**
 * Enhanced Code Generator Prompt with Conversational Few-Shot Learning
 * Version: 2.0
 * Purpose: Improved code generation through example-based learning
 * 
 * This prompt uses conversational few-shot learning to achieve:
 * - More consistent output formatting
 * - Better animation quality
 * - Stronger adherence to coding patterns
 * - Higher-quality visual designs
 */

export interface GeneratorMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build the complete message chain for code generation
 * @param userRequest - The actual user's request for scene generation
 * @param includeExamples - Whether to include few-shot examples (default: true)
 * @param format - Video format context
 */
export function buildCodeGeneratorV2Messages(
  userRequest: string,
  includeExamples: boolean = true,
  format: { width: number; height: number; format: string } = { width: 1920, height: 1080, format: 'LANDSCAPE' }
): GeneratorMessage[] {
  
  // Base system prompt - kept concise since examples will demonstrate patterns
  const systemPrompt: GeneratorMessage = {
    role: 'system',
    content: `CRITICAL: You must output ONLY JavaScript/React code. Do NOT include any explanatory text, comments, or descriptions outside the code block. Start your response with the code immediately.

Your role is to create motion graphics scenes for software products using react/remotion. Follow the exact patterns demonstrated in the conversation examples.

VIDEO FORMAT: Creating content for ${format.width}x${format.height} ${format.format} format.

TECHNICAL REQUIREMENTS:
- Always destructure Remotion utilities at the top: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- Use unique 8-character IDs for all variables (e.g., _A7B9C2D4)
- Export durationInFrames_[ID] for scene duration
- Component must be named Scene_[ID]()
- Use spring animations with fps parameter always included
- Center single elements with: position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"
- Access icons via window.IconifyIcon with proper icon names from popular sets (mdi:*, heroicons:*, etc.)
- Use Google Fonts directly in fontFamily (e.g., "Inter", "Montserrat", "Playfair Display")
- Smart duration sizing: Never default to 180 frames. Size appropriately to content.`
  };

  // If examples are disabled, return just system prompt and user request
  if (!includeExamples) {
    return [
      systemPrompt,
      { role: 'user', content: userRequest }
    ];
  }

  // Conversational few-shot examples
  const exampleMessages: GeneratorMessage[] = [
    // Example 1: Corporate Credit Card with expense tracking
    {
      role: 'user',
      content: 'Create a corporate credit card showcase with expense categories appearing around it, some approved and some rejected'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

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

export default function Scene_a8f3d2e1() {
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

  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f9fa" }}>
      {frame >= sequences_a8f3d2e1[0].start && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: \`translate(-50%, -50%) scale(\${cardScale})\`,
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
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)",
              opacity: diagonalAnimation,
              transform: \`translateX(\${interpolate(diagonalAnimation, [0, 1], [-100, 0])}px)\`,
              pointerEvents: "none"
            }}
          />
          
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
        </div>
      )}

      {frame >= sequences_a8f3d2e1[1].start && frame < sequences_a8f3d2e1[9].end && (
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "15%",
            transform: \`translateX(\${interpolate(feature1Slide, [0, 1], [-100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)\`,
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
    </AbsoluteFill>
  );
}`
    },
    
    // Example 2: Message notification system
    {
      role: 'user',
      content: 'Show a message notification popping up with a smooth animation, like a chat app notification'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A1B2C3D4 = [
  { type: "notification", frames: 90 }
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

export default function Scene_A1B2C3D4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msToFrames = (ms) => Math.round((ms / 1000) * fps);

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

  const iconScale = spring({
    frame: frame - iconStart,
    fps,
    config: { damping: 8, stiffness: 120 },
    from: 0.6,
    to: 1.0
  });

  const exitOpacity = frame >= exitStart ? interpolate(
    frame,
    [exitStart, exitEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  ) : 1;

  const exitScale = frame >= exitStart ? interpolate(
    frame,
    [exitStart, exitEnd],
    [1.0, 0.8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  ) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
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

        <div style={{
          flex: 1,
          marginLeft: "36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: "24px"
        }}>
          <div style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: "56px",
            color: "#0B0B0F",
            lineHeight: "1.2",
            marginBottom: "12px"
          }}>
            Bazaar Bot
          </div>

          <div style={{
            fontFamily: "Inter",
            fontWeight: "500",
            fontSize: "56px",
            color: "#0B0B0F",
            lineHeight: "1.2"
          }}>
            Yet another sick animation 💃
          </div>
        </div>

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
    
    // Example 3: Data visualization dashboard
    {
      role: 'user',
      content: 'Create a modern data visualization dashboard with animated charts and metrics'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

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

  const profileScale = interpolate(
    frame,
    [0, 15],
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }
  );

  const revenueY = interpolate(
    frame,
    [0, 15],
    [200, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }
  );

  const dataY = interpolate(
    frame,
    [0, 15],
    [-150, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }
  );

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
    
    // Example 4: Google Sign-In flow
    {
      role: 'user',
      content: 'Design a Google sign-in button with the official Google branding and a nice hover effect'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } = window.Remotion;

export const durationInFrames_GoogleSign = 90;

export default function Scene_GoogleSign() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 80
    }
  });

  const buttonScale = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 12,
      stiffness: 200
    }
  });

  const hover = spring({
    frame: frame - 45,
    fps,
    config: {
      damping: 12,
      stiffness: 200
    }
  });

  const shadowSize = interpolate(hover, [0, 1], [30, 45]);
  const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

  return (
    <AbsoluteFill style={{
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 10%'
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '90%',
        height: '60%',
        transform: \`translate(-50%, -50%) scale(\${pulse})\`,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)',
        opacity: fadeIn
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'white',
        color: '#1a1a1a',
        border: '2px solid #ccc',
        borderRadius: 100,
        padding: '40px 60px',
        fontSize: 48,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        cursor: 'pointer',
        opacity: fadeIn,
        transform: \`scale(\${interpolate(buttonScale, [0, 1], [0.9, 1])})\`,
        boxShadow: \`0 \${shadowSize}px \${shadowSize * 2}px rgba(0, 0, 0, 0.1)\`,
        width: '50%',
        maxWidth: '50%'
      }}>
        <svg width="48" height="48" viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg">
          <path d="M255.68 133.49c0-11.26-.93-22.07-2.67-32.52H130v61.55h70.68c-3.06 16.52-12.28 30.51-26.18 39.89v33.03h42.32c24.75-22.8 38.86-56.4 38.86-101.95z" fill="#4285F4" />
          <path d="M130 262c35.1 0 64.56-11.66 86.08-31.6l-42.32-33.03c-11.78 7.9-26.88 12.56-43.76 12.56-33.64 0-62.15-22.71-72.34-53.2H14.59v33.59C36.2 230.82 79.91 262 130 262z" fill="#34A853" />
          <path d="M57.66 156.73c-2.77-8.23-4.36-17-4.36-26s1.59-17.77 4.36-26V71.14H14.59C5.28 88.79 0 109.1 0 130s5.28 41.21 14.59 58.86l43.07-32.13z" fill="#FBBC05" />
          <path d="M130 51.05c19.08 0 36.16 6.56 49.68 19.42l37.26-37.26C194.56 11.72 165.1 0 130 0 79.91 0 36.2 31.18 14.59 71.14l43.07 33.59C67.85 73.76 96.36 51.05 130 51.05z" fill="#EA4335" />
        </svg>
        Sign in with Google
      </div>
    </AbsoluteFill>
  );
}`
    },
    
    // Example 5: Testimonials
    {
      role: 'user',
      content: 'Show customer testimonials sliding in one by one with profile pictures and quotes'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const testimonials_8a7f2b3c = [
  { text: "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.", name: "Saman Malik", role: "Customer Support Lead", avatar: window.BazaarAvatars['asian-woman'] },
  { text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient.", name: "Zainab Hussain", role: "Project Manager", avatar: window.BazaarAvatars['middle-eastern-man'] },
  { text: "Using this ERP, our online presence and conversions significantly improved, boosting business performance.", name: "Hassan Ali", role: "E-commerce Manager", avatar: window.BazaarAvatars['black-man'] },
  { text: "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.", name: "Briana Patton", role: "Operations Manager", avatar: window.BazaarAvatars['white-woman'] },
  { text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.", name: "Aliza Khan", role: "Business Analyst", avatar: window.BazaarAvatars['hispanic-man'] },
  { text: "Our business functions improved with a user-friendly design and positive customer feedback.", name: "Farhan Siddiqui", role: "Marketing Director", avatar: window.BazaarAvatars['asian-woman'] }
];

const script_8a7f2b3c = [
  { type: "header", frames: 360 },
  { type: "testimonials", frames: 360 }
];

let accumulatedFrames_8a7f2b3c = 0;
const sequences_8a7f2b3c = script_8a7f2b3c.map(item => {
  const sequence = { ...item, start: accumulatedFrames_8a7f2b3c };
  accumulatedFrames_8a7f2b3c += item.frames;
  return sequence;
});

const totalFrames_8a7f2b3c = script_8a7f2b3c.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_8a7f2b3c = totalFrames_8a7f2b3c;

const TestimonialCard = ({ testimonial, delay, speed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 }
  });

  const translateY = interpolate(
    frame,
    [0, 600],
    [0, -2000],
    { extrapolateLeft: "clamp", extrapolateRight: "extend" }
  ) * speed;

  const opacity = interpolate(cardSpring, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(cardSpring, [0, 1], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "24px",
      padding: "40px",
      marginBottom: "24px",
      maxWidth: "320px",
      width: "100%",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      border: "1px solid rgba(0,0,0,0.05)",
      opacity,
      transform: \`translateY(\${translateY}px) scale(\${scale})\`,
      transformOrigin: "center"
    }}>
      <div style={{
        fontSize: "16px",
        lineHeight: "1.5",
        color: "#374151",
        marginBottom: "20px",
        fontFamily: "Inter",
        fontWeight: "400"
      }}>
        {testimonial.text}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img src={testimonial.avatar} style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          objectFit: "cover"
        }} />
        <div>
          <div style={{
            fontFamily: "Inter",
            fontWeight: "600",
            fontSize: "14px",
            color: "#111827",
            lineHeight: "1.2"
          }}>
            {testimonial.name}
          </div>
          <div style={{
            fontFamily: "Inter",
            fontWeight: "400",
            fontSize: "14px",
            color: "#6B7280",
            lineHeight: "1.2"
          }}>
            {testimonial.role}
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialColumn = ({ testimonials, speed, delay }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
        <TestimonialCard key={index} testimonial={testimonial} delay={delay} speed={speed} />
      ))}
    </div>
  );
};

export default function Scene_8a7f2b3c() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSequence = sequences_8a7f2b3c.find(s => s.type === "header");
  const testimonialsSequence = sequences_8a7f2b3c.find(s => s.type === "testimonials");

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", fontFamily: "Inter" }}>
      {frame >= headerSequence.start && frame < headerSequence.start + headerSequence.frames && (
        <div style={{
          position: "absolute",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          zIndex: 10
        }}>
          <h1 style={{
            fontSize: "48px",
            fontWeight: "800",
            color: "#111827",
            marginBottom: "16px",
            fontFamily: "Inter",
            opacity: interpolate(
              spring({ frame: frame - headerSequence.start, fps, config: { damping: 12, stiffness: 100 } }),
              [0, 1],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            transform: \`translateY(\${interpolate(
              spring({ frame: frame - headerSequence.start, fps, config: { damping: 12, stiffness: 100 } }),
              [0, 1],
              [30, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)\`
          }}>
            What our users say
          </h1>
        </div>
      )}

      {frame >= headerSequence.start && (
        <div style={{
          position: "absolute",
          top: "200px",
          left: "0",
          right: "0",
          display: "flex",
          justifyContent: "center",
          gap: "32px",
          overflow: "hidden",
          height: "calc(100vh - 200px)"
        }}>
          <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(0, 2)} speed={0.8} delay={headerSequence.start} />
          <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(2, 4)} speed={1.0} delay={headerSequence.start} />
          <TestimonialColumn testimonials={testimonials_8a7f2b3c.slice(4, 6)} speed={1.2} delay={headerSequence.start} />
        </div>
      )}
    </AbsoluteFill>
  );
}`
    },
    
    // Example 6: Mobile notifications on iPhone
    {
      role: 'user',
      content: 'Display mobile app notifications stacking up on an iPhone home screen'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A1B2C3D4 = [
  { type: "notification", frames: 120 }
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

export default function Scene_A1B2C3D4() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const msToFrames = (ms) => Math.round((ms / 1000) * fps);

  const bgStart = msToFrames(0);
  const bgEnd = msToFrames(180);
  const iconStart = msToFrames(40);
  const iconEnd = msToFrames(340);
  const exitStart = msToFrames(4800);
  const exitEnd = msToFrames(5000);

  const slideUpStart = 0;
  const slideUpEnd = msToFrames(600);
  const notificationY = interpolate(
    frame,
    [slideUpStart, slideUpEnd],
    [200, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) }
  );

  const secondNotifStart = slideUpEnd + 20;
  const secondNotifSlideEnd = secondNotifStart + msToFrames(600);
  const secondNotificationY = interpolate(
    frame,
    [secondNotifStart, secondNotifSlideEnd],
    [200, -120],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) }
  );

  const thirdNotifStart = secondNotifSlideEnd + 20;
  const thirdNotifSlideEnd = thirdNotifStart + msToFrames(600);
  const thirdNotificationY = interpolate(
    frame,
    [thirdNotifStart, thirdNotifSlideEnd],
    [200, -240],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * (3 - 2 * t) }
  );

  const bgOpacity = interpolate(frame, [bgStart, bgEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [bgStart, bgEnd], [0.96, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iconOpacity = interpolate(frame, [iconStart, iconEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iconScale = spring({ frame: frame - iconStart, fps, config: { damping: 8, stiffness: 120 }, from: 0.6, to: 1.0 });

  const exitOpacity = frame >= exitStart ? interpolate(frame, [exitStart, exitEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const exitScale = frame >= exitStart ? interpolate(frame, [exitStart, exitEnd], [1.0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const fadeOutOpacity = interpolate(frame, [110, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneWidth = 375;
  const phoneHeight = 812;
  const phoneX = width * 0.5;
  const phoneY = height * 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <div style={{
        position: "absolute",
        left: phoneX,
        top: phoneY,
        transform: "translate(-50%, -50%)",
        width: phoneWidth,
        height: phoneHeight
      }}>
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          borderRadius: phoneWidth * 0.167,
          padding: phoneWidth * 0.027
        }}>
          <div style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: phoneWidth * 0.14,
            overflow: "hidden",
            background: "linear-gradient(135deg, #4A90E2 0%, #7B68EE 25%, #87CEEB 50%, #F4A460 75%, #32CD32 100%)"
          }}>
            <div style={{
              position: "absolute",
              top: phoneWidth * 0.035,
              left: "50%",
              transform: "translateX(-50%)",
              width: phoneWidth * 0.4,
              height: phoneWidth * 0.1,
              backgroundColor: "#000",
              borderRadius: phoneWidth * 0.05
            }} />

            <div style={{
              position: "absolute",
              top: phoneWidth * 0.37,
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              fontSize: phoneWidth * 0.27,
              fontWeight: "600",
              textAlign: "center",
              lineHeight: "1",
              fontFamily: "Inter"
            }}>
              9:41
            </div>

            {frame >= thirdNotifStart && (
              <div style={{
                position: "absolute",
                bottom: "55px",
                left: "20px",
                right: "20px",
                transform: \`scale(\${bgScale * exitScale}) translateY(\${thirdNotificationY}px)\`,
                minHeight: "80px",
                borderRadius: "12px",
                background: "rgba(240, 240, 242, 0.92)",
                backdropFilter: "blur(20px)",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                opacity: bgOpacity * exitOpacity * fadeOutOpacity,
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
                zIndex: 3
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: iconOpacity,
                  transform: \`scale(\${iconScale})\`,
                  flexShrink: 0
                }}>
                  <window.IconifyIcon icon="simple-icons:x" style={{ fontSize: "24px", color: "#FFFFFF" }} />
                </div>
                <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                  <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", lineHeight: "1.2", marginBottom: "2px" }}>Elon Musk</div>
                  <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", lineHeight: "1.3" }}>I am god</div>
                </div>
                <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px" }}>now</div>
              </div>
            )}

            {frame >= secondNotifStart && (
              <div style={{
                position: "absolute",
                bottom: "80px",
                left: "20px",
                right: "20px",
                transform: \`scale(\${bgScale * exitScale}) translateY(\${secondNotificationY}px)\`,
                minHeight: "80px",
                borderRadius: "12px",
                background: "rgba(240, 240, 242, 0.92)",
                backdropFilter: "blur(20px)",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                opacity: bgOpacity * exitOpacity * fadeOutOpacity,
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
                zIndex: 2
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: iconOpacity,
                  transform: \`scale(\${iconScale})\`,
                  flexShrink: 0
                }}>
                  <window.IconifyIcon icon="ic:baseline-whatsapp" style={{ fontSize: "32px", color: "#FFFFFF" }} />
                </div>
                <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                  <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", lineHeight: "1.2", marginBottom: "2px" }}>Mum</div>
                  <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", lineHeight: "1.3" }}>Come home and clean your room</div>
                </div>
                <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px" }}>now</div>
              </div>
            )}

            <div style={{
              position: "absolute",
              bottom: "110px",
              left: "20px",
              right: "20px",
              transform: \`scale(\${bgScale * exitScale}) translateY(\${notificationY}px)\`,
              minHeight: "80px",
              borderRadius: "12px",
              background: "rgba(240, 240, 242, 0.92)",
              backdropFilter: "blur(20px)",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              opacity: bgOpacity * exitOpacity * fadeOutOpacity,
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
              zIndex: 1
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #34C759, #30D158)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: iconOpacity,
                transform: \`scale(\${iconScale})\`,
                flexShrink: 0
              }}>
                <window.IconifyIcon icon="material-symbols:chat-bubble-rounded" style={{ fontSize: "24px", color: "#FFFFFF" }} />
              </div>
              <div style={{ flex: 1, marginLeft: "12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                <div style={{ fontFamily: "Inter", fontWeight: "700", fontSize: "14px", color: "#0B0B0F", lineHeight: "1.2", marginBottom: "2px" }}>Bazaar Bot</div>
                <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "13px", color: "#0B0B0F", lineHeight: "1.3" }}>Yet another sick animation 💃</div>
              </div>
              <div style={{ fontFamily: "Inter", fontWeight: "400", fontSize: "12px", color: "#8E8E93", alignSelf: "flex-start", marginTop: "2px", marginLeft: "8px" }}>now</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}`
    },

    // Example 7: Pill-shaped bar chart
    {
      role: 'user',
      content: 'Create a pill-shaped bar chart with smooth animations and highlighted bars'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const script_mer2yohf = [
  { type: 'chart', text: 'Animated Histogram', frames: 120 },
  { type: 'hold', text: 'Final Display', frames: 30 }
];

const sequences_mer2yohf = [];
let accumulatedFrames_mer2yohf = 0;

script_mer2yohf.forEach((segment, index) => {
  sequences_mer2yohf.push({
    ...segment,
    start: accumulatedFrames_mer2yohf,
    end: accumulatedFrames_mer2yohf + segment.frames
  });
  accumulatedFrames_mer2yohf += segment.frames;
});

const totalFrames_mer2yohf = script_mer2yohf.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_mer2yohf = totalFrames_mer2yohf;

export default function Scene_mer2yohf() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const histogramData = [
    { label: '512', value: 512 },
    { label: '240', value: 240, highlight: true },
    { label: '480', value: 480 },
    { label: '360', value: 360 },
    { label: '440', value: 440, highlight: true },
    { label: '640', value: 640 },
    { label: '480', value: 480 },
    { label: '360', value: 360, highlight: true }
  ];

  function HistogramChart({ progress }) {
    const maxValue = Math.max(...histogramData.map(d => d.value));
    const chartWidth = 600;
    const maxChartHeight = 500;
    const chartX = (width - chartWidth) / 2;
    const chartY = (height - maxChartHeight) / 2;
    const barWidth = (chartWidth - 80) / histogramData.length;
    const padding = 8;
    const visibleBars = Math.floor(progress * histogramData.length);

    return (
      <div style={{
        position: 'absolute',
        left: chartX,
        top: chartY,
        width: chartWidth,
        height: maxChartHeight,
        backgroundColor: '#f8f9fa',
        borderRadius: '16px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '600',
          color: '#2d3748',
          marginBottom: '8px',
          fontFamily: 'Inter'
        }}>
          Pill Shaped Bar Chart
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '64px',
          fontSize: '32px',
          fontFamily: 'Inter'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#ff6b35',
            borderRadius: '50%',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'white',
            fontWeight: 'bold'
          }}>✓</div>
          <span style={{ color: '#ff6b35', fontWeight: '500' }}>Check Something</span>
        </div>

        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            height: '280px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            {histogramData.map((data, index) => {
              const barHeight = interpolate(
                data.value,
                [0, maxValue],
                [20, 260]
              );
              
              const animatedHeight = index < visibleBars
                ? spring({
                    frame: frame - (index * 6),
                    fps,
                    config: { damping: 12, stiffness: 100 }
                  }) * barHeight
                : index === visibleBars
                ? interpolate(
                    progress * histogramData.length - visibleBars,
                    [0, 1],
                    [0, barHeight]
                  )
                : 0;

              const isOrangeBar = index === 2 || index === 5 || index === 7;
              const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7';

              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: barWidth - padding
                }}>
                  <div style={{
                    width: barWidth - padding,
                    height: Math.max(0, animatedHeight),
                    backgroundColor: barColor,
                    borderRadius: \`\${(barWidth - padding) / 2}px\`,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {isOrangeBar && animatedHeight > 40 && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            height: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {histogramData.map((data, index) => (
              <div key={index} style={{
                fontSize: '16px',
                color: '#4a5568',
                fontFamily: 'Inter',
                fontWeight: '600',
                width: barWidth - padding,
                textAlign: 'center'
              }}>
                {data.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(frame / 120, 1);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}>
      <HistogramChart progress={Math.max(0, progress)} />
    </AbsoluteFill>
  );
}`
    },

    // Example 8: Yellow bar chart 
    {
      role: 'user',
      content: 'Design a yellow-themed bar chart with data visualization and labels'
    },
    {
      role: 'assistant',
      content: `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const script_st249iaw = [
  { type: 'chart', text: 'Yellow Bar Chart', frames: 120 },
  { type: 'hold', text: 'Final Display', frames: 30 }
];

const sequences_st249iaw = [];
let accumulatedFrames_st249iaw = 0;

script_st249iaw.forEach((segment, index) => {
  sequences_st249iaw.push({
    ...segment,
    start: accumulatedFrames_st249iaw,
    end: accumulatedFrames_st249iaw + segment.frames
  });
  accumulatedFrames_st249iaw += segment.frames;
});

const totalFrames_st249iaw = script_st249iaw.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_st249iaw = totalFrames_st249iaw;

export default function Scene_st249iaw() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const histogramData = [
    { label: '512', value: 512 },
    { label: '240', value: 240, highlight: true },
    { label: '480', value: 480 },
    { label: '360', value: 360 },
    { label: '440', value: 440, highlight: true },
    { label: '640', value: 640 },
    { label: '480', value: 480 },
    { label: '360', value: 360, highlight: true }
  ];

  function HistogramChart({ progress }) {
    const maxValue = Math.max(...histogramData.map(d => d.value));
    const chartWidth = 600;
    const maxChartHeight = 500;
    const chartX = (width - chartWidth) / 2;
    const chartY = (height - maxChartHeight) / 2;
    const barWidth = (chartWidth - 80) / histogramData.length;
    const padding = 8;
    const visibleBars = Math.floor(progress * histogramData.length);

    return (
      <div style={{
        position: 'absolute',
        left: chartX,
        top: chartY,
        width: chartWidth,
        height: maxChartHeight,
        backgroundColor: '#fef3c7',
        borderRadius: '16px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '600',
          color: '#78350f',
          marginBottom: '8px',
          fontFamily: 'Inter'
        }}>
          Yellow Bar Chart
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '64px',
          fontSize: '32px',
          fontFamily: 'Inter'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#78350f',
            fontWeight: 'bold'
          }}>✓</div>
          <span style={{ color: '#f59e0b', fontWeight: '500' }}>Highlight Something</span>
        </div>

        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            height: '280px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            {histogramData.map((data, index) => {
              const barHeight = interpolate(
                data.value,
                [0, maxValue],
                [20, 260]
              );
              
              const animatedHeight = index < visibleBars
                ? spring({
                    frame: frame - (index * 6),
                    fps,
                    config: { damping: 12, stiffness: 100 }
                  }) * barHeight
                : index === visibleBars
                ? interpolate(
                    progress * histogramData.length - visibleBars,
                    [0, 1],
                    [0, barHeight]
                  )
                : 0;

              const isYellowBar = index === 2 || index === 5 || index === 7;
              const barColor = isYellowBar ? '#fbbf24' : '#fed7aa';

              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: barWidth - padding
                }}>
                  <div style={{
                    width: barWidth - padding,
                    height: Math.max(0, animatedHeight),
                    backgroundColor: barColor,
                    borderRadius: \`\${(barWidth - padding) / 2}px\`,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {isYellowBar && animatedHeight > 40 && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            height: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {histogramData.map((data, index) => (
              <div key={index} style={{
                fontSize: '16px',
                color: '#92400e',
                fontFamily: 'Inter',
                fontWeight: '600',
                width: barWidth - padding,
                textAlign: 'center'
              }}>
                {data.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(frame / 120, 1);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)' }}>
      <HistogramChart progress={Math.max(0, progress)} />
    </AbsoluteFill>
  );
}`
    },

    // Example 9: Really cool bar chart with gradients
    {
      role: 'user',
      content: 'Build a performance metrics bar chart with gradient background and glowing effects'
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

const padding = 16;
const margin = 8;
const gap = 12;

export default function Scene_mepw1wc4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraProgress = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5
    }
  });

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
            const barHeight = interpolate(
              frame,
              [60 + index * 12, 90 + index * 12],
              [0, (bar.value / 200) * 320],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }
            );

            const valueOpacity = interpolate(
              frame,
              [90 + index * 12, 120 + index * 12],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }
            );

            const barScale = spring({
              frame: frame - (60 + index * 12),
              fps,
              config: {
                damping: 15,
                stiffness: 150
              }
            });

            return (
              <div key={index} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px"
              }}>
                <div style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  opacity: valueOpacity,
                  fontFamily: "Inter",
                  textShadow: "0 2px 10px rgba(0,0,0,0.3)"
                }}>
                  {bar.value}
                </div>
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

  // Return the complete message chain
  return [
    systemPrompt,
    ...exampleMessages,
    { role: 'user', content: userRequest }
  ];
}

/**
 * Alternative: Get messages with specific examples only
 */
export function buildWithSelectedExamples(
  userRequest: string,
  exampleIndices: number[] = [0, 1, 2], // Default to first 3 examples
  format: { width: number; height: number; format: string } = { width: 1920, height: 1080, format: 'LANDSCAPE' }
): GeneratorMessage[] {
  const allMessages = buildCodeGeneratorV2Messages(userRequest, true, format);
  
  // Extract system prompt
  const systemPrompt = allMessages[0];
  
  // Get selected examples (each example is 2 messages: user + assistant)
  const selectedExamples: GeneratorMessage[] = [];
  exampleIndices.forEach(index => {
    const userIndex = 1 + (index * 2);
    const assistantIndex = userIndex + 1;
    const userMsg = allMessages[userIndex];
    const assistantMsg = allMessages[assistantIndex];
    if (userMsg && assistantMsg) {
      selectedExamples.push(userMsg, assistantMsg);
    }
  });
  
  // Return system + selected examples + actual user request
  const finalMessages: GeneratorMessage[] = [
    systemPrompt,
    ...selectedExamples,
    { role: 'user', content: userRequest }
  ];
  
  return finalMessages;
}

/**
 * Utility: Format messages for API call
 */
export function formatForAPI(messages: GeneratorMessage[]) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Example usage in your generation service:
 * 
 * import { buildCodeGeneratorV2Messages, formatForAPI } from './code-generator-v2';
 * 
 * const messages = buildCodeGeneratorV2Messages(
 *   userPrompt,
 *   true, // include examples
 *   { width: 1920, height: 1080, format: 'LANDSCAPE' }
 * );
 * 
 * const response = await anthropic.messages.create({
 *   model: 'claude-3-5-sonnet-20241022',
 *   messages: formatForAPI(messages),
 *   max_tokens: 8192,
 *   temperature: 0.7
 * });
 */

// Export for testing different configurations
export const CODE_GENERATOR_V2_CONFIGS = {
  FULL_EXAMPLES: (userRequest: string, format?: any) => 
    buildCodeGeneratorV2Messages(userRequest, true, format), // All 9 examples
  
  NO_EXAMPLES: (userRequest: string, format?: any) => 
    buildCodeGeneratorV2Messages(userRequest, false, format),
  
  MINIMAL_EXAMPLES: (userRequest: string, format?: any) => 
    buildWithSelectedExamples(userRequest, [0, 2, 6], format), // Corporate card, data viz, pill bar chart
  
  SOCIAL_EXAMPLES: (userRequest: string, format?: any) => 
    buildWithSelectedExamples(userRequest, [1, 4, 5], format), // Message notification, testimonials, iPhone notifications
  
  DATA_VIZ_EXAMPLES: (userRequest: string, format?: any) => 
    buildWithSelectedExamples(userRequest, [2, 6, 7, 8], format), // Data viz, 3 bar chart variants
  
  FINANCE_EXAMPLES: (userRequest: string, format?: any) => 
    buildWithSelectedExamples(userRequest, [0, 2, 3], format), // Corporate card, data viz, Google sign-in
  
  UI_COMPONENTS: (userRequest: string, format?: any) => 
    buildWithSelectedExamples(userRequest, [1, 3, 5], format), // Notifications, Google sign-in, iPhone
};

// Note: All 9 template codes are embedded directly in the conversational examples above
// This provides maximum consistency as the model sees them as its own previous successful responses