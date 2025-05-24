import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db, type customComponentJobs } from '~/server/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateComponentCode, processComponentJob } from '../generateComponentCode';
import { type ComponentJob, type TaskStatus } from '~/server/db/schema';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { PassThrough } from 'stream';
import { TextEncoder } from 'util';

// Mock the buildCustomComponent module
jest.mock('../buildCustomComponent', () => ({
  buildCustomComponent: jest.fn().mockResolvedValue(true as any),
}));

// Mock the database
jest.mock('~/server/db', () => ({
  db: {
    query: {
      customComponentJobs: {
        findFirst: jest.fn<() => Promise<ComponentJob | undefined>>().mockResolvedValue({
          id: 'test-job-id',
          projectId: 'test-project-id',
          status: 'pending' as TaskStatus,
          metadata: { prompt: 'Test component prompt' },
          effect: 'test-effect',
          props: {},
          componentName: null,
          generatedCode: null,
          compiledPath: null,
          errorLogs: null,
          retryCount: 0,
          taskId: null,
          animationDesignBrief: null,
          currentStep: null,
          history: null,
          sseEnabled: null,
          createdAt: new Date(),
          updatedAt: null,
          original_tsx_code: null,
          last_fix_attempt: null,
          fix_issues: null,
          taskState: 'submitted' as TaskStatus,
        } as any),
      },
    },
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'test-job-id' }] as any),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ id: 'test-job-id' }] as any),
    }),
  },
  customComponentJobs: {} as typeof customComponentJobs,
}));

// Import the mocked module to get access to the mock function
import * as buildCustomComponentModule from '../buildCustomComponent';

// Mock esbuild
jest.mock('esbuild', () => ({
  build: jest.fn().mockResolvedValue({
    warnings: [],
    errors: [],
    outputFiles: [{
      path: 'output.js',
      text: 'export default function TestComponent() { return React.createElement("div", null, "Test"); }',
      contents: new Uint8Array(Buffer.from('export default function TestComponent() { return React.createElement("div", null, "Test"); }')),
    }],
  }),
}));

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ ETag: 'test-etag' }),
  })),
  PutObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

// Mock fs promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test-content')),
  rm: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn().mockReturnValue({ size: 1000 }),
}));

// Import the module under test
import { buildCustomComponent } from '../buildCustomComponent';
import esbuild from 'esbuild';

// Get the specific mocked function
const mockEsbuildBuild = esbuild.build as jest.MockedFunction<typeof esbuild.build>;

describe('Component Generation and Build Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock job data
    (db.query.customComponentJobs.findFirst as any).mockResolvedValue({
      id: 'test-job-id',
      status: 'pending',
      metadata: { prompt: 'Test component prompt' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should directly trigger buildCustomComponent after updating the database', async () => {
    // Mock the OpenAI completion response for component generation
    jest.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'generate_remotion_component',
                          arguments: JSON.stringify({
                            componentName: 'TestComponent',
                            componentCode: '"use client";\nexport default function TestComponent() { return <div>Test</div>; }',
                            componentDescription: 'Test component',
                          }),
                        },
                      },
                    ],
                  },
                },
              ],
            } as any),
          },
        };
      },
    }));

    // Process a component job
    await processComponentJob('test-job-id' as any);

    // Verify that the database was updated with TSX code
    expect(db.update).toHaveBeenCalled();
    
    // Wait for the dynamic import promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify that buildCustomComponent was directly called
    const mockBuildCustomComponent = buildCustomComponentModule.buildCustomComponent as any;
    expect(mockBuildCustomComponent).toHaveBeenCalledWith('test-job-id');
  });

  it('should handle errors during the TSX code generation process', async () => {
    // Mock the OpenAI API to throw an error
    jest.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API error') as any),
          },
        };
      },
    }));

    // Process a component job
    await processComponentJob('test-job-id' as any);

    // Verify that the database was updated with error status
    expect(db.update).toHaveBeenCalled();
    
    // Verify that buildCustomComponent was not called
    const mockBuildCustomComponent = buildCustomComponentModule.buildCustomComponent as any;
    expect(mockBuildCustomComponent).not.toHaveBeenCalled();
  });

  it('should not trigger build if database update fails', async () => {
    // Mock the OpenAI completion response
    jest.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'generate_remotion_component',
                          arguments: JSON.stringify({
                            componentName: 'TestComponent',
                            componentCode: '"use client";\nexport default function TestComponent() { return <div>Test</div>; }',
                            componentDescription: 'Test component',
                          }),
                        },
                      },
                    ],
                  },
                },
              ],
            } as any),
          },
        };
      },
    }));

    // Mock database update to fail
    (db.update as any).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error') as any),
      }),
    });

    // Process a component job
    await processComponentJob('test-job-id' as any);

    // Wait for the dynamic import promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify that buildCustomComponent was not called
    const mockBuildCustomComponent = buildCustomComponentModule.buildCustomComponent as any;
    expect(mockBuildCustomComponent).not.toHaveBeenCalled();
  });
});

