"use client";
import React, { useEffect, useRef, useState } from 'react';

const GeneratingScenePlanPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let frameCount = 0;
    const animate = () => {
      frameCount = (frameCount + 1) % 360; // 12 seconds at 30fps
      setCurrentFrame(frameCount);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const GeneratingContent: React.FC = () => {
    const text = "Generating scene plan";
    const frame = currentFrame;
    
    // Create shimmer effect with JavaScript for better control
    const shimmerProgress = (frame % 90) / 90; // 3 seconds at 30fps
    const backgroundPosition = `${shimmerProgress * 200 - 100}% 0%`;

    return (
      <div className="generating-scene-container" style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          position: 'relative',
          display: 'inline-block'
        }}>
          <div
            className="generating-scene-text"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: "600",
              position: 'relative',
              background: 'linear-gradient(90deg, #9ca3af 0%, #374151 25%, #1f2937 50%, #374151 75%, #9ca3af 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              backgroundSize: '200% 100%',
              backgroundPosition: backgroundPosition,
              transition: 'background-position 0.1s ease-out'
            }}
          >
            {text}
          </div>
        </div>
      </div>
    );
  };

  const ChatInterface: React.FC = () => {
    const frame = currentFrame - 120; // Start after 4 seconds of shimmer
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    const scenes = [
      { id: 1, title: "Intro Animation", description: "Using the brand identity extracted from the provided images, so we'll create a scene animating in your logo and tagline with a subtle spring effect", type: "Animation" },
      { id: 2, title: "App Scroll", description: "Show the user scrolling listings on the home screen", type: "Interaction" },
      { id: 3, title: "View Property", description: "Show the user selecting a listing and highlight the 4.97 star rating and review count with a gentle zoom-in and fade-up of text to emphasize credibility and trust.", type: "Animation" },
      { id: 4, title: "Booking Flow", description: "Simulate a tap on a property, a scroll through details, and a click on 'Reserve' with cursor interactions", type: "Interaction" }
    ];

    interface Message {
      id: string | number;
      type: 'scene' | 'action';
      content?: string;
      scene?: {
        title: string;
        description: string;
        type: string;
      };
      timestamp: string;
    }

    // Auto-scroll effect - calculate scroll position based on number of visible messages
    const getScrollPosition = (numMessages: number) => {
      if (numMessages <= 1) return 0;
      // Each message is roughly 120px height + gap, scroll down as more appear
      return Math.min((numMessages - 1) * 100, 200); // Max 200px scroll
    };

    // Simplified timing - always show some messages for testing
    const getVisibleMessages = (): Message[] => {
      const messages: Message[] = [];
      
      // Remove the AI message - start directly with scenes
      // Show scenes based on time elapsed since chat interface appeared
      const timeElapsed = Math.max(0, frame);
      
      // Scene 1 appears immediately (0 frames)
      if (timeElapsed >= 0) {
        messages.push({
          id: 1,
          type: 'scene',
          scene: scenes[0]!,
          timestamp: "02:00 PM"
        });
      }

      // Scene 2 appears after 1 second (30 frames)
      if (timeElapsed >= 30) {
        messages.push({
          id: 2,
          type: 'scene',
          scene: scenes[1]!,
          timestamp: "02:00 PM"
        });
      }

      // Scene 3 appears after 2 seconds (60 frames)
      if (timeElapsed >= 60) {
        messages.push({
          id: 3,
          type: 'scene',
          scene: scenes[2]!,
          timestamp: "02:00 PM"
        });
      }

      // Scene 4 appears after 3 seconds (90 frames)
      if (timeElapsed >= 90) {
        messages.push({
          id: 4,
          type: 'scene',
          scene: scenes[3]!,
          timestamp: "02:00 PM"
        });
      }

      // Create all button appears after 4 seconds (120 frames)
      // Final state holds for 4 additional seconds (until frame 240)
      if (timeElapsed >= 120) {
        messages.push({
          id: 'create-all',
          type: 'action',
          content: '',
          timestamp: "02:00 PM"
        });
      }

      return messages;
    };

    const visibleMessages = getVisibleMessages();
    const scrollPosition = isMobile ? getScrollPosition(visibleMessages.length) : 0;

    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Chat Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            fontFamily: 'Inter, sans-serif'
          }}>
            Chat
          </h3>
          <button style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px'
          }}>
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflow: isMobile ? 'hidden' : 'auto', // Only hide scrollbar on mobile
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transform: `translateY(-${scrollPosition}px)`,
            transition: scrollPosition > 0 ? 'transform 0.8s ease-out' : 'none'
          }}>
          {visibleMessages.map((message) => (
            <div key={message.id} style={{
              display: 'flex',
              flexDirection: 'column'
            }}>
              {message.type === 'scene' && message.scene && (
                <div style={{
                  background: message.id === 1 ? '#f0fdf4' : 
                            message.id === 2 ? '#fef3c7' : 
                            message.id === 3 ? '#fef2f2' : 
                            '#f3f4f6',
                  border: message.id === 1 ? '1px solid #bbf7d0' : 
                         message.id === 2 ? '1px solid #fcd34d' : 
                         message.id === 3 ? '1px solid #fecaca' : 
                         '1px solid #d1d5db',
                  padding: '16px',
                  borderRadius: '12px',
                  alignSelf: 'flex-start',
                  width: '100%'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}>
                    <div style={{ 
                      flex: 1
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#ffffff',
                          background: message.id === 1 ? '#059669' : 
                                     message.id === 2 ? '#d97706' : 
                                     message.id === 3 ? '#dc2626' : 
                                     '#6b7280',
                          fontFamily: 'Inter, sans-serif',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          minWidth: '20px',
                          textAlign: 'center'
                        }}>
                          Scene {message.id}
                        </span>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: message.id === 1 ? '#065f46' : 
                                 message.id === 2 ? '#92400e' : 
                                 message.id === 3 ? '#991b1b' : 
                                 '#374151',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          {message.scene.title}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: message.id === 1 ? '#059669' : 
                               message.id === 2 ? '#d97706' : 
                               message.id === 3 ? '#dc2626' : 
                               '#6b7280',
                        fontFamily: 'Inter, sans-serif',
                        lineHeight: 1.4
                      }}>
                        {message.scene.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {message.type === 'action' && (
                <button style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '12px 24px',
                  background: '#ffffff',
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  color: '#000000',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  width: 'auto',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #ec4899, #f97316)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  position: 'relative',
                  alignSelf: 'flex-start'
                }}>
                  Create all scenes
                </button>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  };

  // Show shimmer for first 4 seconds (120 frames), then chat interface
  const showShimmer = currentFrame < 120;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .generating-scene-container {
            padding: 60px 40px;
          }
          
          .generating-scene-text {
            font-size: 32px;
          }
          
          @media (max-width: 768px) {
            .generating-scene-container {
              padding: 30px 15px !important;
            }
            
            .generating-scene-text {
              font-size: 20px !important;
            }
          }
        `
      }} />
      <div 
        className="w-full md:w-4/5 lg:w-3/5 xl:w-1/2"
        style={{ 
          aspectRatio: '0.72/1',
          background: 'transparent',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          margin: '0 auto',
          maxWidth: '500px'
        }}
      >
        {showShimmer ? <GeneratingContent /> : <ChatInterface />}
      </div>
    </>
  );
};

export default GeneratingScenePlanPlayer; 