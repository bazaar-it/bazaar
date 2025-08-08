/**
 * Changelog Feature Template
 * Beautiful motion graphics for new feature announcements
 */

import React from 'react';
import { 
  AbsoluteFill, 
  interpolate, 
  useCurrentFrame, 
  spring, 
  Sequence,
  Img,
  staticFile 
} from 'remotion';

interface ChangelogFeatureProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  author?: {
    name: string;
    avatar?: string;
  };
  brandColor?: string;
  logo?: string;
}

export default function ChangelogFeature({
  title = "Amazing New Feature",
  subtitle = "Feature Update • v2.0.0",
  description = "We've added something incredible to make your experience even better",
  features = ["✨ Lightning fast", "🎨 Beautiful design", "🚀 Better performance"],
  author = { name: "bazaar-team" },
  brandColor = "#10B981",
  logo,
}: ChangelogFeatureProps) {
  const frame = useCurrentFrame();
  const fps = 30;
  
  // Main title animation
  const titleY = spring({
    frame,
    fps,
    from: -50,
    to: 0,
    durationInFrames: 25,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  
  const titleOpacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Description fade in
  const descOpacity = interpolate(
    frame,
    [20, 35],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Feature items stagger
  const getFeatureAnimation = (index: number) => {
    const delay = 35 + (index * 8);
    return {
      x: spring({
        frame: frame - delay,
        fps,
        from: -100,
        to: 0,
        durationInFrames: 20,
      }),
      opacity: interpolate(
        frame,
        [delay, delay + 15],
        [0, 1],
        { extrapolateRight: 'clamp' }
      ),
    };
  };
  
  // Pulse animation for accent elements
  const pulse = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.05, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      {/* Animated gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(
            circle at ${50 + Math.sin(frame * 0.02) * 10}% ${50 + Math.cos(frame * 0.02) * 10}%,
            ${hexToRgba(brandColor, 0.3)} 0%,
            ${hexToRgba(brandColor, 0.1)} 40%,
            transparent 70%
          )`,
        }}
      />
      
      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            backgroundColor: brandColor,
            borderRadius: '50%',
            opacity: 0.6,
            left: `${20 + i * 15}%`,
            top: `${30 + Math.sin((frame + i * 20) * 0.05) * 20}%`,
            transform: `scale(${pulse})`,
          }}
        />
      ))}
      
      {/* Logo */}
      {logo && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 80,
            opacity: 0.9,
          }}
        >
          <div style={{ height: 50 }}>
            {/* Logo would be rendered here */}
          </div>
        </div>
      )}
      
      {/* Badge */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: '50%',
          transform: `translateX(-50%) translateY(${titleY}px) scale(${pulse})`,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: hexToRgba(brandColor, 0.2),
            border: `2px solid ${brandColor}`,
            borderRadius: 50,
            padding: '8px 24px',
            fontSize: 18,
            fontWeight: 600,
            color: brandColor,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          ✨ NEW FEATURE
        </div>
      </div>
      
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 280,
          left: 0,
          right: 0,
          textAlign: 'center',
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.1,
            textShadow: `0 0 40px ${hexToRgba(brandColor, 0.5)}`,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            fontSize: 24,
            color: '#9CA3AF',
            marginTop: 15,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      </div>
      
      {/* Description */}
      <div
        style={{
          position: 'absolute',
          top: 440,
          left: '10%',
          right: '10%',
          textAlign: 'center',
          opacity: descOpacity,
        }}
      >
        <p
          style={{
            fontSize: 28,
            color: '#D1D5DB',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
      
      {/* Feature list */}
      <div
        style={{
          position: 'absolute',
          top: 580,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 30,
        }}
      >
        {features.map((feature, index) => {
          const anim = getFeatureAnimation(index);
          return (
            <div
              key={index}
              style={{
                backgroundColor: hexToRgba(brandColor, 0.1),
                border: `1px solid ${hexToRgba(brandColor, 0.3)}`,
                borderRadius: 12,
                padding: '16px 28px',
                fontSize: 22,
                color: '#FFFFFF',
                transform: `translateX(${anim.x}px)`,
                opacity: anim.opacity,
              }}
            >
              {feature}
            </div>
          );
        })}
      </div>
      
      {/* Author */}
      {author && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 15,
            opacity: interpolate(
              frame,
              [80, 100],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        >
          {author.avatar && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: brandColor,
                border: `2px solid ${hexToRgba(brandColor, 0.5)}`,
              }}
            />
          )}
          <div style={{ fontSize: 20, color: '#9CA3AF' }}>
            by @{author.name}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Template configuration for registry
export const templateConfig = {
  id: 'changelog-feature',
  name: 'Changelog Feature',
  duration: 150, // 5 seconds at 30fps
  previewFrame: 75,
  getCode: () => {
    return `
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring } from 'remotion';

// Changelog Feature Template Code
${ChangelogFeature.toString()}

export default ChangelogFeature;
    `.trim();
  },
};