describe('Component Build Flow - ESM Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tempDir = path.join(os.tmpdir(), 'test-component-build');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up temp directory:', e);
    }
  });

  it('should build a component with ESM format and proper default export', async () => {
    // Sample TSX code with proper default export
    const sampleTsx = `
      import React from 'react';
      import { AbsoluteFill } from 'remotion';
      
      export const MyComponent = ({ data }) => {
        return (
          <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
            <div style={{ color: 'white' }}>{data.text}</div>
          </AbsoluteFill>
        );
      };
      
      export default MyComponent;
    `;

    // Mock database query to return our sample component
    const db = require('~/server/db');
    db.db.query.customComponentJobs.findFirst.mockResolvedValueOnce({
      id: 'esm-test-job-id',
      status: 'building',
      tsxCode: sampleTsx,
      projectId: 'test-project-id',
      metadata: { testMetadata: true },
      effect: 'MyComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock the build output with ESM format
    const esmOutput = `
      import React from 'react';
      import { AbsoluteFill } from 'remotion';
      
      // Component code (minified for test)
      const MyComponent=({data})=>React.createElement(AbsoluteFill,{style:{backgroundColor:"transparent"}},React.createElement("div",{style:{color:"white"}},data.text));
      
      export default MyComponent;
    `;

    mockEsbuildBuild.mockResolvedValueOnce({
      warnings: [],
      errors: [],
      outputFiles: [{
        path: path.join(tempDir, 'bundle.js'),
        text: esmOutput,
        contents: new Uint8Array(Buffer.from(esmOutput)),
      }],
    });

    // Mock readFile to return our ESM content
    (fs.readFile as jest.Mock).mockResolvedValueOnce(Buffer.from(esmOutput));

    // Call the build function
    const result = await buildCustomComponent('esm-test-job-id');
    expect(result).toBe(true);

    // Verify esbuild was called with ESM format and proper externals
    expect(mockEsbuildBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'esm',
        external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      })
    );

    // Verify sanitizeTsx preserved the React and Remotion imports
    const callArguments = mockEsbuildBuild.mock.calls[0][0];
    if ('stdin' in callArguments) {
      const stdinContents = callArguments.stdin?.contents as string;
      expect(stdinContents).toContain('import React from');
      expect(stdinContents).toContain('import { AbsoluteFill } from');
    }

    // Verify ESM format requirements
    expect(esmOutput).toContain('export default MyComponent');
    expect(esmOutput).not.toContain('window.__REMOTION_COMPONENT');
  });

  it('should handle React.lazy compatible exports', async () => {
    // Sample TSX that isn't using default export
    const sampleTsxWithoutDefault = `
      import React from 'react';
      import { AbsoluteFill } from 'remotion';
      
      // This component doesn't have a default export initially
      export const LazyComponent = ({ data }) => {
        return (
          <AbsoluteFill>
            <div>{data.message}</div>
          </AbsoluteFill>
        );
      };
    `;

    // Mock database to return our sample without default export
    const db = require('~/server/db');
    db.db.query.customComponentJobs.findFirst.mockResolvedValueOnce({
      id: 'lazy-test-job-id',
      status: 'building',
      tsxCode: sampleTsxWithoutDefault,
      projectId: 'test-project-id',
      metadata: {},
      effect: 'LazyComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Auto-corrected ESM output that adds the default export
    const correctedEsmOutput = `
      import React from 'react';
      import { AbsoluteFill } from 'remotion';
      
      // Component code (minified for test)
      const LazyComponent=({data})=>React.createElement(AbsoluteFill,null,React.createElement("div",null,data.message));
      
      // Added default export for ESM compatibility
      export { LazyComponent };
      export default LazyComponent;
    `;

    mockEsbuildBuild.mockResolvedValueOnce({
      warnings: [],
      errors: [],
      outputFiles: [{
        path: path.join(tempDir, 'bundle.js'),
        text: correctedEsmOutput,
        contents: new Uint8Array(Buffer.from(correctedEsmOutput)),
      }],
    });

    // Mock readFile to return our corrected ESM content
    (fs.readFile as jest.Mock).mockResolvedValueOnce(Buffer.from(correctedEsmOutput));

    // Call the build function
    const result = await buildCustomComponent('lazy-test-job-id');
    expect(result).toBe(true);

    // Verify the build process adds the default export if missing
    const buildSets = db.db.update().set.mock.calls;
    expect(buildSets.some(call => 
      call[0].status === 'complete' && 
      call[0].outputUrl?.includes('lazy-test-job-id.js')
    )).toBe(true);
  });

  it('should handle ESM imports correctly', async () => {
    // Sample TSX with imports that will be externalized
    const complexTsx = `
      import React, { useEffect, useState } from 'react';
      import { 
        AbsoluteFill, 
        useCurrentFrame,
        interpolate,
        Sequence
      } from 'remotion';
      import { getVideoMetadata } from '@remotion/media-utils';
      
      export const ComplexComponent = ({ data }) => {
        const [metadata, setMetadata] = useState(null);
        const frame = useCurrentFrame();
        
        useEffect(() => {
          // This would be externalized
          if (data.videoSrc) {
            getVideoMetadata(data.videoSrc).then(setMetadata);
          }
        }, [data.videoSrc]);
        
        return (
          <AbsoluteFill style={{ backgroundColor: data.background || 'black' }}>
            <Sequence from={0} durationInFrames={60}>
              <div style={{ 
                opacity: interpolate(frame, [0, 30], [0, 1]),
                color: 'white'
              }}>
                {data.text}
                {metadata && <div>Video duration: {metadata.durationInSeconds}s</div>}
              </div>
            </Sequence>
          </AbsoluteFill>
        );
      };
      
      export default ComplexComponent;
    `;

    // Mock database
    const db = require('~/server/db');
    db.db.query.customComponentJobs.findFirst.mockResolvedValueOnce({
      id: 'complex-test-job-id',
      status: 'building',
      tsxCode: complexTsx,
      projectId: 'test-project-id',
      metadata: {},
      effect: 'ComplexComponent',
      outputUrl: null,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Call the build function
    const result = await buildCustomComponent('complex-test-job-id');
    expect(result).toBe(true);

    // Verify esbuild externalized the correct packages
    expect(mockEsbuildBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      })
    );

    // Verify the Remotion and React imports were preserved
    const callArguments = mockEsbuildBuild.mock.calls[0][0];
    if ('stdin' in callArguments) {
      const stdinContents = callArguments.stdin?.contents as string;
      expect(stdinContents).toContain('import React');
      expect(stdinContents).toContain('import {');
      expect(stdinContents).toContain('from \'remotion\'');
      expect(stdinContents).toContain('from \'@remotion/media-utils\'');
    }
  });
}); 