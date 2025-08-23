/**
 * Mock External Services for Testing
 * Provides mock implementations of external APIs to avoid real API calls during tests
 */

// Mock OpenAI Service
export const mockOpenAI = {
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
};

// Mock Stripe
export const mockStripe = {
  webhooks: {
    constructEvent: jest.fn((payload, sig, secret) => {
      // Return mock event
      return {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            metadata: {
              userId: 'user_test_123',
              credits: '100'
            }
          }
        }
      };
    })
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      })
    }
  },
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_123'
    })
  }
};

// Mock AWS S3/Lambda
export const mockAWS = {
  S3: class {
    putObject() {
      return {
        promise: () => Promise.resolve({ ETag: 'test-etag' })
      };
    }
    getObject() {
      return {
        promise: () => Promise.resolve({ 
          Body: Buffer.from('test-content'),
          ContentType: 'video/mp4'
        })
      };
    }
  },
  Lambda: class {
    invoke() {
      return {
        promise: () => Promise.resolve({
          StatusCode: 200,
          Payload: JSON.stringify({ 
            renderId: 'test-render-123',
            outputUrl: 'https://test-bucket.s3.amazonaws.com/test-video.mp4'
          })
        })
      };
    }
  }
};

// Mock Cloudflare R2
export const mockR2 = {
  upload: jest.fn().mockResolvedValue({
    url: 'https://test.r2.dev/test-file.mp4',
    key: 'test-file.mp4'
  }),
  download: jest.fn().mockResolvedValue(Buffer.from('test-content')),
  delete: jest.fn().mockResolvedValue(true),
  list: jest.fn().mockResolvedValue([
    { key: 'file1.mp4', size: 1024 },
    { key: 'file2.mp4', size: 2048 }
  ])
};

// Mock Puppeteer/Playwright for web scraping
export const mockBrowser = {
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      evaluate: jest.fn().mockResolvedValue({
        title: 'Mock Website',
        description: 'Mock description',
        colors: ['#FF6B00', '#1A1A1A'],
        fonts: ['Inter', 'Roboto']
      }),
      close: jest.fn()
    }),
    close: jest.fn()
  })
};

// Mock Database operations
export const mockDB = {
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
    })
  }),
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
      leftJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ id: 'test-id' }])
    })
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue({ rowCount: 1 })
  })
};

// Mock Logger
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock Resend (Email)
export const mockResend = {
  emails: {
    send: jest.fn().mockResolvedValue({
      id: 'email_test_123',
      from: 'test@bazaar.so',
      to: 'user@example.com',
      subject: 'Test Email'
    })
  }
};

// Export all mocks
export default {
  openai: mockOpenAI,
  stripe: mockStripe,
  aws: mockAWS,
  r2: mockR2,
  browser: mockBrowser,
  db: mockDB,
  logger: mockLogger,
  resend: mockResend
};