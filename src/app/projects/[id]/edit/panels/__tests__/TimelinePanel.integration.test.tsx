// src/app/projects/[id]/edit/panels/__tests__/TimelinePanel.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelinePanel from '../TimelinePanel';
import { SelectedSceneProvider } from '~/components/client/Timeline/SelectedSceneContext';

// Mock next/navigation hooks
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-project' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock video state store
jest.mock('~/stores/videoState', () => ({
  __esModule: true,
  useVideoState: () => ({
    getCurrentProps: () => ({
      scenes: [
        { id: '1', type: 'text', start: 0, duration: 30, data: { text: 'Hello' } },
      ],
      meta: { duration: 100 },
    }),
    applyPatch: jest.fn(),
  }),
}));

// Spy console.log
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('TimelinePanel integration', () => {
  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('renders and selects a timeline item on click', () => {
    render(
      <SelectedSceneProvider>
        <TimelinePanel />
      </SelectedSceneProvider>
    );

    // Header should render
    expect(screen.getByText('Timeline')).toBeInTheDocument();

    // Timeline item with content 'Hello' should render
    const item = screen.getByText('Hello');
    expect(item).toBeInTheDocument();

    // Click the timeline item
    fireEvent.click(item);

    // Should log selection
    expect(consoleLogSpy).toHaveBeenCalledWith('Selected: text scene');
  });
});
