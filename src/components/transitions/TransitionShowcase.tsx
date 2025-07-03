import React from 'react';
import { AbsoluteFill, Series, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { particleDissolve } from './ParticleDissolve';
import { glitchTransition } from './GlitchTransition';
import { circularReveal } from './CircularReveal';
import { morphTransition } from './MorphTransition';
import { splitTransition } from './SplitTransition';
import { pixelateTransition } from './PixelateTransition';

// Demo scenes for testing
const DemoScene: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <AbsoluteFill
    style={{
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}
  >
    <h1
      style={{
        fontSize: '120px',
        color: 'white',
        fontWeight: 'bold',
        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        margin: 0,
      }}
    >
      {text}
    </h1>
  </AbsoluteFill>
);

export const TransitionShowcase: React.FC = () => {
  const { width, height } = useVideoConfig();
  const sceneDuration = 60;
  const transitionDuration = 45;

  return (
    <Series>
      {/* Particle Dissolve */}
      <Series.Sequence durationInFrames={150} name="Particle Dissolve">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#FF6B6B" text="Scene 1" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={particleDissolve({
              particleCount: 100,
              particleSize: 6,
              spread: 150,
              colors: ['#FFE66D', '#FF6B6B', '#4ECDC4'],
            })}
            timing={linearTiming({ durationInFrames: transitionDuration })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#4ECDC4" text="Scene 2" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>

      {/* Glitch Transition */}
      <Series.Sequence durationInFrames={150} name="Glitch">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#C06C84" text="Glitch" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={glitchTransition({
              intensity: 30,
              sliceCount: 12,
              colorShift: true,
            })}
            timing={linearTiming({ durationInFrames: transitionDuration })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#6C5B7B" text="Effect" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>

      {/* Circular Reveal */}
      <Series.Sequence durationInFrames={150} name="Circular Reveal">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#F67280" text="Circle" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={circularReveal({
              direction: 'in',
              center: { x: 50, y: 50 },
              smoothness: 1.5,
              rotation: true,
            })}
            timing={springTiming({
              durationInFrames: transitionDuration,
              config: { damping: 200 },
            })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#355C7D" text="Reveal" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>

      {/* Morph Transition - Liquid */}
      <Series.Sequence durationInFrames={150} name="Liquid Morph">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#A8E6CF" text="Liquid" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={morphTransition({
              morphType: 'liquid',
              color: '#7FD8BE',
              segments: 8,
            })}
            timing={springTiming({
              durationInFrames: transitionDuration,
              config: { damping: 100, stiffness: 50 },
            })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#FFD3B6" text="Morph" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>

      {/* Split Transition - Vertical */}
      <Series.Sequence durationInFrames={150} name="Split Vertical">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#EE6C4D" text="Split" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={splitTransition({
              direction: 'vertical',
              splits: 7,
              stagger: true,
              reverse: false,
            })}
            timing={linearTiming({ durationInFrames: transitionDuration })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#3D5A80" text="Screen" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>

      {/* Pixelate Transition */}
      <Series.Sequence durationInFrames={150} name="Pixelate">
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#7209B7" text="Pixel" />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={pixelateTransition({
              maxPixelSize: 30,
              colorShift: true,
              pattern: 'center',
            })}
            timing={linearTiming({ durationInFrames: transitionDuration })}
          />
          <TransitionSeries.Sequence durationInFrames={sceneDuration}>
            <DemoScene color="#F72585" text="Perfect" />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Series.Sequence>
    </Series>
  );
};

// Export individual test components for easier testing
export const TestParticleDissolve = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={60}>
      <DemoScene color="#FF6B6B" text="Before" />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={particleDissolve()}
      timing={linearTiming({ durationInFrames: 45 })}
    />
    <TransitionSeries.Sequence durationInFrames={60}>
      <DemoScene color="#4ECDC4" text="After" />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

export const TestGlitch = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={60}>
      <DemoScene color="#C06C84" text="Normal" />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={glitchTransition()}
      timing={linearTiming({ durationInFrames: 45 })}
    />
    <TransitionSeries.Sequence durationInFrames={60}>
      <DemoScene color="#6C5B7B" text="Glitched" />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);