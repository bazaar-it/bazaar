//src/scripts/evaluation/collectors/performance-collector.ts
import { v4 as uuidv4 } from "uuid";

/**
 * Types of pipeline events to record
 */
export type PipelineEvent = 
  | 'prompt_submitted'
  | 'code_generation_start' 
  | 'code_generation_end'
  | 'validation_start'
  | 'validation_end'
  | 'build_start'
  | 'build_end'
  | 'upload_start'
  | 'upload_end'
  | 'component_complete';

/**
 * Error information for failed component generation
 */
export interface ErrorInfo {
  /** Stage where the error occurred */
  stage: 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering';
  /** Type of error */
  type: string;
  /** Error message */
  message: string;
}

/**
 * Options for metrics collection
 */
export interface MetricsCollectionOptions {
  /** Whether to use verbose logging */
  verbose?: boolean;
  /** Logger to use */
  logger?: Console;
}

/**
 * Collects performance metrics during component generation
 */
export class PerformanceMetricsCollector {
  private testCaseId: string;
  private events: Map<PipelineEvent, number> = new Map();
  private stateTransitions: Array<{ state: string; timestamp: number }> = [];
  private metadata: Record<string, any> = {};
  private logger: Console;
  private verbose: boolean;
  
  /**
   * Initialize a new metrics collection session
   */
  constructor(testCaseId: string, options: MetricsCollectionOptions = {}) {
    this.testCaseId = testCaseId;
    this.verbose = options.verbose || false;
    this.logger = options.logger || console;
  }
  
  /**
   * Record a timing event in the component generation pipeline
   */
  recordEvent(
    event: PipelineEvent,
    metadata: Record<string, any> = {}
  ): void {
    const timestamp = Date.now();
    this.events.set(event, timestamp);
    
    // Merge metadata
    this.metadata = {
      ...this.metadata,
      ...metadata
    };
    
    if (this.verbose) {
      this.logger.log(`[${this.testCaseId}] Event: ${event} at ${new Date(timestamp).toISOString()}`);
    }
  }
  
  /**
   * Record a state transition for A2A tasks
   */
  recordStateTransition(state: string, timestamp: number, metadata: Record<string, any> = {}): void {
    this.stateTransitions.push({ state, timestamp });
    
    // Merge metadata
    this.metadata = {
      ...this.metadata,
      ...metadata
    };
    
    if (this.verbose) {
      this.logger.log(`[${this.testCaseId}] State transition: ${state} at ${new Date(timestamp).toISOString()}`);
    }
  }
  
  /**
   * Calculate derived metrics from recorded events
   */
  calculateDerivedMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    // Calculate time to first token
    const promptTime = this.events.get('prompt_submitted');
    const codeGenStartTime = this.events.get('code_generation_start');
    if (promptTime && codeGenStartTime) {
      metrics.timeToFirstToken = codeGenStartTime - promptTime;
    }
    
    // Calculate code generation time
    const codeGenEndTime = this.events.get('code_generation_end');
    if (codeGenStartTime && codeGenEndTime) {
      metrics.codeGenerationTime = codeGenEndTime - codeGenStartTime;
    }
    
    // Calculate validation time
    const validationStartTime = this.events.get('validation_start');
    const validationEndTime = this.events.get('validation_end');
    if (validationStartTime && validationEndTime) {
      metrics.validationTime = validationEndTime - validationStartTime;
    }
    
    // Calculate build time
    const buildStartTime = this.events.get('build_start');
    const buildEndTime = this.events.get('build_end');
    if (buildStartTime && buildEndTime) {
      metrics.buildTime = buildEndTime - buildStartTime;
    }
    
    // Calculate upload time
    const uploadStartTime = this.events.get('upload_start');
    const uploadEndTime = this.events.get('upload_end');
    if (uploadStartTime && uploadEndTime) {
      metrics.uploadTime = uploadEndTime - uploadStartTime;
    }
    
    // Calculate total time
    const completionTime = this.events.get('component_complete');
    if (promptTime && completionTime) {
      metrics.totalTime = completionTime - promptTime;
    }
    
    return metrics;
  }
  
  /**
   * Get all metrics data for storage
   */
  getMetricsData(success: boolean, errorInfo?: ErrorInfo): Record<string, any> {
    return {
      id: uuidv4(),
      testCaseId: this.testCaseId,
      timestamp: new Date(),
      
      // Success metrics
      success,
      errorStage: errorInfo?.stage,
      errorType: errorInfo?.type,
      errorMessage: errorInfo?.message,
      
      // Timing events
      promptSubmissionTime: this.events.has('prompt_submitted') ? new Date(this.events.get('prompt_submitted')!) : null,
      codeGenerationStartTime: this.events.has('code_generation_start') ? new Date(this.events.get('code_generation_start')!) : null,
      codeGenerationEndTime: this.events.has('code_generation_end') ? new Date(this.events.get('code_generation_end')!) : null,
      validationStartTime: this.events.has('validation_start') ? new Date(this.events.get('validation_start')!) : null,
      validationEndTime: this.events.has('validation_end') ? new Date(this.events.get('validation_end')!) : null,
      buildStartTime: this.events.has('build_start') ? new Date(this.events.get('build_start')!) : null,
      buildEndTime: this.events.has('build_end') ? new Date(this.events.get('build_end')!) : null,
      uploadStartTime: this.events.has('upload_start') ? new Date(this.events.get('upload_start')!) : null,
      uploadEndTime: this.events.has('upload_end') ? new Date(this.events.get('upload_end')!) : null,
      componentCompletionTime: this.events.has('component_complete') ? new Date(this.events.get('component_complete')!) : null,
      
      // Derived timing metrics
      ...this.calculateDerivedMetrics(),
      
      // A2A specific metrics
      stateTransitions: this.stateTransitions,
      
      // Additional metadata
      metadata: this.metadata
    };
  }
  
  /**
   * Save metrics to database (not implemented here since DB connection is pending)
   */
  async saveMetrics(success: boolean, errorInfo?: ErrorInfo): Promise<string> {
    const metricsData = this.getMetricsData(success, errorInfo);
    
    // In a real implementation, this would save to the database
    // For now, just log the metrics data
    if (this.verbose) {
      this.logger.log(`[${this.testCaseId}] Saving metrics:`, metricsData);
    }
    
    // Return the metrics ID
    return metricsData.id;
  }
  
  /**
   * Save metrics to a local file (used as a fallback when database is not available)
   */
  async saveMetricsToFile(success: boolean, errorInfo?: ErrorInfo, filePath?: string): Promise<string> {
    const metricsData = this.getMetricsData(success, errorInfo);
    
    // In a real implementation, this would save to a file
    // For now, just log the metrics data
    if (this.verbose) {
      this.logger.log(`[${this.testCaseId}] Saving metrics to file:`, metricsData);
    }
    
    // Return the metrics ID
    return metricsData.id;
  }
}
