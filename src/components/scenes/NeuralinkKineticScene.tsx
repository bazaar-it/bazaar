import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, interpolate, spring } from 'remotion';

interface ScriptElement {
  type: 'rsvp' | 'phrase';
  content: string;
  words?: string[];
  duration: number;
  emphasis?: boolean;
  heroWord?: string;
  effect: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'cascade' | 'typewriter' | 'elasticRise' | 'trackExpand' | 'scaleUp' | 'blurIn' | 'wipeReveal';
  pause?: number;
}

const scriptElements: ScriptElement[] = [
  {
    type: 'phrase',
    content: 'Neuralink 2030',
    words: ['Neuralink', '2030'],
    duration: 40,
    emphasis: true,
    heroWord: 'Neuralink',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'No surgery No implants',
    words: ['No', 'surgery', 'No', 'implants'],
    duration: 45,
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Just seamless connection',
    words: ['Just', 'seamless', 'connection'],
    duration: 40,
    heroWord: 'seamless',
    effect: 'slideUp'
  },
  {
    type: 'phrase',
    content: 'Think it Do it Instantly',
    words: ['Think', 'it', 'Do', 'it', 'Instantly'],
    duration: 45,
    emphasis: true,
    heroWord: 'Instantly',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'Messages Typed by thought',
    words: ['Messages', 'Typed', 'by', 'thought'],
    duration: 40,
    heroWord: 'thought',
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'Photos Snapped with a blink',
    words: ['Photos', 'Snapped', 'with', 'a', 'blink'],
    duration: 45,
    heroWord: 'blink',
    effect: 'slideRight'
  },
  {
    type: 'phrase',
    content: 'Ideas Shared without a single word',
    words: ['Ideas', 'Shared', 'without', 'a', 'single', 'word'],
    duration: 50,
    heroWord: 'Ideas',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'It\'s not a device',
    words: ['It\'s', 'not', 'a', 'device'],
    duration: 35,
    effect: 'fadeIn'
  },
  {
    type: 'phrase',
    content: 'It\'s part of you',
    words: ['It\'s', 'part', 'of', 'you'],
    duration: 40,
    emphasis: true,
    heroWord: 'you',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'Learn faster Remember everything',
    words: ['Learn', 'faster', 'Remember', 'everything'],
    duration: 45,
    heroWord: 'everything',
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'Translate languages in real time',
    words: ['Translate', 'languages', 'in', 'real', 'time'],
    duration: 50,
    heroWord: 'real',
    effect: 'wipeReveal'
  },
  {
    type: 'phrase',
    content: 'Navigate your day with nothing in your hands',
    words: ['Navigate', 'your', 'day', 'with', 'nothing', 'in', 'your', 'hands'],
    duration: 55,
    heroWord: 'nothing',
    effect: 'slideDown'
  },
  {
    type: 'phrase',
    content: 'Work Create Connect',
    words: ['Work', 'Create', 'Connect'],
    duration: 35,
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'All with your mind',
    words: ['All', 'with', 'your', 'mind'],
    duration: 40,
    emphasis: true,
    heroWord: 'mind',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'Encrypted Private Yours',
    words: ['Encrypted', 'Private', 'Yours'],
    duration: 40,
    heroWord: 'Yours',
    effect: 'scaleUp'
  },
  {
    type: 'phrase',
    content: 'Everyone\'s linked',
    words: ['Everyone\'s', 'linked'],
    duration: 30,
    effect: 'slideUp'
  },
  {
    type: 'phrase',
    content: 'But no one feels tethered',
    words: ['But', 'no', 'one', 'feels', 'tethered'],
    duration: 45,
    heroWord: 'tethered',
    effect: 'slideDown'
  },
  {
    type: 'phrase',
    content: 'This is what human potential looks like',
    words: ['This', 'is', 'what', 'human', 'potential', 'looks', 'like'],
    duration: 60,
    emphasis: true,
    heroWord: 'potential',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'Unchained Enhanced Alive',
    words: ['Unchained', 'Enhanced', 'Alive'],
    duration: 45,
    emphasis: true,
    heroWord: 'Alive',
    effect: 'cascade'
  },
  {
    type: 'rsvp',
    content: 'Neuralink',
    duration: 40,
    emphasis: true,
    effect: 'elasticRise',
    pause: 15
  },
  {
    type: 'phrase',
    content: 'Your mind Fully unlocked',
    words: ['Your', 'mind', 'Fully', 'unlocked'],
    duration: 50,
    emphasis: true,
    heroWord: 'unlocked',
    effect: 'trackExpand'
  }
];

// Calculate cumulative timing
let cumulativeTime = 0;
const sequenceTimings = scriptElements.map((element) => {
  const startTime = cumulativeTime;
  cumulativeTime += element.duration + (element.pause || 0);
  return { startTime, duration: element.duration, pause: element.pause || 0 };
});

const NeuralinkGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Tech/AI/Robotics: Cool blues to purples (200–280°) - Context-based color selection
  const progress = frame / durationInFrames;
  const hue1 = interpolate(progress, [0, 0.5, 1], [200, 260, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hue2 = interpolate(progress, [0, 0.5, 1], [240, 280, 240], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const angle = interpolate(frame, [0, durationInFrames], [45, 135], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, 
          hsl(${hue1}, 80%, 60%) 0%, 
          hsl(${hue2}, 75%, 55%) 100%)`,
      }}
    />
  );
};

const NeuralinkRSVPAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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
      default:
        opacity = eased;
    }
    filter = `blur(${interpolate(progress, [0, 1], [4, 0])}px)`;
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

const NeuralinkPhraseAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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
  
  // Updated layout logic based on new context rules
  // 2-3 words + under 25 chars = horizontal, 4-6 words = vertical stack
  const shouldStack = (wordCount >= 4 && wordCount <= 6) || totalChars > 40;
  
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
        case 'wipeReveal':
          wordTransform = `translateX(${interpolate(eased, [0, 1], [100, 0])}px)`;
          wordOpacity = eased;
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
          // For cool backgrounds (blues/purples): Use warm gradients (gold to white, orange to yellow)
          background: isHero ? `linear-gradient(45deg, 
            #FFD700, 
            #FFFFFF)` : 'none', // Gold to white gradient for cool tech background
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

const NeuralinkKineticScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <NeuralinkGradientBackground />
      
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
              <NeuralinkRSVPAnimation element={element} />
            ) : (
              <NeuralinkPhraseAnimation element={element} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default NeuralinkKineticScene; 