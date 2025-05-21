// src/remotion/components/scenes/__tests__/CustomScene.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CustomScene } from '../CustomScene';
import type { CustomSceneProps } from '../CustomScene';
import { RemoteComponent as MockedNamedRemoteComponent } from '~/hooks/useRemoteComponent'; 

jest.mock('~/hooks/useRemoteComponent', () => ({
  RemoteComponent: jest.fn(({ scriptSrc, brief, databaseId, componentProps, ...rest }) => {
    console.log('[Mocked RemoteComponent (actual component CustomScene renders)] Props Received:', {
      scriptSrc,
      brief,
      databaseId,
      componentProps,
      rest
    });
    if (scriptSrc && brief && brief.id) { 
      return <div data-testid="mock-remote-component-rendered">Remote Component for {databaseId} with brief {brief.id}</div>;
    }
    return <div>MockedNamedRemoteComponent: Waiting for valid props (scriptSrc, brief with id)</div>;
  }),
}));

const baseComponentId = 'test-component-id';

const defaultDataProps: CustomSceneProps['data'] = {
  componentId: baseComponentId,
  src: 'path/to/remote/script.js', 
  componentProps: { textProp: 'Hello from data' },
};

interface MockSceneConfig {
  durationInFrames: number;
  [key: string]: any;
}

interface MockAnimationDesignBrief {
  id: string;
  title: string;
  scenes: Array<{ sceneName?: string; sceneConfig: MockSceneConfig }>;
  [key: string]: any;
}

global.fetch = jest.fn();

const mockFetchImplementation = (
  metadataResult: object | Error = { animationDesignBriefId: 'adb-123-test', componentId: baseComponentId, config: { scenesConfig: 'loaded' } },
  adbResult: object | Error = { designBrief: { id: 'adb-123-test', title: 'Test ADB Title From Mock', scenes: [{ sceneName: 'Scene1', sceneConfig: { durationInFrames: 100 } }] } }
) => {
  (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
    console.log(`[Mock Fetch] URL: ${url}, Options:`, options);
    if (url.includes(`/api/components/${baseComponentId}/metadata`)) {
      if (metadataResult instanceof Error) {
        console.log('[Mock Fetch] Returning metadata error');
        return Promise.reject(metadataResult);
      }
      console.log('[Mock Fetch] Returning metadata:', metadataResult);
      return Promise.resolve({
        ok: true, status: 200, json: () => Promise.resolve(metadataResult),
        text: () => Promise.resolve(JSON.stringify(metadataResult)),
      });
    } else if (url.includes('/api/animation-design-briefs/')) {
      if (adbResult instanceof Error) {
        console.log('[Mock Fetch] Returning ADB error');
        return Promise.reject(adbResult);
      }
      console.log('[Mock Fetch] Returning ADB data:', adbResult);
      return Promise.resolve({
        ok: true, status: 200, json: () => Promise.resolve(adbResult),
        text: () => Promise.resolve(JSON.stringify(adbResult)),
      });
    }
    console.warn(`[Mock Fetch] URL not mocked: ${url}`);
    return Promise.reject(new Error(`URL not mocked: ${url}`));
  });
};

