// jest.setup.js - Jest setup file 
require('@testing-library/jest-dom');
require('jest-extended');

// Add OpenAI Node.js shim for tests
require('openai/shims/node');

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DATABASE_URL_NON_POOLED = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'test-secret-that-is-definitely-longer-than-32-characters-for-security';
process.env.AUTH_GITHUB_ID = 'test-github-id';
process.env.AUTH_GITHUB_SECRET = 'test-github-secret';
process.env.AUTH_GOOGLE_ID = 'test-google-id';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret';
process.env.R2_ENDPOINT = 'https://test.r2.dev';
process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_PUBLIC_URL = 'https://test.r2.dev';
process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket';
process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account';
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-r2-key';
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-r2-secret';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock';

// Global test utilities
global.console = {
  ...console,
  // Suppress specific console methods during tests
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock browser URL API for Blob tests
global.URL = {
  ...URL,
  createObjectURL: jest.fn((blob) => {
    return `blob:http://localhost:3000/${Math.random().toString(36).substr(2, 9)}`;
  }),
  revokeObjectURL: jest.fn()
};

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
}));

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ 
            message: { 
              content: 'Mock AI response',
              role: 'assistant'
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn().mockImplementation((payload) => ({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: payload }
      }))
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ 
          id: 'cs_test',
          url: 'https://checkout.stripe.com/test' 
        })
      }
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' })
    }
  }));
});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(),
  InvokeCommand: jest.fn()
}));

// Mock legacy aws-sdk only if a test tries to import it
jest.mock('aws-sdk', () => ({
  config: {
    update: jest.fn(),
    credentials: null
  },
  Lambda: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ StatusCode: 200 })
    })
  })),
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  }))
}), { virtual: true });

jest.mock('playwright-core', () => ({
  chromium: {
    connectOverCDP: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
          evaluate: jest.fn().mockResolvedValue({
            title: 'Mock Website',
            colors: ['#000000']
          }),
          close: jest.fn()
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});