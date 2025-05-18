import Transport from 'winston-transport';
import axios from 'axios';
import { LogEntry, LogBatch } from './types.js';

interface LogAgentTransportOptions {
  level?: string;
  agentUrl: string;
  source: string;
  runId: string;
  batchSize?: number;
  batchInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * Winston transport for sending logs to the Log Agent
 * Implements batching to reduce network overhead
 */
export class LogAgentTransport extends Transport {
  private readonly agentUrl: string;
  private readonly source: string;
  private runId: string;
  private readonly batchSize: number;
  private readonly batchInterval: number;
  private readonly onError?: (error: Error) => void;
  
  private buffer: LogEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isSending = false;

  constructor(options: LogAgentTransportOptions) {
    super(options);
    
    this.agentUrl = options.agentUrl.endsWith('/') 
      ? `${options.agentUrl}ingest` 
      : `${options.agentUrl}/ingest`;
    
    this.source = options.source;
    this.runId = options.runId;
    this.batchSize = options.batchSize || 50;
    this.batchInterval = options.batchInterval || 5000; // 5 seconds
    this.onError = options.onError;
    
    this.startTimer();
  }

  /**
   * Start the timer for flushing logs on interval
   */
  private startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
    
    // Prevent timer from keeping process alive
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Update the run ID for the transport
   * @param runId The new run ID
   */
  setRunId(runId: string) {
    // Flush any existing logs with the old runId
    this.flush();
    
    // Update runId
    this.runId = runId;
  }

  /**
   * Winston transport log method
   * @param info The log info object
   * @param callback Callback function
   */
  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });
    
    // Extract relevant info from Winston log
    const { level, message, timestamp, ...meta } = info;
    
    // Create log entry
    const logEntry: LogEntry = {
      timestamp: timestamp || new Date().toISOString(),
      level: level as any,
      message,
      source: this.source,
      runId: this.runId,
      metadata: meta,
    };
    
    // Add to buffer
    this.buffer.push(logEntry);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    
    callback();
  }

  /**
   * Flush the log buffer to the agent
   */
  async flush() {
    if (this.buffer.length === 0 || this.isSending) {
      return;
    }
    
    this.isSending = true;
    const batch: LogBatch = {
      entries: [...this.buffer],
      runId: this.runId,
      source: this.source,
    };
    
    // Clear buffer immediately to prevent data loss if send fails
    this.buffer = [];
    
    try {
      await axios.post(this.agentUrl, batch, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });
    } catch (error: any) {
      if (this.onError) {
        this.onError(new Error(`Failed to send logs to Log Agent: ${error.message}`));
      }
      
      console.error('Log Agent Transport Error:', error.message);
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Close the transport, flushing any remaining logs
   */
  async close() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    await this.flush();
  }
}

/**
 * Helper function to create a Log Agent transport
 * @param options Transport options
 * @returns The created transport
 */
export function createLogAgentTransport(options: LogAgentTransportOptions) {
  return new LogAgentTransport(options);
}
