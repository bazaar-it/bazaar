import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db, customComponentJobs } from '~/server/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateComponentCode, processComponentJob } from '../generateComponentCode';
import { ComponentJob, TaskStatus } from '~/server/db/schema';

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