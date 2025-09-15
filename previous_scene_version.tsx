const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Video, Sequence } = window.Remotion;

// Chat dialogue data at top level for proper scoping - extended conversation about Notion demo
const chatDialogue = [
  { type: 'user', text: 'Create a software demo video for Notion', frames: 50 },
  { type: 'ai', text: 'Here\'s an animated walk-thru video for Notion, highlighting the new AI features', frames: 60 },
  { type: 'user', text: 'Make it better. More creative. More awesome. More engaging. Don\'t make mistakes or you go to jail', frames: 70 },
  { type: 'ai', text: 'How\'s this?', frames: 30 },
  { type: 'user', text: 'You\'re a wizard! Thanks perfect', frames: 40 },
  { type: 'ai', text: 'Glad you like it! Would you like me to add any specific transitions or effects?', frames: 60 },
  { type: 'user', text: 'Yes! Add some smooth slide transitions between the pages', frames: 50 },
  { type: 'ai', text: 'Perfect! I\'ve added elegant slide transitions. The pages now flow seamlessly into each other.', frames: 65 },
  { type: 'user', text: 'Can you also highlight the AI writing assistant feature?', frames: 55 },
  { type: 'ai', text: 'Absolutely! I\'ll add a spotlight effect on the AI writing assistant with animated text suggestions appearing in real-time.', frames: 75 }
];

