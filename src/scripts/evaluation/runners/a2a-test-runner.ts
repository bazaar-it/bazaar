//src/scripts/evaluation/runners/a2a-test-runner.ts
import type { TestCaseMetadata } from "../generators/prompt-generator";

// Simple UUID validation function
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Options for test execution
 */
export interface TestRunnerOptions {
  /** Maximum concurrent tests to run */
  concurrency?: number;
  /** Timeout in ms for each test case */
  timeout?: number;
  /** Whether to continue on test failure */
  continueOnFailure?: boolean;
  /** Directory to save artifacts */
  artifactsDir?: string;
  /** Whether to validate components after generation */
  validateComponents?: boolean;
  /** Project ID to use for component generation */
  projectId?: string;
  /** User ID to use for component generation */
  userId?: string;
  /** Whether to use verbose logging */
  verbose?: boolean;
}

/**
 * Result of a test execution
 */
export interface TestResult {
  /** Test case ID */
  testCaseId: string;
  /** Whether the test was successful */
  success: boolean;
  /** Error information if the test failed */
  error?: {
    /** Error message */
    message: string;
    /** Stage where the error occurred */
    stage: 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering';
    /** Error stack trace */
    stack?: string;
    /** Error code */
    code?: string;
  };
  /** Performance metrics for the test */
  metrics: {
    /** Time to first token in ms */
    timeToFirstToken: number;
    /** Code generation time in ms */
    codeGenerationTime: number;
    /** Validation time in ms */
    validationTime: number;
    /** Build time in ms */
    buildTime: number;
    /** Upload time in ms */
    uploadTime: number;
    /** Total time in ms */
    totalTime: number;
  };
  /** Component metadata */
  component?: {
    /** Component ID */
    id: string;
    /** R2 URL */
    outputUrl?: string;
    /** Database ID */
    dbId: string;
    /** Component status */
    status: string;
  };
  /** A2A task information */
  task?: {
    /** Task ID */
    id: string;
    /** Final task state */
    finalState: string;
    /** State transitions with timestamps */
    stateTransitions: Array<{
      /** State name */
      state: string;
      /** Timestamp in ms */
      timestamp: number;
    }>;
    /** Artifacts produced */
    artifacts: Array<{
      /** Artifact ID */
      id: string;
      /** Artifact type */
      type: string;
      /** Artifact URL */
      url?: string;
    }>;
  };
}

/**
 * Test runner that uses the A2A protocol to submit component generation tasks
 * and monitor their progress through the pipeline using SSE.
 */
export class A2AComponentTestRunner {
  /**
   * Constructor for the A2A test runner
   */
  constructor(private logger = console) {
    // Initialize any dependencies here
  }
  
  /**
   * Runs a set of test cases using the A2A protocol
   * @param testCases Array of test cases to run
   * @param options Test execution options
   * @returns Test results with performance metrics
   */
  async runTests(
    testCases: Array<{ prompt: string; metadata: TestCaseMetadata }>,
    options: TestRunnerOptions = {}
  ): Promise<TestResult[]> {
    this.logger.log(`Starting test run with ${testCases.length} test cases...`);
    
    const results: TestResult[] = [];
    const concurrency = options.concurrency || 1;
    
    // Process test cases in batches based on concurrency
    for (let i = 0; i < testCases.length; i += concurrency) {
      this.logger.log(`Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(testCases.length / concurrency)}`);
      
      const batch = testCases.slice(i, i + concurrency);
      const batchPromises = batch.map(testCase => this.runTest(testCase, options));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Log progress
      const successCount = results.filter(r => r.success).length;
      this.logger.log(`Progress: ${results.length}/${testCases.length} tests completed (${successCount} successful)`);
    }
    
    this.logger.log(`Test run completed. ${results.filter(r => r.success).length}/${results.length} tests successful.`);
    
    return results;
  }
  
