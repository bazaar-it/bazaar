import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, customComponentJobs } from '~/server/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateComponentCode, processComponentJob } from '../generateComponentCode';

// Mock the buildCustomComponent module
vi.mock('../buildCustomComponent', () => ({
  buildCustomComponent: vi.fn().mockResolvedValue(true),
}));

// Mock the database
vi.mock('~/server/db', () => ({
  db: {
    query: {
      customComponentJobs: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
    }),
  },
  customComponentJobs: { id: 'id' },
}));

// Import the mocked module to get access to the mock function
import * as buildCustomComponentModule from '../buildCustomComponent';

describe('Component Generation and Build Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock job data
    (db.query.customComponentJobs.findFirst as any).mockResolvedValue({
      id: 'test-job-id',
      status: 'pending',
      metadata: { prompt: 'Test component prompt' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should directly trigger buildCustomComponent after updating the database', async () => {
    // Mock the OpenAI completion response for component generation
    vi.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
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
            }),
          },
        };
      },
    }));

    // Process a component job
    await processComponentJob('test-job-id');

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
    vi.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        };
      },
    }));

    // Process a component job
    await processComponentJob('test-job-id');

    // Verify that the database was updated with error status
    expect(db.update).toHaveBeenCalled();
    
    // Verify that buildCustomComponent was not called
    const mockBuildCustomComponent = buildCustomComponentModule.buildCustomComponent as any;
    expect(mockBuildCustomComponent).not.toHaveBeenCalled();
  });

  it('should not trigger build if database update fails', async () => {
    // Mock the OpenAI completion response
    vi.mock('openai', () => ({
      default: class OpenAI {
        constructor() {}
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
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
            }),
          },
        };
      },
    }));

    // Mock database update to fail
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    // Process a component job
    await processComponentJob('test-job-id');

    // Wait for the dynamic import promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify that buildCustomComponent was not called
    const mockBuildCustomComponent = buildCustomComponentModule.buildCustomComponent as any;
    expect(mockBuildCustomComponent).not.toHaveBeenCalled();
  });
}); 