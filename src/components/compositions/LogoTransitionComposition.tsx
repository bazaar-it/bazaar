"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } from 'remotion';

interface LogoTransitionProps {
  theme?: 'light' | 'dark';
}



export const LogoTransitionComposition: React.FC<LogoTransitionProps> = ({ 
  theme = 'light' 
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Animation timing (in frames at 30fps)
  const jupitrr_swipe_in_duration = 30; // 1 second
  const jupitrr_pause_duration = 15; // 500ms pause
  const jupitrr_swipe_out_duration = 15; // 500ms for faster exit
  const levio_swipe_in_duration = 30; // 1 second for Levio entry
  const levio_pause_duration = 15; // 500ms pause
  
  // Total duration: 765 frames (25.5 seconds) - Removed Jupitrr segment
  const product_hunt_duration = 120; // 4 seconds for Product Hunt celebration
  const text_animation_duration = 135; // 4.5 seconds for text
  const levio_exit_duration = 15; // 0.5 seconds for Levio to disappear
  const upload_ui_duration = 150; // 5 seconds for upload UI demo
  const processing_ui_duration = 90; // 3 seconds for processing UI
  const text_input_duration = 150; // 5 seconds for text input demo
  const chat_interface_duration = 120; // 4 seconds for chat interface
  const total_duration = product_hunt_duration + levio_swipe_in_duration + levio_pause_duration + levio_exit_duration + text_animation_duration + upload_ui_duration + processing_ui_duration + text_input_duration + chat_interface_duration;
  
  // Phase timing
  const product_hunt_start = 0; // 0
  const product_hunt_end = product_hunt_duration; // 120
  
  const levio_start = product_hunt_end; // 120 - Start Levio directly after Product Hunt
  const levio_swipe_end = levio_start + levio_swipe_in_duration; // 150
  const levio_pause_end = levio_swipe_end + levio_pause_duration; // 165
  const levio_exit_end = levio_pause_end + levio_exit_duration; // 180
  const text_end = levio_exit_end + text_animation_duration; // 315
  const upload_ui_start = text_end; // 315
  const upload_ui_end = upload_ui_start + upload_ui_duration; // 465
  const processing_ui_start = upload_ui_end; // 465
  const processing_ui_end = processing_ui_start + processing_ui_duration; // 555
  const text_input_start = processing_ui_end; // 555
  const text_input_end = text_input_start + text_input_duration; // 705
  const chat_interface_start = text_input_end; // 705
  const chat_interface_end = chat_interface_start + chat_interface_duration; // 825
  
  // Background color transition - direct from Product Hunt to Levio
  const backgroundColor = frame < product_hunt_end
    ? '#FF6B35' // Orange for Product Hunt celebration
    : `linear-gradient(135deg, #1a4d3a 0%, #0f2f1f 50%, #1a4d3a 100%)`; // Direct to Levio green
  
  // Levio logo animations
  const levio_swipe_in_progress = interpolate(
    frame,
    [levio_start, levio_swipe_end],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Levio logo position
  const levio_x = interpolate(
    levio_swipe_in_progress,
    [0, 1],
    [width + 200, width / 2], // Start from right, center
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Logo opacity - only Levio shown
  const levio_opacity = frame >= levio_start && frame < levio_exit_end ? 1 : 0;
  
  // Spring animation for Levio
  const levio_spring_x = spring({
    frame: frame - levio_start,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 1
    },
    from: width + 200,
    to: width / 2
  });
  
  return (
    <AbsoluteFill style={{ 
      background: backgroundColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      
      {/* Product Hunt Celebration - First 4 seconds */}
      {frame >= product_hunt_start && frame < product_hunt_end && (
        <ProductHuntCelebration 
          frame={frame - product_hunt_start}
          width={width}
          height={height}
        />
      )}
      
      {/* Bright green gradient accents for Levio background - similar to image */}
      {frame >= levio_start && (
        <>
          <div style={{
            position: 'absolute',
            top: '10%',
            right: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00FF00 0%, transparent 70%)',
            opacity: 0.6,
            filter: 'blur(60px)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #32CD32 0%, transparent 60%)',
            opacity: 0.4,
            filter: 'blur(40px)'
          }} />
        </>
      )}
      
      {/* Levio Logo */}
      {frame >= levio_start && frame < levio_exit_end && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${levio_spring_x - width / 2}px), -50%)`,
            opacity: levio_opacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{
            color: 'white',
            fontSize: '72px',
            fontWeight: 'bold',
            fontFamily: 'Libre Baskerville, serif',
            fontStyle: 'italic'
          }}>
            Levio
          </span>
        </div>
      )}

      {/* Text Animation Sequence */}
      {frame >= levio_exit_end && frame < upload_ui_start && (
        <TextRevealAnimation 
          frame={frame - levio_exit_end}
          width={width}
          height={height}
        />
      )}

      {/* Upload UI Demo Sequence */}
      {frame >= upload_ui_start && frame < processing_ui_start && (
        <UploadUIDemo 
          frame={frame - upload_ui_start}
          width={width}
          height={height}
        />
      )}

      {/* Processing UI Sequence */}
      {frame >= processing_ui_start && frame < text_input_start && (
        <ProcessingUIDemo 
          frame={frame - processing_ui_start}
          width={width}
          height={height}
        />
      )}

      {/* Text Input Demo Sequence */}
      {frame >= text_input_start && frame < chat_interface_start && (
        <TextInputDemo 
          frame={frame - text_input_start}
          width={width}
          height={height}
        />
      )}

      {/* Chat Interface Sequence */}
      {frame >= chat_interface_start && (
        <ChatInterfaceDemo 
          frame={frame - chat_interface_start}
          width={width}
          height={height}
        />
      )}
      

    </AbsoluteFill>
  );
};

// Product Hunt Celebration Component
const ProductHuntCelebration: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
  const fadeIn = 15; // 0.5s fade in
  const congratsAppear = 15; // 0.5s - congratulations first
  const jupitrr_logo_appear = 45; // 1.5s - Jupitrr logo second
  const confettiStart = 60; // 2s - confetti explosion AFTER Jupitrr logo
  const badge_appear = 75; // 2.5s - product hunt badge last
  
  const opacity = Math.min(frame / fadeIn, 1);
  const congratsOpacity = frame >= congratsAppear ? Math.min((frame - congratsAppear) / 15, 1) : 0;
  const jupitrr_logo_opacity = frame >= jupitrr_logo_appear ? Math.min((frame - jupitrr_logo_appear) / 15, 1) : 0;
  const badge_opacity = frame >= badge_appear ? Math.min((frame - badge_appear) / 15, 1) : 0;
  
  // Jupitrr logo swipe in animation
  const jupitrr_swipe_progress = frame >= jupitrr_logo_appear 
    ? Math.min((frame - jupitrr_logo_appear) / 30, 1) // 1 second swipe
    : 0;
  const jupitrr_x_offset = (1 - jupitrr_swipe_progress) * 300; // Start from right
  
  // Generate confetti particles - many more with varied colors
  const confettiParticles = Array.from({ length: 120 }, (_, i) => {
    const confettiFrame = Math.max(0, frame - confettiStart);
    const angle = (i * 137.5) % 360; // Golden angle for natural distribution
    const speed = 1.5 + (i % 4); // More varied speeds
    const gravity = 0.04;
    
    const x = Math.cos(angle * Math.PI / 180) * confettiFrame * speed;
    const y = Math.sin(angle * Math.PI / 180) * confettiFrame * speed + gravity * confettiFrame * confettiFrame;
    
    const colors = [
      '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
      '#FF9FF3', '#00FF7F', '#FF4500', '#8A2BE2', '#00CED1', '#FF1493',
      '#32CD32', '#FF69B4', '#1E90FF', '#FFA500', '#DC143C', '#9ACD32'
    ];
    const color = colors[i % colors.length];
    
    // Different shapes for variety
    const shapes = ['circle', 'square', 'triangle'];
    const shape = shapes[i % shapes.length];
    
    return { x, y, color, rotation: confettiFrame * (3 + i % 5), shape };
  });

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity
    }}>
      
      {/* Confetti particles */}
      {frame >= confettiStart && confettiParticles.map((particle, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: particle.shape === 'triangle' ? '0' : '10px',
            height: particle.shape === 'triangle' ? '0' : '10px',
            backgroundColor: particle.shape === 'triangle' ? 'transparent' : particle.color,
            borderRadius: particle.shape === 'circle' ? '50%' : '2px',
            transform: `translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px)) rotate(${particle.rotation}deg)`,
            opacity: Math.max(0, 1 - (frame - confettiStart) / 60), // Fade out over 2 seconds
            borderLeft: particle.shape === 'triangle' ? '5px solid transparent' : 'none',
            borderRight: particle.shape === 'triangle' ? '5px solid transparent' : 'none',
            borderBottom: particle.shape === 'triangle' ? `10px solid ${particle.color}` : 'none'
          }}
        />
      ))}
      
      {/* Congratulations Text - Evenly spaced top */}
      {frame >= congratsAppear && (
        <div style={{
          position: 'absolute',
          top: '160px', // Evenly spaced - first section
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          opacity: congratsOpacity,
          textShadow: '0 3px 6px rgba(0,0,0,0.4)',
          textAlign: 'center',
          padding: '12px 24px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          Congratulations
        </div>
      )}
      
      {/* Jupitrr AI Logo - Evenly spaced center */}
      {frame >= jupitrr_logo_appear && (
        <div style={{
          position: 'absolute',
          top: '346px', // Evenly spaced - center section
          left: '50%',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          opacity: jupitrr_logo_opacity,
          transform: `translate(-50%, -50%)`
        }}>
          <img
            src="https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/jupitrr_logo.jpeg"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          />
          <span style={{
            color: '#FFFFFF',
            fontSize: '32px',
            fontWeight: 'bold',
            fontFamily: 'Gilroy, sans-serif',
            whiteSpace: 'nowrap',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)'
          }}>
            Jupitrr AI
          </span>
        </div>
      )}
      
      {/* Product Hunt Badge - Evenly spaced bottom */}
      {frame >= badge_appear && (
        <div style={{
          position: 'absolute',
          top: '530px', // Evenly spaced - bottom section
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '3px solid #FFFFFF',
          padding: '16px 24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          opacity: badge_opacity,
          scale: frame < badge_appear + 15 ? `${0.8 + ((frame - badge_appear) / 15) * 0.2}` : '1'
        }}>
          
          {/* 1st Place Medal Emoji from Iconify */}
          <div style={{
            fontSize: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            🥇
          </div>
          
          {/* Text Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#FF6B35',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '1px',
              whiteSpace: 'nowrap'
            }}>
              PRODUCT HUNT
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#FF6B35',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap'
            }}>
              #1 Product of the Day
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Text Reveal Animation Component following Kinetic Typography guidelines
const TextRevealAnimation: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
     // Natural speech boundary chunking for better kinetic typography
   const scriptChunks = [
     { words: ["An", "AI"], type: "phrase" },
     { words: ["video", "editor"], type: "phrase" },
     { words: ["that", "lets", "you"], type: "phrase" },
     { words: ["edit", "videos"], type: "phrase" },
     { words: ["just", "by"], type: "phrase" },
     { words: ["using"], type: "hero" }, // Hero word
     { words: ["prompts"], type: "hero" }  // Hero word - no pause
   ];
  
     // Calculate timing based on kinetic typography rules
   let currentFrame = 0;
   let previousStartFrame = 0;
   const chunkTimings = scriptChunks.map((chunk, index) => {
     let startFrame = currentFrame;
     
     // Calculate duration based on character count (kinetic typography timing rules)
     const totalChars = chunk.words.join("").length;
     let baseDuration;
     if (totalChars <= 3) baseDuration = 8;
     else if (totalChars <= 7) baseDuration = 10;
     else baseDuration = 12;
     
     // Hero words get 20-40 frames (emphasized)
     const duration = chunk.type === "hero" ? 30 : baseDuration;
     const entryDuration = 8; // 8 frames for entry animation (0.25 seconds)
     const holdDuration = 20; // Hold for comfortable reading
     const totalDuration = entryDuration + holdDuration;
     
     // Special case: 'prompts' appears immediately after 'using' starts (no pause)
     if (index === scriptChunks.length - 1 && chunk.words[0] === "prompts" && index > 0) {
       // 'prompts' starts just after 'using' begins its entrance (8 frame offset)
       startFrame = previousStartFrame + 8;
       currentFrame = startFrame; // Don't advance further for this case
     } else {
       currentFrame += duration;
     }
     
     // Track the start frame for next iteration
     if (index === scriptChunks.length - 2) {
       previousStartFrame = startFrame;
     }
     
     return {
       startFrame,
       entryDuration,
       holdDuration,
       totalDuration,
       chunk
     };
   });
  
  // Kinetic typography animation effects (following guidelines)
  const getKineticAnimation = (chunkIndex: number, frame: number, timing: any) => {
    const animationFrame = frame - timing.startFrame;
    const isVisible = frame >= timing.startFrame;
    
    if (!isVisible) return { opacity: 0, transform: 'translateX(-50px)' };
    
    // Entry animation (8 frames)
    if (animationFrame < timing.entryDuration) {
      const progress = animationFrame / timing.entryDuration;
      // Quint-in/out easing
      const eased = progress < 0.5 
        ? 16 * progress * progress * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 5) / 2;
      
      const effects = [
        // Fade in + slide from left (50px horizontal slide)
        () => ({
          opacity: eased,
          transform: `translateX(${50 * (1 - eased)}px)`
        }),
        // Fade in + slide from right
        () => ({
          opacity: eased,
          transform: `translateX(${-50 * (1 - eased)}px)`
        }),
        // Cascade fade in (type-on effect)
        () => ({
          opacity: eased,
          transform: `translateY(${20 * (1 - eased)}px)`
        }),
        // Wipe reveal (scale-to-cut)
        () => ({
          opacity: eased,
          transform: `scaleX(${eased}) translateX(${10 * (1 - eased)}px)`
        }),
        // Elastic rise
        () => ({
          opacity: eased,
          transform: `translateY(${30 * (1 - eased)}px) scale(${0.8 + 0.2 * eased})`
        })
      ];
      
             const effectIndex = chunkIndex % effects.length;
       const effect = effects[effectIndex];
       return effect ? effect() : { opacity: 1, transform: 'none' };
     }
     
     // Hold state (static)
     return { opacity: 1, transform: 'none' };
   };
   
   return (
     <div style={{
       position: 'absolute',
       top: 0,
       left: 0,
       width: '100%',
       height: '100%',
       display: 'flex',
       flexDirection: 'column',
       justifyContent: 'center',
       alignItems: 'center',
       padding: '20px',
       gap: '32px'
     }}>
       {chunkTimings.map((timing, chunkIndex) => {
         const animationStyle = getKineticAnimation(chunkIndex, frame, timing);
         const isHero = timing.chunk.type === "hero";
         
         return (
           <div key={chunkIndex} style={{
             display: 'flex',
             justifyContent: 'center',
             alignItems: 'center',
             gap: '20px',
             flexWrap: 'wrap',
             width: '100%'
           }}>
             {timing.chunk.words.map((word, wordIndex) => (
               <span
                 key={wordIndex}
                 style={{
                   color: 'white',
                   fontSize: '64px', // Same size for all words
                   fontWeight: 'bold',
                   fontFamily: 'Libre Baskerville, serif',
                   fontStyle: 'italic', // Match Levio logo styling
                   textAlign: 'center',
                   lineHeight: '1.0',
                   textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                   background: isHero ? 'linear-gradient(135deg, #7FFF00 0%, #32CD32 100%)' : 'none', // Neon green like Levio icon
                   backgroundClip: isHero ? 'text' : 'unset',
                   WebkitBackgroundClip: isHero ? 'text' : 'unset',
                   WebkitTextFillColor: isHero ? 'transparent' : 'white',
                   ...animationStyle
                 }}
               >
                 {word}
               </span>
             ))}
           </div>
         );
                })}
            </div>
   );
 };

// Text Input Demo Component - exact match to the uploaded image
const TextInputDemo: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
  const fadeIn = 15; // 0.5s fade in
  const typewriterStart = 45; // 1.5s delay before typing starts
  const sendClickTime = 120; // 4s - when send button is clicked
  
  const targetText = "Create an engaging hook";
  
  // Typewriter effect - slower for better visibility
  const getTypedText = () => {
    if (frame < typewriterStart) return "";
    const typingFrame = frame - typewriterStart;
    const charsPerFrame = 3; // Slower typing speed
    const charsToShow = Math.floor(typingFrame / charsPerFrame);
    return targetText.substring(0, Math.min(charsToShow, targetText.length));
  };
  
  const typedText = getTypedText();
  const isComplete = typedText.length === targetText.length;
  const opacity = Math.min(frame / fadeIn, 1);
  
  // Cursor blink effect (only when typing is not complete or just finished)
  const showCursor = (!isComplete || (isComplete && frame < typewriterStart + (targetText.length * 3) + 30)) && Math.floor(frame / 15) % 2 === 0;
  
  // Send button animation
  const getButtonScale = () => {
    if (frame < sendClickTime) return 1;
    const animFrame = frame - sendClickTime;
    if (animFrame < 5) return 1 + (animFrame * 0.02); // Scale up to 1.1
    if (animFrame < 10) return 1.1 - ((animFrame - 5) * 0.02); // Scale back down
    return 1;
  };
  
  const buttonScale = getButtonScale();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF', // White background
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      padding: '40px'
    }}>
      {/* Text Input Container */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        backgroundColor: '#F8F9FA',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #E9ECEF',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Text Input Field */}
        <div style={{
          flex: 1,
          fontSize: '16px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          color: '#495057',
          fontWeight: '400',
          lineHeight: '1.5',
          minHeight: '24px',
          wordWrap: 'break-word',
          wordBreak: 'break-word'
        }}>
          {typedText.length === 0 ? (
            <span style={{
              color: '#ADB5BD',
              fontStyle: 'italic'
            }}>
              Make an engaging hook for the start of the video
            </span>
          ) : (
            <span>
              {typedText}
              {showCursor && (
                <span style={{
                  color: '#495057',
                  animation: 'blink 1s infinite',
                  marginLeft: '1px'
                }}>
                  |
                </span>
              )}
            </span>
          )}
        </div>
        
        {/* Send Button */}
        <button style={{
          backgroundColor: '#4263EB',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(66, 99, 235, 0.2)',
          transition: 'all 0.2s ease',
          alignSelf: 'flex-end',
          flexShrink: 0,
          transform: `scale(${buttonScale})`
        }}>
          {/* Paper plane icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
          Send
        </button>
      </div>
      
      {/* Add blinking cursor keyframe animation */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
     );
 };

// Chat Interface Demo Component - exact match to the uploaded image
const ChatInterfaceDemo: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
  const fadeIn = 15; // 0.5s fade in
  const userMessageAppear = 30; // 1s - when user message appears
  const levioMessageAppear = 75; // 2.5s - when Levio's "Working on it" message appears
  
  const opacity = Math.min(frame / fadeIn, 1);
  const showUserMessage = frame >= userMessageAppear;
  const showLevioMessage = frame >= levioMessageAppear;
  
  // Spinning loading icon
  const spinRotation = (frame * 6) % 360; // 6 degrees per frame for smooth rotation
  
  // Shimmer effect for text
  const shimmerOffset = (frame * 8) % 300; // Creates a moving shimmer effect

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      padding: '40px'
    }}>
      {/* Chat Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '40px'
      }}>
        {/* Levio Avatar */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7FFF00 0%, #32CD32 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          L
        </div>
        
        {/* Chat Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1F2937',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              margin: 0
            }}>
              Chat with Levio
            </h2>
            <span style={{
              backgroundColor: '#4263EB',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '6px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Beta
            </span>
          </div>
          <p style={{
            fontSize: '16px',
            color: '#6B7280',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            margin: 0,
            fontWeight: '400'
          }}>
            Your AI Editing Agent
          </p>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '400px',
        width: '100%'
      }}>
        
        {/* User Message Bubble - Right Aligned */}
        {showUserMessage && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            opacity: Math.min((frame - userMessageAppear) / 15, 1)
          }}>
            <div style={{
              backgroundColor: '#4263EB',
              color: 'white',
              borderRadius: '18px',
              padding: '12px 16px',
              maxWidth: '280px',
              fontSize: '16px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: '500'
            }}>
              Create an engaging hook
            </div>
          </div>
        )}

        {/* Levio Response Bubble - Left Aligned */}
        {showLevioMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            opacity: Math.min((frame - levioMessageAppear) / 15, 1)
          }}>
          {/* Small Avatar */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7FFF00 0%, #32CD32 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            flexShrink: 0
          }}>
            L
          </div>
          
          {/* Message Content */}
          <div style={{
            backgroundColor: '#F3F4F6',
            borderRadius: '18px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Spinning Loading Icon - Much Bigger */}
            <div style={{
              width: '32px',
              height: '32px',
              transform: `rotate(${spinRotation}deg)`
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle 
                  cx="12" 
                  cy="12" 
                  r="8" 
                  stroke="#4263EB" 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="8 8"
                />
                <circle 
                  cx="12" 
                  cy="12" 
                  r="4" 
                  stroke="#7C3AED" 
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
            
            <span style={{
              fontSize: '18px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: '600',
              backgroundImage: `linear-gradient(90deg, 
                #6B7280 ${shimmerOffset - 100}px, 
                #4263EB ${shimmerOffset - 50}px, 
                #7C3AED ${shimmerOffset}px, 
                #4263EB ${shimmerOffset + 50}px, 
                #6B7280 ${shimmerOffset + 100}px)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '300px 100%',
              backgroundRepeat: 'no-repeat'
            }}>
              Working on it
            </span>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
};