  /**
   * Runs a single test case
   * @param testCase Test case to run
   * @param options Test execution options
   * @returns Test result with performance metrics
   */
  async runTest(
    testCase: { prompt: string; metadata: TestCaseMetadata },
    options: TestRunnerOptions = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    const { prompt, metadata } = testCase;
    
    this.logger.log(`Running test case ${metadata.id} (${metadata.category}, complexity: ${metadata.complexity})`);
    
    // Initialize metrics
    const metrics = {
      timeToFirstToken: 0,
      codeGenerationTime: 0,
      validationTime: 0,
      buildTime: 0,
      uploadTime: 0,
      totalTime: 0
    };
    
    // Initialize state transitions storage
    const stateTransitions: Array<{ state: string; timestamp: number }> = [];
    
    try {
      // Validate projectId
      const projectId = options.projectId;
      if (!projectId || !isUUID(projectId)) {
        throw new Error(`Invalid project ID: ${projectId}`);
      }
      
      // Create A2A task for component generation
      this.logger.log(`Creating A2A task for component generation...`);
      
      // In a real implementation, this would use the actual A2A API
      // Here we'll simulate the task creation for now
      const taskId = await this.createComponentGenerationTask(prompt, projectId);
      
      // Record first state transition
      stateTransitions.push({
        state: "submitted",
        timestamp: Date.now()
      });
      
      // Setup SSE monitoring
      this.logger.log(`Setting up SSE monitoring for task ${taskId}...`);
      
      // In a real implementation, this would use your useSSE hook to monitor SSE events
      // Here we'll simulate the SSE events
      const result = await this.monitorTaskWithSSE(
        taskId, 
        stateTransitions, 
        metrics, 
        options.timeout || 60000
      );
      
      metrics.totalTime = Date.now() - startTime;
      
      // Return the result
      return {
        testCaseId: metadata.id,
        success: result.success,
        error: result.error,
        metrics,
        component: result.component,
        task: {
          id: taskId,
          finalState: stateTransitions[stateTransitions.length - 1]?.state || "unknown",
          stateTransitions,
          artifacts: result.artifacts || []
        }
      };
      
    } catch (error) {
      this.logger.error(`Error running test case ${metadata.id}:`, error);
      
      // Determine error stage
      const errorStage = this.determineErrorStage(error, stateTransitions);
      // Task failed for some reason
      metrics.totalTime = Date.now() - startTime;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = error instanceof Error && 'code' in error ? (error as any).code : undefined;
      
      return {
        testCaseId: metadata.id,
        success: false,
        error: {
          message: errorMessage,
          stage: errorStage,
          stack: errorStack,
          code: errorCode
        },
        metrics,
        task: {
          id: "error",
          finalState: "error",
          stateTransitions,
          artifacts: []
        }
      };
    }
  }
  
