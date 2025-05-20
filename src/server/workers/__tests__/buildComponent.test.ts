import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs_promises from 'fs/promises'; 
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';
import esbuild, { type BuildResult, type OutputFile, type Message, type BuildOptions } from 'esbuild'; 

// Define an interface for the Custom Component Job for type safety in mocks
interface MockCustomComponentJob {
  id: string;
  status: string;
  tsxCode: string | null;
  metadata: Record<string, unknown>;
  projectId: string;
  effect: string;
  outputUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Type the mock functions at declaration
const mockDbFindFirst = jest.fn<() => Promise<MockCustomComponentJob | undefined>>();
const mockUpdateStatus = jest.fn<(
  jobId: string, 
  status: string, 
  durationMs?: number, 
  outputUrl?: string, 
  errorMessage?: string
) => Promise<void>>();

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

// Mock S3 client and its commands
const mockS3Send = jest.fn<() => Promise<{ ETag: string }>>();
mockS3Send.mockResolvedValue({ ETag: 'test-etag' });

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: jest.fn().mockImplementation((options) => options), 
  };
});

// Mock file system operations
jest.mock('fs/promises', () => ({
  mkdir: jest.fn<typeof fs_promises.mkdir>().mockResolvedValue(undefined as unknown as string), 
  writeFile: jest.fn<typeof fs_promises.writeFile>().mockResolvedValue(undefined as void),
  readFile: jest.fn<typeof fs_promises.readFile>().mockResolvedValue(Buffer.from('test-bundle')),
  rm: jest.fn<typeof fs_promises.rm>().mockResolvedValue(undefined as void),
}));

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs') as Record<string, unknown>; 
  return {
    ...actualFs,
    statSync: jest.fn().mockReturnValue({ size: 1000 }),
  };
});

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
const mockEsbuildBuildGlobal = esbuild.build as jest.MockedFunction<typeof esbuild.build>;
mockEsbuildBuildGlobal.mockResolvedValue({
  warnings: [] as Message[],
  errors: [] as Message[],
  outputFiles: [{
    text: 'compiled JS code',
    path: 'output.js',
    contents: new TextEncoder().encode('compiled JS code'),
  }] as OutputFile[],
} as BuildResult);

// Now import the module we're testing and mocked dependencies
import { buildCustomComponent } from '../buildCustomComponent';

describe('buildCustomComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send.mockClear(); 
    mockEsbuildBuildGlobal.mockClear();
    
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
      updatedAt: new Date(),
    } as MockCustomComponentJob);
    
    // Default implementation for updateStatus
    mockUpdateStatus.mockResolvedValue(undefined as void);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('should fail when tsxCode is null or empty', async () => {
    // Mock the job database result with missing TSX
    mockDbFindFirst.mockResolvedValue({
      id: 'test-job-id',
      status: 'building',
      tsxCode: null, 
      metadata: { prop: 'value' },
      projectId: 'test-project-id',
      effect: 'TestComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MockCustomComponentJob);
    
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

  describe('ESM Output Verification', () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a temporary directory for test files
      tempDir = await fs_promises.mkdtemp(path.join(os.tmpdir(), 'jest-esm-test-'));
    });

    afterEach(async () => {
      // Clean up the temporary directory
      if (tempDir) {
        await fs_promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should produce valid ESM output with default export and externalized dependencies', async () => {
      const mockEsmOutput = `// Mock ESM Output\nexport default function TestEsmComponent() { return console.log('Test ESM Component'); };\nimport React from 'react';\nimport { AbsoluteFill } from 'remotion';`;
      
      // Cast to jest.MockedFunction for precise typing
      const mockEsbuildBuildTest = esbuild.build as jest.MockedFunction<typeof esbuild.build>;
      mockEsbuildBuildTest.mockResolvedValue({
        warnings: [] as Message[],
        errors: [] as Message[],
        outputFiles: [{
          text: mockEsmOutput,
          path: 'test-module.mjs',
          contents: new TextEncoder().encode(mockEsmOutput),
        }] as OutputFile[],
      } as BuildResult);

      // Mock the database findFirst to return a job with some TSX code
      mockDbFindFirst.mockResolvedValue({
        id: 'test-esm-job-id',
        status: 'building',
        tsxCode: 'const MyEsmComp: React.FC = () => { return <AbsoluteFill>Hello ESM</AbsoluteFill> }; export default MyEsmComp;',
        metadata: { prop: 'value' },
        projectId: 'test-project-id',
        effect: 'MyEsmComp',
        outputUrl: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MockCustomComponentJob);

      const result = await buildCustomComponent('test-esm-job-id');
      expect(result).toBe(true); 

      // 1. Verify esbuild was called with ESM format and correct externals
      expect(mockEsbuildBuildTest).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'esm',
          external: ['react', 'react-dom', 'remotion', '@remotion/*'],
        } as Partial<BuildOptions>) 
      );

      // 2. Write the mocked ESM output to a temporary file and dynamically import it
      const tempFilePath = path.join(tempDir, 'test-module.mjs');
      await fs_promises.writeFile(tempFilePath, mockEsmOutput);

      let importedModule;
      try {
        importedModule = await import(pathToFileURL(tempFilePath).href);
      } catch (e) {
        console.error('Dynamic import failed in test:', e);
        throw e; 
      }
      
      // 3. Assert that the imported module has a default export which is a function
      expect(importedModule).toBeDefined();
      expect(importedModule.default).toBeDefined();
      expect(typeof importedModule.default).toBe('function');
      // Optionally, check the name if your mock component has one
      // expect(importedModule.default.name).toBe('TestEsmComponent');

      // 4. Verify component status was updated to complete
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'test-esm-job-id',
        'complete',
        expect.anything(), 
        expect.stringContaining('https://cdn.test.com/custom-components/test-esm-job-id.js'), 
        undefined 
      );
    });
  });
});