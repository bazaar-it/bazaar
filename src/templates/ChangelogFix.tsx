/**
 * Changelog Fix Template
 * Clean and professional bug fix announcements
 */

import React from 'react';
import { 
  AbsoluteFill, 
  interpolate, 
  useCurrentFrame, 
  spring,
  Easing
} from 'remotion';

interface ChangelogFixProps {
  title?: string;
  issueNumber?: string;
  description?: string;
  impact?: string;
  author?: {
    name: string;
    avatar?: string;
  };
  stats?: {
    filesChanged: number;
    linesChanged: number;
  };
  brandColor?: string;
}

export default function ChangelogFix({
  title = "Critical Bug Fix",
  issueNumber = "#1234",
  description = "Fixed an issue that was affecting performance",
  impact = "Improves stability by 50%",
  author = { name: "developer" },
  stats = { filesChanged: 5, linesChanged: 127 },
  brandColor = "#EF4444",
}: ChangelogFixProps) {
  const frame = useCurrentFrame();
  const fps = 30;
  
  // Check mark animation
  const checkScale = spring({
    frame: frame - 10,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });
  
  // Title slide in
  const titleX = interpolate(
    frame,
    [15, 35],
    [100, 0],
    {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
  
  const titleOpacity = interpolate(
    frame,
    [15, 25],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Stats counter animation
  const statsProgress = interpolate(
    frame,
    [40, 70],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Success glow pulse
  const glowOpacity = interpolate(
    frame % 45,
    [0, 22, 45],
    [0.3, 0.6, 0.3],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${hexToRgba('#ffffff', 0.05)} 1px, transparent 1px),
            linear-gradient(90deg, ${hexToRgba('#ffffff', 0.05)} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: `translateY(${(frame * 0.5) % 50}px)`,
        }}
      />
      
      {/* Success glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 600,
          height: 600,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${hexToRgba('#10B981', glowOpacity)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      
      {/* Fixed badge with checkmark */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: '50%',
          transform: `translateX(-50%) scale(${checkScale})`,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: hexToRgba('#10B981', 0.2),
            border: `3px solid #10B981`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 60,
          }}
        >
          ✓
        </div>
      </div>
      
      {/* Issue badge */}
      <div
        style={{
          position: 'absolute',
          top: 340,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: hexToRgba(brandColor, 0.2),
            border: `1px solid ${brandColor}`,
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 16,
            color: brandColor,
            fontWeight: 600,
          }}
        >
          🐛 FIXED {issueNumber}
        </div>
      </div>
      
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 400,
          left: 0,
          right: 0,
          textAlign: 'center',
          transform: `translateX(${titleX}px)`,
          opacity: titleOpacity,
        }}
      >
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
      </div>
      
      {/* Description */}
      <div
        style={{
          position: 'absolute',
          top: 480,
          left: '15%',
          right: '15%',
          textAlign: 'center',
          opacity: interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <p
          style={{
            fontSize: 24,
            color: '#9CA3AF',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
      
      {/* Stats boxes */}
      <div
        style={{
          position: 'absolute',
          top: 580,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            backgroundColor: hexToRgba('#3B82F6', 0.1),
            border: `1px solid ${hexToRgba('#3B82F6', 0.3)}`,
            borderRadius: 12,
            padding: '20px 40px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: '#3B82F6' }}>
            {Math.floor(stats.filesChanged * statsProgress)}
          </div>
          <div style={{ fontSize: 16, color: '#9CA3AF', marginTop: 5 }}>
            Files Fixed
          </div>
        </div>
        
        <div
          style={{
            backgroundColor: hexToRgba('#10B981', 0.1),
            border: `1px solid ${hexToRgba('#10B981', 0.3)}`,
            borderRadius: 12,
            padding: '20px 40px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: '#10B981' }}>
            {Math.floor(stats.linesChanged * statsProgress)}
          </div>
          <div style={{ fontSize: 16, color: '#9CA3AF', marginTop: 5 }}>
            Lines Updated
          </div>
        </div>
      </div>
      
      {/* Impact statement */}
      {impact && (
        <div
          style={{
            position: 'absolute',
            top: 750,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              display: 'inline-block',
              backgroundColor: hexToRgba('#10B981', 0.2),
              border: `2px solid #10B981`,
              borderRadius: 30,
              padding: '12px 32px',
              fontSize: 20,
              fontWeight: 600,
              color: '#10B981',
            }}
          >
            ⚡ {impact}
          </div>
        </div>
      )}
      
      {/* Author */}
      {author && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' }),
            fontSize: 18,
            color: '#6B7280',
          }}
        >
          Fixed by @{author.name}
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
  id: 'changelog-fix',
  name: 'Changelog Fix',
  duration: 120, // 4 seconds at 30fps
  previewFrame: 60,
  getCode: () => {
    return `
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, Easing } from 'remotion';

// Changelog Fix Template Code
${ChangelogFix.toString()}

export default ChangelogFix;
    `.trim();
  },
};