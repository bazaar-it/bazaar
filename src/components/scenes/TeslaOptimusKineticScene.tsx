import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, interpolate, spring } from 'remotion';

interface ScriptElement {
  type: 'rsvp' | 'phrase';
  content: string;
  words?: string[];
  duration: number;
  emphasis?: boolean;
  heroWord?: string;
  effect: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'cascade' | 'typewriter' | 'elasticRise' | 'trackExpand' | 'scaleUp' | 'blurIn';
  pause?: number;
}

const scriptElements: ScriptElement[] = [
  {
    type: 'rsvp',
    content: 'Tesla Optimus.',
    duration: 45,
    emphasis: true,
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'Not a machine. A teammate.',
    words: ['Not', 'a', 'machine.', 'A', 'teammate.'],
    duration: 50,
    heroWord: 'teammate.',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Built to lift, carry, move — and learn.',
    words: ['Built', 'to', 'lift,', 'carry,', 'move', '—', 'and', 'learn.'],
    duration: 60,
    heroWord: 'learn.',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: '12 degrees of freedom.',
    words: ['12', 'degrees', 'of', 'freedom.'],
    duration: 45,
    heroWord: '12',
    effect: 'slideUp'
  },
  {
    type: 'rsvp',
    content: 'Human-level dexterity.',
    duration: 40,
    emphasis: true,
    effect: 'scaleUp'
  },
  {
    type: 'phrase',
    content: 'Vision-powered. AI-trained. Safety-first.',
    words: ['Vision-powered.', 'AI-trained.', 'Safety-first.'],
    duration: 55,
    heroWord: 'AI-trained.',
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'It walks like us.',
    words: ['It', 'walks', 'like', 'us.'],
    duration: 35,
    effect: 'fadeIn'
  },
  {
    type: 'phrase',
    content: 'Works with us.',
    words: ['Works', 'with', 'us.'],
    duration: 30,
    effect: 'slideRight'
  },
  {
    type: 'phrase',
    content: 'Learns from us.',
    words: ['Learns', 'from', 'us.'],
    duration: 35,
    heroWord: 'Learns',
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'Clean floors. Move boxes. Fetch your tools.',
    words: ['Clean', 'floors.', 'Move', 'boxes.', 'Fetch', 'your', 'tools.'],
    duration: 60,
    heroWord: 'Fetch',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Or just hold a conversation.',
    words: ['Or', 'just', 'hold', 'a', 'conversation.'],
    duration: 45,
    heroWord: 'conversation.',
    effect: 'elasticRise'
  },
  {
    type: 'rsvp',
    content: '24/7 endurance.',
    duration: 35,
    emphasis: true,
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'No lunch breaks. No burnout.',
    words: ['No', 'lunch', 'breaks.', 'No', 'burnout.'],
    duration: 45,
    heroWord: 'burnout.',
    effect: 'slideUp'
  },
  {
    type: 'phrase',
    content: 'Synced with your Tesla ecosystem.',
    words: ['Synced', 'with', 'your', 'Tesla', 'ecosystem.'],
    duration: 50,
    heroWord: 'ecosystem.',
    effect: 'slideDown'
  },
  {
    type: 'phrase',
    content: 'Command from your phone.',
    words: ['Command', 'from', 'your', 'phone.'],
    duration: 35,
    effect: 'fadeIn'
  },
  {
    type: 'phrase',
    content: 'From your voice.',
    words: ['From', 'your', 'voice.'],
    duration: 30,
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'From anywhere.',
    words: ['From', 'anywhere.'],
    duration: 30,
    heroWord: 'anywhere.',
    effect: 'scaleUp'
  },
  {
    type: 'phrase',
    content: 'Updates make it smarter.',
    words: ['Updates', 'make', 'it', 'smarter.'],
    duration: 40,
    heroWord: 'smarter.',
    effect: 'cascade'
  },
  {
    type: 'rsvp',
    content: 'Every day.',
    duration: 30,
    emphasis: true,
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'This isn\'t sci-fi.',
    words: ['This', 'isn\'t', 'sci-fi.'],
    duration: 35,
    heroWord: 'sci-fi.',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'It\'s the next step in human progress.',
    words: ['It\'s', 'the', 'next', 'step', 'in', 'human', 'progress.'],
    duration: 60,
    emphasis: true,
    heroWord: 'progress.',
    effect: 'trackExpand'
  },
  {
    type: 'rsvp',
    content: 'Tesla Optimus.',
    duration: 45,
    emphasis: true,
    effect: 'slideUp',
    pause: 20
  },
  {
    type: 'phrase',
    content: 'Let the future lend a hand.',
    words: ['Let', 'the', 'future', 'lend', 'a', 'hand.'],
    duration: 55,
    emphasis: true,
    heroWord: 'future',
    effect: 'slideDown'
  }
];

