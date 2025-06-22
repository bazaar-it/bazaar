// src/templates/DualScreenApp.tsx
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';

const GradientCircle: React.FC<{
  x: number;
  y: number;
  size: number;
  color1: string;
  color2: string;
  opacity: number;
  direction: { x: number; y: number };
}> = ({ x, y, size, color1, color2, opacity, direction }) => {
  const frame = useCurrentFrame();
  
  // Slow drifting motion
  const driftX = Math.sin(frame / 180) * direction.x;
  const driftY = Math.cos(frame / 180) * direction.y;

  return (
    <div
      style={{
        position: "absolute",
        left: x + driftX,
        top: y + driftY,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${color1}, ${color2})`,
        opacity: 0.6 * opacity,
        filter: "blur(60px)",
        transition: "all 0.5s ease-out",
      }}
    />
  );
};

const PhoneFrame: React.FC<{
  opacity: number;
  children: React.ReactNode;
  x: number;
}> = ({ opacity, children, x }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: "280px",
        height: "580px",
        background: "white",
        borderRadius: "32px",
        position: "relative",
        overflow: "hidden",
        opacity,
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div
        style={{
          height: "36px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "white",
          position: "relative",
          zIndex: 2,
          opacity: timeProgress,
          transform: `translateY(${interpolate(timeProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ 
          fontSize: "14px",
          fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
          fontWeight: 700,
        }}>
          9:41
        </div>
        <div style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
          </svg>
        </div>
      </div>

      {children}
    </div>
  );
};

const ProfileScreen: React.FC<{
  delay: number;
}> = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        height: "100%",
        background: "#F8F9FA",
        padding: "20px",
      }}
    >
      <div
        style={{
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            color: "#1A1A1A",
            marginBottom: "24px",
          }}
        >
          Profile
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50px",
              background: "#4A90E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div
            style={{
              fontSize: "20px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              fontWeight: 700,
              color: "#1A1A1A",
            }}
          >
            Sarah Wilson
          </div>
          <div
            style={{
              fontSize: "14px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              color: "#666666",
            }}
          >
            Product Designer
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {[
          { icon: "key", label: "Account Settings" },
          { icon: "bell", label: "Notifications" },
          { icon: "lock", label: "Privacy & Security" },
          { icon: "credit-card", label: "Payment Methods" },
          { icon: "help-circle", label: "Help & Support" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "white",
              borderRadius: "12px",
              opacity: spring({
                frame: frame - delay - 15 - i * 5,
                fps: 30,
                config: { damping: 12, stiffness: 200 },
              }),
              transform: `translateX(${interpolate(
                spring({
                  frame: frame - delay - 15 - i * 5,
                  fps: 30,
                  config: { damping: 12, stiffness: 200 },
                }),
                [0, 1],
                [50, 0]
              )}px)`,
            }}
          >
            <div style={{ fontSize: "20px", color: "#4A90E2" }}>
              {item.icon === "key" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 2l-2 2-1.5-1.5L17 2l-1 1-1.5-1.5L13 2l-2 2-1.5-1.5L7 2 5 4v16l2 2 1.5-1.5L10 22l1-1 1.5 1.5L14 22l2-2 1.5 1.5L19 22l2-2V2z"/>
                </svg>
              )}
              {item.icon === "bell" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
              )}
              {item.icon === "lock" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              {item.icon === "credit-card" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
              )}
              {item.icon === "help-circle" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <path d="M12 17h.01"/>
                </svg>
              )}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                fontWeight: 500,
                color: "#1A1A1A",
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesScreen: React.FC<{
  delay: number;
}> = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        height: "100%",
        background: "#F8F9FA",
        padding: "20px",
      }}
    >
      <div
        style={{
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            color: "#1A1A1A",
            marginBottom: "24px",
          }}
        >
          Messages
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#666666" }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <div
            style={{
              fontSize: "14px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              color: "#666666",
              flex: 1,
            }}
          >
            Search messages...
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {[
          { name: "Alex Johnson", message: "Hey, how's the project going?", time: "2m ago", avatar: "AJ" },
          { name: "Maria Garcia", message: "Can we meet tomorrow?", time: "1h ago", avatar: "MG" },
          { name: "David Chen", message: "The design looks great!", time: "3h ago", avatar: "DC" },
          { name: "Emma Wilson", message: "Thanks for the feedback", time: "1d ago", avatar: "EW" },
        ].map((conversation, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "white",
              borderRadius: "12px",
              opacity: spring({
                frame: frame - delay - 20 - i * 5,
                fps: 30,
                config: { damping: 12, stiffness: 200 },
              }),
              transform: `translateX(${interpolate(
                spring({
                  frame: frame - delay - 20 - i * 5,
                  fps: 30,
                  config: { damping: 12, stiffness: 200 },
                }),
                [0, 1],
                [50, 0]
              )}px)`,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "20px",
                background: "#4A90E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                fontWeight: 600,
                color: "white",
              }}
            >
              {conversation.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  marginBottom: "2px",
                }}
              >
                {conversation.name}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                  color: "#666666",
                }}
              >
                {conversation.message}
              </div>
            </div>
            <div
              style={{
                fontSize: "10px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                color: "#999999",
              }}
            >
              {conversation.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DualScreenApp() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  // Separate progress for right screen
  const rightScreenProgress = spring({
    frame: frame - 45, // Delay the right screen appearance
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "#F8F9FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background circles with drift animations */}
      <GradientCircle
        x={200}
        y={200}
        size={600}
        color1="#4A90E2"
        color2="#45B7D1"
        opacity={mainProgress}
        direction={{ x: 100, y: 50 }}
      />
      <GradientCircle
        x={1400}
        y={200}
        size={600}
        color1="#45B7D1"
        color2="#4A90E2"
        opacity={mainProgress}
        direction={{ x: -80, y: 120 }}
      />
      <GradientCircle
        x={800}
        y={800}
        size={600}
        color1="#4A90E2"
        color2="#45B7D1"
        opacity={mainProgress}
        direction={{ x: 60, y: -90 }}
      />

      {/* Centered container for phones */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "120px", // Space between phones
          position: "relative",
          zIndex: 1,
        }}
      >
        <PhoneFrame opacity={mainProgress} x={0}>
          <ProfileScreen delay={15} />
        </PhoneFrame>

        <PhoneFrame opacity={rightScreenProgress} x={0}>
          <MessagesScreen delay={60} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'dual-screen-app',
  name: 'Dual Screen App',
  duration: 180, // 6 seconds
  previewFrame: 90,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

const GradientCircle = ({ x, y, size, color1, color2, opacity, direction }) => {
  const frame = useCurrentFrame();
  
  // Slow drifting motion
  const driftX = Math.sin(frame / 180) * direction.x;
  const driftY = Math.cos(frame / 180) * direction.y;

  return (
    <div
      style={{
        position: "absolute",
        left: x + driftX,
        top: y + driftY,
        width: size,
        height: size,
        borderRadius: "50%",
        background: \`radial-gradient(circle at 30% 30%, \${color1}, \${color2})\`,
        opacity: 0.6 * opacity,
        filter: "blur(60px)",
        transition: "all 0.5s ease-out",
      }}
    />
  );
};

const PhoneFrame = ({ opacity, children, x }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: "280px",
        height: "580px",
        background: "white",
        borderRadius: "32px",
        position: "relative",
        overflow: "hidden",
        opacity,
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div
        style={{
          height: "36px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "white",
          position: "relative",
          zIndex: 2,
          opacity: timeProgress,
          transform: \`translateY(\${interpolate(timeProgress, [0, 1], [20, 0])}px)\`,
        }}
      >
        <div style={{ 
          fontSize: "14px",
          fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
          fontWeight: 700,
        }}>
          9:41
        </div>
        <div style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
          </svg>
        </div>
      </div>

      {children}
    </div>
  );
};

const ProfileScreen = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        height: "100%",
        background: "#F8F9FA",
        padding: "20px",
      }}
    >
      <div
        style={{
          opacity: progress,
          transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            color: "#1A1A1A",
            marginBottom: "24px",
          }}
        >
          Profile
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50px",
              background: "#4A90E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div
            style={{
              fontSize: "20px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              fontWeight: 700,
              color: "#1A1A1A",
            }}
          >
            Sarah Wilson
          </div>
          <div
            style={{
              fontSize: "14px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              color: "#666666",
            }}
          >
            Product Designer
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {[
          { icon: "key", label: "Account Settings" },
          { icon: "bell", label: "Notifications" },
          { icon: "lock", label: "Privacy & Security" },
          { icon: "credit-card", label: "Payment Methods" },
          { icon: "help-circle", label: "Help & Support" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "white",
              borderRadius: "12px",
              opacity: spring({
                frame: frame - delay - 15 - i * 5,
                fps: 30,
                config: { damping: 12, stiffness: 200 },
              }),
              transform: \`translateX(\${interpolate(
                spring({
                  frame: frame - delay - 15 - i * 5,
                  fps: 30,
                  config: { damping: 12, stiffness: 200 },
                }),
                [0, 1],
                [50, 0]
              )}px)\`,
            }}
          >
            <div style={{ fontSize: "20px", color: "#4A90E2" }}>
              {item.icon === "key" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 2l-2 2-1.5-1.5L17 2l-1 1-1.5-1.5L13 2l-2 2-1.5-1.5L7 2 5 4v16l2 2 1.5-1.5L10 22l1-1 1.5 1.5L14 22l2-2 1.5 1.5L19 22l2-2V2z"/>
                </svg>
              )}
              {item.icon === "bell" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
              )}
              {item.icon === "lock" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              {item.icon === "credit-card" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
              )}
              {item.icon === "help-circle" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <path d="M12 17h.01"/>
                </svg>
              )}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                fontWeight: 500,
                color: "#1A1A1A",
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesScreen = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        height: "100%",
        background: "#F8F9FA",
        padding: "20px",
      }}
    >
      <div
        style={{
          opacity: progress,
          transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            color: "#1A1A1A",
            marginBottom: "24px",
          }}
        >
          Messages
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#666666" }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <div
            style={{
              fontSize: "14px",
              fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
              color: "#666666",
              flex: 1,
            }}
          >
            Search messages...
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {[
          { name: "Alex Johnson", message: "Hey, how's the project going?", time: "2m ago", avatar: "AJ" },
          { name: "Maria Garcia", message: "Can we meet tomorrow?", time: "1h ago", avatar: "MG" },
          { name: "David Chen", message: "The design looks great!", time: "3h ago", avatar: "DC" },
          { name: "Emma Wilson", message: "Thanks for the feedback", time: "1d ago", avatar: "EW" },
        ].map((conversation, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "white",
              borderRadius: "12px",
              opacity: spring({
                frame: frame - delay - 20 - i * 5,
                fps: 30,
                config: { damping: 12, stiffness: 200 },
              }),
              transform: \`translateX(\${interpolate(
                spring({
                  frame: frame - delay - 20 - i * 5,
                  fps: 30,
                  config: { damping: 12, stiffness: 200 },
                }),
                [0, 1],
                [50, 0]
              )}px)\`,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "20px",
                background: "#4A90E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                fontWeight: 600,
                color: "white",
              }}
            >
              {conversation.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  marginBottom: "2px",
                }}
              >
                {conversation.name}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                  color: "#666666",
                }}
              >
                {conversation.message}
              </div>
            </div>
            <div
              style={{
                fontSize: "10px",
                fontFamily: "Articulate CF, system-ui, -apple-system, sans-serif",
                color: "#999999",
              }}
            >
              {conversation.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DualScreenApp() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const rightScreenProgress = spring({
    frame: frame - 45,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "#F8F9FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GradientCircle
        x={200}
        y={200}
        size={600}
        color1="#4A90E2"
        color2="#45B7D1"
        opacity={mainProgress}
        direction={{ x: 100, y: 50 }}
      />
      <GradientCircle
        x={1400}
        y={200}
        size={600}
        color1="#45B7D1"
        color2="#4A90E2"
        opacity={mainProgress}
        direction={{ x: -80, y: 120 }}
      />
      <GradientCircle
        x={800}
        y={800}
        size={600}
        color1="#4A90E2"
        color2="#45B7D1"
        opacity={mainProgress}
        direction={{ x: 60, y: -90 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "120px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <PhoneFrame opacity={mainProgress} x={0}>
          <ProfileScreen delay={15} />
        </PhoneFrame>

        <PhoneFrame opacity={rightScreenProgress} x={0}>
          <MessagesScreen delay={60} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}`
};
