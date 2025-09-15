const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = window.Remotion;

// Auto-generated defaults for undefined variables
const padding = 16;
const margin = 8;
const gap = 12;

const TemplateScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Static dark background - no rotation
  const gradientOpacity = interpolate(frame, [0, 30, 90, 120], [0.8, 1, 1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phoneScale = spring({ frame, fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 1,
    },
  });

  const contentOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const balanceScale = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 1,
    },
  });

  // Desktop browser animation
  const desktopScale = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 1,
    },
  });

  // Slot machine effect for balance - animate from £12 to £24.14 (slower with cubic easing)
  const balanceValue = interpolate(frame, [15, 75], [12, 24.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t), // cubic easing
  });

  // Desktop balance animation - animate from €850 to €29,969
  const desktopBalanceValue = interpolate(frame, [25, 85], [850, 29969], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t), // cubic easing
  });

  const desktopBalanceScale = spring({
    frame: frame - 25,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 1,
    },
  });

  // Staggered transaction animations with scale effect - slower with cubic easing
  const transaction1Scale = interpolate(
    frame,
    [15, 30, 50],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const transaction2Scale = interpolate(
    frame,
    [25, 40, 60],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const transaction3Scale = interpolate(
    frame,
    [35, 50, 70],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const transaction4Scale = interpolate(
    frame,
    [45, 60, 80],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const transactionOpacity = interpolate(frame, [15, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t), // cubic easing
  });

  // Desktop transaction stagger animations
  const desktopTransaction1Scale = interpolate(
    frame,
    [25, 40, 60],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const desktopTransaction2Scale = interpolate(
    frame,
    [35, 50, 70],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const desktopTransaction3Scale = interpolate(
    frame,
    [45, 60, 80],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const desktopTransaction4Scale = interpolate(
    frame,
    [55, 70, 90],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const desktopTransaction5Scale = interpolate(
    frame,
    [65, 80, 100],
    [0, 1.2, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t), // cubic easing
    }
  );

  const desktopTransactionOpacity = interpolate(frame, [25, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t), // cubic easing
  });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #1f1f1f 50%, #333333 75%, #262626 100%)",
      opacity: gradientOpacity,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: "40px",
      padding: "20px"
    }}>
      {/* Phone Container - Left side */}
      <div style={{
        transform: `scale(${phoneScale * 0.66})`,
        width: "375px",
        height: "812px",
        position: "relative",
        borderRadius: "40px",
        backgroundColor: "#000",
        padding: "8px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        flexShrink: 0
      }}>
        {/* Phone Screen */}
        <div style={{
          width: "100%",
          height: "100%",
          borderRadius: "32px",
          overflow: "hidden",
          background: "linear-gradient(135deg, #3c1361 0%, #5b21b6 50%, #312e81 100%)",
          position: "relative",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translateX(-50%)",
            width: "150px",
            height: "30px",
            backgroundColor: "#000",
            borderBottomLeftRadius: "15px",
            borderBottomRightRadius: "15px",
            zIndex: 10,
          }} />

          {/* Status Bar - Aligned with notch - INCREASED PADDING TOP */}
          <div style={{
            opacity: contentOpacity,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            paddingTop: "20px",
            color: "white",
            fontSize: "16px",
            fontWeight: "700",
            fontFamily: "Inter",
            height: "30px",
          }}>
            <span>21:15</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <window.IconifyIcon icon="mdi:signal" style={{ fontSize: "16px" }} />
              <window.IconifyIcon icon="mdi:wifi" style={{ fontSize: "16px" }} />
              <span style={{ fontSize: "14px" }}>68</span>
              <window.IconifyIcon icon="mdi:battery" style={{ fontSize: "16px" }} />
            </div>
          </div>

          {/* Top Bar with Profile and Search - INCREASED MARGIN TOP */}
          <div style={{
            opacity: contentOpacity,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: "12px",
            marginTop: "18px",
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "20px",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              <Img
                src="https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/asian-woman.png"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
            <div style={{
              flex: 1,
              height: "40px",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: "8px",
            }}>
              <window.IconifyIcon icon="mdi:magnify" style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)" }} />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px", fontFamily: "Inter", fontWeight: "600" }}>Search</span>
            </div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "20px",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <window.IconifyIcon icon="mdi:chart-bar" style={{ fontSize: "18px", color: "white" }} />
            </div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "20px",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <window.IconifyIcon icon="mdi:credit-card" style={{ fontSize: "18px", color: "white" }} />
            </div>
          </div>

          {/* Main Balance Section */}
          <div style={{
            opacity: contentOpacity,
            textAlign: "center",
            marginTop: "40px",
            transform: `scale(${balanceScale})`,
          }}>
            <div style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "16px",
              fontFamily: "Inter",
              fontWeight: "600",
              marginBottom: "8px",
            }}>
              Main • GBP
            </div>
            <div style={{
              color: "white",
              fontSize: "48px",
              fontWeight: "700",
              fontFamily: "Inter",
              marginBottom: "20px",
            }}>
              £{balanceValue.toFixed(2)}
            </div>
            <div style={{
              display: "inline-block",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "20px",
              padding: "8px 20px",
              color: "white",
              fontSize: "16px",
              fontFamily: "Inter",
              fontWeight: "600",
            }}>
              Accounts
            </div>
          </div>

          {/* Action Buttons - FIXED: Hardcoded individual buttons instead of dynamic map */}
          <div style={{
            opacity: contentOpacity,
            display: "flex",
            justifyContent: "space-around",
            padding: "0 10px",
            marginTop: "50px",
          }}>
            {/* Add money button */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "25px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <window.IconifyIcon icon="mdi:plus" style={{ fontSize: "20px", color: "white" }} />
              </div>
              <span style={{
                color: "white",
                fontSize: "12px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Add money
              </span>
            </div>

            {/* Exchange button */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "25px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <window.IconifyIcon icon="mdi:swap-horizontal" style={{ fontSize: "20px", color: "white" }} />
              </div>
              <span style={{
                color: "white",
                fontSize: "12px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Exchange
              </span>
            </div>

            {/* Details button */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "25px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <window.IconifyIcon icon="mdi:format-list-bulleted" style={{ fontSize: "20px", color: "white" }} />
              </div>
              <span style={{
                color: "white",
                fontSize: "12px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Details
              </span>
            </div>

            {/* More button */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "25px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <window.IconifyIcon icon="mdi:dots-horizontal" style={{ fontSize: "20px", color: "white" }} />
              </div>
              <span style={{
                color: "white",
                fontSize: "12px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                More
              </span>
            </div>
          </div>

          {/* Transaction List - Added Sainsbury's transaction */}
          <div style={{
            opacity: transactionOpacity,
            padding: "0 20px",
            marginTop: "30px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              transform: `scale(${transaction1Scale})`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "20px",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}>
                  <window.IconifyIcon icon="emojione:flag-for-united-kingdom" style={{ fontSize: "32px" }} />
                </div>
                <div>
                  <div style={{
                    color: "white",
                    fontSize: "16px",
                    fontFamily: "Inter",
                    fontWeight: "600",
                  }}>
                    Personal → Cara Chatfield
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                  }}>
                    4 November, 23:37
                  </div>
                </div>
              </div>
              <div style={{
                color: "white",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                -£6
              </div>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              transform: `scale(${transaction2Scale})`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "20px",
                  backgroundColor: "#00b894",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "700",
                  fontFamily: "Inter",
                }}>
                  PP
                </div>
                <div>
                  <div style={{
                    color: "white",
                    fontSize: "16px",
                    fontFamily: "Inter",
                    fontWeight: "600",
                  }}>
                    PADDYPOWER
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                  }}>
                    4 November, 18:52
                  </div>
                </div>
              </div>
              <div style={{
                color: "#10b981",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                +£18.92
              </div>
            </div>

            {/* New Sainsbury's transaction */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              transform: `scale(${transaction3Scale})`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "20px",
                  backgroundColor: "#FF8200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "700",
                  fontFamily: "Inter",
                }}>
                  SB
                </div>
                <div>
                  <div style={{
                    color: "white",
                    fontSize: "16px",
                    fontFamily: "Inter",
                    fontWeight: "600",
                  }}>
                    SAINSBURY'S
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                  }}>
                    3 November, 16:45
                  </div>
                </div>
              </div>
              <div style={{
                color: "white",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                -£11
              </div>
            </div>

            {/* Starbucks transaction */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              marginBottom: "20px",
              transform: `scale(${transaction4Scale})`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "20px",
                  backgroundColor: "#00704A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px",
                }}>
                  <window.IconifyIcon icon="simple-icons:starbucks" style={{ fontSize: "28px", color: "white" }} />
                </div>
                <div>
                  <div style={{
                    color: "white",
                    fontSize: "16px",
                    fontFamily: "Inter",
                    fontWeight: "600",
                  }}>
                    STARBUCKS COFFEE
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500",
                  }}>
                    3 November, 14:22
                  </div>
                </div>
              </div>
              <div style={{
                color: "white",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                -£4.75
              </div>
            </div>
          </div>

          {/* Bottom Navigation - FIXED: Hardcoded individual nav items instead of dynamic map */}
          <div style={{
            position: "absolute",
            bottom: "30px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "space-around",
            padding: "0 10px",
            opacity: transactionOpacity,
          }}>
            {/* Home (active) */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}>
              <window.IconifyIcon icon="mdi:home" style={{ fontSize: "24px", color: "white" }} />
              <span style={{
                color: "white",
                fontSize: "10px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Home
              </span>
            </div>

            {/* Invest */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}>
              <window.IconifyIcon icon="mdi:chart-line" style={{ fontSize: "24px", color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Invest
              </span>
            </div>

            {/* Transfers */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}>
              <window.IconifyIcon icon="mdi:star" style={{ fontSize: "24px", color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Transfers
              </span>
            </div>

            {/* Crypto */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}>
              <window.IconifyIcon icon="mdi:bitcoin" style={{ fontSize: "24px", color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Crypto
              </span>
            </div>

            {/* Lifestyle */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}>
              <window.IconifyIcon icon="mdi:heart" style={{ fontSize: "24px", color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                fontFamily: "Inter",
                fontWeight: "600",
              }}>
                Lifestyle
              </span>
            </div>
          </div>

          {/* Home Indicator */}
          <div style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "134px",
            height: "5px",
            backgroundColor: "white",
            borderRadius: "3px",
            opacity: 0.3,
          }} />
        </div>
      </div>

      {/* Desktop Browser - Chrome with Revolut Business - Right side */}
      <div style={{
        transform: `scale(${desktopScale * 0.78})`,
        width: "1000px",
        height: "650px",
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        flexShrink: 0
      }}>
        {/* Chrome Browser Header */}
        <div style={{
          height: "40px",
          backgroundColor: "#2d2d2d",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "8px"
        }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ff5f57" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#28ca42" }} />
          </div>

          {/* Address bar */}
          <div style={{
            flex: 1,
            height: "28px",
            backgroundColor: "#404040",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            marginLeft: "20px",
            marginRight: "20px"
          }}>
            <window.IconifyIcon icon="mdi:lock" style={{ fontSize: "14px", color: "#10b981", marginRight: "8px" }} />
            <span style={{ color: "#ffffff", fontSize: "13px", fontFamily: "Inter" }}>business.revolut.com</span>
          </div>
        </div>

        {/* Revolut Business Interface */}
        <div style={{
          height: "610px",
          background: "linear-gradient(135deg, #3c1361 0%, #5b21b6 50%, #312e81 100%)",
          display: "flex"
        }}>
          {/* Left Sidebar - FIXED: Hardcoded individual nav items instead of dynamic map */}
          <div style={{
            width: "280px",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: "20px 0"
          }}>
            {/* Logo */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              marginBottom: "30px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                backgroundColor: "white",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px"
              }}>
                <span style={{ color: "#000", fontWeight: "bold", fontSize: "18px", fontFamily: "Inter" }}>R</span>
              </div>
              <span style={{ color: "white", fontSize: "18px", fontWeight: "600", fontFamily: "Inter" }}>Business</span>
            </div>

            {/* Navigation Items - FIXED: Individual hardcoded items */}
            {/* Home (active) */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderLeft: "3px solid #10b981",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:home" style={{ fontSize: "20px", color: "white", marginRight: "12px" }} />
              <span style={{
                color: "white",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "600"
              }}>
                Home
              </span>
            </div>

            {/* Cards */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:credit-card" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Cards
              </span>
            </div>

            {/* Transfers */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:swap-horizontal" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Transfers
              </span>
            </div>

            {/* Merchant */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:store" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Merchant
              </span>
            </div>

            {/* Treasury */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:chart-line" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Treasury
              </span>
            </div>

            {/* Expenses */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:receipt" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Expenses
              </span>
            </div>

            {/* Team */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:account-group" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Team
              </span>
            </div>

            {/* Rewards */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:gift" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Rewards
              </span>
            </div>

            {/* Analytics */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              backgroundColor: "transparent",
              borderLeft: "3px solid transparent",
              cursor: "pointer"
            }}>
              <window.IconifyIcon icon="mdi:chart-bar" style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginRight: "12px" }} />
              <span style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                fontFamily: "Inter",
                fontWeight: "500"
              }}>
                Analytics
              </span>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{
            flex: 1,
            padding: "20px 30px"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "30px"
            }}>
              <h1 style={{
                color: "white",
                fontSize: "32px",
                fontWeight: "700",
                fontFamily: "Inter",
                margin: 0
              }}>Home</h1>

              <div style={{ display: "flex", gap: "12px" }}>
                <button style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  cursor: "pointer"
                }}>⋯</button>
                <button style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  cursor: "pointer"
                }}>≡ Details</button>
                <button style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  cursor: "pointer"
                }}>⚡ Move</button>
                <button style={{
                  backgroundColor: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "#1a1a1a",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  cursor: "pointer"
                }}>+ Add money</button>
              </div>
            </div>

            {/* Balance Section */}
            <div style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
              transform: `scale(${desktopBalanceScale})`
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  backgroundColor: "#4285f4",
                  borderRadius: "50%",
                  marginRight: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>€</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "16px",
                  fontFamily: "Inter",
                  fontWeight: "500"
                }}>Main • EUR • Default</span>
              </div>
              <div style={{
                color: "white",
                fontSize: "36px",
                fontWeight: "700",
                fontFamily: "Inter"
              }}>€{desktopBalanceValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            </div>

            {/* Transaction Table */}
            <div style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              overflow: "hidden",
              opacity: desktopTransactionOpacity
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderBottom: "1px solid rgba(255,255,255,0.1)"
              }}>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Transaction</span>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Date</span>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Created by</span>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Status</span>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Account</span>
                <span style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600"
                }}>Amount</span>
              </div>

              {/* Transaction Rows - FIXED: Hardcoded individual rows instead of dynamic map */}
              {/* Anthropic Transaction */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
                transform: `scale(${desktopTransaction1Scale})`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontSize: "14px",
                    fontWeight: "600",
                    overflow: "hidden"
                  }}>
                    <window.IconifyIcon icon="ri:anthropic-fill" style={{ fontSize: "20px" }} />
                  </div>
                  <span style={{
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500"
                  }}>Anthropic</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Today, 11:25</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Markus Lysaker ...</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Pending</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Main • EUR</span>
                <span style={{
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  textAlign: "right"
                }}>-€22.14</span>
              </div>

              {/* Cursor Transaction */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
                transform: `scale(${desktopTransaction2Scale})`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontSize: "14px",
                    fontWeight: "600",
                    overflow: "hidden"
                  }}>
                    <window.IconifyIcon icon="material-icon-theme:cursor-light" style={{ fontSize: "20px" }} />
                  </div>
                  <span style={{
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500"
                  }}>Cursor</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Yesterday, 0...</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Jack Osullivan</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Completed • Ad...</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Main • EUR</span>
                <span style={{
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  textAlign: "right"
                }}>-€22.54</span>
              </div>

              {/* Heroku Transaction */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
                transform: `scale(${desktopTransaction3Scale})`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontSize: "14px",
                    fontWeight: "600",
                    overflow: "hidden"
                  }}>
                    <window.IconifyIcon icon="skill-icons:heroku" style={{ fontSize: "20px", color: "white" }} />
                  </div>
                  <span style={{
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500"
                  }}>Heroku</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>8 Sept, 19:12</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Markus Lysaker ...</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Completed</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Main • EUR</span>
                <span style={{
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  textAlign: "right"
                }}>-€19.75</span>
              </div>

              {/* Second Cursor Transaction */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
                transform: `scale(${desktopTransaction4Scale})`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontSize: "14px",
                    fontWeight: "600",
                    overflow: "hidden"
                  }}>
                    <window.IconifyIcon icon="material-icon-theme:cursor-light" style={{ fontSize: "20px" }} />
                  </div>
                  <span style={{
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500"
                  }}>Cursor</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>7 Sept, 05:17</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Jack Osullivan</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Completed • Ad...</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Main • EUR</span>
                <span style={{
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  textAlign: "right"
                }}>-€17.29</span>
              </div>

              {/* ReStream Solutions Transaction */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 20px",
                alignItems: "center",
                transform: `scale(${desktopTransaction5Scale})`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#4285f4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    overflow: "hidden"
                  }}>
                    R
                  </div>
                  <span style={{
                    color: "white",
                    fontSize: "14px",
                    fontFamily: "Inter",
                    fontWeight: "500"
                  }}>ReStream Solutions</span>
                </div>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>4 Sept, 20:55</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Jack Osullivan</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Completed</span>
                <span style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "Inter"
                }}>Main • EUR</span>
                <span style={{
                  color: "white",
                  fontSize: "14px",
                  fontFamily: "Inter",
                  fontWeight: "600",
                  textAlign: "right"
                }}>-€16.32</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const durationInFrames_A7B9C2E1 = 90;
export default TemplateScene;