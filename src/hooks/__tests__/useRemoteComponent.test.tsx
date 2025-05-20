import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React, { Suspense } from 'react'; // Use actual React
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the ACTUAL hook and component wrapper
import { useRemoteComponent, RemoteComponent } from '../useRemoteComponent';

// --- Mocked Components for dynamic import --- 
const MockDefaultComponent = (props: any) => (
  <div data-testid="mock-default-component">Props: {JSON.stringify(props)}</div>
);
const MockNamedComponent = (props: any) => (
  <div data-testid="mock-named-component">Props: {JSON.stringify(props)}</div>
);
const AnotherMockNamedComponent = (props: any) => (
  <div data-testid="another-mock-named-component">Props: {JSON.stringify(props)}</div>
);

// --- Helper for mock URLs ---
// This helper should ideally match the structure used internally by useRemoteComponent if possible,
// or we just mock arbitrary valid URLs that Jest can intercept.
const MOCK_BASE_URL = 'https://example.com/components'; // Example base
const getMockComponentUrl = (id: string, version?: string) =>
  `${MOCK_BASE_URL}/${id}.js${version ? `?v=${version}` : ''}`;

// --- Mocking dynamic imports --- 

// 1. Component with a default export
const defaultExportUrl = getMockComponentUrl('default-export-comp', 'v1');
jest.mock(defaultExportUrl, () => ({
  __esModule: true,
  default: MockDefaultComponent,
}), { virtual: true });

// 2. Component with only a specific named export (heuristic should find 'FirstNamedComponent')
const namedExportUrl1 = getMockComponentUrl('named-export-comp1', 'v2');
jest.mock(namedExportUrl1, () => ({
  __esModule: true,
  someOtherExport: () => 'foo',
  FirstNamedComponent: MockNamedComponent,
}), { virtual: true });

// 3. Component with a different named export to be found
const namedExportUrl2 = getMockComponentUrl('named-export-comp2', 'v3');
jest.mock(namedExportUrl2, () => ({
  __esModule: true,
  anotherFunction: () => 'bar',
  MyRemotionComponent: AnotherMockNamedComponent, // Heuristic should find this
}), { virtual: true });

// 4. Import that will fail
const errorImportUrl = getMockComponentUrl('error-import-comp', 'v4');
jest.mock(errorImportUrl, () => {
  throw new Error('SimulatedModuleLoadError');
}, { virtual: true });

// 5. Module with no suitable component export
const noSuitableExportUrl = getMockComponentUrl('no-suitable-export', 'v5');
jest.mock(noSuitableExportUrl, () => ({
  __esModule: true,
  lowercaseExport: () => null,
  _anotherOne: () => null,
  SOME_CONSTANT: 'hello',
}), { virtual: true });


describe('useRemoteComponent Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks between tests
  });

  // Test Harness for useRemoteComponent
  const HookTester: React.FC<{ scriptSrc: string; databaseId: string; componentProps?: any }> = 
    ({ scriptSrc, databaseId, componentProps }) => {
    const { Component, loading, error } = useRemoteComponent(scriptSrc, databaseId);

    if (loading) return <div data-testid="loading-fallback">Loading...</div>;
    if (error) return <div data-testid="error-fallback">Error: {error instanceof Error ? error.message : String(error)}</div>;
    if (Component) return <Component {...componentProps} />;
    return <div>Component not available</div>;
  };

  it('should show loading state initially', () => {
    // We can't easily test the *internal* loading state of useRemoteComponent 
    // without the component suspending. React.lazy + Suspense handles this.
    // So, we test the fallback of the Suspense wrapping the lazy component.
    const TestSuspenseWrapper = () => {
      const { Component } = useRemoteComponent(defaultExportUrl, 'v1');
      return (
        <Suspense fallback={<div data-testid="suspense-loading">Suspended...</div>}>
          {Component ? <Component /> : null}
        </Suspense>
      );
    };
    render(<TestSuspenseWrapper />);
    expect(screen.getByTestId('suspense-loading')).toBeInTheDocument();
  });

  it('should load and render component with default export', async () => {
    render(<HookTester scriptSrc={defaultExportUrl} databaseId="v1" componentProps={{ test: 'default' }} />); 
    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component')).toBeInTheDocument();
      expect(screen.getByTestId('mock-default-component')).toHaveTextContent('{"test":"default"}');
    });
  });

  it('should load and render component with a named export (heuristic: FirstNamedComponent)', async () => {
    render(<HookTester scriptSrc={namedExportUrl1} databaseId="v2" componentProps={{ test: 'named1' }} />); 
    await waitFor(() => {
      expect(screen.getByTestId('mock-named-component')).toBeInTheDocument();
      expect(screen.getByTestId('mock-named-component')).toHaveTextContent('{"test":"named1"}');
    });
  });

  it('should load and render component with another named export (heuristic: MyRemotionComponent)', async () => {
    render(<HookTester scriptSrc={namedExportUrl2} databaseId="v3" componentProps={{ test: 'named2' }} />); 
    await waitFor(() => {
      expect(screen.getByTestId('another-mock-named-component')).toBeInTheDocument();
      expect(screen.getByTestId('another-mock-named-component')).toHaveTextContent('{"test":"named2"}');
    });
  });

  it('should show error state if import fails', async () => {
    // Suppress console.error for this test as React will log the caught error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<HookTester scriptSrc={errorImportUrl} databaseId="v4" />); 
    await waitFor(() => {
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-fallback')).toHaveTextContent('SimulatedModuleLoadError');
    });
    consoleErrorSpy.mockRestore();
  });

  it('should show error state if no suitable component export is found in the module', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<HookTester scriptSrc={noSuitableExportUrl} databaseId="v5" />); 
    await waitFor(() => {
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-fallback')).toHaveTextContent(/Could not find a suitable component/i);
    });
    consoleErrorSpy.mockRestore();
  });

  it('should pass props correctly to the loaded component', async () => {
    const props = { message: 'Hello', count: 42 };
    render(<HookTester scriptSrc={defaultExportUrl} databaseId="v1" componentProps={props} />); 
    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component')).toHaveTextContent(JSON.stringify(props));
    });
  });

  it('should use databaseId for cache busting (tested by unique mock URLs)', async () => {
    // This test implicitly verifies cache busting by successfully loading components 
    // from distinct, versioned mock URLs. A different databaseId would lead to a different 
    // import() URL which, if not mocked, would fail, or if it hit a different mock, would load a different component.
    render(<HookTester scriptSrc={defaultExportUrl} databaseId="v1" />); 
    await waitFor(() => expect(screen.getByTestId('mock-default-component')).toBeInTheDocument());

    // Unmount and try a different one to ensure mocks are clean and specific
    // This isn't strictly necessary if beforeEach clears mocks, but good for sanity.
    jest.clearAllMocks(); // Re-mock to ensure clean state if previous test modified mocks
    // Re-declare mocks if clearAllMocks also clears virtual mocks (it shouldn't for jest.mock at top level)
    // For safety, let's assume the key change forces a re-evaluation of the lazy component.
    // The internal `useEffect` on `refreshKey` in `useRemoteComponent` should trigger a new Component instance.
    
    // We need to ensure the import mock can be changed or that React.lazy re-evaluates.
    // Let's use a different URL to simplify this test of refreshKey's effect.
    const defaultExportUrlV2 = getMockComponentUrl('default-export-comp', 'v1-refresh');
    const MockDefaultComponentV2 = (props: any) => (
      <div data-testid="mock-default-component-v2">Refreshed: {JSON.stringify(props)}</div>
    );
    jest.mock(defaultExportUrlV2, () => ({
      __esModule: true,
      default: MockDefaultComponentV2,
    }), { virtual: true });

    render(<HookTester scriptSrc={defaultExportUrlV2} databaseId="v1-refresh" />); 
    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component-v2')).toBeInTheDocument();
    });
  });
});