describe('CustomScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MockedNamedRemoteComponent as jest.Mock).mockImplementation(({ brief, componentProps, onStateChange, ...rest }: any) => {
      console.log('[Default MockedNamedRemoteComponent in beforeEach] Props Received:', {
        briefId: brief?.id,
        briefTitle: brief?.title,
        textProp: componentProps?.textProp,
        error: rest.error,
        isLoading: rest.isLoading,
        componentName: rest.componentName,
        scriptSrc: rest.scriptSrc,
      });

      if (rest.error) {
        console.log('[Default MockedNamedRemoteComponent in beforeEach] Rendering: Error UI based on rest.error');
        return <div>Error in MockedRemote: {String(rest.error)}</div>;
      }
      if (rest.isLoading) { 
        console.log('[Default MockedNamedRemoteComponent in beforeEach] Rendering: Loading UI based on rest.isLoading (script loading)');
        return <div>Loading MockedRemote (script)...</div>;
      }

      const hasBriefId = !!brief?.id;
      const hasBriefTitle = !!brief?.title;
      const hasTextProp = !!componentProps?.textProp;

      if (hasBriefId && hasBriefTitle && hasTextProp) {
        console.log('[Default MockedNamedRemoteComponent in beforeEach] Rendering: Success UI');
        onStateChange?.({ state: 'loaded' });
        return (
          <div data-testid="mock-loaded-component">
            Mock Loaded: {componentProps.textProp}, Brief: {brief.title}
          </div>
        );
      }
      
      console.log('[Default MockedNamedRemoteComponent in beforeEach] Rendering: Fallback UI. Conditions:', { hasBriefId, hasBriefTitle, hasTextProp, receivedBrief: brief, receivedComponentProps: componentProps });
      if (!hasBriefId || !hasBriefTitle) {
        onStateChange?.({ state: 'error', error: new Error('Missing brief data in mock') });
        return <div>MockedNamedRemoteComponent: Fallback - Missing brief.id or brief.title</div>;
      }
      if (!hasTextProp) {
        onStateChange?.({ state: 'error', error: new Error('Missing textProp in mock') });
        return <div>MockedNamedRemoteComponent: Fallback - Missing componentProps.textProp</div>;
      }
      
      onStateChange?.({ state: 'error', error: new Error('Unknown state in mock') });
      return <div>MockedNamedRemoteComponent: Fallback - Unknown state (should not happen)</div>;
    });
  });

  it('should render loading state initially when fetching metadata', async () => {
    let resolveMetadataPromise: (value: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url.includes('/api/components')) {
        console.log('[Loading Test Mock Fetch] Metadata fetch started, delaying resolution...');
        return new Promise((resolve) => {
          resolveMetadataPromise = resolve; 
        });
      }
      return Promise.reject(new Error('Unexpected fetch call in loading test'));
    });

    render(<CustomScene data={defaultDataProps} id="scene1" defaultProps={{}} />); 
    expect(screen.getByText(/Loading Component Data/i)).toBeInTheDocument();
    expect(screen.getByText(`Component ID: ${baseComponentId.substring(0, 8)}...`)).toBeInTheDocument();

    act(() => {
      resolveMetadataPromise({
        ok: true, status: 200, json: () => Promise.resolve({ animationDesignBriefId: 'adb-delayed' })
      });
    });
  });

  it('should render remote component when loaded successfully', async () => {
    mockFetchImplementation(); 
    
    const MockLoadedUserComponent = ({ textProp, brief }: { textProp: string, brief: MockAnimationDesignBrief }) => (
      <div data-testid="mock-loaded-component">Mock Loaded: {textProp}, Brief: {brief.title}</div>
    );
    (MockedNamedRemoteComponent as jest.Mock).mockImplementation(({ scriptSrc, brief, databaseId, componentProps }) => {
      console.log('[Success Test - MockedNamedRemoteComponent] Props:', { scriptSrc, brief, databaseId, componentProps });
      if (scriptSrc && brief && brief.id) {
        return <MockLoadedUserComponent {...componentProps} brief={brief} />;
      }
      return <div>MockedNamedRemoteComponent: Missing props for success</div>;
    });

    render(<CustomScene data={{...defaultDataProps, componentProps: { textProp: 'Hello from data' }}} id="scene1" defaultProps={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-loaded-component')).toBeInTheDocument();
      expect(screen.getByText('Mock Loaded: Hello from data, Brief: Test ADB Title From Mock')).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/components/${baseComponentId}/metadata`), expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/animation-design-briefs/adb-123-test'), undefined);
  });

  it('should render error state when remote component fails to load due to metadata fetch failure', async () => {
    mockFetchImplementation(new Error('Metadata fetch failed'));

    render(<CustomScene data={defaultDataProps} id="scene1" defaultProps={{}} />);

    await waitFor(() => {
      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
      expect(screen.getByText('Metadata fetch failed')).toBeInTheDocument(); 
    });
  });
  
  it('should render error state when remote component fails to load due to ADB fetch failure', async () => {
    mockFetchImplementation(
      { animationDesignBriefId: 'adb-for-error-test', componentId: baseComponentId }, 
      new Error('ADB fetch failed') 
    );

    render(<CustomScene data={defaultDataProps} id="scene1" defaultProps={{}} />);

    await waitFor(() => {
      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
      expect(screen.getByText('ADB fetch failed')).toBeInTheDocument();
    });
  });

  it('should attempt to refresh component when refreshToken changes', async () => {
    mockFetchImplementation(
      { animationDesignBriefId: 'adb-initial-refresh', componentId: baseComponentId },
      { designBrief: { id: 'adb-initial-refresh', title: 'Initial ADB for Refresh', scenes: [{ sceneConfig: {durationInFrames: 10} }] } }
    );
    (MockedNamedRemoteComponent as jest.Mock).mockImplementation(({ brief, componentProps }) => 
      <div data-testid="refreshed-content">Brief Title: {brief.title}, Prop: {componentProps.textProp}</div>
    );

    const { rerender } = render(<CustomScene data={defaultDataProps} id="scene1" defaultProps={{}} />); 
    await waitFor(() => expect(screen.getByText('Brief Title: Initial ADB for Refresh, Prop: Hello from data')).toBeInTheDocument());

    const refreshedAdbData = { designBrief: { id: 'adb-refreshed', title: 'Refreshed ADB', scenes: [{ sceneConfig: {durationInFrames: 20} }] } };
    mockFetchImplementation(
      { animationDesignBriefId: 'adb-refreshed', componentId: baseComponentId }, 
      refreshedAdbData
    );

    const newDataPropsWithRefresh: CustomSceneProps['data'] = {
      ...defaultDataProps,
      refreshToken: 'new-token-123',
      componentProps: {textProp: 'Refreshed Hello'}
    };
    rerender(<CustomScene data={newDataPropsWithRefresh} id="scene1" defaultProps={{}} />); 

    await waitFor(() => {
      expect(screen.getByText('Brief Title: Refreshed ADB, Prop: Refreshed Hello')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/components/${baseComponentId}/metadata`), expect.any(Object)); 
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/animation-design-briefs/adb-refreshed'), undefined);
  });

  it('should retry fetching data when retry button is clicked after an error', async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1 && url.includes('/api/components')) {
        console.log('[Retry Test Mock Fetch] First metadata call - failing');
        return Promise.reject(new Error('Initial metadata load failure'));
      }
      if (callCount === 2 && url.includes('/api/components')) {
        console.log('[Retry Test Mock Fetch] Second metadata call (after retry) - succeeding');
        return Promise.resolve({ 
          ok: true, status: 200, json: () => Promise.resolve({ animationDesignBriefId: 'adb-after-retry' })
        });
      }
      if (url.includes('/api/animation-design-briefs/adb-after-retry')) {
        console.log('[Retry Test Mock Fetch] ADB call after successful retry - succeeding');
        return Promise.resolve({ 
          ok: true, status: 200, json: () => Promise.resolve({ designBrief: { id: 'adb-after-retry', title: 'ADB After Retry', scenes: [] } })
        });
      }
      return Promise.reject(new Error(`Unexpected fetch in retry test: ${url} (call ${callCount})`));
    });

    (MockedNamedRemoteComponent as jest.Mock).mockImplementation(({ brief, componentProps }) => 
      <div data-testid="retry-success-content">Retried Brief: {brief.title}</div>
    );

    render(<CustomScene data={defaultDataProps} id="scene1" defaultProps={{}} />);

    await waitFor(() => expect(screen.getByText('Initial metadata load failure')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Retry Loading/i })).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /Retry Loading/i }).click();
    });
    
    await waitFor(() => expect(screen.getByTestId('retry-success-content')).toBeInTheDocument());
    expect(screen.getByText('Retried Brief: ADB After Retry')).toBeInTheDocument();
    
    expect(global.fetch).toHaveBeenCalledTimes(3); 
  });

});