// Processing UI Demo Component - exact match to the uploaded image
const ProcessingUIDemo: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
  // Animation timing for the progress bars
  const fadeIn = 15; // 0.5s fade in
  
  // Match the exact state in the image - only upload is active
  const uploadProgress = 27; // Fixed at 27% like in image
  const subtitlesProgress = 0; // Always 0% - inactive
  const visualsProgress = 0; // Always 0% - inactive
  
  const opacity = Math.min(frame / fadeIn, 1);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF', // White background like the image
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      padding: '40px'
    }}>
      {/* Main heading */}
      <h1 style={{
        fontSize: '36px',
        fontWeight: '600',
        color: '#1F2937',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        marginBottom: '12px',
        textAlign: 'center',
        lineHeight: '1.2'
      }}>
        We're processing your video
      </h1>
      
      {/* Subheading */}
      <p style={{
        fontSize: '18px',
        color: '#6B7280',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        marginBottom: '60px',
        textAlign: 'center',
        fontWeight: '400'
      }}>
        This usually takes a few minutes
      </p>

      {/* Progress items container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        
        {/* Uploading your file */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
                     {/* Upload icon */}
           <div style={{
             width: '24px',
             height: '24px',
             color: '#3B82F6', // Always blue since it's active
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#1F2937',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              minWidth: '140px'
            }}>
              Uploading your file
            </span>
            
            {/* Progress bar */}
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '0 16px'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#3B82F6',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#3B82F6',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              minWidth: '40px'
            }}>
              {uploadProgress}%
            </span>
          </div>
        </div>

        {/* Generating subtitles */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
                     {/* Subtitles icon */}
           <div style={{
             width: '24px',
             height: '24px',
             color: '#9CA3AF', // Always gray since it's inactive
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V6H20V18M6,10H8V12H6V10M6,14H8V16H6V14M10,14H18V16H10V14M10,10H18V12H10V10Z" />
            </svg>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#1F2937',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              minWidth: '140px'
            }}>
              Generating subtitles
            </span>
            
            {/* Progress bar */}
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '0 16px'
            }}>
                             <div style={{
                 width: `${subtitlesProgress}%`,
                 height: '100%',
                 backgroundColor: '#E5E7EB', // Always gray since inactive
                 borderRadius: '4px',
                 transition: 'width 0.3s ease'
               }} />
             </div>
             
             <span style={{
               fontSize: '16px',
               fontWeight: '600',
               color: '#9CA3AF', // Always gray since inactive
               fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
               minWidth: '40px'
             }}>
               {subtitlesProgress}%
             </span>
          </div>
        </div>

        {/* Adding visuals */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
                     {/* Visuals icon */}
           <div style={{
             width: '24px',
             height: '24px',
             color: '#9CA3AF', // Always gray since it's inactive
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
            </svg>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#1F2937',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              minWidth: '140px'
            }}>
              Adding visuals
            </span>
            
            {/* Progress bar */}
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '0 16px'
            }}>
                             <div style={{
                 width: `${visualsProgress}%`,
                 height: '100%',
                 backgroundColor: '#E5E7EB', // Always gray since inactive
                 borderRadius: '4px',
                 transition: 'width 0.3s ease'
               }} />
             </div>
             
             <span style={{
               fontSize: '16px',
               fontWeight: '600',
               color: '#9CA3AF', // Always gray since inactive
               fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
               minWidth: '40px'
             }}>
               {visualsProgress}%
             </span>
          </div>
        </div>
      </div>
    </div>
  );
 };

