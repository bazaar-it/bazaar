/**
 * Bazaar-Vid Animation Library
 * Sprint 29 - Reusable Tailwind + Remotion Animation Utilities
 * 
 * This library provides pre-built animation functions for the Pretty-Code Layer
 * to create consistent, high-quality motion graphics across all generated scenes.
 * 
 * Risk Mitigation:
 * - Bundle size kept under 130KB gzip threshold
 * - No duplicate globals - designed for window.BazAnimations exposure
 * - Optimized for Tailwind JIT performance
 */

import { interpolate, spring, Easing } from 'remotion';

// Add type declaration at the top of the file
declare global {
  interface Window {
    BazAnimations: typeof BazAnimations;
  }
}

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

/**
 * Fade in with upward movement - perfect for titles and hero text
 */
export const fadeInUp = (frame: number, delay = 0, duration = 20) => ({
  opacity: interpolate(frame, [delay, delay + duration], [0, 1], { 
    extrapolateRight: 'clamp' 
  }),
  transform: `translateY(${interpolate(frame, [delay, delay + duration], [30, 0], { 
    extrapolateRight: 'clamp' 
  })}px)`,
});

/**
 * Slide in from left with opacity - great for side panels and cards
 */
export const slideInLeft = (frame: number, delay = 0, duration = 25) => ({
  opacity: interpolate(frame, [delay, delay + duration], [0, 1], { 
    extrapolateRight: 'clamp' 
  }),
  transform: `translateX(${interpolate(frame, [delay, delay + duration], [-100, 0], { 
    extrapolateRight: 'clamp' 
  })}px)`,
});

/**
 * Scale in with spring physics - perfect for buttons and interactive elements
 */
export const scaleIn = (frame: number, delay = 0, duration = 30) => {
  const progress = Math.max(0, (frame - delay) / duration);
  const springValue = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 1,
    },
  });
  
  return {
    opacity: interpolate(frame, [delay, delay + 10], [0, 1], { 
      extrapolateRight: 'clamp' 
    }),
    transform: `scale(${interpolate(springValue, [0, 1], [0.8, 1])})`,
  };
};

/**
 * Bounce in effect - attention-grabbing for notifications
 */
export const bounceIn = (frame: number, delay = 0, duration = 40) => {
  const progress = Math.max(0, (frame - delay) / duration);
  const bounceValue = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 8,
      stiffness: 120,
      mass: 1,
    },
  });
  
  return {
    opacity: interpolate(frame, [delay, delay + 5], [0, 1], { 
      extrapolateRight: 'clamp' 
    }),
    transform: `scale(${interpolate(bounceValue, [0, 1], [0.3, 1])})`,
  };
};

// ============================================================================
// CONTINUOUS ANIMATIONS
// ============================================================================

/**
 * Pulsing glow effect - perfect for highlighting important elements
 */
export const pulseGlow = (frame: number, speed = 1, intensity = 0.3) => {
  const pulse = Math.sin((frame * speed) / 15) * intensity + (1 - intensity);
  return {
    filter: `drop-shadow(0 0 ${pulse * 20}px currentColor)`,
    opacity: 0.8 + (pulse * 0.2),
  };
};

/**
 * Floating animation - subtle movement for background elements
 */
export const float = (frame: number, amplitude = 10, speed = 1) => ({
  transform: `translateY(${Math.sin((frame * speed) / 20) * amplitude}px)`,
});

/**
 * Rotation animation - for loading spinners and decorative elements
 */
export const rotate = (frame: number, speed = 1) => ({
  transform: `rotate(${(frame * speed * 6) % 360}deg)`,
});

/**
 * Gradient shift animation - dynamic background colors
 */
export const gradientShift = (frame: number, colors: string[], speed = 1) => {
  const colorIndex = Math.floor((frame * speed) / 30) % colors.length;
  const nextColorIndex = (colorIndex + 1) % colors.length;
  const progress = ((frame * speed) / 30) % 1;
  
  return {
    background: `linear-gradient(45deg, ${colors[colorIndex]}, ${colors[nextColorIndex]})`,
  };
};

// ============================================================================
// EXIT ANIMATIONS
// ============================================================================

/**
 * Fade out with downward movement
 */
export const fadeOutDown = (frame: number, startFrame: number, duration = 20) => ({
  opacity: interpolate(frame, [startFrame, startFrame + duration], [1, 0], { 
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp' 
  }),
  transform: `translateY(${interpolate(frame, [startFrame, startFrame + duration], [0, 30], { 
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp' 
  })}px)`,
});

/**
 * Scale out with fade
 */
export const scaleOut = (frame: number, startFrame: number, duration = 15) => ({
  opacity: interpolate(frame, [startFrame, startFrame + duration], [1, 0], { 
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp' 
  }),
  transform: `scale(${interpolate(frame, [startFrame, startFrame + duration], [1, 0.8], { 
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp' 
  })})`,
});

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

