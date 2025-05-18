// src/scripts/log-agent/logger-transport.js
import Transport from 'winston-transport';
import axios from 'axios';

/**
 * Winston transport for sending logs to the Log Agent
 * Implements batching to reduce network overhead
 */
export class LogAgentTransport extends Transport {
  constructor(options) {
    super(options);
    
    this.agentUrl = options.agentUrl.endsWith('/') 
      ? `${options.agentUrl}ingest` 
      : `${options.agentUrl}/ingest`;
    
    this.source = options.source;
    this.runId = options.runId;
    this.batchSize = options.batchSize || 50;
    this.batchInterval = options.batchInterval || 5000; // 5 seconds
    this.onError = options.onError;
    this.buffer = [];
    this.timer = null;
    this.isSending = false;
    
    this.startTimer();
  }

  /**
   * Start the timer for flushing logs on interval
   */
  startTimer() {
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
   * @param {string} runId The new run ID
   */
  setRunId(runId) {
    // Flush any existing logs with the old runId
    this.flush();
    
    // Update runId
    this.runId = runId;
  }

  /**
   * Winston transport log method
   * @param {object} info The log info object
   * @param {Function} callback Callback function
   */
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });
    
    // Extract relevant info from Winston log
    const { level, message, timestamp, ...meta } = info;
    
    // Create log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      level,
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
    const batch = { 
      entries: [...this.buffer],
      runId: this.runId,
      source: this.source,
      timestamp: new Date().toISOString(),
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
    } catch (error) {
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
 * @param {object} options Transport options
 * @returns {LogAgentTransport} The created transport
 */
export function createLogAgentTransport(options) {
  return new LogAgentTransport(options);
}
