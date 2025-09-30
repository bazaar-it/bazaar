
const { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;
const window_avatars = window.BazaarAvatars;

const script_ui8p9s3d = [
  { type: "gradient-background", frames: 15 },
  { type: "dashboard-entrance", frames: 15 },
  { type: "revenue-growth-entrance", frames: 15 },
  { type: "feature-metrics-entrance", frames: 15 },
  { type: "user-engagement-entrance", frames: 15 },
  { type: "support-response-entrance", frames: 15 },
  { type: "customer-satisfaction-entrance", frames: 15 },
  { type: "time-on-site-entrance", frames: 15 },
  { type: "chart-animations", frames: 15 },
  { type: "dashboard-exit", frames: 15 },
];

let accumulatedFrames_ui8p9s3d = 0;
const sequences_ui8p9s3d: Array<(typeof script_ui8p9s3d)[number] & { start: number; end: number }> = [];

script_ui8p9s3d.forEach((segment) => {
  sequences_ui8p9s3d.push({
    ...segment,
    start: accumulatedFrames_ui8p9s3d,
    end: accumulatedFrames_ui8p9s3d + segment.frames,
  });
  accumulatedFrames_ui8p9s3d += segment.frames;
});

const totalFrames_ui8p9s3d = script_ui8p9s3d.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_ui8p9s3d = totalFrames_ui8p9s3d;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const gradientPosition = interpolate(frame, [0, totalFrames_ui8p9s3d], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dashboardScale = spring({
    frame: frame - sequences_ui8p9s3d[1].start,
    fps,
    config: { damping: 8, stiffness: 120 },
  });
  const dashboardOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[1].start, sequences_ui8p9s3d[1].start + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const revenueY = spring({
    frame: frame - sequences_ui8p9s3d[2].start,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const revenueOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[2].start, sequences_ui8p9s3d[2].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const featureX = spring({
    frame: frame - sequences_ui8p9s3d[3].start,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const featureOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[3].start, sequences_ui8p9s3d[3].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const engagementY = spring({
    frame: frame - sequences_ui8p9s3d[4].start,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const engagementOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[4].start, sequences_ui8p9s3d[4].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const supportX = spring({
    frame: frame - sequences_ui8p9s3d[5].start,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const supportOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[5].start, sequences_ui8p9s3d[5].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const customerScale = spring({
    frame: frame - sequences_ui8p9s3d[6].start,
    fps,
    config: { damping: 10, stiffness: 110 },
  });
  const customerOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[6].start, sequences_ui8p9s3d[6].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const timeY = spring({
    frame: frame - sequences_ui8p9s3d[7].start,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const timeOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[7].start, sequences_ui8p9s3d[7].start + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const chart1Height = interpolate(
    frame,
    [sequences_ui8p9s3d[8].start, sequences_ui8p9s3d[8].start + 5],
    [0, 80],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const chart2Height = interpolate(
    frame,
    [sequences_ui8p9s3d[8].start + 2, sequences_ui8p9s3d[8].start + 7],
    [0, 120],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const chart3Height = interpolate(
    frame,
    [sequences_ui8p9s3d[8].start + 4, sequences_ui8p9s3d[8].start + 9],
    [0, 60],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const chart4Height = interpolate(
    frame,
    [sequences_ui8p9s3d[8].start + 6, sequences_ui8p9s3d[8].start + 11],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const exitY = interpolate(
    frame,
    [sequences_ui8p9s3d[9].start, sequences_ui8p9s3d[9].start + 12],
    [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitOpacity = interpolate(
    frame,
    [sequences_ui8p9s3d[9].start, sequences_ui8p9s3d[9].start + 12],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dashboardWidth = Math.min(width * 0.7, 700);
  const dashboardHeight = Math.min(height * 0.8, 560);
  const padding = Math.min(width, height) * 0.03;
  const gap = Math.min(width, height) * 0.02;
  const tileHeight = (dashboardHeight - padding * 2 - gap * 3) / 3;
  const tileWidth = (dashboardWidth - padding * 2 - gap * 3) / 3;
  const avatarSize = Math.min(tileWidth * 0.15, 40);
  const iconSize = Math.min(tileWidth * 0.2, 32);
  const chartWidth = tileWidth * 0.15;
  const chartGap = tileWidth * 0.05;

  const avatarStrip = (names: string[]) =>
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" } },
      names.map((name) =>
        React.createElement("img", {
          key: name,
          src: window_avatars[name],
          style: {
            width: `${avatarSize}px`,
            height: `${avatarSize}px`,
            borderRadius: "50%",
            objectFit: "cover",
          },
        })
      )
    );

  const starRow = (icons: string[]) =>
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "20px" } },
      icons.map((icon, idx) =>
        React.createElement(window.IconifyIcon, {
          key: `${icon}-${idx}`,
          icon,
          style: { fontSize: `${iconSize}px`, color: "#f59e42" },
        })
      )
    );

  const chartBars = () =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: `${chartGap}px`,
          height: "120px",
          marginTop: "20px",
        },
      },
      [
        { height: Math.max(chart1Height, 1), color: "#4f46e5" },
        { height: Math.max(chart2Height, 1), color: "#f59e42" },
        { height: Math.max(chart3Height, 1), color: "#10b981" },
        { height: Math.max(chart4Height, 1), color: "#ef4444" },
      ].map((bar, idx) =>
        React.createElement("div", {
          key: `bar-${idx}`,
          style: {
            width: `${chartWidth}px`,
            height: `${bar.height}px`,
            backgroundColor: bar.color,
            borderRadius: "4px",
          },
        })
      )
    );

  return React.createElement(
    AbsoluteFill,
    { style: { backgroundColor: "#f0f0f0" } },
    React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background:
          "linear-gradient(135deg, hsl(260, 80%, 70%) 0%, hsl(290, 85%, 65%) 50%, hsl(320, 90%, 60%) 100%)",
        backgroundSize: "400% 400%",
        backgroundPosition: `${gradientPosition}px ${gradientPosition}px`,
        backgroundRepeat: "no-repeat",
        opacity: 0.6,
        zIndex: 1,
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${exitY}px) scale(${dashboardScale})`,
          width: `${dashboardWidth}px`,
          height: `${dashboardHeight}px`,
          backgroundColor: "#f8f9fa",
          borderRadius: "32px",
          padding: `${padding}px`,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
          opacity: dashboardOpacity * exitOpacity,
          display: "flex",
          flexDirection: "column",
          gap: `${gap}px`,
          overflow: "hidden",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: `${gap}px`, height: `${tileHeight}px` } },
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `translateY(${revenueY * -30}px)`,
              opacity: revenueOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement("div", {
              style: { fontSize: "18px", fontWeight: "600", color: "#4f46e5", fontFamily: "Inter" },
              children: "REVENUE GROWTH",
            }),
            React.createElement("div", {
              style: {
                fontSize: "42px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginTop: "12px",
                fontFamily: "Inter",
              },
              children: "+24%",
            })
          ),
          avatarStrip(["asian-woman", "black-man", "hispanic-man"])
        ),
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `translateX(${featureX * 40}px)`,
              opacity: featureOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "20px" } },
            [
              { icon: "mdi:star", text: "FEATURE METRICS", color: "#f59e42" },
              { icon: "mdi:fire", text: "+68% ENGAGEMENT", color: "#ef4444" },
              { icon: "mdi:heart", text: "+12% CONVERSION", color: "#10b981" },
            ].map((item) =>
              React.createElement(
                "div",
                { key: item.text, style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement(window.IconifyIcon, {
                  icon: item.icon,
                  style: { fontSize: `${iconSize}px`, color: item.color },
                }),
                React.createElement("div", {
                  style: { fontSize: "18px", fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" },
                  children: item.text,
                })
              )
            )
          ),
          React.createElement("div", {
            style: {
              fontSize: "28px",
              fontWeight: "700",
              color: "#1a1a1a",
              marginTop: "20px",
              fontFamily: "Inter",
            },
            children: "76% CUSTOMER SATISFACTION",
          })
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: `${gap}px`, height: `${tileHeight}px` } },
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `translateY(${engagementY * 35}px)`,
              opacity: engagementOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement("div", {
              style: { fontSize: "18px", fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" },
              children: "USER ENGAGEMENT",
            }),
            React.createElement("div", {
              style: {
                fontSize: "42px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginTop: "12px",
                fontFamily: "Inter",
              },
              children: "4.6/5",
            })
          ),
          starRow(["mdi:star", "mdi:star", "mdi:star", "mdi:star", "mdi:star-half"])
        ),
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `translateX(${supportX * -35}px)`,
              opacity: supportOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement("div", {
              style: { fontSize: "18px", fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" },
              children: "SUPPORT RESPONSE TIME",
            }),
            React.createElement("div", {
              style: {
                fontSize: "42px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginTop: "12px",
                fontFamily: "Inter",
              },
              children: React.createElement("span", { style: { color: "#4f46e5" }, children: "+92%" }),
            })
          ),
          avatarStrip(["middle-eastern-man", "white-woman"])
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: `${gap}px`, height: `${tileHeight}px` } },
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `scale(${customerScale})`,
              opacity: customerOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement("div", {
              style: { fontSize: "18px", fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" },
              children: "CUSTOMER FEEDBACK",
            }),
            React.createElement("div", {
              style: {
                fontSize: "42px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginTop: "12px",
                fontFamily: "Inter",
              },
              children: "4.8/5",
            })
          ),
          starRow(["mdi:star", "mdi:star", "mdi:star", "mdi:star", "mdi:star"])
        ),
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              flex: 1,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
              transform: `translateY(${timeY * -40}px)`,
              opacity: timeOpacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement("div", {
              style: { fontSize: "18px", fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" },
              children: "TIME ON SITE",
            }),
            React.createElement("div", {
              style: {
                fontSize: "42px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginTop: "12px",
                fontFamily: "Inter",
              },
              children: "3.4m",
            })
          ),
          chartBars()
        )
      )
    )
  );
}

export default Scene;