const BazaarInterface = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Chrome browser frame dimensions (responsive)
  const browserPadding = Math.min(width * 0.05, 40);
  const browserWidth = width - (browserPadding * 2);
  const browserHeight = height - (browserPadding * 2);
  const chromeHeaderHeight = 80;
  const screenWidth = browserWidth;
  const screenHeight = browserHeight - chromeHeaderHeight;

  // UI spacing constants
  const uiSpacing = 10;
  const uiPadding = 15;

  // Calculate responsive widths for content with spacing
  const sidebarWidth = 80;
  const remainingWidth = screenWidth - sidebarWidth - (uiSpacing * 3) - (uiPadding * 2);
  const chatWidth = Math.floor(remainingWidth * 0.5);
  const videoWidth = remainingWidth - chatWidth;

  // Video player panel position and dimensions
  const videoPlayerLeft = browserPadding + uiPadding + sidebarWidth + uiSpacing + chatWidth + uiSpacing;
  const videoPlayerTop = browserPadding + chromeHeaderHeight + 60 + uiPadding; // +60 for header
  const videoPlayerPanelWidth = videoWidth;
  const videoPlayerPanelHeight = screenHeight - 1  - (uiSpacing * 2) - (uiPadding * 2);

  // Video player black area (inside the panel)
  const videoPlayerMargin = 20;
  const videoPlayerBlackLeft = videoPlayerLeft + videoPlayerMargin;
  const videoPlayerBlackTop = videoPlayerTop + 56 + videoPlayerMargin; // +56 for panel header
  const videoPlayerBlackWidth = videoPlayerPanelWidth - (videoPlayerMargin * 2);
  const videoPlayerBlackHeight = screenHeight - 255 - (uiSpacing * 2) - (uiPadding * 2);

  // Chat panel position and dimensions
  const chatPanelLeft = browserPadding + uiPadding + sidebarWidth + uiSpacing;
  const chatPanelTop = browserPadding + chromeHeaderHeight + 60 + uiPadding;
  const chatPanelWidth = chatWidth;
  const chatPanelHeight = screenHeight - 200 - (uiSpacing * 2) - (uiPadding * 2);

  // Enhanced cubic bezier easing function (more aggressive ease-out)
  const cubicBezierEasing = (t) => {
    // More aggressive cubic bezier curve: ease-out (0.15, 0.85, 0.25, 1)
    const p0 = 0;
    const p1 = 0.15;
    const p2 = 0.25;
    const p3 = 1;

    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };

  // Phase 1: Video scale down (0-20 frames)
  const normalizedProgress = Math.min(Math.max(frame / 20, 0), 1);
  const easedProgress = cubicBezierEasing(normalizedProgress);

  // Video scale down animation with faster cubic bezier easing (0-20 frames)
  const videoScaleDown = interpolate(
    easedProgress,
    [0, 1],
    [1, 0.4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Video position animation to video player black area with faster cubic bezier easing (0-20 frames)
  const videoPositionX = interpolate(
    easedProgress,
    [0, 1],
    [0, videoPlayerBlackLeft],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const videoPositionY = interpolate(
    easedProgress,
    [0, 1],
    [0, videoPlayerBlackTop],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Video dimensions when scaled down should match video player black area with faster cubic bezier easing
  const scaledVideoWidth = interpolate(
    easedProgress,
    [0, 1],
    [width, videoPlayerBlackWidth],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scaledVideoHeight = interpolate(
    easedProgress,
    [0, 1],
    [height, videoPlayerBlackHeight],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Browser frame opacity (faster timing - delayed by 10 frames)
  const browserOpacity = interpolate(
    frame,
    [10, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Sidebar animation (faster timing - delayed by 10 frames with higher stiffness)
  const sidebarProgress = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 10, stiffness: 150, mass: 0.3 }
  });

  const sidebarTransform = `translateX(${interpolate(
    sidebarProgress,
    [0, 1],
    [-100, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )}px)`;

  // Chat panel animation (faster timing - delayed by 10 frames with higher stiffness) - REMOVED SCALE
  const chatProgress = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 10, stiffness: 150, mass: 0.3 }
  });

  const chatTransform = `translateY(${interpolate(
    chatProgress,
    [0, 1],
    [-50, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )}px)`;

  const chatOpacity = interpolate(
    chatProgress,
    [0, 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Video player animation (starts immediately with video scaling - higher stiffness)
  const videoProgress = spring({
    frame: frame,
    fps: 30,
    config: { damping: 10, stiffness: 150, mass: 0.3 }
  });

  const videoOpacity = interpolate(
    videoProgress,
    [0, 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Timeline animation (faster timing - delayed by 10 frames with higher stiffness)
  const timelineProgress = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 10, stiffness: 150, mass: 0.3 }
  });

  const timelineTransform = `translateY(${interpolate(
    timelineProgress,
    [0, 1],
    [50, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )}px)`;

  const timelineOpacity = interpolate(
    timelineProgress,
    [0, 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Chat dialogue animation - spread over 10 seconds (300 frames) starting at frame 20
  const getDialogueOpacity = (index) => {
    const startFrame = 20 + (index * 30); // 30 frames apart to spread over 10 seconds
    return interpolate(
      frame,
      [startFrame, startFrame + 20],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  const getDialogueTransform = (index) => {
    const startFrame = 20 + (index * 30); // 30 frames apart to spread over 10 seconds
    const translateY = interpolate(
      frame,
      [startFrame, startFrame + 20],
      [15, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    return `translateY(${translateY}px)`;
  };

  // Typing indicator animation for AI responses
  const getTypingIndicator = (index) => {
    if (chatDialogue[index].type !== 'ai') return false;
    const startFrame = 20 + (index * 30); // Updated timing
    return frame >= startFrame - 20 && frame < startFrame;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#f0f0f0', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Main container - NO CAMERA TRANSFORM */}
      <div style={{
        width: '100%',
        height: '100%'
      }}>
        {/* Chrome Browser Frame */}
        <div style={{
          width: browserWidth,
          height: browserHeight,
          backgroundColor: '#ffffff',
          borderRadius: 8,
          position: 'absolute',
          top: browserPadding,
          left: browserPadding,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid #dadce0',
          opacity: browserOpacity
        }}>
          {/* Chrome Header */}
          <div style={{
            width: '100%',
            height: chromeHeaderHeight,
            backgroundColor: '#f1f3f4',
            borderRadius: '8px 8px 0 0',
            borderBottom: '1px solid #dadce0',
            position: 'relative'
          }}>
            {/* Window Controls */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 16,
              display: 'flex',
              gap: 8
            }}>
              <div style={{ width: 12, height: 12, backgroundColor: '#ff5f57', borderRadius: '50%' }}></div>
              <div style={{ width: 12, height: 12, backgroundColor: '#ffbd2e', borderRadius: '50%' }}></div>
              <div style={{ width: 12, height: 12, backgroundColor: '#28ca42', borderRadius: '50%' }}></div>
            </div>

            {/* Tab */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 100,
              width: 240,
              height: 36,
              backgroundColor: '#ffffff',
              borderRadius: '8px 8px 0 0',
              border: '1px solid #dadce0',
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 8
            }}>
              <div style={{ color: '#1a73e8', fontSize: 16 }}><window.IconifyIcon icon="logos:google-chrome" /></div>
              <span style={{ fontSize: 14, color: '#202124', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Bazaar - Motion Graphics</span>
              <div style={{ color: '#5f6368', fontSize: 14, cursor: 'pointer' }}>×</div>
            </div>

            {/* Address Bar */}
            <div style={{
              position: 'absolute',
              top: 44,
              left: 16,
              right: 16,
              height: 32,
              backgroundColor: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 12
            }}>
              <div style={{ color: '#5f6368', fontSize: 16 }}><window.IconifyIcon icon="mdi:lock" /></div>
              <span style={{ fontSize: 14, color: '#202124', flex: 1 }}>https://bazaar.dev/projects/ui-animation</span>
              <div style={{ color: '#5f6368', fontSize: 16 }}><window.IconifyIcon icon="mdi:star-outline" /></div>
              <div style={{ color: '#5f6368', fontSize: 16 }}><window.IconifyIcon icon="mdi:dots-vertical" /></div>
            </div>
          </div>

          {/* Browser Content Area */}
          <div style={{
            width: screenWidth,
            height: screenHeight,
            backgroundColor: '#f5f5f5',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Interface Content */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#f5f5f5'
            }}>
              {/* Top Header */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 60,
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 100
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>Bazaar</div>
                </div>

                <div style={{ fontSize: 18, fontWeight: '500', color: '#333' }}>UI Animation</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#374151',
                    cursor: 'pointer'
                  }}>Share</button>
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'white',
                    cursor: 'pointer'
                  }}>Download</button>
                  <div style={{
                    width: 36,
                    height: 36,
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>J</div>
                </div>
              </div>

              {/* Sidebar */}
              <div style={{
                position: 'absolute',
                top: 60 + uiPadding,
                left: uiPadding,
                width: sidebarWidth,
                height: screenHeight - 200 - (uiSpacing * 2) - (uiPadding * 2),
                backgroundColor: 'white',
                borderRadius: 15,
                border: '1px solid #e5e5e5',
                transform: sidebarTransform,
                zIndex: 90
              }}>
                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: '#374151',
                      border: '1px solid #e5e5e5'
                    }}><window.IconifyIcon icon="mdi:plus" /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>New</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:folder" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Projects</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:chat" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Chat</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:clock" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Timeline</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:camera" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Media</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:laptop" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Code</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}><window.IconifyIcon icon="mdi:clipboard-text" style={{ color: '#374151' }} /></div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Templates</div>
                  </div>
                </div>
              </div>

              {/* Chat Panel */}
              <div style={{
                position: 'absolute',
                top: 60 + uiPadding,
                left: uiPadding + sidebarWidth + uiSpacing,
                width: chatWidth,
                height: screenHeight - 200 - (uiSpacing * 2) - (uiPadding * 2),
                backgroundColor: 'white',
                borderRadius: 15,
                border: '1px solid #e5e5e5',
                transform: chatTransform,
                opacity: chatOpacity,
                zIndex: 80,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: '#333' }}>AI Assistant</h3>
                  <div style={{ color: '#9ca3af', fontSize: 18, cursor: 'pointer' }}>×</div>
                </div>

                <div style={{ padding: 20, height: 'calc(100% - 160px)', overflowY: 'auto', paddingBottom: 30 }}>
                  {/* Animated chat messages */}
                  {chatDialogue.map((message, index) => (
                    <div key={index} style={{
                      marginBottom: 8,
                      opacity: getDialogueOpacity(index),
                      transform: getDialogueTransform(index)
                    }}>
                      {message.type === 'ai' ? (
                        <>
                          {/* Typing indicator */}
                          {getTypingIndicator(index) && (
                            <div style={{
                              fontSize: 14,
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              padding: '12px 16px',
                              borderRadius: 18,
                              marginBottom: 4,
                              lineHeight: 1.4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: 'fit-content'
                            }}>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <div style={{ width: 4, height: 4, backgroundColor: '#6b7280', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                <div style={{ width: 4, height: 4, backgroundColor: '#6b7280', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></div>
                                <div style={{ width: 4, height: 4, backgroundColor: '#6b7280', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></div>
                              </div>
                              AI is typing...
                            </div>
                          )}
                          {/* AI message - grey background */}
                          <div style={{
                            fontSize: 14,
                            color: '#374151',
                            backgroundColor: '#f3f4f6',
                            padding: '12px 16px',
                            borderRadius: 18,
                            marginBottom: 6,
                            lineHeight: 1.4,
                            width: 'fit-content',
                            maxWidth: '85%'
                          }}>
                            {message.text}
                          </div>
                        </>
                      ) : (
                        /* User message - black background */
                        <>
                          <div style={{
                            backgroundColor: '#1f2937',
                            borderRadius: 18,
                            padding: '12px 16px',
                            marginBottom: 6,
                            marginLeft: 'auto',
                            width: 'fit-content',
                            maxWidth: '85%'
                          }}>
                            <div style={{ color: 'white', fontSize: 14, lineHeight: 1.4 }}>
                              {message.text}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 20,
                  backgroundColor: 'white',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 24,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 12,
                    backgroundColor: 'white',
                    minHeight: '72px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ color: '#9ca3af', fontSize: 16 }}><window.IconifyIcon icon="mdi:image" /></div>
                      <div style={{ color: '#9ca3af', fontSize: 16 }}><window.IconifyIcon icon="mdi:microphone" /></div>
                    </div>
                    <textarea
                      placeholder="Ask me anything about motion graphics..."
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 14,
                        color: '#333',
                        backgroundColor: 'transparent',
                        resize: 'none',
                        height: '48px',
                        lineHeight: '16px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ color: '#8b5cf6', fontSize: 16 }}><window.IconifyIcon icon="mdi:sparkles" /></div>
                      <div style={{
                        width: 32,
                        height: 32,
                        backgroundColor: '#1f2937',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14
                      }}><window.IconifyIcon icon="mdi:send" /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Player Panel - frame only, no background to let video show through */}
              <div style={{
                position: 'absolute',
                top: 60 + uiPadding,
                left: uiPadding + sidebarWidth + uiSpacing + chatWidth + uiSpacing,
                width: videoWidth,
                height: screenHeight - 200 - (uiSpacing * 2) - (uiPadding * 2),
                opacity: videoOpacity,
                zIndex: 75,
                overflow: 'hidden',
                borderRadius: 15,
                border: '1px solid #e5e5e5'
              }}>
                {/* Panel header with background */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 95
                }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: '#333' }}>Video Player</h3>
                </div>
              </div>

              {/* Timeline */}
              <div style={{
                position: 'absolute',
                bottom: uiPadding,
                left: uiPadding,
                right: uiPadding,
                height: 140,
                backgroundColor: 'white',
                borderRadius: 15,
                border: '1px solid #e5e5e5',
                transform: timelineTransform,
                opacity: timelineOpacity,
                zIndex: 60,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>0 / 360f</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#6b7280', fontSize: 16 }}><window.IconifyIcon icon="mdi:skip-previous" /></div>
                      <div style={{ color: '#6b7280', fontSize: 16 }}><window.IconifyIcon icon="mdi:play" /></div>
                      <div style={{ color: '#6b7280', fontSize: 16 }}><window.IconifyIcon icon="mdi:skip-next" /></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Off</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Scene</div>
                    <div style={{
                      backgroundColor: '#1f2937',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 14
                    }}>Video</div>
                    <div style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><window.IconifyIcon icon="mdi:fast-forward" /> 1.0x</div>
                    <div style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><window.IconifyIcon icon="mdi:magnify" /> 100%</div>
                    <div style={{ color: '#6b7280', fontSize: 16 }}><window.IconifyIcon icon="mdi:cog" /></div>
                    <div style={{ color: '#6b7280', fontSize: 16 }}>×</div>
                  </div>
                </div>

                <div style={{ padding: '0 20px', height: 40, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    height: '100%',
                    position: 'relative',
                    width: '100%'
                  }}>
                    {Array.from({ length: 13 }, (_, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${i * 8.33}%`,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                          00:0{i}:00
                        </div>
                        <div style={{ width: 1, height: 20, backgroundColor: '#e5e5e7' }}></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  margin: '0 20px',
                  height: 40,
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center'
                }}>
                  {/* Single video clip - increased width to fill space */}
                  <div style={{
                    height: 40,
                    width: '100%',
                    backgroundColor: '#1f2937',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px'
                  }}>
                    <div style={{ color: 'white', fontSize: 12, marginRight: 8 }}><window.IconifyIcon icon="mdi:drag-vertical" /></div>
                    <div style={{ color: 'white', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>User Video</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video container with proper positioning */}
        <div style={{
          position: 'absolute',
          top: browserPadding + videoPositionY - 60,
          left: browserPadding + videoPositionX - 55,
          width: scaledVideoWidth,
          height: scaledVideoHeight,
          zIndex: frame < 20 ? 200 : 70,
          opacity: 1,
          borderRadius: frame >= 0 ? 15 : 0,
          overflow: 'hidden'
        }}>
          {/* Single video */}
          <Video
            src="https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/fb2acad2-c77f-4267-b90d-f5a8a47e42e0/videos/1757845114509-6e17fcab-5358-4c58-a4e0-2258db51df9f.mp4"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            startFrom={0}
            muted={false}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Calculate total duration - chat animation over 10 seconds (300 frames) + initial setup
const totalFrames_chat_scene = 20 + 300; // 20 for initial setup, 300 for 10-second chat animation
export const durationInFrames_bazaar_interface = totalFrames_chat_scene;

export default BazaarInterface;