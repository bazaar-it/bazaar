// src/client/components/test-harness/__tests__/AgentNetworkGraph.test.tsx

import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentNetworkGraph } from '../AgentNetworkGraph';

// Mock the useSSE hook to expose its callbacks
let sseHandlers: any = {};
jest.mock('~/client/hooks/sse/useSSE', () => ({
  useSSE: (options: any) => {
    sseHandlers = options;
    return { isConnected: true, error: null, connect: jest.fn(), disconnect: jest.fn() };
  }
}));

// Mock the tRPC api call for agent directory
const mockUseQuery = jest.fn();
jest.mock('~/trpc/react', () => ({
  api: {
    a2a: {
      getAgentDirectory: {
        useQuery: (...args: any[]) => mockUseQuery(...args)
      }
    }
  }
}));

const agents = [
  { name: 'CoordinatorAgent', description: 'coords', url: '/coord' },
  { name: 'BuilderAgent', description: 'builds', url: '/builder' }
];

beforeEach(() => {
  mockUseQuery.mockReturnValue({ data: agents, isLoading: false });
});

describe('AgentNetworkGraph SSE updates', () => {
  it('updates agent status to working on task status update', async () => {
    render(<AgentNetworkGraph taskId="task-1" />);

    const builderCard = screen.getByText('BuilderAgent').parentElement!.parentElement!;
    expect(within(builderCard).getByText('Idle')).toBeInTheDocument();

    act(() => {
      sseHandlers.onTaskStatusUpdate({
        type: 'task_status_update',
        data: { task_id: 'task-1', agentName: 'BuilderAgent', state: 'working' }
      });
    });

    await within(builderCard).findByText('Working');
    const indicator = builderCard.querySelector('div.rounded-full')!;
    expect(indicator.className).toContain('bg-yellow-500');
  });

  it('updates agent status to completed', async () => {
    render(<AgentNetworkGraph taskId="task-1" />);

    const builderCard = screen.getByText('BuilderAgent').parentElement!.parentElement!;

    act(() => {
      sseHandlers.onTaskStatusUpdate({
        type: 'task_status_update',
        data: { task_id: 'task-1', agentName: 'BuilderAgent', state: 'completed' }
      });
    });

    await within(builderCard).findByText('Completed');
    const indicator = builderCard.querySelector('div.rounded-full')!;
    expect(indicator.className).toContain('bg-green-500');
  });
});
