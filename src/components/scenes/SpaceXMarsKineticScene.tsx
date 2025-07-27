import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, interpolate, spring } from 'remotion';

interface ScriptElement {
  type: 'rsvp' | 'phrase';
  content: string;
  words?: string[];
  duration: number;
  emphasis?: boolean;
  heroWord?: string;
  effect: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'cascade' | 'typewriter' | 'elasticRise' | 'trackExpand' | 'scaleUp' | 'blurIn' | 'wipeReveal' | 'charReveal';
  pause?: number;
}

const scriptElements: ScriptElement[] = [
  {
    type: 'phrase',
    content: 'Leave in the morning Be home by nightfall',
    words: ['Leave', 'in', 'the', 'morning', 'Be', 'home', 'by', 'nightfall'],
    duration: 55,
    heroWord: 'nightfall',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'No passports No jet lag Just Mars',
    words: ['No', 'passports', 'No', 'jet', 'lag', 'Just', 'Mars'],
    duration: 50,
    emphasis: true,
    heroWord: 'Mars',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Board Starship Recline Relax',
    words: ['Board', 'Starship', 'Recline', 'Relax'],
    duration: 40,
    heroWord: 'Starship',
    effect: 'slideUp'
  },
  {
    type: 'phrase',
    content: 'Touch down 225 million kilometers away',
    words: ['Touch', 'down', '225', 'million', 'kilometers', 'away'],
    duration: 50,
    heroWord: '225',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'Walk red dust',
    words: ['Walk', 'red', 'dust'],
    duration: 30,
    heroWord: 'red',
    effect: 'slideRight'
  },
  {
    type: 'phrase',
    content: 'Carve your name in Martian soil',
    words: ['Carve', 'your', 'name', 'in', 'Martian', 'soil'],
    duration: 45,
    heroWord: 'Martian',
    effect: 'wipeReveal'
  },
  {
    type: 'phrase',
    content: 'Watch Earth rise in the sky',
    words: ['Watch', 'Earth', 'rise', 'in', 'the', 'sky'],
    duration: 45,
    emphasis: true,
    heroWord: 'Earth',
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'Lunch with a view no one believed we\'d reach',
    words: ['Lunch', 'with', 'a', 'view', 'no', 'one', 'believed', 'we\'d', 'reach'],
    duration: 60,
    heroWord: 'believed',
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'Low gravity High wonder',
    words: ['Low', 'gravity', 'High', 'wonder'],
    duration: 40,
    heroWord: 'wonder',
    effect: 'scaleUp'
  },
  {
    type: 'phrase',
    content: 'Photos don\'t do it justice',
    words: ['Photos', 'don\'t', 'do', 'it', 'justice'],
    duration: 40,
    effect: 'fadeIn'
  },
  {
    type: 'phrase',
    content: 'But you\'ll take thousands',
    words: ['But', 'you\'ll', 'take', 'thousands'],
    duration: 35,
    heroWord: 'thousands',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Return the same day Changed forever',
    words: ['Return', 'the', 'same', 'day', 'Changed', 'forever'],
    duration: 50,
    emphasis: true,
    heroWord: 'forever',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'This isn\'t a dream',
    words: ['This', 'isn\'t', 'a', 'dream'],
    duration: 35,
    effect: 'slideDown'
  },
  {
    type: 'phrase',
    content: 'It\'s a schedule',
    words: ['It\'s', 'a', 'schedule'],
    duration: 35,
    emphasis: true,
    heroWord: 'schedule',
    effect: 'trackExpand'
  },
  {
    type: 'rsvp',
    content: 'SpaceX',
    duration: 40,
    emphasis: true,
    effect: 'elasticRise',
    pause: 15
  },
  {
    type: 'phrase',
    content: 'Now boarding Planet Two',
    words: ['Now', 'boarding', 'Planet', 'Two'],
    duration: 45,
    emphasis: true,
    heroWord: 'Two',
    effect: 'slideUp'
  }
];

