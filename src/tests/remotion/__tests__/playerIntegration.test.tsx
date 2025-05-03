import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { act } from 'react-dom/test-utils';

// Mock the window object for client-side behavior
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 0))
});

// Mock Next.js useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: jest.fn().mockReturnValue('/'),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams())
}));

// Mock Player from Remotion
jest.mock('@remotion/player', () => {
  // Return a function component that simulates Player behavior
  const MockPlayer = ({
    component: Component,
    durationInFrames,
    compositionWidth,
    compositionHeight,
    fps,
    controls,
    loop,
    autoPlay,
    style,
    clickToPlay,
    doubleClickToFullscreen,
    renderLoading,
    playbackRate,
    inputProps = {},
    allowFullscreen = true,
    initialFrame = 0
  }) => {
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
  
  return {
    Player: jest.fn().mockImplementation(MockPlayer)
  };
});

// Import after mocks
import { render, fireEvent, screen } from '@testing-library/react';
import { Player } from '@remotion/player';

// Mock video components
const TestVideoComponent = ({ text = 'Default Text' }) => (
  <div data-testid="test-video-component">{text}</div>
);

describe('Remotion Player Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render the Player with basic props', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
      />
    );
    
    const player = screen.getByTestId('mock-player');
    expect(player).toBeInTheDocument();
    expect(player.getAttribute('data-dimensions')).toBe('1920x1080');
    expect(player.getAttribute('data-duration')).toBe('100');
    expect(player.getAttribute('data-fps')).toBe('30');
    expect(screen.getByTestId('test-video-component')).toBeInTheDocument();
  });
  
  it('should pass input props to the component', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        inputProps={{ text: 'Custom Text' }}
        controls
      />
    );
    
    const component = screen.getByTestId('test-video-component');
    expect(component).toBeInTheDocument();
    expect(component.textContent).toBe('Custom Text');
  });
  
  it('should handle play/pause controls', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
      />
    );
    
    const player = screen.getByTestId('mock-player');
    const playButton = screen.getByTestId('play-button');
    
    // Initial state - not playing
    expect(player.getAttribute('data-playing')).toBe('false');
    
    // Click play
    fireEvent.click(playButton);
    expect(player.getAttribute('data-playing')).toBe('true');
    
    // Click pause
    fireEvent.click(playButton);
    expect(player.getAttribute('data-playing')).toBe('false');
  });
  
  it('should handle seeking', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
      />
    );
    
    const player = screen.getByTestId('mock-player');
    const seekSlider = screen.getByTestId('seek-slider');
    
    // Initial position
    expect(player.getAttribute('data-current-frame')).toBe('0');
    
    // Seek to frame 50
    fireEvent.change(seekSlider, { target: { value: '50' } });
    expect(player.getAttribute('data-current-frame')).toBe('50');
  });
  
  it('should auto-play when specified', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        autoPlay
      />
    );
    
    const player = screen.getByTestId('mock-player');
    expect(player.getAttribute('data-playing')).toBe('true');
  });
  
  it('should hide controls when specified', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls={false}
      />
    );
    
    const controls = screen.getByTestId('controls');
    expect(controls).toHaveStyle('display: none');
  });
  
  it('should support fullscreen toggle when allowed', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        allowFullscreen
      />
    );
    
    const player = screen.getByTestId('mock-player');
    const fullscreenButton = screen.getByTestId('fullscreen-button');
    
    // Initial state - not fullscreen
    expect(player.getAttribute('data-fullscreen')).toBe('false');
    
    // Enter fullscreen
    fireEvent.click(fullscreenButton);
    expect(player.getAttribute('data-fullscreen')).toBe('true');
    
    // Exit fullscreen
    fireEvent.click(fullscreenButton);
    expect(player.getAttribute('data-fullscreen')).toBe('false');
  });
  
  it('should disable fullscreen when not allowed', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        allowFullscreen={false}
      />
    );
    
    const fullscreenButton = screen.getByTestId('fullscreen-button');
    expect(fullscreenButton).toBeDisabled();
  });
  
  it('should start at initial frame when specified', () => {
    render(
      <Player
        component={TestVideoComponent}
        durationInFrames={100}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        initialFrame={25}
      />
    );
    
    const player = screen.getByTestId('mock-player');
    expect(player.getAttribute('data-current-frame')).toBe('25');
  });
}); 