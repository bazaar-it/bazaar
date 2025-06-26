// src/tests/remotion/__tests__/compositionRendering.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react';
import { Composition, getInputProps } from 'remotion';
import { Player } from '@remotion/player';
// Mock fetch for tests
const mockFetch = jest.fn();
global.fetch = mockFetch;
import { readFileSync } from 'fs';
import { join } from 'path';

// Import React first so it's available in the mock scope
const mockReact = jest;

// Mock Remotion
jest.mock('remotion', () => {
  const React = require('react');
  return {
    Composition: jest.fn(({ component, durationInFrames, width, height, id }) => (
      <div data-testid={`composition-${id}`} data-duration={durationInFrames} data-dimensions={`${width}x${height}`}>
        {React.createElement(component, {})}
      </div>
    )),
    getInputProps: jest.fn().mockReturnValue({}),
    useCurrentFrame: jest.fn().mockReturnValue(0),
    useVideoConfig: jest.fn().mockReturnValue({
      width: 1920,
      height: 1080,
      durationInFrames: 300,
      fps: 30
    }),
    AbsoluteFill: jest.fn(({ children }) => <div data-testid="absolute-fill">{children}</div>)
  };
});

// Mock Player
jest.mock('@remotion/player', () => {
  const React = require('react');
  return {
    Player: jest.fn(({ component, durationInFrames, compositionWidth, compositionHeight }) => (
      <div data-testid="remotion-player" data-duration={durationInFrames} data-dimensions={`${compositionWidth}x${compositionHeight}`}>
        {React.createElement(component, {})}
      </div>
    ))
  };
});

// Test components
const TestScene = () => <div data-testid="test-scene">Test Scene Content</div>;
const TestComposition = () => <div data-testid="test-composition">Test Composition</div>;

describe('Remotion Composition Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a basic composition correctly', () => {
    const { getByTestId } = render(
      <Composition
        id="test-composition"
        component={TestScene}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    );

    const composition = getByTestId('composition-test-composition');
    expect(composition).toBeInTheDocument();
    expect(composition.getAttribute('data-duration')).toBe('150');
    expect(composition.getAttribute('data-dimensions')).toBe('1920x1080');
    expect(getByTestId('test-scene')).toBeInTheDocument();
  });

  it('should handle multiple compositions', () => {
    const { getAllByTestId } = render(
      <>
        <Composition
          id="composition-1"
          component={TestScene}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="composition-2"
          component={TestComposition}
          durationInFrames={300}
          fps={30}
          width={1920}
          height={1080}
        />
      </>
    );

    const compositions = getAllByTestId(/^composition-/);
    expect(compositions).toHaveLength(2);
    
    // First composition
    expect(compositions[0].getAttribute('data-duration')).toBe('150');
    expect(compositions[0].getAttribute('data-dimensions')).toBe('1920x1080');
    
    // Second composition
    expect(compositions[1].getAttribute('data-duration')).toBe('300');
    expect(compositions[1].getAttribute('data-dimensions')).toBe('1920x1080');
  });

  it('should render with the Player component', () => {
    const { getByTestId } = render(
      <Player
        component={TestScene}
        durationInFrames={150}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
      />
    );

    const player = getByTestId('remotion-player');
    expect(player).toBeInTheDocument();
    expect(player.getAttribute('data-duration')).toBe('150');
    expect(player.getAttribute('data-dimensions')).toBe('1920x1080');
    expect(getByTestId('test-scene')).toBeInTheDocument();
  });

  it('should pass input props to compositions', () => {
    // Setup getInputProps mock to return specific props
    (getInputProps as jest.Mock).mockReturnValue({
      title: 'Test Title',
      backgroundColor: '#FF0000'
    });

    // Create a component that uses input props
    const ComponentWithProps = () => {
      const props = getInputProps();
      return (
        <div data-testid="props-component" data-title={props.title} data-color={props.backgroundColor}>
          Component with props
        </div>
      );
    };

    const { getByTestId } = render(
      <Composition
        id="props-composition"
        component={ComponentWithProps}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Test Title',
          backgroundColor: '#FF0000'
        }}
      />
    );

    const propsComponent = getByTestId('props-component');
    expect(propsComponent).toBeInTheDocument();
    expect(propsComponent.getAttribute('data-title')).toBe('Test Title');
    expect(propsComponent.getAttribute('data-color')).toBe('#FF0000');
  });

  it('should handle composition with nested components', () => {
    const NestedComponent = () => {
      return (
        <div data-testid="parent-component">
          <div data-testid="child-component-1">Child 1</div>
          <div data-testid="child-component-2">Child 2</div>
        </div>
      );
    };

    const { getByTestId } = render(
      <Composition
        id="nested-composition"
        component={NestedComponent}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    );

    expect(getByTestId('parent-component')).toBeInTheDocument();
    expect(getByTestId('child-component-1')).toBeInTheDocument();
    expect(getByTestId('child-component-2')).toBeInTheDocument();
  });
}); 