// Calculate cumulative timing
let cumulativeTime = 0;
const sequenceTimings = scriptElements.map((element) => {
  const startTime = cumulativeTime;
  cumulativeTime += element.duration + (element.pause || 0);
  return { startTime, duration: element.duration, pause: element.pause || 0 };
});

const SpaceXMarsGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Vehicles/Speed/Energy: Warm oranges to reds (0–60°) - Context-based color selection for Mars/Space theme
  const progress = frame / durationInFrames;
  const hue1 = interpolate(progress, [0, 0.5, 1], [0, 30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hue2 = interpolate(progress, [0, 0.5, 1], [20, 60, 20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const angle = interpolate(frame, [0, durationInFrames], [45, 135], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, 
          hsl(${hue1}, 85%, 60%) 0%, 
          hsl(${hue2}, 80%, 55%) 100%)`,
      }}
    />
  );
};

const SpaceXRSVPAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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

const SpaceXPhraseAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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
  
  // Updated layout logic: intelligent phrase chunking at natural speech boundaries
  // Under 20 chars = horizontal, 20-40 chars = break into logical chunks, 40+ = break into meaningful chunks
  const shouldBreakIntoChunks = totalChars > 20;
  
  // Define logical phrase chunks for better readability
  const getLogicalChunks = (words: string[], content: string): string[][] => {
    if (totalChars <= 20) return [words]; // Keep short phrases horizontal
    
    // Define logical breaking patterns based on content
    if (content.includes('Leave in the morning')) return [['Leave', 'in', 'the', 'morning'], ['Be', 'home', 'by', 'nightfall']];
    if (content.includes('No passports')) return [['No', 'passports'], ['No', 'jet', 'lag'], ['Just', 'Mars']];
    if (content.includes('Board Starship')) return [['Board', 'Starship'], ['Recline'], ['Relax']];
    if (content.includes('Touch down')) return [['Touch', 'down'], ['225', 'million', 'kilometers', 'away']];
    if (content.includes('Carve your name')) return [['Carve', 'your', 'name'], ['in', 'Martian', 'soil']];
    if (content.includes('Lunch with a view')) return [['Lunch', 'with', 'a', 'view'], ['no', 'one', 'believed'], ['we\'d', 'reach']];
    if (content.includes('Low gravity')) return [['Low', 'gravity'], ['High', 'wonder']];
    if (content.includes('Return the same day')) return [['Return', 'the', 'same', 'day'], ['Changed', 'forever']];
    if (content.includes('Now boarding')) return [['Now', 'boarding'], ['Planet', 'Two']];
    
    // Default: break into logical 2-3 word chunks
    const chunks: string[][] = [];
    for (let i = 0; i < words.length; i += 3) {
      chunks.push(words.slice(i, i + 3));
    }
    return chunks;
  };
  
  const chunks = shouldBreakIntoChunks ? getLogicalChunks(words, element.content) : [words];
  
  const entryDuration = 8;
  const exitStart = element.duration - 5; // Shorter exit, longer hold time
  
  const renderChunk = (chunk: string[], chunkIndex: number) => {
    const chunkFrame = relativeFrame - (chunkIndex * 3); // Stagger chunk reveals
    
    let chunkOpacity = 1;
    let chunkTransform = '';
    let chunkFilter = '';
    
    if (chunkFrame < entryDuration) {
      const progress = Math.max(0, chunkFrame) / entryDuration;
      const eased = spring({ frame: Math.max(0, chunkFrame), fps: 30, config: { damping: 12, stiffness: 120 } });
      
      switch (element.effect) {
        case 'cascade':
          chunkTransform = `translateY(${interpolate(eased, [0, 1], [30, 0])}px)`;
          chunkOpacity = eased;
          break;
        case 'trackExpand':
          chunkTransform = `scaleX(${interpolate(eased, [0, 1], [0.3, 1])})`;
          chunkOpacity = eased;
          break;
        case 'slideLeft':
          chunkTransform = `translateX(${interpolate(eased, [0, 1], [50, 0])}px)`;
          chunkOpacity = eased;
          break;
        case 'slideRight':
          chunkTransform = `translateX(${interpolate(eased, [0, 1], [-50, 0])}px)`;
          chunkOpacity = eased;
          break;
        case 'slideUp':
          chunkTransform = `translateY(${interpolate(eased, [0, 1], [40, 0])}px)`;
          chunkOpacity = eased;
          break;
        case 'slideDown':
          chunkTransform = `translateY(${interpolate(eased, [0, 1], [-40, 0])}px)`;
          chunkOpacity = eased;
          break;
        case 'scaleUp':
          chunkTransform = `scale(${interpolate(eased, [0, 1], [0.6, 1])})`;
          chunkOpacity = eased;
          break;
        case 'elasticRise':
          chunkTransform = `translateY(${interpolate(eased, [0, 1], [30, 0])}px) scale(${interpolate(eased, [0, 1], [0.9, 1])})`;
          chunkOpacity = eased;
          break;
        case 'blurIn':
          chunkOpacity = eased;
          chunkFilter = `blur(${interpolate(progress, [0, 1], [6, 0])}px)`;
          break;
        case 'wipeReveal':
          chunkTransform = `translateX(${interpolate(eased, [0, 1], [100, 0])}px)`;
          chunkOpacity = eased;
          break;
        default:
          chunkOpacity = eased;
      }
      if (element.effect !== 'blurIn') {
        chunkFilter = `blur(${interpolate(progress, [0, 1], [3, 0])}px)`;
      }
    } else if (relativeFrame >= exitStart) {
      const exitProgress = (relativeFrame - exitStart) / 5;
      chunkOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
      chunkTransform = `scale(${interpolate(exitProgress, [0, 1], [1, 0.95])})`;
      chunkFilter = `blur(${interpolate(exitProgress, [0, 1], [0, 1])}px)`;
    }
    
    const chunkText = chunk.join(' ');
    const isHeroChunk = chunk.some(word => element.heroWord === word);
    const heroWordInChunk = chunk.find(word => element.heroWord === word);
    
    return (
      <div
        key={chunkIndex}
        style={{
          display: 'block',
          marginBottom: shouldBreakIntoChunks ? '0.2em' : '0',
          fontSize: isHeroChunk ? `${fontSize * 1.2}px` : `${fontSize}px`,
          fontWeight: isHeroChunk ? 800 : (element.emphasis ? 700 : 600),
          transform: chunkTransform,
          opacity: chunkOpacity,
          filter: chunkFilter,
          transition: 'none',
          willChange: 'transform, opacity, filter',
          textShadow: isHeroChunk ? '0 0 10px rgba(255,255,255,0.3)' : (element.emphasis ? '0 0 15px rgba(255,255,255,0.2)' : 'none'),
          letterSpacing: '0.01em',
                      wordBreak: 'keep-all',
            overflowWrap: 'normal',
          textAlign: 'center'
        }}
      >
        {chunk.map((word, wordIndex) => (
          <span
            key={wordIndex}
            style={{
              display: 'inline',
              marginRight: wordIndex < chunk.length - 1 ? '0.4em' : '0',
              color: (heroWordInChunk === word) ? 'transparent' : 'white',
              // For warm backgrounds (reds/oranges): Use cool gradients (cyan to white, blue to green)
              background: (heroWordInChunk === word) ? `linear-gradient(45deg, 
                #00BFFF, 
                #FFFFFF)` : 'none', // Cool cyan to white gradient for warm Mars background
              backgroundClip: (heroWordInChunk === word) ? 'text' : 'unset',
              WebkitBackgroundClip: (heroWordInChunk === word) ? 'text' : 'unset',
            }}
          >
            {word}
          </span>
        ))}
      </div>
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
        flexDirection: 'column',
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
        {chunks.map((chunk, index) => renderChunk(chunk, index))}
      </div>
    </div>
  );
};

const SpaceXMarsKineticScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <SpaceXMarsGradientBackground />
      
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
              <SpaceXRSVPAnimation element={element} />
            ) : (
              <SpaceXPhraseAnimation element={element} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default SpaceXMarsKineticScene; 