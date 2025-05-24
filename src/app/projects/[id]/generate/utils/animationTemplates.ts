export interface AnimationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'expand' | 'rotate' | 'fade' | 'slide' | 'bounce' | 'explode' | 'reveal' | 'text';
  defaultProps: Record<string, any>;
  codeTemplate: string;
  exampleUsage: string;
}

export const animationTemplates: Record<string, AnimationTemplate> = {
  'bubble-expand-explode': {
    id: 'bubble-expand-explode',
    name: 'Bubble Expand & Explode',
    description: 'Bubble that expands smoothly then explodes with particles',
    category: 'expand',
    defaultProps: {
      primaryColor: 'rgba(255,87,51,0.5)',
      secondaryColor: 'rgba(255,255,255,0.3)',
      maxScale: 2.5,
      explosionFrame: 30
    },
    codeTemplate: `
const bubbleScale = interpolate(frame, [0, explosionFrame], [0.1, maxScale], {
  extrapolateRight: 'clamp'
});

const isExploding = frame > explosionFrame;
const finalScale = isExploding ? 
  interpolate(frame, [explosionFrame, explosionFrame + 15], [maxScale, 0], { 
    extrapolateRight: 'clamp' 
  }) : bubbleScale;

const glowIntensity = interpolate(frame, [0, explosionFrame], [0, 20]);`,
    exampleUsage: 'Perfect for bubble animations, expanding logos, or explosion effects'
  },

  'logo-reveal': {
    id: 'logo-reveal',
    name: 'Logo Reveal',
    description: 'Logo appears with scaling and fade effect',
    category: 'reveal',
    defaultProps: {
      logoText: 'LOGO',
      revealFrame: 20,
      primaryColor: '#ffffff',
      scale: 1.2
    },
    codeTemplate: `
const opacity = interpolate(frame, [0, revealFrame], [0, 1], {
  extrapolateRight: 'clamp'
});

const scale = interpolate(frame, [0, revealFrame], [0.8, 1], {
  extrapolateRight: 'clamp'
});

const letterSpacing = interpolate(frame, [0, revealFrame], [10, 0]);`,
    exampleUsage: 'Great for brand reveals, title cards, or logo animations'
  },

  'slide-in': {
    id: 'slide-in',
    name: 'Slide In',
    description: 'Element slides in from specified direction',
    category: 'slide',
    defaultProps: {
      direction: 'left',
      distance: 200,
      duration: 30,
      easing: 'ease-out'
    },
    codeTemplate: `
const directions = {
  left: [-distance, 0],
  right: [distance, 0],
  top: [0, -distance],
  bottom: [0, distance]
};

const [startX, startY] = directions[direction] || directions.left;
const translateX = interpolate(frame, [0, duration], [startX, 0]);
const translateY = interpolate(frame, [0, duration], [startY, 0]);`,
    exampleUsage: 'Perfect for text reveals, image entrances, or UI element animations'
  },

  'rotate-reveal': {
    id: 'rotate-reveal',
    name: 'Rotate Reveal',
    description: 'Element rotates while fading in',
    category: 'rotate',
    defaultProps: {
      rotationDegrees: 360,
      duration: 45,
      direction: 'clockwise'
    },
    codeTemplate: `
const rotation = interpolate(frame, [0, duration], [0, rotationDegrees * (direction === 'clockwise' ? 1 : -1)]);
const opacity = interpolate(frame, [0, duration * 0.3], [0, 1]);
const scale = interpolate(frame, [0, duration * 0.5], [0.5, 1]);`,
    exampleUsage: 'Great for icons, badges, or decorative elements'
  },

  'bounce-in': {
    id: 'bounce-in',
    name: 'Bounce In',
    description: 'Element bounces in with spring physics',
    category: 'bounce',
    defaultProps: {
      bounceHeight: 50,
      duration: 30,
      damping: 10,
      stiffness: 100
    },
    codeTemplate: `
const springValue = spring({
  frame,
  fps,
  config: { damping, stiffness }
});

const translateY = interpolate(springValue, [0, 1], [bounceHeight, 0]);
const scale = interpolate(springValue, [0, 1], [0.8, 1]);`,
    exampleUsage: 'Perfect for buttons, notifications, or playful UI elements'
  },

  'text-typewriter': {
    id: 'text-typewriter',
    name: 'Typewriter Text',
    description: 'Text appears character by character',
    category: 'text',
    defaultProps: {
      text: 'Hello World',
      speed: 3,
      cursorVisible: true
    },
    codeTemplate: `
const charsToShow = Math.floor(frame / speed);
const visibleText = text.slice(0, charsToShow);
const showCursor = cursorVisible && Math.floor(frame / 15) % 2 === 0;`,
    exampleUsage: 'Great for code demos, storytelling, or dramatic text reveals'
  },

  'fade-in-out': {
    id: 'fade-in-out',
    name: 'Fade In/Out',
    description: 'Simple fade in and out animation',
    category: 'fade',
    defaultProps: {
      fadeInDuration: 15,
      holdDuration: 15,
      fadeOutDuration: 15
    },
    codeTemplate: `
const fadeInEnd = fadeInDuration;
const holdEnd = fadeInEnd + holdDuration;
const fadeOutEnd = holdEnd + fadeOutDuration;

let opacity = 0;
if (frame <= fadeInEnd) {
  opacity = interpolate(frame, [0, fadeInEnd], [0, 1]);
} else if (frame <= holdEnd) {
  opacity = 1;
} else if (frame <= fadeOutEnd) {
  opacity = interpolate(frame, [holdEnd, fadeOutEnd], [1, 0]);
}`,
    exampleUsage: 'Perfect for transitions, overlays, or simple reveals'
  }
};

export function getTemplateByCategory(category: AnimationTemplate['category']): AnimationTemplate[] {
  return Object.values(animationTemplates).filter(template => template.category === category);
}

export function getTemplateById(id: string): AnimationTemplate | undefined {
  return animationTemplates[id];
}

export function getAllTemplates(): AnimationTemplate[] {
  return Object.values(animationTemplates);
}

// Helper function to inject template examples into LLM prompts
export function getTemplateExamplesForPrompt(maxExamples = 3): string {
  const examples = getAllTemplates().slice(0, maxExamples);
  
  return examples.map(template => `
**${template.name}** (${template.category}):
${template.description}
Default props: ${JSON.stringify(template.defaultProps, null, 2)}
Usage: ${template.exampleUsage}
`).join('\n');
} 