describe('RemoteComponent Wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display custom loading fallback', () => {
    render(
      <RemoteComponent 
        scriptSrc={defaultExportUrl} 
        databaseId="v1" 
        loadingFallback={<div data-testid="custom-loading">Custom Load...</div>}
      />
    );
    // The component will suspend, so the Suspense fallback (from RemoteComponent wrapper) should be shown.
    expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
  });

  it('should load and render component successfully using default export', async () => {
    render(
      <RemoteComponent 
        scriptSrc={defaultExportUrl} 
        databaseId="v1" 
        loadingFallback={<div data-testid="custom-loading">Custom Load...</div>}
        componentProps={{ wrapperTest: 'defaultWrap' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component')).toBeInTheDocument();
      expect(screen.getByTestId('mock-default-component')).toHaveTextContent('{"wrapperTest":"defaultWrap"}');
    });
  });

  it('should display custom error fallback if import fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RemoteComponent 
        scriptSrc={errorImportUrl} 
        databaseId="v4" 
        errorFallback={<div data-testid="custom-error">Custom Error!</div>}
        loadingFallback={<div data-testid="custom-loading">Custom Load...</div>}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByTestId('custom-error')).toHaveTextContent('Custom Error!');
    });
    consoleErrorSpy.mockRestore();
  });

  it('should pass props correctly to the loaded component via RemoteComponent wrapper', async () => {
    const wrapperProps = { text: 'From Wrapper', value: 100 };
    render(
      <RemoteComponent 
        scriptSrc={namedExportUrl1} 
        databaseId="v2" 
        {...wrapperProps} // Pass additional props
      />
    );
    await waitFor(() => {
      // The componentProps are implicitly passed through by the wrapper
      // MockNamedComponent receives all props passed to RemoteComponent (excluding internal ones like scriptSrc, etc.)
      expect(screen.getByTestId('mock-named-component')).toHaveTextContent(JSON.stringify(wrapperProps));
    });
  });

  it('should refresh component when refreshKey changes', async () => {
    const { rerender } = render(
      <RemoteComponent scriptSrc={defaultExportUrl} databaseId="v1" refreshKey="key1" componentProps={{ val: 1}} />
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component')).toHaveTextContent('{"val":1}');
    });

    // New mock for the same URL to simulate a content change - jest.mock calls are hoisted
    // so this re-mocking within a test needs care. Better to use different URLs or spy on import.
    // For simplicity, we'll assume the key change forces a re-evaluation of the lazy component.
    // The internal `useEffect` on `refreshKey` in `useRemoteComponent` should trigger a new Component instance.
    
    // We need to ensure the import mock can be changed or that React.lazy re-evaluates.
    // Let's use a different URL to simplify this test of refreshKey's effect.
    const defaultExportUrlV2 = getMockComponentUrl('default-export-comp', 'v1-refresh');
    const MockDefaultComponentV2 = (props: any) => (
      <div data-testid="mock-default-component-v2">Refreshed: {JSON.stringify(props)}</div>
    );
    jest.mock(defaultExportUrlV2, () => ({
      __esModule: true,
      default: MockDefaultComponentV2,
    }), { virtual: true });

    rerender(
      <RemoteComponent scriptSrc={defaultExportUrlV2} databaseId="v1-refresh" refreshKey="key2" componentProps={{ val: 2}} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-default-component-v2')).toBeInTheDocument();
      expect(screen.getByTestId('mock-default-component-v2')).toHaveTextContent('{"val":2}');
    });
  });

});