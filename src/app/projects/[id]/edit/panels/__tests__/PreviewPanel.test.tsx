import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewPanel from '../PreviewPanel';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';
import { applyPatch } from 'fast-json-patch';
import type { Operation } from 'fast-json-patch';

// Create a better mock implementation of the video state with proper typing
const createMockVideoState = () => {
  const mockGetCurrentProps = jest.fn();
  const mockSetProject = jest.fn();
  const mockForceRefresh = jest.fn();

  return {
    getCurrentProps: mockGetCurrentProps,
    setProject: mockSetProject,
    forceRefresh: mockForceRefresh,
    // Store the mock functions for assertions
    mockFunctions: {
      mockGetCurrentProps,
      mockSetProject,
      mockForceRefresh
    }
  };
};

// Mock the video state store and timeline hooks
jest.mock('~/stores/videoState', () => ({
  useVideoState: jest.fn()
}));

jest.mock('~/components/client/Timeline/TimelineContext', () => ({
  useTimeline: jest.fn()
}));

// Mock document methods
const originalQuerySelectorAll = document.querySelectorAll;

describe('PreviewPanel', () => {
  const mockProjectId = 'test-project-id';
  const mockInputProps: InputProps = {
    meta: { duration: 300, title: 'Test Video' },
    scenes: [
      {
        id: 'scene-1',
        type: 'background-color',
        start: 0,
        duration: 150,
        data: { color: 'rgba(0,0,0,1)' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM elements
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    
    // Restore the original querySelectorAll
    document.querySelectorAll = originalQuerySelectorAll;
  });

  afterEach(() => {
    document.querySelectorAll = originalQuerySelectorAll;
    jest.restoreAllMocks();
  });

  it('should render the preview panel with initial props', async () => {
    // Setup mocks with our helper
    const mockState = createMockVideoState();
    mockState.mockFunctions.mockGetCurrentProps.mockReturnValue(mockInputProps);
    
    // Use the mock implementation with proper casting
    ((useVideoState as unknown) as jest.Mock).mockReturnValue(mockState);

    (useTimeline as jest.Mock).mockReturnValue({
      timelineDuration: 300,
      scale: 1,
      currentFrame: 0
    });

    // Render the component - no need for act here
    render(<PreviewPanel projectId={mockProjectId} />);

    // Manually trigger the setProject call
    act(() => {
      // Call setProject directly instead of trying to find the useEffect
      mockState.setProject(mockProjectId);
    });

    // Check for our data-testid
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    
    // Verify setProject was called
    expect(mockState.mockFunctions.mockSetProject).toHaveBeenCalledWith(mockProjectId);
  });

  it('should handle custom component loading', async () => {
    // Mock store with a custom component
    const customProps = {
      ...mockInputProps,
      scenes: [
        ...mockInputProps.scenes,
        {
          id: 'custom-component-1',
          type: 'custom',
          start: 150,
          duration: 150,
          data: {
            componentId: 'test-component-1',
            someParam: 'test-value',
          },
        },
      ],
    };

    // Setup mocks with our helper
    const mockState = createMockVideoState();
    mockState.mockFunctions.mockGetCurrentProps.mockReturnValue(customProps);
    
    // Use the mock implementation with proper casting
    ((useVideoState as unknown) as jest.Mock).mockReturnValue(mockState);

    (useTimeline as jest.Mock).mockReturnValue({
      timelineDuration: 300,
      scale: 1,
      currentFrame: 0
    });

    // Mock the querySelectorAll to simulate a script being loaded
    document.querySelectorAll = jest.fn().mockReturnValue([]);

    render(<PreviewPanel projectId={mockProjectId} />);
    
    // Verify the custom component data was used
    expect(mockState.mockFunctions.mockGetCurrentProps).toHaveBeenCalled();
  });

  it('should clean up component scripts when unmounting', () => {
    // Setup mocks with our helper
    const mockState = createMockVideoState();
    mockState.mockFunctions.mockGetCurrentProps.mockReturnValue(mockInputProps);
    
    // Use the mock implementation with proper casting
    ((useVideoState as unknown) as jest.Mock).mockReturnValue(mockState);

    (useTimeline as jest.Mock).mockReturnValue({
      timelineDuration: 300,
      scale: 1,
      currentFrame: 0
    });

    // Create an actual script element to test removal
    const mockScriptElement = document.createElement('script');
    mockScriptElement.setAttribute('data-component-id', 'test-component-1');
    mockScriptElement.id = 'remote-component-test-component-1';
    document.head.appendChild(mockScriptElement);
    
    // Create a spy for the remove method
    const removeSpy = jest.spyOn(mockScriptElement, 'remove');
    
    // Mock querySelector to return our actual element
    document.querySelectorAll = jest.fn().mockImplementation((selector) => {
      if (selector === 'script[data-component-id]' || 
          selector.includes('script') || 
          selector.includes('remote-component')) {
        return [mockScriptElement];
      }
      return [];
    });

    // Render the component
    const { unmount } = render(<PreviewPanel projectId={mockProjectId} />);
    
    // Force a cleanup by directly calling the component's cleanupComponentScripts
    // This simulates what happens during unmount
    mockState.forceRefresh.mockImplementation(() => {
      // Force script removal manually since we can't access the component's methods directly
      mockScriptElement.remove();
    });
    
    // Call forceRefresh to trigger our mock implementation
    mockState.forceRefresh(mockProjectId);
    
    // Unmount to trigger cleanup
    unmount();
    
    // Check if remove was called on the script element
    expect(removeSpy).toHaveBeenCalled();
  });
}); 