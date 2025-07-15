"use client";
import React, { useEffect, useRef, useState } from 'react';

const CluelyVideoPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTimestamp = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (isPlaying && timestamp - lastTimestamp >= frameInterval) {
        setCurrentFrame(prev => (prev + 1) % 600); // 20 seconds at 30fps
        lastTimestamp = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string; easing?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    let progress = (frame - inputMin) / (inputMax - inputMin);
    
    if (options?.easing === "easeInOut") {
      progress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    } else if (options?.easing === "easeOut") {
      progress = 1 - Math.pow(1 - progress, 3);
    }
    
    return outputMin + progress * (outputMax - outputMin);
  };

  const MeetingDemoScene: React.FC<{ frame: number }> = ({ frame }) => {
    const adjustedFrame = frame - 240; // Starts at 8 seconds (moved earlier)
    
    // Animate Cluely window appearing
    const cluelyOpacity = interpolate(
      adjustedFrame,
      [0, 60],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    // Animate typing in the AI response with more realistic text
    const responseText = "I can see you're currently viewing the Cluely website homepage. The AI assistant that monitors your screen and audio to provide contextual help before you even ask for it.\n\nWhat is Cluely?\n\nCluely is a proactive AI assistant. Unlike traditional AI chatbots where you need to actively ask questions, Cluely runs in the background, continuously observing your screen content and listening to your audio to provide relevant assistance in real-time.\n\nFeatures:\n1. Screen monitoring: Cluely can see what's on your screen and understand the context\n2. Audio listening: It processes your calls and conversations\n3. Proactive assistance: Rather than waiting for questions, it anticipates what you might need\n4. Completely undetectable: Cluely is invisible to screen-share, follows your eyes, and doesn't join meetings";
    const typingProgress = interpolate(
      adjustedFrame,
      [60, 240],
      [0, responseText.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    const visibleText = responseText.substring(0, Math.floor(typingProgress));

    return (
      <div style={{
        width: '1200px',
        height: '800px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef7ec 100%)',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden'
      }}>
        {/* Main Cluely Interface Window - Fixed Layout */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          height: '720px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Cluely Header Bar */}
          <div style={{
            height: '60px',
            background: '#ffffff',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid #f1f5f9',
            justifyContent: 'space-between'
          }}>
            {/* Record Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#3b82f6',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#ef4444',
                borderRadius: '50%'
              }}></div>
              00:00
            </div>

            {/* Center Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <button style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Ask AI ⌘
              </button>
              <button style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Show/Hide ⌘
              </button>
            </div>

            {/* Settings */}
            <div style={{
              width: '32px',
              height: '32px',
              background: '#f8fafc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
              </svg>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{
            flex: 1,
            display: 'flex',
            background: '#f8fafc'
          }}>
            {/* Left Sidebar - Context Panel */}
            <div style={{
              width: '300px',
              background: '#ffffff',
              borderRight: '1px solid #f1f5f9',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0369a1',
                  marginBottom: '8px'
                }}>
                  Screen Activity
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#0369a1'
                }}>
                  Viewing: cluely.com homepage
                </div>
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px'
                }}>
                  Audio Activity
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  No audio detected
                </div>
              </div>

              <div style={{
                background: '#f0fdf4',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#047857',
                  marginBottom: '8px'
                }}>
                  Ready to Assist
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#047857'
                }}>
                  Monitoring for context
                </div>
              </div>
            </div>

            {/* Main Response Area */}
            <div style={{
              flex: 1,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      AI Response
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280'
                    }}>
                      Contextual assistance ready
                    </div>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#374151',
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto'
                }}>
                  {visibleText}
                  {adjustedFrame >= 60 && adjustedFrame < 240 && (
                    <span style={{
                      borderRight: '2px solid #3b82f6',
                      animation: 'blink 1s infinite'
                    }}>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Made with Bazaar Badge */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Made with Bazaar
        </div>
      </div>
    );
  };

  const HomepageScene: React.FC<{ frame: number }> = ({ frame }) => {
    const adjustedFrame = frame - 90; // Starts after logo

    // Animate elements appearing
    const headerOpacity = interpolate(
      adjustedFrame,
      [0, 30],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    const heroOpacity = interpolate(
      adjustedFrame,
      [30, 90],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    const featuresOpacity = interpolate(
      adjustedFrame,
      [90, 150],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    return (
      <div style={{
        width: '1200px',
        height: '800px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef7ec 100%)',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden'
      }}>
        {/* Browser Frame */}
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Browser Header */}
          <div style={{
            height: '48px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
              <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}></div>
              <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div>
            </div>
            <div style={{
              flex: 1,
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '8px 16px',
              margin: '0 20px',
              fontSize: '14px',
              color: '#64748b',
              border: '1px solid #e2e8f0'
            }}>
              🔒 cluely.com
            </div>
          </div>

          {/* Website Content */}
          <div style={{
            height: 'calc(100% - 48px)',
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <header style={{
              padding: '20px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              opacity: headerOpacity
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#0f172a'
              }}>
                Cluely
              </div>
              <div style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span style={{ color: '#64748b' }}>Use cases</span>
                <span style={{ color: '#64748b' }}>Pricing</span>
                <span style={{ color: '#64748b' }}>Enterprise</span>
                <span style={{ color: '#64748b' }}>Careers</span>
                <button style={{
                  background: '#0f172a',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Download
                </button>
              </div>
            </header>

            {/* Hero Section */}
            <div style={{
              padding: '80px 40px',
              textAlign: 'center',
              opacity: heroOpacity
            }}>
              <h1 style={{
                fontSize: '72px',
                fontWeight: '700',
                color: '#0f172a',
                margin: '0 0 24px 0',
                lineHeight: '1.1'
              }}>
                AI that helps before<br />you even ask.
              </h1>
              <p style={{
                fontSize: '24px',
                color: '#64748b',
                margin: '0 0 40px 0',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: '1.4'
              }}>
                Cluely uses your screen and audio to provide intelligence during meetings, sales calls, and everything on your computer.
              </p>
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center'
              }}>
                <button style={{
                  background: '#0f172a',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Download for Mac
                </button>
                <button style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Download for Windows
                </button>
              </div>
            </div>

            {/* Features Section */}
            <div style={{
              padding: '0 40px 40px',
              opacity: featuresOpacity
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '40px',
                maxWidth: '1000px',
                margin: '0 auto'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: '0 0 12px 0'
                  }}>
                    Sees what you see
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Cluely sees and understands all the content on your screen — code, slides, questions, docs, dashboards.
                  </p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
                      <path d="M12 2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm6 6c0-3.31-2.69-6-6-6S6 4.69 6 8h2c0-2.21 1.79-4 4-4s4 1.79 4 4v8c0 1.1-.9 2-2 2h-1v2h1c2.21 0 4-1.79 4-4V8z"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: '0 0 12px 0'
                  }}>
                    Hears what you hear
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Cluely listens silently in the background and understands your meetings in real time — without ever joining them.
                  </p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
                      <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: '0 0 12px 0'
                  }}>
                    Answers anything
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Just press a key. Cluely knows what you're doing and responds with exactly what matters — no switching tabs, no guesswork.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Made with Bazaar Badge */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Made with Bazaar
        </div>
      </div>
    );
  };

  const IntroScene: React.FC<{ frame: number }> = ({ frame }) => {
    // First title animation
    const firstTitleScale = interpolate(
      frame,
      [0, 30],
      [0.8, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    // Second title animation (starts after 0.5s = 15 frames)
    const secondTitleOpacity = interpolate(
      frame,
      [15, 45],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    const secondTitleTranslateY = interpolate(
      frame,
      [15, 45],
      [20, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: "easeOut" }
    );

    return (
      <div style={{
        width: '1200px',
        height: '800px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef7ec 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative'
      }}>
        {/* First Title - Cluely */}
        <div style={{
          fontSize: '96px',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '32px',
          textAlign: 'center',
          transform: `scale(${firstTitleScale})`,
          transition: 'transform 0.3s ease-out'
        }}>
          Cluely
        </div>
        
        {/* Second Title - AI that helps before you even ask */}
        <div style={{
          fontSize: '36px',
          fontWeight: '500',
          color: '#64748b',
          textAlign: 'center',
          opacity: secondTitleOpacity,
          transform: `translateY(${secondTitleTranslateY}px)`,
          transition: 'all 0.3s ease-out',
          maxWidth: '800px',
          lineHeight: '1.2'
        }}>
          AI that helps before you even ask
        </div>

        {/* Made with Bazaar badge */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          background: 'rgba(15, 23, 42, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '8px 16px',
          border: '1px solid rgba(15, 23, 42, 0.2)'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Made with Bazaar
          </div>
        </div>
      </div>
    );
  };

  const CluelyApp: React.FC = () => {
    const frame = currentFrame;
    
    // Show intro screen for first 90 frames (3 seconds)
    if (frame < 90) {
      return <IntroScene frame={frame} />;
    }

    // Show Cluely interface demo after frame 240 (8 seconds)
    if (frame >= 240) {
      return <MeetingDemoScene frame={frame} />;
    }

    // Show homepage
    return <HomepageScene frame={frame} />;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `
      }} />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '500px',
        padding: '20px',
        gap: '20px'
      }}>
        <CluelyApp />
        <button
          onClick={togglePlayPause}
          style={{
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </>
  );
};

export default CluelyVideoPlayer; 