/**
 * Real Integration Test Environment Setup
 * Configures Jest for real browser-based testing
 */

// Polyfill setImmediate and clearImmediate for Jest environment
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args) as any;
  };
  global.clearImmediate = (handle: any) => {
    clearTimeout(handle);
  };
}

// Mock additional Node.js globals that winston might need
if (typeof process !== 'undefined') {
  process.stdout.write = process.stdout.write || ((data: any) => true as any);
  process.stderr.write = process.stderr.write || ((data: any) => true as any);
}

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mock-database-url';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'mock-openai-key';

// Increase test timeouts for real web requests
jest.setTimeout(120000); // 2 minutes global timeout

// Mock expensive operations during testing if needed
const shouldMockBrowser = process.env.MOCK_BROWSER === 'true';

if (shouldMockBrowser) {
  // Mock WebAnalysisAgentV4 for faster testing
  jest.mock('~/tools/webAnalysis/WebAnalysisAgentV4', () => ({
    WebAnalysisAgentV4: class MockWebAnalysisAgentV4 {
      constructor(projectId: string) {}
      
      async analyze(url: string) {
        // Return realistic mock data based on URL
        const domain = new URL(url).hostname.replace('www.', '');
        
        return {
          brand: {
            identity: {
              name: domain.split('.')[0],
            },
            visual: {
              colors: {
                palette: [
                  { hex: '#635BFF', usage: 'primary' },
                  { hex: '#1A1A1A', usage: 'text' }
                ]
              }
            }
          },
          product: {
            features: [
              { name: 'Core Feature', description: 'Main functionality' },
              { name: 'Secondary Feature', description: 'Supporting functionality' }
            ]
          },
          content: {
            ctas: [
              { label: 'Get Started', type: 'primary' },
              { label: 'Learn More', type: 'secondary' }
            ]
          },
          screenshots: [
            { id: 'mock-screenshot-1', url: 'mock-url', type: 'fullpage', description: 'Homepage', timestamp: new Date().toISOString() }
          ]
        };
      }
    }
  }));
  
  console.log('🎭 Real integration tests running with browser mocks for speed');
}