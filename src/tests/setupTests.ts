// src/tests/setupTests.ts
// Setup file for Jest tests

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock fetch globally
global.fetch = jest.fn();

// Add TextEncoder/TextDecoder to the global scope
global.TextEncoder = TextEncoder;
// @ts-ignore - Type issues with NodeJS TextDecoder vs DOM TextDecoder
global.TextDecoder = TextDecoder;

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [0],
}));

// Mock console.error for cleaner test output
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out certain React-specific warnings
  if (typeof args[0] === 'string' && 
      (args[0].includes('Warning: ReactDOM.render') || 
       args[0].includes('Warning: React.createElement'))) {
    return;
  }
  originalConsoleError(...args);
};

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});

// Server mock
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => ({ status: 200, body: JSON.stringify(data) })),
    redirect: jest.fn((url) => ({ status: 302, headers: { Location: url } })),
  },
}));

// Router mock
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/test-path'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// tRPC mock
jest.mock('~/utils/api', () => ({
  api: {
    chat: {
      // Mock trpc chat procedures
      streamResponse: {
        useSubscription: jest.fn(),
      },
      sendMessage: {
        useMutation: jest.fn(() => ({
          mutateAsync: jest.fn(),
          isLoading: false,
        })),
      },
    },
    llm: {
      // Mock LLM related procedures
      generateComponent: {
        useMutation: jest.fn(() => ({
          mutateAsync: jest.fn(),
          isLoading: false,
        })),
      },
    },
    remotion: {
      // Mock Remotion rendering procedures
      renderComposition: {
        useMutation: jest.fn(() => ({
          mutateAsync: jest.fn(),
          isLoading: false,
        })),
      },
    },
  },
})); 