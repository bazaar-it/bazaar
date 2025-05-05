// src/tests/remotion/__mocks__/MockPlayer.tsx
import React from 'react';

// Mock Player component that simulates @remotion/player behavior
export interface MockPlayerProps {
  component: React.ComponentType<any>;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps: number;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  style?: React.CSSProperties;
  clickToPlay?: boolean;
  doubleClickToFullscreen?: boolean;
  renderLoading?: () => React.ReactNode;
  playbackRate?: number;
  inputProps?: Record<string, any>;
  allowFullscreen?: boolean;
  initialFrame?: number;
}

const MockPlayer: React.FC<MockPlayerProps> = (props) => {
  const {
    component: Component,
    durationInFrames,
    compositionWidth,
    compositionHeight,
    fps,
    controls,
    loop,
    autoPlay,
    style,
    inputProps = {},
    allowFullscreen = true,
    initialFrame = 0
  } = props;
  
  const [isPlaying, setIsPlaying] = React.useState(autoPlay || false);
  const [currentFrame, setCurrentFrame] = React.useState(initialFrame);
  const [volume, setVolume] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  return (
    <div 
      data-testid="mock-player"
      data-playing={isPlaying}
      data-current-frame={currentFrame}
      data-volume={volume}
      data-fullscreen={isFullscreen}
      data-duration={durationInFrames}
      data-dimensions={`${compositionWidth}x${compositionHeight}`}
      data-fps={fps}
      style={style}
    >
      <div data-testid="controls" style={{ display: controls ? 'block' : 'none' }}>
        <button 
          data-testid="play-button" 
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input 
          data-testid="seek-slider" 
          type="range" 
          min={0} 
          max={durationInFrames - 1} 
          value={currentFrame}
          onChange={(e) => setCurrentFrame(Number(e.target.value))}
        />
        <button 
          data-testid="fullscreen-button" 
          onClick={() => allowFullscreen && setIsFullscreen(!isFullscreen)}
          disabled={!allowFullscreen}
        >
          Fullscreen
        </button>
      </div>
      <div data-testid="composition-container">
        <Component {...inputProps} />
      </div>
    </div>
  );
};

export default MockPlayer; 