// Calculate cumulative timing
let cumulativeTime = 0;
const sequenceTimings = scriptElements.map((element) => {
  const startTime = cumulativeTime;
  cumulativeTime += element.duration + (element.pause || 0);
  return { startTime, duration: element.duration, pause: element.pause || 0 };
});

const AnimatedGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Animated diagonal gradient shifting between specified hues
  const progress = frame / durationInFrames;
  const hue1 = interpolate(progress, [0, 0.5, 1], [260, 320, 260], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hue2 = interpolate(progress, [0, 0.5, 1], [15, 45, 15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const angle = interpolate(frame, [0, durationInFrames], [45, 135], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, 
          hsl(${hue1}, 85%, 60%) 0%, 
          hsl(${hue2}, 75%, 55%) 100%)`,
      }}
    />
  );
};

const OptimusRSVPAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const relativeFrame = frame;
  
  // 5% safe margin
  const safeMargin = 0.05;
  const safeWidth = width * (1 - 2 * safeMargin);
  const safeHeight = height * (1 - 2 * safeMargin);
  
  // Font size logic: updated context guidelines
  const chars = element.content.length;
  const baseSize = 48; // 3 rem base for RSVP
  const charMultiplier = Math.min(Math.max(80 / chars, 0.4), 0.8);
  const fontSize = Math.max(baseSize * charMultiplier, 24); // minimum 24px
  
  // For RSVP in vertical format, position slightly higher
  const yOffset = -height * 0.1;
  
  if (relativeFrame < 0 || relativeFrame >= element.duration) return null;
  
  // Effect animations
  let transform = '';
  let opacity = 1;
  let filter = '';
  
  const entryDuration = 8; // Fast reveal in ~0.25 seconds
  const exitStart = element.duration - 5; // Shorter exit, longer hold time
  
  if (relativeFrame < entryDuration) {
    const progress = relativeFrame / entryDuration;
    const eased = spring({ frame: relativeFrame, fps: 30, config: { damping: 15, stiffness: 150 } });
    
    switch (element.effect) {
      case 'elasticRise':
        transform = `translateY(${interpolate(eased, [0, 1], [50, 0])}px) scale(${interpolate(eased, [0, 1], [0.8, 1])})`;
        opacity = eased;
        break;
      case 'scaleUp':
        transform = `scale(${interpolate(eased, [0, 1], [0.5, 1])})`;
        opacity = eased;
        break;
      case 'trackExpand':
        transform = `scaleX(${interpolate(eased, [0, 1], [0.2, 1])})`;
        opacity = eased;
        break;
      case 'slideUp':
        transform = `translateY(${interpolate(eased, [0, 1], [50, 0])}px)`;
        opacity = eased;
        break;
      case 'blurIn':
        opacity = eased;
        filter = `blur(${interpolate(progress, [0, 1], [8, 0])}px)`;
        break;
      default:
        opacity = eased;
    }
    if (element.effect !== 'blurIn') {
      filter = `blur(${interpolate(progress, [0, 1], [4, 0])}px)`;
    }
  } else if (relativeFrame >= exitStart) {
    const exitProgress = (relativeFrame - exitStart) / 5;
    opacity = interpolate(exitProgress, [0, 1], [1, 0]);
    transform = `scale(${interpolate(exitProgress, [0, 1], [1, 0.9])})`;
    filter = `blur(${interpolate(exitProgress, [0, 1], [0, 2])}px)`;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: width * safeMargin,
        top: height / 2 + yOffset,
        width: safeWidth,
        height: safeHeight * 0.4, // 40% for mobile readability
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform,
        opacity,
        filter,
        willChange: 'transform, opacity, filter'
      }}
    >
      <div
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: 'SF Pro Display, -apple-system, system-ui, sans-serif',
          fontWeight: element.emphasis ? 700 : 600,
          color: 'white',
          textAlign: 'center',
          wordSpacing: '0.05em',
          lineHeight: 1.2,
          letterSpacing: element.emphasis ? '0.02em' : '0.01em',
          textShadow: element.emphasis ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
          overflow: 'hidden',
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}
      >
        {element.content}
      </div>
    </div>
  );
};

const OptimusPhraseAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const relativeFrame = frame;
  
  // 5% safe margin
  const safeMargin = 0.05;
  const safeWidth = width * (1 - 2 * safeMargin);
  const safeHeight = height * (1 - 2 * safeMargin);
  
  if (relativeFrame < 0 || relativeFrame >= element.duration) return null;
  
  const words = element.words || element.content.split(' ');
  
  // Font size logic: updated context guidelines
  const totalChars = element.content.length;
  const wordCount = words.length;
  const baseSize = 56; // 3.5 rem base for phrase composition
  const wordMultiplier = Math.min(Math.max(10 / wordCount, 0.4), 0.9);
  const charMultiplier = Math.min(Math.max(80 / totalChars, 0.5), 0.9);
  const fontSize = Math.max(baseSize * wordMultiplier * charMultiplier, 28); // minimum 28px
  
  // For vertical format, prefer stacked layouts
  const shouldStack = wordCount > 3 || totalChars > 25;
  
  const entryDuration = 8;
  const exitStart = element.duration - 5; // Shorter exit, longer hold time
  
  const renderWord = (word: string, index: number, isHero: boolean = false) => {
    const wordFrame = relativeFrame - (index * 2); // Stagger word reveals
    
    let wordOpacity = 1;
    let wordTransform = '';
    let wordFilter = '';
    
    if (wordFrame < entryDuration) {
      const progress = Math.max(0, wordFrame) / entryDuration;
      const eased = spring({ frame: Math.max(0, wordFrame), fps: 30, config: { damping: 12, stiffness: 120 } });
      
      switch (element.effect) {
        case 'cascade':
          wordTransform = `translateY(${interpolate(eased, [0, 1], [30, 0])}px)`;
          wordOpacity = eased;
          break;
        case 'trackExpand':
          wordTransform = `scaleX(${interpolate(eased, [0, 1], [0.3, 1])})`;
          wordOpacity = eased;
          break;
        case 'slideLeft':
          wordTransform = `translateX(${interpolate(eased, [0, 1], [50, 0])}px)`;
          wordOpacity = eased;
          break;
        case 'slideRight':
          wordTransform = `translateX(${interpolate(eased, [0, 1], [-50, 0])}px)`;
          wordOpacity = eased;
          break;
        case 'slideUp':
          wordTransform = `translateY(${interpolate(eased, [0, 1], [40, 0])}px)`;
          wordOpacity = eased;
          break;
        case 'slideDown':
          wordTransform = `translateY(${interpolate(eased, [0, 1], [-40, 0])}px)`;
          wordOpacity = eased;
          break;
        case 'scaleUp':
          wordTransform = `scale(${interpolate(eased, [0, 1], [0.6, 1])})`;
          wordOpacity = eased;
          break;
        case 'elasticRise':
          wordTransform = `translateY(${interpolate(eased, [0, 1], [30, 0])}px) scale(${interpolate(eased, [0, 1], [0.9, 1])})`;
          wordOpacity = eased;
          break;
        case 'blurIn':
          wordOpacity = eased;
          wordFilter = `blur(${interpolate(progress, [0, 1], [6, 0])}px)`;
          break;
        default:
          wordOpacity = eased;
      }
      if (element.effect !== 'blurIn') {
        wordFilter = `blur(${interpolate(progress, [0, 1], [3, 0])}px)`;
      }
    } else if (relativeFrame >= exitStart) {
      const exitProgress = (relativeFrame - exitStart) / 5;
      wordOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
      wordTransform = `scale(${interpolate(exitProgress, [0, 1], [1, 0.95])})`;
      wordFilter = `blur(${interpolate(exitProgress, [0, 1], [0, 1])}px)`;
    }
    
    return (
      <span
        key={index}
        style={{
          display: shouldStack ? 'block' : 'inline-block',
          marginRight: shouldStack ? '0' : '0.4em',
          marginBottom: shouldStack ? '0.1em' : '0',
          fontSize: isHero ? `${fontSize * 1.2}px` : `${fontSize}px`,
          fontWeight: isHero ? 800 : (element.emphasis ? 700 : 600),
          color: isHero ? 'transparent' : 'white',
          background: isHero ? `linear-gradient(45deg, 
            #00FFFF, 
            #FFFFFF)` : 'none', // High-contrast cyan to white gradient
          backgroundClip: isHero ? 'text' : 'unset',
          WebkitBackgroundClip: isHero ? 'text' : 'unset',
          transform: wordTransform,
          opacity: wordOpacity,
          filter: wordFilter,
          transition: 'none',
          willChange: 'transform, opacity, filter',
          textShadow: isHero ? '0 0 10px rgba(255,255,255,0.3)' : (element.emphasis ? '0 0 15px rgba(255,255,255,0.2)' : 'none'),
          letterSpacing: '0.01em',
                      wordBreak: 'keep-all',
            overflowWrap: 'normal'
        }}
      >
        {word}
      </span>
    );
  };
  
  return (
    <div
      style={{
        position: 'absolute',
        left: width * safeMargin,
        top: height * safeMargin,
        width: safeWidth,
        height: safeHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          fontFamily: 'SF Pro Display, -apple-system, system-ui, sans-serif',
          textAlign: 'center',
          wordSpacing: '0.05em',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        {words.map((word, index) => 
          renderWord(word, index, element.heroWord === word)
        )}
      </div>
    </div>
  );
};

const TeslaOptimusKineticScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <AnimatedGradientBackground />
      
      {scriptElements.map((element, index) => {
        const timing = sequenceTimings[index];
        if (!timing) return null;
        
        return (
          <Sequence
            key={index}
            from={timing.startTime}
            durationInFrames={element.duration}
          >
            {element.type === 'rsvp' ? (
              <OptimusRSVPAnimation element={element} />
            ) : (
              <OptimusPhraseAnimation element={element} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default TeslaOptimusKineticScene; 