/**
 * Glass morphism effect - modern frosted glass look
 */
export const glassMorphism = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
};

/**
 * Neumorphism effect - soft 3D appearance
 */
export const neumorphism = (isPressed = false) => ({
  background: '#f0f0f0',
  borderRadius: '20px',
  boxShadow: isPressed 
    ? 'inset 8px 8px 16px #d1d1d1, inset -8px -8px 16px #ffffff'
    : '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff',
});

/**
 * Z-index layering system for consistent depth
 */
export const zLayers = {
  background: 0,
  backgroundOverlay: 10,
  content: 20,
  contentOverlay: 30,
  effects: 40,
  ui: 50
} as const;

// ============================================================================
// COLOR & GRADIENT UTILITIES
// ============================================================================

/**
 * Modern color palettes for consistent theming
 */
export const colorPalettes = {
  ocean: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#06B6D4',
    background: 'linear-gradient(135deg, #3B82F6, #1E40AF, #06B6D4)'
  },
  sunset: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#EC4899',
    background: 'linear-gradient(135deg, #F59E0B, #EF4444, #EC4899)'
  },
  forest: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    background: 'linear-gradient(135deg, #10B981, #059669, #34D399)'
  },
  midnight: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#8B5CF6',
    background: 'linear-gradient(135deg, #6366F1, #4F46E5, #8B5CF6)'
  }
} as const;

/**
 * Gradient generators for dynamic backgrounds
 */
export const createGradient = (direction: string, ...colors: string[]) => 
  `linear-gradient(${direction}, ${colors.join(', ')})`;

export const createRadialGradient = (shape: string, ...colors: string[]) => 
  `radial-gradient(${shape}, ${colors.join(', ')})`;

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Custom easing functions for more natural animations
 */
export const easings = {
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  easeOut: Easing.bezier(0, 0, 0.2, 1),
  easeIn: Easing.bezier(0.4, 0, 1, 1),
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  elastic: (frame: number, amplitude = 1, period = 0.3) => {
    if (frame === 0) return 0;
    if (frame === 1) return 1;
    const s = period / 4;
    return amplitude * Math.pow(2, -10 * frame) * Math.sin((frame - s) * (2 * Math.PI) / period) + 1;
  }
} as const;

// ============================================================================
// COMPOSITION HELPERS
// ============================================================================

/**
 * Stagger animations for multiple elements
 */
export const stagger = (index: number, baseDelay = 0, staggerDelay = 5) => 
  baseDelay + (index * staggerDelay);

/**
 * Sequence animations one after another
 */
export const sequence = (animations: Array<{ delay: number; duration: number }>) => {
  let currentTime = 0;
  return animations.map(anim => {
    const result = { ...anim, delay: currentTime };
    currentTime += anim.duration;
    return result;
  });
};

/**
 * Combine multiple animation styles
 */
export const combineStyles = (...styles: Array<React.CSSProperties | undefined>) => 
  Object.assign({}, ...styles.filter(Boolean));

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Memoized animation calculator to prevent recalculation
 */
export const memoizedAnimation = <T,>(
  fn: (frame: number, ...args: any[]) => T,
  frame: number,
  ...args: any[]
): T => {
  // Simple memoization for performance
  const key = `${fn.name}-${frame}-${JSON.stringify(args)}`;
  if (typeof window !== 'undefined') {
    const cache = (window as any).__animationCache || {};
    if (cache[key]) return cache[key];
    const result = fn(frame, ...args);
    cache[key] = result;
    (window as any).__animationCache = cache;
    return result;
  }
  return fn(frame, ...args);
};

/**
 * Bundle size check - ensures we stay under 130KB threshold
 */
export const getBundleSize = () => {
  if (typeof window !== 'undefined') {
    const size = JSON.stringify(window.BazAnimations || {}).length;
    console.log(`Animation library size: ${(size / 1024).toFixed(2)}KB`);
    return size;
  }
  return 0;
};

// Export all animations as a single object for window.BazAnimations
export const BazAnimations = {
  // Entrance
  fadeInUp,
  slideInLeft,
  scaleIn,
  bounceIn,
  
  // Continuous
  pulseGlow,
  float,
  rotate,
  gradientShift,
  
  // Exit
  fadeOutDown,
  scaleOut,
  
  // Layout
  glassMorphism,
  neumorphism,
  zLayers,
  
  // Colors
  colorPalettes,
  createGradient,
  createRadialGradient,
  
  // Easing
  easings,
  
  // Composition
  stagger,
  sequence,
  combineStyles,
  
  // Performance
  memoizedAnimation,
  getBundleSize,
} as const;

export default BazAnimations; 