import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, interpolate, spring } from 'remotion';

interface ScriptElement {
  type: 'rsvp' | 'phrase';
  content: string;
  words?: string[];
  duration: number;
  emphasis?: boolean;
  heroWord?: string;
  effect: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'cascade' | 'typewriter' | 'elasticRise' | 'trackExpand' | 'scaleUp' | 'blurIn' | 'wipeReveal' | 'charReveal' | 'pulseIn';
  pause?: number;
}

const scriptElements: ScriptElement[] = [
  {
    type: 'rsvp',
    content: 'Bazaar Neural Stream',
    duration: 45,
    emphasis: true,
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'You think it Bazaar makes it real',
    words: ['You', 'think', 'it', 'Bazaar', 'makes', 'it', 'real'],
    duration: 50,
    heroWord: 'Bazaar',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'No typing No clicking',
    words: ['No', 'typing', 'No', 'clicking'],
    duration: 35,
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'Just pure imagination',
    words: ['Just', 'pure', 'imagination'],
    duration: 40,
    heroWord: 'imagination',
    effect: 'slideRight'
  },
  {
    type: 'phrase',
    content: 'streamed into motion',
    words: ['streamed', 'into', 'motion'],
    duration: 35,
    heroWord: 'motion',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'Visuals shaped by your thoughts',
    words: ['Visuals', 'shaped', 'by', 'your', 'thoughts'],
    duration: 45,
    heroWord: 'thoughts',
    effect: 'slideUp'
  },
  {
    type: 'phrase',
    content: 'Music tuned to your emotions',
    words: ['Music', 'tuned', 'to', 'your', 'emotions'],
    duration: 45,
    heroWord: 'emotions',
    effect: 'wipeReveal'
  },
  {
    type: 'phrase',
    content: 'Edits that know what you feel before you do',
    words: ['Edits', 'that', 'know', 'what', 'you', 'feel', 'before', 'you', 'do'],
    duration: 60,
    heroWord: 'feel',
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'From spark to screen in seconds',
    words: ['From', 'spark', 'to', 'screen', 'in', 'seconds'],
    duration: 45,
    heroWord: 'seconds',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'An idea becomes a scene',
    words: ['An', 'idea', 'becomes', 'a', 'scene'],
    duration: 40,
    heroWord: 'idea',
    effect: 'scaleUp'
  },
  {
    type: 'phrase',
    content: 'A memory becomes a mood',
    words: ['A', 'memory', 'becomes', 'a', 'mood'],
    duration: 40,
    heroWord: 'memory',
    effect: 'slideDown'
  },
  {
    type: 'phrase',
    content: 'A dream becomes a demo',
    words: ['A', 'dream', 'becomes', 'a', 'demo'],
    duration: 40,
    heroWord: 'dream',
    effect: 'elasticRise'
  },
  {
    type: 'phrase',
    content: 'Bazaar Neural Stream connects directly to your Neuralink',
    words: ['Bazaar', 'Neural', 'Stream', 'connects', 'directly', 'to', 'your', 'Neuralink'],
    duration: 65,
    emphasis: true,
    heroWord: 'Neuralink',
    effect: 'trackExpand'
  },
  {
    type: 'phrase',
    content: 'Your brain is the editor Your pulse is the timeline',
    words: ['Your', 'brain', 'is', 'the', 'editor', 'Your', 'pulse', 'is', 'the', 'timeline'],
    duration: 60,
    heroWord: 'brain',
    effect: 'pulseIn'
  },
  {
    type: 'phrase',
    content: 'No interface No delay',
    words: ['No', 'interface', 'No', 'delay'],
    duration: 35,
    effect: 'slideLeft'
  },
  {
    type: 'phrase',
    content: 'Just creation alive intuitive infinite',
    words: ['Just', 'creation', 'alive', 'intuitive', 'infinite'],
    duration: 50,
    emphasis: true,
    heroWord: 'infinite',
    effect: 'cascade'
  },
  {
    type: 'phrase',
    content: 'Design without hands Direct without speech',
    words: ['Design', 'without', 'hands', 'Direct', 'without', 'speech'],
    duration: 50,
    heroWord: 'Direct',
    effect: 'slideRight'
  },
  {
    type: 'phrase',
    content: 'Feel something Bazaar shows it',
    words: ['Feel', 'something', 'Bazaar', 'shows', 'it'],
    duration: 40,
    heroWord: 'Feel',
    effect: 'blurIn'
  },
  {
    type: 'phrase',
    content: 'This isn\'t content creation',
    words: ['This', 'isn\'t', 'content', 'creation'],
    duration: 40,
    effect: 'fadeIn'
  },
  {
    type: 'phrase',
    content: 'It\'s emotional telepathy',
    words: ['It\'s', 'emotional', 'telepathy'],
    duration: 40,
    emphasis: true,
    heroWord: 'telepathy',
    effect: 'elasticRise'
  },
  {
    type: 'rsvp',
    content: 'Bazaar Neural Stream',
    duration: 45,
    emphasis: true,
    effect: 'scaleUp',
    pause: 15
  },
  {
    type: 'phrase',
    content: 'Broadcast your mind',
    words: ['Broadcast', 'your', 'mind'],
    duration: 40,
    emphasis: true,
    heroWord: 'mind',
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

const BazaarNeuralGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Tech/AI/Future: Cool blues to purples (200–280°) - Context-based color selection
  const progress = frame / durationInFrames;
  const hue1 = interpolate(progress, [0, 0.5, 1], [200, 240, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hue2 = interpolate(progress, [0, 0.5, 1], [220, 280, 220], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const angle = interpolate(frame, [0, durationInFrames], [45, 135], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, 
          hsl(${hue1}, 85%, 55%) 0%, 
          hsl(${hue2}, 80%, 60%) 100%)`,
      }}
    />
  );
};

const BazaarRSVPAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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
                     // Word integrity rules
           wordBreak: 'keep-all',
           overflowWrap: 'normal',
           hyphens: 'none'
        }}
      >
        {element.content}
      </div>
    </div>
  );
};

const BazaarPhraseAnimation: React.FC<{ element: ScriptElement }> = ({ element }) => {
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
    if (content.includes('You think it')) return [['You', 'think', 'it'], ['Bazaar', 'makes', 'it', 'real']];
    if (content.includes('No typing')) return [['No', 'typing'], ['No', 'clicking']];
    if (content.includes('Just pure')) return [['Just', 'pure', 'imagination']];
    if (content.includes('streamed into')) return [['streamed', 'into', 'motion']];
    if (content.includes('Visuals shaped')) return [['Visuals', 'shaped'], ['by', 'your', 'thoughts']];
    if (content.includes('Music tuned')) return [['Music', 'tuned'], ['to', 'your', 'emotions']];
    if (content.includes('Edits that know')) return [['Edits', 'that', 'know'], ['what', 'you', 'feel'], ['before', 'you', 'do']];
    if (content.includes('From spark')) return [['From', 'spark'], ['to', 'screen'], ['in', 'seconds']];
    if (content.includes('Bazaar Neural Stream connects')) return [['Bazaar', 'Neural', 'Stream'], ['connects', 'directly'], ['to', 'your', 'Neuralink']];
    if (content.includes('Your brain is')) return [['Your', 'brain'], ['is', 'the', 'editor'], ['Your', 'pulse'], ['is', 'the', 'timeline']];
    if (content.includes('No interface')) return [['No', 'interface'], ['No', 'delay']];
    if (content.includes('Just creation')) return [['Just', 'creation'], ['alive', 'intuitive', 'infinite']];
    if (content.includes('Design without')) return [['Design', 'without', 'hands'], ['Direct', 'without', 'speech']];
    if (content.includes('Feel something')) return [['Feel', 'something'], ['Bazaar', 'shows', 'it']];
    if (content.includes('emotional telepathy')) return [['emotional', 'telepathy']];
    
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
        case 'pulseIn':
          chunkTransform = `scale(${interpolate(eased, [0, 1], [0.8, 1])})`;
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
          textAlign: 'center',
                     // Word integrity rules - CRITICAL
           wordBreak: 'keep-all',
           overflowWrap: 'normal',
           hyphens: 'none'
        }}
      >
        {chunk.map((word, wordIndex) => (
          <span
            key={wordIndex}
            style={{
              display: 'inline',
              marginRight: wordIndex < chunk.length - 1 ? '0.4em' : '0',
              color: (heroWordInChunk === word) ? 'transparent' : 'white',
              // For cool backgrounds (blues/purples): Use warm gradients (gold to white, orange to yellow)
              background: (heroWordInChunk === word) ? `linear-gradient(45deg, 
                #FFD700, 
                #FFFFFF)` : 'none', // Gold to white gradient for cool tech background
              backgroundClip: (heroWordInChunk === word) ? 'text' : 'unset',
              WebkitBackgroundClip: (heroWordInChunk === word) ? 'text' : 'unset',
                             // Word integrity rules applied to each word
               wordBreak: 'keep-all',
               overflowWrap: 'normal',
               hyphens: 'none'
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

const BazaarNeuralStreamKineticScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <BazaarNeuralGradientBackground />
      
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
              <BazaarRSVPAnimation element={element} />
            ) : (
              <BazaarPhraseAnimation element={element} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default BazaarNeuralStreamKineticScene; 