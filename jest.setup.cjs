// jest.setup.js
// This file is run after the test environment is set up but before any tests run

// Import test libraries - using CommonJS require
require('@testing-library/jest-dom');

// Ensure jest.setTimeout is set globally for all tests
jest.setTimeout(30000);

// Set up fake timers globally
beforeEach(() => {
  // Use fake timers by default in all tests
  jest.useFakeTimers();
});

afterEach(() => {
  // Clear all mocks and restore timers
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Load environment variables for tests
require('dotenv').config({ path: '.env.test.local' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.test' });
require('dotenv').config({ path: '.env' });

// Mock Headers, Request, Response classes for tests
class MockHeaders {
  constructor(init) {
    this.headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }
  
  append(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }
  
  delete(name) {
    this.headers.delete(name.toLowerCase());
  }
  
  get(name) {
    return this.headers.get(name.toLowerCase()) || null;
  }
  
  has(name) {
    return this.headers.has(name.toLowerCase());
  }
  
  set(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }
  
  forEach(callback) {
    this.headers.forEach((value, key) => callback(value, key, this));
  }
}

// Make Headers available globally
global.Headers = MockHeaders;

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new MockHeaders(),
    redirected: false,
    url: 'https://example.com',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: function() { return this; },
  })
);

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
  if (!window.URL) window.URL = {};
  window.URL.createObjectURL = jest.fn(() => 'mock-object-url');
  window.URL.revokeObjectURL = jest.fn();
}

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(() => Promise.resolve({ user: { name: 'Test User' } })),
}));

// Mock server-only
jest.mock('server-only', () => ({}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((param) => null),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
  })),
  usePathname: jest.fn(() => '/test'),
  redirect: jest.fn(),
}));

// Mock useUser, useStackApp from @stackframe/stack without requiring the module
jest.mock('@stackframe/stack', () => {
  return {
    useUser: jest.fn(() => null),
    useStackApp: jest.fn(() => ({})),
    SignIn: jest.fn(() => null),
    SignUp: jest.fn(() => null),
    UserButton: jest.fn(() => null),
    OAuthButtonGroup: jest.fn(() => null),
    MagicLinkSignIn: jest.fn(() => null),
    CredentialSignIn: jest.fn(() => null),
  };
}, { virtual: true }); // Use virtual: true to avoid requiring the actual module

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-cookie' })),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(() => 'test-header'),
    has: jest.fn(() => true),
    entries: jest.fn(() => [['content-type', 'application/json']]),
  })),
}));

// For ResizeObserver (used in many UI components)
global.ResizeObserver = class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// SSE Mock
global.EventSource = class MockEventSource {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.onopen = null;
    this.readyState = MockEventSource.CONNECTING;
    
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  addEventListener(type, listener) {
    if (type === 'message') this.onmessage = listener;
    if (type === 'error') this.onerror = listener;
    if (type === 'open') this.onopen = listener;
  }
  
  removeEventListener(type, listener) {
    if ((type === 'message' && this.onmessage === listener) ||
        (type === 'error' && this.onerror === listener) ||
        (type === 'open' && this.onopen === listener)) {
      if (type === 'message') this.onmessage = null;
      if (type === 'error') this.onerror = null;
      if (type === 'open') this.onopen = null;
    }
  }
  
  close() {
    this.readyState = MockEventSource.CLOSED;
  }
  
  // Add standard EventSource props
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
};

// Mock Window Worker
global.Worker = class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }
  
  postMessage(data) {
    if (this.onmessage) {
      const event = { data, target: this, currentTarget: this };
      this.onmessage(event);
    }
  }
  
  terminate() {}
  
  addEventListener(type, listener) {
    if (type === 'message') this.onmessage = listener;
    if (type === 'error') this.onerror = listener;
    if (type === 'messageerror') this.onmessageerror = listener;
  }
  
  removeEventListener(type, listener) {
    if ((type === 'message' && this.onmessage === listener) ||
        (type === 'error' && this.onerror === listener) ||
        (type === 'messageerror' && this.onmessageerror === listener)) {
      if (type === 'message') this.onmessage = null;
      if (type === 'error') this.onerror = null;
      if (type === 'messageerror') this.onmessageerror = null;
    }
  }
  
  dispatchEvent() { return true; }
};

// Mock React hooks for when we test on server components
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    cache: jest.fn((fn) => fn),
    useEffect: jest.fn((fn) => fn()),
    useRef: jest.fn(() => ({ current: null })),
    useState: jest.fn((init) => [init, jest.fn()]),
  };
});

// Set dummy environment variables
process.env.OPENAI_API_KEY = 'dummy-openai-key-for-testing';
process.env.AWS_ACCESS_KEY_ID = 'dummy-aws-key-for-testing';
process.env.AWS_SECRET_ACCESS_KEY = 'dummy-aws-secret-for-testing';
process.env.REMOTION_SAMPLE_COMP_NAME = 'TestComp';

// Fix issues with TextEncoder/TextDecoder if running in Node environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Define a mock Blob constructor if it doesn't exist
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options = {}) {
      this.parts = parts || [];
      this.type = options.type || '';
      this.size = (parts || []).reduce((acc, part) => acc + (part.length || 0), 0);
    }
    
    slice(start, end, contentType) {
      return new Blob();
    }
    
    text() {
      return Promise.resolve('');
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// Mock the console.error to avoid noise in test output
const originalConsoleError = console.error;
console.error = function(...args) {
  // Filter out React DOM warnings, etc. that pollute test output
  if (
    args[0] && typeof args[0] === 'string' && 
    (
      args[0].includes('Warning: Invalid DOM property') ||
      args[0].includes('Warning: ReactDOM.render has been deprecated') ||
      args[0].includes('Warning: React does not recognize') ||
      args[0].includes('Warning: Unknown event') ||
      args[0].includes('Warning: validateDOMNesting')
    )
  ) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

// Set required environment variables for tests
process.env.AUTH_GITHUB_ID = 'test-github-id';
process.env.AUTH_GITHUB_SECRET = 'test-github-secret';
process.env.AUTH_GOOGLE_ID = 'test-google-id';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DATABASE_URL_NON_POOLED = 'postgresql://test:test@localhost:5432/test';
process.env.R2_ENDPOINT = 'https://test-endpoint.com';
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_PUBLIC_URL = 'https://test-bucket.example.com';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-anon-key-for-testing';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key-for-testing';
process.env.REMOTION_LAMBDA_FUNCTION_NAME = 'dummy-function-name-for-testing';
process.env.REMOTION_SAMPLE_COMP_NAME = 'TestComp'; 