  /**
   * Creates a component generation task using the A2A protocol
   * @param prompt Component generation prompt
   * @param projectId Project ID
   * @returns Task ID
   */
  private async createComponentGenerationTask(prompt: string, projectId: string): Promise<string> {
    // In a real implementation, this would call the A2A API to create a task
    // For this simulation, we'll return a mock task ID
    
    // Normally, this would be something like:
    // const response = await fetch('/api/a2a', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     jsonrpc: '2.0',
    //     method: 'createTask',
    //     params: {
    //       projectId,
    //       agentName: 'CoordinatorAgent',
    //       input: { type: 'text', text: prompt }
    //     },
    //     id: uuid()
    //   })
    // });
    // const data = await response.json();
    // return data.result.taskId;
    
    // For simulation purposes, return a mock task ID
    return `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  
  /**
   * Monitors a task with SSE and collects metrics
   * @param taskId Task ID
   * @param stateTransitions Array to collect state transitions
   * @param metrics Metrics object to update
   * @param timeout Timeout in ms
   * @returns Task result
   */
  private async monitorTaskWithSSE(
    taskId: string,
    stateTransitions: Array<{ state: string; timestamp: number }>,
    metrics: any,
    timeout: number
  ): Promise<{
    success: boolean;
    error?: any;
    component?: any;
    artifacts?: Array<any>;
  }> {
    // In a real implementation, this would connect to the SSE endpoint and process events
    // For this simulation, we'll simulate the SSE events
    
    return new Promise((resolve) => {
      // Simulate component generation pipeline with various events
      
      // Simulate first token delay (200-800ms)
      const firstTokenDelay = Math.floor(Math.random() * 600) + 200;
      setTimeout(() => {
        metrics.timeToFirstToken = firstTokenDelay;
        stateTransitions.push({
          state: "working",
          timestamp: Date.now()
        });
        this.logger.log(`Task ${taskId} status: working (first token after ${firstTokenDelay}ms)`);
      }, firstTokenDelay);
      
      // Simulate code generation (1-5s)
      const codeGenTime = Math.floor(Math.random() * 4000) + 1000;
      setTimeout(() => {
        metrics.codeGenerationTime = codeGenTime;
        stateTransitions.push({
          state: "code_generated",
          timestamp: Date.now()
        });
        this.logger.log(`Task ${taskId} status: code_generated (took ${codeGenTime}ms)`);
      }, firstTokenDelay + codeGenTime);
      
      // Simulate validation (300-700ms)
      const validationTime = Math.floor(Math.random() * 400) + 300;
      setTimeout(() => {
        metrics.validationTime = validationTime;
        stateTransitions.push({
          state: "code_validated",
          timestamp: Date.now()
        });
        this.logger.log(`Task ${taskId} status: code_validated (took ${validationTime}ms)`);
      }, firstTokenDelay + codeGenTime + validationTime);
      
      // Simulate build (2-6s)
      const buildTime = Math.floor(Math.random() * 4000) + 2000;
      setTimeout(() => {
        metrics.buildTime = buildTime;
        stateTransitions.push({
          state: "component_built",
          timestamp: Date.now()
        });
        this.logger.log(`Task ${taskId} status: component_built (took ${buildTime}ms)`);
      }, firstTokenDelay + codeGenTime + validationTime + buildTime);
      
      // Simulate upload (500-1500ms)
      const uploadTime = Math.floor(Math.random() * 1000) + 500;
      setTimeout(() => {
        metrics.uploadTime = uploadTime;
        stateTransitions.push({
          state: "component_uploaded",
          timestamp: Date.now()
        });
        this.logger.log(`Task ${taskId} status: component_uploaded (took ${uploadTime}ms)`);
      }, firstTokenDelay + codeGenTime + validationTime + buildTime + uploadTime);
      
      // Simulate completion
      const totalTime = firstTokenDelay + codeGenTime + validationTime + buildTime + uploadTime + 100;
      setTimeout(() => {
        // Randomly decide if the test is successful or not (90% success rate)
        const success = Math.random() < 0.9;
        
        if (success) {
          stateTransitions.push({
            state: "completed",
            timestamp: Date.now()
          });
          this.logger.log(`Task ${taskId} status: completed (total time: ${totalTime}ms)`);
          
          // Mock component details
          const componentId = `component-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          resolve({
            success: true,
            component: {
              id: componentId,
              outputUrl: `https://example.com/components/${componentId}.js`,
              dbId: `db-${componentId}`,
              status: "complete"
            },
            artifacts: [
              {
                id: `artifact-code-${componentId}`,
                type: "code",
                url: `https://example.com/artifacts/${componentId}-code.tsx`
              },
              {
                id: `artifact-bundle-${componentId}`,
                type: "bundle",
                url: `https://example.com/artifacts/${componentId}-bundle.js`
              }
            ]
          });
        } else {
          // Simulate a failure at a random stage
          const failureStages = [
            "codeGeneration", 
            "validation", 
            "build", 
            "upload"
          ] as const;
          const failureStage = failureStages[Math.floor(Math.random() * failureStages.length)];
          
          stateTransitions.push({
            state: "failed",
            timestamp: Date.now()
          });
          this.logger.log(`Task ${taskId} status: failed at stage ${failureStage} (total time: ${totalTime}ms)`);
          
          resolve({
            success: false,
            error: {
              message: `Failed at ${failureStage} stage`,
              stage: failureStage
            }
          });
        }
      }, totalTime);
      
      // Set timeout
      setTimeout(() => {
        resolve({
          success: false,
          error: {
            message: "Task timed out",
            stage: "unknown"
          }
        });
      }, timeout);
    });
  }
  
  /**
   * Determines the stage at which an error occurred
   * @param error Error object
   * @param stateTransitions State transitions that occurred before the error
   * @returns Stage name
   */
  private determineErrorStage(
    error: unknown, 
    stateTransitions: Array<{ state: string; timestamp: number }>
  ): 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering' {
    // If the error message contains information about the stage, use that
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("code generation")) return "codeGeneration";
    if (errorMessage.includes("validation")) return "validation";
    if (errorMessage.includes("build")) return "build";
    if (errorMessage.includes("upload")) return "upload";
    if (errorMessage.includes("render")) return "rendering";
    
    // Otherwise, try to determine based on the state transitions
    const states = stateTransitions.map(t => t.state);
    
    if (!states.includes("working")) return "codeGeneration";
    if (!states.includes("code_validated")) return "validation";
    if (!states.includes("component_built")) return "build";
    if (!states.includes("component_uploaded")) return "upload";
    
    // Default to rendering if we can't determine the stage
    return "rendering";
  }
}
