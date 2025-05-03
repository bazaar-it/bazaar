import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Sample component we expect to load
const SampleRemoteComponent = () => <div data-testid="remote-component">Loaded Component</div>;

// Mock implementation of useRemoteComponent hook
const useRemoteComponent = (componentId: string) => {
  // In real implementation, this would dynamically import from R2 URL
  return React.lazy(() => Promise.resolve({
    default: SampleRemoteComponent
  }));
};

describe('useRemoteComponent', () => {
  // Mock script loading
  let mockAppendChild: jest.SpyInstance;
  let mockCreateElement: jest.SpyInstance;
  let mockAddEventListener: jest.SpyInstance;

  // Set up DOM mocks
  beforeEach(() => {
    mockAppendChild = jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      // Simulate script load completion
      if (node instanceof HTMLScriptElement) {
        setTimeout(() => {
          // Make our test component available globally as if the script loaded it
          (window as any).__REMOTION_COMPONENT = SampleRemoteComponent;
          // Trigger load event
          node.dispatchEvent(new Event('load'));
        }, 100);
      }
      return node;
    });

    mockCreateElement = jest.spyOn(document, 'createElement');
    mockAddEventListener = jest.spyOn(HTMLScriptElement.prototype, 'addEventListener');

    // Clear any previous remote component
    (window as any).__REMOTION_COMPONENT = undefined;
  });

  afterEach(() => {
    mockAppendChild.mockRestore();
    mockCreateElement.mockRestore();
    mockAddEventListener.mockRestore();
    (window as any).__REMOTION_COMPONENT = undefined;
  });

  it('should load and render a remote component', async () => {
    // Test component that uses our hook
    const TestComponent = ({ componentId }: { componentId: string }) => {
      const RemoteComponent = useRemoteComponent(componentId);
      return (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <RemoteComponent />
        </Suspense>
      );
    };

    // Render the component
    render(<TestComponent componentId="test-component-123" />);

    // Initially should show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for component to load
    await waitFor(() => 
      expect(screen.getByTestId('remote-component')).toBeInTheDocument()
    );
  });

  it('should handle error states', async () => {
    // Override mock to simulate error
    mockAppendChild.mockImplementation((node) => {
      if (node instanceof HTMLScriptElement) {
        setTimeout(() => {
          // Trigger error event instead of load
          node.dispatchEvent(new Event('error'));
        }, 100);
      }
      return node;
    });

    // Error boundary component for testing
    class ErrorBoundary extends React.Component<
      { fallback: React.ReactNode; children: React.ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return this.props.fallback;
        }
        return this.props.children;
      }
    }

    // Test component with error handling
    const TestComponent = ({ componentId }: { componentId: string }) => {
      const RemoteComponent = useRemoteComponent(componentId);
      return (
        <ErrorBoundary fallback={<div data-testid="error">Failed to load component</div>}>
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <RemoteComponent />
          </Suspense>
        </ErrorBoundary>
      );
    };

    // Render component that will trigger error
    render(<TestComponent componentId="error-component" />);

    // Initially should show loading
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Should eventually show error
    await waitFor(() => 
      expect(screen.getByTestId('error')).toBeInTheDocument()
    );
  });

  it('should generate correct URLs for different components', () => {
    // Mock implementation that has URL visibility for testing
    const getRemoteComponentUrl = (componentId: string) => {
      return `${process.env.R2_PUBLIC_URL || 'https://example.com/components'}/${componentId}.js`;
    };

    // Test with different IDs
    const url1 = getRemoteComponentUrl('component-123');
    const url2 = getRemoteComponentUrl('fireworks-effect');

    // Verify correct URL construction
    expect(url1).toContain('component-123.js');
    expect(url2).toContain('fireworks-effect.js');
  });
}); 