// Upload UI Demo Component
const UploadUIDemo: React.FC<{
  frame: number;
  width: number;
  height: number;
}> = ({ frame, width, height }) => {
  // Animation phases
  const fadeIn = 15; // 0.5s fade in
  const showUploadBox = 30; // 1s show upload box
  const tapAnimation = 45; // 1.5s tap animation
  const showFileSelector = 75; // 2.5s show file selector
  const selectFiles = 105; // 3.5s select files
  const uploadProgress = 150; // 5s upload progress

  const opacity = Math.min(frame / fadeIn, 1);
  
  // Upload box scale animation on tap
  const tapFrame = Math.max(0, frame - tapAnimation);
  const tapScale = tapFrame < 15 ? 
    1 + Math.sin(tapFrame * 0.4) * 0.05 : 1;

  // File selector visibility
  const showFiles = frame >= showFileSelector;
  const filesOpacity = showFiles ? Math.min((frame - showFileSelector) / 15, 1) : 0;

  // Upload progress
  const uploading = frame >= uploadProgress;
  const uploadPercent = uploading ? 
    Math.min((frame - uploadProgress) / 30, 1) * 100 : 0;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      padding: '20px'
    }}>
      {/* iPhone-style Upload Box */}
      <div style={{
        width: '320px',
        height: '200px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        border: '3px dashed rgba(255, 255, 255, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `scale(${tapScale})`,
        transition: 'transform 0.1s ease',
        backdropFilter: 'blur(10px)',
        cursor: 'pointer',
        marginBottom: '30px'
      }}>
        {/* Upload Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(127, 255, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            border: '3px solid #7FFF00',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(-45deg) translateY(-3px)'
          }} />
        </div>
        
        <span style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          fontFamily: 'Libre Baskerville, serif',
          textAlign: 'center'
        }}>
          Tap to upload videos
        </span>
      </div>

      {/* File Selector (iPhone style) */}
      {showFiles && (
        <div style={{
          width: '340px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '20px',
          padding: '20px',
          opacity: filesOpacity,
          transform: `translateY(${(1 - filesOpacity) * 30}px)`
        }}>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Camera Roll
          </div>
          
          {/* Video thumbnails */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '15px'
          }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                aspectRatio: '16/9',
                backgroundColor: '#333',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: frame >= selectFiles + i * 5 ? '2px solid #7FFF00' : '2px solid transparent',
                opacity: frame >= selectFiles + i * 5 ? 1 : 0.6
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderLeft: '8px solid white',
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent'
                }} />
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div style={{
              backgroundColor: '#333',
              borderRadius: '10px',
              padding: '10px',
              marginTop: '15px'
            }}>
              <div style={{
                color: 'white',
                fontSize: '14px',
                marginBottom: '8px'
              }}>
                Uploading 3 videos... {Math.round(uploadPercent)}%
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#555',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7FFF00, #32CD32)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tap indicator (animated circle) */}
      {frame >= tapAnimation && frame < showFileSelector && (
        <div style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          animation: 'pulse 0.6s ease-in-out',
          opacity: 0.8
        }} />
      )}
    </div>
  );
}; 