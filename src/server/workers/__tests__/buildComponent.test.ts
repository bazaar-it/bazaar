import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Create mock functions directly
const mockDbFindFirst = jest.fn();
const mockUpdateStatus = jest.fn();

// Mock dependencies before importing the module being tested
// Mock the database module
jest.mock('~/server/db', () => {
  return {
    db: {
      query: {
        customComponentJobs: {
          findFirst: mockDbFindFirst
        }
      },
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([{ affected: 1 }]))
        }))
      }))
    },
    customComponentJobs: { id: 'id' }
  };
});

// Mock the Neon database driver
jest.mock('@neondatabase/serverless', () => {
  return {
    neon: jest.fn(() => ({})),
    neonConfig: {
      fetchConnectionCache: true
    }
  };
});

// Mock the drizzle ORM
jest.mock('drizzle-orm/neon-http', () => ({
  drizzle: jest.fn()
}));

// Mock the componentGenerator.service updateComponentStatus
jest.mock('~/server/services/componentGenerator.service', () => ({
  updateComponentStatus: mockUpdateStatus
}));

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ ETag: 'test-etag' })
    })),
    PutObjectCommand: jest.fn().mockImplementation((options) => options)
  };
});

// Mock file system operations
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test-bundle')),
  rm: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('fs', () => ({
  statSync: jest.fn().mockReturnValue({ size: 1000 })
}));

// Mock the environment variables
jest.mock('~/env', () => ({
  env: {
    R2_ENDPOINT: 'https://test.r2.dev',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_URL: 'https://cdn.test.com'
  }
}));

// Mock esbuild
jest.mock('esbuild', () => ({
  build: jest.fn().mockResolvedValue({
    warnings: [],
    errors: [],
    outputFiles: [{ text: 'compiled JS code' }]
  })
}));

// Now import the module we're testing and mocked dependencies
import { buildCustomComponent } from '../buildCustomComponent';

describe('buildCustomComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations for custom component job
    mockDbFindFirst.mockResolvedValue({
      id: 'test-job-id',
      status: 'building',
      tsxCode: 'export default function TestComponent() { return <div>Test</div>; }',
      metadata: { prop: 'value' },
      projectId: 'test-project-id',
      effect: 'TestComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Default implementation for updateStatus
    mockUpdateStatus.mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('should fail when tsxCode is null or empty', async () => {
    // Mock the job database result with missing TSX
    mockDbFindFirst.mockResolvedValue({
      id: 'test-job-id',
      status: 'building',
      tsxCode: null, // Simulate missing TSX code
      metadata: { prop: 'value' },
      projectId: 'test-project-id',
      effect: 'TestComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const result = await buildCustomComponent('test-job-id');
    
    // Should return false when tsxCode is missing
    expect(result).toBe(false);
    
    // Should update status to error
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'test-job-id', 
      'error', 
      expect.anything(), 
      undefined, 
      expect.stringContaining('TSX code')
    );
  });
  
  it('should process job successfully when tsxCode is provided', async () => {
    // Mock success flow
    const result = await buildCustomComponent('test-job-id');
    
    // Should complete successfully
    expect(result).toBe(true);
    
    // Should have updated the job status to complete
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'test-job-id', 
      'complete',
      expect.anything(),
      expect.stringContaining('https://cdn.test.com/custom-components/test-job-id.js'),
      undefined
    );
  });
}); 